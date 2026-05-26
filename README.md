# GitCron - Advanced Git Client

Desktop Git client built with modern web tooling. GitCron is meant to cover a personal GitKraken-like workflow without a subscription, with a strong focus on visual history, safe Git operations, and GitHub integration.

<p align="center">
  <img alt="GitCron version" src="https://img.shields.io/badge/GitCron-v1.6.4-fd9d1a?style=for-the-badge&amp;labelColor=2c3440">
  <img alt="Windows installer" src="https://img.shields.io/badge/Windows-installer-5ed8ff?style=for-the-badge&amp;labelColor=2c3440">
  <img alt="macOS DMG" src="https://img.shields.io/badge/macOS-DMG-5ed8ff?style=for-the-badge&amp;labelColor=2c3440">
  <img alt="Linux AppImage" src="https://img.shields.io/badge/Linux-AppImage-5ed8ff?style=for-the-badge&amp;labelColor=2c3440">
</p>

<p align="center">
  <img alt="Next.js version" src="https://img.shields.io/badge/Next.js-15-111827?style=flat-square&amp;labelColor=4b5563">
  <img alt="React version" src="https://img.shields.io/badge/React-19-5ed8ff?style=flat-square&amp;labelColor=4b5563">
  <img alt="Electron version" src="https://img.shields.io/badge/Electron-42-a3f185?style=flat-square&amp;labelColor=4b5563">
  <img alt="TypeScript version" src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&amp;labelColor=4b5563">
  <img alt="Node.js requirement" src="https://img.shields.io/badge/Node.js-22%2B-8cc84b?style=flat-square&amp;labelColor=4b5563">
</p>

---

## Stack

| Layer           | Tech            |
| --------------- | --------------- |
| UI framework    | Next.js 15      |
| UI library      | React 19        |
| Desktop runtime | Electron 42     |
| State           | Zustand 5       |
| Language        | TypeScript 5.9  |
| Git backend     | simple-git 3    |
| GitHub API      | Octokit REST 22 |
| Styling         | Tailwind CSS 4  |
| Motion          | Motion          |
| Icons           | Lucide React    |

---

## What GitCron does today

### 🟢 Core & Vista Clásica (Classic View) - Estable

#### Repositories

- Open any existing Git repo from a native OS dialog.
- Create a new repo locally, including **intelligent initialization inside non-empty folders** without losing files or overwriting local content.
- Automatic **GitHub collision rescue**: when creating a local repository and selecting "Crear también en GitHub", if the repository already exists on GitHub, GitCron dynamically retrieves its remote URL and configures it seamlessly as `origin`.
- Clone from any Git URL or from your GitHub repos.
- Create a GitHub repo and clone it in one flow.
- Multi-repo tabs: keep several repos open at once.
- Restore open repos and the active tab automatically on app launch.
- Use the `+` tab action to open the same central chooser for open / create / clone.

#### History and graph

- SVG commit graph with stable branch colors.
- Current branch always highlighted in neon green.
- Branch / tag chips with local, remote, tag, and current-state cues. Long names truncate with ellipsis; commits with more than 3 refs show a `+N` badge.
- Filter toggle in the graph header: **All branches** (default) or **Current branch** (`git log` without `--all`). State is per-repo tab.
- WIP row at the top when the working tree is dirty.
- History tab for a flat chronological view.
- Commit tab for a staging-focused workflow summary.

#### Staging and commits

- Separate unstaged and staged sections.
- **Auto-refresh of the UNSTAGED panel** when files change on disk: a `chokidar` watcher in the main process emits `repo:fs-change` over IPC (debounced 250 ms in main + 150 ms in renderer). A window `focus` listener provides a fallback when the watcher misses an event. Watches ignore `.git`, `node_modules`, `.next`, `dist`, `release`, and `out`.
- Batch stage / unstage to avoid `index.lock` races.
- Diff viewer for staged and unstaged files.
- Real commits with author, date, refs, and commit details. Clicking a commit shows the files changed **in that commit** with colored status badges (A/M/D/R) and per-file diffs.
- Amend last commit: reword the message or fold staged changes into the previous commit, with a warning if the commit was already pushed.
- Squash last N commits (2–5) into one with a custom message.
- Reset all with confirmation.
- Recovery action for `index.lock` errors.

#### Branches

