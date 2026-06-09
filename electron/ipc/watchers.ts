// electron/ipc/watchers.ts
// File-system watchers: watch a repo directory for working-tree changes so the
// renderer can refresh the UNSTAGED panel without requiring a manual git action.

import { BrowserWindow, ipcMain } from 'electron';
import chokidar, { FSWatcher } from 'chokidar';
import { errMsg } from './shared';

const repoWatchers = new Map<string, FSWatcher>();

const IGNORED_PATTERNS = [
  /(^|[/\\])\.git([/\\]|$)/,
  /(^|[/\\])node_modules([/\\]|$)/,
  /(^|[/\\])\.next([/\\]|$)/,
  /(^|[/\\])dist([/\\]|$)/,
  /(^|[/\\])release([/\\]|$)/,
  /(^|[/\\])out([/\\]|$)/,
];

export function registerWatcherHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('repo:watch', (_event, targetPath: string) => {
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
  });

  ipcMain.handle('repo:unwatch', async (_event, targetPath: string) => {
    const watcher = repoWatchers.get(targetPath);
    if (watcher) {
      await watcher.close();
      repoWatchers.delete(targetPath);
    }
    return { success: true };
  });
}

/** Close every active watcher. Called from app 'before-quit'. */
export async function closeAllRepoWatchers(): Promise<void> {
  for (const [, watcher] of repoWatchers) {
    await watcher.close().catch(() => {});
  }
  repoWatchers.clear();
}
