## Context

`consume-openspec-status` (archivado 2026-08-03) cableó `openspec status --json` hasta el renderer.
El dato llega: para el cambio seleccionado, `OpenSpecChangeSummary.status` contiene
`{ available, artifacts: [{ id, state: 'blocked'|'ready'|'done', missingDeps }], applyRequires,
isComplete }`, poblado por `statusOpenSpecChangeWithCli` (`electron/pipeline/openspec-cli.ts:155`)
y transportado sin transformación por el adapter. Nada lo lee.

El progreso se muestra hoy por dos vías independientes que no comparten estructura de datos:

1. La **barra de fases** `Explore → Propose → Apply → Validate → Archive`, renderizada en
   `OpenSpecDashboard.tsx:977-989` desde `lifecycle()` (`:122-133`). `lifecycle()` deriva `done`/
   `current` de `taskProgress` (tareas leídas de `tasks.md`) y `change.validation`, **no** del grafo.
2. El **contador «Paso N de 5»**, embebido en las once ramas de `derivePipelineNextAction`
   (`pipeline-next-action.ts:295-483`) vía `LIFECYCLE_TOTAL = 5` (`:19`). Se renderiza en
   `PipelineNextStepGuide.tsx:52-56`.

El grafo real de OpenSpec describe artefactos de **planificación** (`proposal`, `design`, `specs`,
`tasks`), cada uno con su estado y dependencias. Las fases `apply`/`validate`/`archive` son
**operacionales** y no son artefactos del grafo. Verificado sobre `make-agy-launchable`: los cuatro
artefactos en `done`, `applyRequires: ["tasks"]`, `isComplete: true`. El grafo y las fases coinciden
para un change completo y divergen en el camino: el grafo sabe qué artefacto bloquea a cuál, las fases
sólo cuentan la etapa.

Hay 502 líneas de tests en `pipeline-next-action.test.ts` y la spec `pipeline-guided-workflow`
referencia el ciclo de vida como dato existente («donde el ciclo de vida ya indica la etapa»,
requisito «Guía densa, contextual y traducida»), así que jubilarlo toca requisitos consolidados.

## Goals / Non-Goals

**Goals:**

- Que el grafo de artefactos que `openspec status --json` devuelve se consuma en el renderer para
  el cambio seleccionado.
- Que lo que el panel muestra como progreso sea lo que OpenSpec sabe, no una derivación propia.
- Que el cambio que sigue (jubilar o rediseñar el modelo de fases, si corresponde) pueda decidirse
  con evidencia de esta pasada.

**Non-Goals:**

- No se cablea nada nuevo: el dato ya llega por `consume-openspec-status`. Este change es de
  consumo, no de tubería.
- No se toca `statusOpenSpecChangeWithCli` ni el evidence reader.
- No se cambia qué cambio está seleccionado ni cómo se elige.
- No se tocan los tres runtimes parqueados.
- No se decide acá la forma visual final del rediseño si el alcance elegido la exige: eso queda para
  la validación visual de Ale sobre la implementación.

## Decisions

### Decisión 1: el alcance es **sumar el grafo como información nueva**, no reemplazar la barra

**Elegido:** agregar el grafo de artefactos como una superficie de progreso nueva que lee `status`
para el cambio seleccionado, **sin** jubilar la barra de fases ni el contador en esta pasada.

**Alternativa descartada — reemplazar la barra y el contador por el grafo.** Es la lectura más
ambiciosa y la que imaginaba el handoff. Se descarta por la evidencia: los artefactos del grafo son
cuatro (`proposal`/`design`/`specs`/`tasks`) y las fases son cinco; las tres últimas
(`apply`/`validate`/`archive`) no son artefactos, son estados operacionales derivados de `tasks.md`
y `openspec validate`. Reemplazar la barra por el grafo **no es una traducción**: exige rediseñar qué
significa progreso cuando la fuente cubre la mitad de la barra, y eso toca los once `step.index` de
`derivePipelineNextAction` y 502 líneas de tests. Es un cambio de行为 que merece su propia decisión
con el grafo ya visible, no meterlo de contrabando en éste.

**Alternativa descartada — mantener todo como está y no hacer nada.** Se descarta porque el dato ya
está cableado y costó un change entero: dejarlo sin consumir es desperdiciar la tubería y mantener el
panel mostrando un modelo que OpenSpec abandonó. «No rompe nada» es cierto, pero no es razón para no
avanzar.

**Por qué ésta es la primera mitad, no la última.** Sumar el grafo como información nueva deja la
jubilación del modelo de fases para un change que decida el rediseño **con el grafo ya en pantalla y
con la observación real de Ale**, en vez de decidir el rediseño sobre un mockup. Es el mismo patrón
que funcionó con `branch-on-change-creation`: Ale recortó «sólo el primero» cuando le ofrecieron la
versión completa.

