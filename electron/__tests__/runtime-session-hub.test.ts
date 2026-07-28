import { describe, expect, it, vi } from 'vitest';
import type {
  PipelineEventEnvelope,
  RuntimeDescriptor,
  RuntimeDiscovery,
  RuntimeHealth,
  RuntimeSession,
  RuntimeTelemetrySnapshot,
  RuntimeProjection,
} from '../../types/pipeline';
import type { RuntimeAdapter, RuntimeStartRequest } from '../pipeline/runtime-adapters/runtime-adapter';
import { RuntimeSessionHub } from '../pipeline/runtime/runtime-session-hub';
import type { RuntimeSessionEvidenceCollector } from '../pipeline/runtime/runtime-session-evidence';

const DESCRIPTOR: RuntimeDescriptor = {
  adapterId: 'fake', runtime: 'claude', adapterKind: 'structured-cli',
  transport: 'test', runtimeVersion: '1.0.0', protocolVersion: null, capabilities: [],
};

function envelope(kind: string, payload: unknown = {}): PipelineEventEnvelope {
  return {
    schemaVersion: '1.0', eventId: `${kind}-1`, sequence: 1, sequenceScope: 's',
    emittedAt: null, observedAt: '2026-07-26T00:00:00.000Z',
    identity: {
      repoId: 'repo-1', repoPath: 'C:/repo', changeId: null, taskId: null, runId: 'run-1',
      attemptId: 'attempt-1', sessionId: 'session-1', parentSessionId: null, agentId: 'agent-1',
      parentAgentId: null, orchestrationMode: 'direct', orchestratorRuntime: null,
      runtime: 'claude', provider: null, requestedModel: null, effectiveModel: null,
      reportedModel: null, role: 'builder',
    },
    kind,
    source: { adapterId: 'fake', instanceId: 'i', transport: 'test', protocolVersion: null },
    payload, provenance: 'runtime', evidenceStatus: 'verified', evidenceRefs: [], redactionVersion: '1',
  };
}

/** Adaptador de mentira: mismo contrato que F03, sin proceso hijo. */
class FakeAdapter implements RuntimeAdapter {
  readonly descriptor = DESCRIPTOR;
  shutdownCalls = 0;

  constructor(private readonly options: { verified?: boolean; events?: PipelineEventEnvelope[] } = {}) {}

  async discover(): Promise<RuntimeDiscovery> {
    return {
      installed: true, executable: 'fake', runtimeVersion: '1.0.0',
      evidenceStatus: this.options.verified === false ? 'pending_fixture' : 'verified',
      evidenceRefs: [], diagnostics: [],
    };
  }

  async health(): Promise<RuntimeHealth> {
    return { status: 'healthy', checkedAt: '', latencyMs: 0, evidenceStatus: 'verified', evidenceRefs: [], diagnostics: [] };
  }

  async start(request: RuntimeStartRequest): Promise<RuntimeSession> {
    return {
      identity: {
        repoId: request.repoId, repoPath: request.canonicalRepoPath, changeId: request.changeId, taskId: request.taskId,
        runId: request.runId, attemptId: request.attemptId, sessionId: 'session-1',
        parentSessionId: null, agentId: 'agent-1', parentAgentId: null,
        orchestrationMode: 'direct', orchestratorRuntime: null, runtime: 'claude',
        provider: null, requestedModel: request.requestedModel, effectiveModel: null,
        reportedModel: null, role: request.role,
      },
      descriptor: DESCRIPTOR, ownedProcess: true, startedAt: '2026-07-26T00:00:00.000Z',
    };
  }

  async *events(): AsyncIterable<PipelineEventEnvelope> {
    for (const event of this.options.events ?? []) yield event;
  }

  async telemetry(): Promise<RuntimeTelemetrySnapshot> {
    throw new Error('no telemetry');
  }

  async shutdown(): Promise<void> {
    this.shutdownCalls += 1;
  }
}

function makeHub(adapter: RuntimeAdapter, launchable = true, evidenceCollector: RuntimeSessionEvidenceCollector | null = null) {
  const bus = { registerSession: vi.fn(), unregisterSession: vi.fn() };
  const notified: string[] = [];
  const history = new Map<string, RuntimeProjection>();
  const historyStore = {
    persistRuntimeProjection: (projection: RuntimeProjection) => history.set(projection.sessionId, structuredClone(projection)),
    loadRuntimeProjections: (repoId: string) => [...history.values()].filter((projection) => projection.repoId === repoId),
  };
  const hub = new RuntimeSessionHub(
    bus,
    (repoPath) => notified.push(repoPath),
    () => '2026-07-26T00:05:00.000Z',
    [{ runtime: 'claude', create: () => adapter, controlCapabilities: ['cancel-run'], launchable }],
    historyStore,
    evidenceCollector,
  );
  return { hub, bus, notified, history };
}

