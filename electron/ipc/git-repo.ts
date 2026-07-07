// electron/ipc/git-repo.ts
// Apertura / creación / clonado de repositorios + diálogos de carpeta.

import { dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { simpleGit } from 'simple-git';
import type { RepoInfo } from '../../types/electron';
import {
  errMsg, getGitHubAuthOptions, getNoPromptEnv,
  normalizeSafeDirectoryPath, repoAccessErrMsg,
} from './shared';

function notARepoResult(targetPath: string) {
  return {
    success: false,
    ok: false,
    reason: 'not-a-repo' as const,
    path: targetPath,
    error: `"${path.basename(targetPath)}" no es un repositorio git`,
  };
}

export function registerGitRepoHandlers(): void {
  // ── Open a specific path directly (no dialog) — used to restore last repo ──
  ipcMain.handle('git:open-path', async (_event, dirPath: string) => {
    try {
      if (!fs.existsSync(dirPath)) {
        return { success: false, error: `La carpeta ya no existe: ${dirPath}` };
      }
      const testGit = simpleGit(dirPath);
      const isRepo = await testGit.checkIsRepo();
      if (!isRepo) {
        return notARepoResult(dirPath);
      }
      const status = await simpleGit(dirPath).status();
      const info: RepoInfo = {
        path: dirPath,
        name: path.basename(dirPath),
        currentBranch: status.current ?? 'HEAD',
        isGitRepo: true,
      };
      return { success: true, data: info };
    } catch (error: any) {
      return { success: false, error: repoAccessErrMsg(error, dirPath) };
    }
  });

  ipcMain.handle('git:open-repo', async (_event, defaultPath?: string) => {
    let selectedPath = '';
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Seleccionar repositorio Git',
        defaultPath: defaultPath || undefined,
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No se seleccionó ninguna carpeta' };
      }

      selectedPath = result.filePaths[0];
      const testGit = simpleGit(selectedPath);
      const isRepo = await testGit.checkIsRepo();

      if (!isRepo) {
        return notARepoResult(selectedPath);
      }

      const status = await simpleGit(selectedPath).status();
      const repoInfo: RepoInfo = {
        path: selectedPath,
        name: path.basename(selectedPath),
        currentBranch: status.current ?? 'HEAD',
        isGitRepo: true,
      };
      return { success: true, data: repoInfo };
    } catch (error: any) {
      return { success: false, error: selectedPath ? repoAccessErrMsg(error, selectedPath) : errMsg(error) };
    }
  });

  ipcMain.handle('git:trust-safe-directory', async (_event, targetPath: string) => {
    try {
      if (!targetPath || typeof targetPath !== 'string') {
        return { success: false, error: 'Ruta de repositorio invalida' };
      }

      const resolvedPath = path.resolve(targetPath);
      if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
        return { success: false, error: `La carpeta ya no existe: ${targetPath}` };
      }

      const gitMarker = path.join(resolvedPath, '.git');
      if (!fs.existsSync(gitMarker)) {
        return { success: false, error: `"${path.basename(resolvedPath)}" no parece un repositorio git` };
      }

      const safePath = normalizeSafeDirectoryPath(resolvedPath);
      await simpleGit().raw(['config', '--global', '--add', 'safe.directory', safePath]);
      return { success: true, data: { path: safePath } };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  // ─── Pick a folder (any folder, doesn't have to be a repo) ─────────────
  ipcMain.handle('fs:pick-folder', async (_event, title?: string, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: title ?? 'Seleccionar carpeta',
      defaultPath: defaultPath || undefined,
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'No se seleccionó carpeta' };
    }
    return { success: true, data: result.filePaths[0] };
  });

  ipcMain.handle('fs:exists-and-not-empty', async (_event, parentPath: string, name: string) => {
    try {
      const targetPath = path.join(parentPath, name);
      if (!fs.existsSync(targetPath)) {
        return { success: true, data: false };
      }
      const stat = fs.statSync(targetPath);
      if (!stat.isDirectory()) {
        return { success: true, data: false };
      }
      const files = fs.readdirSync(targetPath);
      return { success: true, data: files.length > 0 };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  // ─── Init a brand new repo ─────────────────────────────────────────────
  ipcMain.handle('git:init', async (_event, parentPath: string, name: string, withInitialCommit: boolean = true) => {
    try {
      const repoDir = path.join(parentPath, name);
      if (fs.existsSync(repoDir) && fs.existsSync(path.join(repoDir, '.git'))) {
        return { success: false, error: `La carpeta "${name}" ya es un repositorio de Git` };
      }
      fs.mkdirSync(repoDir, { recursive: true });

      const g = simpleGit(repoDir);
      await g.init(['--initial-branch=main']);

      if (withInitialCommit) {
        const readmePath = path.join(repoDir, 'README.md');
        if (!fs.existsSync(readmePath)) {
          fs.writeFileSync(readmePath, `# ${name}\n\nRepositorio creado con GitCron.\n`);
        }
        const gitignorePath = path.join(repoDir, '.gitignore');
        if (!fs.existsSync(gitignorePath)) {
          fs.writeFileSync(gitignorePath, `node_modules/\n.env\n.DS_Store\nThumbs.db\n`);
        }
        await g.add('.');
        await g.commit('Initial commit');
      }

      const status = await simpleGit(repoDir).status();
      const info: RepoInfo = {
        path: repoDir,
        name: path.basename(repoDir),
        currentBranch: status.current ?? 'main',
        isGitRepo: true,
      };
      return { success: true, data: info };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  // ─── Clone a repo from URL ─────────────────────────────────────────────
  ipcMain.handle('git:clone', async (_event, url: string, parentPath: string, folderName: string, token?: string) => {
    try {
      const destPath = path.join(parentPath, folderName);
      if (fs.existsSync(destPath) && fs.readdirSync(destPath).length > 0) {
        return { success: false, error: `La carpeta "${folderName}" ya existe y no está vacía` };
      }

      const isAuthClone = token && /^https:\/\/github\.com\//i.test(url);
      // Token auth uses an in-process http.extraheader, not a token-bearing URL,
      // so the cloned repo's origin remains the clean HTTPS URL on disk.
      const g = isAuthClone
        ? simpleGit(getGitHubAuthOptions(token)).env(getNoPromptEnv())
        : simpleGit();
      await g.clone(url, destPath);

      const status = await simpleGit(destPath).status();
      const info: RepoInfo = {
        path: destPath,
        name: path.basename(destPath),
        currentBranch: status.current ?? 'HEAD',
        isGitRepo: true,
      };
      return { success: true, data: info };
    } catch (error: any) {
      const isAuth = /authentication|credentials|ssh|permission denied|403|401|could not read|not found/i.test(error.message);
      return { success: false, error: errMsg(error), data: { authRequired: isAuth } };
    }
  });
}
