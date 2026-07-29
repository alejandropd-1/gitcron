## Why

El workspace ya lee evidencia real y guía el próximo paso, pero quedaron cuatro asperezas que se notan al usarlo.

La primera es la que más molesta: **la app te dice que tus artefactos existen y no te los deja leer**. El panel izquierdo lista `proposal.md`, `design.md`, `specs/` y `tasks.md` con su estado, pero el lector abre `proposal.md`, le extrae el intent para el encabezado y descarta el contenido: sólo conserva un booleano `proposalExists`. `PipelineDetails` tiene una pestaña Propuesta que nunca recibe nada. Para leer la propia propuesta hay que salir de GitCron y abrir el archivo a mano.

La segunda se ve en Actividad: cada delta de texto del runtime se guarda como una entrada separada, así que un mensaje aparece partido en cinco fragmentos que empiezan a mitad de palabra. El texto completo está, pero ilegible.

La tercera y la cuarta son peso muerto que quedó del encuadre anterior: `stations` y `now` no los consume nadie, y el mecanismo de cursores JSONL perdió su única fuente cuando se retiraron los registros del kit.

Y hay una quinta que arrastra el change anterior: `pipeline-event-contract` todavía declara que Pipeline ingiere gates, delegaciones y alturas visuales, y que emite `gate.changed`. Eso dejó de ser cierto y una spec que afirma lo que el código no hace es peor que no tenerla.

## What Changes

- El lector conserva el contenido de `proposal.md`, `design.md` y `tasks.md` del cambio seleccionado, y el workspace los muestra en pestañas legibles con el markdown ya saneado.
- Los deltas de mensaje del runtime se acumulan en una sola entrada de narrativa por mensaje, en vez de una entrada por fragmento.
- Se retiran `stations` y `now` del snapshot junto con sus tipos y las cadenas i18n que sólo ellos usaban.
- Se retira el mecanismo de cursores JSONL: `PipelineCursorStore`, su uso en `pipeline-repository` y la tabla `pipeline_cursor`, con una migración que la elimina sin romper bases existentes.
- Se corrige `pipeline-event-contract` para que describa lo que Pipeline efectivamente ingiere.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-repo-evidence`: la evidencia pasa a transportar el contenido de los artefactos del cambio seleccionado, no sólo su existencia.
- `pipeline-event-contract`: deja de declarar la ingesta de registros del kit retirado y de `gate.changed`; incorpora que los deltas de narrativa se entregan coalescidos.

## Impact

**Producción:** `electron/pipeline/repo-evidence-reader.ts`, `pipeline-repository.ts`, `electron/db/schema.ts`, `electron/pipeline/runtime/runtime-projection.ts`, `components/pipeline/pipeline-adapter.ts`, `pipeline-view-state.ts`, `PipelineDetails.tsx`, `OpenSpecDashboard.tsx`, `types/pipeline/`, `lib/i18n.ts`.

**Sin tocar:** topbar, iconos, sidebars, lógica de Git, `runtime-adapters/`, `control/`, las sesiones persistidas y los fixtures de `docs/pipeline/f03`.

**Dependencias:** ninguna agregada ni removida. El markdown se renderiza con `SafeMarkdown`, que ya existe.

**Riesgo:** la migración toca SQLite. Debe agregarse como versión nueva sin editar las anteriores, y degradar sin romper bases existentes.
