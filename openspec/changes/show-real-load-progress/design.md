## Context

`AiElapsed` (`components/pipeline/AiElapsed.tsx`) muestra hoy, durante la carga del
modelo, una barra indeterminada (`.aiLoadTrack`, 5rem × 3px, animada por `transform`)
y un contador de segundos, **en la misma línea** dentro de la fila de controles del
panel IA. Esa fila vive en `OpenSpecDashboard.tsx:1650` y su altura la dan los botones
y campos numéricos (~2.65rem); el bloque aparece en el hueco y por eso no empuja el
panel al apretar «Cargar» (tarea 4.55 archivada).

Dos problemas a resolver, y uno que se cierra:

- **(b)** Al angostar la ventana, barra y texto compiten por el ancho y el texto
  hace un wrap que se lee roto. Ale pidió la barra arriba, en su propia línea, y el
  texto debajo.
- **(c)** Ale quiere que la espera se vea viva: un cuadro cuyo fondo se barre y un
  texto que cambia de color donde pasa el barrido —movimiento y contraste.
- **(a) cerrado:** la premisa «el servidor expone la fracción de carga por WebSocket»
  es falsa. Probado por dos vías (ver `proposal.md`): el log de una carga real no
  tiene porcentaje, y el WS en escucha no emitió nada en 16,5 s. Sin fracción, un
  llenado que avanza sería mentir.

Restricciones heredadas que se conservan: `prefers-reduced-motion` ya apaga la
animación de `.aiLoadTrack` sin perder el dato, y el elemento declara
`role="progressbar" aria-busy="true"`. El stream de redacción (`commit-ai:chunk`,
`lib/commit-draft-log.ts`, `chunk-pump.ts`) no se toca.

## Goals / Non-Goals

**Goals:**

- Un cuadro que fusiona barra y contador: arriba, en su propia línea, con un barrido
  continuo y un texto que cambia de color donde pasa. Movimiento y contraste **sin
  afirmar un porcentaje**.
- Aguanta el reangostado sin wrap roto.
- Aparecer no empuja el panel.
- `prefers-reduced-motion` apaga la animación y conserva el estado.
- Accesibilidad: `role="progressbar"` + `aria-busy="true"`, **sin** `aria-valuenow`
  (indeterminado).

**Non-Goals:**

- Consumir una fracción de progreso de carga (no existe; `proposal.md` lo deja
  fuera con evidencia).
- Una barra para `prompt_processing.progress` (es otra fase; candidate a su change).
- Tocar el stream de redacción o el resto del panel IA.

## Decisions

### 1. (b) y (c) se fusionan en un solo cuadro; la barra indeterminada separada se retira

El pedido (b) «barra arriba, en su propia línea, texto debajo» y el pedido (c) «texto
dentro de un cuadro cuyo fondo se barre» describen, en el plan B, **el mismo
elemento**: un cuadro arriba en su propia línea que contiene al texto del contador y
lleva el barrido. La barra indeterminada de `.aiLoadTrack` se retira: su rol lo cumple
el cuadro. Mantener barra-separada + cuadro-con-texto sería duplicar feedback y
sumar una segunda animación sobre la misma espera.

El contador de segundos queda **dentro** del cuadro durante la carga. En `drafting`
(redacción), el contador se muestra plano, sin cuadro ni barrido, como hoy: el efecto
es de la carga, no de la redacción, que ya tiene su feedback en el rail.

Alternativa considerada y rechazada: conservar `.aiLoadTrack` arriba y poner un
cuadro-con-texto debajo. Dos indicadores para una espera confunde más de lo que
Informa.

### 2. Efecto: `background-clip: text` con gradiente lineal animado en bucle

El texto del contador se pinta con un `background` gradiente cuyo `background-position`
se anima: una banda estrecha de color de contraste cruza el texto de lado a lado, y
donde pasa las letras cambian de color. El cuadro que lo contiene lleva un barrido
sutil de fondo sincronizado (una franja translúcida que lo recorre), para que el
movimiento se lea en el contenedor y no sólo en las letras.

Alternativas consideradas:

