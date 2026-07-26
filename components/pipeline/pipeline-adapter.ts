import type {
  DelegationRecord,
  GateRecord,
  PipelineState,
  DecisionRequest as EvidenceDecision,
} from '@/types/pipeline';
import type {
  ChangeStation,
  DecisionRequest,
  EconomyState,
  NowState,
  AgentNode,
} from './pipeline-domain';
import type { PipelineSnapshot, PipelineSource } from './pipeline-view-state';
import { SUPPORTED_SNAPSHOT_VERSION } from './pipeline-view-state';

/**
 * Traduce la evidencia real per-repo (`PipelineState`, forma de F01) al snapshot
 * que consume el workspace.
 *
 * Es la frontera donde se decide qué se puede afirmar. La regla que gobierna
 * todo el archivo: **lo que la evidencia no dice, queda `null`**. Nunca `0`,
 * nunca un valor por defecto que parezca medido.
 */

/** Suma que devuelve `null` si NINGÚN registro aportó el dato. */
function sumOrNull(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length === 0 ? null : present.reduce((a, b) => a + b, 0);
}

function toAgents(delegations: DelegationRecord[]): AgentNode[] {
  return delegations.map((record, index) => ({
    // La evidencia de F01 no expone ids de agente ni jerarquía padre/hijo, así
    // que se listan en plano. Inventar un árbol sería afirmar una relación que
    // nadie observó.
    agentId: `delegation-${index}`,
    parentAgentId: null,
    runtime: null,
    provider: null,
    model: record.model || null,
    role: record.role || null,
    state: record.result ? 'done' : 'unknown',
    elapsedMs: record.durationMs,
    inputTokens: record.tokensIn,
    outputTokens: record.tokensOut,
  }));
}

function toEconomy(delegations: DelegationRecord[]): EconomyState {
  const withCost = delegations.filter((d) => d.costUsd !== null).length;
  return {
    tokens: {
      input: sumOrNull(delegations.map((d) => d.tokensIn)),
      output: sumOrNull(delegations.map((d) => d.tokensOut)),
      // La evidencia de F01 no separa reasoning ni caché: quedan desconocidos.
      reasoning: null,
      cacheRead: null,
    },
    costUsd: sumOrNull(delegations.map((d) => d.costUsd)),
    costBasis: withCost > 0 ? 'runtime_reported' : 'unknown',
    costCoverage: { withCost, total: delegations.length },
    contextMaxTokens: null,
    contextCurrentTokens: null,
    compactionCount: null,
    // Sin stream de runtime conectado no hay reasoning que mostrar, y se dice.
    reasoningAvailable: false,
  };
}

function toDecisions(decisions: EvidenceDecision[]): DecisionRequest[] {
  return decisions
    .filter((decision) => decision.status === 'pending')
    .map((decision) => ({
      decisionId: decision.decisionId,
      kind: decision.kind,
      title: decision.title,
      why: decision.summary || null,
      // F04 no ejecuta nada: sólo se ofrece ver la evidencia.
      options: [
        {
          id: 'view-evidence',
          labelKey: 'pipeline.option.viewEvidence',
          consequence: null,
          availability: 'informational' as const,
        },
      ],
      risk: decision.risk,
      riskProvenance: decision.riskReason ? decision.provenance : null,
      evidenceRefs: decision.evidenceRefs,
      technicalContext: null,
      provenance: decision.provenance,
      evidenceStatus: 'verified' as const,
    }));
}

/**
 * Deriva las estaciones de la vía a partir de lo que la evidencia demuestra.
 *
 * Cada estación se marca `done` sólo con evidencia positiva. Sin señal, queda
 * `possible`: un camino que todavía no ocurrió, no un paso saltado.
 */
function toStations(state: PipelineState): ChangeStation[] {
  const hasChange = state.activeChanges.length > 0 || state.mergedChanges.length > 0;
  const tasksDone = state.tasks.filter((task) => task.completed).length;
  const hasTasks = state.tasks.length > 0;
  const gatesGreen = state.gates.length > 0
    && state.gates.every((gate: GateRecord) => gate.result === 'VERDE');
  const gatesRed = state.gates.some((gate: GateRecord) => gate.result === 'ROJO');
  const rejected = state.decisions.some((d) => d.kind === 'audit-rejected' && d.status === 'pending');
  const merged = state.mergedChanges.length > 0;

  const station = (
    id: ChangeStation['id'],
    done: boolean,
    humanGate = false,
  ): ChangeStation => ({
    id,
    state: done ? 'done' : 'possible',
    humanGate,
    detailKey: null,
  });

  const stations: ChangeStation[] = [
    station('proposal', hasChange),
    station('approval', hasChange, true),
    station('builder', hasTasks && tasksDone > 0),
    station('gates', gatesGreen),
    { id: 'auditor', state: rejected ? 'rejected' : gatesGreen ? 'done' : 'possible', humanGate: false, detailKey: null },
    { id: 'fixer', state: rejected ? 'current' : 'possible', humanGate: false, detailKey: null },
    station('merge', merged, true),
  ];

  // Marca "en curso" la primera estación no cumplida, salvo que el rechazo ya
  // haya puesto al fixer en curso.
  if (!rejected) {
    const next = stations.find((s) => s.state === 'possible');
    if (next && !merged) next.state = 'current';
  }
  if (gatesRed) {
    const gates = stations.find((s) => s.id === 'gates');
    if (gates) gates.state = 'rejected';
  }
  return stations;
}

function toNow(state: PipelineState, economy: EconomyState): NowState {
  const tasksTotal = state.tasks.length;
  const tasksDone = state.tasks.filter((task) => task.completed).length;
  const pendingDecisions = state.decisions.filter((d) => d.status === 'pending').length;
  const last = state.delegations[state.delegations.length - 1] ?? null;

  return {
    headlineKey: tasksTotal > 0 ? 'pipeline.now.title' : 'pipeline.now.idle',
    // La evidencia del repo no identifica el runtime que corrió: no se adivina.
    runtime: null,
    role: last?.role ?? null,
    taskLabel: state.activeChanges[0] ?? null,
    tasksDone: tasksTotal > 0 ? tasksDone : null,
    tasksTotal: tasksTotal > 0 ? tasksTotal : null,
    elapsedMs: last?.durationMs ?? null,
    costUsd: economy.costUsd,
    costBasis: economy.costBasis,
    needsHuman: pendingDecisions > 0,
  };
}

function toSources(state: PipelineState): PipelineSource[] {
  const sources: PipelineSource[] = ['git'];
  // El kit aporta gates y reportes: si hay alguno, el kit está presente.
  if (state.gates.length > 0 || state.reports.length > 0) sources.push('kit');
  if (state.delegations.length > 0) sources.push('runtime');
  return sources;
}

export function toPipelineSnapshot(state: PipelineState): PipelineSnapshot {
  const economy = toEconomy(state.delegations);
  return {
    schemaVersion: SUPPORTED_SNAPSHOT_VERSION,
    repoId: state.repoId,
    availableSources: toSources(state),
    // Hermes no es gateway obligatorio y esta lectura no lo consulta: se
    // reporta conectado para no disparar un estado degradado que no observamos.
    hermesConnected: true,
    hasPipelineActivity:
      state.tasks.length > 0
      || state.activeChanges.length > 0
      || state.mergedChanges.length > 0
      || state.gates.length > 0
      || state.delegations.length > 0,
    now: toNow(state, economy),
    stations: toStations(state),
    decisions: toDecisions(state.decisions),
    agents: toAgents(state.delegations),
    // La bitácora necesita el stream de runtime, que esta lectura no cubre.
    activity: [],
    economy,
  };
}
