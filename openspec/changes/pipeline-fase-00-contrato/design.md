## Context

Pipeline debe explicar qué ocurre en un repositorio sin convertir GitCron en otro orquestador ni asumir que Hermes participa. La evidencia actual muestra sesiones directas y superficies estructuradas diferentes: Hermes 0.19.0 ofrece companion JSON-RPC/WebSocket y ACP; Claude Code 2.1.206 ofrece JSON/stream-JSON; Codex CLI 0.143.0 ofrece JSONL y app-server; OpenCode 1.18.3 ofrece JSON, ACP y servidor; `agy` 1.1.5 sólo anuncia salida final en texto; LM Studio ofrece un servidor OpenAI-compatible y no es agente; Z.AI Coding Plan aparece como proveedor autenticado de OpenCode, no como CLI independiente.

GitCron ya tiene patrones main-only de `safeStorage`, SQLite global y recursos per-repo, pero también deuda que Pipeline no debe copiar: path crudo como identidad, canales IPC genéricos, un abort controller global, secretos GitHub en renderer, sanitización parcial y `sandbox` desactivado aunque la documentación lo declara activo.

## Goals / Non-Goals

**Goals:**

- Definir un contrato agnóstico de orquestador, runtime, proveedor y modelo.
- Sustentar cada capability con evidencia y representar ausencia o incertidumbre sin paridad ficticia.
- Permitir observación directa y, cuando exista, observación coordinada por Hermes.
- Mantener secretos, conexiones y procesos en Electron main con scoping per-repo/session.
- Separar eventos informados por runtime de evidencia observada en Git/OpenSpec/filesystem.

**Non-Goals:**

- Implementar handlers, adaptadores, UI, DB o controles.
- Hacer que Hermes sea obligatorio o reemplazarlo como orquestador.
- Parsear prosa de terminal para simular eventos estructurados.
- Inferir reasoning privado, costo facturado o modelos efectivos no reportados.
- Iniciar F01, agregar dependencias o cambiar configuración global de runtimes.

## Decisions

### 1. Contrato agnóstico y orquestación opcional

`orchestrationMode` será `direct | hermes | external | unknown`. `runtime`, `provider`, `requestedModel`, `effectiveModel` y `reportedModel` son campos separados. Z.ai se registra como proveedor/familia cuando OpenCode lo resuelve; OpenCode sigue siendo el runtime. Una corrida directa de Codex es observable sin una sesión Hermes.

Alternativa descartada: usar Hermes como gateway obligatorio. Ocultaría sesiones directas, crearía un punto único de falla y confundiría transporte con modelo.

### 2. Identidad estable emitida por main

`repoId` será opaco y persistente. F01 deberá resolver `realpath`, normalizar casing donde corresponda, identificar el Git common-dir y mantener un mapping a UUID; el path será atributo mutable y redactable, no clave global. Reintentos conservan `runId` y crean `attemptId`; resume conserva `sessionId`; un fork crea nueva sesión con `parentSessionId`.

```ts
type OrchestrationMode = 'direct' | 'hermes' | 'external' | 'unknown';
type PipelineAgentRole =
  | 'scout' | 'planner' | 'builder' | 'auditor' | 'fixer'
  | 'orchestrator' | 'unknown';

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
  runtime: 'hermes' | 'claude' | 'codex' | 'agy' | 'opencode' | 'unknown';
  provider: string | null;
  requestedModel: string | null;
  effectiveModel: string | null;
  reportedModel: string | null;
  role: PipelineAgentRole;
};
```

### 3. Eventos versionados, provenance y evidence status

El envelope no promete orden global. `sequence` es monotónico sólo dentro de `sequenceScope`; si la fuente no lo da queda `null`. Dedupe usa `(source.instanceId,eventId)`; los eventos derivados obtienen IDs determinísticos desde sus refs. `observedAt` siempre existe; `emittedAt` puede ser desconocido.

```ts
type DataProvenance = 'runtime' | 'repo' | 'derived' | 'human';
type EvidenceStatus = 'verified' | 'inferred' | 'unknown' | 'blocked' | 'pending_fixture';

type PipelineEventEnvelope<T = unknown> = {
  schemaVersion: '1.0';
  eventId: string;
  sequence: number | null;
  sequenceScope: string | null;
  emittedAt: string | null;
  observedAt: string;
  identity: PipelineIdentity;
  kind: string;
  source: { adapterId: string; instanceId: string; transport: string; protocolVersion: string | null };
  payload: T;
  provenance: DataProvenance;
  evidenceStatus: EvidenceStatus;
  evidenceRefs: string[];
  redactionVersion: string;
};
```

Payloads se versionan por `kind`; consumidores ignoran campos desconocidos y conservan el raw sanitizado dentro de límites. `gates.completed`, `delegation.recorded` y `visualdiff.measured` son shapes derivados de productores repo verificados. `run.*`, `agent.*`, `tool.*`, `reasoning.delta`, `usage.updated`, `context.updated`, `approval.*`, `decision.*`, `audit.*`, `command.*` y `connection.*` son target shapes propuestos y siguen pendientes de fixture por adapter.

### 4. Métricas honestas

