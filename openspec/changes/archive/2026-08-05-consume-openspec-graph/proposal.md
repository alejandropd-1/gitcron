## Why

`consume-openspec-status` cableó el grafo de artefactos de `openspec status --json` hasta el
renderer y nada lo lee. El campo `status` vive en `OpenSpecChangeSummary`
(`components/pipeline/pipeline-view-state.ts:36`) y una búsqueda exhaustiva en `components/`
confirma cero lectores: el dato atraviesa CLI → evidence reader → adapter → snapshot y termina
sin consumirse. Mientras tanto el panel sigue derivando el progreso de un modelo de cinco fases
inventado —`LIFECYCLE_TOTAL = 5` en `pipeline-next-action.ts:19` y `lifecycle()` en
`OpenSpecDashboard.tsx:122-133`— que es justo el modelo lineal que OpenSpec abandonó por un grafo
de dependencias `blocked`/`ready`/`done`. El `design.md` de aquel change dejó escrito que
consumirlo era «el change siguiente»; éste lo es.

## What Changes

El grafo real pasa a verse. La superficie que hoy muestra progreso —la barra de fases y/o el
contador «Paso N de 5»— pasa a leer el grafo de artefactos que el CLI devuelve, de modo que lo
presentado sea lo que OpenSpec sabe y no una derivación propia. El alcance visual exacto (reemplazar
la barra, sumar el grafo como superficie nueva, o una combinación) se decide en `design.md` sobre
los tradeoffs concretos, no acá.

Queda **fuera de alcance**: cambiar qué cambio está seleccionado, mover el lanzador de runtime, y
cualquier rediseño del panel que no sea la superficie de progreso. Los tres runtimes parqueados
(`make-agy-launchable`, `add-opencode-runtime`, `add-lmstudio-agent-runtime`) no se tocan.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: el progreso que muestra el panel pasa a leerse del grafo de artefactos
  que `openspec status --json` devuelve para el cambio seleccionado, en vez de derivarse de un
  modelo de fases propio. El requisito existente de que la guía sea densa y no invente texto
  explicativo se conserva.

## Impact

El cambio vive en el renderer. Toca `OpenSpecDashboard.tsx` (la función `lifecycle()` y el render
de la barra en `:977-989`) y, según el alcance que cierre `design.md`, `pipeline-next-action.ts`
(el `LIFECYCLE_TOTAL` y los `step.index` embebidos en las once ramas de `derivePipelineNextAction`)
y `PipelineNextStepGuide.tsx` (el contador «Paso N de 5»). El dato ya llega: `status` está poblado
por `statusOpenSpecChangeWithCli` (`electron/pipeline/openspec-cli.ts:155`) sólo para el cambio
seleccionado y transportado sin transformación por el adapter. El cambio es de consumo, no de
cableado. No agrega dependencias ni toca el proceso principal. Necesita validación visual de Ale.