const START = {
  canonicalRepoPath: 'C:/repo',
  repoId: 'repo-1',
  runtime: 'claude' as const,
  instruction: 'auditá el repo',
  role: 'builder' as const,
  requestedModel: null,
  changeId: 'change-1',
  taskId: '1.1',
};

describe('RuntimeSessionHub', () => {
  it('registers the live session on the control bus with only the capabilities it implements', async () => {
    // Éste es el cuarto hueco: sin este registro el bus rechazaba cualquier
    // comando con UNAUTHORIZED_TARGET y el inbox de decisiones era decorativo.
    const { hub, bus } = makeHub(new FakeAdapter());
    const result = await hub.start(START);
    expect(result).toEqual({ ok: true, sessionId: 'session-1' });
    expect(bus.registerSession).toHaveBeenCalledWith({
      sessionId: 'session-1',
      repoPath: 'C:/repo',
      runtime: 'claude',
      capabilities: ['cancel-run'],
    });
  });

  it('does not claim control actions the adapter cannot perform', async () => {
    const { hub } = makeHub(new FakeAdapter());
    await hub.start(START);
    expect(hub.get('C:/repo')?.controlCapabilities).not.toContain('respond-decision');
  });

  it('unregisters the session once the stream closes', async () => {
    const adapter = new FakeAdapter({ events: [envelope('agent.message', { text: 'hola' })] });
    const { hub, bus } = makeHub(adapter);
    await hub.start(START);
    await hub.stop('C:/repo');
    expect(bus.unregisterSession).toHaveBeenCalledWith('session-1');
    expect(hub.get('C:/repo')?.active).toBe(false);
    expect(hub.get('C:/repo')).toMatchObject({ outcome: 'interrupted', changeId: 'change-1', taskId: '1.1' });
  });

  it('refuses a second session on the same repo', async () => {
    const { hub } = makeHub(new FakeAdapter({ events: [] }));
    await hub.start(START);
    // Dos corridas sobre el mismo working tree se pisarían los archivos.
    const second = await hub.start(START);
    expect(second.ok === false && second.error).toBe('session_already_active');
  });

  it('rejects an empty instruction before touching a process', async () => {
    const { hub } = makeHub(new FakeAdapter());
    const result = await hub.start({ ...START, instruction: '   ' });
    expect(result).toEqual({ ok: false, error: 'instruction_required' });
  });

  it('refuses to launch an adapter that has no event stream', async () => {
    const { hub } = makeHub(new FakeAdapter(), false);
    const result = await hub.start(START);
    expect(result).toEqual({ ok: false, error: 'runtime_not_launchable' });
  });

  it('records a diagnostic instead of crashing when telemetry is unavailable', async () => {
    const adapter = new FakeAdapter({ events: [envelope('run.completed', { success: true })] });
    const { hub } = makeHub(adapter);
    await hub.start(START);
    await hub.stop('C:/repo');
    const projection = hub.get('C:/repo');
    expect(projection?.telemetry).toBeNull();
    expect(projection?.diagnostics.some((line) => line.startsWith('telemetry_unavailable'))).toBe(true);
  });

  it('persists the closed projection so it remains available in session history', async () => {
    const adapter = new FakeAdapter({ events: [envelope('run.completed', { success: true })] });
    const { hub } = makeHub(adapter);
    await hub.start(START);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const [saved] = hub.history('repo-1');
    expect(saved).toMatchObject({
      sessionId: 'session-1',
      changeId: 'change-1',
      taskId: '1.1',
      outcome: 'completed',
      active: false,
    });
  });

  it('adds only locally observed Git and OpenSpec evidence to the durable activity', async () => {
    let captures = 0;
    const evidenceCollector: RuntimeSessionEvidenceCollector = {
      captureWorkingTree: vi.fn(async () => {
        captures += 1;
        return captures === 1
          ? { signature: 'before', filesChanged: 0, additions: 0, deletions: 0 }
          : { signature: 'after', filesChanged: 2, additions: 12, deletions: 3 };
      }),
      validateChange: vi.fn(async () => 'passed' as const),
    };
    const { hub } = makeHub(new FakeAdapter({ events: [envelope('run.completed', { success: true })] }), true, evidenceCollector);
    await hub.start(START);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const [saved] = hub.history('repo-1');
    expect(saved.activity.map((entry) => entry.text)).toEqual(expect.arrayContaining([
      'git.changed files=2 additions=12 deletions=3',
      'openspec.validation.passed',
      'session.completed',
    ]));
  });

  it('marks a runtime unlaunchable when the installed version has no verified fixture', async () => {
    const { hub } = makeHub(new FakeAdapter({ verified: false }));
    const [entry] = await hub.discover('C:/repo');
    expect(entry.installed).toBe(true);
    expect(entry.launchable).toBe(false);
  });

  it('shuts every session down on dispose so no process outlives the app', async () => {
    const adapter = new FakeAdapter({ events: [] });
    const { hub } = makeHub(adapter);
    await hub.start(START);
    await hub.disposeAll();
    expect(adapter.shutdownCalls).toBeGreaterThan(0);
  });
});
