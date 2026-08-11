# show-real-load-progress — progreso real en la barra de carga del modelo

Tanda del 2026-08-11. Rama `change/show-real-load-progress`, abierta desde `main`
limpio. Cierre: `tsc` en 0, **134 archivos / 1040 pruebas** en verde,
`eslint` limpio sobre lo tocado, `openspec validate --strict` válido.

## Resumen en una frase

La premisa del cambio —«el servidor expone la fracción de carga por WebSocket»— es
**falsa, y queda probada por dos vías independientes**. Por eso el indicador de carga
pasa a ser un **cuadro con barrido** (movimiento y contraste, sin afirmar porcentaje),
no un llenado. Lo que sí existe, `prompt_processing.progress`, es de **otra fase** y
queda registrado como candidato a su propio change.

## 1. Qué se cambió, archivo por archivo

- **`components/pipeline/AiElapsed.tsx`** (reescrito, ~73 → ~103 líneas). En
  `phase === 'loading'` se reemplazó la barra indeterminada (`.aiLoadTrack`) +
  contador en fila por un **cuadro** (`.aiLoadBox`, propia línea, arriba del bloque)
  que **contiene** al contador y declara `role="progressbar"` + `aria-busy="true"`,
  **sin** `aria-valuenow`/`valuemin`/`valuemax` (indeterminado a propósito). En
  `phase === 'drafting'` el contador sigue plano, sin cuadro ni barra: el feedback
  vivo de la redacción vive en el rail y no se tocó. El wrapper `.aiElapsed` se
  conserva con el mismo `flex: 1 1 0`, `min-width: 0` y `min-height: 2.65rem`, de modo
  que aparecer no empuja el panel (tarea 4.55 archivada, respetada).
- **`components/pipeline/OpenSpecDashboard.module.css`** (líneas ~938–1009). Se retiró
  `.aiLoadTrack`, `.aiLoadTrack > span`, `@keyframes aiLoadSlide` y su media de
  movimiento reducido, y su comentario. Se agregó: `.aiLoadBox` (fondo
  `--os-bg-deep`, borde `--os-border`, `border-radius`, `overflow: hidden`), su
  `::before` (franja de barrido del fondo, por `transform` para quedar en el
  compositor), `.aiLoadBoxText` (texto con `background-clip: text` + gradiente
  animado en bucle, `text-overflow: ellipsis` para angostar limpio), `@keyframes
  aiSweepText` / `aiSweepBox`, y `@media (prefers-reduced-motion: reduce)` que apaga
  ambas animaciones y deja el contador en color base sólido legible.
- **`components/pipeline/__tests__/AiElapsed.test.tsx`** (nuevo). Cubre: en `idle` no
  renderiza nada; en `loading` hay `role="progressbar"` con `aria-busy="true"` y
  **sin** `aria-valuenow`; en `drafting` hay contador **sin** `progressbar`. No
  existedía prueba directa de este componente.

No se tocó `electron/`, ni el stream de redacción (`commit-ai:chunk`,
`lib/commit-draft-log.ts`, `chunk-pump.ts`), ni otros changes.

## 2. Corrección del registro (lo más importante de la tanda)

La tarea **4.25** del change archivado `draft-commit-message-with-local-ai` dice:

> los diseños encontraron que el servidor expone la fracción por WebSocket
> (0 → 0,376 → 1)

**Eso es falso y ahora está probado por dos vías independientes:**

1. **Log de una carga real capturado por Ale.** Entre `load_model: loading model` y
   `llama_server: model loaded` hay **hitos discretos y ningún porcentaje**: arranca,
   carga el multimodal a los 16,5 s, termina a los 16,7 s.
2. **Prueba del WebSocket en esta tanda.** Abiertos `/llm`, `/system` y `/diagnostics`
   con handshake anónimo (passkey vacío, el mismo que usa
   `electron/ai/commit-message/device-index.ts`), durante 16,5 s de una carga real
   (`POST /api/v1/models/load`, `load_time_seconds: 16.465`) **no llegó ningún
   mensaje**: cero broadcasts. Es la misma pared que `diagnostics.streamLogs` en la
   tarea 4.26 archivada —un canal cerrado por el servidor, no por nosotros.

La fracción con esa forma que **sí** existe es `prompt_processing.progress`, pero
pertenece a la **redacción** (procesar el prompt), no a la **carga**. Se confundieron
dos fases. El 4.25 está archivado y es de sólo lectura; la corrección vive en la
`proposal.md` y en este reporte, para que el próximo no rehaga la investigación.

## 3. Lo que sí existe: `prompt_processing.progress` (candidato a OTRO change)

Durante la verificación se encontró, en el stream SSE **nativo** de `POST /api/v1/chat`
(con `input` como string y `stream: true`), esta secuencia para un modelo
**descargado** (carga lazy dentro del chat):

```
event: chat.start
event: prompt_processing.start
event: prompt_processing.progress  data: {"type":"prompt_processing.progress","progress":0}
event: prompt_processing.progress  data: {"progress":0.2727272727272727}
event: prompt_processing.progress  data: {"progress":0.8181818181818182}
event: prompt_processing.progress  data: {"progress":1}
event: prompt_processing.end
event: reasoning.start / reasoning.delta… / reasoning.end
event: message.start / message.delta… / message.end
event: chat.end
```

- `prompt_processing.progress` es un **float entre 0 y 1**, accesible **sin
  credencial**, y cubre una fase que **hoy no tiene barra**: la lectura del prompt
  durante la redacción. Medido en la notebook de Ale, un prompt de 4.199 tokens se
  procesa a 75 tokens/s, o sea **~56 s** en los que sólo se ve un contador subiendo.
