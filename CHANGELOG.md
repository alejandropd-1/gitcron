# Changelog - GitCron

Changes are listed from newest to oldest.

---

## [v1.4.4] - 2026-05-22 - Distribución Consistente por Rama y Tags de Origen Inline (Iteraciones C2.2 & C2.3)

### Added

- **Symmetrical Wing Comment Grouping**: Configured comments on lateral fanned branches to reside strictly on their fanning side (left wing for left branches, right wing for right branches) to form organized, clean vertical columns of text, leaving alternating symmetry strictly for the main trunk (`main`/`master`).
- **Hashed Wing Selection for Trunk-Lanes**: Calculated a stable string hash algorithm on lateral branch names drawn directly on `lane = 0` (such as active feature branches) to deterministically assign their comments to a single wing (left/right) cleanly.
- **High-Fidelity Inline Branch Tags**: Integrated custom-sized branch segment origin badges (e.g. `FEATURE/TCARS-HUD-SHELL`) drawn dynamically to the left of the comment text for the first commit of any lateral branch segment, shifting subsequent text columns correctly to prevent overlaps.
- **Perfect Retro-Lane Branch Propagation**: Engineered a backward lane-aware propagation algorithm (`commitBranchNames`) that traces active branch names from HEAD/tip refs down along first-parent lanes, assigning correct names to every single intermediate node.
- **Robust Local Origin Detection**: Swapped scroll/filtering-dependent global check hooks for a localized check (`node.isBranchOrigin`), verifying whether a lateral branch node has any parent on the same branch.
- **Clean SVG Loop Unification**: Deprecated and purged obsolete component-level variables (`branchOrigins`, `branchNamesMap`), binding the SVG overlay map directly to `projectedCommits` precalculates (`node.isLeft`, `node.isBranchOrigin`, `node.branchName`) with flawless compilation.

### Docs

- Bumped the app version to `v1.4.4` in `package.json`.
- Updated `README.md` with version badge, installation filename updates, and new fanning/inline features.

---

## [v1.4.3] - 2026-05-22 - Refinamientos Visuales y Distribución Espacial HUD (Iteración C2.1)

### Added

- **Left-Wing Active Branch Ref Badges**: Replaced oldest-commit origin logic with prominent HUD tactical branch badges rendered for any commit possessing a local branch reference (`refs/heads/*`), always aligned vertically on the left wing (`baseX + nx * 75`) with dotted connectors back to the node to ensure all branches are perfectly visible.
- **Symmetrical Commits & Sign Corrected Direction**: Restored proper left/right comment symmetry along the chronometric diagonal based on true normal coordinates (`branchIndex > 0` for left-wing, `branchIndex < 0` for right-wing).
- **Anti-Collision Commit-Branch Rules**: Forced comment overlays to the right wing on any node rendering a left branch badge, establishing total visual clarity and absolute separation.
- **Uniform Dotted Connectors & HEAD Tag Offset**: Standardized all comment dotted connectors to exactly `35px` and fanned satellite tags by `tagIndex * 45` along the parallel timeline direction `(ux, uy)`. For HEAD tags, applied a `-50px` offset along the parallel direction to completely isolate tags from the HEAD telemetry stack.
- **Snug Symmetrical Satellite Tags**: Redesigned satellite tags using exact character width estimations (`tagName.length * 4.5 + 8`), text anchoring centered (`textAnchor="middle"`), and dominant baseline centering (`dominantBaseline="central" y={0}`) for a perfect, tight `4px` padding on both edges.
- **TypeScript & Vitest Validation**: Fully compiled with 0 type errors and passed all 26 vitest test suites successfully.

### Docs

- Bumped the app version to `v1.4.3` in `package.json`.
- Updated the walkthrough for C2.1 visual and spatial refinements.

---

## [v1.4.2] - 2026-05-22 - Instrumentación Semántica y HUD / Shell TCARS (Vistosa Carcasa Operacional)

### Added

- **HUD / Shell TCARS System (C2 Block)**: Integrated a static, non-interactive vector overlay layer (`z-10` and `z-20` layers) that wraps the infinite canvas in highly polished curved borders, concentric circular coordinate grids, declination angular ticks (`000°` to `315°`), and projection metrics (`AZIMUTH // 40.4°`, `DECLINATION // 0.85`).
- **Four React Operational HUD Panels**:
  - **Panel 01 (Nav System)**: Renders active repository name, local absolute path, current branch, and operational mode with a slow breathing status light.
  - **Panel 02 (Sync Telemetry)**: Monitors Ahead/Behind counters, dirty files counters segmented by modification status (`MOD`, `ADD`, `DEL`), stashes count, and submodules.
  - **Panel 03 (Chrono & Radar)**: Lists total nodes loaded, absolute calendar timeline span, and renders an animated sweeping circular radar scope.
  - **Panel 04 (Target Telemetry)**: Dynamically lock-identifies the selected node showing commit hash, message, parent hash, exact author, date, and copy quick actions; pulses in an active seeking loop when idle.
