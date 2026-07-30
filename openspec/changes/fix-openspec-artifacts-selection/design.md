## Context

`RepoEvidenceReader.read(repoPath, repoId)` computa la selección adentro con `selectPipelineChange(branch, activeChanges)`. El renderer pide el snapshot con `pipeline:get-snapshot(repoPath)` — sin parámetro de selección. La línea `artifacts: changeId === selection.changeId` decide quién transporta contenido; si `selection.changeId` es `null`, nadie lo transporta.

`OpenSpecDashboard` ya tiene `selectedChangeId` en su estado (línea ~202 del adapter: `state.selection.changeId ?? activeChanges[0]?.changeId`), pero ese estado **no viaja al backend** — sólo se usa para elegir qué pestaña de detalle mostrar. El reader decide solo.

## Goals / Non-Goals

**Goals**
- Selección manual de change que viaje al reader y haga que ese change transporte contenido.
- Precedencia: manual > automática por rama.
- Markdown de artefactos en pestaña dedicada.

**Non-Goals**
- Eliminar la selección automática (sigue como fallback cuando no hay manual).
- Persistir la selección entre sesiones (sólo mientras se navega el repo).
- Cambiar qué artefactos se transportan (los mismos que hoy: proposal/design/tasks/specs).

## Decisions

### D1: El reader acepta un `selectedChangeId` opcional
`read(repoPath, repoId, selectedChangeId?: string | null)`. Si llega y está entre los activos, se usa como selección (`confidence: 'confirmed', reason: 'manual'`). Si no, se cae a `selectPipelineChange(branch, activeChanges)` como hoy. Es aditivo: no rompe el comportamiento existente.

### D2: El IPC `pipeline:get-snapshot` pasa el `selectedChangeId`
El preload expone `pipelineGetSnapshot(repoPath, selectedChangeId?)`. El handler lo reenvía al service, que lo pasa al reader. El renderer guarda su selección manual y la incluye en cada pedido de snapshot (incluido el refresh).

### D3: Estado de selección manual en el renderer
`OpenSpecDashboard` mantiene `manualSelection: string | null`. Al hacer clic en el encabezado de un change desplegado, se setea. Al cambiar de repo, se resetea. Tiene precedencia sobre `state.selection.changeId` para decidir el change "activo" a mostrar.

### D4: Pestaña dedicada de markdown
`PipelineDetails` hoy incrusta el contenido al final. Se mueve a una pestaña nueva (ej. `DetailTab = 'proposal' | 'design' | 'tasks' | 'specs' | 'files'` ya existe). El markdown se renderiza dentro de la pestaña correspondiente (SafeMarkdown, ya existe), no como bloque colgando al final.

## Risks & Mitigations

- **La selección manual podría chocar con la sesión de runtime activa** (que tiene su propio changeId). Mitigación: la selección manual es sólo para leer artefactos; no cambia qué sesión está corriendo.
- **Refresh del snapshot podría pisar la selección manual.** Mitigación: el renderer reenvía `selectedChangeId` en cada refresh, así sobrevive.
- **Performance: releer artefactos al cambiar selección.** Mitigación: el reader ya lee una vez por snapshot; sólo cambia qué change transporta contenido, no vuelve a leer disco de más.
