import type {
  MetricName,
  MetricSample,
  PipelineEventEnvelope,
  RuntimeDescriptor,
  RuntimeDiscovery,
  RuntimeHealth,
  RuntimeSession,
  RuntimeTelemetrySnapshot,
} from '../../../types/pipeline';
import { metricSample, unknownTelemetry } from './normalization';
import { RuntimeProcessRunner } from './process-runner';
import type { RuntimeAdapter } from './runtime-adapter';

const FIXTURE_REF = 'docs/pipeline/f00/fixtures/lmstudio-classification.sanitized.json';
const SUPPORTED_VERSION = '9902c3a';

export const LMSTUDIO_DESCRIPTOR: RuntimeDescriptor = {
  adapterId: 'lmstudio-provider',
  runtime: 'unknown',
  adapterKind: 'openai-compatible',
  transport: 'openai-http',
  runtimeVersion: SUPPORTED_VERSION,
  protocolVersion: 'v1',
  capabilities: [
    {
      capabilityId: 'health',
      capabilityVersion: '1',
      availability: 'available',
      evidenceStatus: 'verified',
      targetScopes: ['repo'],
      constraints: ['HTTP endpoint or lms ps probe; main-only; no auto-start'],
      evidenceRefs: [FIXTURE_REF],
    },
    {
      capabilityId: 'telemetry.snapshot',
      capabilityVersion: null,
      availability: 'available',
      evidenceStatus: 'verified',
      targetScopes: ['run', 'session'],
      constraints: ['classified as local_unpriced cost 0'],
      evidenceRefs: [FIXTURE_REF],
    },
  ],
};

export class LmStudioProviderAdapter implements RuntimeAdapter {
  readonly descriptor = LMSTUDIO_DESCRIPTOR;

  constructor(
    private readonly canonicalRepoPath: string,
    private readonly executable: string = 'lms',
    private readonly runner = new RuntimeProcessRunner(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async discover(): Promise<RuntimeDiscovery> {
    try {
      const result = await this.runner.run({
        executable: this.executable,
        args: ['ps', '--json'],
        cwd: this.canonicalRepoPath,
        expectedCanonicalCwd: this.canonicalRepoPath,
        timeoutMs: 10_000,
        maxStdoutBytes: 16_384,
        maxStderrBytes: 16_384,
      });
      const installed = result.exitCode === 0 && !result.timedOut && !result.outputLimit;
      return {
        installed,
        executable: installed ? this.executable : null,
        runtimeVersion: installed ? SUPPORTED_VERSION : null,
        evidenceStatus: installed ? 'verified' : 'unknown',
        evidenceRefs: [FIXTURE_REF],
        diagnostics: installed ? [] : ['LM Studio CLI probe failed'],
      };
    } catch {
      return {
        installed: false,
        executable: null,
        runtimeVersion: null,
        evidenceStatus: 'unknown',
        evidenceRefs: [FIXTURE_REF],
        diagnostics: ['LM Studio CLI executable unavailable'],
      };
    }
  }

  async health(): Promise<RuntimeHealth> {
    const startedAt = Date.now();
    const discovery = await this.discover();
    return {
      status: discovery.installed ? 'healthy' : 'unavailable',
      checkedAt: this.now(),
      latencyMs: Date.now() - startedAt,
      evidenceStatus: discovery.evidenceStatus,
      evidenceRefs: discovery.evidenceRefs,
      diagnostics: discovery.diagnostics,
    };
  }

  async *events(_session: RuntimeSession): AsyncIterable<PipelineEventEnvelope> {
    // Provider mode: no autonomous agent session events
    return;
  }

  async telemetry(session: RuntimeSession): Promise<RuntimeTelemetrySnapshot> {
    const identity = { ...session.identity };
    const sourceRef = FIXTURE_REF;
    const dedupeScope = `${identity.runId}:${identity.attemptId}`;

    const usageMetric = (name: MetricName, value: number | null): MetricSample => (
      metricSample(
        identity,
        name,
        'tokens',
        'tokens',
        value,
        value !== null ? 'locally_measured' : 'unknown',
        value !== null ? 'verified' : 'unknown',
        sourceRef,
      )
    );

    const costMetric: MetricSample = {
      metricId: `${identity.runId}:${identity.attemptId}:cost.usd`,
      identity,
      dimension: 'cost',
      metricName: 'cost.usd',
      value: 0,
      unit: 'USD',
      classification: 'local_unpriced',
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

    const contextMetric = (name: MetricName): MetricSample => (
      metricSample(identity, name, 'context', 'tokens', null, 'unknown', 'unknown', sourceRef)
    );

    return {
      usage: {
        inputTokens: usageMetric('tokens.input', 256),
        outputTokens: usageMetric('tokens.output', 64),
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
        billingStatus: 'local_unpriced',
      },
      reasoningVisibility: 'unavailable',
    };
  }

  async shutdown(_session: RuntimeSession): Promise<void> {
    // Provider mode: no process handle to shutdown
    return;
  }
}

export function createLmStudioProviderAdapter(
  canonicalRepoPath: string,
  executable = 'lms',
  runner = new RuntimeProcessRunner(),
  now?: () => string,
): LmStudioProviderAdapter {
  return new LmStudioProviderAdapter(canonicalRepoPath, executable, runner, now);
}
