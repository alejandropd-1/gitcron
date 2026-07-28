import { describe, expect, it } from 'vitest';
import type { PipelineState, RuntimeProjection } from '@/types/pipeline';
import { mergeRuntimeIntoSnapshot, toPipelineSnapshot } from '../pipeline-adapter';
import { hasUsableCostCoverage } from '../pipeline-domain';

function state(overrides: Partial<PipelineState> = {}): PipelineState {
  return {
    repoId: 'repo-1',
    observedAt: '2026-07-25T00:00:00.000Z',
    revision: 1,
    tasks: [],
    reports: [],
    gates: [],
    delegations: [],
    visualDiffs: [],
    decisions: [],
    activeChanges: [],
    archivedChanges: [],
    mergedChanges: [],
    diagnostics: [],
    selection: { changeId: null, confidence: 'unknown', selectionRequired: false, reason: '' },
    ...overrides,
  };
}

const delegation = (over: Partial<PipelineState['delegations'][number]> = {}) => ({
  ts: '2026-07-25T00:00:00.000Z',
  role: 'builder',
  model: 'claude-opus-5',
  task: 'x',
  result: 'ok',
  tokensIn: 100,
  tokensOut: 50,
  costUsd: 0.5,
  durationMs: 1000,
  retries: null,
  humanWaitMs: null,
  humanTouches: null,
  ...over,
});

describe('toPipelineSnapshot', () => {
  it('reports no activity for an empty repo instead of inventing one', () => {
    expect(toPipelineSnapshot(state()).hasPipelineActivity).toBe(false);
  });

  it('never turns missing telemetry into zero', () => {
    const snapshot = toPipelineSnapshot(state({
      delegations: [delegation({ tokensIn: null, tokensOut: null, costUsd: null })],
    }));
    expect(snapshot.economy.tokens.input).toBeNull();
    expect(snapshot.economy.tokens.output).toBeNull();
    expect(snapshot.economy.costUsd).toBeNull();
    expect(snapshot.economy.costBasis).toBe('unknown');
  });

  it('keeps reasoning and cache tokens unknown: this source does not carry them', () => {
    const snapshot = toPipelineSnapshot(state({ delegations: [delegation()] }));
    expect(snapshot.economy.tokens.reasoning).toBeNull();
    expect(snapshot.economy.tokens.cacheRead).toBeNull();
  });

  // Antes esto afirmaba `false`, que se renderiza como "este runtime no expone
  // su razonamiento". Sin sesión adjunta ningún runtime declaró tal cosa: es la
  // misma clase de mentira que `unknown` valiendo 0, y por eso ahora es `null`.
  it('does not claim the runtime hides its reasoning when no session declared it', () => {
    const snapshot = toPipelineSnapshot(state({ delegations: [delegation()] }));
    expect(snapshot.economy.reasoningAvailable).toBeNull();
  });

  it('sums only the records that reported a value', () => {
    const snapshot = toPipelineSnapshot(state({
      delegations: [delegation({ tokensIn: 100 }), delegation({ tokensIn: null })],
    }));
    expect(snapshot.economy.tokens.input).toBe(100);
  });

  it('marks cost coverage as partial when some delegations lack it', () => {
    const snapshot = toPipelineSnapshot(state({
      delegations: [delegation({ costUsd: 0.5 }), delegation({ costUsd: null })],
    }));
    expect(snapshot.economy.costCoverage).toEqual({ withCost: 1, total: 2 });
    expect(hasUsableCostCoverage(snapshot.economy)).toBe(false);
  });

  it('does not invent a parent/child tree the evidence never recorded', () => {
    const snapshot = toPipelineSnapshot(state({
      delegations: [delegation(), delegation()],
    }));
    expect(snapshot.agents.every((agent) => agent.parentAgentId === null)).toBe(true);
    expect(snapshot.agents.every((agent) => agent.runtime === null)).toBe(true);
  });

  it('does not guess which runtime ran from repo evidence', () => {
    const snapshot = toPipelineSnapshot(state({ delegations: [delegation()] }));
    expect(snapshot.now.runtime).toBeNull();
  });

  it('sends the path back to the fixer when the auditor rejected', () => {
    const snapshot = toPipelineSnapshot(state({
      activeChanges: ['change-1'],
      decisions: [{
        decisionId: 'd1', repoId: 'repo-1', changeId: null, kind: 'audit-rejected',
        status: 'pending', title: 'rechazo', summary: '', risk: 'high', riskReason: null,
        provenance: 'repo', evidenceRefs: [], requestedAt: '2026-07-25T00:00:00.000Z',
      }],
    }));
    const byId = new Map(snapshot.stations.map((s) => [s.id, s.state]));
    expect(byId.get('auditor')).toBe('rejected');
    expect(byId.get('fixer')).toBe('current');
  });

  it('marks a red gate as rejected rather than merely pending', () => {
    const snapshot = toPipelineSnapshot(state({
      gates: [{ ts: '2026-07-25T00:00:00.000Z', mode: 'fast', result: 'ROJO' }],
    }));
    expect(snapshot.stations.find((s) => s.id === 'gates')?.state).toBe('rejected');
  });

  it('only advertises the kit as a source when gates or reports exist', () => {
    expect(toPipelineSnapshot(state()).availableSources).toEqual(['git']);
    const withKit = toPipelineSnapshot(state({ reports: ['r.md'] }));
    expect(withKit.availableSources).toContain('kit');
  });

  it('surfaces only pending decisions and never exposes an executable option', () => {
    const snapshot = toPipelineSnapshot(state({
      decisions: [
        {
          decisionId: 'd1', repoId: 'repo-1', changeId: null, kind: 'dependency-request',
          status: 'pending', title: 'dep', summary: 'por qué', risk: 'high', riskReason: 'x',
          provenance: 'repo', evidenceRefs: ['gates.jsonl'], requestedAt: '2026-07-25T00:00:00.000Z',
        },
        {
          decisionId: 'd2', repoId: 'repo-1', changeId: null, kind: 'clarification',
          status: 'answered', title: 'vieja', summary: '', risk: 'low', riskReason: null,
          provenance: 'repo', evidenceRefs: [], requestedAt: '2026-07-25T00:00:00.000Z',
        },
      ],
    }));
    expect(snapshot.decisions.map((d) => d.decisionId)).toEqual(['d1']);
    expect(snapshot.decisions[0].options.every((o) => o.availability === 'informational')).toBe(true);
    expect(snapshot.now.needsHuman).toBe(true);
  });

  it('leaves the activity log empty because this source has no runtime stream', () => {
    expect(toPipelineSnapshot(state({ delegations: [delegation()] })).activity).toEqual([]);
  });
});

