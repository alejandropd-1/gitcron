## Why

La guía de próximas acciones ofrece "Ver diff" cuando el cambio está listo para archivar, sin
comprobar que exista un solo diff que ver. En `components/pipeline/pipeline-next-action.ts:471` el
estado `ready-to-archive` arma su acción secundaria con `button({ kind: 'view-diff' }, …)` de forma
incondicional, mientras que el botón equivalente del panel —`components/pipeline/OpenSpecDashboard.tsx:1059`—
sí está condicionado con `disabled={(snapshot.diffs?.length ?? 0) === 0}`. Son dos caminos al mismo
intent con criterios distintos, y por el de la guía se llega a la sub-pestaña de diffs vacía.

Los diffs del snapshot vienen de sesiones de runtime. Un cambio trabajado a mano, o por un agente
lanzado desde la terminal —que es como se crearon casi todos los cambios de este proyecto— no produce
ninguna, así que el caso vacío no es marginal: es el habitual. La guía existe para decir cuál es el
próximo paso real, y ofrecer un paso que no lleva a nada gasta la confianza que la hace útil.

## What Changes

- El estado `ready-to-archive` de la guía sólo ofrece "Ver diff" cuando el snapshot tiene al menos un
  diff; sin diffs, la acción no se ofrece y el estado queda con su acción principal sola.
- El criterio de disponibilidad queda en un solo lugar, compartido con el botón del panel, para que no
  vuelvan a divergir.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: la guía condiciona la acción "Ver diff" a que exista evidencia de diff,
  igual que ya lo hace el panel.

## Impact

**Producción:** `components/pipeline/pipeline-next-action.ts` (estado `ready-to-archive`),
`components/pipeline/OpenSpecDashboard.tsx` (consumir el criterio compartido en lugar de repetirlo).

**Sin tocar:** el intent `view-diff` y su manejo en el panel, que funcionan; la sub-pestaña de diffs;
el resto de los estados de la guía.

**Fuera de alcance:** producir diffs para cambios trabajados fuera de una sesión de runtime. Que el
caso vacío sea el habitual es un problema de atribución de trabajo, no de esta acción, y se trata en
`attribute-files-to-change`.

**Dependencias:** ninguna.

**Riesgo:** bajo. Es una condición sobre una acción secundaria, con la tabla de estados de la guía ya
cubierta por tests.
