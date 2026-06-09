// electron/ipc/github.ts
// Handlers github:* — API REST (Octokit) + OAuth Device Flow.
// El token viaja por parámetro IPC y nunca se loguea sin sanitizar.

import { ipcMain } from 'electron';
import { Octokit } from '@octokit/rest';
import type {
  GitHubUser, PullRequestEntry, PullRequestDiffData, PullRequestDiffFile,
} from '../../types/electron';
import { errMsg, formatFetchError, getGitHubOwnerRepoFromOrigin } from './shared';

// ─── GitHub OAuth Device Flow ─────────────────────────────────────────
// Uses the GitHub CLI's public OAuth Client ID for personal-use device flow.
// This works without a client secret and is the same flow `gh auth login` uses.
const GITHUB_CLIENT_ID = '178c6fc778ccc68e1d6a';
const GITHUB_OAUTH_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'GitCron',
};

export function registerGitHubHandlers(): void {
  ipcMain.handle('github:test', async (_event, { token, owner, repo }) => {
    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.pulls.list({ owner, repo, state: 'open' });
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('github:device-start', async () => {
    try {
      const response = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: GITHUB_OAUTH_HEADERS,
        body: new URLSearchParams({ client_id: GITHUB_CLIENT_ID, scope: 'repo read:user user:email' }),
      });
      const data: any = await response.json();
      if (data.error) return { success: false, error: data.error_description || data.error };
      return {
        success: true,
        data: {
          deviceCode: data.device_code,
          userCode: data.user_code,
          verificationUri: data.verification_uri,
          expiresIn: data.expires_in,
          interval: data.interval || 5,
        },
      };
    } catch (error: any) {
      return { success: false, error: formatFetchError(error) };
    }
  });

  ipcMain.handle('github:device-poll', async (_event, deviceCode: string) => {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: GITHUB_OAUTH_HEADERS,
        body: new URLSearchParams({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });
      const data: any = await response.json();
      if (data.error) {
        // authorization_pending = user hasn't entered code yet (normal)
        // slow_down = poll less frequently
        // expired_token / access_denied = stop polling
        return { success: false, error: data.error, data: { pending: data.error === 'authorization_pending' || data.error === 'slow_down' } };
      }
      return { success: true, data: { accessToken: data.access_token } };
    } catch (error: any) {
      return { success: false, error: formatFetchError(error) };
    }
  });

  ipcMain.handle('github:auth', async (_event, token: string) => {
    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.users.getAuthenticated();
      const user: GitHubUser = {
        login: data.login,
        name: data.name,
        avatarUrl: data.avatar_url,
        email: data.email,
      };
      return { success: true, data: user };
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const isAuthError = status === 401 ||
                          errMsg(error).includes('Bad credentials') ||
                          errMsg(error).includes('Unauthorized');
      return { success: false, error: errMsg(error), isAuthError, status };
    }
  });

  // ─── Create a repo on GitHub (and optionally clone) ────────────────────
  ipcMain.handle('github:create-repo', async (_event, token: string, name: string, isPrivate: boolean, description?: string, autoInit: boolean = true) => {
    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.repos.createForAuthenticatedUser({
        name,
        private: isPrivate,
        description: description || undefined,
        auto_init: autoInit,
      });
      return {
        success: true,
        data: { cloneUrl: data.clone_url, htmlUrl: data.html_url, fullName: data.full_name, name: data.name },
      };
    } catch (error: any) {
      const errStr = error.message || '';
      if (errStr.includes('already exists') || error.status === 422) {
        try {
          const octokit = new Octokit({ auth: token });
          const { data: userData } = await octokit.rest.users.getAuthenticated();
          const { data: repoData } = await octokit.rest.repos.get({
            owner: userData.login,
            repo: name,
          });
          return {
            success: true,
            data: {
              cloneUrl: repoData.clone_url,
              htmlUrl: repoData.html_url,
              fullName: repoData.full_name,
              name: repoData.name,
            },
          };
        } catch (rescueErr: any) {
          return { success: false, error: errMsg(error) };
        }
      }
      return { success: false, error: errMsg(error) };
    }
  });

  // ─── List the authenticated user's repos (for one-click clone) ─────────
  ipcMain.handle('github:list-user-repos', async (_event, token: string) => {
    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
        affiliation: 'owner,collaborator',
      });
      return {
        success: true,
        data: data.map((r) => ({
          name: r.name,
          fullName: r.full_name,
          cloneUrl: r.clone_url,
          private: r.private,
          description: r.description,
          updatedAt: r.updated_at,
        })),
      };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  // ── List open PRs from GitHub (parses origin URL to find owner/repo) ──
  ipcMain.handle('github:list-prs', async (_event, token: string, targetPath: string) => {
    try {
      const remote = await getGitHubOwnerRepoFromOrigin(targetPath);
      if (!remote) {
        return { success: true, data: [] as PullRequestEntry[] };
      }
      const { owner, repo } = remote;
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.pulls.list({ owner, repo, state: 'open', per_page: 30 });
      const prs: PullRequestEntry[] = data.map((pr) => {
        const stats = pr as typeof pr & { additions?: number; deletions?: number; changed_files?: number };
        return {
          number: pr.number,
          title: pr.title,
          author: pr.user?.login ?? '',
          branch: pr.head.ref,
          baseBranch: pr.base.ref,
          url: pr.html_url,
          draft: pr.draft ?? false,
          additions: stats.additions ?? 0,
          deletions: stats.deletions ?? 0,
          changedFiles: stats.changed_files ?? 0,
        };
      });
      return { success: true, data: prs };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('github:get-pr-diff', async (_event, token: string, targetPath: string, number: number) => {
    try {
      const remote = await getGitHubOwnerRepoFromOrigin(targetPath);
      if (!remote) {
        return { success: false, error: 'No se pudo detectar owner/repo desde origin' };
      }
      const { owner, repo } = remote;
      const octokit = new Octokit({ auth: token });
      const [{ data: pr }, files, diffResponse] = await Promise.all([
        octokit.rest.pulls.get({ owner, repo, pull_number: number }),
        octokit.paginate(octokit.rest.pulls.listFiles, { owner, repo, pull_number: number, per_page: 100 }),
        octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
          owner,
          repo,
          pull_number: number,
          headers: { accept: 'application/vnd.github.v3.diff' },
        }),
      ]);

      const diff = typeof diffResponse.data === 'string'
        ? diffResponse.data
        : String(diffResponse.data ?? '');
      const diffFiles: PullRequestDiffFile[] = files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        previousFilename: file.previous_filename,
      }));
      const data: PullRequestDiffData = {
        number: pr.number,
        title: pr.title,
        author: pr.user?.login ?? '',
        branch: pr.head.ref,
        baseBranch: pr.base.ref,
        url: pr.html_url,
        draft: pr.draft ?? false,
        additions: pr.additions ?? 0,
        deletions: pr.deletions ?? 0,
        changedFiles: pr.changed_files ?? diffFiles.length,
        diff,
        files: diffFiles,
      };
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: errMsg(error) };
    }
  });
}
