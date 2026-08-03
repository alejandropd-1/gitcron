## Context

`useCanvasViewport` mantiene el encuadre en un `useState` y lo sincroniza a un `viewportRef` por
`useEffect`, para que los listeners de DOM no lean un closure viejo.

Los dos caminos de alta frecuencia aplican estado por evento:

- `handleMouseMove` ([use-canvas-viewport.ts:243](../../../hooks/use-canvas-viewport.ts)) calcula el
  delta contra el offset capturado en `mousedown` y llama a `setViewport(constrained)`.
- `handleWheel` ([use-canvas-viewport.ts:288](../../../hooks/use-canvas-viewport.ts)) calcula
  `zoomAtPoint` sobre `viewportRef.current` y llama a `setViewport(constrained)`.

El único consumidor es `ChronometricGraph` ([línea 1895](../../../components/ChronometricGraph.tsx)),
que en este repositorio dibuja hasta 500 commits —tope de `--max-count=500` en `git:log`— y 144 refs.

## Goals / Non-Goals

**Goals:**

- Que el arrastre y la rueda apliquen a lo sumo un encuadre por cuadro.
- Que el zoom no pierda pasos al encadenar eventos dentro de un mismo cuadro.
- Que un reencuadre puntual no pueda ser pisado por un valor calculado antes que él.

**Non-Goals:**

- Tocar la geometría del grafo. La invariante 12 la protege y acá no se toca: `constrainViewport` y
  `zoomAtPoint` quedan intactas, y el conjunto de encuadres alcanzables no cambia.
- Modificar `ChronometricGraph`. Si su render sigue siendo caro, este change lo hace ocurrir 60 veces
  por segundo en vez de varios cientos, que es el defecto reportado. Abaratar el render en sí es otro
  trabajo y necesita su propia medición.
- Virtualizar el grafo o recortar lo que se dibuja.

## Decisions

**Coalescer con `requestAnimationFrame`, no con throttle por tiempo.** Un throttle de N milisegundos
elige un ritmo arbitrario que no coincide con el del compositor y produce jitter propio. `rAF` está
alineado con el cuadro que efectivamente se va a pintar, que es exactamente la frecuencia útil.

**El cálculo sigue siendo síncrono; sólo se difiere el `setState`.** Un `pendingViewportRef` guarda
el último valor calculado y un `rafRef` agenda un único cuadro que lo aplica. Los eventos siguientes
sobrescriben el pendiente sin agendar otro cuadro.

**`viewportRef` se adelanta al estado.** Se actualiza sincrónicamente al calcular, además del
`useEffect` que ya lo sincroniza. Sin esto, dos eventos de rueda en el mismo cuadro leerían ambos el
último valor *aplicado* y el segundo anularía al primero: la rueda perdería pasos. La escritura
adelantada es lo que permite encadenar.

La alternativa considerada era acumular un factor de zoom y aplicarlo una vez por cuadro. Se
descartó porque `zoomAtPoint` ancla en el punto del cursor, que se mueve entre eventos: componer los
anclajes a mano reimplementaría la función en vez de usarla.

**Las actualizaciones puntuales cancelan el cuadro pendiente.** `resetViewport`, el centrado y el
reencuadre por cambio de mundo aplican estado de inmediato y descartan lo pendiente. Sin eso, un
`rAF` agendado antes del reinicio se resolvería después y devolvería el encuadre al valor viejo —el
reinicio parecería no haber tenido efecto, de forma intermitente y dependiente del timing.

**El fin del arrastre resuelve el pendiente en vez de descartarlo.** Soltar el botón con un cuadro
sin aplicar debe dejar el encuadre donde el usuario lo soltó, no un cuadro atrás.

## Risks / Trade-offs

- **Un cuadro de latencia entre el evento y lo pintado.** → Es el mismo cuadro en el que el navegador
  iba a pintar de todos modos; no se agrega espera observable. A cambio desaparecen los renders que
  hoy se descartan.
- **La escritura adelantada de `viewportRef` convive con el `useEffect` que ya lo sincroniza.** → El
  effect escribe el mismo valor que el handler ya escribió, así que es idempotente. Queda anotado en
  el código para que nadie lo lea como una doble fuente de verdad.
- **El defecto que motiva el change no lo detecta ningún test.** → La cobertura nueva prueba el
  contrato de coalescencia con `requestAnimationFrame` controlado, que es lo verificable. Que el
  gesto *se sienta* bien lo valida Ale con la aplicación, y así queda declarado en las tareas.
