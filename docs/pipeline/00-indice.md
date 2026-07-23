# Pipeline — Torre de control de agentes por repositorio

> Primera vez: empezar por [`EMPEZAR-AQUI.md`](EMPEZAR-AQUI.md).

> Track de producto e implementación para convertir la solapa `Pipeline` de GitCron en una
> superficie de observabilidad y control de Hermes y de runtimes usados directa o indirectamente. Este índice
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
10. ¿Qué me está pidiendo decidir, en lenguaje claro, y qué pasa si digo sí, no o después?

Hermes es un orquestador soportado, no un gateway obligatorio. GitCron no crea un segundo
orquestador: normaliza tanto eventos de Hermes como sesiones directas y los contrasta con la verdad
observable del repo. Runtime, proveedor y modelo son dimensiones separadas.

```text
Ale ──conversa/decide──> Hermes (opcional) ──orquesta──> agentes
 │                              │                         │
 └──────── usa runtime directo ─┴─────────────────────────┤
                                eventos/controles         │ archivos/Git/OpenSpec
                                         ▼                ▼
                         Runtime Connectors <──────> GitCron Pipeline
```

## Principios no negociables

- **Per-repo real:** cada repo abierto tiene vínculo, sesiones, change, agentes, presupuesto e
  historial propios. Nunca se mezclan controles o métricas entre repos.
- **Dos fuentes de verdad:** el runtime/orquestador cuenta qué está ocurriendo; Git/OpenSpec/filesystem prueban
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
- **Ceremonia medible:** cada control explica qué riesgo cubre, qué encontró y cuánto
  tiempo/reintentos/intervención humana consumió. La ceremonia es ligera, normal o crítica según
  riesgo; no por costumbre ni por stack.
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

El contrato F00 propuesto agrega `attemptId`, parentage de sesión, modo de orquestación
`direct | hermes | external | unknown` y modelo solicitado/efectivo/reportado. Los runtimes son
Hermes, Claude, Codex, `agy` y OpenCode; Z.ai y LM Studio se representan como providers detrás del
runtime cliente, no como runtimes independientes. La definición TypeScript completa y normativa
está en [`f00/PIPELINE-CONTRACT-V1.md`](f00/PIPELINE-CONTRACT-V1.md).

Los cinco roles del método son `scout`, `planner`, `builder`, `auditor` y `fixer`; `orchestrator`
identifica a quien coordina fuera del ciclo R4, sea Hermes u otra ejecución explícita. `unknown` evita inventar un rol. `provider` y `model` son el
valor efectivo informado para ese evento/unidad segura; si solo existe un string ambiguo de modelo,
se conserva literal y `provider` queda `null`.

Sin esa correlación solo pueden mostrarse totales de sesión, no costo/tiempo por task ni
decorrelación auditable.

## Sobre de eventos normalizado

F00 propone un envelope `1.0` con secuencia acotada por `sequenceScope`, tiempos `emittedAt` y
`observedAt`, identidad completa, fuente estructurada, procedencia, estado/referencias de evidencia
y versión de redacción. La definición TypeScript normativa está en
[`f00/PIPELINE-CONTRACT-V1.md`](f00/PIPELINE-CONTRACT-V1.md); este índice no mantiene una segunda
shape para evitar deriva.

### Telemetría local producida por el kit scaffold

Los repos que usan el método pueden producir tres fuentes JSONL. Son evidencia estructurada del
working copy (`provenance: 'repo'`), pero **local, gitignoreada, potencialmente ausente y no durable**.
Su ausencia después de un clone no demuestra que nunca hubo actividad. F00 debe verificar el
schema real contra los productores instalados y capturar fixtures; esta tabla documenta el estado
observado el 2026-07-16, no congela el contrato.

| Archivo local | Campos observados | Event kind normalizado |
|---|---|---|
| `docs/ai/logs/gates.jsonl` | requeridos: `ts`, `mode`, `result`; `result` = `VERDE`, `ROJO` o `PENDIENTE` | `gates.completed` |
| `docs/ai/logs/delegations.jsonl` | requeridos: `ts`, `rol`, `modelo`, `tarea`; opcionales: `tokens_in`, `tokens_out`, `costo_usd`, `duracion_ms`, `resultado`, `reintentos`, `espera_humana_ms`, `toques_humanos` | `delegation.recorded` |
| `docs/ai/logs/visual-diff-heights.jsonl` | `run_id`, `ts`, `route`, `viewport`, alturas y anchos baseline/current, deltas de altura y `excepted` | `visualdiff.measured` |

Productores de referencia actuales:

- `scaffold/templates/gates.template.sh`;
- `scaffold/templates/log-delegation.template.sh`;
- `scaffold/templates/visual-diff.template.mjs`;
- scripts materializados dentro del repo observado, que pueden tener otra versión.

El lector tolera última línea incompleta, líneas inválidas aisladas, truncado/reemplazo del archivo y
campos opcionales ausentes. No interpreta el resultado global de `gates.jsonl` como el detalle de una
cláusula: por ejemplo, C2 requiere además constitución + diff de `package.json` o un evento
estructurado futuro. `tarea`, rutas y modelos se sanitizan antes de logs/UI.

Eventos esperados: `run.started`, `agent.started`, `reasoning.delta`, `tool.started`,
`tool.completed`, `file.changed`, `task.completed`, `usage.updated`, `context.updated`,
`approval.requested`, `decision.requested`, `decision.resolved`, `gates.completed`,
`delegation.recorded`, `visualdiff.measured`, `audit.completed`, `run.interrupted`,
`run.completed`.

## Decisiones humanas como dominio

