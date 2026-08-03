# Commit del cambio

## Mensaje

perf(graph): aislar la capa de nodos del encuadre

Cada render del grafo costaba 50-70 ms con 500 commits, contra un presupuesto
de 16,6 ms por cuadro: mover el encuadre reconstruía cientos de elementos SVG
para terminar cambiando una cadena de texto.

La capa de nodos pasa a un componente memoizado que no recibe el encuadre. Las
manijas que recibe se estabilizan con `useLatestCallback`, porque una función
recreada por render anularía la memoización sin dar ninguna señal.

La geometría no cambia: el marcado se movió sin reordenarlo.

## Archivos

- components/ChronometricGraph.tsx
- components/graph/CommitNodesLayer.tsx
- components/graph/__tests__/CommitNodesLayer.test.tsx
- hooks/use-latest-callback.ts
- hooks/__tests__/use-latest-callback.test.ts
- docs/reports/2026-08-02-memoize-graph-commit-nodes.md