### Decisión 2: la superficie nueva vive en la pestaña Artefactos, no en la barra de fases

**Elegido:** mostrar el grafo dentro de la pestaña **Artefactos** del cambio seleccionado. Cada
artefacto se muestra con su estado real (`done`/`ready`/`blocked`) y, cuando está `blocked`, la
lista de `missingDeps`. La barra de fases sigue donde está, sin cambios.

**Alternativa descartada — junto a la barra de fases, como una segunda fila.** Se descarta por la
invariante 11 y el requisito «Guía densa»: dos barras de progreso en el mismo encabezado compiten
entre sí y duplican la señal para un change completo, donde ambas dirían lo mismo. Además, la barra
de fases describe las cinco etapas y el grafo describe cuatro artefactos: ponerlos juntos obliga a
explicar por qué no coinciden, que es justo el texto explicativo que la invariante prohíbe.

**Alternativa descartada — reemplazar el contenido actual de la pestaña Artefactos.** La pestaña hoy
lista los archivos de artefactos leídos del change. Reemplazarlo perdería esa vista. Se suma el grafo
como información, no se saca lo existente.

**Por qué la pestaña Artefactos y no otra.** Es la superficie que ya trata sobre artefactos;
sumar ahí el grafo es declarar de qué estado es cada uno, que es la pregunta natural al mirarlos.
La barra de fases queda intacta porque jubilarla es la decisión que se pospone.

### Decisión 3: cuando el grafo no está, no se dibuja

**Elegido:** si `status` es `null` (cambio no seleccionado, o CLI que no pudo correr) la superficie
del grafo no se renderiza. No se inventa un estado, no se muestra un esqueleto.

**Alternativa descartada — mostrar un fallback derivado de `tasks.md`/`validation`.** Es justo lo que
hace `lifecycle()` hoy, y si el grafo no está se repetiría la derivación propia que este change busca
dejar de hacer. El grafo es un dato del CLI; si el CLI no lo dio, no se finge.

**Alternativa descartada — mostrar un estado de carga.** El grafo se relee en cada refresco del
watcher; un spinner permanente en la pestaña Artefactos sería ruido. Sin grafo, simplemente no hay
grafo: la lista de archivos de artefactos sigue alcanzando para saber qué existe.

## Risks / Trade-offs

- **[Dos superficies de progreso conviven]** → La barra de fases y el grafo van a coexistir esta
  pasada. Para un change completo dicen lo mismo; para uno en marcha pueden enfatizar distinto. La
  mitigación es que viven en lugares distintos (encabezado vs. pestaña Artefactos) y describen
  preguntas distintas (etapa operacional vs. estado de cada artefacto). La duplicación se elimina en
  el change que jubile las fases, decidido con el grafo ya visible.
- **[El grafo sólo llega para el cambio seleccionado]** → `statusOpenSpecChangeWithCli` corre sólo
  para el cambio seleccionado, por costo (se invoca en cada refresco del watcher). Mitigación: la
  superficie nueva vive en el detalle del cambio seleccionado, que es justo donde el dato existe. No
  se promete grafo para cambios no seleccionados.
- **[El CLI puede devolver `available: false`]** → Si `openspec status` no corre, el wrapper devuelve
  `{ available: false, artifacts: [], ... }` y no `null`. Mitigación: tratar `available: false` como
  ausencia (no renderizar el grafo), igual que `null`. No es un estado a mostrar como «todo
  bloqueado»: sería la derivación propia que se busca evitar.
- **[Riesgo no medido: la lectura del cambio seleccionado]** → El adapter copia `status` por spread
  desde la evidencia; si la selección cambia y el refresco todavía no llegó, el grafo puede ser del
  cambio anterior. Mitigación: el watcher refresca al cambiar la selección, y la pestaña Artefactos
  declara el cambio que muestra. No se introduce caché nuevo.

## Open Questions

- **Confirmación de Ale sobre el alcance.** Este design recomienda sumar el grafo como información
  nueva y posponer la jubilación del modelo de fases. Si Ale prefiere reemplazar la barra en este
  mismo change, el alcance crece a `derivePipelineNextAction` y sus tests, y se necesita un
  rediseño visual explícito.
- **Texto de `missingDeps`.** Cuando un artefacto está `blocked`, `missingDeps` trae ids de
  artefactos. Falta decidir si se muestran crudos (`["design"]`) o traducidos. Es una decisión de
  i18n menor, no bloquea el diseño.
