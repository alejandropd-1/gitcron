## Why

La columna ACTIVIDAD muestra la última sesión que corrió, sea del cambio que sea. En
`components/pipeline/OpenSpecDashboard.tsx:287` las sesiones se arman con la proyección activa más el
historial completo, ordenadas por fecha de inicio, y en la línea 291 la sesión efectiva cae a
`projection?.sessionId ?? runtimeSessions[0]?.sessionId`: la más reciente del repositorio, sin mirar a
qué cambio pertenece. `RuntimeProjection` transporta `changeId` (`types/pipeline/projection.ts:95`) y
ese dato no se usa para nada en la selección.

El resultado es que estando adentro de un cambio se lee la actividad de otro. El resto del panel
central es del cambio abierto —tareas, artefactos, validación—, así que una columna al lado que
muestra otra cosa se lee como si fuera de ese cambio. Es un modo de fallo silencioso: nada declara la
discrepancia, y la única forma de notarla es reconocer que la sesión que se está leyendo no
corresponde a lo que se está mirando.

## What Changes

Con un cambio abierto, ACTIVIDAD muestra sólo las sesiones de ese cambio. La decisión entre filtrar y
mostrar todo etiquetando la tomó Ale el 2026-08-04: filtrar por el cambio seleccionado, porque el
resto del panel ya es por cambio y una columna con criterio distinto engaña.

Sin ningún cambio abierto —la pantalla de entrada del repositorio, que llegó en
`add-pipeline-start-screen`— ACTIVIDAD muestra todas las sesiones. Ahí el contexto es el repositorio
entero, así que restringir no tendría contra qué hacerlo.

Cuando el cambio abierto no tiene ninguna sesión registrada, la columna lo declara en vez de caer a la
sesión de otro. Un cambio sin actividad es un estado normal —recién creado, o trabajado desde afuera
de la aplicación— y mostrar la sesión de otro para no dejar el espacio vacío es exactamente lo que
produce la lectura equivocada.

Queda **fuera de alcance**: el ancho de los paneles de artefactos, que no pude reproducir y quedó
pendiente de evidencia; el reemplazo del ciclo de vida fijo por el grafo de OpenSpec; y cualquier
cambio en cómo se registran o persisten las sesiones. Esto es filtrado en la vista sobre datos que ya
viajan al renderer, no una lectura nueva.

## Capabilities

### New Capabilities

Ninguna. Qué muestra la columna de actividad respecto del cambio abierto es parte de cómo se recorre
OpenSpec desde la aplicación, que ya es `pipeline-guided-workflow`.

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega el requisito de que la actividad mostrada corresponda al
  cambio abierto, incluido qué hacer cuando ese cambio no tiene sesiones y cuando no hay ningún cambio
  abierto.

## Impact

En el renderer, `components/pipeline/OpenSpecDashboard.tsx` filtra `runtimeSessions` por el cambio
seleccionado antes de resolver la sesión efectiva, y el selector de sesiones pasa a ofrecer sólo las
del cambio. En i18n, la declaración de "este cambio no tiene actividad registrada" se escribe en ES,
EN y ZH. En pruebas, se suma cobertura del caso que produce el defecto: dos cambios con sesiones y la
más reciente perteneciendo al que no está abierto.

No se agregan dependencias ni se toca el proceso principal.
