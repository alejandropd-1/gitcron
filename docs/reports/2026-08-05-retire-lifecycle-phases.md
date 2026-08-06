# Se jubila el modelo de fases

**Change:** `retire-lifecycle-phases` · **Fecha:** 2026-08-05 · **Tareas:** 17/18 (falta la validación visual de Ale)

## Qué se hizo

Se retiraron la barra `Explore → Propose → Apply → Validate → Archive` del encabezado y el contador
«Paso N de 5» de la guía. Con ellos se fueron `lifecycle()`, `LIFECYCLE_TOTAL`, el campo `step` del
tipo `PipelineNextAction` con sus once asignaciones, siete claves de i18n en tres lenguas y cincuenta
y tres líneas de CSS.

Es la segunda mitad del trabajo que `consume-openspec-graph` dejó abierto a propósito. Zai sumó el
grafo real del CLI sin tocar la barra, para decidir la jubilación con el grafo ya en pantalla y con la
observación de Ale. Ese momento llegó.

## Por qué era falso lo que decía

OpenSpec abandonó el modelo de fases: se puede trabajar sobre cualquier artefacto habilitado en
cualquier momento, y `AGENTS.md` lo repite —«las dependencias son habilitadoras, no barreras»—. Un
contador que declara «Paso 3 de 5» no es una imprecisión estética: enseña un orden obligatorio que no
existe, con la autoridad de la herramienta. Mientras convivió con el grafo, el panel daba dos
respuestas distintas a la misma pregunta y una era inventada.

## Nada quedó sin respuesta

La barra derivaba sus cinco etapas de tres señales propias. Cada una tiene hoy una fuente mejor:

- **Estado de cada artefacto** → el grafo de `openspec status --json`, en la pestaña Artefactos.
- **Validación** → la barra de evidencia inferior, que ya la declara con su propio estado.
- **Avance de tareas** → la lista lateral y la pantalla de entrada, con su desplegable de pendientes.
- **Qué conviene hacer ahora** → la guía del siguiente paso, que se conserva entera.

Ninguna de esas cuatro se creó acá. Retirar la secuencia quitó una afirmación falsa sin quitar
información.

## Decisiones

**Se retira, no se reemplaza.** El encabezado queda con la identidad y la intención del cambio, en una
sola columna, y su alto mínimo baja de `7.6rem` a `5.4rem`. Se descartó poner el grafo ahí: Zai ya lo
había descartado con fundamento —dos superficies de progreso en el mismo encabezado compiten y
obligan a explicar por qué no coinciden— y ese razonamiento no cambió porque la barra se fuera. Se
descartó inventar un indicador para llenar el espacio: el objetivo es que el panel afirme menos.

**`step` sale del tipo, no queda en `null`.** Dejarlo siempre nulo conservaba la forma de un modelo
que ya no se sostiene, lista para volver a llenarse en cuanto alguien quisiera «mostrar el progreso».
Sacarlo hace que reintroducirlo sea una decisión visible.

**El indicador de relectura se mudó, y con su visual.** Colgaba de la lista de etapas por estar ahí, no
porque le perteneciera. Pasó al encabezado del cambio, y el pulso que animaba las etapas se reescribió
sobre el título. Sin ese paso, el atributo habría quedado existiendo sólo para que un test pasara y la
espera habría sido invisible: exactamente la regresión silenciosa que ese test existe para impedir.

## Sobre la estimación que justificó posponerlo

El diseño de `consume-openspec-graph` calculó que jubilar las fases tocaba «los once `step.index` y
502 líneas de tests». La primera mitad era cierta. La segunda no: **ningún test asertaba sobre `step`**
—cero ocurrencias de la palabra en `pipeline-next-action.test.ts`, que tiene 502 líneas pero ninguna
sobre el contador—. Los cincuenta y tres casos de ese archivo pasaron sin editarse, que era la señal
de que el cambio era mecánico.

Posponerlo igual fue correcto por el otro motivo que Zai dio —decidir el rediseño con el grafo visible
en vez de sobre un mockup—, pero conviene registrar que el número asustaba más de lo que costaba.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **100 archivos / 727 tests, verde en dos corridas
seguidas**. Lint limpio. `openspec validate retire-lifecycle-phases --strict` válido.

**Un fallo intermedio que conviene registrar:** en una corrida falló
`pipeline-guided-wiring.test.tsx > muestra un estado de carga y no un panel con marco vacío mientras
discover no resolvió`. Pasó aislado y en las tres corridas completas siguientes. Es un flake nuevo,
**distinto del conocido**: no es uno de los cuatro archivos que crean repositorios Git reales, sino un
caso sensible al tiempo sobre un `discover` asíncrono. Queda anotado; no se investigó.

## Lo que queda

Con esto se cierra el pendiente más viejo del proyecto: Pipeline dejó de mostrar un modelo que
OpenSpec no usa. Lo que sigue abierto es la atribución de archivos de código a un cambio, con sus dos
caminos —observación por sesión o consumir la rama que `branch-on-change-creation` ya deja creada— y
el defecto de ancho de los paneles de artefactos, que sigue esperando evidencia reproducible.
