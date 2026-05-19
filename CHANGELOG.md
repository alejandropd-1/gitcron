# Changelog - GitCron TEST 2

Changes are listed from newest to oldest.

---

## Unreleased

No changes yet.

---

## [v1.2.0] - 2026-05-19 - PR diff view + auth hardening

### Features

- Added an in-app Pull Request diff view: clicking a PR in the sidebar now loads its unified diff through GitHub, shows PR metadata, branch/base info, changed-file chips, and opens GitHub only via the explicit external-link action.

### Security

- Removed token-bearing temporary `origin` URLs from authenticated push/pull/fetch. GitCron now authenticates GitHub HTTPS remotes with a process-scoped `http.https://github.com/.extraheader` and leaves `.git/config` untouched.
- Updated authenticated clone to use the same extraheader flow, so private clones keep a clean `origin` URL without `x-access-token`.
- Extended log sanitization to redact `AUTHORIZATION: basic ...` values in addition to token-in-URL patterns.

### Docs

- Added README version/platform/runtime badges and refreshed release filenames for `v1.2.0`.
- Marked Pull request diff view and token-bearing temporary `origin` removal as completed in the roadmap.
- Updated SECURITY.md to document the extraheader auth flow and remove the old crash-window residual risk.

---

## [v1.1.7] - 2026-05-18 - Fix push (simple-git unsafe guard)

### Fixes

- El error "Configuring credential.helper is not permitted without enabling allowUnsafeCredentialHelper" también lo podía lanzar `simple-git@3.36.0` antes de ejecutar Git: su guard interno bloquea `credential.helper` y `core.askpass` salvo que se habiliten `unsafe.allowUnsafeCredentialHelper` y `unsafe.allowUnsafeAskPass` en la instancia. Las instancias autenticadas de clone/push/pull/fetch ahora usan una opción compartida con ambos permisos `unsafe`, manteniendo el URL token temporal y sin volver a `GIT_CONFIG_GLOBAL`.
- Bump de versión a `v1.1.7` para publicar el fix como release nuevo sobre el draft de GitHub.

---

## [v1.1.6] - 2026-05-18 - Fix push (safe.allowUnsafeCredentialHelper)

### Fixes

- v1.1.5 cambió el approach a `-c credential.helper= -c core.askpass=` (valores vacíos), que funcionaba en MSYS bash pero no en el git-for-windows que usa Electron. Error: "Configuring credential.helper is not permitted without enabling allowUnsafeCredentialHelper". Git-for-windows bloquea `-c credential.helper=...` **incluso con valor vacío**, a diferencia del upstream que solo bloquea valores no vacíos. Fix: agregar `safe.allowUnsafeCredentialHelper=true` al config array para autorizar el override vacío en Git.

---

## [v1.1.5] - 2026-05-18 - Fix push (sin GIT_CONFIG_GLOBAL, push fix incompleto)

### Fixes

- **El fix de v1.1.4 no resolvía el push en git-for-windows ≥2.40**. El error "Use of `GIT_CONFIG_GLOBAL` is not permitted without enabling `allowUnsafeConfigPaths`" seguía apareciendo aunque se pasara `-c safe.allowUnsafeConfigPaths=true`. Resolución: **eliminar el approach de `GIT_CONFIG_GLOBAL` + gitconfig temporal por completo** y pasar `-c credential.helper= -c core.askpass=` directamente. Los valores vacíos siempre son aceptados (CVE-2022-24765 solo bloquea valores no vacíos), no requieren `safe.allowUnsafeConfigPaths` ni `allowUnsafeCredentialHelper`. Se borra la lógica del temp file y la limpieza al `quit`.

---

## [v1.1.4] - 2026-05-18 - Fix push + UNSTAGED auto-refresh (push fix incompleto)

### Fixes

- **Push fallido por `GIT_CONFIG_GLOBAL`**: se agrega `safe.allowUnsafeConfigPaths=true` al config de simple-git en `withGitHubToken()`. Git ≥2.35.2 (CVE-2022-24765) consideraba "unsafe" la ruta del `.gitconfig` temporal usado para deshabilitar credential helpers; ahora el flag autoriza el path.

### UX

- **Panel UNSTAGED se refresca solo** al editar archivos en el working tree:
  - Watcher de FS con `chokidar` en el main process (ignora `.git`, `node_modules`, `.next`, `dist`, `release`, `out`).
  - Evento IPC `repo:fs-change` con debounce 250 ms en main + 150 ms en renderer.
  - Listener de `focus` en la ventana como defensa en profundidad.
  - Cleanup automático al cambiar de repo o cerrar la app.

