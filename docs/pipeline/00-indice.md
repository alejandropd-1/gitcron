# Pipeline — Torre de control de agentes por repositorio

> Track de producto e implementación para convertir la solapa `Pipeline` de GitCron en una
> superficie de observabilidad y control de Hermes y de los runtimes que orquesta. Este índice
> es el tablero de Ale. Los agentes reciben **una sola fase por vez** y deben leer antes
> `docs/00_FUENTE_DE_VERDAD.md`, `docs/01_INVARIANTES.md`,
> [`protocolo-ejecucion-agentes.md`](protocolo-ejecucion-agentes.md) y el brief de esa fase.

Una IA que necesite comprender la propuesta completa antes de recibir una fase debe comenzar por
[`CONTEXTO-INTEGRAL.md`](CONTEXTO-INTEGRAL.md).

El estado operativo se mantiene en [`00-estado-track.md`](00-estado-track.md). Los encargos
copiables, separados de sus futuros reportes, están en [`prompts/`](prompts/README.md).

## Visión en lenguaje de producto

Pipeline responde, para el repo de la solapa activa:

1. ¿Qué está ocurriendo ahora?
2. ¿Qué agente y qué modelo están trabajando?
3. ¿En qué change y task están?
4. ¿Qué archivos, comandos y herramientas están usando?
5. ¿Qué razonamiento **visible y emitido** dejaron?
6. ¿Cuánto tiempo, contexto, tokens y dinero consumieron?
7. ¿El trabajo avanza, espera, retrocede o está trabado?
8. ¿Necesita una decisión humana?
9. ¿Qué controles seguros están disponibles?

Hermes sigue siendo el orquestador. GitCron no crea un segundo orquestador: se conecta a
Hermes, normaliza sus eventos y los contrasta con la verdad observable del repo.

```text
Ale ──conversa/decide──> Hermes ──orquesta──> agentes y runtimes
                            │                        │
                            │ eventos/controles      │ archivos/Git/OpenSpec
                            ▼                        ▼
                     Hermes Connector <──────> GitCron Pipeline
```

## Principios no negociables

- **Per-repo real:** cada repo abierto tiene vínculo, sesiones, change, agentes, presupuesto e
  historial propios. Nunca se mezclan controles o métricas entre repos.
- **Dos fuentes de verdad:** Hermes cuenta qué está ocurriendo; Git/OpenSpec/filesystem prueban
  qué ocurrió. Una discrepancia se muestra, no se oculta.
- **Reasoning honesto:** se muestra reasoning/thinking solo cuando el runtime lo emite. El resto
  se cubre con una bitácora operativa (`objetivo → hipótesis → acción → observación → próximo
  paso`). Nunca etiquetar una inferencia como pensamiento literal del modelo.
- **Métricas con procedencia:** todo costo es `real`, `estimado`, `incluido-en-plan`, `local` o
  `desconocido`. Todo contexto es `medido`, `estimado` o `desconocido`.
- **Control gradual:** primero observar; recién después habilitar pausa, steer, interrupción y
  kill. Ningún botón envía comandos arbitrarios.
- **Seguridad Electron:** secretos y conexión en main; preload expone métodos tipados mínimos;
  renderer sin tokens, sockets privilegiados ni acceso a procesos.
- **Stop no es rollback:** interrumpir puede dejar archivos parciales. Pipeline debe mostrar el
  diff y el estado resultante; nunca revertir silenciosamente.
- **Cambio de modelo en unidad segura:** afecta el próximo turno/task/agente. Para cambiar un
  modelo activo: interrumpir → revisar diff → seleccionar → reanudar.
- **Decorrelación:** builder y auditor no pueden usar la misma familia de modelos.
- **CSS humano en este track:** los agentes implementan datos, lógica, accesibilidad, markup
  semántico, clases claras y `data-*`; Ale escribe las hojas de estilo. No modificar CSS salvo
  pedido explícito posterior de Ale.

## Arquitectura objetivo

