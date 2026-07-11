// electron/ipc/watchers.ts
// File-system watchers: watch a repo directory for working-tree changes so the
// renderer can refresh the UNSTAGED panel without requiring a manual git action.

import { BrowserWindow, ipcMain } from 'electron';
import chokidar, { FSWatcher } from 'chokidar';
import { errMsg } from './shared';

const repoWatchers = new Map<string, FSWatcher>();
const watcherOperations = new Map<string, Promise<void>>();

const IGNORED_PATTERNS = [
  /(^|[/\\])\.git([/\\]|$)/,
  /(^|[/\\])node_modules([/\\]|$)/,
  /(^|[/\\])\.next([/\\]|$)/,
  /(^|[/\\])dist([/\\]|$)/,
  /(^|[/\\])release([/\\]|$)/,
  /(^|[/\\])out([/\\]|$)/,
];

function enqueueWatcherOperation<T>(targetPath: string, operation: () => Promise<T> | T): Promise<T> {
  const previous = watcherOperations.get(targetPath) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  const settled = next.then(() => undefined, () => undefined);
  watcherOperations.set(targetPath, settled);
  void settled.finally(() => {
    if (watcherOperations.get(targetPath) === settled) watcherOperations.delete(targetPath);
  });
  return next;
}

export function registerWatcherHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('repo:watch', (_event, targetPath: string) => (
    enqueueWatcherOperation(targetPath, () => {
      if (repoWatchers.has(targetPath)) return { success: true };
      try {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const watcher = chokidar.watch(targetPath, {
          ignored: IGNORED_PATTERNS,
          ignoreInitial: true,
          persistent: true,
          awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
        });
        const emit = () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            getMainWindow()?.webContents.send('repo:fs-change', { repoPath: targetPath });
          }, 250);
        };
        watcher.on('add', emit).on('change', emit).on('unlink', emit)
               .on('addDir', emit).on('unlinkDir', emit);
        repoWatchers.set(targetPath, watcher);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: errMsg(error) };
      }
    })
  ));

  ipcMain.handle('repo:unwatch', (_event, targetPath: string) => (
    enqueueWatcherOperation(targetPath, async () => {
      const watcher = repoWatchers.get(targetPath);
      if (watcher) {
        await watcher.close();
        repoWatchers.delete(targetPath);
      }
      return { success: true };
    })
  ));
}

/** Close every active watcher. Called from app 'before-quit'. */
export async function closeAllRepoWatchers(): Promise<void> {
  await Promise.allSettled([...watcherOperations.values()]);
  for (const [, watcher] of repoWatchers) {
    await watcher.close().catch(() => {});
  }
  repoWatchers.clear();
  watcherOperations.clear();
}
