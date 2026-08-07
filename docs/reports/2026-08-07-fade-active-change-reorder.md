# El reordenamiento de la lista deja de ser un salto

**Change:** `fade-active-change-reorder` · **Fecha:** 2026-08-07 · **Tareas:** 13/14 (falta la
validación visual de Ale)

## Qué se hizo

Cada cambio de la lista de activos se desplaza de forma animada al moverse de posición, y entra o sale
con un fundido de opacidad. Con `prefers-reduced-motion` la animación se apaga.

## De dónde salió el patrón

No se inventó: la aplicación ya resolvió esto y está en el registro de cambios. El visor de diferencias
envuelve sus secciones en `motion.div` con clave e inicializadores de opacidad para que el contenido
"se hidrate con un fundido" en vez de aparecer de golpe, y el mismo criterio se aplicó al lienzo del
grafo para evitar deformaciones al alternar vistas. La lista de cambios activos era una de las pocas
superficies que seguía cambiando de forma abrupta.

`motion/react` ya era dependencia —se usa en los toasts y en el visor—, así que no se agregó ninguna.

## El pedido literal no funcionaba, y por qué

Lo pedido fue "un efecto de fade, sutil nada más". Un fundido solo no habría resuelto el caso que lo
motivó: React reusa cada nodo por su `key`, así que al reordenarse el elemento no se desmonta ni se
vuelve a montar, y una animación de entrada nunca llega a dispararse. El ítem seguiría saltando, ahora
con una animación declarada que nadie vería.

Lo que suaviza el salto es animar la posición. El fundido no se descartó: se reubicó donde sí se
percibe, en las entradas y salidas de la lista. Cada uno cubre el caso que el otro no puede.

Del pedido se conservó el registro: 180 ms, sin rebote ni escala, acotado a esta lista.

## Por qué no transiciones de vista del navegador

Se consultó la guía de prácticas modernas, que para un grupo de elementos que se reordena propone
`view-transition-class` y una sola regla de CSS. Se descartó por dos motivos.

El disparo exige envolver la actualización del DOM en `document.startViewTransition`, y acá el
reordenamiento no lo produce esta vista sino la llegada de un snapshot nuevo por props: habría que
interceptar una actualización que el componente no controla.

Y el proyecto ya tiene resuelto este problema con `motion/react`. Introducir una segunda técnica para el
mismo fin dejaría dos formas de animar conviviendo sin que ninguna sea la del proyecto.

## Dos decisiones de detalle

**`layout: 'position'` y no `layout: true`.** Los ítems de esta lista ya cambian de alto por otro
motivo —se pliegan y despliegan—, y animar también el tamaño mezclaría el gesto que la persona pidió con
el que produce el sistema al reordenar.

**La preferencia de movimiento se respeta en JavaScript.** El panel ya la respeta en CSS para la banda
de relectura, pero acá el desplazamiento se calcula en JavaScript, así que una regla de estilos no lo
alcanza. Se usa el hook que la propia librería expone.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **106 archivos / 777 tests**, sin variación respecto de
la base: es una envoltura sobre un elemento existente, sin cambio de comportamiento. Lint limpio.
`openspec validate fade-active-change-reorder --strict` válido.

**La suite no cubre esto y no se declara que lo cubra.** Ninguna prueba distingue "se movió suave" de
"saltó". La comprobación es visual.

## Sin medir

No se midió el costo con muchos cambios activos a la vez. Hoy son seis y no hay con qué comparar; si la
lista creciera a decenas, conviene volver a mirarlo antes de dar la fluidez por buena.
