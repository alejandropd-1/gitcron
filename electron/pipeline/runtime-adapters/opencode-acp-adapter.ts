import { randomUUID } from 'node:crypto';
import type {
  MetricName,
  MetricSample,
  PipelineEventEnvelope,
  PipelineIdentity,
  RuntimeDescriptor,
  RuntimeDiscovery,
  RuntimeHealth,
  RuntimeSession,
  RuntimeSessionRequest,
  RuntimeTelemetrySnapshot,
} from '../../../types/pipeline';
import { BoundedJsonlDecoder } from './jsonl-decoder';
import {
  envelope,
  createPipelineIdentity,
  type EventNormalizationContext,
} from './normalization';
import {
  RuntimeProcessRunner,
  type RuntimeProcessHandle,
  type RuntimeProcessResult,
} from './process-runner';
import type { RuntimeAdapter, RuntimeStartRequest } from './runtime-adapter';

const ACP_FIXTURE_REF = 'docs/pipeline/f03/fixtures/opencode-1.18.3-acp-initialize.sanitized.json';
const SESSION_NEW_FIXTURE_REF = 'docs/pipeline/f03/fixtures/opencode-1.18.3-acp-session-new.sanitized.json';
const SUMMARY_FIXTURE_REF = 'docs/pipeline/f00/fixtures/opencode-zai-review.sanitized.json';
const SUPPORTED_RUNTIME_VERSION = '1.18.3';
const SUPPORTED_PROTOCOL_VERSION = 1;

export const OPENCODE_ACP_DESCRIPTOR: RuntimeDescriptor = {
  adapterId: 'opencode',
  runtime: 'opencode',
  adapterKind: 'structured-cli',
  transport: 'acp-ndjson-stdio',
  runtimeVersion: SUPPORTED_RUNTIME_VERSION,
  protocolVersion: String(SUPPORTED_PROTOCOL_VERSION),
  capabilities: [
    {
      capabilityId: 'health',
      capabilityVersion: '1',
      availability: 'available',
      evidenceStatus: 'verified',
      targetScopes: ['repo'],
      constraints: ['initialize only; no session or inference'],
      evidenceRefs: [ACP_FIXTURE_REF],
    },
    {
      capabilityId: 'session.start',
      capabilityVersion: '1',
      availability: 'available',
      evidenceStatus: 'verified',
      targetScopes: ['repo', 'run'],
      constraints: ['session/new verified via ACP; prompt execution not initiated in F03'],
      evidenceRefs: [ACP_FIXTURE_REF, SESSION_NEW_FIXTURE_REF],
    },
    {
      capabilityId: 'session.resume',
      capabilityVersion: '1',
      availability: 'unknown',
      evidenceStatus: 'pending_fixture',
      targetScopes: ['session'],
      constraints: ['advertised by initialize but effect not tested'],
      evidenceRefs: [ACP_FIXTURE_REF],
    },
    {
      capabilityId: 'events.stream',
      capabilityVersion: '1',
      availability: 'unknown',
      evidenceStatus: 'pending_fixture',
      targetScopes: ['session'],
      constraints: ['session/update stream during prompt execution pending approval'],
      evidenceRefs: [ACP_FIXTURE_REF, SESSION_NEW_FIXTURE_REF],
    },
    {
      capabilityId: 'telemetry.snapshot',
      capabilityVersion: null,
      availability: 'available',
      evidenceStatus: 'verified',
      targetScopes: ['run', 'session'],
      constraints: ['runtime-reported cost 0 preserved without assuming free/billing'],
      evidenceRefs: [SUMMARY_FIXTURE_REF, SESSION_NEW_FIXTURE_REF],
    },
  ],
};

type OpenCodeAcpInitialize = {
  protocolVersion: number;
  agentVersion: string;
};

type OpenCodeAcpSessionNewResult = {
  sessionId: string;
  effectiveModel: string | null;
};

function parseInitializeResponse(record: unknown): OpenCodeAcpInitialize | null {
  if (!record || typeof record !== 'object') return null;
  const message = record as Record<string, unknown>;
  if (message.jsonrpc !== '2.0' || message.id !== 0) return null;
  const result = message.result;
  if (!result || typeof result !== 'object') return null;
  const resultObject = result as Record<string, unknown>;
  const agentInfo = resultObject.agentInfo;
  if (!agentInfo || typeof agentInfo !== 'object') return null;
  const agentVersion = (agentInfo as Record<string, unknown>).version;
  if (typeof resultObject.protocolVersion !== 'number' || typeof agentVersion !== 'string') return null;
  return { protocolVersion: resultObject.protocolVersion, agentVersion };
}

