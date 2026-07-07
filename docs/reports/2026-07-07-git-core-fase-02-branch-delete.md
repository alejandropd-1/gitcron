# Git-core Fase 02 — Borrado de branches (local / remota / ambas)

Branch: `git-core/fase-02-branch-delete` (desde `main`, con Fase 01 mergeada). Sin merge, sin tag.

## Objetivo

Menú contextual (click derecho) sobre una branch del sidebar que ofrece borrar la
**local**, la **remota** o **ambas**, con `DangerConfirmDialog` que distingue mergeada
(seguro, `-d`) de no-mergeada (consciente, `-D`, avisando los commits que se pierden).
El borrado local ya existía en backend; esta fase suma el remoto y toda la UX.

Feature **destructiva**: todo borrado pasa SIEMPRE por `DangerConfirmDialog`. La branch
activa no se puede borrar (opciones deshabilitadas). El borrado remoto reutiliza las
credenciales del push existente (`withGitHubToken`), sin manejo de auth nuevo en el renderer.

## Cambios

### Tanda 1 — Backend

- **`git:delete-remote-branch(targetPath, remote, branch, token?)`** — handler NUEVO en
  `electron/ipc/git-sync.ts` (no en git-ops.ts). Ejecuta `git push <remote> --delete <branch>`
  vía `withGitHubToken`, con la MISMA detección de auth/errores que `git:push-branch`.
  - **Desviación deliberada del prompt** (que pedía git-ops.ts): git-ops.ts declara en su
    header *"Ninguna de estas operaciones toca la red (eso vive en git-sync.ts)"*, y el helper
    de credenciales `withGitHubToken` vive en el mundo de git-sync. Poner un push autenticado en
    git-ops.ts rompería ese contrato. Se avisó y aprobó en el checkpoint de la Tanda 1. Se
    agregó el param `token?` (el prompt lo omitía) porque es imprescindible para reutilizar el
    push.
- **`git:is-branch-merged(targetPath, branch, base?)`** — handler NUEVO en `git-ops.ts`,
  read-only (sin red). Resuelve la branch por defecto (`origin/HEAD` → `main`/`master` →
  actual) y responde `{ merged, base }`. Decide `-d` vs `-D` y el texto del diálogo.
- **`electron/ipc/branch-merge.ts`** — parser puro `parseMergedBranches` / `isBranchMerged`
  de la salida de `git branch --merged <base>` (tolera `* ` actual, `+ ` worktree, HEAD
  detachado). Sin git ni red → fixtures.
- **El borrado local (`git:delete-branch`) NO se tocó** — se reutiliza tal cual, con su
  lógica de `imagined/` y su detección de `notMerged`.
- Expuestos en `preload.ts` + `types/electron.d.ts`.

### Cómo se decide `-d` vs `-D`

1. **Proactivo**: al abrir el menú de borrado local/ambas se consulta `git:is-branch-merged`.
   Si NO está mergeada → el diálogo muestra el `warning` de commits a perder y el botón
   "Forzar eliminación" → `deleteBranch(force=true)` (`-D`). Si está mergeada → diálogo normal
   → `deleteBranch(force=false)` (`-d`).
2. **Reactivo (red de seguridad)**: si el chequeo proactivo dijo "mergeada" pero `git -d`
   igual falla con *not fully merged* (p. ej. no mergeada a su upstream), el diálogo se
   re-abre escalado a `-D` con el warning. Doble garantía; si el chequeo falla, se asume
   mergeada (no fuerza) y el reactivo cubre.

### Tanda 2 — Menú contextual

- **`components/ContextMenus.tsx`**: `BranchContextMenu` reemplaza el único "Eliminar" por
  opciones según el estado local/remoto de la Fase 01 (`hasRemote = upstream && !gone`):
  - solo-local → "Borrar rama local".
  - local + remota → "Borrar rama local", "Borrar rama remota", "Borrar local y remota".
  - branch activa → las mismas opciones **deshabilitadas** con tooltip
    `branchMenu.deleteActiveTooltip`.
