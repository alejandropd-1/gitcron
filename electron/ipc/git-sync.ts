// electron/ipc/git-sync.ts
// Operaciones git contra el remoto: push / pull / fetch y variantes.
// Toda autenticación pasa por withGitHubToken (http.extraheader, nunca URLs
// con token).

import { ipcMain } from 'electron';
import { simpleGit } from 'simple-git';
import { errMsg, sanitizeForLog, withGitHubToken } from './shared';
import type { RemoteEntry } from '../../types/electron';

export function parseGitRemotes(raw: string): RemoteEntry[] {
  const lines = raw.split('\n');
  const remotesMap = new Map<string, { fetchUrl?: string; pushUrl?: string }>();
  for (const line of lines) {
    const trim = line.trim();
    if (!trim) continue;
    const match = trim.match(/^(\S+)\s+(\S+)(?:\s+\((fetch|push)\))?$/);
    if (!match) continue;
    const [, name, url, type] = match;
    const entry = remotesMap.get(name) || {};
    if (type === 'fetch') {
      entry.fetchUrl = url;
    } else if (type === 'push') {
      entry.pushUrl = url;
    } else {
      if (!entry.fetchUrl) entry.fetchUrl = url;
      if (!entry.pushUrl) entry.pushUrl = url;
    }
    remotesMap.set(name, entry);
  }
  return Array.from(remotesMap.entries()).map(([name, urls]) => ({
    name,
    fetchUrl: urls.fetchUrl,
    pushUrl: urls.pushUrl,
  }));
}

export function parseFilesFromPullOutput(output: string): string[] {
  const lines = output.split('\n');
  const files: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*(.+?)\s*\|\s*(\d+|Bin)\b/);
    if (match) {
      const filepath = match[1].trim();
      if (filepath && !filepath.includes('...')) {
        files.push(filepath);
      }
    }
  }
  return files;
}

async function runExplicitPull(
  targetPath: string,
  token: string | undefined,
  args: string[],
): Promise<{ success: boolean; data?: { success: boolean; summary?: string; conflict?: boolean; authRequired?: boolean; error?: string; files?: string[] }; error?: string }> {
  try {
    const output = await withGitHubToken(targetPath, token, (g) => g.raw(['pull', ...args]));
    const trimmed = output.trim();
    return {
      success: true,
      data: {
        success: true,
        summary: trimmed || 'Already up to date.',
        files: parseFilesFromPullOutput(trimmed),
      },
    };
  } catch (error: any) {
    const msg = errMsg(error);
    const isAuth = /authentication|credentials|ssh|permission denied|403|401/i.test(msg);
    const isConflict = /conflict|could not apply|automatic merge failed|fix conflicts/i.test(msg);
    return {
      success: false,
      error: msg,
      data: { success: false, authRequired: isAuth, conflict: isConflict, error: msg, files: [] },
    };
  }
}

