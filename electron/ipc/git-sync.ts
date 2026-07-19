// electron/ipc/git-sync.ts
// Operaciones git contra el remoto: push / pull / fetch y variantes.
// Toda autenticación pasa por withGitHubToken (http.extraheader, nunca URLs
// con token).

import { ipcMain } from 'electron';
import { CheckRepoActions, simpleGit } from 'simple-git';
import { errMsg, sanitizeForLog, withGitHubToken } from './shared';
import type { RemoteEntry } from '../../types/electron';
import { isValidExistingGitHubRemoteUrl } from '../../lib/github-remote-url';

const GITHUB_REMOTE_URL_ERROR = 'URL de remoto invalida. Usa https://github.com/owner/repo.git o git@github.com:owner/repo.git';

function isAuthErrorMessage(message: string): boolean {
  return /authentication|credentials|ssh|permission denied|403|401|could not read|not found/i.test(message);
}

async function remoteMainHasHistory(targetPath: string, remoteUrl: string, token?: string): Promise<boolean> {
  const output = await withGitHubToken(targetPath, token, async (authedGit) => (
    authedGit.raw(['ls-remote', '--heads', remoteUrl, 'refs/heads/main'])
  ));
  return output.trim().length > 0;
}

function localBackupBranchName(now = new Date()): string {
  const stamp = now.toISOString().replace(/\D/g, '');
  return `gitcron/local-before-link-${stamp}`;
}

export async function inspectExistingGitHubRemoteMain(
  targetPath: string,
  remoteUrl: string,
  token?: string,
) {
  const trimmedUrl = remoteUrl.trim();
  if (!isValidExistingGitHubRemoteUrl(trimmedUrl)) {
    return {
      success: false,
      error: GITHUB_REMOTE_URL_ERROR,
      data: { success: false, code: 'invalid-remote-url', retryable: true },
    };
  }
  try {
    const remoteHasHistory = await remoteMainHasHistory(targetPath, trimmedUrl, token);
    return { success: true, data: { success: true, remoteHasHistory } };
  } catch (error: any) {
    const msg = errMsg(error);
    return {
      success: false,
      error: msg,
      data: {
        success: false,
        code: 'remote-check-failed',
        authRequired: isAuthErrorMessage(msg),
        retryable: true,
        error: msg,
      },
    };
  }
}

export { isValidExistingGitHubRemoteUrl };

export async function addExistingGitHubRemoteAndPushMain(
  targetPath: string,
  remoteUrl: string,
  token?: string,
) {
  const trimmedUrl = remoteUrl.trim();
  if (!isValidExistingGitHubRemoteUrl(trimmedUrl)) {
    return {
      success: false,
      error: GITHUB_REMOTE_URL_ERROR,
      data: {
        success: false,
        code: 'invalid-remote-url',
        localRepoReady: true,
        retryable: true,
      },
    };
  }

  const g = simpleGit(targetPath);
  try {
    if (await remoteMainHasHistory(targetPath, trimmedUrl, token)) {
      return {
        success: false,
        error: 'El remoto ya tiene una rama main con historial.',
        data: {
          success: false,
          code: 'remote-has-history',
          localRepoReady: true,
          retryable: true,
          remoteHasHistory: true,
        },
      };
    }
  } catch (error: any) {
    const msg = errMsg(error);
    return {
      success: false,
      error: msg,
      data: {
        success: false,
        code: 'remote-check-failed',
        authRequired: isAuthErrorMessage(msg),
        localRepoReady: true,
        retryable: true,
        error: msg,
      },
    };
  }

  try {
    await g.raw(['remote', 'add', 'origin', trimmedUrl]);
  } catch (error: any) {
    const msg = errMsg(error);
    return {
      success: false,
      error: msg,
      data: {
        success: false,
        code: 'remote-add-failed',
        localRepoReady: true,
        retryable: true,
        error: msg,
      },
    };
  }

  try {
    await withGitHubToken(targetPath, token, async (authedGit) => {
      await authedGit.push(['--set-upstream', 'origin', 'main']);
    });
    return {
      success: true,
      data: {
        success: true,
        remoteAdded: true,
        pushed: true,
        setUpstream: true,
      },
    };
  } catch (error: any) {
    const msg = errMsg(error);
    let remoteRolledBack = false;
    let rollbackError: string | undefined;
    try {
      await simpleGit(targetPath).raw(['remote', 'remove', 'origin']);
      remoteRolledBack = true;
    } catch (rollbackErr: any) {
      rollbackError = errMsg(rollbackErr);
    }
    return {
      success: false,
      error: msg,
      data: {
        success: false,
        code: 'first-push-failed',
        authRequired: isAuthErrorMessage(msg),
        localRepoReady: true,
        retryable: true,
        remoteAdded: !remoteRolledBack,
        remoteRolledBack,
        rollbackError,
        error: msg,
      },
    };
  }
}

export async function adoptExistingGitHubRemoteMain(
  targetPath: string,
  remoteUrl: string,
  token?: string,
) {
  const trimmedUrl = remoteUrl.trim();
  if (!isValidExistingGitHubRemoteUrl(trimmedUrl)) {
    return {
      success: false,
      error: GITHUB_REMOTE_URL_ERROR,
      data: { success: false, code: 'invalid-remote-url', localRepoReady: true, retryable: true },
    };
  }

  const g = simpleGit(targetPath);
  let remoteAdded = false;
  try {
    const isRepoRoot = await g.checkIsRepo(CheckRepoActions.IS_REPO_ROOT);
    if (!isRepoRoot) {
      await g.init(['--initial-branch=main']);
    }
    await g.raw(['remote', 'add', 'origin', trimmedUrl]);
    remoteAdded = true;
    await withGitHubToken(targetPath, token, async (authedGit) => {
      await authedGit.raw(['fetch', 'origin', 'main']);
    });

    let backupBranch: string | undefined;
    try {
      await g.raw(['rev-parse', '--verify', 'HEAD']);
      backupBranch = localBackupBranchName();
      await g.raw(['branch', backupBranch]);
    } catch {
      // An unborn repository has no local commit to back up.
    }
    await g.raw(['reset', '--mixed', 'origin/main']);
    await g.raw(['branch', '--set-upstream-to=origin/main', 'main']);

    return {
      success: true,
      data: {
        success: true,
        remoteAdded: true,
        remoteHasHistory: true,
        adoptedRemoteHistory: true,
        preservedWorkingTree: true,
        backupBranch,
      },
    };
  } catch (error: any) {
    const msg = errMsg(error);
    if (remoteAdded) {
      try {
        await g.raw(['remote', 'remove', 'origin']);
      } catch {
        // Keep the original failure: the UI can still guide the user to retry.
      }
    }
    return {
      success: false,
      error: msg,
      data: {
        success: false,
        code: 'remote-adopt-failed',
        authRequired: isAuthErrorMessage(msg),
        localRepoReady: true,
        retryable: true,
        error: msg,
      },
    };
  }
}

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

  ipcMain.handle('git:add-existing-github-remote', async (_event, targetPath: string, remoteUrl: string, token?: string) => (
    addExistingGitHubRemoteAndPushMain(targetPath, remoteUrl, token)
  ));
  ipcMain.handle('git:inspect-existing-github-remote', async (_event, targetPath: string, remoteUrl: string, token?: string) => (
    inspectExistingGitHubRemoteMain(targetPath, remoteUrl, token)
  ));
  ipcMain.handle('git:adopt-existing-github-remote', async (_event, targetPath: string, remoteUrl: string, token?: string) => (
    adoptExistingGitHubRemoteMain(targetPath, remoteUrl, token)
  ));

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