```text
Renderer: PipelineWorkspace (repo activo)
  └─ window.api.pipeline.*
       └─ preload: API tipada y allowlisted
            └─ Electron main
                 ├─ PipelineCoordinator (repo/change/run/task)
                 ├─ HermesConnector (JSON-RPC/WebSocket autenticado)
                 ├─ RuntimeAdapters
                 │    ├─ Hermes native
                 │    ├─ Claude Code
                 │    ├─ Codex CLI
                 │    ├─ Antigravity / agy
                 │    ├─ OpenCode
                 │    └─ LM Studio
                 ├─ RepoEvidenceReader (OpenSpec/Git/docs/ai/files)
                 └─ PipelineStore (SQLite global, particionado por repo)
```

El Connector debe negociar versión y capacidades. GitCron no puede depender de textos de
terminal, tokens extraídos de HTML ni formatos privados sin versionar.

## Contrato mínimo de identidad

Toda corrida normalizada necesita:

```ts
type PipelineIdentity = {
  repoId: string;
  repoPath: string;
  changeId: string | null;
  taskId: string | null;
  runId: string;
  sessionId: string;
  agentId: string;
  parentAgentId: string | null;
  runtime: 'hermes' | 'claude' | 'codex' | 'agy' | 'opencode' | 'lmstudio';
};
```

Sin esa correlación solo pueden mostrarse totales de sesión, no costo/tiempo por task.

## Sobre de eventos normalizado

La forma exacta se cierra en Fase 00, pero todas las fuentes convergen conceptualmente en:

```ts
type PipelineEventEnvelope = {
  schemaVersion: 1;
  eventId: string;
  sequence: number;
  ts: string;
  identity: PipelineIdentity;
  kind: string;
  source: string;
  payload: unknown;
  provenance: 'runtime' | 'repo' | 'derived' | 'human';
};
```

Eventos esperados: `run.started`, `agent.started`, `reasoning.delta`, `tool.started`,
`tool.completed`, `file.changed`, `task.completed`, `usage.updated`, `context.updated`,
`approval.requested`, `gates.completed`, `audit.completed`, `run.interrupted`, `run.completed`.

## Matriz de runtimes verificada el 2026-07-12

Las versiones son un snapshot local y deben verificarse otra vez en Fase 00.

| Runtime | Versión local | Integración observable | Limitación que no se debe inventar |
|---|---:|---|---|
| Hermes | 0.18.0 | JSON-RPC/WebSocket; sesiones; thinking/reasoning; tools; usage; contexto; analytics; subagentes; interrupt/steer/pause/kill; modelos | El protocolo companion para GitCron aún debe formalizar auth/versionado |
| Claude Code | 2.1.132 | `--output-format=stream-json`; hooks; partial messages; modelo; effort; budget | No asumir que siempre expone reasoning literal ni costo real bajo suscripción |
| Codex CLI | 0.133.0 | `codex exec --json`; modelo; sandbox; sesiones reanudables | Capturar fixtures reales antes de fijar el schema; costo puede no equivaler a gasto de suscripción |
| Antigravity (`agy`) | 1.0.10 | `--print`; `--model`; sesiones; log file; sandbox | No anuncia stream JSON estable: Fase 03 debe medir y diseñar wrapper/hook sin parsear prosa frágil |
| OpenCode | 1.15.10 | `serve`; ACP; `run --format json`; `--thinking`; sesiones; stats de tokens/costo; modelos | Verificar API/event schema real antes de implementar control |
| LM Studio (`lms`) | CLI commit 9902c3a | server local; `lms ps --json`; logs stream; API OpenAI-compatible | No es un agente/orquestador por sí solo; control y usage dependen del cliente que hace la inferencia |

## Reparto recomendado de agentes

- **Hermes:** orquesta fases, conserva checkpoints y registra qué modelo ejecuta cada rol.
- **Claude Code:** builder principal para implementaciones multiarchivo y UI/IPC.
- **Codex:** auditor independiente por defecto; también builder en fases explícitamente asignadas,
  nunca auditor de su propio trabajo.
- **Antigravity / `agy`:** scout mecánico, spikes acotados y builder alternativo donde exista
  evidencia de salida controlable.
- **OpenCode:** builder alternativo y dueño natural de su adaptador/ACP, auditado por Codex.
- **LM Studio:** extracción/clasificación mecánica y fixtures baratos; nunca veredicto final.