- **GPU-Accelerated Micro-Animations**: Introduced custom breathing transitions (`hud-breath` at 5s cycles) and sweeping animations (`radar-sweep` at 12s cycles) completely decoupled from canvas gestures to guarantee a fluid 60+ FPS experience.
- **Symmetrical Staggered Timeline Labels (Layout Anticolisión V2)**: Upgraded the layout to a highly robust 3-level stagger layout (`35px`, `70px`, and `105px` perpendicular offsets) based on chronological index modular arithmetic (`chronologicalIndex % 3`) to completely eliminate any horizontal or vertical overlap along the diagonal timeline.
- **Temporal Separation Compression**: Reduced linear time weight to 5% and index weight to 95% in the hybrid math module (`lib/chronometric-projection.ts`) to compress overly long diagonal separations during periods of developer inactivity.
- **Commit Message Full Rendering**: Removed message truncation (`substring(0, 24)...`) on normal and HEAD commit nodes so messages are displayed completely in this chronological view.
- **Merge Arrow Directions**: Rotated merge arrowhead graphics by 180 degrees (`rotate(${mid.angle + 180})`) to point forward in time (upward/rightward) towards child commits.
- **Responsive Target Telemetry Panel**: Introduced class `hud-target-panel` and media query layout rules under 1200px to reposition the bottom-center Panel 04 to the right of Panel 03, resolving card collisions on narrow screens.
- **Directional HUD Separation (Left/Right Layout)**: Optimized spatial arrangement by projecting Git tags as outer satellite badges to the top-left (using the `(nx, ny)` vector normal), while committing all text telemetry lines, branch names, and hashes to the bottom-right (along `(rx, ry)`).
- **Floating Fork Triangles (Branch Start Indicators)**: Added external double-triangles that float cleanly at a `20px` to `28px` offset to clearly demarcate where a new branch starts, completely decoupled from the 10.5px commit circles to avoid any geometric overlaps.
- **Static HEAD Telemetry Stack**: Eliminated Next.js SWC build-time closures optimizer bug by computing HEAD vertical coordinates statically, rendering branch info, track state, and commit hash in a perfectly stacked vertical HUD list.
- **Aesthetic and HUD Layout Refinements**:
  - **Unified Flex Layout**: Wrapped Panel 03, Panel 04, and zoom controls in a bottom flex container to prevent overlap on narrow viewports.
  - **Side-Specific Commit & HEAD Telemetry Stack**: Project commit labels on the left of the timeline for left-side branches (and alternating main lane commits), and on the right for right-side branches, with appropriate text alignments (`start`/`end`).
  - **Left-Hand Branch Origin Badges**: Placed branch names inside tactical, high-fidelity HUD-style badges on the left of the timeline, featuring dynamic widths and right vertical highlights.
  - **Short Uniform Connector Lines**: Enforced a clean, uniform distance of exactly 35px for all normal and HEAD commit connector dotted lines.
  - **Compact Satellite Tags**: Recalibrated text and container bounds of tags to guarantee a perfectly symmetrical 4px padding on both sides.


### Docs

- Bumped the app version to `v1.4.2` in `package.json`.
- Updated the README version badge, architecture list, and features guide.
- Added comprehensive walkthrough for the C2 HUD/Shell operational capabilities in the workspace brain.

---

## [v1.4.1] - 2026-05-22 - Pan & Zoom Cronométrico (Infinite Canvas Viewport)

### Added

