## Context

`runtimeSessions` se arma en `OpenSpecDashboard.tsx:287` con la proyección activa más el historial,
deduplicado por `sessionId` y ordenado por `startedAt` descendente. `effectiveSessionId` (línea 291)
respeta la elección manual si sigue existiendo, y si no cae a la proyección activa o a la primera de
la lista. Ninguno de esos pasos mira `changeId`, aunque `RuntimeProjection` lo transporta.

La restricción que ordena el diseño es que esto es filtrado en la vista: los datos ya viajan al
renderer y no hay lectura nueva que hacer. Lo único que se decide es cuál es el conjunto sobre el que
opera la selección de sesión que ya existe.

## Goals / Non-Goals

**Goals:**

Que con un cambio abierto la columna muestre actividad de ese cambio y de ningún otro. Que un cambio
sin sesiones lo declare en vez de mostrar la de otro. Que sin cambio abierto se vea todo, porque el
contexto es el repositorio.

**Non-Goals:**

El ancho de los paneles de artefactos, que no se pudo reproducir. El grafo de OpenSpec. Cambiar cómo
se registran o persisten las sesiones, o agregar un `changeId` donde hoy no lo hay.

## Decisions

**El filtro se aplica sobre el conjunto, no sobre la sesión resuelta.** `runtimeSessions` pasa a estar
ya filtrado por el cambio abierto, y todo lo que cuelga de ahí —la sesión efectiva, el selector, la
disponibilidad de razonamiento, el estado— sigue funcionando sin tocarse. Se descartó filtrar sólo la
lista de entradas de actividad dejando la sesión como está: el encabezado de la columna nombra el
runtime y el estado de la sesión, así que una sesión ajena con sus entradas ocultas seguiría diciendo
que corrió algo que no es de este cambio.

**Una sesión sin `changeId` no pertenece a ningún cambio.** `changeId` es `string | null`, y el nulo
significa que no se pudo atribuir, no que sea de todos. Con un cambio abierto, esas sesiones quedan
fuera. Se descartó tratarlas como comodín visible en cualquier cambio: sería la misma mentira que el
defecto que se corrige, con menos frecuencia.

**Sin cambio abierto se muestran todas, sin filtrar.** La pantalla de entrada es del repositorio, así
que el conjunto natural es el del repositorio. Se descartó no mostrar nada: la actividad reciente es
justamente uno de los datos que sirven para decidir por dónde seguir.

**La proyección activa no se privilegia por estar corriendo.** Hoy `effectiveSessionId` cae primero a
`projection?.sessionId`; si esa sesión es de otro cambio, deja de ser candidata. Se descartó
conservarla siempre visible por ser la que está corriendo ahora: es precisamente el caso que produce
el defecto —una corrida en otro cambio pisa la lectura del que se está mirando—. Que haya algo
corriendo en otro lado se ve en el resto del panel, no acá.

## Risks / Trade-offs

**Filtrar puede dejar la columna vacía donde antes siempre había algo.** → Es el resultado correcto y
se declara: un cambio sin sesiones registradas es un estado normal —recién creado, o trabajado desde
afuera de la aplicación—. Se agrega el texto que lo dice, en vez de dejar un espacio en blanco que se
lea como que la aplicación no respondió.

**Se pierde de vista una corrida activa en otro cambio mientras se mira éste.** → Aceptado y
deliberado, según la decisión de Ale. La alternativa —mostrar todo etiquetando de qué cambio es cada
sesión— se consideró y se descartó porque obliga a leer la etiqueta en cada entrada para saber si lo
que se ve corresponde, que es trabajo que la interfaz debería haber hecho.

**El selector de sesiones cambia de contenido al cambiar de cambio.** → Es coherente con que la
columna sea del cambio, y `effectiveSessionId` ya tolera que la elección manual deje de existir: la
línea 291 comprueba pertenencia antes de respetarla, así que una sesión elegida a mano que ya no está
en el conjunto cae al fallback sin romper nada. Ese comportamiento no se toca.

## Open Questions

Ninguna. La decisión de producto está tomada y el resto se resuelve contra las líneas citadas.
