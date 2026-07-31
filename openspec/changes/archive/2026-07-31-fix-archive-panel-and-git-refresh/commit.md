# Commit del cambio

## Mensaje

fix(pipeline): reflejar los commits del archivado y arreglar el panel

Los commits que hace la aplicación no aparecían en su propio grafo, el panel de
confirmación dejaba sus botones fuera de pantalla en ventanas bajas, y la ficha
de un archivado se recortaba por arriba sin poder alcanzarlo con scroll.

## Archivos

- electron/ipc/pipeline-archive.ts
- electron/main.ts
- electron/preload.ts
- types/electron.d.ts
- hooks/use-repo-loader.ts
- components/pipeline/OpenSpecDashboard.module.css
- electron/__tests__/pipeline-archive-ipc.test.ts
- docs/reports/2026-07-31-fix-archive-panel-and-git-refresh.md