- **Lienzo Infinito 2D (Interactive Canvas Viewport)**: Replaced the standard horizontal/vertical overflow wrapper in the Chronometric Graph with a full interactively scrollable infinite 2D canvas with customizable cursors (`cursor-grab` and `cursor-grabbing`).
- **Arrastre por Mouse (Click & Drag Pan)**: Drag anywhere on the Chronometric Graph to pan smoothly in both vertical and horizontal planes. Event listeners are dynamically bound to the `window` during active dragging to guarantee absolute panning stability even when the cursor leaves the window bounds.
- **Zoom Anclado al Cursor (Cursor-Anchored Scroll Wheel Zoom)**: Integrated cursor-anchored scaling by recalculating viewport offsets instantly as the user scrolls. Supports scale clamping between `0.25x` and `3.5x`.
- **Límites de Contención (Viewport Bounds Containment)**: Implemented automatic boundaries clamping to prevent the timeline graph from completely sliding out of the viewport.
- **Inclinación Visual Ascendente (Pronounced Diagonal Slope)**: Exposed a configurable constant `DEFAULT_CHRONOMETRIC_SLOPE = 0.85` in the math module (producing a ~40.4° rising angle in screen coordinates), transforming the horizontal timeline into a visually striking chronological ascent HUD.
- **Auto-Centrado Dinámico de Lienzo (Dynamic Viewport Auto-Centering)**: Added an automatic viewport layout measurer to `useCanvasViewport` that instantly centers the ascending diagonal timeline horizontally and vertically on first mount, repository switch, or filter changes, while safely preserving subsequent user panning gestures.
- **Librería Matemática Viewport (`lib/canvas-viewport.ts`)**: Built a pure, robust coordinate projection library mapping screen coordinates to canvas world coordinates (`screenToWorld`, `worldToScreen`) and resolving viewport boundary constraints.
- **Comportamiento del Hover Card**: Computed absolute details hover card coordinates using mathematical canvas projections, ensuring that hover elements follow nodes flawlessly under zoom and pan and clamp precisely against container edges.
- **Controles de Navegación Discretos (Discrete Floating Controls)**: Minimalist, low-profile overlay controls (`+`, `-`, `Reset`) in the bottom-right corner for mouse-driven zoom adjustments and viewport resetting.
- **Vitest Unit Test Suite**: Comprehensive tests in `lib/__tests__/canvas-viewport.test.ts` covering coordinate projections, anchored scale calculations, limit clamp margins, and boundary constraints; and added test cases in `lib/__tests__/chronometric-projection.test.ts` validating slope angle restrictions.


### Docs

- Bumped the app version to `v1.4.1` in `package.json`.
- Updated the README version badge, architecture list, and features guide.

---

## [v1.4.0] - 2026-05-22 - Vista Cronométrica (Chronometric Timeline Layout)

### Added

- **Vista Cronométrica (Chronometric View)**: Integrated an alternative visual representation of the Git graph plotted along an ascending diagonal timeline canvas.
- **Hybrid Time-Index Scaling**: Designed a mathematical spacing projection in `lib/chronometric-projection.ts` using **30% linear real-world time** and **70% sequential index spacing** to maintain authentic chronological separation while ensuring overlapping commits never collide during periods of dense developer activity.
- **Fanning Lane Distribution**: Branch lanes scale outward symmetrically relative to their original semantic lanes and grow in width towards the present.
- **Organic Tangent Connectors**: SVG parent-child connections are rendered as smooth, highway-like cubic tangent Bézier curves aligned parallel to the principal diagonal, avoiding harsh right angles.
- **Temporal Grid Coordinates**: Intelligent diagonal coordinate grid lines that show date markers (days, months, years) dynamically.
- **Interactive Nodes & Hover Card**: Circular commit nodes showing author initials with focus scales and a sleek details hover card that aggregates commit info (hash, message, author, date) cleanly.
- **Segmented UI Toggle & Persistence**: A styled tab control in the main topbar next to the branch filter for instant view toggling, with automatic local persistence saved per repository.
- **Vitest Unit Test Suite**: Written robust coverage in `lib/__tests__/chronometric-projection.test.ts` verifying projection accuracy, hybrid scaling, and lane translation.

### Docs

- Bumped the app version to `v1.4.0` in `package.json`.
- Updated the README version badge, installer filenames, and current-version note.

---

## [v1.3.6] - 2026-05-22 - Session rescue & Viewport-aware context menus

### Fixed

- Robust login session preservation: updated `bootstrapGitHub` to only delete the GitHub credentials token from local secure storage (`safeStorage`) if the validation error is explicitly an authentication/credentials failure (HTTP `401 Unauthorized`). Temporary offline states or network timeouts no longer log the user out.
- Silent avatar & profile re-connect: added an automatic, silent re-validation trigger that fetches the user profile and updates the UI avatar as soon as the application recovers its internet connection (using window `'online'` event) or when the user opens their profile menu.
- Viewport-aware context menus: implemented `useAdjustedPosition` in all context menus (Branch, Commit, and File) to dynamically detect screen boundaries (height/width) and shift/render menus upwards or leftwards to prevent them from overflowing the viewport.
- Extended type mappings for `GitResult` to support `isAuthError` and status properties.

