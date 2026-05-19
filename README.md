# GitCron - Advanced Git Client

Desktop Git client built with modern web tooling. GitCron is meant to cover a personal GitKraken-like workflow without a subscription, with a strong focus on visual history, safe Git operations, and GitHub integration.

---

## Stack

| Layer | Tech |
|---|---|
| UI framework | Next.js 15 |
| UI library | React 19 |
| Desktop runtime | Electron 42 |
| State | Zustand 5 |
| Language | TypeScript 5.9 |
| Git backend | simple-git 3 |
| GitHub API | Octokit REST 22 |
| Styling | Tailwind CSS 4 |
| Motion | Motion |
| Icons | Lucide React |

---

## What GitCron does today

### Repositories
- Open any existing Git repo from a native OS dialog.
- Create a new repo locally.
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
- Checkout with conflict detection.
- Merge, rebase, fast-forward, rename, delete, and create branch flows.
- Cherry-pick a single commit onto the current branch from the commit context menu, with conflict-aware feedback.
- Per-file stash and full working-tree stash.
- Clear-all stash action with confirmation.

### GitHub
- OAuth Device Flow login, similar to `gh auth login`.
- Manual personal access token fallback.
- Authenticated push / pull via temporary URL injection.
- Automatic `--set-upstream` on the first push of a new branch.
- Pull requests list in the sidebar for the current repo.
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
- Spanish and English UI strings.

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
- Push / pull auth uses temporary URL injection because Electron 42 blocks `GIT_ASKPASS` propagation. The token is URL-encoded before injection.
- Every token-authed git op runs with `-c safe.allowUnsafeCredentialHelper=true -c credential.helper= -c core.askpass=` plus `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=never`, so the auth'd URL never gets cached in the OS credential store. `safe.allowUnsafeCredentialHelper=true` is required by git-for-windows ≥2.40, while `simple-git` also needs its own `unsafe.allowUnsafeCredentialHelper` / `unsafe.allowUnsafeAskPass` options before it will pass those `-c` overrides through. The earlier `GIT_CONFIG_GLOBAL` temp-file approach (≤v1.1.4) was replaced because git-for-windows also blocks unsafe config paths.
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
- [ ] Pull request diff view.
- [ ] Interactive rebase (reorder / drop / reword).
- [ ] Upgrade Next.js beyond 15.4.x (currently pinned — verify Electron + Tailwind 4 compatibility before bumping).
- [ ] Pull request diff view.

---

## Installation

Download the latest release from [GitHub Releases](https://github.com/alejandropd-1/gitcron/releases).

| Platform | File |
|---|---|
| Windows | `GitCron Setup 1.0.0.exe` |
| macOS | `GitCron-1.0.0.dmg` *(build with `pnpm package:mac`)* |
| Linux | `GitCron-1.0.0.AppImage` *(build with `pnpm package:linux`)* |

> **Note:** Installers are not code-signed. Windows will show a SmartScreen warning — click **"More info" → "Run anyway"** to proceed.

---

## Auto-update

GitCron checks for updates silently 3 seconds after the main window appears. If a new version is available on [GitHub Releases](https://github.com/alejandropd-1/gitcron/releases), a native dialog asks whether to download it. A second dialog appears once the download finishes, letting you install immediately or on next close.

- **No update:** no dialog, no toast.
- **Manual check:** open Settings → *Buscar actualizaciones* / *Check for updates*.
- **Platforms:** Windows (NSIS) and Linux (AppImage) auto-update without code signing. macOS auto-update is inactive until the app is signed.

---

## Publishing a release

Requirements: `GH_TOKEN` env var with **`repo` scope** (the repository is private).

```bash
# Windows
pnpm publish:win

# macOS  (must build on macOS)
pnpm publish:mac

# Linux
pnpm publish:linux
```

`electron-builder` uploads a draft release to GitHub. Publish it manually from the GitHub Releases page after verifying the installer. The `latest.yml` / `latest-mac.yml` / `latest-linux.yml` metadata files must be included in the release for auto-update to work.

---

## Current version

`v1.1.7` - see [CHANGELOG.md](/C:/www/gitCronos/CHANGELOG.md) for recent changes.

---

## License

Personal-use project for now.