---

## [v1.1.0] - 2026-05-18 - Auto-update con electron-updater

### Auto-update

- Chequeo silencioso de actualizaciones 3 s después del splash al iniciar la app (solo en producción, no en dev).
- Diálogo nativo cuando hay versión nueva disponible — botones **Descargar** / **Después**.
- `autoDownload = false`: la descarga solo arranca tras confirmación del usuario.
- Diálogo nativo cuando la descarga termina — botones **Instalar ahora** / **Más tarde**.
- `autoInstallOnAppQuit = true`: si el usuario elige "más tarde", la actualización se instala al cerrar la app.
- Sin update disponible → sin dialog, sin toast (modo silencioso).
- Nuevo handler IPC `app:check-update` para trigger manual desde el renderer.
- Botón **"Buscar actualizaciones"** en Settings → muestra spinner y toast con el resultado.
- Todos los errores del updater pasan por `sanitizeForLog()` y llegan al renderer con `errMsg()`.
- Los textos de los diálogos nativos se adaptan al idioma guardado en safeStorage (ES/EN).

### Publishing

- Nuevos scripts: `pnpm publish:win`, `pnpm publish:mac`, `pnpm publish:linux`.
- `electron-builder.publish` configurado con provider `github` (`alejandropd-1/gitcron`, repo privado).
- Requiere env `GH_TOKEN` con scope **`repo` completo** (el repo es privado).
- Los scripts crean un draft release en GitHub — publicarlo manualmente desde la UI de Releases.

### Limitaciones

- macOS auto-update queda inactivo hasta que se agregue code-signing. Los releases DMG siguen siendo descargables manualmente.

---

## [v1.0.1] - 2026-05-17 - Packaging stability fixes

### Critical fixes for packaged app

- **"Electron API no disponible" on every IPC call**: `tsup.config.ts` preload entry had `noExternal: [/.*/]` which matched everything including `electron`, causing tsup to bundle the electron package into `preload.js`. The bundled electron silently crashed the preload at runtime, leaving `window.api` undefined in both dev and packaged modes. Fixed by using the same exclusion regex as the main entry: `/^(?!electron$).+/`. Preload size dropped from 9.33 KB → 6.29 KB.
- **`sandbox: true` removed** from `BrowserWindow.webPreferences`. In combination with ASAR packaging and the bundled preload, sandbox mode prevented `contextBridge.exposeInMainWorld` from working correctly. `contextIsolation: true` + `nodeIntegration: false` is the canonical Electron security model and sufficient.
- **`app://` protocol SPA fallback**: the custom protocol handler now falls back to `out/index.html` for any path that doesn't resolve to a real file, enabling client-side routing to work correctly in the packaged app.
- **`trailingSlash: true`** added to `next.config.ts` static export so pages are generated as `page/index.html` (more compatible with the index.html fallback strategy).
- **Branch `06-Architectural`** created from `main` for these stability changes.

---

## [v1.0.0] - 2026-05-17 - First distributable release

### Packaging

- `electron-builder` v26 configured for Windows (NSIS installer), macOS (DMG) and Linux (AppImage).
- `pnpm package:win` generates `release/GitCron Setup 1.0.0.exe`.
- `next.config.ts` outputs `export` mode in production (static `out/`) so electron-builder can bundle the renderer. Dev server still uses the default Next.js mode.
- App icon uses `public/gitcron-icon.png` (512×512) for all platforms.

### Startup experience

- **Splash screen**: frameless 420×280 window with the GitCron logo and an animated green progress bar appears while the renderer loads. No extra file — the HTML is inlined.
- **Maximized on start**: the window fills the screen on first launch.
- **No auto DevTools**: DevTools no longer open automatically. In dev mode toggle with `Ctrl+Shift+I` (Win/Linux) or `Cmd+Option+I` (macOS).

### Credential caching fix

- `GIT_ASKPASS=echo` was blocked by git 2.35.2+ (same CVE-2022-24765 that blocked `credential.helper=`).
- New approach: write a temp `.gitconfig` at startup with `credential.helper =` and `core.askpass =`, then point `GIT_CONFIG_GLOBAL` to it for every token-authed operation. Git reads its own config files without restrictions, so the empty helper takes effect cleanly.

### Commit detail panel

