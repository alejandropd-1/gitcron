## Why

Mientras carga el modelo de IA, el panel muestra una barra indeterminada y un
contador de segundos. Ale pidió que esa espera se viva: «un cuadro donde el fondo
se va llenando animadamente como la barra de progreso; el texto pasaría de blanco
al principio y a medida que la barra avanza hace contraste con otro color». El
pedido venía atado a una premisa —que el servidor expone la fracción de carga por
WebSocket— que **resultó falsa, y ahora está probada por dos vías independientes**.
Eso cambia qué efecto es honesto: sin fracción, un llenado que avanza sería afirmar
un porcentaje que nadie sabe, y eso es el mismo defecto que el change corrige.

La premisa venía de la tarea 4.25 del change archivado `draft-commit-message-with-
local-ai`, que dice: «los diseños encontraron que el servidor expone la fracción por
WebSocket (0 → 0,376 → 1)». **Esa frase es falsa y se corrige acá para que el próximo
no rehaga la investigación.** Salió de un análisis de diseño que nunca se verificó
contra un servidor real. La fracción con esa forma que sí existe es
`prompt_processing.progress`, que pertenece a la **redacción** (procesar el prompt),
no a la **carga** del modelo. Se confundieron dos fases distintas.

La evidencia doble de que el progreso de carga no es accesible:

1. **Log de una carga real capturado por Ale.** Entre `load_model: loading model` y
   `llama_server: model loaded` hay **hitos discretos y ningún porcentaje**: arranca,
   carga el multimodal a los 16,5 s, y termina a los 16,7 s. Ninguna fracción.
2. **Prueba del WebSocket en este change.** Abiertos los canales `/llm`, `/system` y
   `/diagnostics` con handshake anónimo (passkey vacío, el mismo que usa
   `electron/ai/commit-message/device-index.ts`), durante 16,5 s de una carga real
   (`POST /api/v1/models/load`, `load_time_seconds: 16.465`) **no llegó ningún
   mensaje**: cero broadcasts. Es la misma pared que `diagnostics.streamLogs` en la
   tarea 4.26 del change archivado —un canal cerrado por el servidor, no por nosotros.

Sumado a lo anterior, el bloque de la barra y el texto va hoy en una sola línea
dentro de la fila de controles, y el texto hace wrap raro al angostar la ventana.
Ale lo marcó: pidió la barra arriba, en su propia línea, y el texto debajo.

## What Changes

- **(b) Reordenamiento del bloque de espera.** La barra va arriba, en su propia
  línea, y el texto debajo, en un contenedor que aguante el reangostado sin
  desarmarse. Aparecer no puede empujar el panel hacia abajo: el bloque vive en la
  misma fila de controles que hoy, que ya tiene su altura, y ese requerimiento se
  conserva.
- **(c) Efecto de barrido, no de llenado.** El cuadro que contiene al texto se
  pinta con un barrido que lo recorre; el texto hace contraste con el relleno donde
  el barrido ya pasó. Da el efecto pedido —movimiento, contraste, vida— **sin
  afirmar un porcentaje**, porque el servidor no lo provee. Respeta
  `prefers-reduced-motion` (el barrido se apaga sin perder la información) y la
  accesibilidad del `progressbar` (`aria-busy` mientras sea indeterminada).

Fuera de alcance:

- **Consumir la fracción de progreso de carga del servidor.** Queda fuera por la
  evidencia de arriba: no existe por WebSocket ni por SSE durante la carga. Si una
  futura versión de LM Studio la expusiera y sin credencial, éste es el change al
  que volver; mientras tanto, reintentarlo a ciegas es gastar una tanda. Mismo
  tratamiento que `diagnostics.streamLogs` (tarea 4.26 archivada).
- **Una barra para la fase de procesamiento del prompt (`prompt_processing.progress`).**
  Esa fracción es real y accesible, mide otra cosa (la lectura del prompt durante la
  redacción, no la carga) y cubre una espera que hoy sólo tiene contador —medido,
  ~56 s para 4.199 tokens a 75 tokens/s en la notebook de Ale. Es candidata a **su
  propio change**, no a éste: meterla acá haría que el indicador significara dos
  cosas distintas.

## Capabilities

### New Capabilities
<!-- Ninguna. El cambio vive dentro del flujo guiado del pipeline existente. -->

### Modified Capabilities
- `pipeline-guided-workflow`: se agregan requisitos sobre cómo se percibe la espera
  de carga del modelo —no salta el layout al aparecer, no afirma un porcentaje que
  el servidor no provee, y su accesibilidad declara el estado indeterminado. Hoy la
  barra indeterminada es detalle de implementación (tareas 4.24/4.25 archivadas) y
  no aparece en la spec; este change la sube a requisito con su fundamento.

## Impact

- `components/pipeline/AiElapsed.tsx`: cambia el layout (barra arriba, texto debajo)
  y el render del efecto de barrido sobre el texto.
- `components/pipeline/OpenSpecDashboard.module.css`: reglas de `.aiElapsed`,
  `.aiLoadTrack` y clases nuevas para el cuadro con barrido; `prefers-reduced-motion`.
- Tipos y testeos: pruebas del componente (hoy no existe test directo de
  `AiElapsed`) y, si toca, del panel.
- Sin dependencias nuevas: el efecto se hace con CSS, sin librería de animación.
- Sin tocar el stream de redacción (`commit-ai:chunk`, `lib/commit-draft-log.ts`,
  `chunk-pump.ts`): su contrato queda intacto.
- Registro: la propuesta deja asentado, con evidencia, que 4.25 es falso, para que
  no se reabra la investigación.
