## Context

`derivePipelineNextAction` decide sobre `selectedChange`, y su rama 6 —«sin cambio activo»— se escribió
cuando `selectedChange` sólo era `null` en un repositorio sin nada. `add-pipeline-start-screen` cambió
ese supuesto sin cambiar la función: ahora `null` significa «nadie eligió», que no es lo mismo. La
función no tiene forma de distinguirlo porque su input no incluye cuántos cambios activos hay.

La pantalla de inicio, además, ordena sus bloques como se escribieron —en curso, cerrados, guía— y no
por importancia. La guía es lo que la pantalla existe para ofrecer.

## Goals / Non-Goals

**Goals:**

Que la guía diga la verdad en los dos estados. Que esté a la vista sin depender de cuántos cambios
haya. Que se vea qué falta en cada cambio, no sólo cuánto. Que se pueda llegar a cualquier archivado.

**Non-Goals:**

La rama en el panel de preparación, el rail derecho durante el commit, la rama por cambio. El ancho de
los paneles de artefactos. El grafo de OpenSpec.

## Decisions

**La cuenta de cambios activos entra al input de la derivación.** Es el dato mínimo que permite
distinguir los dos estados, y mantiene la decisión en la función pura en vez de repartirla entre la
función y el render. Se descartó resolverlo en el componente —no renderizar la guía cuando hay cambios
activos—: la guía seguiría existiendo con un texto falso, y cualquier otro consumidor lo heredaría. Se
descartó también pasar la lista entera de cambios activos: la derivación no necesita nada más que
saber si hay alguno, y recibir la lista invita a que empiece a decidir sobre ella.

**El estado nuevo ofrece los mismos dos caminos.** Empezar con la tarea clara o definirla mejor, igual
que el estado sin cambios activos; lo que cambia es lo que declara. Se descartó agregar un botón de
«elegir un cambio»: los cambios están listados abajo con su propio control para entrar, y un segundo
camino a lo mismo es la clase de duplicación que la guía ya prohíbe para archivar.

**La guía va primero, sin excepción de estado.** Se descartó moverla sólo cuando hay muchos cambios:
una posición que cambia según el contenido obliga a buscarla, que es peor que una posición fija aunque
a veces quede lejos.

**Las tareas pendientes se despliegan a pedido y muestran sólo lo pendiente.** Se descartó listarlas
siempre: con cuatro cambios de veintiocho tareas, la pantalla de estado se volvería una lista de
tareas. Se descartó también mostrar las hechas junto a las pendientes: el avance ya está en la barra y
en el conteo, y lo que falta es lo que sirve para decidir. El desplegado no se actualiza por su cuenta
—no hace falta— porque la evidencia se relee en cada guardado y el render sale de ella.

**Los archivados se listan completos en la pantalla de inicio, no en la barra lateral.** La barra
lateral es acceso rápido a lo reciente y sus ocho cumplen esa función; la pantalla de inicio es el
panorama del repositorio y ahí corresponde poder ver todo. Se descartó sumar un «ver todos» a la barra
lateral: haría crecer una columna angosta con treinta y siete elementos y dejaría dos lugares
compitiendo por la misma lista.

## Risks / Trade-offs

**Una pantalla de estado que crece con desplegables se vuelve una lista de tareas.** → Todo lo que se
despliega arranca plegado, y lo desplegado es sólo lo pendiente. La comprobación es la validación
visual de Ale, que es condición de aceptación por la invariante 11.

**Cambiar el input de la derivación toca una función con cobertura amplia.** → El campo nuevo se suma
sin cambiar los estados existentes, y sólo se consulta en la rama que hoy miente. Los casos que ya
existen en `pipeline-next-action.test.ts` deben seguir pasando sin editarse; si alguno se rompe, es
señal de que se cambió más de lo que corresponde.

**El defecto se corrige donde se originó, no donde se ve.** → Se podría tapar en el render y sería más
rápido. No se hace: la afirmación falsa está en la derivación, y taparla dejaría el mismo texto listo
para reaparecer en cualquier otro consumidor.

## Open Questions

Ninguna que bloquee. Queda para la validación visual si los archivados en la pantalla de inicio
convienen plegados por defecto, como se implementa, o desplegados cuando son pocos.
