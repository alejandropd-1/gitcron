# Pipeline Contract v1 — propuesta F00

Estado: `propuesto / listo para QA humano`
Fecha: `2026-07-23`
Change: `pipeline-fase-00-contrato`

Este contrato normaliza observación de agentes y modelos sobre un repo. No obliga a usar Hermes:
una corrida puede ser directa, coordinada por Hermes o venir de otro orquestador. GitCron observa,
correlaciona y contrasta con Git/OpenSpec/filesystem; no se convierte en un segundo orquestador.

La especificación normativa detallada vive en
`openspec/changes/pipeline-fase-00-contrato/specs/` y las decisiones en `design.md`.

## 1. Estados de evidencia

| Estado | Significado |
|---|---|
| `verified` | Comando, código, productor o fixture observado en esta F00. |
| `inferred` | La interfaz/documentación lo anuncia, pero falta probar el payload/efecto. |
| `unknown` | La fuente no lo informa o no se encontró evidencia suficiente. |
| `blocked` | La captura requiere secreto, costo adicional, dependencia o decisión humana. |
| `pending_fixture` | Existe procedimiento seguro, pero falta capturar una ejecución real. |

`unknown` nunca equivale a `0`, `false`, `verde`, `low risk` o “no soportado”.

## 2. Contrato de repositorio

- `repoId`: UUID opaco persistido y emitido por Electron main.
- `canonicalPath`: resuelto con `realpath`, casing normalizado cuando corresponda y Git common-dir;
  es main-only salvo presentación explícita.
- `displayPath`: valor sanitizado/redactable para UI.
- `gitCommonDirDigest`: digest para reconciliar worktrees sin exponer paths en logs.
- `bindingState`: `bound | unbound | ambiguous | unavailable`.

El path crudo no es identidad suficiente: Windows casing, junctions, symlinks y worktrees pueden
representar el mismo repositorio.

## 3. Identidad de corrida

```ts
type OrchestrationMode = 'direct' | 'hermes' | 'external' | 'unknown';
type PipelineRuntime =
  | 'hermes' | 'claude' | 'codex' | 'agy' | 'opencode' | 'unknown';
type PipelineAgentRole =
  | 'scout' | 'planner' | 'builder' | 'auditor' | 'fixer' | 'orchestrator' | 'unknown';

type PipelineIdentity = {
  repoId: string;
  repoPath: string | null;
  changeId: string | null;
  taskId: string | null;
  runId: string;
  attemptId: string;
  sessionId: string;
  parentSessionId: string | null;
  agentId: string;
  parentAgentId: string | null;
  orchestrationMode: OrchestrationMode;
  orchestratorRuntime: string | null;
  runtime: PipelineRuntime;
  provider: string | null;
  requestedModel: string | null;
  effectiveModel: string | null;
  reportedModel: string | null;
  role: PipelineAgentRole;
};
```

Reglas:

- retry: mismo run/task, nuevo `attemptId`;
- resume: misma `sessionId` si el runtime lo confirma;
- fork: nueva sesión con `parentSessionId`;
- subagente: nuevo `agentId` con `parentAgentId`;
- Z.ai vía OpenCode: `runtime=opencode`, `provider=Z.AI Coding Plan`;
- LM Studio: provider local; el runtime es el cliente agente que origina la llamada;
- esta sesión Codex directa: `orchestrationMode=direct`, sin Hermes obligatorio;
- modelo no expuesto: `null`, aunque el nombre comercial pueda inferirse.

## 4. Envelope y catálogo de eventos

```ts
type DataProvenance = 'runtime' | 'repo' | 'derived' | 'human';

type PipelineEventEnvelope<T = unknown> = {
  schemaVersion: '1.0';
  eventId: string;
  sequence: number | null;
  sequenceScope: string | null;
  emittedAt: string | null;
  observedAt: string;
  identity: PipelineIdentity;
  kind: string;
  source: {
    adapterId: string;
    instanceId: string;
    transport: string;
    protocolVersion: string | null;
  };
  payload: T;
  provenance: DataProvenance;
  evidenceStatus: 'verified' | 'inferred' | 'unknown' | 'blocked' | 'pending_fixture';
  evidenceRefs: string[];
  redactionVersion: string;
};
```

