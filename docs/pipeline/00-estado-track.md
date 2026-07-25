# Pipeline — Estado del track

> Tablero operativo. Debe verificarse contra Git y `docs/reports/` antes de iniciar una fase.
> Un agente puede marcar `En curso`, `Bloqueada` o `Lista para QA`; solo Ale confirma `Completada`.

Fecha de creación: 2026-07-12

## Estados permitidos

- `Planificada`: todavía no autorizada.
- `En curso`: rama creada y fase autorizada.
- `Bloqueada`: necesita una decisión, evidencia o dependencia.
- `Lista para QA`: implementación y checks terminados; falta revisión/commit/push de Ale.
- `Completada`: Ale confirmó QA y cierre de la fase.

## Estado por fase

# Pipeline — Estado del track

> Tablero operativo. Debe verificarse contra Git y `docs/reports/` antes de iniciar una fase.
> Un agente puede marcar `En curso`, `Bloqueada` o `Lista para QA`; solo Ale confirma `Completada`.

Fecha de creación: 2026-07-12

## Estados permitidos

- `Planificada`: todavía no autorizada.
- `En curso`: rama creada y fase autorizada.
- `Bloqueada`: necesita una decisión, evidencia o dependencia.
- `Lista para QA`: implementación y checks terminados; falta revisión/commit/push de Ale.
- `Completada`: Ale confirmó QA y cierre de la fase.

## Estado por fase

| Fase | Estado actual | Rama | Prerrequisito | Prompt de ejecución | Reporte |
|---|---|---|---|---|---|
| F00 | Completada | `pipeline/fase-00-contrato` | Ninguno | [`prompts/fase-00-contrato.md`](prompts/fase-00-contrato.md) | [`2026-07-23-pipeline-fase-00-contrato.md`](../reports/2026-07-23-pipeline-fase-00-contrato.md) |
| F01 | Completada | `pipeline/fase-01-modelo-evidencia` | F00 completada + gate base versionado/verde | [`prompts/fase-01-modelo-evidencia.md`](prompts/fase-01-modelo-evidencia.md) | [`2026-07-23-pipeline-fase-01-modelo-evidencia.md`](../reports/2026-07-23-pipeline-fase-01-modelo-evidencia.md) |
| F02 (opcional) | Planificada | `pipeline/fase-02-hermes-adapter-opcional` | F01 completada; no bloquea el core | [`prompts/fase-02-hermes-adapter-opcional.md`](prompts/fase-02-hermes-adapter-opcional.md) | Pendiente |
| F03 | Completada | `pipeline/fase-03-runtime-adapters` | F01 completada; independiente de F02 | [`prompts/fase-03-runtime-adapters.md`](prompts/fase-03-runtime-adapters.md) | [`2026-07-24-pipeline-fase-03-runtime-adapters.md`](../reports/2026-07-24-pipeline-fase-03-runtime-adapters.md) |
| F04 | Completada | `pipeline/fase-04-workspace-ui` | F03 completada | [`prompts/fase-04-workspace-ui.md`](prompts/fase-04-workspace-ui.md) | [`2026-07-25-pipeline-fase-04-workspace-ui.md`](../reports/2026-07-25-pipeline-fase-04-workspace-ui.md) |
| F05 | Completada | `pipeline/fase-05-control-supervisado` | F04 completada y QA visual | [`prompts/fase-05-control-supervisado.md`](prompts/fase-05-control-supervisado.md) | [`2026-07-25-pipeline-fase-05-control-supervisado.md`](../reports/2026-07-25-pipeline-fase-05-control-supervisado.md) |
| F06 | Completada | `pipeline/fase-06-modelos-presupuestos` | F05 completada | [`prompts/fase-06-modelos-presupuestos.md`](prompts/fase-06-modelos-presupuestos.md) | [`2026-07-25-pipeline-fase-06-modelos-presupuestos.md`](../reports/2026-07-25-pipeline-fase-06-modelos-presupuestos.md) |
| F07 | Planificada | `pipeline/fase-07-inteligencia-replay` | F01 + F03–F06 y datos suficientes; F02 opcional | [`prompts/fase-07-inteligencia-replay.md`](prompts/fase-07-inteligencia-replay.md) | Pendiente |
| F08 | Planificada | `pipeline/fase-08-hardening-release` | F00, F01 y F03–F07 completadas; F02 sólo si se incluyó | [`prompts/fase-08-hardening-release.md`](prompts/fase-08-hardening-release.md) | Pendiente |

