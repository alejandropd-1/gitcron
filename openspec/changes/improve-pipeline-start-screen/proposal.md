## Why

La pantalla de inicio del repositorio, que llegó en `add-pipeline-start-screen`, tiene un defecto que
introdujo ese mismo trabajo y dos huecos que quedaron a la vista al usarla.

El defecto es una contradicción en pantalla. `derivePipelineNextAction` devuelve `no-active-change`
cuando `selectedChange` es `null` (`components/pipeline/pipeline-next-action.ts:382`), y su texto dice
«No hay ningún cambio activo en este repositorio». Antes eso sólo ocurría con el repositorio vacío,
porque siempre había un cambio seleccionado por descarte. Al retirar esa cadena, la pantalla de inicio
deja `selectedChange` en `null` **a propósito**, así que hoy la guía afirma que no hay cambios activos
mientras la misma pantalla lista cuatro arriba. La guía confunde «no elegiste ninguno» con «no hay
ninguno».

El primer hueco es de ubicación: la guía se renderiza al final de la pantalla, después de la lista de
cambios en curso y del bloque de cerrados, así que con cuatro cambios queda empujada fuera de vista.
Es la acción que la pantalla existe para ofrecer y es lo último que se ve.

El segundo hueco es que los cambios archivados no se pueden ver todos. En
`components/pipeline/OpenSpecDashboard.tsx:760` la lista lateral corta en `slice(0, 8)` y no hay
ningún control para ver el resto; la pantalla de inicio sólo declara la cuenta —«37 archivados»— sin
ofrecer por dónde entrar. Con treinta y siete archivados, veintinueve no son alcanzables desde ninguna
parte.

A eso se suma que la lista de cambios en curso muestra el avance como número y barra, pero no qué
falta. Saber que van cinco de seis no dice cuál es la sexta, que es la información con la que se
decide por dónde seguir.

## What Changes

La guía del siguiente paso distingue los dos estados. Cuando no hay ningún cambio seleccionado pero sí
hay cambios en curso, dice lo que corresponde —elegir uno de los que hay o empezar otro— en vez de
afirmar que no hay ninguno. El caso del repositorio realmente sin cambios activos conserva su texto.

La guía sube al principio de la pantalla de inicio, antes de la lista. Deja de depender de cuántos
cambios haya para estar a la vista.

Cada cambio en curso puede desplegarse para ver sus tareas pendientes, y el desplegado se actualiza
solo cuando una tarea se completa, porque la evidencia se relee en cada guardado.

Los cambios archivados se pueden ver todos: el bloque de cerrados de la pantalla de inicio pasa de una
cuenta a una lista desplegable con todos, y desde ahí se entra a cualquiera. La lista lateral conserva
sus ocho más recientes como acceso rápido, que es para lo que sirve.

Queda **fuera de alcance**: la rama en el panel de preparación y el rail derecho durante el commit,
que van en su propio change; la rama por cambio; el ancho de los paneles de artefactos, que sigue sin
poder reproducirse; y el grafo de OpenSpec.

## Capabilities

### New Capabilities

Ninguna. Qué muestra la pantalla de inicio y qué ofrece la guía ya son requisitos de
`pipeline-guided-workflow`.

### Modified Capabilities

- `pipeline-guided-workflow`: «El panel abre en el estado del repositorio» pasa a exigir que se vean
  las tareas pendientes de cada cambio y que se pueda llegar a todos los archivados. Se agrega el
  requisito de que la guía distinga no haber elegido un cambio de no haber ninguno.

## Impact

En `components/pipeline/pipeline-next-action.ts` se suma un estado para «hay cambios en curso y ninguno
elegido», con su entrada en `PipelineNextActionKind` y en el input la cuenta de cambios activos. En
`components/pipeline/OpenSpecDashboard.tsx` la guía se mueve al principio de la pantalla de inicio, cada
cambio suma su desplegable de tareas pendientes y el bloque de cerrados pasa a lista desplegable.

En pruebas, `pipeline-next-action.test.ts` cubre el estado nuevo y `pipeline-start-screen.test.tsx` la
contradicción que se corrige, el desplegable de tareas y el acceso a todos los archivados. En i18n, las
claves nuevas se escriben en ES, EN y ZH.

No se agregan dependencias. No se toca el proceso principal.
