# Commit del cambio

## Mensaje

fix(repo): observar el repositorio una sola vez, no una por consumidor

`useRepoLoader` montaba la observación —suscripciones, listeners e intervalo de
2 s— y se llama desde ocho lugares por sus funciones de refresco. La consola
declaraba once suscripciones a `repo:fs-change`: un cambio de archivo disparaba
once `git status` sin deduplicar, y el heartbeat corría once veces cada 2 s.

La observación pasa a un hook propio que la raíz monta una vez. Los disparadores
y el debounce quedan idénticos; cambia cuántas veces ocurren.

## Archivos

- hooks/use-repo-loader.ts
- app/page.tsx
- hooks/__tests__/use-repo-watch.test.ts
- docs/reports/2026-08-02-single-repo-watch-subscription.md
