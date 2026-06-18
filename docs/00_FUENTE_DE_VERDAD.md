# GitCron — Fuente de verdad (estado real del repo)

> **Para el agente ejecutor:** este documento describe el estado REAL del código a la fecha
> indicada. Leelo entero antes de tocar una línea. Si algo de acá no coincide con lo que ves
> en el código, **el código manda** — reportá la discrepancia y actualizá este doc al cierre
> de tu fase. No asumas que existe algo que no esté listado ni que falte algo que sí esté.

**Última actualización:** 2026-06-18 · **Versión:** v1.9.1 · **Branch de trabajo:** (re-auditar con `git branch -vv`; post-F6 avanzó más allá de `fallow/test-v4`)

---

## 1. Qué es GitCron

Cliente Git de escritorio (estilo GitKraken/SourceTree) con una vista experimental
**Cronométrica** (diagonal temporal estilo TCARS/LCARS) y un **Temporal Agent**: IA opt-in
que proyecta ramas especulativas futuras sobre la diagonal, con materialización a branches
reales y persistencia de decisiones en SQLite para calibración estadística.

## 2. Stack

| Capa | Tecnología |
|---|---|
| UI | Next.js 15 (export estático) + React 19 + Tailwind 4 + motion/react + lucide-react |
| Estado | Zustand 5 (`lib/git-store.ts`, multi-repo first-class: `openRepos[]` + `activeRepoIdx`) |
| Desktop | Electron 42 (`contextIsolation: true`, `sandbox: true`, CSP estricta) |
| Git | `simple-git` (local) + Octokit (`@octokit/rest`, GitHub API) |
| IA | OpenRouter (HTTP directo, sin SDK) — proveedor primario; stubs para openai/gemini/opencode |
| DB | `node:sqlite` built-in (prefijo `node:` preservado vía tsup external + onSuccess patch) |
| Build | tsup (Electron) + electron-builder (NSIS/dmg/AppImage) · puerto dev: 3001 |
| Tests | Vitest — **178 tests** (deben quedar verdes en todo cierre de fase) |
| Calidad | Fallow (`pnpm exec fallow`, config en `.fallowrc.json`) + CodeGraph MCP. Baseline actual: dead-code 3 issues (2 exports + 1 type), dupes 8 clone groups, health 261 sobre umbral, MI 90.2 (good). |

## 3. Mapa de arquitectura (snapshot v1.8.2 — cifras de LOC pendientes de refrescar tras F4/F5/F6)

### `app/`
- `page.tsx` — **1.277 líneas**. F1 alcanzó el objetivo `<1.400 LOC`. Sigue siendo el
  orquestador principal de estado/handlers, top nav, layout 3 columnas y callbacks, pero el
  view-switcher central, graph tab y overlay de modales/menús ya viven en componentes dedicados.
- `layout.tsx` — CSP por meta tag. `connect-src`: api.github.com, github.com, openrouter.ai.
- `globals.css` — tokens visuales ("The Compiled Soul": navy `#020f1e`, verde `#a3f185`,
  cian `#5ed8ff`, naranja `#fd9d1a`).

### `components/` (extraídos de page.tsx — NO recrear, reutilizar)
`TopBar.tsx`, `RepoTabs.tsx`, `RepoSidebar.tsx`, `RepoSidebarParts.tsx`,
`RepoDetailsPanel.tsx`, `RepoMainView.tsx` (view-switcher central + graph tab clásico/cronométrico),
`RepoOverlayLayer.tsx` (modales/menús de página), `RepoContentViews.tsx` (HistoryView + CommitTabView +
PR diff + file diff + file history + blame),
`RepoModals.tsx`, `RepoActionModals.tsx` (checkout conflict, reset all, clean untracked,
amend, squash), `StashModals.tsx`, `ResetCommitModal.tsx`, `DangerConfirmDialog.tsx`,
`ContextMenus.tsx` (Commit/File context menus + layer branch/remote), `PageToasts.tsx`,
`PageWidgets.tsx`, `GraphSearchControl.tsx`,
`BranchFilterDropdown.tsx`, `SettingsPanel.tsx`, `HelpPanel.tsx`, `ProfilePanel.tsx`,
`UpdateControls.tsx`, `CopyButton.tsx`, `ChangelogPreview.tsx`.

