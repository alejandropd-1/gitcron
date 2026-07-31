# Reporte — sync-displayed-change-selection

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `sync-displayed-change-selection`

## Qué problema resolvía

La vista podía estar mostrando un cambio del que no se leyó evidencia.

Cuando la rama no identifica ningún cambio activo y hay varios, el backend **no selecciona
ninguno** — correctamente: la invariante de selección no ambigua le prohíbe adivinar. Pero el
renderer igual tiene que mostrar algo y cae a `activeChanges[0]`, sin informárselo al backend.

Mientras la validación corría para todos los cambios activos, la divergencia pasaba desapercibida.
Al acotarla al cambio seleccionado por costo (en `fix-pipeline-refresh-cost`, ya archivado), quedó
a la vista.

**Caso real que lo destapó:** rama `fix/openspec-artifacts-selection` con ese cambio ya archivado.
Ninguno de los cuatro activos matchea. `add-explicit-change-archival` se muestra en pantalla,
`openspec validate add-explicit-change-archival --strict` lo declara válido, y la app informa
"Todavía no se validó" y deja el control de archivado deshabilitado. Los artefactos de ese cambio
tampoco viajaban.

## Dos fallbacks, no uno

La primera versión de este arreglo **no funcionó**, y el motivo importa: había un segundo fallback,
una capa más abajo, que hacía inalcanzable al primero.

`pipeline-adapter.ts` mapeaba `selectedChangeId: state.selection.changeId ?? activeChanges[0]...`.
Es decir, la adaptación de la evidencia a la vista ya sustituía la selección ausente por un cambio
cualquiera. Con eso, la vista nunca podía distinguir "el backend eligió éste" de "el backend no
eligió ninguno y yo muestro el primero" — y sin esa distinción, no había forma de saber que había
algo que informar. La condición para reportar jamás se cumplía.

Se quitó ese fallback: `selectedChangeId` ahora dice lo que el backend resolvió, incluida su
ausencia. El fallback para *mostrar* sigue existiendo donde corresponde —en la vista—, que además
ahora lo informa.

Lección concreta: un valor "conveniente" puesto en una capa de adaptación borró información que una
capa de arriba necesitaba para decidir. No fallaba ruidosamente; simplemente volvía imposible una
comprobación correcta.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `components/pipeline/pipeline-adapter.ts` | `selectedChangeId` conserva la selección del backend, incluida su ausencia, en vez de sustituirla. |
| `components/pipeline/OpenSpecDashboard.tsx` | Informa la selección mostrada cuando el backend no resolvió ninguna, sólo para cambios activos. |
| `components/pipeline/__tests__/pipeline-adapter.test.ts` | +2 casos: la selección sin resolver se conserva sin resolver; la resuelta se conserva. |
| `components/pipeline/__tests__/pipeline-selection-sync.test.tsx` | Nuevo. 3 casos: fallback informado, selección automática respetada, selección manual no pisada. |

La condición se calcula durante el render y se emite en un efecto, para no llamar al `setState` de
un componente padre mientras se renderiza el hijo. Converge sola: informada la selección, el
siguiente snapshot la trae en `selectedChangeId` y la condición deja de cumplirse.

## Qué NO se tocó

- La selección automática por rama y su invariante de no ambigüedad: el backend sigue sin adivinar.
  Lo que se corrige es que la elección que la vista ya hacía deje de ser invisible.
- La precedencia de la selección manual explícita del usuario, que sigue mandando.
- Electron main, IPC, SQLite, i18n. Sin dependencias nuevas.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** |
| `pnpm test` | **584 passed / 81 archivos**, 0 failed |
| `pnpm exec eslint` sobre los archivos tocados | **limpio** |
| `openspec validate sync-displayed-change-selection --strict` | **válido** |

## Observación de método

Este defecto no lo encontró ningún test: lo encontró Ale usando la aplicación, igual que el
solapamiento de la fila de acciones y que el archivado que no archivaba. Los tres son de la misma
clase —integración real entre capas, o render— y ninguno era detectable con las pruebas que hay.

Vale anotarlo sin dramatizarlo: la suite cubre bien la lógica pura y los contratos, y no cubre el
sistema andando. Mientras eso sea así, el QA visual no es un trámite de cierre sino la única red
para esta clase de defecto.