Pipeline no reduce una decisión a un botón o a texto de un log. F00 cierra el contrato
`DecisionRequest`, F01 lo normaliza desde Hermes/OpenSpec/auditorías/evidencia, F04 lo presenta en un
inbox read-only y F05 conecta únicamente options con capability y precondiciones válidas.

La especificación de lenguaje, procedencia, estados y límites está en
[`UX-DECISIONES.md`](UX-DECISIONES.md). Riesgo y consecuencias pueden ser `unknown`; nunca se
inventan para completar la interfaz. `merge-ready` informa que Ale puede revisar: no ejecuta merge.

## Matriz de runtimes verificada el 2026-07-23

F00 relevó las instalaciones actuales y separó interfaz observada, efecto probado y fixture
pendiente. La matriz completa, con versión, procedencia y referencias por comando, está en
[`f00/RUNTIME-CAPABILITY-MATRIX.md`](f00/RUNTIME-CAPABILITY-MATRIX.md). Es un snapshot negociable,
no una promesa permanente de paridad entre runtimes.

## Reparto recomendado de agentes

- **Hermes:** puede orquestar fases y conservar checkpoints; no es paso obligatorio para sesiones
  directas de Claude, Codex, `agy` u OpenCode.
- **Claude Code:** builder principal para implementaciones multiarchivo y UI/IPC.
- **Codex:** auditor independiente por defecto; también builder en fases explícitamente asignadas,
  nunca auditor de su propio trabajo.
- **Antigravity / `agy`:** scout mecánico, spikes acotados y builder alternativo donde exista
  evidencia de salida controlable.
- **OpenCode:** builder alternativo y dueño natural de su adaptador/ACP; Z.ai es uno de sus
  providers observados, no un runtime aparte.
- **LM Studio:** extracción/clasificación mecánica y fixtures baratos; nunca veredicto final.

El prompt para cualquier MASTER está en
[`prompt-maestro-pipeline.md`](prompt-maestro-pipeline.md). Puede ejecutarlo Codex, Hermes u otro
orquestador; los briefs, procedencia y checkpoints siguen siendo obligatorios.

## Secuencia de fases

| Fase | Resultado | Riesgo | Prerrequisito |
|---|---|---:|---|
| [00](briefs/fase-00-contrato-y-spikes.md) | Contrato v1, fixtures reales, ADR de conexión y matriz de capacidades | Bajo, audit-only | Ninguno |
| [01](briefs/fase-01-modelo-y-evidencia-repo.md) | Modelo puro + JSONL/evidencia + decisiones + persistencia per-repo | Medio | F00 aprobada |
| [02](briefs/fase-02-hermes-adapter-opcional.md) | Adaptador Hermes opcional, solo observación | Alto/aislado | F01 mergeada; no bloquea core |
| [03](briefs/fase-03-adaptadores-y-telemetria.md) | Claude/Codex/agy/OpenCode/LM Studio normalizados | Alto | F01 mergeada; independiente de F02 |
| [04](briefs/fase-04-workspace-pipeline-ui.md) | Solapa per-repo: inbox read-only, vía, agentes, reasoning, economía, diffs | Alto visual | F03 mergeada |
| [05](briefs/fase-05-control-supervisado.md) | Opciones del inbox + pause/steer/interrupt/approvals con guardrails | Muy alto | F04 validada |
| [06](briefs/fase-06-modelos-presupuestos-contexto.md) | Selección por rol/task/repo, presupuestos, contexto y fallbacks | Muy alto | F05 validada |
| [07](briefs/fase-07-inteligencia-replay.md) | Replay, loops, predicción y comparación de modelos | Medio | F01 + F03–F06 y datos reales |
| [08](briefs/fase-08-hardening-y-release.md) | Seguridad, compatibilidad, docs, packaging y release | Alto | Core F00/F01/F03–F07; F02 si se incluyó |

El orden operativo no es el orden numérico: el camino core es `F00 → F01 → F03 → F04
→ F05 → F06 → F07 → F08`. F02 puede ejecutarse en paralelo después de F01. Un bloqueo
del companion Hermes nunca bloquea adaptadores directos, UI, modelos ni hardening del core.

Cada brief define el alcance técnico. Para iniciar una fase se usa su prompt autónomo enlazado desde
[`00-estado-track.md`](00-estado-track.md); al finalizar se crea un reporte en `docs/reports/` usando
[`PLANTILLA-REPORTE-FASE.md`](PLANTILLA-REPORTE-FASE.md).

## Proceso por riesgo

1. El agente reconstruye contexto y clasifica la ejecución: **ligera** (acotada/reversible),
   **normal** (transversal) o **crítica** (seguridad, zona protegida, dependencias, secretos,
   destructivo, publicación o control real de procesos).
2. Pide una autorización de alcance. Cubre los pasos mecánicos anunciados; sólo vuelve a detenerse
   si cambia el alcance/riesgo o aparece una decisión reservada al humano.
3. TANDA 0/checkpoint previo es obligatorio en nivel crítico; en normal se integra al plan; en
   ligera puede resolverse con reconocimiento y ejecución continua.
4. Las validaciones focalizadas corren cuando aportan evidencia. El cierre de una fase de producto
   conserva los controles integrales requeridos:
   - `npx.cmd tsc --noEmit`
   - `pnpm test`
   - `pnpm exec fallow` con delta, sin expandir scope por deuda heredada
   - reporte en `docs/reports/`
   - i18n ES/EN/ZH cuando haya UI
   - evidencia visual cuando haya UI
   - estado Git y mensaje de commit sugerido
   - comandos de commit/push sugeridos, **sin ejecutarlos**
   - **STOP, sin iniciar la fase siguiente**
5. Ale hace QA y conserva commit, push y merge. No escribe cambios técnicos que un agente pueda
   aplicar dentro de un diff ya aprobado.

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
