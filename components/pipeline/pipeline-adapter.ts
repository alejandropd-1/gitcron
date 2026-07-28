import type {
  DelegationRecord,
  GateRecord,
  PipelineState,
  RuntimeProjection,
  DecisionRequest as EvidenceDecision,
} from '@/types/pipeline';
import type {
  ActivityEntry,
  ChangeStation,
  DecisionRequest,
  EconomyState,
  NowState,
  AgentNode,
} from './pipeline-domain';
import type { OpenSpecWorkspaceSnapshot, PipelineSnapshot, PipelineSource } from './pipeline-view-state';
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
    // Sin sesión de runtime adjunta no sabemos si el runtime expone reasoning.
    // `false` afirmaría que no lo expone, y nadie lo dijo.
    reasoningAvailable: null,
  };
}

/**
 * Traduce la visibilidad de razonamiento del stream al tri-estado de la vista.
 *
 * `unknown` del stream y "no hay stream" colapsan al mismo `null`, y está bien:
 * en los dos casos la evidencia disponible no alcanza para afirmar nada.
 */
function toReasoningAvailable(projection: RuntimeProjection | null): boolean | null {
  if (!projection) return null;
  if (projection.reasoningVisibility === 'emitted' || projection.reasoningVisibility === 'summary') return true;
  if (projection.reasoningVisibility === 'unavailable') return false;
  return null;
}

/**
 * Agentes observados por el stream de runtime.
 *
 * A diferencia de `toAgents`, acá SÍ hay jerarquía, porque `PipelineIdentity`
 * transporta `agentId` y `parentAgentId` reales. No se deriva ni se completa:
 * si el runtime emite un solo agente, el árbol tiene un solo nodo.
 *
 * Los tokens quedan `null` a propósito. El stream sólo reporta totales de
 * sesión al cerrar; repartirlos entre agentes inventaría una atribución que
 * nadie midió. Los totales viven en la economía, que es donde son ciertos.
 */
function toRuntimeAgents(projection: RuntimeProjection | null): AgentNode[] {
  if (!projection) return [];
  return projection.agents.map((agent) => ({
    agentId: agent.agentId,
    parentAgentId: agent.parentAgentId,
    runtime: agent.runtime,
    provider: agent.provider,
    model: agent.model,
    role: agent.role,
    state: agent.state,
    elapsedMs: agent.elapsedMs,
    inputTokens: null,
    outputTokens: null,
  }));
}

function toActivity(projection: RuntimeProjection | null): ActivityEntry[] {
  if (!projection) return [];
  return projection.activity.map((entry) => ({
    entryId: entry.entryId,
    channel: entry.channel,
    text: entry.text,
    at: entry.at,
    agentId: entry.agentId,
  }));
}

/**
 * Completa la economía con lo que el stream sí midió.
 *
 * La regla que gobierna este merge: **el runtime rellena huecos, nunca suma**.
 * Las dos fuentes pueden describir la misma corrida —la bitácora de
 * delegaciones del repo la escribe un orquestador que quizá ejecutó este mismo
 * runtime—, así que sumar tokens o costo contaría dos veces lo mismo. Un total
 * inflado miente igual que un cero.
 *
 * Por eso cada campo se toma del repo si el repo lo sabe, y del runtime sólo si
 * el repo lo dejó `null`. `contextMaxTokens`, `contextCurrentTokens`,
 * `compactionCount` y los tokens de reasoning/caché sólo pueden venir del
 * runtime: la evidencia del repo no los transporta.
 */