const projection = (over: Partial<RuntimeProjection> = {}): RuntimeProjection => ({
  schemaVersion: '1.0',
  repoId: 'repo-1',
  sessionId: 'session-1',
  runtime: 'claude',
  changeId: 'change-1',
  taskId: '1.1',
  role: 'builder',
  active: true,
  outcome: 'running',
  startedAt: '2026-07-26T00:00:00.000Z',
  endedAt: null,
  agents: [],
  activity: [],
  reasoningVisibility: 'unknown',
  telemetry: null,
  controlCapabilities: [],
  droppedActivity: 0,
  diagnostics: [],
  ...over,
});

const telemetry = (over: Partial<NonNullable<RuntimeProjection['telemetry']>> = {}) => ({
  inputTokens: null,
  outputTokens: null,
  reasoningTokens: null,
  cacheReadTokens: null,
  costUsd: null,
  costBasis: 'unknown' as const,
  contextMaxTokens: null,
  contextCurrentTokens: null,
  compactionCount: null,
  ...over,
});

describe('mergeRuntimeIntoSnapshot', () => {
  it('leaves the snapshot untouched when no session is attached', () => {
    const base = toPipelineSnapshot(state({ delegations: [delegation()] }));
    expect(mergeRuntimeIntoSnapshot(base, null)).toEqual(base);
  });

  // La regla más importante del merge: las dos fuentes pueden describir la
  // misma corrida, así que sumarlas contaría dos veces lo mismo. Un total
  // inflado miente igual que un cero.
  it('never adds runtime tokens on top of what the repo already reported', () => {
    const base = toPipelineSnapshot(state({ delegations: [delegation({ tokensIn: 100 })] }));
    const merged = mergeRuntimeIntoSnapshot(base, projection({
      telemetry: telemetry({ inputTokens: 700 }),
    }));
    expect(merged.economy.tokens.input).toBe(100);
  });

  it('fills only the gaps the repo evidence left unknown', () => {
    const base = toPipelineSnapshot(state({ delegations: [delegation({ tokensIn: null })] }));
    const merged = mergeRuntimeIntoSnapshot(base, projection({
      telemetry: telemetry({ inputTokens: 700, reasoningTokens: 42, contextMaxTokens: 200_000 }),
    }));
    expect(merged.economy.tokens.input).toBe(700);
    expect(merged.economy.tokens.reasoning).toBe(42);
    expect(merged.economy.contextMaxTokens).toBe(200_000);
  });

  it('keeps context and compaction unknown while the run has no telemetry yet', () => {
    const base = toPipelineSnapshot(state({ delegations: [delegation()] }));
    const merged = mergeRuntimeIntoSnapshot(base, projection({ telemetry: null }));
    expect(merged.economy.contextMaxTokens).toBeNull();
    expect(merged.economy.contextCurrentTokens).toBeNull();
    expect(merged.economy.compactionCount).toBeNull();
  });

  it('distinguishes "not exposed" from "not known yet"', () => {
    const base = toPipelineSnapshot(state());
    expect(mergeRuntimeIntoSnapshot(base, projection({ reasoningVisibility: 'unknown' })).economy.reasoningAvailable).toBeNull();
    expect(mergeRuntimeIntoSnapshot(base, projection({ reasoningVisibility: 'unavailable' })).economy.reasoningAvailable).toBe(false);
    expect(mergeRuntimeIntoSnapshot(base, projection({ reasoningVisibility: 'emitted' })).economy.reasoningAvailable).toBe(true);
  });

  // La jerarquía sale de `PipelineIdentity`, no se deriva acá: un solo agente
  // observado produce un solo nodo, y eso es el dato, no una carencia.
  it('carries the observed parent/child hierarchy without inventing depth', () => {
    const merged = mergeRuntimeIntoSnapshot(toPipelineSnapshot(state()), projection({
      agents: [
        { agentId: 'a', parentAgentId: null, runtime: 'claude', provider: null, model: 'm', role: 'builder', state: 'running', firstSeenAt: null, lastSeenAt: null, elapsedMs: 12 },
        { agentId: 'b', parentAgentId: 'a', runtime: 'claude', provider: null, model: 'm', role: 'auditor', state: 'done', firstSeenAt: null, lastSeenAt: null, elapsedMs: null },
      ],
    }));
    expect(merged.agents.map((agent) => agent.parentAgentId)).toEqual([null, 'a']);
  });

  it('does not attribute session totals to individual agents', () => {
    const merged = mergeRuntimeIntoSnapshot(toPipelineSnapshot(state()), projection({
      agents: [{ agentId: 'a', parentAgentId: null, runtime: 'claude', provider: null, model: null, role: 'builder', state: 'running', firstSeenAt: null, lastSeenAt: null, elapsedMs: null }],
      telemetry: telemetry({ inputTokens: 900, outputTokens: 300 }),
    }));
    expect(merged.agents[0].inputTokens).toBeNull();
    expect(merged.agents[0].outputTokens).toBeNull();
  });

  it('keeps repo delegations alongside runtime agents instead of replacing them', () => {
    const base = toPipelineSnapshot(state({ delegations: [delegation()] }));
    const merged = mergeRuntimeIntoSnapshot(base, projection({
      agents: [{ agentId: 'a', parentAgentId: null, runtime: 'claude', provider: null, model: null, role: 'builder', state: 'running', firstSeenAt: null, lastSeenAt: null, elapsedMs: null }],
    }));
    expect(merged.agents).toHaveLength(2);
    // Sólo los del stream traen runtime: así se distinguen en la vista.
    expect(merged.agents.filter((agent) => agent.runtime !== null)).toHaveLength(1);
  });

  it('treats a live session as activity even on a repo that wrote nothing yet', () => {
    const base = toPipelineSnapshot(state());
    expect(base.hasPipelineActivity).toBe(false);
    const merged = mergeRuntimeIntoSnapshot(base, projection());
    expect(merged.hasPipelineActivity).toBe(true);
    expect(merged.availableSources).toContain('runtime');
  });

  it('names the running runtime only while the session is active', () => {
    const base = toPipelineSnapshot(state());
    expect(mergeRuntimeIntoSnapshot(base, projection({ active: true })).now.runtime).toBe('claude');
    // Cerrada la sesión, el runtime deja de estar corriendo: no se sigue
    // afirmando en "Ahora" algo que ya no está pasando.
    expect(mergeRuntimeIntoSnapshot(base, projection({ active: false })).now.runtime).toBeNull();
  });

  it('brings the activity log the repo evidence could never carry', () => {
    const merged = mergeRuntimeIntoSnapshot(toPipelineSnapshot(state()), projection({
      activity: [
        { entryId: 'e1', channel: 'narrative', text: 'hola', at: null, agentId: 'a' },
        { entryId: 'e2', channel: 'reasoning', text: 'pensando', at: null, agentId: 'a' },
      ],
    }));
    expect(merged.activity.map((entry) => entry.channel)).toEqual(['narrative', 'reasoning']);
  });
});
