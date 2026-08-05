# La rama donde se decide, y la otra mitad del estado

**Change:** `commit-surface-context` · **Fecha:** 2026-08-05 · **Tareas:** 16/17 (falta la validación visual de Ale)

## Qué se hizo

Un commit lo definen tres cosas —qué archivos, con qué mensaje, a qué rama— y la tercera no estaba en la
superficie donde se deciden las otras dos. La rama se declaraba en el botón del encabezado y en la barra
inferior de evidencia, pero no junto al botón de Preparar. Ahora sí, como dato y sin ningún control al
lado: este panel no ejecuta ninguna operación de Git, y eso es condición de aceptación.

Mientras el panel está abierto, la columna derecha deja ACTIVIDAD y muestra los archivos ya preparados.
Al cerrarlo vuelve.

## Por qué lo preparado y no lo que falta

Ale propuso mostrar en la columna el sidebar de «cambios sin preparar» del Graph. Lo que falta preparar
es exactamente lo que el panel ya lista agrupado por procedencia, así que repetirlo daría dos vistas de
lo mismo, una de ellas peor.

La mitad que no se veía en ningún lado es la contraria. El panel filtra los archivos ya staged
—`modifiedFiles.filter((file) => !file.staged)`— para que el conteo baje al preparar y no se ofrezcan
dos veces. Esa decisión es correcta y tiene un efecto no buscado: deja invisible lo que ya viajó. Con lo
que falta mandar a la izquierda y lo que ya está listo a la derecha, el estado del commit se lee
completo sin cambiar de pantalla.

La lista es una vista y no lleva controles. Quitar del stage ya vive en el flujo de commit, y duplicar
una acción existente en una superficie nueva es lo que la guía prohíbe desde el botón de archivar
duplicado.

## Decisiones menores

La columna cambia sólo mientras el panel está abierto, y el cambio siempre acompaña a una acción
deliberada. Se descartó un selector para elegir qué muestra: agrega una decisión que nadie pidió, y el
criterio —qué sirve mientras se prepara— ya lo resuelve el estado del panel.

La lista de preparados no se recorta a un número fijo. Recortar sin decirlo es lo que dejó veintinueve
archivados inalcanzables en la barra lateral, y no se repite.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **98 archivos / 712 tests, verde en dos corridas
seguidas**. El flake conocido de los archivos que crean repositorios Git reales no apareció en estas dos;
eso no significa que esté resuelto —apareció en una corrida de la tanda anterior—. Lint limpio.
`openspec validate commit-surface-context --strict` válido.

No se leyó nada nuevo de Git: `currentBranch` ya llegaba como prop y `modifiedFiles` ya trae el booleano
`staged` por archivo. El proceso principal no se tocó.
