# La columna ACTIVIDAD filtra por el cambio abierto

**Change:** `filter-activity-by-change` · **Fecha:** 2026-08-04 · **Tareas:** 13/14 (falta la validación visual de Ale)

## Qué se hizo

Con un cambio abierto, ACTIVIDAD muestra sólo sus sesiones. El filtro se aplica sobre `runtimeSessions`,
no sobre la lista de entradas: todo lo que cuelga de ahí —sesión efectiva, selector, disponibilidad de
razonamiento, estado— sigue derivando del conjunto sin tocarse. Filtrar sólo las entradas habría
dejado el encabezado nombrando el runtime y el estado de una sesión ajena.

Sin ningún cambio abierto —la pantalla de entrada— se muestran todas, porque el contexto es el
repositorio y no hay contra qué restringir.

Un cambio sin sesiones lo declara con un texto propio en vez de caer a la actividad suelta del
snapshot, que sería la de otro trabajo.

## El defecto que corrige, con su evidencia

`OpenSpecDashboard.tsx:287` armaba las sesiones con la proyección activa más el historial, ordenadas
por fecha, y la sesión efectiva caía a `projection?.sessionId ?? runtimeSessions[0]?.sessionId`: la
más reciente del repositorio. `RuntimeProjection` transporta `changeId` (`types/pipeline/projection.ts:95`)
y ese dato no participaba de la selección.

Como el resto del panel central sí es del cambio abierto, la columna al lado se leía como si fuera de
él. Nada declaraba la discrepancia: notarla exigía reconocer que la sesión que se estaba leyendo no
correspondía a lo que se estaba mirando.

## Dos decisiones que vale registrar

**Una sesión con `changeId` nulo no entra en ningún cambio.** El nulo significa que no se pudo
atribuir, no que sea de todos. Tratarla como comodín visible en cualquier cambio sería la misma
mentira que el defecto, con menos frecuencia.

**La proyección activa dejó de privilegiarse por estar corriendo.** Era el primer candidato de la
selección; si es de otro cambio, ahora no está en el conjunto. Ese era justamente el caso que producía
el defecto: una corrida en otro lado pisaba la lectura del cambio que se estaba mirando.

La alternativa —mostrar todo etiquetando de qué cambio es cada sesión— se consideró y Ale la descartó
el 2026-08-04: obliga a leer la etiqueta en cada entrada para saber si lo que se ve corresponde, que
es trabajo que la interfaz debería haber hecho.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **98 archivos / 691 tests, verde en dos corridas
seguidas**. El flake conocido de los archivos que crean repositorios Git reales no apareció en ninguna;
eso no significa que esté resuelto. Lint limpio sobre los cuatro archivos tocados.
`openspec validate filter-activity-by-change --strict` válido.

Los cinco casos nuevos de `pipeline-activity-scope.test.tsx` cubren el defecto exacto —la sesión más
reciente perteneciendo a otro cambio—, la corrida activa ajena, el cambio sin sesiones, la sesión sin
atribuir, y la pantalla de entrada mostrando todas.

## El otro defecto de UI, que no se pudo reproducir

El pendiente traía dos defectos. El del ancho de PROPUESTA / DISEÑO / SPECS / ARTEFACTOS —"el texto se
corta cerca del 60% del contenedor"— **no se pudo reproducir**, y por eso quedó fuera de este change
en vez de arreglarse a ciegas.

Lo comprobado: ni `.pipeline-markdown`, ni `.pipeline-markdown__paragraph`, ni `.pipeline-details__body`,
ni `.pipeline-details__panel` tienen regla de ancho en `app/globals.css` —las dos últimas no tienen
ninguna regla—. Se levantó el servidor de desarrollo y se midió el anidamiento real en el navegador,
con la hoja de estilos compilada de Tailwind: sobre un contenedor de 1200px, `.pipeline-details`,
`__body`, `__panel`, `.pipeline-markdown` y el párrafo miden **1168px todos**, con `max-width: none` en
cada nivel. La cascada no restringe nada.

También se descartó que el corte fuera del contenido: `readContainedFile` en
`electron/pipeline/repo-paths.ts:66` tiene un tope de 2 MB y devuelve `too-large` **sin contenido**, no
un texto parcial. No hay truncado silencioso.

Falta evidencia para seguir: una captura de la pestaña con el texto cortado, o el ancho de ventana y el
artefacto donde ocurre.
