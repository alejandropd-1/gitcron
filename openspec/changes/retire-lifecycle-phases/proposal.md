## Why

El panel sigue declarando el progreso con un modelo que OpenSpec abandonó. `lifecycle()` en
`components/pipeline/OpenSpecDashboard.tsx` compone cinco etapas fijas —Explore, Propose, Apply,
Validate, Archive— y las renderiza como una lista ordenada con tildes y una etapa «actual»;
`derivePipelineNextAction` reparte once posiciones sobre un `LIFECYCLE_TOTAL = 5` que
`PipelineNextStepGuide` muestra como «Paso N de 5». Las dos cosas afirman lo mismo: que hay una
secuencia y que estás en un punto de ella.

OpenSpec dice lo contrario. Su propio material lo declara —acciones, no fases; se puede trabajar
sobre cualquier artefacto que esté `ready`— y `AGENTS.md` lo repite: «las dependencias son
habilitadoras, no barreras». Un contador que dice «Paso 3 de 5» no es una imprecisión estética: le
enseña a quien lo lee que hay un orden obligatorio que no existe.

`consume-openspec-graph` trajo el estado real de cada artefacto desde el CLI y lo dejó a la vista en
la pestaña Artefactos, pero dejó la barra y el contador en pie —a propósito, para decidir la
jubilación con el grafo ya en pantalla—. Ese momento llegó: Ale validó el grafo. Mantener las dos
superficies es sostener dos respuestas distintas a la misma pregunta, una de ellas falsa.

El diseño de aquel change estimó que jubilar las fases tocaba «los once `step.index` y 502 líneas de
tests». La primera mitad es cierta; la segunda no: **ningún test asierta sobre `step`** —cero
ocurrencias de la palabra en `components/pipeline/__tests__/pipeline-next-action.test.ts`—. El costo
que justificó posponerlo estaba sobreestimado.

## What Changes

Se retiran la barra de fases y el contador de pasos. `lifecycle()` desaparece con la lista ordenada
que alimentaba; `step` sale de `PipelineNextAction` y con él `LIFECYCLE_TOTAL` y las once posiciones;
`PipelineNextStepGuide` deja de renderizar «Paso N de 5». Los textos de las cinco etapas y del contador
se retiran de las tres lenguas, y los estilos de la barra dejan de existir.

Nada de lo que la barra afirmaba se pierde, porque todo estaba disponible en otro lado y con mejor
fundamento: el estado de cada artefacto está en el grafo del CLI, la validación en la barra de
evidencia inferior, el avance de tareas en la lista lateral y en la pantalla de entrada, y qué
conviene hacer ahora en la guía del siguiente paso —que se conserva entera, sin el contador—.

El indicador de relectura en curso, que hoy cuelga de la lista de etapas, pasa al encabezado del
cambio: es del encabezado, no de la barra, y la barra sólo lo alojaba por estar ahí.

Queda **fuera de alcance**: mover el grafo de artefactos al encabezado —Zai lo descartó con
fundamento, dos superficies de progreso en el mismo encabezado compiten entre sí—; cambiar qué
sesión muestra la columna de actividad; y la atribución de archivos de código a un cambio.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega el requisito de que el panel no declare el progreso como una
  secuencia de etapas fijas ni numere una posición dentro de ella.

## Impact

En `components/pipeline/OpenSpecDashboard.tsx` se retiran `lifecycle()`, la constante `stages` y la
lista ordenada del encabezado; el atributo de relectura se reubica. En
`components/pipeline/pipeline-next-action.ts` se retiran `LIFECYCLE_TOTAL`, el campo `step` del tipo y
sus once asignaciones. En `components/pipeline/PipelineNextStepGuide.tsx` se retira el render del
contador. En `lib/i18n.ts` se retiran `pipeline.next.step` y las seis claves de
`pipeline.openspec.lifecycle.*` en ES, EN y ZH, y sus entradas en `PIPELINE_KEYS`. En
`components/pipeline/OpenSpecDashboard.module.css` se retiran los estilos de la barra.

En pruebas, se verifica que el contador y la barra ya no se renderizan y que la guía conserva sus
acciones. El caso de `pipeline-workspace-revalidate.test.tsx` que comprueba el indicador de relectura
se conserva: el atributo sigue existiendo, en otro elemento.

No se agregan dependencias. No se toca el proceso principal.
