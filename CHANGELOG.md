# Changelog - GitCron

Changes are listed from newest to oldest.

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
