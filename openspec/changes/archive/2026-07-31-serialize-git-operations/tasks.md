# Tasks — serialize-git-operations

## 1. Cola por repositorio

- [x] 1.1 `withRepoLock` con cola por repositorio, normalizando rutas equivalentes
- [x] 1.2 Un fallo no traba la cola y el error se propaga al llamador
- [x] 1.3 Tests: no solapa, normaliza rutas, paraleliza repos distintos, tolera fallos

## 2. Aplicarla donde choca

- [x] 2.1 Lecturas de evidencia: branch y log de merges
- [x] 2.2 Identidad del repositorio en `pipeline-service`
- [x] 2.3 Archivado: estado, staging y commits
- [x] 2.4 Canales `git:command`, `git:stage` y `git:stage-batch`
- [x] 2.5 Declarar en el reporte qué canales quedan sin cubrir

## 3. Cierre

- [x] 3.1 `pnpm exec tsc --noEmit` en cero
- [x] 3.2 `pnpm test` en verde
- [x] 3.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 3.4 `openspec validate serialize-git-operations --strict` válido
- [x] 3.5 Reporte en `docs/reports/`
- [x] 3.6 Archivado confirmado por Ale desde la aplicación
