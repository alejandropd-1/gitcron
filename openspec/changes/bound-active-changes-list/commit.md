# Commit del cambio

## Mensaje

fix(pipeline): acotar la lista de cambios activos y desacoplar el desplegado

La lista crecía sin tope y dejaba cambios fuera de vista sin señal. Además el
seleccionado se desplegaba solo, así que al cambiar de selección aparecía otro
que estaba oculto.

## Archivos

- components/pipeline/OpenSpecDashboard.tsx
- components/pipeline/OpenSpecDashboard.module.css
- components/pipeline/__tests__/pipeline-selection-sync.test.tsx
- docs/reports/2026-07-31-bound-active-changes-list.md
