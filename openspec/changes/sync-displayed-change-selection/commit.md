# Commit del cambio

## Mensaje

fix(pipeline): leer la evidencia del cambio que la vista muestra

Cuando la rama no identifica ningún change activo el backend no selecciona
ninguno, y la vista igual mostraba uno sin informarlo: se leía la evidencia de
ningún cambio y el mostrado quedaba sin validar ni artefactos.

## Archivos

- components/pipeline/pipeline-adapter.ts
- components/pipeline/OpenSpecDashboard.tsx
- components/pipeline/__tests__/pipeline-adapter.test.ts
- components/pipeline/__tests__/pipeline-selection-sync.test.tsx
- docs/reports/2026-07-31-sync-displayed-change-selection.md
