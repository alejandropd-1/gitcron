## Why

Con un cambio validado y sin tareas pendientes, el panel muestra dos botones con el mismo texto ("Archivar cambio"): la acción primaria derivada por `derivePipelineNextAction` (estado `ready-to-archive`, `pipeline-next-action.ts:404`) y un botón siempre visible en la fila de acciones (`OpenSpecDashboard.tsx:696`). Los dos disparan el mismo `start-archive`. Es la duplicación que el propio requisito "Guía densa, contextual y traducida" prohíbe: *"SHALL NOT duplicar un control que ya exista en pantalla"*.

## What Changes

- El botón siempre visible de archivar (`OpenSpecDashboard.tsx:696`) deja de renderizarse cuando la acción primaria derivada ya es `start-archive`, porque en ese caso los dos botones son idénticos en texto y efecto.
- Se conserva el botón siempre visible en los demás casos: con tareas pendientes y validación aprobada, la primaria es "Continuar tarea" y el botón siempre visible ofrece archivar declarando cuántas tareas quedan; con validación no aprobada, queda deshabilitado mostrando el motivo. Esos aportes no los cubre la acción primaria.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `pipeline-guided-workflow`: el requisito "Guía densa, contextual y traducida" agrega un escenario explícito que prohíbe el botón de archivar duplicado cuando la derivación ya lo ofrece como acción primaria.

## Impact

- `components/pipeline/OpenSpecDashboard.tsx`: una guarda más en el render del botón siempre visible (no renderiza si `primaryAction.intent.kind === 'start-archive'`).
- Sin cambio en la derivación (`pipeline-next-action.ts`), en IPC ni en i18n: los textos ya existen y se reutilizan.
- Test nuevo que monta el dashboard y verifica la desaparición en `ready-to-archive` y la subsistencia con tareas pendientes.
