## Why

Arrastrar el grafo cronométrico tironea. La causa está identificada y no es que el grafo sea pesado
de dibujar una vez: `useCanvasViewport` llama a `setViewport` **en cada evento de mousemove**, sin
coalescer por frame. Un mouse en Windows emite entre 125 y 1000 eventos por segundo; cada uno
dispara un `setState` que re-renderiza el consumidor —hoy `ChronometricGraph`, con 500 commits y 144
refs en este repositorio—. Se piden cientos de renders por segundo y el navegador puede pintar 60.

La rueda tiene el mismo defecto: `handleWheel` también llama a `setViewport` por evento.

El defecto lo encontró Ale usando la aplicación. No hay test que lo cubra, y por su naturaleza
—frecuencia de actualización, no resultado— tampoco lo habría encontrado la suite tal como está.

## What Changes

- `useCanvasViewport` coalesce las actualizaciones de viewport de alta frecuencia con
  `requestAnimationFrame`: los eventos se siguen procesando todos, pero se aplica como mucho un
  `setViewport` por frame.
- El cálculo sigue siendo síncrono y encadenado por evento. La rueda acumula zoom sobre el valor ya
  calculado y no sobre el que React todavía no pintó, así no se pierden pasos de zoom.
- Las actualizaciones puntuales —`resetViewport`, centrado, reencuadre por cambio de mundo— siguen
  siendo inmediatas, y cancelan cualquier frame pendiente para que un valor viejo no las pise.
- Al soltar el arrastre y al desmontar, el frame pendiente se resuelve o se cancela sin perder la
  última posición.

**No cambia la geometría del grafo**: ni posiciones, ni carriles, ni escalas, ni límites de
`constrainViewport`. Cambia cuándo se aplica el estado, no cuál es.

## Capabilities

### New Capabilities

- `graph-viewport-interaction`: comportamiento observable del encuadre del grafo ante arrastre,
  rueda y reencuadres puntuales — qué se conserva, con qué frecuencia se aplica y qué precedencia
  tiene una actualización puntual sobre una de alta frecuencia.

### Modified Capabilities

Ninguna.

## Impact

- `hooks/use-canvas-viewport.ts` — único archivo de producto afectado.
- `components/ChronometricGraph.tsx` — consumidor único del hook; **no se modifica**.
- `lib/canvas-viewport.ts` — funciones puras de cálculo; **no se modifican**.
- Cobertura nueva sobre el hook, que hoy no tiene tests propios (`lib/__tests__/canvas-viewport.test.ts`
  cubre sólo las funciones puras).
- Sin dependencias nuevas, sin cambios de i18n, sin superficie IPC.

Queda fuera, y se declara: la validación de que el arrastre **se siente** bien es de Ale. La
invariante 12 protege la geometría del grafo, que acá no se toca, pero el gesto sí cambia de
carácter y eso no lo demuestra ningún test.
