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
| F00 | Lista para QA | `pipeline/fase-00-contrato` | Ninguno | [`prompts/fase-00-contrato.md`](prompts/fase-00-contrato.md) | [`2026-07-23-pipeline-fase-00-contrato.md`](../reports/2026-07-23-pipeline-fase-00-contrato.md) |
| F01 | Planificada | `pipeline/fase-01-modelo-evidencia` | F00 completada | [`prompts/fase-01-modelo-evidencia.md`](prompts/fase-01-modelo-evidencia.md) | Pendiente |
| F02 | Planificada | `pipeline/fase-02-hermes-connector` | F01 completada | [`prompts/fase-02-hermes-connector.md`](prompts/fase-02-hermes-connector.md) | Pendiente |
| F03 | Planificada | `pipeline/fase-03-runtime-adapters` | F02 completada | [`prompts/fase-03-runtime-adapters.md`](prompts/fase-03-runtime-adapters.md) | Pendiente |
| F04 | Planificada | `pipeline/fase-04-workspace-ui` | F03 completada | [`prompts/fase-04-workspace-ui.md`](prompts/fase-04-workspace-ui.md) | Pendiente |
| F05 | Planificada | `pipeline/fase-05-control-supervisado` | F04 completada y QA visual | [`prompts/fase-05-control-supervisado.md`](prompts/fase-05-control-supervisado.md) | Pendiente |
| F06 | Planificada | `pipeline/fase-06-modelos-presupuestos` | F05 completada | [`prompts/fase-06-modelos-presupuestos.md`](prompts/fase-06-modelos-presupuestos.md) | Pendiente |
| F07 | Planificada | `pipeline/fase-07-inteligencia-replay` | F01–F06 y datos suficientes | [`prompts/fase-07-inteligencia-replay.md`](prompts/fase-07-inteligencia-replay.md) | Pendiente |
| F08 | Planificada | `pipeline/fase-08-hardening-release` | F00–F07 completadas | [`prompts/fase-08-hardening-release.md`](prompts/fase-08-hardening-release.md) | Pendiente |

## Cómo actualizar este tablero

El reporte de fase debe registrar estado anterior/nuevo, fecha, branch y evidencia. No borrar el
historial ni marcar una fase como completada solamente porque los tests pasaron. Si Git contradice
la tabla, reportar la diferencia antes de editarla.
