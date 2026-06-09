// electron/ipc/shell.ts
// Handlers shell:* / terminal:open / fs:delete-file — integración con el SO.
// Todo lo que abre programas externos o toca disco fuera de git vive acá.

import { ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { errMsg } from './shared';

export function registerShellHandlers(): void {
  // ── Show a file in OS file explorer (highlights it) ──
  ipcMain.handle('shell:show-in-folder', async (_event, targetPath: string, relativeFilePath: string) => {
    try {
      const fullPath = path.join(targetPath, relativeFilePath);
      shell.showItemInFolder(fullPath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  // ── Open a file with the OS default program ──
  ipcMain.handle('shell:open-item', async (_event, targetPath: string, relativeFilePath: string) => {
    try {
      const fullPath = path.join(targetPath, relativeFilePath);
      const err = await shell.openPath(fullPath);
      if (err) return { success: false, error: err };
      return { success: true };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  // ── Delete a file from disk (rejects directory traversal) ──
  ipcMain.handle('fs:delete-file', async (_event, targetPath: string, relativeFilePath: string) => {
    try {
      // Defensive: keep us inside the repo dir. Use path.relative to detect
      // both ".." traversal and absolute paths that resolve outside the root.
      const repoRoot = path.resolve(targetPath);
      const resolved = path.resolve(repoRoot, relativeFilePath);
      const rel = path.relative(repoRoot, resolved);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        return { success: false, error: 'Path traversal blocked' };
      }

      // TOCTOU-resistant delete: use lstat (no symlink follow) + check it's a
      // regular file, then unlink. We accept a tiny race window between lstat
      // and unlink but never follow a symlink that could point outside the repo.
      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(resolved);
      } catch {
        return { success: false, error: 'El archivo ya no existe' };
      }
      if (!stat.isFile()) {
        // Refuse to delete directories, symlinks, sockets, etc.
        return { success: false, error: 'Solo se pueden eliminar archivos comunes' };
      }
      fs.unlinkSync(resolved);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('terminal:open', async (_event, targetPath: string) => {
    // Security: use spawn with arg array (not exec with shell-string) to prevent
    // command injection. The path is passed as a discrete argument, never interpolated.
    try {
      // Defensive: make sure the path actually exists and is a directory
      if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
        return { success: false, error: 'El directorio del repo no existe' };
      }

      const spawnOpts = { detached: true, stdio: 'ignore' as const, shell: false };

      if (process.platform === 'win32') {
        // Try Windows Terminal first, fallback to cmd via 'cwd' option
        const wt = spawn('wt.exe', ['-d', targetPath], spawnOpts);
        wt.on('error', () => {
          const cmd = spawn('cmd.exe', [], { ...spawnOpts, cwd: targetPath });
          cmd.unref();
        });
        wt.unref();
      } else if (process.platform === 'darwin') {
        const child = spawn('open', ['-a', 'Terminal', targetPath], spawnOpts);
        child.unref();
      } else {
        const child = spawn('x-terminal-emulator', [], { ...spawnOpts, cwd: targetPath });
        child.unref();
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('shell:open-path', async (_event, targetPath: string) => {
    try {
      await shell.openPath(targetPath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    try {
      if (!/^https?:\/\//i.test(url)) {
        return { success: false, error: 'Only http(s) URLs allowed' };
      }
      await shell.openExternal(url);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });
}
