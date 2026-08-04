## Why

El panel "Preparar el commit del cambio" vive hoy pegado arriba del tab Trabajo, comparte contenedor con el panel de archivado, y tras preparar no da señal visual de que los archivos ya se fueron: la lista sigue mostrándose porque los archivos quedan en `modifiedFiles` marcados como staged. Además, los archivos ajenos (`foreign`) sólo se pueden sumar de a uno. El QA visual reportó las tres fricciones: falta un "seleccionar todos", el commit y el archivado se mezclan en la misma vista, y tras preparar la lista debería desaparecer o decir cuántos se enviaron.

## What Changes

- **Tab "Commit" aparte.** El panel de preparar el commit deja de vivir arriba del tab Trabajo y pasa a su propia pestaña (cuarto botón: Trabajo / Actividad / Artefactos / Commit). Archivar sigue donde está, en la fila de acciones — la separación la da el tab, no un cambio de lugar del archivado.
- **Seleccionar todos / deseleccionar.** La lista de archivos que no se le pueden atribuir al cambio gana un control que los suma todos de una vez o los vacía, además de los checkboxes individuales que ya existen.
- **Vista tras preparar.** La derivación del alcance pasa a excluir los archivos ya staged: al preparar, el refresh los marca staged y la lista se vacía sola. Y cuando no queda nada por preparar pero hay una preparación reciente, el panel lo declara con un texto "N archivos enviados a commit" en vez de la lista vacía.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `pipeline-guided-workflow`: "Preparar el commit sin confirmarlo" agrega escenarios de selección múltiple y de la vista post-preparación; "El alcance se deriva, no se declara" agrega el escenario de que los staged quedan fuera.

## Impact

- `components/pipeline/OpenSpecDashboard.tsx`: nuevo valor de `CenterTab`, cuarto botón de tab, reubicación del bloque de preparación, control de seleccionar todos, filtro staged en el input de la derivación, estado local `lastPreparedCount` y render condicional del resumen.
- `lib/i18n.ts`: claves nuevas en los tres idiomas (`tabs.commit`, `prepare.selectAll`/`prepare.deselectAll`, `prepare.preparedSummary`).
- Sin cambios en `lib/change-commit-scope.ts` (la derivación sigue pura; el filtro staged va en el dashboard), en `StagingPanel` ni en el store.
