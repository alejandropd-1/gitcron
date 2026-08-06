## Why

El visor de artefactos no sabe renderizar el markdown que OpenSpec escribe, y eso se veía como un
problema de ancho hasta que Ale mostró una captura del contenido real.

`parseMarkdown` en `components/pipeline/SafeMarkdown.tsx` reconoce `# `, `## ` y `### `, y nada más.
Una línea que empieza con `#### ` no encaja en ninguna rama y cae al `else` final, que la trata como
párrafo: sale impresa con sus cuatro almohadillas a la vista. El problema es que **`####` es
exactamente lo que OpenSpec usa para cada escenario** —«los escenarios llevan exactamente cuatro
almohadillas» es una regla del propio método, y hay una advertencia sobre eso en el handoff— así que
el nivel más frecuente de un archivo de spec es el único que el visor no entiende. Cada `#### Scenario:`
de cada requisito se lee crudo.

Las listas tampoco muestran sus viñetas. El preflight de Tailwind declara `list-style: none` para todas
las listas (`node_modules/tailwindcss/preflight.css:200`), y `.pipeline-markdown__list` nunca la
restituye. Los `- **WHEN**` y `- **THEN**` de cada escenario quedan como líneas indentadas sin marca,
que es como se leen en la captura.

Esto es lo que quedaba del pendiente del ancho, que nunca se pudo reproducir midiendo el layout: el
texto no estaba cortado ni restringido, estaba sin formatear.

## What Changes

El parser reconoce los seis niveles de encabezado en vez de tres, contando las almohadillas en lugar
de comparar contra tres prefijos escritos a mano. Los niveles se mapean corridos dos posiciones —`#`
del documento pasa a `h3` en la página— para que el artefacto se encaje bajo los encabezados que el
panel ya tiene, sin saltos en la jerarquía y sin pasarse de `h6`.

Las listas del visor recuperan sus viñetas, declarándolas explícitamente para que el reajuste global de
Tailwind no las borre.

Queda **fuera de alcance**: tablas, enlaces, imágenes y énfasis en cursiva, que el visor tampoco
interpreta y que los artefactos de este proyecto no usan; el visor sigue siendo deliberadamente
parcial, sin `dangerouslySetInnerHTML`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega el requisito de que el visor renderice las convenciones de
  markdown que la propia metodología usa en sus artefactos.

## Impact

En `components/pipeline/SafeMarkdown.tsx`, el reconocimiento de encabezados pasa de tres comparaciones
a una expresión que cuenta almohadillas, y el tipo de bloque pasa a llevar el nivel. En
`app/globals.css`, `.pipeline-markdown__list` declara su viñeta y `.pipeline-markdown__h4` en adelante
reciben su tamaño.

En pruebas, se cubre que un escenario con cuatro almohadillas se renderiza como encabezado y no como
texto, y que una lista conserva sus ítems.

No se agregan dependencias. No hay claves de i18n nuevas. No se toca el proceso principal.