Kinds derivados de JSONL repo verificado: `gates.completed`, `delegation.recorded` y
`visualdiff.measured`. Target shapes propuestos, pendientes de fixture por adapter:
`connection.*`, `run.*`, `agent.*`, `reasoning.delta`, `tool.*`, `file.changed`, `task.*`,
`usage.updated`, `context.updated`, `approval.*`, `decision.*`, `audit.*` y `command.*`.

- `(source.instanceId,eventId)` es la clave de dedupe.
- `sequence` sólo ordena dentro de `sequenceScope`; no existe orden global inventado.
- `observedAt` siempre existe; `emittedAt` puede ser `null`.
- Payloads se versionan por kind; campos desconocidos se conservan sanitizados y limitados.

## 5. Métricas

```ts
type MetricClassification =
  | 'runtime_reported' | 'locally_measured' | 'estimated'
  | 'included_plan' | 'local_unpriced' | 'unknown';

type MetricSample = {
  metricId: string;
  identity: PipelineIdentity;
  dimension:
    | 'tokens' | 'cost' | 'duration' | 'context' | 'retries' | 'human_wait' | 'human_touch';
  metricName:
    | 'tokens.input' | 'tokens.output' | 'tokens.cache_read' | 'tokens.cache_write'
    | 'tokens.reasoning' | 'cost.usd' | 'duration.wall_ms' | 'duration.active_ms'
    | 'duration.tool_ms' | 'duration.human_wait_ms' | 'duration.retry_ms'
    | 'duration.pause_ms' | 'context.max_tokens' | 'context.current_tokens'
    | 'context.historical_tokens' | 'context.compaction_count'
    | 'retry.count' | 'human_touch.count';
  value: number | null;
  unit: string;
  classification: MetricClassification;
  periodStart: string | null;
  periodEnd: string | null;
  sourceRef: string;
  formula: string | null;
  pricingSource: string | null;
  pricingAsOf: string | null;
  dedupeScope: string | null;
  evidenceStatus: 'verified' | 'inferred' | 'unknown' | 'blocked' | 'pending_fixture';
  evidenceRefs: string[];
};
```

- Tokens separan input/output/cache/reasoning cuando la fuente lo permite.
- Duración separa wall/active/tool/human-wait/retry/pause cuando existe evidencia.
- Contexto separa max window/current/historical/compactions.
- Un USD calculado por runtime bajo suscripción no se llama “cargo real” sin evidencia de billing.
- `local_unpriced` significa local sin precio USD atribuido, no costo físico cero.
- `estimated` e `included_plan` son forward-only en F00; F01 los trata unknown hasta tener fixture
  de pricing/plan con fecha y fuente.

## 6. Capacidades

```ts
type RuntimeCapability = {
  capabilityId: string;
  capabilityVersion: string | null;
  availability: 'available' | 'degraded' | 'unavailable' | 'unknown';
  evidenceStatus: 'verified' | 'inferred' | 'unknown' | 'blocked' | 'pending_fixture';
  targetScopes: Array<'repo' | 'run' | 'session' | 'agent'>;
  constraints: string[];
  evidenceRefs: string[];
};
```

Una opción anunciada por `--help` puede ser interfaz `verified`, pero su efecto sigue
`pending_fixture`. Runtime, proveedor y modelo tienen matrices relacionadas, no una sola enum.

## 7. Decisiones humanas

