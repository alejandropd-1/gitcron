## Why

El panel Pipeline deriva su noción de progreso con un modelo propio: `lifecycle()` computa cinco fases secuenciales (`OpenSpecDashboard.tsx:99`) y `derivePipelineNextAction` adjunta un contador "paso N de 5" (`LIFECYCLE_TOTAL` en `pipeline-next-action.ts:19`). OpenSpec abandonó ese modelo: su workflow es un grafo de dependencias con estados `blocked` / `ready` / `done`, y su filosofía declarada es *"Actions, not phases — do any of them anytime. Dependencies are enablers, not gates."* Hoy el código **no invoca** `openspec status` (verificado con grep): el grafo real nunca llega al renderer, así que el panel no puede reflejar qué artefacto bloquea a cuál ni qué falta para que `apply` esté listo.

## What Changes

- Nuevo wrapper `statusOpenSpecChangeWithCli` en `electron/pipeline/openspec-cli.ts` que invoca `openspec status --json` y mapea su salida a tipos propios (`blocked` / `ready` / `done` con `missingDeps`, más `applyRequires` e `isComplete`).
- El lector de evidencia (`RepoEvidenceReader`) obtiene ese grafo **sólo para el change seleccionado** —mismo criterio que ya rige para `validate` y `artifacts`, porque el spawn del CLI cuesta y el watcher refresca en cada guardado— y lo adjunta al snapshot como un nuevo campo `status`.
- Nuevos tipos compartidos (`OpenSpecChangeStatus`) y propagación del campo al espejo del renderer (`OpenSpecChangeSummary`).

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `pipeline-guided-workflow`: agrega el requisito de que el grafo de artefactos se lea del estado real del CLI, para el cambio seleccionado. No modifica los requisitos existentes sobre fases ni siguiente paso: ese rediseño es otro change.

## Impact

- `electron/pipeline/openspec-cli.ts`: nueva función, reutiliza `CLI`, `execFileAsync`, `CHANGE_ID_PATTERN` y el env de telemetría ya declarados.
- `electron/pipeline/repo-evidence-reader.ts`: nueva dep inyectable `statusOpenSpecChange`, invocada sólo para el seleccionado.
- `types/pipeline/index.ts`: tres tipos nuevos + campo opcional `status` en `OpenSpecChangeEvidence`.
- `components/pipeline/pipeline-view-state.ts`: campo espejo en `OpenSpecChangeSummary`.
- Sin canal IPC nuevo: el grafo viaja dentro del snapshot existente (`pipeline:get-snapshot` / `pipeline:snapshot-updated`). Sin dependencias nuevas.
- No se toca `derivePipelineNextAction`, `lifecycle()` ni la barra de fases: ese consumo es el change siguiente (rediseño visual).