- **No entra en este change** (mediría otra cosa; mezclarlo haría que el indicador
  significara dos cosas). Se registra acá como candidato a su propio change.
- `model_load.*` **no apareció por ningún canal** (WebSocket, ni `/v1/chat/completions`
  OpenAI, ni `/api/v1/chat` nativo), ni siquiera con el modelo confirmadamente
  descargado. En la versión de LM Studio de Ale, hoy, no se emite.

## 4. Qué ve la persona cuando no hay fracción

Como **nunca** hay fracción de carga accesible, la persona ve **siempre** el cuadro con
barrido: el barrido es la degradación permanente y honesta, no un fallback que se
activa sólo a veces. Si el servidor no contesta o el modelo no carga, el panel ya lo
declara con su motivo por el camino existente (no tocado). Comprobado, no deducido: la
prueba del WebSocket sin broadcasts es la verificación de que no hay nada que consumir.

## 5. Salida real de los comandos de cierre

- `pnpm exec tsc --noEmit` → **0** (sin errores).
- `pnpm exec vitest run --maxWorkers=2` → **134 archivos / 1040 pruebas, todas en
  verde**. Base 133 / 1037; **delta +1 archivo (`AiElapsed.test.tsx`), +3 pruebas**.
  Sin flakes en esta corrida.
- `pnpm exec eslint components/pipeline/AiElapsed.tsx
  components/pipeline/__tests__/AiElapsed.test.tsx` → **0** (limpio).
- `npx openspec validate show-real-load-progress --strict` →
  **`Change 'show-real-load-progress' is valid`**.

## 6. Decisiones y por qué

- **Barrido, no llenado.** Un llenado que avanza diría «vas por acá», y como no hay
  fracción eso es mentir. El barrido es un bucle infinito: movimiento y contraste sin
  afirmar progreso. Es la misma regla que ya regía la barra indeterminada de hoy.
- **`background-clip: text` con gradiente animado.** Elegida sobre (a) dos capas de
  texto duplicado recortadas con `clip-path` —más DOM y sincronización a mano—, (b)
  `mix-blend-mode` con una franja —comportamiento impredecible entre tema claro y
  oscuro—, (c) medir anchos por JS —innecesario, la animación es decorativa. Soportado
  de forma amplia en Chromium (Electron 42 empaqueta el suyo): sin respaldo, sin
  librería.
- **(b) y (c) fusionados en un solo cuadro.** El pedido «barra arriba, texto debajo»
  (b) y «texto dentro de un cuadro cuyo fondo se barre» (c) describen el mismo elemento
  en el plan B: un cuadro arriba que contiene al contador y lleva el barrido. La barra
  indeterminada separada se retiró. Si la lectura no fuera la buscada, se ajusta sin
  tocar el planteo mayor.
- **Degradación `prefers-reduced-motion`.** Se apagan el gradiente y la franja; el
  contador queda en color base sólido; `aria-busy` y el estado accesible se conservan.
  Es el mismo criterio que ya aplicaba `.aiLoadTrack`.

## 7. Qué NO se hizo y qué quedó pendiente

- **(a) consumir la fracción de carga del servidor**: fuera del change, con la doble
  evidencia en `proposal.md`.
- **Barra para `prompt_processing.progress`**: fuera (otra fase); registrado como
  candidato.
- **3.1 y 4.1 de `tasks.md` (verificación visual de «no saltar al aparecer» y de
  contraste en tema claro/oscuro)**: **pendientes**. Requieren la app en GUI
  (Electron); esta sesión no tiene display. El cambio preserva por construcción el
  posicionamiento de `.aiElapsed` (mismo sitio en la fila, misma `min-height`), así
  que la falta de salto se mantiene; pero la confirmación visual la hace Ale con
  `pnpm run electron:dev`.

## 8. Hallazgos de paso (no tocados)

- **`para borrar.txt`** sin trackear en la raíz del repo. **No es parte de este change
  y no se creó ni se modificó acá**: apareció en el working tree ajeno a la tanda. Se
  reporta y no se toca; lo decide Ale.
- En `POST /api/v1/chat` (nativo) el campo `config` no es válido y `max_tokens` va
  fuera; `input` es un string o un array de partes `{type,text}` (no mensajes OpenAI).
  Irrelevante para el change, sólo nota de la verificación.
- `pipeline-workspace-revalidate.test.tsx` afirma sobre `role="progressbar"` pero es
  de `PipelineWorkspace` (revalidación), no de `AiElapsed`. Confirmado que mi cambio no
  lo afecta.

## 9. Archivos sin confirmar (lista exacta)

Cambios de este change:

1. `components/pipeline/AiElapsed.tsx` (modificado)
2. `components/pipeline/OpenSpecDashboard.module.css` (modificado)
3. `components/pipeline/__tests__/AiElapsed.test.tsx` (nuevo)
4. `openspec/changes/show-real-load-progress/.openspec.yaml` (nuevo)
5. `openspec/changes/show-real-load-progress/proposal.md` (nuevo)
6. `openspec/changes/show-real-load-progress/design.md` (nuevo)
7. `openspec/changes/show-real-load-progress/tasks.md` (nuevo)
8. `openspec/changes/show-real-load-progress/specs/pipeline-guided-workflow/spec.md`
   (nuevo)
9. `docs/reports/2026-08-11-show-real-load-progress.md` (nuevo — este reporte)

**No se confirma nada**: `git add`/commit es de Ale. `para borrar.txt` **no** se
incluye —no es de este change.