- **Dos capas de texto duplicado, una recortada con `clip-path` que crece.** Rechazada:
  crecimiento afirmaría avance (llenado), además de duplicar el texto y sincronizar a
  mano.
- **`mix-blend-mode` con una franja sobre el texto.** Rechazada: el resultado depende
  del fondo y se comportaría distinto en tema claro y oscuro; difícil de garantizar.
- **Medir anchos por JS y mover máscaras.** Innecesario: la animación es decorativa,
  no informa progreso.

`background-clip: text` (con `-webkit-background-clip: text` y
`-webkit-text-fill-color: transparent`) está soportado de forma amplia en Chromium —
Electron 42 empaqueta el suyo, así que no hace falta respaldo. Es CSS puro, sin
librería, y se parametriza con variables de color del proyecto.

### 3. Barrido en bucle, no llenado 0 → 100 %

El gradiente se anima en `infinite`, no de 0 a 100 % y frenando. Un llenado que llega
al tope diría «ya casi», y como no hay fracción eso es inventar. El barrido continuo
da movimiento **sin** afirmar progreso: es la degradación honesta, y coincide con la
regla que ya rige la barra de hoy. La duración del bucle se elige (~2,4 s) para que
se lea como vida sin parecer un ticker nervioso; **no se midió un óptimo**, se declara
como elección.

### 4. Degradación `prefers-reduced-motion`

Con movimiento reducido, se apaga la animación de `background-position` y el barrido
del fondo del cuadro; el texto queda en color base sólido y legible, y el cuadro
conserva su borde. El estado «cargando» sigue declarado por `aria-busy="true"` y por
el propio contador. No se pierde información —es el mismo criterio que hoy aplica
`.aiLoadTrack`.

### 5. No saltar al aparecer

El bloque `AiElapsed` se queda en la fila de controles con `flex: 1 1 0`,
`min-width: 0` y la altura que ya tiene la fila. El cuadro (con el contador dentro)
se centra verticalmente en ese espacio. Como la altura la sigue dando la fila y no el
contenido, aparecer el bloque en `loading` no empuja el panel. En `idle` sigue
retornando `null` (no ocupa lugar). La restricción de la tarea 4.55 archivada se
conserva sin cambios.

### 6. Accesibilidad

El cuadro declara `role="progressbar"` y `aria-busy="true"`, con un `aria-label`
explicativo. **No** lleva `aria-valuenow`/`valuemin`/`valuemax` mientras sea
indeterminado: una fracción colgada miente a un lector de pantalla tanto como una
barra que la dibuja. En `drafting` (contador plano, sin barra) no hay `progressbar`:
es texto informativo, nada más.

## Risks / Trade-offs

- **`background-clip: text` y legibilidad del color de contraste en tema claro.** El
  cyan sobre fondo claro puede tener poco contraste. → El cuadro lleva su propio fondo
  (`--os-bg-deep`, más profundo que el panel, como ya usa `.aiFacts`) para que el color
  de contraste funcione en ambos temas; se prueba en claro y oscuro antes de cerrar.
- **El barrido continuo puede cansar en cargas largas (≈30 s).** → Duración del bucle
  moderada (~2,4 s) y amplitud de la banda acotada; con `prefers-reduced-motion` se
  apaga. No se midió fatiga: es elección razonable, declarada.
- **Interpretación de (b)+(c) fusionados.** Ale pidió dos cosas que acá se leen como
  una. → Queda documentado en este design y se expone en el reporte; si la lectura no
  fuera la buscada, el cambio se ajusta sin tocar nada del planteo mayor.
- **El contador dentro del cuadro reduce el ancho útil.** → El texto es corto
  («Cargando el modelo · 12 s»); con `min-width: 0` y `text-overflow: ellipsis` al
  angostar se truncia limpio antes que romperse.

## Migration Plan

No hay migración de datos: es un cambio de UI localizado a `AiElapsed.tsx`, su CSS y
un test nuevo. Rollback = revertir esos archivos. Sin tocar contratos del stream ni
IPC.

## Open Questions

Ninguna abierta. La técnica está decidida; lo que no se midió (duración del barrido,
contraste exacto por tema) se declara como elección y se ajusta en la implementación
viendo claro y oscuro.
