# GitCron - Advanced Git Client

Desktop Git client built with modern web tooling. GitCron is meant to cover a personal GitKraken-like workflow without a subscription, with a strong focus on visual history, safe Git operations, and GitHub integration.

<p align="center">
  <img alt="GitCron version" src="https://img.shields.io/badge/GitCron-v1.4.4-fd9d1a?style=for-the-badge&amp;labelColor=2c3440">
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

### Repositories

- Open any existing Git repo from a native OS dialog.
- Create a new repo locally, including **intelligent initialization inside non-empty folders** without losing files or overwriting local content.
- Automatic **GitHub collision rescue**: when creating a local repository and selecting "Crear también en GitHub", if the repository already exists on GitHub, GitCron dynamically retrieves its remote URL and configures it seamlessly as `origin`.
- Clone from any Git URL or from your GitHub repos.
- Create a GitHub repo and clone it in one flow.
- Multi-repo tabs: keep several repos open at once.
- Restore open repos and the active tab automatically on app launch.
- Use the `+` tab action to open the same central chooser for open / create / clone.

### History and graph

- SVG commit graph with stable branch colors.
- Current branch always highlighted in neon green.
- Branch / tag chips with local, remote, tag, and current-state cues. Long names truncate with ellipsis; commits with more than 3 refs show a `+N` badge.
- Filter toggle in the graph header: **All branches** (default) or **Current branch** (`git log` without `--all`). State is per-repo tab.
- WIP row at the top when the working tree is dirty.
- History tab for a flat chronological view.
- Commit tab for a staging-focused workflow summary.
- **Vista Cronométrica (Chronometric View)**: Alternative diagonal visual layout that charts commits along a temporal 2D canvas, using a visually striking ascending slope of ~40.4° (`DEFAULT_CHRONOMETRIC_SLOPE = 0.85`) to portray a dynamic chronological HUD. Powered by a hybrid scaling algorithm (**30% linear physical time, 70% sequential logical index**) to balance temporal perception with collision-free readability. Connector lines flow in organic tangent Bézier curves, branching lanes fan out symmetrically towards the present, and timeline grids render dynamically. SVG canvas height scales dynamically with width to maintain a constant visual incline, and the state is persisted per-repository.
- **Navegación Canvas en Vista Cronométrica (Pan & Zoom)**: Infinite 2D interactive viewport for the Chronometric View. Left-click and drag anywhere on the canvas to pan smoothly. Use the mouse wheel to zoom in and out, mathematically anchored to the exact cursor position (clamped between `0.25x` and `3.5x` scale). Features automatic bounds clamping to prevent the graph from sliding off-screen, and dynamic viewport auto-centering that instantly focuses the timeline on mount, repo switch, or filter changes.
- **Dynamic Floating Hover Cards**: Commitment details float cleanly over the active hovered node. Using mathematical projection, card positions are updated instantly as you pan and zoom, clamped against container boundaries to prevent off-screen truncation.
- **Instrumentación Semántica HUD (TCARS Layout)**: Modern vector-based telemetry overlays that visually resolve Git entities. Incorporates a symmetrical staggered label system (alternating 32px and 72px offsets) to eliminate text overlaps, displays branch origin indicators as external floating triangles (20px-28px offset), and projects Git tags as top-left satellite badges while keeping commit metadata on the bottom-right.
- **HUD / Shell TCARS System (C2 Block)**: Wraps the panned canvas inside static, curved SVG borders, orbital tactical arcs, degree ticks, and coordinates. Operates four absolute HUD panels (Navigation System, Sync & Dirty Telemetry, Chrono Metrics & Radar, and Target Telemetry with locking reticle) running smoothly at 60+ FPS on a completely decoupled overlay layer with controlled, slow-breathing animations.
- **Distribución de Comentarios Consistente por Rama (Symmetrical Wing Alignment)**: Commits on lateral branches are grouped cleanly on a single side (left for left-splitting branches, right for right-splitting branches, and stable hashed wings for `lane = 0` checked-out lateral branches) to achieve consistent side visual alignment, preserving alternating symmetry only for the main trunk (`main`/`master`).
- **Badge Inline de Origen de Rama (Branch Segment Origin Tags)**: Renders a high-fidelity, styled branch origin tag (e.g. `FEATURE/TCARS-HUD-SHELL`) immediately to the left of the comment text for the first commit of any lateral branch segment, with dynamic text-shifting and clean padding.
- **Propagación Retroactiva de Nombres de Rama**: Employs a lane-aware backward propagation algorithm (`commitBranchNames`) to map branch names from tips to origin commits along the first-parent line, guaranteeing exact branch metadata on all nodes.
- **Discrete Floating Navigation Controls**: Low-profile, sleek buttons (`+`, `-`, `Reset`) in the bottom-right corner for quick mouse-click zooming and viewport resetting, keeping classic mode perfectly intact without visual clutter.