## Cómo actualizar este tablero

El reporte de fase debe registrar estado anterior/nuevo, fecha, branch y evidencia. No borrar el
historial ni marcar una fase como completada solamente porque los tests pasaron. Si Git contradice
la tabla, reportar la diferencia antes de editarla.

## Historial de transiciones

### F06 · Modelos, Presupuestos y Contexto — `En curso` → `Completada` (2026-07-25)

- **Branch:** `pipeline/fase-06-modelos-presupuestos`, implementación verificada por Antigravity.
- **Evidencia:** `docs/reports/2026-07-25-pipeline-fase-06-modelos-presupuestos.md` y `docs/pipeline/f06/CHECKPOINT-0.md`.
- **Implementación:** 6 tandas completadas (Tanda 0 threat model, Tanda 1 catálogo y selección jerárquica, Tanda 2 routing y decorrelación Builder/Auditor con detección de drift, Tanda 3 contabilidad de tokens/costos sin double-counting y local_unpriced, Tanda 4 salud de contexto y headroom, Tanda 5 enforcement de presupuestos, i18n y cierre).
- **Validación:** tsc 0 errores; 73 archivos / 445 tests verde; eslint limpio; `gates.ps1 fast` VERDE; `gates.ps1 full` VERDE.

### F05 · Control Supervisado — `En curso` → `Completada` (2026-07-25)

- **Branch:** `pipeline/fase-05-control-supervisado`, implementación verificada por Antigravity.
- **Evidencia:** `docs/reports/2026-07-25-pipeline-fase-05-control-supervisado.md` y `docs/pipeline/f05/CHECKPOINT-0.md`.
- **Implementación:** 6 tandas completadas (Tanda 0 threat model, Tanda 1 command bus Main-Only con auditoría append-only, Tanda 2 controles no destructivos pause/steer/queue, Tanda 3 interrupción y subagentes con confirmación explícita y aviso de trabajo parcial retenido en el working tree sin rollback, Tanda 4 respond-decision y cancel-run coordinado, Tanda 5 cierre).
- **Validación:** tsc 0 errores; 68 archivos / 423 tests verde; eslint limpio; `gates.ps1 fast` VERDE; `gates.ps1 full` VERDE.

### F04 · Workspace UI — `En curso` → `Completada` (2026-07-25)

- **Branch:** `pipeline/fase-04-workspace-ui`, commit y push por Ale.
- **Evidencia:** `docs/reports/2026-07-25-pipeline-fase-04-workspace-ui.md`.
- **Implementación:** 5 tandas completadas (wireframe, shell 4ª pestaña, vía/ahora/decisiones, agentes/actividad/economía, detalle/diffs/auditoría/gates/CSS/i18n).
- **Validación:** tsc 0 errores; 64 archivos / 412 tests verde; Next build estático OK; eslint limpio; `gates.ps1 fast` VERDE.

### F03 · Runtime Adapters — `Lista para QA` → `Completada` (2026-07-24)

- **Branch:** `pipeline/fase-03-runtime-adapters`, mergeada a `main` con `--no-ff` (`b5a2213`).
- **Confirmado por:** Ale, tras auditoría independiente de Claude sobre el handoff de Antigravity.
- **Evidencia:** `docs/reports/2026-07-24-pipeline-fase-03-runtime-adapters.md` (secciones 1–7).
- **Corrección relevante:** la auditoría encontró telemetría fabricada en los adaptadores de LM Studio
  y OpenCode (valores hardcodeados marcados como `verified` citando fixtures que decían otra cosa).
  Se corrigió antes del merge; ver sección 6 del reporte.
- **Validación al cierre:** tsc 0 errores; 59 archivos / 367 tests verde; OpenSpec strict válido
  (9 specs, incluida la capability nueva `pipeline-runtime-adapters`); `gates.ps1 fast` VERDE.
- **Gate full:** `PENDIENTE` — C7 build OK; C5 lint y C8 fallow son deuda heredada previa a F03
  (baseline al 2026-07-23). Los archivos de F03 dan lint limpio. Decisión de baseline pendiente de Ale.
- **Pendiente declarado:** la telemetría de usage de OpenCode queda `degraded`. Cerrarla exige enviar
  `session/prompt`, es decir una inferencia paga contra el plan Z.AI. Decisión de gasto de Ale.
- **Change OpenSpec:** archivado en `openspec/changes/archive/2026-07-24-pipeline-fase-03-runtime-adapters/`,
  con los 6 delta specs sincronizados a `openspec/specs/`.