```ts
type DecisionEvidenceRef = {
  refId: string;
  kind: 'runtime-event' | 'git-diff' | 'openspec' | 'gate' | 'audit' | 'file' | 'derived-rule';
  uri: string;
  digest: string | null;
  provenance: DataProvenance;
};

type DecisionOption = {
  optionId: string;
  labelKey: string;
  consequence: string | null;
  capabilityId: string | null;
  preconditions: string[];
  available: boolean;
  unavailableReason: string | null;
};

type DecisionResolution = {
  optionId: string;
  actor: 'human' | 'runtime' | 'system' | 'unknown';
  resolvedAt: string;
  commandId: string | null;
  note: string | null;
};

type DecisionRequest = {
  decisionId: string;
  repoId: string;
  changeId: string | null;
  taskId: string | null;
  runId: string | null;
  sessionId: string | null;
  agentId: string | null;
  kind: 'spec-approval' | 'dependency-request' | 'protected-diff-approval'
    | 'control-policy-review' | 'audit-rejected' | 'clarification'
    | 'escalation' | 'merge-ready' | 'unknown';
  status: 'pending' | 'answered' | 'expired' | 'superseded' | 'unknown';
  title: string;
  summary: string;
  why: string | null;
  options: DecisionOption[];
  risk: 'low' | 'medium' | 'high' | 'unknown';
  riskReason: string | null;
  riskProvenance: DataProvenance | null;
  evidence: DecisionEvidenceRef[];
  technicalContextRef: string | null;
  scopeDigest: string | null;
  provenance: DataProvenance;
  requestedAt: string;
  expiresAt: string | null;
  resolution: DecisionResolution | null;
};
```

Riesgo, consecuencia y disponibilidad sólo se completan desde fuente o regla versionada.

## 8. Comandos y control

```ts
type PipelineCommandState =
  | 'requested' | 'accepted' | 'rejected' | 'acknowledged'
  | 'effect_observed' | 'failed' | 'unknown';

type CommandTarget = { repoId: string; runId: string; sessionId: string; agentId: string | null };
type AgentCommandTarget = CommandTarget & { agentId: string };
type CommandBase = {
  commandId: string;
  capabilityId: string;
  target: CommandTarget;
  idempotencyKey: string;
  requestedBy: 'human' | 'system';
  risk: 'low' | 'medium' | 'high' | 'unknown';
  confirmationScopeDigest: string | null;
};

type PipelineCommandRequest =
  | (CommandBase & { kind: 'run.pause'; parameters: { reason: string | null } })
  | (CommandBase & { kind: 'run.resume'; parameters: { resumeToken: string | null } })
  | (CommandBase & { kind: 'agent.interrupt'; parameters: { reason: string; graceMs: number } })
  | (CommandBase & { kind: 'agent.kill'; target: AgentCommandTarget; parameters: { reason: string } })
  | (CommandBase & { kind: 'run.cancel'; parameters: { reason: string } })
  | (CommandBase & { kind: 'instruction.steer'; parameters: { instruction: string; applyAt: 'next-safe-point' } })
  | (CommandBase & { kind: 'instruction.queue'; parameters: { instruction: string; position: 'next' | 'tail' } })
  | (CommandBase & { kind: 'approval.resolve'; parameters: { decisionId: string; optionId: string } });
```

- Main valida target, capability, ownership, parámetros allowlisted e idempotencia.
- Renderer nunca envía shell, argv o PID libres.
- ACK no es efecto; se reconcilia sesión + repo.
- Stop/interrupt no hace rollback.
- `agent.kill` no acepta PID: main resuelve `agentId` en su registro y sólo aplica a procesos creados
  y registrados por GitCron.

## 9. Auth, versionado, backpressure y redacción

- Secrets/conexiones/procesos sólo en main, cifrados con `safeStorage`.
- Loopback también usa auth explícita; bind no-loopback exige auth y transporte protegido.
- Backend loopback sin auth nativa, como LM Studio en el snapshot actual: wrapper/proxy main-owned
  autenticado o integración degradada; nunca socket directo desde renderer.
- Handshake negocia rango de protocolo, instance ID, repo/session binding y capabilities.
- Major incompatible: controles off, evidencia local sigue disponible.
- Reconnect: exponential backoff+jitter, cursor cuando exista y dedupe.
- Backpressure: límites por bytes/eventos, batching de deltas; decisiones/errores/terminales no se
  descartan silenciosamente.
- Redacción previa a logs/SQLite/UI de headers, bearer/basic, cookies, query secrets, paths,
  prompts/tasks sensibles y reasoning según retención.

## 10. Transporte recomendado

El core es transport-neutral. Prioridad: protocolo estructurado/versionado → ACP → CLI JSON/JSONL
→ hooks/filesystem. Hermes companion aplica a sus propias corridas; Claude/Codex/OpenCode pueden
observarse directamente. `agy` degrada sin parsear prosa. LM Studio es proveedor local detrás de un
cliente. Z.ai usa OpenCode según la interfaz verificada en esta máquina.
