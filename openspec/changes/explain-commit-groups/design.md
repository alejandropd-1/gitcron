## Context

El panel de preparación llegó a su forma actual en tres tandas: subir el commit al nivel del
repositorio, agrupar por procedencia, y juntar las dos mitades de un archivado. Cada una resolvió qué
se muestra; ninguna se ocupó de cuánto explica. Lo que queda es un panel correcto y seco: los grupos
llevan rótulo pero no descripción, el estado es una inicial en un recuadro, y el mensaje se ve pero no
se toca.

La restricción de producto es la invariante 11: denso, oscuro, productivo, sin textos explicativos
dentro de la app. Hay tensión real con este trabajo, porque agregar explicación es exactamente lo que
esa invariante limita. La lectura que se aplica: una línea que dice de qué está hecho un grupo es
estado, no explicación de producto. Lo que la invariante prohíbe es contar qué es OpenSpec o cómo se
usa la herramienta, y nada de eso entra.

## Goals / Non-Goals

**Goals:**

Que los controles de grupo se lean como controles. Que el mensaje se pueda corregir donde se decide
qué entra. Que cada grupo diga de qué está hecho y cada archivo qué es, para que algo que no
correspondía se vea antes de confirmar.

**Non-Goals:**

Atribuir archivos de código a un cambio: el dato no existe y se declara el límite en vez de simularlo.
El ancho de los paneles de artefactos. El grafo de OpenSpec.

## Decisions

**El tipo de archivo se deriva de la ruta, en una función pura.** `código`, `prueba`, `documentación`,
`configuración` y `artefacto` salen de la ubicación y del nombre, con tablas de entrada y salida como
el resto del módulo. Se descartó derivarlo del contenido: obligaría a leer archivos en el renderer,
que no lee archivos, y no agregaría precisión sobre la que ya da una convención de carpetas que este
repositorio respeta.

**El tipo se muestra sólo donde aporta.** En el grupo sin atribuir, que es donde no hay otra
información. En los grupos de un cambio o de un archivado, la procedencia ya está dicha por el grupo y
repetir el tipo en cada fila sería ruido. Se descartó mostrarlo siempre por uniformidad: la
uniformidad no es el objetivo, que se vea una omisión sí.

**El estado se dice con palabra y se conserva el color.** `nuevo`, `modificado`, `borrado` reemplazan a
la inicial. Se descartó dejar la inicial y sumar la palabra en el `title`: un dato que sólo aparece al
pasar el mouse no está presentado, que es el mismo criterio por el que el control de tarea dejó de ser
un `span`.

**El mensaje editable escribe directo en el `commitMessage` del store.** El campo muestra lo que haya
escrito, y si no hay nada muestra la sugerencia derivada. Se descartó mantener un estado local del
panel que se sincronice al preparar: habría dos fuentes para el mismo texto, y la que se ve podría no
ser la que se confirma —que es exactamente el modo de fallo que este panel existe para evitar—. Con
una sola fuente, lo que se lee es lo que se va a commitear.

La regla vigente no cambia de forma: la sugerencia sólo se propone mientras el campo esté vacío, así
que empezar a escribir congela la propuesta y cambiar la selección deja de reescribir el texto. Es la
misma garantía que ya protege un test.

**Las descripciones de grupo nombran lo que se puede nombrar.** El grupo de un cambio nombra el
cambio; el de un archivado nombra qué se archivó, que es un dato real derivado de la carpeta; el sin
atribuir declara que ningún cambio lo reclama, sin insinuar que debería. Se descartó redactar el
tercero como advertencia —«revisá esto»—: no hay nada anómalo en que un archivo de código no tenga
cambio, es el estado normal, y tratarlo como sospecha enseña a ignorar el aviso.

## Risks / Trade-offs

**Agregar texto choca con la invariante estética.** → Es una línea por grupo y una palabra por archivo,
sin ilustraciones ni párrafos. La comprobación es la validación visual de Ale, que es condición de
aceptación de este change y no una recomendación.

**Decir el tipo de archivo puede leerse como si fuera atribución.** → Por eso el grupo sin atribuir
declara explícitamente que ningún cambio lo reclama, y el tipo aparece como lo que es: qué clase de
archivo, no de dónde vino. La distinción entre lo observado y lo inferido es un principio ya
establecido en este panel.

**El campo editable puede pisarse con un cambio de selección.** → No puede: la sugerencia sólo se
escribe con el campo vacío, y hay un test que lo verifica desde `raise-commit-to-repo-level`. Se
conserva sin tocar.

**Una convención de carpetas distinta rompería la clasificación por tipo.** → Un archivo que no encaje
en ninguna categoría cae en `código`, que es el caso más común y el más inocuo si se equivoca. No se
inventa una categoría «desconocido» que no ayudaría a decidir nada.

## Open Questions

Ninguna que bloquee. Queda para la validación visual si el tipo de archivo conviene sólo en el grupo
sin atribuir, como se implementa, o también en los demás.