- **Agrupamiento Recursivo de Ramas (Árbol de Profundidad Infinita)**: La barra lateral local y remota ahora soporta anidamiento recursivo de subcarpetas utilizando prefijos con múltiples barras diagonales (ej. `feature/cronometric/tcars-hud-shell`). Las ramas se ordenan jerárquicamente con carpetas primero y prioridades especiales para ramas principales (`main`/`master`), utilizando sangrías dinámicas y acumuladores de cantidad exactos.
- Ahead / behind counts in the sidebar.
- Ahead / behind chips now explain themselves on hover, and Pull / Push open a decision toast when the current branch is behind or diverged.
- **Premium Force Push workflow**: when pushing a branch whose history has diverged from the remote (e.g., during initialization/pushes of overlapping repos), GitCron displays a beautifully styled, high-priority React overlay modal (`z-[300]`) requesting explicit permission before executing a safe `--force` push.
- Checkout with conflict detection.
- Merge, rebase, fast-forward, rename, delete, and create branch flows.
- Cherry-pick a single commit onto the current branch from the commit context menu, with conflict-aware feedback.
- Per-file stash and full working-tree stash.
- Clear-all stash action with confirmation.
- **Remote branch checkout**: Double-clicking a remote branch in the sidebar or right-clicking to use the new `RemoteBranchContextMenu` will automatically download it as a local tracking branch (using `git checkout -t`) or switch to it if it already exists, featuring custom pointers and hover guides.
- **Premium Conflict Resolver Card**: Displays a glassy, high-fidelity HSL gradient card in the Diff Viewer when a selected file has merge or rebase conflicts, allowing the user to resolve the file completely with a single click ("Aceptar Local (HEAD)" or "Aceptar Entrante (Merge)") or providing instructions for side-by-side editing in their IDE.

#### GitHub

- OAuth Device Flow login, similar to `gh auth login`.
- Manual personal access token fallback.
- Authenticated push / pull / fetch via a process-scoped GitHub authorization header, without writing token-bearing `origin` URLs.
- Automatic `--set-upstream` on the first push of a new branch.
- Pull requests list in the sidebar for the current repo, with an in-app unified diff view.
- Private repo clone support after login.

#### UX

- Success and error toasts for the main Git actions.
- Search moved to a toolbar button with `Ctrl + Alt + F`.
- Search opens in a floating popover instead of living permanently in the topbar.
- Resizable app columns: sidebar / center / details.
- Resizable graph columns: Branch/Tag, Graph, Date, Commit.
- Reworked topbar layout with repo navigation on the left, Git actions centered, and tools on the right.
- Auto-fetch: background `git fetch --all --prune` on a configurable interval (5 / 10 / 30 / 60 min). Toggle and last-sync time in Settings. Manual trigger via the fetch button next to Stash.
- Default folder: configurable starting directory for open and clone dialogs, saved in encrypted storage.
- Per-repo loading state: each tab shows its own spinner and error — a slow operation on repo A never blocks repo B.
- Text size setting in Settings: `Compact`, `Normal`, `Large`.
- OS notifications: native alerts when push/pull takes >3s or the window is unfocused, and when auto-fetch detects new remote commits.
- Configurable keyboard shortcuts: 14 actions (commit, push, pull, branch, fetch, search, etc.) editable from Settings with click-to-capture rebind.
- Theme toggle in Settings: dark (default) and experimental light mode.
- Auto-update now stays inside the app UI: a version-tag dot announces updates, the tag opens the download dropdown, progress stays beside the GitHub releases icon, and `UPDATE` appears there when the download is ready.
- Settings -> Check for updates now includes a **Recent changes** view sourced from the local `CHANGELOG.md`: the newest version opens by default, older versions stay collapsible, and GitHub Releases remains available as a secondary "full history" action.
- Startup polish: the Electron splash now shows the GitCron icon with subtle geometric animation, stays visible long enough to avoid first-paint flicker, and the Graph fades in after initial repo data is ready.
- **Selective Text Selection**: Habilitación selectiva de la propiedad de selección de texto (`select-text`) quirúrgicamente sobre nombres de ramas (locales y remotas), agrupadores de carpetas, tags, stashes y todos los metadatos de commits (mensajes, hashes, email, autor, archivos) en los listados e insets, conservando el comportamiento nativo `select-none` en elementos interactivos.
- **Reordenamiento de Pestañas por Arrastre (Drag-to-Reorder Repo Tabs)**: Las pestañas de los repositorios abiertos en la barra superior ahora soportan reordenamiento visual dinámico por arrastre utilizando `Reorder` de `motion/react`, with mitigación de clics accidentales durante el arrastre (`isDraggingRef`).
- **Paneles Laterales Integrados para Configuración, Ayuda y Usuario**: Reemplazo de los antiguos modales flotantes por paneles semánticos integrados en el layout principal. Los contenidos se adaptan fluidamente a la anchura del contenedor (`w-full` y `max-w-2xl` para el perfil de usuario), eliminando límites heredados del contenedor modal.
- **Transición de Desvanecimiento Puro (Fade-Only)**: Eliminación definitiva de las distorsiones de escalado bruscas por defecto. Implementación de transiciones de opacidad para una experiencia fluida y prémium al abrir y cerrar paneles.
- **Guardia de Hidratación (Hydration Guard)**: Implementación de una barrera de renderizado síncrono en el cliente basada en la técnica de Josh W. Comeau para evitar discrepancias de hidratación SSR, introduciendo una pantalla de carga y esqueleto premium durante la sincronización inicial.
- **Saneamiento Estático y Mantenibilidad de Fallow**: Saneamos la complejidad del grafo clásico (`computeGraph` en `CommitGraph.tsx` simplificada) y modularizamos la hidratación de preferencias en `use-git-actions.ts` hacia helpers modulares independientes, logrando una reducción del 90% en su complejidad cognitiva y elevando el *Maintainability Score* global del proyecto al **90.0% ("Good")**.
- **Spanish and English UI strings**.

