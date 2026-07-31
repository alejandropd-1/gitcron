# Commit del cambio

## Mensaje

fix(git): serializar las operaciones de Git por repositorio

El watcher releía evidencia mientras la persona commiteaba o archivaba, y las
dos tocaban el índice: `Unable to create index.lock`. Una cola por repositorio
evita el solape; repositorios distintos siguen en paralelo.

## Archivos

- electron/git/repo-queue.ts
- electron/pipeline/repo-evidence-reader.ts
- electron/pipeline/pipeline-service.ts
- electron/ipc/pipeline-archive.ts
- electron/ipc/git-ops.ts
- electron/__tests__/git-repo-queue.test.ts
- docs/reports/2026-07-31-serialize-git-operations.md
