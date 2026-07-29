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
    decisions: [],
    activeChanges: [],
    archivedChanges: [],
    mergedChanges: [],
    diagnostics: [],
    selection: { changeId: null, confidence: 'unknown', selectionRequired: false, reason: '' },
    ...overrides,
  };
}

describe('toPipelineSnapshot', () => {
  it('reports no activity for an empty repo instead of inventing one', () => {
    expect(toPipelineSnapshot(state()).hasPipelineActivity).toBe(false);
  });

  // El registro de delegaciones era la unica fuente de economia en la lectura
  // del repositorio. Sin el no se observa nada, y cero afirmaria que no hubo
  // consumo: null y unknown son la unica respuesta honesta.
  it('never turns missing telemetry into zero', () => {
    const snapshot = toPipelineSnapshot(state({ activeChanges: ['change-1'] }));
    expect(snapshot.economy.tokens.input).toBeNull();
    expect(snapshot.economy.tokens.output).toBeNull();
    expect(snapshot.economy.tokens.reasoning).toBeNull();
    expect(snapshot.economy.tokens.cacheRead).toBeNull();
    expect(snapshot.economy.costUsd).toBeNull();
    expect(snapshot.economy.costBasis).toBe('unknown');
    expect(snapshot.economy.costCoverage).toEqual({ withCost: 0, total: 0 });
  });

  // Antes esto afirmaba `false`, que se renderiza como "este runtime no expone
  // su razonamiento". Sin sesión adjunta ningún runtime declaró tal cosa: es la
  // misma clase de mentira que `unknown` valiendo 0, y por eso ahora es `null`.
  it('does not claim the runtime hides its reasoning when no session declared it', () => {
    const snapshot = toPipelineSnapshot(state({ activeChanges: ['change-1'] }));
    expect(snapshot.economy.reasoningAvailable).toBeNull();
  });

  it('reports no usable cost coverage when nothing was observed', () => {
    const snapshot = toPipelineSnapshot(state({ activeChanges: ['change-1'] }));
    expect(hasUsableCostCoverage(snapshot.economy)).toBe(false);
  });

  // Los agentes que se veian aca salian del registro de delegaciones del kit.
  // La lectura del repositorio ya no observa ninguno: los reales llegan por la
  // sesion de runtime, que es una fuente distinta.
  it('observes no agents from repo evidence alone', () => {
    const snapshot = toPipelineSnapshot(state({ activeChanges: ['change-1'] }));
    expect(snapshot.agents).toEqual([]);
  });

  // La fuente `kit` describía el andamiaje multi-agente retirado. Lo que se
  // declara ahora es OpenSpec, y sólo cuando hay cambios observados.
  it('only advertises OpenSpec as a source when there are observed changes', () => {
    expect(toPipelineSnapshot(state()).availableSources).toEqual(['git']);
    const withChanges = toPipelineSnapshot(state({ activeChanges: ['demo-change'] }));
    expect(withChanges.availableSources).toContain('openspec');
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
  });

  it('leaves the activity log empty because this source has no runtime stream', () => {
    expect(toPipelineSnapshot(state({ activeChanges: ['change-1'] })).activity).toEqual([]);
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
    const base = toPipelineSnapshot(state({ activeChanges: ['change-1'] }));
    expect(mergeRuntimeIntoSnapshot(base, null)).toEqual(base);
  });

  // Antes esta regla evitaba contar dos veces la misma corrida, porque el repo
  // y el runtime podían describirla a la vez. Retirado el registro de
  // delegaciones, el repo ya no aporta economía y el runtime es la única fuente.
  it('fills the economy entirely from the runtime session', () => {
    const base = toPipelineSnapshot(state({ activeChanges: ['change-1'] }));
    const merged = mergeRuntimeIntoSnapshot(base, projection({
      telemetry: telemetry({ inputTokens: 700, reasoningTokens: 42, contextMaxTokens: 200_000 }),
    }));
    expect(merged.economy.tokens.input).toBe(700);
    expect(merged.economy.tokens.reasoning).toBe(42);
    expect(merged.economy.contextMaxTokens).toBe(200_000);
  });

  it('keeps context and compaction unknown while the run has no telemetry yet', () => {
    const base = toPipelineSnapshot(state({ activeChanges: ['change-1'] }));
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

  // Antes se sumaban a los del registro de delegaciones. Retirado ese registro,
  // los únicos agentes observados son los que emite la sesión.
  it('lists only the agents the runtime session emitted', () => {
    const base = toPipelineSnapshot(state({ activeChanges: ['change-1'] }));
    const merged = mergeRuntimeIntoSnapshot(base, projection({
      agents: [{ agentId: 'a', parentAgentId: null, runtime: 'claude', provider: null, model: null, role: 'builder', state: 'running', firstSeenAt: null, lastSeenAt: null, elapsedMs: null }],
    }));
    expect(merged.agents).toHaveLength(1);
    expect(merged.agents[0].runtime).toBe('claude');
  });

  it('treats a live session as activity even on a repo that wrote nothing yet', () => {
    const base = toPipelineSnapshot(state());
    expect(base.hasPipelineActivity).toBe(false);
    const merged = mergeRuntimeIntoSnapshot(base, projection());
    expect(merged.hasPipelineActivity).toBe(true);
    expect(merged.availableSources).toContain('runtime');
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