function mergeEconomy(base: EconomyState, projection: RuntimeProjection | null): EconomyState {
  const telemetry = projection?.telemetry ?? null;
  const fill = (repoValue: number | null, runtimeValue: number | null): number | null => (
    repoValue !== null ? repoValue : runtimeValue
  );

  const costUsd = fill(base.costUsd, telemetry?.costUsd ?? null);
  return {
    ...base,
    tokens: {
      input: fill(base.tokens.input, telemetry?.inputTokens ?? null),
      output: fill(base.tokens.output, telemetry?.outputTokens ?? null),
      reasoning: fill(base.tokens.reasoning, telemetry?.reasoningTokens ?? null),
      cacheRead: fill(base.tokens.cacheRead, telemetry?.cacheReadTokens ?? null),
    },
    costUsd,
    // La base del costo describe de dónde salió el número que quedó: si el
    // repo no aportó costo y el runtime sí, manda la clasificación del runtime.
    costBasis: base.costUsd !== null ? base.costBasis : telemetry?.costBasis ?? base.costBasis,
    contextMaxTokens: fill(base.contextMaxTokens, telemetry?.contextMaxTokens ?? null),
    contextCurrentTokens: fill(base.contextCurrentTokens, telemetry?.contextCurrentTokens ?? null),
    compactionCount: fill(base.compactionCount, telemetry?.compactionCount ?? null),
    reasoningAvailable: toReasoningAvailable(projection),
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

function toOpenSpecWorkspace(state: PipelineState): OpenSpecWorkspaceSnapshot {
  const activeChanges = state.openSpecChanges?.map((change) => ({ ...change }))
    ?? state.activeChanges.map((changeId) => ({
      changeId,
      intent: null,
      tasks: state.selection.changeId === changeId ? state.tasks : [],
      proposalExists: false,
      designExists: false,
      specsCount: 0,
      validation: 'unknown' as const,
    }));
  const archivedChanges = state.openSpecArchivedChanges?.map((change) => ({ ...change }))
    ?? state.archivedChanges.map((changeId) => ({ changeId, archivedAt: null, sourceRef: 'openspec/changes/archive' }));
  const latestGate = state.gates[state.gates.length - 1] ?? null;
  return {
    selectedChangeId: state.selection.changeId ?? activeChanges[0]?.changeId ?? null,
    activeChanges,
    archivedChanges,
    specifications: state.openSpecSpecifications?.map((specification) => ({ ...specification })) ?? [],
    reports: [...state.reports],
    diagnostics: state.diagnostics.map((diagnostic) => ({ ...diagnostic })),
    observedAt: state.observedAt,
    latestGate: latestGate ? { ...latestGate } : null,
  };
}

/**
 * Une la evidencia del repo (F01) con la sesión de runtime viva (F03).
 *
 * Son dos observaciones distintas del mismo repositorio, no dos mitades de una:
 * la del repo es el registro durable de lo que quedó escrito, la del runtime es
 * lo que está pasando ahora y desaparece al cerrar la sesión. Por eso conviven
 * en vez de fundirse, y por eso ningún número se suma entre las dos.
 *
 * `projection` es opcional: sin sesión adjunta el snapshot es exactamente el
 * que producía la lectura per-repo, salvo que ahora `reasoningAvailable` dice
 * `null` ("no sabemos") en lugar de `false` ("el runtime no lo expone").
 */
export function toPipelineSnapshot(
  state: PipelineState,
  projection: RuntimeProjection | null = null,
): PipelineSnapshot {
  const economy = toEconomy(state.delegations);
  const base: PipelineSnapshot = {
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
    // La bitácora sólo puede venir del stream: esta lectura no la cubre.
    activity: [],
    economy,
    openSpec: toOpenSpecWorkspace(state),
  };
  return mergeRuntimeIntoSnapshot(base, projection);
}

/**
 * Aplica una sesión de runtime viva sobre un snapshot ya armado.
 *
 * Va aparte de `toPipelineSnapshot` porque el snapshot no siempre nace de la
 * evidencia del repo: el selector de vista previa produce snapshots de fixture,
 * y una sesión real tiene que poder superponerse a cualquiera de los dos sin
 * duplicar estas reglas.
 *
 * Con `projection` en `null` devuelve el snapshot intacto: la ausencia de
 * sesión no cambia nada de lo que el repo ya demostró.
 */
export function mergeRuntimeIntoSnapshot(
  snapshot: PipelineSnapshot,
  projection: RuntimeProjection | null,
): PipelineSnapshot {
  const economy = mergeEconomy(snapshot.economy, projection);
  if (!projection) return { ...snapshot, economy };

  return {
    ...snapshot,
    availableSources: snapshot.availableSources.includes('runtime')
      ? snapshot.availableSources
      : [...snapshot.availableSources, 'runtime'],
    // Una sesión viva es actividad aunque el repo todavía no haya escrito nada:
    // es justamente el caso de la primera corrida sobre un repo limpio.
    hasPipelineActivity: true,
    now: {
      ...snapshot.now,
      // El runtime que corre sí lo sabemos cuando hay sesión: viene de la
      // identidad del sobre, no de una inferencia sobre el modelo registrado.
      runtime: projection.active ? projection.runtime : snapshot.now.runtime,
    },
    // Los dos orígenes conviven: los ids no chocan (`delegation-N` contra los
    // UUID del runtime) y se distinguen en la vista porque sólo los del stream
    // traen `runtime` no nulo.
    agents: [...snapshot.agents, ...toRuntimeAgents(projection)],
    activity: [...snapshot.activity, ...toActivity(projection)],
    economy,
  };
}