- Clicking a commit in the graph or history now shows the **files changed in that commit** (via `git diff-tree --no-commit-id -r --name-status`), not the current working tree.
- Each file shows a colored status badge (A/M/D/R). Clicking a file loads the diff at that specific commit (`git diff <hash>^ <hash> -- <file>`).

### Squash commits

- New **Squash** button next to Amend in the staging panel.
- Modal lets you select 2–5 commits to combine, shows a live preview, and accepts a new message (defaults to the current HEAD message).
- Implementation: `git reset --soft HEAD~N` + `git commit -m <message>`. Warns about force-push if commits were already shared.

### Tests

- Vitest v4 set up with 2 test files and 14 passing unit tests.
- `lib/__tests__/shortcuts.test.ts`: `eventToShortcut`, `formatShortcut`, `defaultShortcutsMap`.
- `lib/__tests__/os-notify.test.ts`: token URL sanitization regex.
- Scripts: `pnpm test` (run), `pnpm test:ui` (browser UI), `pnpm test:watch`.

### Codebase refactor

- `app/page.tsx` reduced from 3,931 → 3,081 lines (−22%) by extracting:
  - `components/ContextMenus.tsx` — `CommitContextMenu`, `BranchContextMenu`, `FileContextMenu`, `ContextMenuItem`
  - `components/HelpModal.tsx` — `HelpModal`, `StatusBadge`, `FlowStep`
  - `components/RepoModals.tsx` — `EmptyStateCard`, `InitRepoModal`, `CloneRepoModal`, `ProfileMenu`

---

## [v0.1.8] - 2026-05-16 - UI polish, sidebar hierarchy, filter dropdown, app icon

### Sidebar hierarchy (GitKraken-style)

- LOCAL and REMOTE section headers now use `Monitor` and `Cloud` icons in cyan `#5ed8ff`.
- Section header padding reduced (`px-2`) so the chevron and icon sit at the leftmost position.
- Root branch items aligned to `pl-[26px]` so their branch icon lines up exactly with the section header icon (chevron 12px + gap 8px from the `px-2` baseline).
- Folder children (`claude/`, `origin/`) aligned to `pl-[46px]` so their icon lines up with the parent folder's icon.
- Removed the duplicate cyan cloud icon from `RemoteFolderView` (origin); cloud now lives only in the REMOTE header.
- Removed vertical guide lines (`border-l`) from both LOCAL and REMOTE folder children — pure padding hierarchy as in GitKraken.

### Branch filter dropdown

- Moved the "All branches / Current branch" segmented toggle from the graph's sticky header to a dropdown menu in the topbar, next to Terminal.
- Filter button only renders when the Graph tab is active. A small green dot appears on the icon when the "Current branch" filter is on, as a visual indicator.
- Dropdown uses `header relative z-50` + `dropdown z-50` so it always renders above the graph content (was clipping behind it before).
- Eliminated the now-empty 34px gap at the top of the graph (`sticky top-[34px]` → `sticky top-0`).

### Theme transition

- Added `transition: filter 0.35s ease, background-color 0.35s ease` to `html.light body` so the dark ↔ light switch animates smoothly instead of snapping.

### App icon

- `public/favicon.ico` (Windows-friendly multi-size) and `public/gitcron-icon.png` shipped.
- Electron `BrowserWindow` resolves the icon with a `.ico` first / `.png` fallback strategy.
- Next.js `metadata.icons` now references `favicon.ico` (replaces the default `N` Next.js favicon in the window title bar).

### Stability

- Native `File / Edit / View / Window` menu removed in production via `Menu.setApplicationMenu(null)`. Dev keeps a minimal menu for DevTools toggle.
- Spinner-stuck-on-tab race condition fixed: `use-repo-loader.ts` now captures `prevPath` before switching active repo and clears its `isLoading` in the `finally` block via `updateRepoByPath(prevPath, { isLoading: false })`.
- `git -c credential.helper=` removed (Git 2.35.2+ blocks it as CVE-2022-24765 hardening). Replaced with `GIT_ASKPASS=echo` and `GIT_CREDENTIAL_HELPER=''` env vars — same effect, no security warning.

### Context menu

- Items now use `text-left` so labels align to the left edge instead of centering.

---

## [v0.1.7] - 2026-05-16 - Amend, cherry-pick, codebase cleanup, security hardening, credential isolation

### Amend last commit