### 🟣 Vista Cronométrica (Chronometric View) - En Desarrollo / Experimental

- *Esta sección documenta de forma aislada las características de la Vista Cronométrica para evitar conflictos de mezcla al trabajar en ramas de desarrollo paralelo (`feature/cronometric`).*
- **Línea de tiempo cronométrica avanzada**: (Desarrollo en paralelo) Permite visualizar la evolución histórica de las ramas alineadas a su estampa de tiempo real, mejorando la comprensión visual de mezclas y bifurcaciones concurrentes.
- **Navegación temporal interactiva**: Controles para filtrar y enfocar períodos de actividad específicos, útiles en repositorios con alta densidad de commits diarios.
- **Simplificación Visual y Declutter del HUD**: Remoción de los círculos punteados concéntricos de radar de fondo y los marcos de esquinas neón decorativos, logrando una interfaz cronométrica inmersiva minimalista y despejada de tipo "Full Bleed" que prioriza el árbol de commits.
- **Máscara en Curva Bézier de Precisión (Solid Curved Bézier Backing Mask)**: La máscara de ocultación se rediseñó por completo utilizando curvas Bézier cúbicas (`C`) en lugar de segmentos poligonales rígidos. Esto genera una silueta perfectamente circular, fluida y orgánica que calza al milímetro con el arco del SVG LCARS decorativo de la consola.
- **Enmascarado con Degradado sobre el Grafo (Linear Gradient Canvas Masking)**: Implementamos un `mask-image` de CSS con degradado lineal directamente en el lienzo del grafo (`components/ChronometricGraph.tsx`), haciendo que los timelines y commits se desvanezcan suavemente a transparente (entre `370px` y `220px` antes del borde derecho) antes de tocar el panel técnico.
- **Bordes y Esquinas Ultra-Nítidos (No Bleeding/Fog)**: Eliminamos la neblina decorativa y los filtros de blureo que se desbordaban en los bordes de la pantalla. El fondo TCAR y su máscara son 100% vectoriales, sólidos y perfectamente nítidos, logrando que el grafo parezca "fundirse en el aire" antes de pasar detrás de la consola física.
- **Visualización Condicional por Contexto (Context-Aware UI Mounting)**: El panel decorativo e interactivo LCARS ahora solo se monta en el DOM si el usuario se encuentra activamente en la solapa de **`Graph`** y no hay ningún visualizador de Diff de archivos o Pull Request abierto. Esto garantiza que las solapas de **Commit**, **History** y los visores de código se muestren limpios de punta a punta sin ninguna obstrucción.

---

## Architecture

Renderer:

- `app/page.tsx` drives the main three-column UI, tabs, modals, and topbar.
- `components/CommitGraph.tsx` renders the SVG graph and graph-table rows.
- `components/DiffViewer.tsx` renders unified diffs.
- `hooks/use-git-actions.ts` contains repo actions like commit, push, pull, merge, stash, and preferences persistence.
- `hooks/use-repo-loader.ts` loads repo data and restores persisted repos.
- `lib/git-store.ts` holds the Zustand store.

Main process:

