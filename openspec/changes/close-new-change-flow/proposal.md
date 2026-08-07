## Why

Abrir el flujo de cambio nuevo es un viaje de ida. Desde la pantalla de inicio, "Tengo clara la tarea" y
"Quiero definirla mejor" despliegan el formulario, y no hay ningún control para cerrarlo.

El estado que lo muestra —`flowMode` en `components/pipeline/OpenSpecDashboard.tsx`— sólo vuelve a nulo
en tres casos: al elegir un cambio, al lanzar una tarea y al archivar. En la pantalla de inicio no hay
ninguno de los tres disponible, porque justamente es la pantalla donde todavía no se eligió nada. Quien
abre el formulario para ver de qué se trata se queda con él puesto.

No es un caso raro: las dos entradas están una al lado de la otra, y la propia guía invita a mirarlas
—"Entrá a uno de los cambios en curso, o empezá otro"—. Abrir para mirar es un uso previsto, y hoy no
tiene retorno.

## What Changes

- El flujo de cambio nuevo ofrece cerrarse sin empezar nada, en sus dos modos.
- La salida aparece arriba y a la derecha del formulario, no al final.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-guided-workflow`: el flujo de cambio nuevo se puede abandonar sin haber empezado nada.

## Impact

**Producción:** `components/pipeline/PipelineNewChangeFlow.tsx` (la salida), su hoja de estilos,
`components/pipeline/OpenSpecDashboard.tsx` (conectar el cierre en los dos montajes del flujo) y
`lib/i18n.ts` en los tres idiomas.

**Sin tocar:** lo que el flujo hace al empezar, la composición de la instrucción, el selector de modo
interno y el lanzador de runtime, que tiene su propio ciclo y no comparte este estado.

**Fuera de alcance:** que las dos entradas funcionen como interruptor —volver a pulsarlas para
cerrar—. La salida vive en el formulario porque es lo que hay que cerrar; atarla además a los botones
que lo abren duplicaría el control y dejaría dos formas de hacer lo mismo.

**Dependencias:** ninguna.

**Riesgo:** bajo. Es un control nuevo que limpia un estado local, sin efecto sobre el repositorio ni
sobre nada que se haya empezado: si ya se lanzó algo, cerrar el formulario no lo detiene, porque lo
lanzado vive en la sesión y no acá.