El prompt para que Hermes coordine el track completo está en
[`prompt-maestro-hermes.md`](prompt-maestro-hermes.md). No reemplaza los briefs: Hermes debe
entregar al ejecutor únicamente la fase activa y respetar sus checkpoints.

## Secuencia de fases

| Fase | Resultado | Riesgo | Prerrequisito |
|---|---|---:|---|
| [00](fase-00-contrato-y-spikes.md) | Contrato v1, fixtures reales, ADR de conexión y matriz de capacidades | Bajo, audit-only | Ninguno |
| [01](fase-01-modelo-y-evidencia-repo.md) | Modelo puro + lector OpenSpec/Git/docs/ai/files + persistencia per-repo | Medio | F00 aprobada |
| [02](fase-02-hermes-connector-readonly.md) | Conexión autenticada a Hermes, solo observación | Alto | F01 mergeada |
| [03](fase-03-adaptadores-y-telemetria.md) | Claude/Codex/agy/OpenCode/LM Studio normalizados | Alto | F02 mergeada |
| [04](fase-04-workspace-pipeline-ui.md) | Solapa Pipeline per-repo: vía, agentes, reasoning, economía, diffs | Alto visual | F03 mergeada |
| [05](fase-05-control-supervisado.md) | Pause/steer/interrupt/subagent/process/approvals con guardrails | Muy alto | F04 validada |
| [06](fase-06-modelos-presupuestos-contexto.md) | Selección por rol/task/repo, presupuestos, contexto y fallbacks | Muy alto | F05 validada |
| [07](fase-07-inteligencia-replay.md) | Replay, loops, predicción y comparación de modelos | Medio | Datos reales acumulados |
| [08](fase-08-hardening-y-release.md) | Seguridad, compatibilidad, docs, packaging y release | Alto | F00–F07 cerradas |

Cada brief define el alcance técnico. Para iniciar una fase se usa su prompt autónomo enlazado desde
[`00-estado-track.md`](00-estado-track.md); al finalizar se crea un reporte en `docs/reports/` usando
[`PLANTILLA-REPORTE-FASE.md`](PLANTILLA-REPORTE-FASE.md).

## Proceso obligatorio por fase

1. El agente se identifica, reconstruye el contexto y anuncia fase, rama, tandas y checkpoints.
2. Espera autorización; luego crea branch `pipeline/fase-NN-<slug>` desde `main` actualizado sin
   pisar cambios locales.
3. Ejecuta TANDA 0 de reconocimiento. **No tocar código antes del checkpoint.**
4. Trabaja una tanda por vez, anuncia su inicio y pide OK en los casos definidos por el protocolo.
5. Cierra cada tanda de código con `npx.cmd tsc --noEmit` y tests focalizados.
6. Cierra la fase con:
   - `npx.cmd tsc --noEmit`
   - `pnpm test`
   - `pnpm exec fallow` con delta, sin expandir scope por deuda heredada
   - reporte en `docs/reports/`
   - i18n ES/EN/ZH cuando haya UI
   - evidencia visual cuando haya UI
   - estado Git y mensaje de commit sugerido
   - comandos de commit/push sugeridos, **sin ejecutarlos**
   - **STOP, sin iniciar la fase siguiente**
7. Ale hace QA, stage, commit, push y merge.

El detalle vinculante para agentes de cualquier IA está en
[`protocolo-ejecucion-agentes.md`](protocolo-ejecucion-agentes.md). Si un prompt resumido contradice
ese archivo, prevalece el protocolo.

## Definition of Done del track

- Pipeline está aislado por repo y tolera repos sin scaffold.
- Los eventos de distintos runtimes comparten un contrato versionado sin perder procedencia.
- Reasoning, costo y contexto nunca se presentan con certeza falsa.
- GitCron puede observar y luego controlar solo sesiones vinculadas al repo activo.
- Todo control deja auditoría y muestra consecuencias sobre el working tree.
- La selección de modelos preserva decorrelación builder/auditor.
- No hay secretos en renderer/logs/SQLite.
- App empaquetada funciona sin depender de paths hardcodeados de la máquina de Ale.
- README/CHANGELOG/SECURITY/fuente de verdad quedan sincronizados en F08.
