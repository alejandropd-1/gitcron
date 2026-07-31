# Commit del cambio

## Mensaje

refactor(pipeline): usar la superficie de notificaciones de la aplicación

Pipeline anunciaba el archivado con una banda propia mientras el resto de la app
usa toasts. Se unifica, los toasts simples toman el ancho de su contenido y la
relectura se percibe en el ciclo de vida, donde ocurre.

## Archivos

- components/pipeline/OpenSpecDashboard.tsx
- components/pipeline/OpenSpecDashboard.module.css
- components/pipeline/PipelineWorkspace.tsx
- components/PageToasts.tsx
- lib/i18n.ts
- components/pipeline/__tests__/pipeline-change-archival.test.tsx
- components/pipeline/__tests__/pipeline-workspace-revalidate.test.tsx
- docs/reports/2026-07-31-unify-feedback-surfaces.md
