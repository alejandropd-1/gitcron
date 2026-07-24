import { describe, expect, it } from 'vitest';
import {
  RuntimeProcessRunner,
  createAgyWrapperRuntimeAdapter,
  validateRuntimeAdapterContract,
  type RuntimeProcessResult,
  type RuntimeProcessSpec,
} from '../pipeline/runtime-adapters';

class AgyTestRunner extends RuntimeProcessRunner {
  constructor(private readonly versionOutput: string, private readonly exitCode = 0) {
    super();
  }

  override async run(_spec: RuntimeProcessSpec): Promise<RuntimeProcessResult> {
    return {
      processId: 'version-probe',
      exitCode: this.exitCode,
      signal: null,
      stdout: Buffer.from(this.versionOutput),
      stderr: Buffer.alloc(0),
      durationMs: 1,
      timedOut: false,
      aborted: false,
      outputLimit: null,
    };
  }
}

describe('Antigravity (agy) wrapper adapter', () => {
  it('probes version and returns healthy status for baseline 1.1.5', async () => {
    const runner = new AgyTestRunner('1.1.5\n');
    const adapter = createAgyWrapperRuntimeAdapter('C:\\fixture\\repo', 'agy', runner, () => '2026-07-24T00:00:00.000Z');

    const discovery = await adapter.discover();
    expect(discovery).toMatchObject({
      installed: true,
      runtimeVersion: '1.1.5',
      evidenceStatus: 'verified',
    });

    const health = await adapter.health();
    expect(health).toMatchObject({
      status: 'healthy',
      evidenceStatus: 'verified',
    });

    expect(validateRuntimeAdapterContract(adapter)).toEqual([]);
  });

  it('returns unknown telemetry without assuming dummy zeros or free billing', async () => {
    const runner = new AgyTestRunner('1.1.5\n');
    const adapter = createAgyWrapperRuntimeAdapter('C:\\fixture\\repo', 'agy', runner);

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
        runtime: 'agy' as const,
        provider: null,
        requestedModel: null,
        effectiveModel: null,
        reportedModel: null,
        role: 'builder' as const,
      },
      descriptor: adapter.descriptor,
      ownedProcess: false,
      startedAt: '2026-07-24T00:00:00.000Z',
    };

    const telemetry = await adapter.telemetry(session);
    expect(telemetry.usage.inputTokens.value).toBeNull();
    expect(telemetry.usage.inputTokens.classification).toBe('unknown');
    expect(telemetry.cost.usd.value).toBeNull();
    expect(telemetry.cost.usd.classification).toBe('unknown');
    expect(telemetry.cost.billingStatus).toBe('unknown');
    expect(telemetry.reasoningVisibility).toBe('unavailable');
  });

  it('degrades when installed agy version differs from expected 1.1.5 baseline', async () => {
    const runner = new AgyTestRunner('2.0.0\n');
    const adapter = createAgyWrapperRuntimeAdapter('C:\\fixture\\repo', 'agy', runner);

    const health = await adapter.health();
    expect(health).toMatchObject({
      status: 'degraded',
      evidenceStatus: 'pending_fixture',
    });
  });
});