- `electron/main.ts` exposes typed IPC handlers for Git, GitHub, storage, shell, and filesystem actions.
- `electron/preload.ts` exposes the safe renderer bridge via `window.api`.

Data flow:

```text
UI -> hook -> window.api.* -> IPC -> Electron main -> simple-git / Octokit
UI <- Zustand update <- hook / IPC response
```

State model:

- Multi-repo is now first-class in the store.
- `openRepos: RepoState[]` stores the per-repo state.
- `activeRepoIdx: number` points to the visible repo.
- Legacy fields like `repoPath`, `branches`, `commits`, `modifiedFiles`, and `commitMessage` still exist as mirrors of the active repo to keep the rest of the app stable during the transition.

---

## Security

See [SECURITY.md](/C:/www/gitCronos/SECURITY.md) for the full hardening notes. Short version:

- GitHub tokens are stored with Electron `safeStorage` (OS keychain / DPAPI / libsecret).
- Push / pull / fetch auth uses a process-scoped `http.https://github.com/.extraheader` authorization header instead of changing `origin`, so token-bearing remote URLs are not written to `.git/config`.
- Every token-authed git op runs with `-c safe.allowUnsafeCredentialHelper=true -c credential.helper= -c core.askpass=` plus `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=never`, so the auth'd operation never gets cached in the OS credential store. `safe.allowUnsafeCredentialHelper=true` is required by git-for-windows ≥2.40, while `simple-git` also needs its own `unsafe.allowUnsafeCredentialHelper` / `unsafe.allowUnsafeAskPass` options before it will pass those `-c` overrides through. The earlier `GIT_CONFIG_GLOBAL` temp-file approach (≤v1.1.4) was replaced because git-for-windows also blocks unsafe config paths.
- `BrowserWindow` runs with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and explicit `webSecurity: true`.
- Content-Security-Policy is strict in production builds (`'unsafe-eval'` and `localhost` connect-src are dev-only).
- Error messages are sanitized before logging or returning to the renderer — token-bearing URLs from git CLI output get redacted via `sanitizeForLog()`.
- Child processes use `shell: false` with arg arrays (no command injection surface).
- Filesystem actions validate repo boundaries via `path.relative()` and use `lstatSync()` + `isFile()` guards to avoid path traversal and symlink-escape attacks.
- `pnpm audit` reports zero known vulnerabilities (postcss CVE pinned via workspace override).

---

## Development

Requirements:

- Node.js 22+
- pnpm recommended
- Git available in `PATH`

Setup:

```bash
git clone <repo>
cd gitCronos
pnpm install
```

Run in development:

```bash
pnpm run electron:dev
```

Notes:

- Do not use `npm run dev` for normal app work. That only starts Next.js without Electron.
- Changes in `electron/main.ts` or `electron/preload.ts` require a full restart.
- React-side changes hot reload normally.

Type check:

```bash
./node_modules/.bin/tsc.cmd --noEmit
```

---

## Project structure

```text
gitCronos/
|- app/
|  |- layout.tsx
|  |- page.tsx
|  `- globals.css
|- components/
|  |- CommitGraph.tsx
|  `- DiffViewer.tsx
|- electron/
|  |- main.ts
|  `- preload.ts
|- hooks/
|  |- use-git-actions.ts
|  |- use-repo-loader.ts
|  `- use-translation.ts
|- lib/
|  |- git-store.ts
|  |- i18n.ts
|  `- utils.ts
|- types/
|  `- electron.d.ts
|- SECURITY.md
|- CHANGELOG.md
`- README.md
```

---

## Design system & CSS Tokenization

"The Compiled Soul" design system has been fully tokenized inside [globals.css](file:///c:/www/gitcron/app/globals.css) using Tailwind CSS v4 `@theme` and `@utility` rules:

* **Core Base Tokens**:
  - Deep Navy Base Background (`--color-bg-base`): `#020f1e`
  - Core Surface Panel (`--color-bg-surface`): `#06182a`
  - Overlay Dialog Card Backdrop (`--color-bg-overlay`): `#12273c`
  - Muted Secondary Text (`--color-text-secondary`): `#9eacc0`
  - Primary Active Title Text (`--color-text-primary`): `#d9e7fc`
  - Accent Brand Cyan (`--color-primary`): `#5ed8ff`
  - Neon Green HEAD Highlight (`--color-secondary`): `#a3f185`
  - Conflict Warning Orange (`--color-git-mod`): `#fd9d1a`
  - Error/Delete Count Red (`--color-error`): `#ff716c`