Núcleo visual: `CommitGraph.tsx` (clásico), `ChronometricGraph.tsx` (diagonal — ENORME y
visualmente delicado, no tocar geometría sin validación visual), `DiffViewer.tsx`,
`ConflictResolver.tsx`, `StagingPanel.tsx`, `SpeculativeBranches.tsx`,
`TemporalAgentSettings.tsx`, `temporal/PredictionDetail.tsx`.

### `hooks/`
- `use-git-actions.ts` — **fachada de 33 líneas** que compone `hooks/git-actions/`:
  working-tree, branches, history, remote, github-auth, preferences. API pública intacta.
- `use-repo-loader.ts` (selectores granulares Zustand), `use-panel-layout.ts` (layout
  persistido), `use-app-update.ts`, `use-auto-fetch.ts`, `use-canvas-viewport.ts`
  (pan/zoom cronométrico), `use-shortcuts.ts`, `use-translation.ts`.

### `electron/`
- `main.ts` — **285 líneas**, solo bootstrap + registro. Los ~55 handlers IPC viven en
  `electron/ipc/` por dominio: `git-ops`, `git-sync`, `git-repo`, `github`, `ai`, `shell`,
  `storage`, `watchers`, `app-window` + `shared.ts`.
- `temporal-agent-ipc.ts`, `ai/` (predict, key-store con safeStorage, providers,
  provider-parsing), `db/` (SQLite del Temporal Agent: prediction_run /
  speculative_branch / branch_decision, append-only).
- Hardening v1.8.0: guard de navegación (origen fijado, links externos → `shell.openExternal`),
  contención de paths en protocolo `app://`, handlers shell validados.

### `lib/`
`git-store.ts`, `i18n.ts` (ES fuente de verdad / EN / ZH, ~600 keys),
`chronometric-projection.ts` (funciones puras + tests), `speculative-projection.ts`,
`canvas-viewport.ts`, `materialize-idea.ts`, `feedback-context.ts`, `page-helpers.ts`,
`hunk-patch.ts`, `blame-parse.ts`, `display-format.ts`, `shortcuts.ts`, `os-notify.ts`,
`changelog.ts`, `utils.ts`.

## 4. Inventario de features Git (auditado v1.9.1)

**Existe y funciona — NO reimplementar:**
- Repo: abrir / crear (con creación opcional en GitHub) / clonar (lista de repos propios o
  URL) / multi-repo con tabs drag-to-reorder / carpeta default / auto-fetch con intervalo.
- Working tree: stage/unstage por archivo y en bloque, discard por archivo con confirmación,
  clean untracked selectivo (dry-run + checklist), stash completo (nombrado, preview,
  apply, pop, drop), add-to-gitignore, stash de archivo individual, stage/unstage/discard
  por hunk y por líneas seleccionadas desde el diff viewer.
- Commits: commit, amend, squash de últimos N, cherry-pick, revert, reset a commit
  (soft/mixed/hard con confirmación), búsqueda de commits, "Explicar con IA".
- Branches: create/rename/delete (con warning not-merged + force), checkout con resolución
  de conflicto (stash & switch), merge, rebase, fast-forward, pull decision toast
  (ff / rebase / merge), force-push con confirmación crítica.
- Conflictos: resolver interactivo por bloques dentro del DiffViewer (local / entrante /
  ambos órdenes / edición manual), detección en merge/rebase/cherry-pick.