- New IPC handler `git:amend(repoPath, newMessage?)` in `electron/main.ts`. Runs `git commit --amend -m <new>` when a message is provided, or `--amend --no-edit` to fold staged changes without rewording. Refuses to amend when HEAD does not exist yet.
- New action `amendLastCommit(newMessage?)` in `hooks/use-git-actions.ts` that wraps the IPC, shows a success toast, and refreshes log/status/branches so any staged changes that got folded into the amended commit disappear from the UI.
- New **Amend** button in the staging panel next to **Commit Changes**, styled in orange to flag that this rewrites history.
- Modal that shows the current commit message (read-only), a textarea for the new message (empty = keep the existing one), and a warning about needing a force-push if the commit was already shared.

### Cherry-pick from context menu

- New IPC handler `git:cherry-pick(repoPath, hash)` with a 7-40 hex regex validation and conflict detection in the error stream. Returns `{ conflict: true }` so the renderer can show the appropriate guidance.
- New action `cherryPickCommit(hash, shortHash?)` mirrors the `mergeIntoCurrent` conflict-handling pattern (status is refreshed on conflict so the user sees the conflicted files immediately).
- New **"Cherry-pick este commit"** entry in the commit context menu — right-click any commit in the graph or the history view.

### Codebase cleanup (Fallow)

- Ran Fallow (`fallow dead-code`) over the project and removed everything it flagged as truly unreachable:
  - Deleted `hooks/use-mobile.ts` (zero importers).
  - Removed unused exports `notificationsSupported`, `notificationsPermission` from `lib/os-notify.ts`.
  - Removed unused exports `normalizeKeys`, `matchesShortcut` from `lib/shortcuts.ts`.
  - Unexported 5 internal-only types from `types/electron.d.ts` (`ElectronAPI`, `GitResult`, `RemoteOpResult`, `DeviceCodeInfo`, `CreatedRepoInfo`) — they are only referenced inside the same file.
- Removed 6 unused dependencies from `package.json`: `@google/genai`, `@hookform/resolvers`, `class-variance-authority`, `electron-is-dev`, `@tailwindcss/typography`, `firebase-tools`. Lockfile shrank by ~4700 lines.
- Cleaned the matching `@google/genai` entry from `pnpm-workspace.yaml`'s `allowBuilds`.
- Added `fallow` as a dev dependency and `.fallowrc.json` config so the analyzer can be re-run anytime.

### Security hardening — round 1

- **`sandbox: true` + explicit `webSecurity: true`** added to `BrowserWindow.webPreferences`. The preload only uses `contextBridge` + `ipcRenderer` so it remains fully sandbox-compatible.
- **URL-encoded GitHub tokens** before injecting them into clone/push URLs. `encodeURIComponent(token)` protects against tokens containing `@`, `:`, `/` or other URL-special characters that would break URL parsing.
- **`sanitizeForLog()` helper** that strips `x-access-token:<TOKEN>@` patterns from any string/Error before it reaches `console.log/error`. Applied to the three existing logging call sites in `electron/main.ts`.

### Security hardening — round 2

- **Generalized `errMsg()` helper** applied to all 48 IPC return paths that previously did `error: error.message`. Any token-bearing URL that leaks into git CLI output (e.g. `fatal: unable to access https://x-access-token:abc@github.com/...`) is now redacted before reaching the renderer.
- **Production-strict CSP** in `app/layout.tsx`: drops `'unsafe-eval'` from `script-src` and removes `localhost`/`ws://localhost` from `connect-src` when `NODE_ENV === 'production'`. Dev keeps the relaxed rules for HMR/Turbopack.
- **TOCTOU-resistant `fs:delete-file`** in `electron/main.ts`: uses `path.relative()` for traversal detection (catches both `..` segments and absolute paths) and switches to `lstatSync()` + `isFile()` guard so symlinks pointing outside the repo cannot be followed.
- **postcss override** in `pnpm-workspace.yaml` to force `>=8.5.10` (fixes GHSA-qx2v-qp2m-jg93, XSS via unescaped `</style>` in stringify output). `pnpm audit` now reports zero vulnerabilities.

### Credential helper isolation

- GitCron's token-in-URL trick was leaking into the OS credential store (Windows Credential Manager, macOS Keychain, libsecret) as a ghost `x-access-token` account that polluted the GitHub account selector on other git operations.
- Fix: every token-authed git invocation now runs with `-c credential.helper= -c core.askpass=true` via simple-git's `config` option, plus env vars `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=never`.
- Applied to `withGitHubToken` (push, pull, fetch, push-branch, pull-branch) and to `git:clone` when a token is injected.
- `withGitHubToken` keeps a separate "plain" `simpleGit` instance for reading/writing the origin URL so the no-helper config doesn't bleed into unrelated git plumbing.