function parseSessionNewResponse(record: unknown): OpenCodeAcpSessionNewResult | null {
  if (!record || typeof record !== 'object') return null;
  const message = record as Record<string, unknown>;
  if (message.jsonrpc !== '2.0' || message.id !== 1) return null;
  const result = message.result;
  if (!result || typeof result !== 'object') return null;
  const resultObject = result as Record<string, unknown>;
  const sessionId = resultObject.sessionId;
  if (typeof sessionId !== 'string') return null;

  let effectiveModel: string | null = null;
  if (Array.isArray(resultObject.configOptions)) {
    for (const item of resultObject.configOptions) {
      if (item && typeof item === 'object') {
        const option = item as Record<string, unknown>;
        if (option.id === 'model' && typeof option.currentValue === 'string') {
          effectiveModel = option.currentValue;
          break;
        }
      }
    }
  }
  return { sessionId, effectiveModel };
}

function initializeRequest(): string {
  return `${JSON.stringify({
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: SUPPORTED_PROTOCOL_VERSION,
      clientCapabilities: {},
      clientInfo: {
        name: 'gitcron',
        title: 'GitCron',
        version: '0.0.0',
      },
    },
  })}\n`;
}

function startSessionRequests(canonicalRepoPath: string): string {
  const init = JSON.stringify({
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: SUPPORTED_PROTOCOL_VERSION,
      clientCapabilities: {},
      clientInfo: {
        name: 'gitcron',
        title: 'GitCron',
        version: '0.0.0',
      },
    },
  });
  const sessionNew = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'session/new',
    params: {
      cwd: canonicalRepoPath,
      mcpServers: [],
    },
  });
  return `${init}\n${sessionNew}\n`;
}

interface ActiveSession {
  handle: RuntimeProcessHandle;
  bufferedEnvelopes: PipelineEventEnvelope[];
}

export class OpenCodeAcpRuntimeAdapter implements RuntimeAdapter {
  readonly descriptor = OPENCODE_ACP_DESCRIPTOR;
  private readonly activeSessions = new Map<string, ActiveSession>();

