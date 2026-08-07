# El panel se rotula con el método, no con la herramienta

**Change:** `retitle-panel-spec-driven` · **Fecha:** 2026-08-07 · **Tareas:** 11/12 (falta la validación
visual de Ale)

## Qué se hizo

El encabezado dice «Spec-Driven Development» en dos líneas, en lugar de «OpenSpec».

## Por qué el cambio no es cosmético

La pantalla muestra el método: qué se propuso, cómo se pensó, qué falta y en qué anda un ejecutor.
«OpenSpec» es el nombre de la herramienta que provee esos datos.

La distinción se volvió concreta esta semana. Al auditar las reglas del proyecto contra las que entrega
el CLI quedó medido cuánto del método viene de OpenSpec y cuánto es de acá; y al revisar qué tiene
instalado cada repositorio quedó a la vista que OpenSpec es una pieza reemplazable —hay treinta
herramientas que lo consumen— dentro de una forma de trabajar que no lo es. El panel seguiría mostrando
lo mismo con otra herramienta debajo.

## Dos líneas, no una frase que se parte sola

El rótulo son dos elementos, así que el corte es estructural y no depende del ancho de la ventana. Con
una sola cadena, el navegador la partiría cuando le faltara espacio y no la partiría cuando le sobrara:
el rótulo se leería distinto según el tamaño de la ventana, y podría partir en el lugar equivocado.

El tamaño bajó —el rótulo pasó de nueve caracteres a veintitrés— y el bloque se apila ocupando el alto
de la barra en vez de flotar en su centro, para encuadrar con la fila de contadores que tiene al lado.

## Las dos líneas no medían lo mismo

Tienen once caracteres cada una y aun así la de arriba quedaba corta: «SPEC-DRIVEN» lleva un guion y una
`i`, que son angostos, y «DEVELOPMENT» lleva una `m`, que es ancha. Con el mismo tamaño el bloque se veía
desalineado por la derecha.

Se corrige agrandando la línea de arriba con un factor en `em`, para que siga al `clamp` del bloque en
lugar de quedar clavado a un tamaño. Es un ajuste óptico: el factor se estimó midiendo el rótulo
renderizado, y quien lo confirma es Ale mirándolo.

## Lo que no se tocó

El componente sigue llamándose `OpenSpecDashboard`, y su módulo de estilos también. Renombrar archivos
es un cambio de arquitectura y mezclarlo con un cambio de rótulo dejaría un diff donde no se distingue
uno del otro.

Las referencias a OpenSpec en la barra lateral y en los artefactos se quedan: ahí sí se habla de la
herramienta.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **108 archivos / 780 tests**: un archivo y un test más
que la base de 107/779, que son exactamente los agregados. Lint limpio.
`openspec validate retitle-panel-spec-driven --strict` válido.

Se comprobó antes de tocar que ningún test buscaba la cadena anterior, así que no había nada atado a
ella.

**Lo que la suite no cubre:** que el encabezado quede encuadrado con la fila de contadores. jsdom no
calcula layout, así que el test fija que son dos elementos con su texto, y nada más. La proporción la
valida Ale.