- Remoto: push/pull/fetch, tags (crear anotado, push, delete), PRs (lista en sidebar +
  diff unificado), GitHub OAuth Device Flow + token manual (safeStorage).
- Sidebar lista: branches locales/remotas agrupadas, stashes, tags, **worktrees (solo
  lectura)**, **submódulos (solo lectura)**, PRs.
- File context menu: file history read-only por path (`git log --follow -- <file>`) y blame
  read-only (`git blame --line-porcelain`).
- App: undo/redo de toolbar, atajos personalizables, terminal en repo, notificaciones OS,
  temas (dark + light experimental), i18n ES/EN/ZH, auto-update con changelog integrado.

**Cerrado desde la v1.8.0 (ya existe — NO reimplementar):**
- **Interactive rebase** visual (reorder / squash / drop / reword) — v1.8.3.
- Gestión de **remotes** (add / rename / edit URL / remove) — v1.8.4.
- **Worktrees y submódulos**: operaciones (add/remove/update/sync), no solo listado — v1.8.4.
- **Dashboard Brier** del Temporal Agent — v1.9.0.

**NO existe (brechas reales que quedan):**
- **Reflog** viewer / undo robusto basado en reflog.
- Git LFS, commit signing (GPG/SSH), patch/apply, archive/export.
- Drag & drop de branches en el grafo para merge/rebase (firma de GitKraken).
- **Vista Cartografía** (comprensión visual del repo) — track nuevo, aún sin código (ver roadmap).

## 5. Temporal Agent — estado

- End-to-end funcional: contexto → OpenRouter → ramas especulativas dibujadas (punteadas,
  cian, opacidad = confidence) → aceptar/rechazar/diferir → materialización con
  confirmación (branch `imagined/*` + tag `flight/*` + IDEA.md) → restauración de ramas
  materializadas borradas vía tag.
- Persistencia: SQLite global en `userData` (3 tablas, decisiones append-only). HISTORIAL
  por run + detalle trazable (`PredictionDetail.tsx`) + panel live leyendo de SQLite.
- HUD Centauro: panel inferior con informe/historial, resize, expand, FUTUROS toggle,
  brief copiable para agentes en la materialización.
- Pendiente conocido: verificar si el write path JSON paralelo (`prediction.json` per-repo)
  sigue activo; si SQLite ya es única fuente, retirarlo (fase chica de housekeeping).
- **Dashboard Brier (F6, v1.9.0)**: sección "Dashboard temporal" en ajustes + pestaña "Estadísticas" en el HUD Centauro — Brier score, curva de calibración (10 bins), historial de decisiones, aceptación por tipo, comparación por proveedor; toggle local/unificado cross-repo desde SQLite.
- Diseño completo en `docs/TEMPORAL_AGENT_DESIGN.md` (no rediseñar nada de ahí).

## 6. Paisaje de branches (2026-06-13)

- Post-F6/v1.9.1 la rama de trabajo avanzó más allá de `fallow/test-v4` (que llegaba hasta F1/F2/F3). **Re-auditar el estado real con `git branch -vv` antes de cualquier prune.**
- `main` / `origin/main` y `origin/fallow/test-v4` quedaron sincronizadas en `6d560f5` antes de
  esta continuación F1; los cambios finales de esta etapa todavía deben cerrarse con commit/QA.
- ~14 branches viejas de features ya integradas (02-, 13-, 14-, …, 30-db-v1,
  feature/31-…) — candidatas a prune en housekeeping. **No borrar sin OK explícito de Ale.**

## 7. Comandos de cierre de fase (obligatorios)

```powershell
npx.cmd tsc --noEmit      # 0 errores
pnpm test                 # 142/142 verde (o más si agregaste)
pnpm exec fallow          # reportar delta: LOC, duplicación, dead code
git status --short
git diff --stat
```

Para inspección estructural usá **CodeGraph antes de grep**: `codegraph_status`,
`codegraph_context`, `codegraph_search`, `codegraph_impact`.
