# Reporte — read-archived-change-artifacts

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `read-archived-change-artifacts`

## Qué problema resolvía

Al pasar un change a "Completados recientes" no había forma de revisar qué se hizo desde la
aplicación. La evidencia de un archivado transportaba tres datos —id, fecha y ubicación— y la ficha
mostraba eso.

Para ver el `tasks.md` y confirmar que la firma humana quedó tildada había que leer el diff del
commit de archivado o abrir el archivo a mano. El registro que el método produce justamente para
poder revisarlo era el que no se podía revisar.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `electron/pipeline/repo-evidence-reader.ts` | El archivado seleccionado transporta proposal, design, tasks y specs delta. |
| `types/pipeline/index.ts`, `components/pipeline/pipeline-view-state.ts` | El contenido, opcional. |
| `components/pipeline/OpenSpecDashboard.tsx` + CSS | La ficha del completado muestra los artefactos con el visor que ya usan los activos. |
| `electron/__tests__/pipeline-archived-artifacts.test.ts` | Nuevo. 2 casos. |

Se reutiliza `PipelineDetails` en lugar de escribir un visor nuevo: es el mismo contenido y el mismo
saneado, y duplicarlo abriría la puerta a que los dos rindieran distinto.

El contenido viaja **sólo para el archivado seleccionado**, por el mismo motivo que en los activos:
transportar el markdown de todos haría crecer el snapshot sin que nadie lo mire. Hay test de ambos
casos.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** |
| `pnpm test` | **608 passed / 84 archivos**, 0 failed |
| `pnpm exec eslint` sobre los archivos tocados | **limpio** |
| `openspec validate read-archived-change-artifacts --strict` | **válido** |

## Pendiente de QA visual

El visor dentro de la ficha del completado no se vio en pantalla. La ficha está centrada y el visor
es contenido largo alineado a la izquierda; puede necesitar ajuste de ancho.
