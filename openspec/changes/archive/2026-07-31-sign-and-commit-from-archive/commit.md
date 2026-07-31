# Commit del cambio

## Mensaje

feat(pipeline): firmar y confirmar en Git desde el archivado

El casillero que la convención reserva para la intervención humana quedaba
vacío en todos los changes archivados. Ahora el click de archivar marca la
tarea de firma —sólo esa— y confirma el trabajo en dos commits, con el
alcance y los mensajes a la vista antes de ejecutar. Nunca publica.

## Archivos

- electron/pipeline/change-commit-manifest.ts
- electron/ipc/pipeline-archive.ts
- electron/preload.ts
- types/electron.d.ts
- components/pipeline/OpenSpecDashboard.tsx
- components/pipeline/OpenSpecDashboard.module.css
- lib/i18n.ts
- AGENTS.md
- electron/__tests__/pipeline-commit-manifest.test.ts
- electron/__tests__/pipeline-archive-ipc.test.ts
- components/pipeline/__tests__/pipeline-change-archival.test.tsx
- docs/reports/2026-07-31-sign-and-commit-from-archive.md
