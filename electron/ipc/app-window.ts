// electron/ipc/app-window.ts
// Auto-updater (electron-updater) + handlers app:* y window:*.
// El estado del updater (check manual vs silencioso, timer periódico) vive acá.

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { autoUpdater } from 'electron-updater';
import { errMsg, sanitizeForLog } from './shared';

let manualUpdateCheck = false;
let updateCheckTimer: ReturnType<typeof setInterval> | null = null;

// ─── Auto-update ──────────────────────────────────────────────────────

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info:  (msg: unknown) => console.log('[updater]', sanitizeForLog(msg)),
    warn:  (msg: unknown) => console.warn('[updater]', sanitizeForLog(msg)),
    error: (msg: unknown) => console.error('[updater]', sanitizeForLog(msg)),
    debug: (_msg: unknown) => {},
    transports: {},
  } as unknown as typeof autoUpdater.logger;

  autoUpdater.on('update-available', (info) => {
    getMainWindow()?.webContents.send('update:available', {
      version: info.version,
      currentVersion: app.getVersion(),
      releaseDate: info.releaseDate,
    });
    manualUpdateCheck = false;
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    const mainWindow = getMainWindow();
    mainWindow?.setProgressBar(pct / 100);
    mainWindow?.webContents.send('update:download-progress', {
      percent: pct,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-not-available', () => {
    if (manualUpdateCheck) {
      getMainWindow()?.webContents.send('update:not-available');
    }
    manualUpdateCheck = false;
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', sanitizeForLog(err));
    if (manualUpdateCheck) {
      getMainWindow()?.webContents.send('update:error', errMsg(err));
    }
    manualUpdateCheck = false;
  });

  autoUpdater.on('update-downloaded', (info) => {
    const mainWindow = getMainWindow();
    mainWindow?.setProgressBar(-1);
    mainWindow?.webContents.send('update:downloaded', {
      version: info.version,
      currentVersion: app.getVersion(),
      releaseDate: info.releaseDate,
    });
  });

  if (!updateCheckTimer) {
    updateCheckTimer = setInterval(() => {
      manualUpdateCheck = false;
      autoUpdater.checkForUpdates().catch((e) =>
        console.error('[updater] scheduled check error:', sanitizeForLog(e))
      );
    }, 30 * 60 * 1000);
  }
}

/** Silent (non-manual) update check — used right after the window first shows. */
export function silentCheckForUpdates(): void {
  manualUpdateCheck = false;
  autoUpdater.checkForUpdates().catch((e) =>
    console.error('[updater] silent check error:', sanitizeForLog(e))
  );
}

/** Stop the periodic update check. Called from app 'before-quit'. */
export function stopUpdateCheckTimer(): void {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
}

export function registerAppWindowHandlers(
  getMainWindow: () => BrowserWindow | null,
  isDev: boolean,
): void {
  ipcMain.handle('app:check-update', async () => {
    if (isDev) return { success: false, error: 'Updater disabled in dev mode' };
    try {
      manualUpdateCheck = true;
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      manualUpdateCheck = false;
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('app:download-update', async () => {
    if (isDev) return { success: false, error: 'Updater disabled in dev mode' };
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('app:install-update', async () => {
    if (isDev) return { success: false, error: 'Updater disabled in dev mode' };
    try {
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('app:get-changelog', async () => {
    try {
      const candidates = [
        path.join(process.cwd(), 'CHANGELOG.md'),
        path.join(process.resourcesPath, 'CHANGELOG.md'),
        path.join(app.getAppPath(), 'CHANGELOG.md'),
        path.join(__dirname, '../../CHANGELOG.md'),
      ];
      const changelogPath = candidates.find((candidate) => fs.existsSync(candidate));
      if (!changelogPath) {
        return { success: false, error: 'CHANGELOG.md no encontrado' };
      }

      return { success: true, data: fs.readFileSync(changelogPath, 'utf-8') };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('window:minimize', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return { success: false, error: 'Window unavailable' };
    mainWindow.minimize();
    return { success: true };
  });

  ipcMain.handle('window:toggle-maximize', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return { success: false, error: 'Window unavailable' };
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return { success: true, data: { maximized: mainWindow.isMaximized() } };
  });

  ipcMain.handle('window:close', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return { success: false, error: 'Window unavailable' };
    mainWindow.close();
    return { success: true };
  });
}
