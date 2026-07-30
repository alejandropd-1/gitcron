## Why

Hoy el contenido de los artefactos OpenSpec (proposal.md, design.md, tasks.md, specs) sólo viaja al renderer para **un** change: el que el backend selecciona automáticamente comparando la rama con los changes activos (`change-selection.ts`). Si hay varios changes activos y la rama no coincide con ninguno (caso típico: estar en `main` con varios changes), la selección es `null` y **ningún change transporta contenido** — los artefactos no son clickeables. Por eso en GitCron no se pueden leer, mientras que en repos con un solo change sí.

Además, cuando el contenido sí llega, se muestra **al final del panel** en vez de en una pestaña dedicada. La lectura del markdown queda mal ubicada (UX defectuosa).

Las dos cosas son de UX y ambas impiden usar el workspace como lectura de artefactos.

## What Changes

- El renderer puede seleccionar manualmente un change activo para ver sus artefactos, sin depender de la rama. La selección manual viaja al reader y ese change transporta su contenido.
- La selección manual tiene precedencia sobre la automática; al cambiar de repo se reinicia; persiste mientras se navega el mismo repo.
- El markdown de los artefactos se muestra en una **pestaña dedicada** al lado de Trabajo y Actividad, no al final del panel.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-repo-evidence`: la evidencia transporta el contenido del change seleccionado **por el renderer** cuando lo hay, con precedencia sobre la selección automática por rama.

## Impact

**Producción:** `electron/pipeline/repo-evidence-reader.ts` (aceptar selección explícita), `electron/pipeline/pipeline-service.ts` + IPC `pipeline:get-snapshot` (pasar `selectedChangeId`), `electron/preload.ts`, `components/pipeline/OpenSpecDashboard.tsx` (estado de selección manual + pestaña markdown), `components/pipeline/PipelineDetails.tsx` (reubicar el markdown a pestaña).

**Sin tocar:** la selección automática por rama (sigue como fallback), la lógica de Git, runtimes, specs consolidadas.

**Dependencias:** ninguna.

**Riesgo:** medio-bajo. El cambio de selección toca el flujo de evidencia (reader + IPC + renderer), pero es aditivo: la selección automática sigue como fallback. La pestaña es reorganización de UI.
