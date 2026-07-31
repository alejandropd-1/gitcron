# Reporte — serialize-git-operations

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `serialize-git-operations`

## Qué problema resolvía

`fatal: Unable to create '.git/index.lock': File exists`, repetido. Git protege su índice con ese
lock; dos procesos concurrentes hacen fallar al segundo, y uno cortado a la mitad deja el archivo
huérfano bloqueando todo lo que siga.

La aplicación no serializaba nada. Con Pipeline abierto, el watcher dispara relecturas —`status`,
`branchLocal`, `log`— que caen encima de un commit o un archivado; `git status` también toca el
índice. El propio código ya conocía el problema: `git:stage-batch` existe para evitar N `git add`
en paralelo, con un comentario que lo dice. Faltaba generalizar ese cuidado.

Y el archivado con commits, agregado horas antes en `sign-and-commit-from-archive`, sumó contención
nueva. Parte de esto lo introduje yo.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `electron/git/repo-queue.ts` | Nuevo. `withRepoLock`: cola por repositorio, con rutas normalizadas. |
| `electron/pipeline/repo-evidence-reader.ts` | Branch y log de merges por la cola. |
| `electron/pipeline/pipeline-service.ts` | `rev-parse --git-common-dir` por la cola. |
| `electron/ipc/pipeline-archive.ts` | Estado, staging y commits del archivado por la cola. |
| `electron/ipc/git-ops.ts` | `git:command`, `git:stage` y `git:stage-batch` por la cola. |
| `electron/__tests__/git-repo-queue.test.ts` | Nuevo. 5 casos. |

**Decisiones:** se serializa **por repositorio**, no globalmente — dos repos tienen índices
distintos y no tienen por qué esperarse. Y un fallo **no traba la cola**: la siguiente operación
arranca igual y el error se propaga a quien lo pidió, porque una cola trabada congelaría todas las
operaciones de ese repositorio. Ambas cosas tienen test.

## Cobertura parcial, declarada

**No se aplicó a todos los canales de `git-ops.ts`**, que tiene decenas. Se cubrieron los que hoy
chocan: las lecturas de Pipeline, el archivado, y los canales de comando y staging. El resto —pull,
push, merge, rebase, stash, worktrees— sigue sin cola.

Esto **reduce** las colisiones, no las elimina. Envolver el módulo entero es mecánico pero con
superficie de regresión grande, y conviene hacerlo con su propia tanda y su propio QA. Queda
anotado como follow-up en vez de declararlo resuelto.

El botón "Eliminar lock" sigue haciendo falta: un lock huérfano de un Git externo a la aplicación
—una terminal, otro cliente— no lo previene ninguna cola interna.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** |
| `pnpm test` | **608 passed / 84 archivos**, 0 failed |
| `pnpm exec eslint` sobre los archivos tocados | **limpio** |
| `openspec validate serialize-git-operations --strict` | **válido** |