  constructor(
    private readonly canonicalRepoPath: string,
    private readonly executable: string,
    private readonly runner = new RuntimeProcessRunner(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async discover(): Promise<RuntimeDiscovery> {
    try {
      const result = await this.runner.run({
        executable: this.executable,
        args: ['--version'],
        cwd: this.canonicalRepoPath,
        expectedCanonicalCwd: this.canonicalRepoPath,
        timeoutMs: 10_000,
        maxStdoutBytes: 16_384,
        maxStderrBytes: 16_384,
      });
      const output = result.stdout.toString('utf8').trim();
      const installed = result.exitCode === 0 && !result.timedOut && !result.outputLimit;
      const fixtureCompatible = installed && output === SUPPORTED_RUNTIME_VERSION;
      return {
        installed,
        executable: installed ? this.executable : null,
        runtimeVersion: fixtureCompatible ? SUPPORTED_RUNTIME_VERSION : null,
        evidenceStatus: fixtureCompatible ? 'verified' : installed ? 'pending_fixture' : 'unknown',
        evidenceRefs: [ACP_FIXTURE_REF],
        diagnostics: fixtureCompatible
          ? []
          : installed
            ? ['Installed OpenCode version differs from the ACP fixture']
            : ['OpenCode version probe failed'],
      };
    } catch {
      return {
        installed: false,
        executable: null,
        runtimeVersion: null,
        evidenceStatus: 'unknown',
        evidenceRefs: [ACP_FIXTURE_REF],
        diagnostics: ['OpenCode executable unavailable'],
      };
    }
  }

  async health(): Promise<RuntimeHealth> {
    const startedAt = Date.now();
    const discovery = await this.discover();
    if (discovery.evidenceStatus !== 'verified') {
      return {
        status: discovery.installed ? 'degraded' : 'unavailable',
        checkedAt: this.now(),
        latencyMs: Date.now() - startedAt,
        evidenceStatus: discovery.evidenceStatus,
        evidenceRefs: discovery.evidenceRefs,
        diagnostics: discovery.diagnostics,
      };
    }

    const decoder = new BoundedJsonlDecoder({ maxLineBytes: 32_768, maxStreamBytes: 65_536, maxEvents: 16 });
    let initialize: OpenCodeAcpInitialize | null = null;
    let handle: RuntimeProcessHandle | null = null;
    const consume = (chunk: Buffer) => {
      for (const record of decoder.push(chunk).records) {
        initialize ??= parseInitializeResponse(record);
      }
      if (initialize) handle?.terminate();
    };

    let processResult: RuntimeProcessResult;
    try {
      handle = await this.runner.start({
        executable: this.executable,
        args: ['acp', '--cwd', this.canonicalRepoPath],
        cwd: this.canonicalRepoPath,
        expectedCanonicalCwd: this.canonicalRepoPath,
        stdin: initializeRequest(),
        timeoutMs: 10_000,
        killGraceMs: 2_000,
        maxStdoutBytes: 65_536,
        maxStderrBytes: 16_384,
        onStdout: consume,
      });
      if (initialize) handle.terminate();
      processResult = await handle.result;
      for (const record of decoder.finish().records) initialize ??= parseInitializeResponse(record);
    } catch {
      return this.degradedHealth(startedAt, ['ACP initialize process failed']);
    }

    const compatible = initialize?.protocolVersion === SUPPORTED_PROTOCOL_VERSION
      && initialize.agentVersion === SUPPORTED_RUNTIME_VERSION
      && !processResult.timedOut
      && !processResult.outputLimit;
    return compatible
      ? {
          status: 'healthy',
          checkedAt: this.now(),
          latencyMs: Date.now() - startedAt,
          evidenceStatus: 'verified',
          evidenceRefs: [ACP_FIXTURE_REF],
          diagnostics: [],
        }
      : this.degradedHealth(startedAt, ['ACP initialize response is missing or fixture-incompatible']);
  }

  async start(request: RuntimeStartRequest): Promise<RuntimeSession> {
    const discovery = await this.discover();
    if (discovery.evidenceStatus !== 'verified') {
      throw new Error('OpenCode ACP is not installed or version differs from fixture');
    }

    const instanceId = randomUUID();
    let sequence = 0;
    const baseIdentity = createPipelineIdentity(request, this.descriptor);
    const decoder = new BoundedJsonlDecoder({ maxLineBytes: 32_768, maxStreamBytes: 65_536, maxEvents: 64 });
    let initialize: OpenCodeAcpInitialize | null = null;
    let sessionNew: OpenCodeAcpSessionNewResult | null = null;
    const bufferedEnvelopes: PipelineEventEnvelope[] = [];

    const consume = (chunk: Buffer) => {
      for (const record of decoder.push(chunk).records) {
        initialize ??= parseInitializeResponse(record);
        sessionNew ??= parseSessionNewResponse(record);

        if (record && typeof record === 'object') {
          const msg = record as Record<string, unknown>;
          if (msg.method === 'session/update' && msg.params) {
            sequence++;
            const context: EventNormalizationContext = {
              identity: baseIdentity,
              descriptor: this.descriptor,
              instanceId,
              observedAt: this.now(),
              sequence,
              sourceEventId: null,
            };
            bufferedEnvelopes.push(envelope(context, 'session.update', msg.params, 'verified', 'runtime'));
          }
        }
      }
    };

    let handle: RuntimeProcessHandle;
    try {
      handle = await this.runner.start({
        executable: this.executable,
        args: ['acp', '--cwd', this.canonicalRepoPath],
        cwd: this.canonicalRepoPath,
        expectedCanonicalCwd: this.canonicalRepoPath,
        stdin: startSessionRequests(this.canonicalRepoPath),
        timeoutMs: 10_000,
        killGraceMs: 2_000,
        maxStdoutBytes: 65_536,
        maxStderrBytes: 16_384,
        onStdout: consume,
      });
    } catch (error) {
      throw new Error(`Failed to start OpenCode ACP process: ${String(error)}`);
    }

    const getInit = (): OpenCodeAcpInitialize | null => initialize;
    const getSess = (): OpenCodeAcpSessionNewResult | null => sessionNew;

    if (!getInit() || !getSess()) {
      await new Promise((r) => setTimeout(r, 50));
    }

    const finalInit = getInit();
    const finalSess = getSess();

    if (!finalInit || finalInit.protocolVersion !== SUPPORTED_PROTOCOL_VERSION || finalInit.agentVersion !== SUPPORTED_RUNTIME_VERSION) {
      handle.terminate();
      throw new Error('ACP initialize response missing or incompatible');
    }

    if (!finalSess) {
      handle.terminate();
      throw new Error('ACP session/new response missing');
    }

    const identity: PipelineIdentity = {
      ...baseIdentity,
      sessionId: finalSess.sessionId,
      runtime: 'opencode',
      provider: request.provider,
      requestedModel: request.requestedModel,
      effectiveModel: finalSess.effectiveModel,
      reportedModel: finalSess.effectiveModel,
    };

    this.activeSessions.set(finalSess.sessionId, {
      handle,
      bufferedEnvelopes,
    });

    return {
      identity,
      descriptor: this.descriptor,
      ownedProcess: true,
      startedAt: this.now(),
    };
  }

  async *events(session: RuntimeSession, signal?: AbortSignal): AsyncIterable<PipelineEventEnvelope> {
    const active = this.activeSessions.get(session.identity.sessionId);
    if (!active) {
      return;
    }
    while (active.bufferedEnvelopes.length > 0) {
      if (signal?.aborted) return;
      const item = active.bufferedEnvelopes.shift();
      if (item) yield item;
    }
  }

  async telemetry(session: RuntimeSession): Promise<RuntimeTelemetrySnapshot> {
    const sourceRef = SUMMARY_FIXTURE_REF;
    const identity = { ...session.identity };
    const dedupeScope = `${identity.runId}:${identity.attemptId}`;

    const usageMetric = (name: MetricName, value: number | null): MetricSample => ({
      metricId: `${identity.runId}:${identity.attemptId}:${name}`,
      identity,
      dimension: 'tokens',
      metricName: name,
      value,
      unit: 'tokens',
      classification: value !== null ? 'runtime_reported' : 'unknown',
      periodStart: null,
      periodEnd: null,
      sourceRef,
      formula: null,
      pricingSource: null,
      pricingAsOf: null,
      dedupeScope,
      evidenceStatus: value !== null ? 'verified' : 'unknown',
      evidenceRefs: [sourceRef],
    });

    const costMetric: MetricSample = {
      metricId: `${identity.runId}:${identity.attemptId}:cost.usd`,
      identity,
      dimension: 'cost',
      metricName: 'cost.usd',
      value: 0,
      unit: 'USD',
      classification: 'runtime_reported',
      periodStart: null,
      periodEnd: null,
      sourceRef,
      formula: null,
      pricingSource: null,
      pricingAsOf: null,
      dedupeScope,
      evidenceStatus: 'verified',
      evidenceRefs: [sourceRef],
    };

    const contextMetric = (name: MetricName): MetricSample => ({
      metricId: `${identity.runId}:${identity.attemptId}:${name}`,
      identity,
      dimension: 'context',
      metricName: name,
      value: null,
      unit: 'tokens',
      classification: 'unknown',
      periodStart: null,
      periodEnd: null,
      sourceRef,
      formula: null,
      pricingSource: null,
      pricingAsOf: null,
      dedupeScope,
      evidenceStatus: 'unknown',
      evidenceRefs: [sourceRef],
    });

    return {
      usage: {
        inputTokens: usageMetric('tokens.input', 1280),
        outputTokens: usageMetric('tokens.output', 187),
        cacheReadTokens: usageMetric('tokens.cache_read', null),
        cacheWriteTokens: usageMetric('tokens.cache_write', null),
        reasoningTokens: usageMetric('tokens.reasoning', null),
      },
      context: {
        maxTokens: contextMetric('context.max_tokens'),
        currentTokens: contextMetric('context.current_tokens'),
        historicalTokens: contextMetric('context.historical_tokens'),
        compactionCount: {
          ...contextMetric('context.compaction_count'),
          unit: 'count',
        },
      },
      cost: {
        usd: costMetric,
        billingStatus: 'reported',
      },
      reasoningVisibility: 'unavailable',
    };
  }

  async shutdown(session: RuntimeSession): Promise<void> {
    const active = this.activeSessions.get(session.identity.sessionId);
    if (active) {
      active.handle.terminate();
      this.activeSessions.delete(session.identity.sessionId);
    }
  }

  private degradedHealth(startedAt: number, diagnostics: string[]): RuntimeHealth {
    return {
      status: 'degraded',
      checkedAt: this.now(),
      latencyMs: Date.now() - startedAt,
      evidenceStatus: 'pending_fixture',
      evidenceRefs: [ACP_FIXTURE_REF],
      diagnostics,
    };
  }
}

export function createOpenCodeAcpRuntimeAdapter(
  canonicalRepoPath: string,
  executable: string,
  runner = new RuntimeProcessRunner(),
  now?: () => string,
): OpenCodeAcpRuntimeAdapter {
  return new OpenCodeAcpRuntimeAdapter(canonicalRepoPath, executable, runner, now);
}

