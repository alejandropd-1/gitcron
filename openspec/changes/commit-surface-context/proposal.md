## Why

El panel de preparación decide dos cosas —qué archivos entran y con qué mensaje— y no muestra la
tercera que define el commit: a qué rama va. La rama se declara en el botón del encabezado
(`components/pipeline/OpenSpecDashboard.tsx:614`) y en la barra inferior de evidencia (`:1428`), pero
no en la superficie donde se aprieta Preparar. Hoy eso pasa desapercibido porque la rama siempre es
`main`; deja de pasar desapercibido en cuanto haya más de una, que es hacia donde va el trabajo de
atribución.

En paralelo, mientras el panel está abierto el rail derecho sigue mostrando ACTIVIDAD: la sesión de un
runtime, su estado y sus entradas. Nada de eso interviene en la decisión de qué se confirma, así que la
columna ocupa el ancho sin aportar.

Y hay una mitad del estado que no se ve en ninguna parte. El panel filtra a propósito lo que ya está
staged —`modifiedFiles.filter((file) => !file.staged)`, `:376`— para que el conteo baje al preparar y
no se ofrezca dos veces lo mismo. La consecuencia es que lo ya preparado desaparece de la vista: se
sabe qué falta mandar, no qué hay listo para confirmar.

## What Changes

El panel de preparación declara la rama actual junto al mensaje, que es donde se decide. Es la misma
información que ya viaja al panel, presentada donde se usa.

Mientras el panel está abierto, el rail derecho deja de mostrar ACTIVIDAD y pasa a mostrar lo que ya
está preparado: los archivos staged, con su estado. Al cerrar el panel vuelve a ACTIVIDAD. Con las dos
mitades a la vista —lo que falta mandar a la izquierda, lo que ya está listo a la derecha— el estado
del commit se lee completo sin cambiar de pantalla.

Se descartó mostrar en el rail lo que está **sin** preparar: es exactamente lo que el panel ya lista
agrupado, y repetirlo sería mostrar lo mismo dos veces. Lo que falta es la otra mitad.

Queda **fuera de alcance**: crear ramas, cambiar de rama o cualquier escritura de Git nueva —la rama
sólo se muestra—; la rama por cambio como flujo; el ancho de los paneles de artefactos; y el grafo de
OpenSpec.

## Capabilities

### New Capabilities

Ninguna. Qué muestra el panel de preparación ya es un requisito de `pipeline-guided-workflow`.

### Modified Capabilities

- `pipeline-guided-workflow`: «Preparar el commit sin confirmarlo» pasa a exigir que la rama de destino
  se declare en la superficie donde se prepara, y que lo ya preparado sea visible mientras se decide.

## Impact

En `components/pipeline/OpenSpecDashboard.tsx`, el encabezado del panel suma la rama y el rail derecho
condiciona su contenido a que el panel esté abierto. La lista de staged sale de `modifiedFiles`, que ya
está en el store: no hay lectura nueva de Git.

En i18n, las claves de la rama de destino y del rail de preparados se escriben en ES, EN y ZH. En
pruebas, se cubre que la rama aparece en el panel y que el rail muestra los staged mientras está
abierto.

No se agregan dependencias. No se toca el proceso principal ni se ejecuta ninguna operación de Git.
