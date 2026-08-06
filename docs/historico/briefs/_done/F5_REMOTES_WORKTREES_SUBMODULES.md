# F5 — Gestión de remotes + operaciones de worktrees y submódulos (brief para el agente)

> **Leé primero:** `docs/00_FUENTE_DE_VERDAD.md` y `docs/01_INVARIANTES.md`. Trabajá por
> TANDAS y PARÁ en cada checkpoint. Esta fase **escribe configuración/estructura de Git**
> (remotes, worktrees, submódulos) — algunas operaciones son destructivas y requieren
> confirmación. Nada fuera de este brief.

## Por qué esta feature

El sidebar ya **lista** worktrees y submódulos (solo lectura) y la app maneja un remote
implícito (`origin`). F5 agrega las **operaciones**: administrar múltiples remotes,
crear/quitar worktrees, y add/update/sync de submódulos. Cierra varias brechas de
SourceTree de una. Riesgo medio: configuración real, parte destructiva.

## Estado de partida (verificado)

- Listado ya existe: `git:worktrees`, `git:submodules` (solo lectura), y el sidebar los
  muestra vía `RepoSidebarParts.tsx`.
- Sync con remote: `git:push`, `git:pull`, `git:fetch`, `git:push-branch`, `git:pull-branch`,
  `git:push-tag` — todos asumen `origin`. NO hay gestión de remotes (add/edit/remove ni
  multi-remote).
- NO existen handlers de worktree add/remove ni submodule add/update/sync.
- Confirmaciones destructivas: `DangerConfirmDialog.tsx`.

## Tres sub-bloques independientes (orden flexible, uno por vez)

### F5.A — Remotes
Handlers en `electron/ipc/git-repo.ts` (o `git-sync.ts`, donde encaje):
- `git:remotes-list(repoPath)` → `git remote -v` parseado a `{ name, fetchUrl, pushUrl }[]`.
- `git:remote-add(repoPath, name, url)`, `git:remote-remove(repoPath, name)` (destructivo →
  confirmación), `git:remote-set-url(repoPath, name, url)`, `git:remote-rename`.
UI: sección REMOTOS en el sidebar (o en Settings del repo) que liste remotes y permita las
acciones. **Cuidado:** muchos flujos hoy hardcodean `origin`; F5.A NO debe romperlos. Si se
agrega multi-remote real (elegir remote en push/pull), eso es un sub-paso aparte — proponelo,
no lo asumas. Primer corte: gestionar remotes sin cambiar a qué remote pushea cada acción.

### F5.B — Worktrees
Handlers en `git-ops.ts`:
- `git:worktree-add(repoPath, path, branch)` (crea worktree para una branch en otra carpeta),
- `git:worktree-remove(repoPath, path)` (destructivo → confirmación + chequear que no tenga
  cambios sin commitear; si los tiene, avisar).
UI: acciones hover en la sección WORKTREES del sidebar (patrón de los stashes/tags actuales).
Path picker reusando `fs:pick-folder` que ya existe.

### F5.C — Submódulos
Handlers en `git-ops.ts`:
- `git:submodule-update(repoPath, path?, init?)` (`git submodule update --init --recursive`),
- `git:submodule-add(repoPath, url, path)`,
- `git:submodule-sync(repoPath)`.
UI: acciones hover en la sección SUBMÓDULOS del sidebar. Add es de bajo uso → puede ir último.

## Plan de tandas

1. **TANDA 0 — Diseño.** Tipos + contratos IPC de los tres sub-bloques, parseo de salidas
   (`remote -v`, `worktree list --porcelain`, `submodule status`) en módulos puros si el
   parseo es no trivial. Confirmar qué flujos hardcodean `origin` (con CodeGraph/grep) para
   no romperlos. **CHECKPOINT 0.** Acordar con Ale el orden A/B/C y si multi-remote-en-push
   entra ahora o después.
2. **TANDA 1 — F5.A Remotes** (handlers + UI + i18n 3 idiomas). CHECKPOINT (QA visual).
3. **TANDA 2 — F5.B Worktrees** (handlers + UI + confirmaciones + i18n). CHECKPOINT.
4. **TANDA 3 — F5.C Submódulos** (handlers + UI + i18n). CHECKPOINT.

Cada sub-bloque cierra con tsc 0 + tests verdes + Fallow delta antes de pasar al siguiente.

## Qué NO hacer

- No cambiar a qué remote pushean/pullean los flujos existentes en el primer corte (evitar
  regresión en push/pull/fetch sobre `origin`).
- No borrar worktree con cambios sin commitear sin avisar; no borrar submódulo sin confirmación.
- No tocar el grafo, el Temporal Agent, ni `electron/db`.
- No tocar README/CHANGELOG.
- Ante un submódulo en estado raro (detached, url cambiada) o un worktree lockeado: reportar,
  no forzar `--force` sin discutirlo.

## Cierre
Reporte en `docs/reports/F5_REPORT.md` (puede cerrarse por sub-bloque). STOP para OK visual.