### Settings modal polish

- Wider (560px) with `max-h-[90vh]`, scrollable body, sticky header. Long preference lists (shortcuts table, auto-fetch interval grid) no longer overflow the viewport.

---

## [v0.1.6] - 2026-05-15 - OS notifications, configurable shortcuts, light theme, polish

### Dynamic version (Feature 0)

- The version shown in Settings is now read from `package.json` at build time (`import pkg from '../package.json'`), so a single `version` bump propagates everywhere.

### Merge / fast-forward toasts (Feature 6)

- `mergeBranch` now shows a success toast (was missing).
- Unified merge/FF/up-to-date messages into reusable i18n keys: `success.merge`, `success.mergeUpToDate`, `success.fastForward` in ES and EN.

### OS notifications (Feature 7)

- New `lib/os-notify.ts` wraps the browser/Electron `Notification` API with permission handling and a global enable/disable toggle.
- Notifications fire on push/pull completion when the operation took more than 3 seconds OR the GitCron window is not focused.
- Push/pull authentication errors also notify when the window is unfocused.
- Auto-fetch now diffs the per-branch `behind` count before and after the cycle; if any branch gained remote commits, it sends a notification with the count and affected branches.
- Settings: new "Notificaciones del sistema" section with a single on/off toggle. Persisted in encrypted storage as `osNotifications`.

### Configurable keyboard shortcuts (Feature 8)

- New central shortcut system in `lib/shortcuts.ts` with 14 default bindings: `commit` (Ctrl+Enter), `push` (Ctrl+P), `pull` (Ctrl+Shift+P), `newBranch` (Ctrl+B), `search` (Ctrl+Alt+F), `fetchNow` (Ctrl+R), `settings` (Ctrl+,), `help` (F1), `closeRepo` (Ctrl+W), `nextRepo` (Ctrl+Tab), `prevRepo` (Ctrl+Shift+Tab), `graphTab` (Ctrl+G), `historyTab` (Ctrl+H), `commitTab` (Ctrl+Shift+C).
- New `hooks/use-shortcuts.ts` registers one global `keydown` listener, normalizes the combo via `eventToShortcut`, and dispatches the matching action. Skips events from inputs/textareas (except `Ctrl+Enter` for the commit textarea).
- Settings: new "Atajos de teclado" section with a table per binding. Click to capture, press the new combo to save, `Esc` cancels. "Restaurar valores por defecto" button clears the overrides.
- Persisted in encrypted storage as `shortcuts` (JSON map of id → keys).

### Light theme — experimental (Feature 9)

- Added a Theme preference (`dark` | `light`) persisted in encrypted storage as `theme` and applied as a class on `<html>`.
- Implementation: rather than rewriting every hardcoded hex across the components, light mode uses a global CSS filter inversion (`filter: invert(0.92) hue-rotate(180deg)`) on `<body>`. Elements that must keep their original colors (GitHub avatars, branch lane colors in the SVG graph) are marked with `data-keep-color` and double-inverted to compensate.
- Settings: the Theme placeholder is now a working toggle. A short note marks light mode as experimental.

---

## [v0.1.5] - 2026-05-15 - Tier 2: per-repo status, auto-fetch, branch filter, default folder + polish

### Polish and fixes (post-v0.1.5)

- Moved the fetch indicator button to the center toolbar, next to Stash, matching the size and style of Pull/Push/Branch/Stash.
- Added a `Filter` icon to the left of the branch filter toggle for visual clarity.
- Fixed a stale closure bug in the branch filter toggle where `repoPath` was read from a React closure instead of the live store, causing the refresh to silently no-op.
- Branch/tag chips in the graph now truncate long names with ellipsis (`max-w-[120px]`, `overflow-hidden`). Icons inside chips use `shrink-0` so they never collapse.
- Commits with more than 3 refs now show the first 3 chips plus a `+N` badge; hovering the badge reveals the remaining ref names via `title`.

---

## [v0.1.5] - 2026-05-15 - Tier 2: per-repo status, auto-fetch, branch filter, default folder

### Auto-fetch in background

- Added a configurable background fetch loop (`git fetch --all --prune`) that updates remote-tracking refs and ahead/behind counts without interrupting the user's view.
- Toggle, interval picker (5 / 10 / 30 / 60 minutes), and "last sync" timestamp live in Settings.
- New `git:fetch` IPC handler (separate from `git:pull`; never merges).
- Subtle indicator in the topbar that spins while fetching and shows the last sync on hover; click to fetch all open repos now.
- Preferences persisted in encrypted storage as `autoFetch`.