### Staging and commits

- Separate unstaged and staged sections.
- **Auto-refresh of the UNSTAGED panel** when files change on disk: a `chokidar` watcher in the main process emits `repo:fs-change` over IPC (debounced 250 ms in main + 150 ms in renderer). A window `focus` listener provides a fallback when the watcher misses an event. Watches ignore `.git`, `node_modules`, `.next`, `dist`, `release`, and `out`.
- Batch stage / unstage to avoid `index.lock` races.
- Diff viewer for staged and unstaged files.
- Real commits with author, date, refs, and commit details. Clicking a commit shows the files changed **in that commit** with colored status badges (A/M/D/R) and per-file diffs.
- Amend last commit: reword the message or fold staged changes into the previous commit, with a warning if the commit was already pushed.
- Squash last N commits (2–5) into one with a custom message.
- Reset all with confirmation.
- Recovery action for `index.lock` errors.

### Branches

- Branch tree grouped by prefixes like `feature/` or `claude/`.
- Ahead / behind counts in the sidebar.
- Ahead / behind chips now explain themselves on hover, and Pull / Push open a decision toast when the current branch is behind or diverged.
- **Premium Force Push workflow**: when pushing a branch whose history has diverged from the remote (e.g., during initialization/pushes of overlapping repos), GitCron displays a beautifully styled, high-priority React overlay modal (`z-[300]`) requesting explicit permission before executing a safe `--force` push.
- Checkout with conflict detection.
- Merge, rebase, fast-forward, rename, delete, and create branch flows.
- Cherry-pick a single commit onto the current branch from the commit context menu, with conflict-aware feedback.
- Per-file stash and full working-tree stash.
- Clear-all stash action with confirmation.

### GitHub

- OAuth Device Flow login, similar to `gh auth login`.
- Manual personal access token fallback.
- Authenticated push / pull / fetch via a process-scoped GitHub authorization header, without writing token-bearing `origin` URLs.
- Automatic `--set-upstream` on the first push of a new branch.
- Pull requests list in the sidebar for the current repo, with an in-app unified diff view.
- Private repo clone support after login.

### UX

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
- Startup polish: the Electron splash now shows the GitCron icon with subtle geometric animation, stays visible long enough to avoid first-paint flicker, and the Graph fades in after initial repo data is ready.
- Spanish and English UI strings.

---

## Architecture

Renderer:

- `app/page.tsx` drives the main three-column UI, tabs, modals, and topbar.
- `components/CommitGraph.tsx` renders the SVG graph and graph-table rows.
- `components/ChronometricGraph.tsx` renders the custom diagonal SVG chronological graph with the interactive infinite canvas and floating controls.
- `components/DiffViewer.tsx` renders unified diffs.
- `hooks/use-git-actions.ts` contains repo actions like commit, push, pull, merge, stash, and preferences persistence.
- `hooks/use-canvas-viewport.ts` manages gesture listeners, active mouse-drag cycles, non-passive wheel events, and dynamic viewport bounds containment for the canvas layout.
- `hooks/use-repo-loader.ts` loads repo data and restores persisted repos.
- `lib/git-store.ts` holds the Zustand store.
- `lib/chronometric-projection.ts` implements the mathematical hybrid time-index projection, diagonal vectors, and branching fanning algorithms.
- `lib/canvas-viewport.ts` implements pure coordinate transforms (`screenToWorld`, `worldToScreen`) and cursor-anchored zoom calculations for the infinite viewport.


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
|  |- ChronometricGraph.tsx
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
|  |- chronometric-projection.ts
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

## Design system

"The Compiled Soul" uses:

- Deep navy base: `#020f1e`
- Primary neon green: `#a3f185`
- Warning orange: `#fd9d1a`
- Accent cyan: `#5ed8ff`
- Glassy headers and modals
- Soft tonal separation instead of heavy borders
- Inter for UI and JetBrains Mono for code-ish surfaces

---

## Roadmap

### Tier 1

- [x] Auto-fetch in the background with configurable intervals.
- [x] Default folder for open / clone dialogs.
- [x] Filter graph commits by branch.

### Tier 2

- [x] Electron builder packaging — Windows (NSIS), macOS (DMG), Linux (AppImage).
- [ ] Windows / macOS code signing.
- [x] Auto-update flow.

### Tier 3

- [x] OS notifications for long push / pull operations.
- [x] Configurable keyboard shortcuts.
- [x] Light theme (experimental).

### Future

- [x] Amend last commit (v0.1.7).
- [x] Cherry-pick from context menu (v0.1.7).
- [x] Squash last N commits (v1.0.0).
- [ ] Multi-account GitHub support.
- [ ] GitLab / Bitbucket support.
- [x] Pull request diff view (v1.2.0).
- [ ] Interactive rebase (reorder / drop / reword).
- [ ] Visual conflict resolver for merge/rebase: compare both sides of a conflicted file and accept A / B per block before writing the merged result.
- [ ] Local AI via LM Studio for commit messages, changelog drafting, project-history notes, and other offline writing helpers.
- [ ] Upgrade Next.js beyond 15.4.x (currently pinned — verify Electron + Tailwind 4 compatibility before bumping).
- [x] Remove token-bearing temporary `origin` URLs from authenticated Git operations (v1.2.0).

---

## Installation

Download the latest release from [GitHub Releases](https://github.com/alejandropd-1/gitcron/releases).

| Platform | File                                                                  |
| -------- | --------------------------------------------------------------------- |
| Windows  | `GitCron Setup 1.4.4.exe`                                             |
| macOS    | `GitCron-1.4.4.dmg` _(build on macOS with `pnpm package:mac`)_        |
| Linux    | `GitCron-1.4.4.AppImage` _(build on Linux with `pnpm package:linux`)_ |

> **Note:** Installers are not code-signed. Windows will show a SmartScreen warning — click **"More info" → "Run anyway"** to proceed.

---

## Auto-update

GitCron checks for updates silently 3 seconds after the main window appears and then keeps checking every 30 minutes while the app is open. If a new version is available on [GitHub Releases](https://github.com/alejandropd-1/gitcron/releases), a dot appears on the version tag in the topbar. Clicking the tag opens an in-app dropdown with the new version and a download action. Download progress appears beside the GitHub releases icon, and an `UPDATE` button appears there once the update is ready to install.

- **No update:** no dialog, no toast for silent background checks.
- **Manual check:** open Settings → _Buscar actualizaciones_ / _Check for updates_, or click the version tag.
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

`v1.4.4` - see [CHANGELOG.md](/C:/www/gitCronos/CHANGELOG.md) for recent changes.

---

## License

No formal open-source license has been published yet. Treat the code as source-available until a license is added.
