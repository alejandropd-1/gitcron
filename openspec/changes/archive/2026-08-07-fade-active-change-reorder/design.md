## Decisión: el movimiento lo suaviza `layout`, no el fundido

Cada ítem se anima con `layout` para desplazarse a su nueva posición, y el fundido de opacidad queda
para cuando entra o sale de la lista.

**Alternativa descartada: sólo el fundido, sin animar la posición.** Es lo que se pidió literalmente
—"un efecto de fade, sutil nada más"— y es más simple. Se descarta porque no funcionaría para el caso
que motivó el pedido: React reusa cada nodo por su `key`, así que al reordenarse el elemento no se
desmonta ni se vuelve a montar, y una animación de entrada nunca llega a dispararse. El ítem seguiría
saltando de posición, sólo que ahora con una animación declarada que nadie vería.

Lo que sí se conserva del pedido es el registro: corto, discreto, sin rebote ni escala. El fundido no se
descarta, se reubica donde sí se percibe —entradas y salidas de la lista—, que es además el patrón que
el visor de diferencias ya usa para "hidratar" contenido nuevo.

**Alternativa descartada: transiciones de vista del navegador.** Es la forma moderna de animar un grupo
de elementos que se reordena, con `view-transition-class` y una sola regla de CSS, y evitaría envolver
nada en JavaScript. Se descarta por dos motivos concretos: el disparo exige envolver la actualización
del DOM en `document.startViewTransition`, y acá el reordenamiento no lo produce esta vista sino la
llegada de un snapshot nuevo por props, así que habría que interceptar una actualización que este
componente no controla. Y además el proyecto ya tiene resuelto este problema con `motion/react` en el
visor de diferencias y en los toasts: introducir una segunda técnica para el mismo fin dejaría dos
formas de animar conviviendo sin que ninguna sea la del proyecto.

## Decisión: `layout: 'position'` y no `layout: true`

Se anima únicamente la posición.

**Alternativa descartada: animar también el tamaño.** `layout: true` interpola además el alto y el
ancho. Se descarta porque los ítems de esta lista cambian de alto por otro motivo —se pliegan y
despliegan— y animar eso mezclaría dos gestos distintos: el que la persona pidió al desplegar y el que
el sistema produce al reordenar. Limitarlo a la posición deja el desplegado como estaba.

## Decisión: la preferencia de movimiento se respeta en JavaScript

Con `prefers-reduced-motion` activo, la animación de layout se apaga y la transición pasa a duración
cero.

**Alternativa descartada: resolverlo sólo en CSS**, como ya hace el panel con la banda de relectura. Se
descarta porque el movimiento acá no lo produce una hoja de estilos sino la animación de layout, que
calcula posiciones en JavaScript: una regla de CSS no la alcanza. Se usa el hook que la propia librería
expone, que lee la misma preferencia del sistema.

## Riesgo

**Que la animación estorbe en vez de ayudar.** Mitigación: dura 180 ms, no tiene rebote ni escala, y se
limita a esta lista. La comprobación es visual y es de Ale; si molesta, se baja la duración o se retira
sin tocar nada más, porque está contenida en un solo elemento.

## Sin medir

No se midió el costo de la animación con muchos cambios activos a la vez. Hoy son seis y no hay con qué
comparar; si la lista creciera a decenas, conviene volver a mirarlo antes de dar por buena la fluidez.