export function registerGitSyncHandlers(): void {
  // ── Push a tag to remote ──
  ipcMain.handle('git:push-tag', async (_event, targetPath: string, tagName: string, token?: string) => {
    try {
      await withGitHubToken(targetPath, token, async (g) => {
        await g.push('origin', tagName);
      });
      return { success: true };
    } catch (error: any) {
      const isAuth = /authentication|credentials|permission denied|403|401/i.test(error.message);
      const msg = sanitizeForLog(error.message || String(error));
      return { success: false, error: msg, data: { authRequired: isAuth } };
    }
  });

  // ── Pull from origin for a SPECIFIC branch (without checkout) ──
  // Strategy: fetch then merge --ff-only into the local branch
  ipcMain.handle('git:pull-branch', async (_event, targetPath: string, branch: string, token?: string) => {
    try {
      await withGitHubToken(targetPath, token, async (g) => {
        await g.fetch('origin', branch);
      });
      // Fast-forward check (no auth needed for local refs)
      const g = simpleGit(targetPath);
      const mergeBase = (await g.raw(['merge-base', branch, `origin/${branch}`])).trim();
      const branchSha = (await g.raw(['rev-parse', branch])).trim();
      if (mergeBase !== branchSha) {
        return { success: false, error: 'Las branches divergieron — hacé checkout y resolvé manualmente' };
      }
      await g.raw(['update-ref', `refs/heads/${branch}`, `origin/${branch}`]);
      return { success: true };
    } catch (error: any) {
      const isAuth = /authentication|credentials|permission denied|403|401/i.test(error.message);
      return { success: false, error: errMsg(error), data: { authRequired: isAuth } };
    }
  });

  // ── Push a SPECIFIC branch ──
  ipcMain.handle('git:push-branch', async (_event, targetPath: string, branch: string, token?: string, force: boolean = false) => {
    try {
      let setUpstream = false;
      await withGitHubToken(targetPath, token, async (g) => {
        try {
          const options = force ? ['--force'] : [];
          await g.push('origin', branch, options);
        } catch (firstErr: any) {
          // Branch nueva sin upstream → auto-set-upstream
          if (/no upstream branch|has no upstream|does not have a local branch/i.test(firstErr.message)) {
            const options = ['--set-upstream'];
            if (force) options.push('--force');
            await g.push('origin', branch, options);
            setUpstream = true;
          } else {
            throw firstErr;
          }
        }
      });
      return { success: true, data: { setUpstream } };
    } catch (error: any) {
      const isAuth = /authentication|credentials|permission denied|403|401/i.test(error.message);
      return { success: false, error: errMsg(error), data: { authRequired: isAuth } };
    }
  });

  // ── Delete a branch on the remote (git push <remote> --delete <branch>) ──
  // Misma autenticación/errores que el push existente (withGitHubToken). Operación
  // de red → vive acá, junto al resto de push/pull, no en git-ops.ts.
  ipcMain.handle('git:delete-remote-branch', async (_event, targetPath: string, remote: string, branch: string, token?: string) => {
    try {
      await withGitHubToken(targetPath, token, async (g) => {
        await g.push([remote, '--delete', branch]);
      });
      return { success: true };
    } catch (error: any) {
      const isAuth = /authentication|credentials|permission denied|403|401/i.test(error.message);
      return { success: false, error: errMsg(error), data: { authRequired: isAuth } };
    }
  });

  ipcMain.handle('git:push', async (_event, targetPath: string, token?: string) => {
    try {
      let setUpstream = false;
      await withGitHubToken(targetPath, token, async (g) => {
        try {
          await g.push();
        } catch (firstErr: any) {
          // Branch nueva sin upstream → auto-set-upstream en origin
          if (/no upstream branch|has no upstream|does not have a local branch/i.test(firstErr.message)) {
            const status = await simpleGit(targetPath).status();
            const branch = status.current;
            if (!branch) throw firstErr;
            await g.push(['--set-upstream', 'origin', branch]);
            setUpstream = true;
          } else {
            throw firstErr;
          }
        }
      });
      return {
        success: true,
        data: { success: true, setUpstream },
      };
    } catch (error: any) {
      const isAuth = /authentication|credentials|ssh|permission denied|403|401/i.test(error.message);
      return {
        success: false,
        error: errMsg(error),
        data: { success: false, authRequired: isAuth, error: errMsg(error) },
      };
    }
  });

  ipcMain.handle('git:pull', async (_event, targetPath: string, token?: string) => {
    try {
      const r = await withGitHubToken(targetPath, token, (g) => g.pull());
      return {
        success: true,
        data: {
          success: true,
          summary: `${r.summary.changes} changed, ${r.summary.insertions} insertions, ${r.summary.deletions} deletions`,
        },
      };
    } catch (error: any) {
      const isAuth = /authentication|credentials|ssh|permission denied|403|401/i.test(error.message);
      return {
        success: false,
        error: errMsg(error),
        data: { success: false, authRequired: isAuth, error: errMsg(error) },
      };
    }
  });

  ipcMain.handle('git:pull-ff-only', async (_event, targetPath: string, token?: string) => (
    runExplicitPull(targetPath, token, ['--ff-only'])
  ));

  ipcMain.handle('git:pull-rebase', async (_event, targetPath: string, token?: string) => (
    runExplicitPull(targetPath, token, ['--rebase'])
  ));

  ipcMain.handle('git:pull-merge', async (_event, targetPath: string, token?: string) => (
    runExplicitPull(targetPath, token, ['--no-rebase'])
  ));

  ipcMain.handle('git:fetch', async (_event, targetPath: string, token?: string) => {
    try {
      await withGitHubToken(targetPath, token, (g) => g.fetch(['--all', '--prune']));
      return { success: true };
    } catch (error: any) {
      const isAuth = /authentication|credentials|ssh|permission denied|403|401/i.test(error.message);
      return {
        success: false,
        error: errMsg(error),
        data: { success: false, authRequired: isAuth, error: errMsg(error) },
      };
    }
  });

  // ── Remotes ──
  ipcMain.handle('git:remotes-list', async (_event, targetPath: string) => {
    try {
      const raw = await simpleGit(targetPath).raw(['remote', '-v']);
      const remotes = parseGitRemotes(raw);
      return { success: true, data: remotes };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('git:remote-add', async (_event, targetPath: string, name: string, url: string) => {
    try {
      await simpleGit(targetPath).raw(['remote', 'add', name, url]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('git:remote-remove', async (_event, targetPath: string, name: string) => {
    try {
      await simpleGit(targetPath).raw(['remote', 'remove', name]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('git:remote-set-url', async (_event, targetPath: string, name: string, url: string) => {
    try {
      await simpleGit(targetPath).raw(['remote', 'set-url', name, url]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('git:remote-rename', async (_event, targetPath: string, oldName: string, newName: string) => {
    try {
      await simpleGit(targetPath).raw(['remote', 'rename', oldName, newName]);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });
}