Cada métrica lleva dimensión, unidad, valor nullable, período, fuente y clasificación: `runtime_reported | locally_measured | estimated | included_plan | local_unpriced | unknown`. Estimaciones requieren fórmula, pricing source y timestamp. `estimated` e `included_plan` son forward-only en F00: F01 debe tratarlas como unknown hasta capturar pricing/plan verificable. Totales declaran estrategia de dedupe para parent/subagent/retry. `0` sólo significa cero medido, nunca dato ausente.

### 5. Decisiones y comandos son dominios separados

`DecisionRequest` incluye task/session, evidence refs tipadas, digest de scope, expiry y opciones. Una opción sólo es ejecutable si referencia una capability negociada y precondiciones vigentes. `CommandRequest` requiere target completo, idempotency key, parámetros tipados/allowlisted y confirmación acorde al riesgo. `acknowledged` no significa `effect_observed`; después de interrumpir se reconcilia Git/filesystem y nunca se hace rollback silencioso.

### 6. ADR de transporte: adapter core, no gateway único

Orden preferido por fuente:

1. Protocolo versionado del runtime/orquestador (Hermes companion JSON-RPC/WebSocket o app-server equivalente).
2. ACP cuando publique identidad, lifecycle y capabilities suficientes.
3. Child process con JSON/JSONL versionado (Claude, Codex, OpenCode).
4. Hooks/filesystem/repo evidence como degradación.

Hermes companion es recomendado sólo para corridas que Hermes coordina. Sesiones directas usan adaptadores directos. `agy` no se parsea desde prosa: hasta tener hook/wrapper estable queda degradado a lifecycle grueso + evidencia repo. LM Studio se modela como proveedor local detrás de un cliente, no como agente. Z.ai se modela como provider de OpenCode mientras ésa sea la interfaz comprobada.

### 7. Auth, handshake y compatibilidad

Todas las conexiones viven en main. Credenciales se almacenan con `safeStorage`; renderer recibe estado/fingerprint, nunca token. Incluso loopback requiere secreto de alta entropía y vínculo explícito a repo/session. Cuando un backend local como LM Studio no ofrece auth nativa comprobada, GitCron deberá interponer un wrapper/proxy main-owned autenticado o degradar la integración; no conectará el renderer directamente. Binds no-loopback requieren auth obligatoria y transporte protegido.

Handshake conceptual: `hello(clientProtocolRange, repoBinding, nonce)` → `welcome(serverVersion, negotiatedProtocol, instanceId, capabilities, sessionBinding)` o rechazo tipado. Cambio de major incompatible deshabilita controles y conserva evidencia local; minor desconocido se tolera por feature negotiation.

### 8. Reconexión, backpressure y ownership

Reconnect usa backoff con jitter, cursor/resume token si existe y dedupe posterior. Streams se limitan por bytes/eventos y agrupan deltas de alta frecuencia; nunca se descartan decisiones, errores o terminales sin señal. Sólo procesos creados y registrados por GitCron pueden recibir interrupt/kill. El registro main-owned incluye repo/run/session, PID/process group, comando allowlisted y política de cleanup.

### 9. Redacción y retención

Antes de log, SQLite o renderer se redactan bearer/basic tokens, cookies, headers, query secrets, home paths cuando aplique, prompts/tasks sensibles y bloques de reasoning según política. Raw sin sanitizar no se persiste. La versión de redacción queda en el envelope y los fixtures contienen datos ficticios.

## Risks / Trade-offs

- [Schemas reales cambian entre versiones] → negociación, adapters versionados y fixtures por versión.
- [Una fuente directa ofrece menos eventos que Hermes] → capability matrix y estado degraded, sin parsing de prosa.
- [Paths equivalentes crean repos duplicados] → identidad main-only basada en realpath/common-dir + UUID persistido.
- [Reasoning o payloads filtran datos] → captura opt-in, redacción previa y retención mínima.
- [Reconnect duplica eventos/usage] → instanceId, eventId, sequence scope y dedupe explícito.
- [Ack se interpreta como efecto] → estados separados y reconciliación contra evidencia local.
- [Costo reportado equivale sólo a precio teórico] → clasificación separada; nunca mostrarlo como cargo real sin evidencia de facturación.
- [Deuda de seguridad preexistente] → F00 la registra; no la corrige fuera de scope y Pipeline no reutiliza esos patrones.

## Migration Plan

No hay migración de producto en F00. El cambio se valida documentalmente, pasa auditoría y queda para QA humano. F01 podrá implementar tipos y parsers detrás de una feature nueva sin modificar flows existentes. Ante rechazo, se corrigen sólo contratos/documentos; no hay rollback de código.

## Open Questions

- Identificador interno exacto y modelo efectivo de `Z.AI Coding Plan` en OpenCode: pendiente de fixture estructurado incluido en plan.
- Schema real de eventos Hermes companion y auth formal para GitCron: ayuda verificada, fixture de sesión pendiente.
- Eventos/hooks estructurados de `agy`: desconocidos; no se asume estabilidad.
- Semántica de pause/kill/resume por runtime: pendiente de fixture, aunque algunas ayudas anuncien comandos.
- Costo USD reportado por runtimes bajo suscripción: requiere distinguir precio equivalente de cargo facturado.
- Auth nativa del servidor LM Studio observado: unknown; requiere wrapper/proxy main-owned o degradación.
