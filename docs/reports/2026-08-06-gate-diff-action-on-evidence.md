# "Ver diff" deja de ofrecerse cuando no hay ninguno

**Change:** `gate-diff-action-on-evidence` · **Fecha:** 2026-08-06 · **Tareas:** 12/13 (falta la
validación de Ale en la aplicación)

## Qué se hizo

La guía de próximas acciones ofrece "Ver diff" sólo cuando hay al menos un diff. El criterio quedó en
una función única que consumen la guía y el botón del panel.

## El defecto no era el que parecía

El pendiente decía que la acción se ofrecía igual sin diffs, en los dos lugares. Al mirarlo, el botón
del panel **ya estaba condicionado**: `disabled={(snapshot.diffs?.length ?? 0) === 0}`. El que no lo
estaba era el camino de la guía, que armaba la acción secundaria de `ready-to-archive` sin comprobar
nada.

O sea que el problema no era una condición faltante sino dos caminos al mismo intent con criterios
distintos. Ese matiz cambia el arreglo: no alcanzaba con agregar la condición donde faltaba, porque
quedaban dos copias del mismo criterio listas para volver a separarse.

## El arreglo

`hasDiffEvidence` es ahora la única definición de "hay algo que mirar", y la usan los dos: el botón para
su `disabled` y el panel para armar el input de la guía.

La derivación recibe un booleano `hasDiffs`, no la lista. Es el mismo criterio que ya regía para
`hasActiveChanges`, y por el mismo motivo declarado en el código: la derivación no necesita nada más, y
recibir la lista invitaría a que empiece a decidir sobre ella.

## Por qué el caso vacío es el habitual

Los diffs se producen a partir de sesiones de runtime lanzadas desde la aplicación. Un cambio trabajado
a mano, o por un agente arrancado desde la terminal —que es como se creó casi todo en este
repositorio—, no produce ninguna. El conjunto vacío no es un borde: es el estado normal. Una guía que
propone un paso que no lleva a ningún lado deja de servir para lo único que hace, que es decir cuál es
el próximo paso.

## Lo que esto no resuelve

No produce diffs para el trabajo hecho fuera de una sesión de runtime. Que el caso vacío sea el habitual
es un problema de atribución, no de esta acción, y se trata en `attribute-files-to-change`.

## Sobre la cobertura, con precisión

Hay tres pruebas nuevas: la guía sin diffs no ofrece la acción, con diffs sí la ofrece, y el criterio
compartido responde correctamente sobre lista vacía, nula, ausente y con un elemento.

No se agregó una prueba de render del botón del panel. El botón y la guía ya no pueden divergir porque
llaman a la misma función, así que ese test probaría lo mismo por otro camino. Se declara acá para que
la cobertura no se lea como más amplia de lo que es.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **101 archivos / 741 tests**, verde en dos corridas
seguidas. Son tres más que la base de 738, y son exactamente los tres que se agregaron. Lint limpio
sobre `pipeline-next-action.ts`, `OpenSpecDashboard.tsx` y el archivo de pruebas.
`openspec validate gate-diff-action-on-evidence --strict` válido.

## Lo que falta

Ale valida en la aplicación: abrir un cambio listo para archivar sin ninguna sesión corrida y comprobar
que la guía ofrece archivar y ya no ofrece ver el diff.
