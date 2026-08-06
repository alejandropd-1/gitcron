# El visor renderiza el markdown de OpenSpec

**Change:** `render-openspec-markdown` · **Fecha:** 2026-08-06 · **Tareas:** 12/13 (falta la validación visual de Ale)

## Qué era en realidad el «defecto de ancho»

El pendiente que arrastraba tres sesiones decía que el texto de PROPUESTA / DISEÑO / SPECS se cortaba
cerca del 60% del contenedor. Se midió el layout en el navegador y no había restricción alguna: los
cinco niveles del anidamiento medían 1168px de 1200 con `max-width: none`. Se descartó también el
truncado de contenido en el lector del proceso principal.

No era ancho. Era que **el texto no estaba formateado**, y Ale lo destapó mandando una captura del
contenido en vez del layout.

`parseMarkdown` en `SafeMarkdown.tsx` comparaba contra tres prefijos escritos a mano —`# `, `## `,
`### `— y nada más. Una línea con `#### ` no encajaba en ninguna rama y caía al `else` final, que la
trata como párrafo: salía impresa con sus cuatro almohadillas a la vista.

Lo irónico es cuál nivel quedaba afuera. **`####` es el que OpenSpec usa para cada escenario** —«los
escenarios llevan exactamente cuatro almohadillas» es regla del método, y está anotada como trampa en
el handoff—. El visor de OpenSpec no entendía el nivel más frecuente de un archivo de spec.

Las listas tampoco mostraban su marcador: el preflight de Tailwind declara `list-style: none` para
todas las listas de la aplicación (`node_modules/tailwindcss/preflight.css:200`) y el visor nunca lo
restituía, así que los `- **WHEN**` y `- **THEN**` de cada escenario quedaban como líneas indentadas
sin marca.

## Qué se hizo

El parser cuenta almohadillas en vez de comparar prefijos. Tres comparaciones a mano fueron lo que dejó
afuera el cuarto nivel, y una cuarta habría dejado afuera el quinto; una expresión de uno a seis cubre
el markdown entero y no vuelve a quedar corta.

Los niveles se corren dos posiciones: el `#` del documento pasa a `h3` porque el panel ya usa `h2` para
su marca y `h3` para sus secciones. Así el esquema de encabezados queda navegable y en orden, que es lo
que pide la guía de accesibilidad, sin un segundo `h1` ni saltos. `####` llega a `h6` y los dos niveles
que sobran se mapean también a `h6`, que es el último que existe.

El cuarto nivel se distingue por color y espaciado más que por tamaño: una spec tiene veinte escenarios
y una escalera de títulos decrecientes la haría ilegible.

Las viñetas se restituyen sólo dentro del visor. Tocar el reajuste global rompería el resto de las
listas del producto, que están estilizadas contando con que no hay marcador.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. Lint limpio. `openspec validate --strict` válido. **101 archivos /
736 tests, verde en dos corridas seguidas** con el entorno de desarrollo apagado.

Vale registrar cómo se llegó a ese verde, porque el camino tiene una lección. Con `electron:dev`
corriendo —`next dev` más `tsup --watch` más Electron— la suite completa **no cerraba**: caían entre
cinco y siete archivos por corrida, y no siempre los mismos. La firma era uniforme:

- **Todas las fallas eran `Error: Test timed out in 5000ms`. Ninguna era una aserción fallida.**
- Los mismos siete archivos, corridos juntos y aislados, pasaban: 46/46.
- No eran los cuatro archivos que crean repositorios Git reales del flake ya conocido, sino tests de
  componentes.

El change se dejó explícitamente **sin cerrar** con esa evidencia anotada, en vez de declarar un verde
que no existía. Ale bajó el entorno de desarrollo y la suite cerró limpia en dos corridas seguidas.

De acá sale un criterio para tener a mano: **mirar si las fallas son timeouts o aserciones**. Muchos
archivos cayendo a la vez por `timed out` es carga de la máquina; una aserción fallida es un defecto.
En una tanda anterior se descartaron siete fallos simultáneos como «recursos» sin leer el mensaje —la
conclusión resultó correcta, pero por casualidad—.

## Lo que queda fuera

Tablas, enlaces, imágenes y cursiva siguen sin interpretarse. Los artefactos de este proyecto no los
usan, y el visor sigue siendo deliberadamente parcial: no usa `dangerouslySetInnerHTML` y sólo muestra
lo que reconoce.
