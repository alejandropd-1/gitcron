// electron/ipc/git-repo.ts
// Apertura / creación / clonado de repositorios + diálogos de carpeta.

import { dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { CheckRepoActions, simpleGit } from 'simple-git';
import type { RepoInfo } from '../../types/electron';
import {
  errMsg, getGitHubAuthOptions, getNoPromptEnv,
  normalizeSafeDirectoryPath, repoAccessErrMsg,
} from './shared';

const OPEN_REPO_TIMEOUT_MS = 15_000;

function openRepoGit(targetPath: string) {
  return simpleGit(targetPath, { timeout: { block: OPEN_REPO_TIMEOUT_MS } });
}

function openRepoErrMsg(error: unknown, targetPath: string): string {
  const message = repoAccessErrMsg(error, targetPath);
  if (/timeout|timed out|block timeout/i.test(message)) {
    return [
      `Git tardó más de ${OPEN_REPO_TIMEOUT_MS / 1000} segundos en revisar "${path.basename(targetPath)}".`,
      'La carpeta puede ser muy grande, estar en una unidad lenta o pertenecer a un repositorio ubicado más arriba.',
      'GitCron canceló la revisión; elegí la carpeta raíz que contiene su propio .git y volvé a intentar.',
    ].join('\n');
  }
  return message;
}

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
      const testGit = openRepoGit(dirPath);
      // `checkIsRepo()` also returns true for any descendant of a repository.
      // GitCron opens repository roots, otherwise `status()` may scan a huge
      // parent tree (for example the entire Windows user profile).
      const isRepo = await testGit.checkIsRepo(CheckRepoActions.IS_REPO_ROOT);
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
      return { success: false, error: openRepoErrMsg(error, dirPath) };
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
      const testGit = openRepoGit(selectedPath);
      const isRepo = await testGit.checkIsRepo(CheckRepoActions.IS_REPO_ROOT);

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
      return { success: false, error: selectedPath ? openRepoErrMsg(error, selectedPath) : errMsg(error) };
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

  // Pick and apply a unified diff without exposing arbitrary filesystem reads
  // to the renderer. Git validates the patch and leaves the changes unstaged.
  ipcMain.handle('git:apply-patch-file', async (_event, repoPath: string) => {
    try {
      if (!repoPath || !fs.existsSync(repoPath)) {
        return { success: false, error: 'El repositorio ya no existe' };
      }

      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        title: 'Aplicar archivo de parche',
        defaultPath: repoPath,
        filters: [
          { name: 'Parches Git', extensions: ['patch', 'diff'] },
          { name: 'Todos los archivos', extensions: ['*'] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const patchPath = result.filePaths[0];
      await simpleGit(repoPath).raw(['apply', '--', patchPath]);
      return { success: true, data: { fileName: path.basename(patchPath) } };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
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
