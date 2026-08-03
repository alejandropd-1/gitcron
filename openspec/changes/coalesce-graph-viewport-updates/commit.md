# Commit del cambio

## Mensaje

fix(graph): aplicar el encuadre una vez por cuadro en vez de por evento

Arrastrar y rular aplicaban estado por cada evento del mouse —hasta 1000 por
segundo— sobre un grafo de 500 commits y 144 refs. El navegador pinta 60: el
resto era trabajo descartado, y el gesto tironeaba.

El cálculo sigue siendo síncrono y encadenado, así la rueda no pierde pasos.
Los encuadres puntuales aplican de inmediato y descartan el cuadro pendiente,
para que un valor viejo no pise un reinicio.

## Archivos

- hooks/use-canvas-viewport.ts
- hooks/__tests__/use-canvas-viewport.test.ts
- docs/reports/2026-08-02-coalesce-graph-viewport-updates.md