- `ContextMenuItem` ahora soporta `disabled`, `title` (tooltip) y variante `danger`
  (hover rojo `text-error`).

### Tanda 3 — Diálogos + ejecución

- **`components/RepoOverlayLayer.tsx`**: `DeleteBranchState` suma `scope: 'local'|'remote'|'both'`.
  El `DangerConfirmDialog` de borrado se volvió scope-aware (título, mensaje, warning y label
  por scope) y `handleDeleteConfirm` orquesta:
  - **local** → `deleteBranch(force)` con escalado reactivo.
  - **remote** → `deleteRemoteBranch`; error legible (`remoteAuthRequired` / `remoteError`).
  - **both** → local y luego remota; si la local queda no-mergeada escala a `-D` conservando el
    scope; si la remota falla tras borrar la local, reporta `partialLocalOk` (no deja estado a
    medias silencioso).
- **`hooks/git-actions/remote.ts`**: acción NUEVA `deleteRemoteBranch(branch, remote='origin')`
  que reusa `githubToken` del store y refresca branches/log. Devuelve el resultado (no hace
  setError) para que el diálogo controle el mensaje del caso "ambas".
- Tras borrar, la lista de branches se refresca (vía las acciones).

### Textos de los diálogos (i18n ES/EN/ZH)

| Scope | title | message | confirm |
|---|---|---|---|
| local mergeada | `deleteBranch.title` | `deleteBranch.confirm` | `deleteBranch.delete` |
| local no-mergeada | `deleteBranch.title` + `deleteBranch.notMergedWarning` | `deleteBranch.confirm` | `deleteBranch.force` |
| remota | `deleteBranch.remoteTitle` | `deleteBranch.remoteConfirm` | `deleteBranch.deleteRemote` |
| ambas | `deleteBranch.bothTitle` | `deleteBranch.bothConfirm` | `deleteBranch.deleteBoth` |

### Claves i18n agregadas

`branchMenu.deleteLocal`, `branchMenu.deleteRemote`, `branchMenu.deleteBoth`,
`branchMenu.deleteActiveTooltip`, `deleteBranch.remoteTitle`, `deleteBranch.remoteConfirm`,
`deleteBranch.bothTitle`, `deleteBranch.bothConfirm`, `deleteBranch.deleteRemote`,
`deleteBranch.deleteBoth`, `deleteBranch.partialLocalOk`, `deleteBranch.partialRemoteOk`,
`deleteBranch.remoteAuthRequired`, `deleteBranch.remoteError` (× ES/EN/ZH).

## Verificación

- `npx tsc --noEmit` → exit 0.
- `pnpm test` → **259/259** verdes (36 archivos). Nuevos: `branch-merge.test.ts` (fixtures del
  parser) y `branch-delete-ipc.test.ts` (integración con **remoto local bare, sin red**: pushea
  branches y verifica que `git:delete-remote-branch` las borra de origin; `git:is-branch-merged`
  distingue mergeada de no-mergeada).

## Criterios de aceptación

- [x] Click derecho en branch ofrece borrado según estado local/remoto.
- [x] La branch activa no se puede borrar (opciones deshabilitadas con tooltip).
- [x] Todo borrado pasa por `DangerConfirmDialog`; el no-mergeado avisa los commits a perder.
- [x] Borrado remoto funciona reutilizando credenciales del push existente (`withGitHubToken`).
- [x] Errores legibles, sin stack trace; la lista se refresca tras borrar.
- [x] i18n ES/EN/ZH. `tsc`/tests verdes. Reporte escrito. Branch pusheada sin merge.

## Backlog (diferido)

- **Limpieza masiva en lote** (seleccionar varias branches mergeadas y borrarlas de una) queda
  DIFERIDA a una fase posterior.
- **Verificación visual en la app real**: los checkpoints usaron reproducciones fieles del
  render (mismos tokens/estructura), no screenshots en vivo de Electron. La lógica de borrado
  remoto sí se validó end-to-end contra un remoto local en los tests de integración.