### Filter commits by branch

- Added a per-repo toggle in the Graph header to switch between "All branches" and "Current branch" (omits `--all` from `git log` when set to current).
- The toggle state lives in `RepoState` so each tab remembers its own preference and re-runs the log when toggled.

### Per-repo `isLoading`, `error`, `success`

- Moved the loading/error/success fields from the global store into `RepoState` so a slow operation on repo A no longer shows a spinner or error banner on repo B.
- Legacy top-level fields are kept as mirrors of the active repo for backward compatibility.
- Repo tabs now show a per-repo spinner when that tab's `isLoading` is true.

### Default folder for open/clone

- Added a configurable starting folder for the native open/clone dialogs (per-user preference, persisted in encrypted storage as `defaultFolder`).
- Settings UI with current path, Change, and Clear actions.
- Both `git:open-repo` and `fs:pick-folder` accept a `defaultPath` argument; rendered defaults flow from the store at call time.

---

## [v0.1.4] - 2026-05-15 - Multi-repo, graph polish, topbar, and preferences

### Multi-repo tabs

- Added first-class multi-repo support with `openRepos` and `activeRepoIdx` in the Zustand store.
- Kept the legacy active-repo store API so the rest of the UI could migrate safely.
- Added repo tabs with switch, close, and `+` actions.
- Restored open repos and the active tab on app start.
- Kept backward compatibility with the old `lastRepoPath` restore flow.

### Repo-scoped data loading

- Updated async repo refresh flows to write by repo path instead of always writing into the currently active repo.
- Scoped `loadDiff` updates to the intended repo to avoid cross-tab diff leaks.
- Changed `gitCommand` to be repo-scoped end to end, including Electron main, preload, types, and hooks.

### Search and topbar UX

- Reworked the topbar layout so repo navigation stays on the left, Git actions are centered, and tools live on the right.
- Replaced the always-visible search field with a search button near terminal.
- Search now opens in a floating popover and still supports `Ctrl + Alt + F`.
- Fixed the search popover layering so it renders above the main content.

### Graph and layout polish

- Added resizable graph-table columns for Branch/Tag, Graph, Date, and Commit.
- Persisted graph column widths in `localStorage`.
- Added subtle divider lines to graph headers.
- Added colored lane bands in graph rows to make message-to-branch association easier to scan.
- Refined the graph header spacing and the Date header alignment.

### Settings and typography

- Added a global text size preference in Settings with `Compact`, `Normal`, and `Large`.
- Persisted `fontSize` in encrypted storage, alongside other preferences.
- Applied the chosen size through the root document font size so Tailwind `rem`-based classes actually respond.

### Stability fixes

- Fixed a hydration mismatch caused by restoring persisted widths too early on the client.
- Hardened the GitHub Device Flow login path and error handling for transient network failures.
- Fixed persistence edge cases when closing the last repo tab.

---

## [v0.1.3] - 2026-05-15 - Restore last repo, resizable panels, stable branch colors

- Added silent repo restore on startup.
- Added resizable sidebar and details panels.
- Added stable branch colors in the commit graph.
- Expanded the branch/tag column to reduce chip truncation.
- Completed success toasts for merge, rebase, and fast-forward flows.

---

## [v0.1.2] - 2026-05-15 - First push upstream fix

- Detected "no upstream branch" push failures.
- Retried automatically with `git push --set-upstream origin <branch>`.
- Applied the fix both to toolbar push and branch-context push.

---

## [v0.1.1] - 2026-05-15 - UX polish, feedback, and auth hardening

- Added more success toasts across common Git actions.
- Added commit filtering in Graph and History.
- Added WIP banner improvements in commit details.
- Added clear-all stash with inline confirmation.
- Improved contrast in a few low-readability UI states.
- Moved Git auth back to temporary URL injection after Electron 42 blocked `GIT_ASKPASS`.

---

## [v0.1.0] - 2026-05-14 - Initial release

- Next.js + Electron + Zustand + TypeScript project base.
- Typed IPC bridge and `safeStorage` integration.
- Visual commit graph, staging area, diff viewer, and history view.
- Branch tree, stash flows, and context menus.
- GitHub OAuth Device Flow and token persistence.
- Design system foundation and dark UI.