* **Advanced Glassmorphism Utilities**:
  - `glass-overlay`: Unified blurred glass overlay for dialogs, context menus, and tooltips.
  - `glass-header`: Glass top titlebar/toolbar separator.
  - `glass-sticky-header`: Pinned list categorizer bars.
  - `glass-alert-success` / `glass-alert-warning` / `glass-alert-error`: Semantically themed notification toast overlays.

> [!IMPORTANT]
> **Namespace Division Reference (For future AI agents):**
> There is a strict architectural split in the token design system located inside `app/globals.css`:
> 1. **Shared / Global Tokens:** Core typography, spacing, border radiuses, and glass filters affecting layouts, popovers, and dialogs.
> 2. **Classic Specific Tokens** (`components/CommitGraph.tsx`): Focuses on the dynamic commit lane color palette (`--color-graph-branch-1` to `--color-graph-branch-12`) and classic HEAD indicators (`--color-secondary`).
> 3. **Cronometric Specific References** (`components/ChronometricGraph.tsx`): Focuses on Canvas timeline color mapping (grid ticks, outer WIP orbits, stash decks). All canvas shapes reference these tokens under the hood, ensuring the timeline engine can be customized independently.

---

## Single-Branch Workflow & Feature Flags

To ensure rapid, secure development without branch drifts or versioning mismatches, GitCron operates under a **Trunk-Based Development** model with **Feature Flags** (Feature Toggles):

1. **Developing under a Flag**: Any experimental feature (like the advanced Cronometric timeline canvas, interactive HUD satellites, or floating sidebars) must be wrapped inside a conditional block using the `enableCronometric` global state:
   ```tsx
   const enableCronometric = useGitStore((s) => s.enableCronometric);
   
   return enableCronometric ? <ChronometricLayout /> : <ClassicLayout />;
   ```
2. **Local Testing**: During development, turn the feature flag **On** using the interactive toggle in Settings (Settings Modal -> Vista Cronométrica (Beta) -> Activa).
3. **Safe Deployments**: The feature flag is turned **Off** by default in production. This guarantees that unstable features cannot crash the stable Classic view since React will never mount or execute the experimental components.
4. **Gradual Rollout**: When the feature is 100% stable, perform a single change to swap the default store state to `true` or expose it permanently to all users.

---

## Styling Best Practices (Conflict Prevention)

Since the Classic and Cronometric views share the same global file and base variables, we enforce strict styling boundaries to avoid visual collisions (e.g. overlapping panels, distorted text sizes, or unexpected margins):