### Docs

- Bumped the app version to `v1.3.6` in `package.json`.
- Updated the README version badge, installer filenames, and current-version note.

---

## [v1.3.4] - 2026-05-21 - Intelligent Init in existing folders, GitHub Rescue & premium Force Push

### Added

- Support for initializing Git repositories inside existing, non-empty folders (`git:init` no longer blocks on non-empty directories).
- Intelligent flow that checks if the directory is non-empty before creation, performs a local git initialization (which commits all existing files without overwriting `README.md` or `.gitignore`), creates a bare remote repository on GitHub if checked, associates the `origin` remote, and automatically pushes the initial `main` branch.
- Collision rescue for GitHub: if the repository already exists on the user's GitHub account during the "Create also on GitHub" flow, it catches the 422 collision gracefully, fetches the repository's clone URL, and links it as the remote `origin`.
- Premium React-based Force Push overlay modal (`z-[300]`) styled with dark HSL glassmorphism and warning indicators, prompting the user for approval when branch history has diverged on initial push.
- Safe `--force` push handler in `electron/main.ts` using simple-git's standard signature to bypass diverged branch history securely.
- Added `fs:exists-and-not-empty` IPC handler to detect if folder is empty.

### Docs

- Bumped the app version to `v1.3.4` in `package.json`.
- Updated the README version badge, installer filenames, and current-version note.

---

## [v1.3.3] - 2026-05-20 - Safe directory recovery

### Fixes

- Added recovery for Git's `fatal: detected dubious ownership` / `safe.directory` error when opening a repo owned by another Windows account or Administrators.
- The error toast now explains the ownership issue and offers `Confiar carpeta`, which runs `git config --global --add safe.directory <repo>` and reopens the repo.

### Docs

- Bumped the app version to `v1.3.3` in `package.json`.
- Updated the README version badge, installer filenames, and current-version note.

---

## [v1.3.2] - 2026-05-20 - Splash polish + Graph reveal

### UX

- Reworked the Electron splash screen with the GitCron icon, subtle geometric fade animation, and a minimum visible duration to avoid startup flicker.
- Added a stable startup loading state for the Graph while the initial repo restore/load completes.
- Revealed the Graph container with a short fade-in after initial repo data is ready, avoiding the visual effect of lanes and layout settling on screen.

### Docs

- Bumped the app version to `v1.3.2` in `package.json`.
- Updated the README version badge, installer filenames, startup polish note, and current-version note.

---

## [v1.3.1] - 2026-05-20 - Update UX polish + dev mock

### UX

- Replaced the native Windows update dialogs with an in-app update experience driven from the version tag in the topbar.
- Added a notification dot on the version tag when an update is available, plus a dropdown that shows the new version and a `Descargar` / `Download` action.
- Moved update download progress and the final `UPDATE` install action next to the GitHub releases icon so the version tag remains visible.
- Added the same update status, download action, progress bar, and `UPDATE` action to the bottom of Settings.
- Aligned the Search and Branch Filter popovers with the toast-style blurred background treatment.

### Development

- Added `NEXT_PUBLIC_MOCK_UPDATE=1` support for `pnpm run electron:dev` so the update dot, dropdown, progress bar, and `UPDATE` button can be tested without publishing a release.

### Docs

- Bumped the app version to `v1.3.1` in `package.json`.
- Updated the README version badge, installer filenames, auto-update behavior notes, and current-version note.

---

## [v1.3.0] - 2026-05-19 - Pull decisions + branch sync guidance

### Features

- Added a branch-sync decision toast for the current branch when Pull or Push is triggered while the branch is behind or diverged.
- Behind-only branches now offer explicit in-app actions for `Fast-forward` or `Pull con merge`.
- Diverged branches now offer explicit in-app actions for `Pull con rebase` or `Pull con merge`, so the user can choose how to integrate local and remote history before pushing.
- Added hover explanations to the ahead / behind chips in the branch sidebar so `↑` and `↓` counts read as clear branch status instead of raw Git shorthand.

### Docs

- Bumped the app version to `v1.3.0` in `package.json` and refreshed the README badge, installer filenames, and current-version notes.
- Added future roadmap entries for a visual merge/rebase conflict resolver and local AI workflows via LM Studio.

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
