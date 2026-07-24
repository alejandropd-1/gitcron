import { describe, expect, it } from 'vitest';
import {
  RuntimeProcessRunner,
  createLmStudioProviderAdapter,
  validateRuntimeAdapterContract,
  type RuntimeProcessResult,
  type RuntimeProcessSpec,
} from '../pipeline/runtime-adapters';

class LmStudioTestRunner extends RuntimeProcessRunner {
  constructor(private readonly stdout: string, private readonly exitCode = 0) {
    super();
  }

  override async run(_spec: RuntimeProcessSpec): Promise<RuntimeProcessResult> {
    return {
      processId: 'ps-probe',
      exitCode: this.exitCode,
      signal: null,
      stdout: Buffer.from(this.stdout),
      stderr: Buffer.alloc(0),
      durationMs: 1,
      timedOut: false,
      aborted: false,
      outputLimit: null,
    };
  }
}

describe('LM Studio provider adapter', () => {
  it('probes loaded models and returns healthy status', async () => {
    const runner = new LmStudioTestRunner('[]\n');
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner, () => '2026-07-24T00:00:00.000Z');

    const discovery = await adapter.discover();
    expect(discovery).toMatchObject({
      installed: true,
      runtimeVersion: '9902c3a',
      evidenceStatus: 'verified',
    });

    const health = await adapter.health();
    expect(health).toMatchObject({
      status: 'healthy',
      evidenceStatus: 'verified',
    });

    expect(validateRuntimeAdapterContract(adapter)).toEqual([]);
  });

  it('normalizes telemetry with local_unpriced cost classification and billingStatus', async () => {
    const runner = new LmStudioTestRunner('[]\n');
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner);

    const session = {
      identity: {
        repoId: 'repo-1',
        repoPath: 'C:\\fixture\\repo',
        changeId: null,
        taskId: null,
        runId: 'run-1',
        attemptId: 'attempt-1',
        sessionId: 'session-1',
        parentSessionId: null,
        agentId: 'agent-1',
        parentAgentId: null,
        orchestrationMode: 'direct' as const,
        orchestratorRuntime: null,
        runtime: 'unknown' as const,
        provider: 'LM Studio',
        requestedModel: 'qwen3',
        effectiveModel: 'qwen3',
        reportedModel: 'qwen3',
        role: 'builder' as const,
      },
      descriptor: adapter.descriptor,
      ownedProcess: false,
      startedAt: '2026-07-24T00:00:00.000Z',
    };

    const telemetry = await adapter.telemetry(session);
    expect(telemetry.cost.usd.value).toBe(0);
    expect(telemetry.cost.usd.classification).toBe('local_unpriced');
    expect(telemetry.cost.billingStatus).toBe('local_unpriced');
    expect(telemetry.usage.inputTokens.value).toBe(256);
    expect(telemetry.usage.outputTokens.value).toBe(64);
  });

  it('handles probe failure gracefully', async () => {
    const runner = new LmStudioTestRunner('', 1);
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner);

    const health = await adapter.health();
    expect(health).toMatchObject({
      status: 'unavailable',
      evidenceStatus: 'unknown',
    });
  });
});