1. **Strict CSS Namespacing**: Custom Tailwind v4 variables inside [globals.css](file:///c:/www/gitcron/app/globals.css) must live in labeled, commented block namespaces (`Shared / Global`, `Classic Specific`, `Cronometric Specific`).
2. **Prefixing Variable Names**: Any color, size, animation, or opacity unique to the timeline canvas view must use the `--crono-` or `--cronometric-` prefix. Never override a base token like `--color-bg-surface` directly for experimental changes.
3. **Isolated Layout Shells**:
   * **Classic Layout**: Rectangular panel columns flush against each other, with rigid col-resize handles.
   * **Cronometric Layout**: Absolute-positioned floating panels with micro-margins (`FLOATING_PANEL_INSET`), glass backgrounds, and rounded corners.
   * *Never mix layout classes directly*. Keep them fully isolated inside `<ClassicLayoutShell>` and `<ChronometricLayoutShell>` to prevent margin/padding spillover.
4. **CSS Dead-Code Elimination (Tailwind Compiler)**: During compilation (`npm run build`), Tailwind scans your active JSX files. If a component is commented out or deleted, its matching custom classes are automatically purged from the production CSS bundle.

---

## Roadmap

### 🟢 Core & Vista Clásica (Classic View) - Estable

#### Tier 1

- [x] Auto-fetch in the background with configurable intervals.
- [x] Default folder for open / clone dialogs.
- [x] Filter graph commits by branch.

#### Tier 2

- [x] Electron builder packaging — Windows (NSIS), macOS (DMG), Linux (AppImage).
- [ ] Windows / macOS code signing.
- [x] Auto-update flow.

#### Tier 3

- [x] OS notifications for long push / pull operations.
- [x] Configurable keyboard shortcuts.
- [x] Light theme (experimental).

#### Future / Reciente

- [x] Amend last commit (v0.1.7).
- [x] Cherry-pick from context menu (v0.1.7).
- [x] Squash last N commits (v1.0.0).
- [ ] Multi-account GitHub support.
- [ ] GitLab / Bitbucket support.
- [x] Pull request diff view (v1.2.0).
- [ ] Interactive rebase (reorder / drop / reword).
- [x] Remote branch checkout (v1.3.7).
- [x] Premium Conflict Resolver Card (v1.3.7).
- [x] Agrupamiento recursivo de ramas en el sidebar (v1.3.7).
- [ ] Local AI via LM Studio for commit messages, changelog drafting, project-history notes, and other offline writing helpers.
- [ ] Upgrade Next.js beyond 15.4.x (currently pinned — verify Electron + Tailwind 4 compatibility before bumping).
- [x] Remove token-bearing temporary `origin` URLs from authenticated Git operations (v1.2.0).

---

### 🟣 Vista Cronométrica (Chronometric View) - En Desarrollo / Experimental

#### Core & Timeline Engine
- [ ] Representación visual alternativa de los commits enfocada en su estampa temporal real.
- [ ] Navegación temporal interactiva para filtrar períodos de actividad específicos.
- [ ] Diseño responsivo y fluidas micro-animaciones en la línea de tiempo.
- [ ] Comparación de ramas y estados históricos alineados cronológicamente.

---

## Installation

Download the latest release from [GitHub Releases](https://github.com/alejandropd-1/gitcron/releases).

| Platform | File                                                                  |
| -------- | --------------------------------------------------------------------- |
| Windows  | `GitCron Setup 1.6.4.exe`                                             |
| macOS    | `GitCron-1.6.4.dmg` _(build on macOS with `pnpm package:mac`)_        |
| Linux    | `GitCron-1.6.4.AppImage` _(build on Linux with `pnpm package:linux`)_ |

> **Note:** Installers are not code-signed. Windows will show a SmartScreen warning — click **"More info" → "Run anyway"** to proceed.

---

## Auto-update

GitCron checks for updates silently 3 seconds after the main window appears and then keeps checking every 30 minutes while the app is open. If a new version is available on [GitHub Releases](https://github.com/alejandropd-1/gitcron/releases), a dot appears on the version tag in the topbar. Clicking the tag opens an in-app dropdown with the new version and a download action. Download progress appears beside the GitHub releases icon, and an `UPDATE` button appears there once the update is ready to install.

Settings -> _Buscar actualizaciones_ / _Check for updates_ also shows **Cambios recientes** / **Recent changes**, sourced from the packaged `CHANGELOG.md`. The newest entry is expanded by default, previous versions are collapsible, and the full GitHub Releases page remains one click away for technical release details.

- **No update:** no dialog, no toast for silent background checks.
- **Manual check:** open Settings -> _Buscar actualizaciones_ / _Check for updates_, or click the version tag.
- **Platforms:** Windows (NSIS) and Linux (AppImage) auto-update without code signing. macOS auto-update is inactive until the app is signed.
- **Dev mock:** set `NEXT_PUBLIC_MOCK_UPDATE=1` before `pnpm run electron:dev` to preview the update dot, dropdown, progress bar, and `UPDATE` button without publishing a release.

---

## Publishing a release

Requirements: `GH_TOKEN` env var with permission to create GitHub Releases and upload assets. For this public repo, `public_repo` is enough for a classic token; `repo` also works.

Before publishing:

- Bump `package.json`.
- Add a top entry in `CHANGELOG.md`.
- Update the current version and security notes in this README and `SECURITY.md` when behavior changed.
- Run `./node_modules/.bin/tsc.cmd --noEmit`, `pnpm run build:electron`, and `pnpm audit --audit-level moderate`.

```bash
# Windows
pnpm publish:win

# macOS  (must build on macOS)
pnpm publish:mac

# Linux
pnpm publish:linux
```

`electron-builder` uploads a draft release to GitHub. Publish it manually from the GitHub Releases page after verifying the installer. The `latest.yml` / `latest-mac.yml` / `latest-linux.yml` metadata files must be included in the release for auto-update to work.

After publishing, install the update from GitCron and run one authenticated push from the app to validate the release path.

---

## Current version

- **Core & Vista Clásica (Estable)**: `v1.6.4` - ver [CHANGELOG.md](/CHANGELOG.md) para más detalles.
- **Vista Cronométrica (Beta)**: *(Integrada bajo Feature Flag en la rama principal — Activar desde Ajustes)*

---

## License

No formal open-source license has been published yet. Treat the code as source-available until a license is added.
