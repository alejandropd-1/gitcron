import type {
  PipelineEventEnvelope,
  RuntimeDescriptor,
  RuntimeDiscovery,
  RuntimeHealth,
  RuntimeSession,
  RuntimeTelemetrySnapshot,
} from '../../../types/pipeline';
import { BoundedJsonlDecoder } from './jsonl-decoder';
import {
  RuntimeProcessRunner,
  type RuntimeProcessHandle,
  type RuntimeProcessResult,
} from './process-runner';
import type { RuntimeAdapter } from './runtime-adapter';

const ACP_FIXTURE_REF = 'docs/pipeline/f03/fixtures/opencode-1.18.3-acp-initialize.sanitized.json';
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
      availability: 'unknown',
      evidenceStatus: 'pending_fixture',
      targetScopes: ['repo', 'run'],
      constraints: ['session/new and prompt flow not captured'],
      evidenceRefs: [ACP_FIXTURE_REF],
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
      constraints: ['session/update fixture required'],
      evidenceRefs: [ACP_FIXTURE_REF],
    },
    {
      capabilityId: 'telemetry.snapshot',
      capabilityVersion: null,
      availability: 'unknown',
      evidenceStatus: 'verified',
      targetScopes: ['run', 'session'],
      constraints: ['summary fixture only; project filtering and dedupe pending'],
      evidenceRefs: [SUMMARY_FIXTURE_REF],
    },
  ],
};

type OpenCodeAcpInitialize = {
  protocolVersion: number;
  agentVersion: string;
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

export class OpenCodeAcpRuntimeAdapter implements RuntimeAdapter {
  readonly descriptor = OPENCODE_ACP_DESCRIPTOR;

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

  async *events(_session: RuntimeSession): AsyncIterable<PipelineEventEnvelope> {
    throw new Error('OpenCode ACP sessions remain pending_fixture');
  }

  async telemetry(_session: RuntimeSession): Promise<RuntimeTelemetrySnapshot> {
    throw new Error('OpenCode ACP session telemetry remains pending_fixture');
  }

  async shutdown(_session: RuntimeSession): Promise<void> {
    throw new Error('OpenCode ACP sessions remain pending_fixture');
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
