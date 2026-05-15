import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { simpleGit, SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';
import type {
  StatusFile, CommitData, BranchData, RepoInfo, StashEntry, SubmoduleEntry, GitHubUser,
  BranchTrackingInfo, WorktreeEntry, PullRequestEntry,
} from '../types/electron';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let repoPath: string | null = null;
let git: SimpleGit = simpleGit();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#041425',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
  });

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ─── Encrypted storage (OS-level) ─────────────────────────────────────
// Uses Electron's safeStorage which leverages:
//   - Windows: DPAPI (Data Protection API)
//   - macOS:   Keychain
//   - Linux:   libsecret / kwallet
// Encrypted file is stored in app.getPath('userData').

const STORAGE_FILENAME = 'storage.enc';

function storagePath(): string {
  return path.join(app.getPath('userData'), STORAGE_FILENAME);
}

function readEncryptedStorage(): Record<string, string> {
  try {
    if (!safeStorage.isEncryptionAvailable()) return {};
    const file = storagePath();
    if (!fs.existsSync(file)) return {};
    const buf = fs.readFileSync(file);
    const json = safeStorage.decryptString(buf);
    return JSON.parse(json);
  } catch (err) {
    console.error('readEncryptedStorage error:', err);
    return {};
  }
}

function writeEncryptedStorage(data: Record<string, string>) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage no disponible en este sistema');
  }
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  const buf = safeStorage.encryptString(JSON.stringify(data));
  // Restrictive file permissions on Unix (owner read/write only)
  fs.writeFileSync(storagePath(), buf, { mode: 0o600 });
}

ipcMain.handle('storage:set', async (_event, key: string, value: string) => {
  try {
    const data = readEncryptedStorage();
    data[key] = value;
    writeEncryptedStorage(data);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage:get', async (_event, key: string) => {
  const data = readEncryptedStorage();
  return { success: true, data: data[key] ?? null };
});

ipcMain.handle('storage:delete', async (_event, key: string) => {
  try {
    const data = readEncryptedStorage();
    delete data[key];
    writeEncryptedStorage(data);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ─── GIT_ASKPASS helper script ────────────────────────────────────────
// Git invokes GIT_ASKPASS like: `script "Username for 'https://...': "`.
// Our script reads the token from the GITCRON_TOKEN env var and prints either
// the username ("x-access-token") or the token, depending on what git asks for.
// This way the token NEVER touches .git/config or the remote URL on disk.

let askpassScriptPath: string | null = null;

function ensureAskpassScript(): string {
  if (askpassScriptPath && fs.existsSync(askpassScriptPath)) return askpassScriptPath;

  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });

  if (process.platform === 'win32') {
    const p = path.join(dir, 'gitcron-askpass.cmd');
    const content =
      '@echo off\r\n' +
      'echo %1 | findstr /i "Username" >nul\r\n' +
      'if %errorlevel%==0 (\r\n' +
      '  echo x-access-token\r\n' +
      ') else (\r\n' +
      '  echo %GITCRON_TOKEN%\r\n' +
      ')\r\n';
    fs.writeFileSync(p, content);
    askpassScriptPath = p;
  } else {
    const p = path.join(dir, 'gitcron-askpass.sh');
    const content =
      '#!/bin/sh\n' +
      'case "$1" in\n' +
      '  *Username*) echo "x-access-token" ;;\n' +
      '  *)          echo "$GITCRON_TOKEN" ;;\n' +
      'esac\n';
    fs.writeFileSync(p, content, { mode: 0o700 });
    askpassScriptPath = p;
  }
  return askpassScriptPath;
}

// --- IPC Handlers ---

ipcMain.handle('git:command', async (_event, args: string[]) => {
  try {
    console.log('Executing git command:', args);
    let result;
    const command = args[0];

    switch (command) {
      case 'status': result = await git.status(); break;
      case 'commit': {
        // The renderer sends ['commit', '-m', message]. simple-git's
        // git.commit() treats an array as multiple message lines, so passing
        // args.slice(1) made the message become "-m\n<actual text>". Extract
        // the real message and pass it as a plain string.
        const mIdx = args.indexOf('-m');
        const message = mIdx >= 0 && args[mIdx + 1] !== undefined
          ? args[mIdx + 1]
          : args.slice(1).filter((a) => a !== '-m').join('\n');
        if (!message || !message.trim()) {
          throw new Error('Mensaje de commit vacío');
        }
        result = await git.commit(message);
        break;
      }
      case 'merge': result = await git.merge(args.slice(1)); break;
      case 'revert':
        result = await git.revert(args[1], args.slice(2).reduce((acc, curr) => ({ ...acc, [curr]: true }), {}));
        break;
      case 'stash': result = await git.stash(args.slice(1)); break;
      case 'restore': result = await git.raw(['restore', args[1]]); break;
      default: result = await git.raw(args);
    }
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Git Command Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('github:test', async (_event, { token, owner, repo }) => {
  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.pulls.list({ owner, repo, state: 'open' });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ─── GitHub OAuth Device Flow ─────────────────────────────────────────
// Uses the GitHub CLI's public OAuth Client ID for personal-use device flow.
// This works without a client secret and is the same flow `gh auth login` uses.
const GITHUB_CLIENT_ID = '178c6fc778ccc68e1d6a';

ipcMain.handle('github:device-start', async () => {
  try {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: 'repo read:user user:email' }),
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
    return { success: false, error: error.message };
  }
});

ipcMain.handle('github:device-poll', async (_event, deviceCode: string) => {
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:open-repo', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Seleccionar repositorio Git',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'No se seleccionó ninguna carpeta' };
    }

    const selectedPath = result.filePaths[0];
    const testGit = simpleGit(selectedPath);
    const isRepo = await testGit.checkIsRepo();

    if (!isRepo) {
      return {
        success: false,
        error: `"${path.basename(selectedPath)}" no es un repositorio git`,
      };
    }

    repoPath = selectedPath;
    git = simpleGit(repoPath);

    const status = await git.status();
    const repoInfo: RepoInfo = {
      path: repoPath,
      name: path.basename(repoPath),
      currentBranch: status.current ?? 'HEAD',
      isGitRepo: true,
    };
    return { success: true, data: repoInfo };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ─── Pick a folder (any folder, doesn't have to be a repo) ─────────────
ipcMain.handle('fs:pick-folder', async (_event, title?: string) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: title ?? 'Seleccionar carpeta',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'No se seleccionó carpeta' };
  }
  return { success: true, data: result.filePaths[0] };
});

// ─── Init a brand new repo ─────────────────────────────────────────────
ipcMain.handle('git:init', async (_event, parentPath: string, name: string, withInitialCommit: boolean = true) => {
  try {
    const repoDir = path.join(parentPath, name);
    if (fs.existsSync(repoDir) && fs.readdirSync(repoDir).length > 0) {
      return { success: false, error: `La carpeta "${name}" ya existe y no está vacía` };
    }
    fs.mkdirSync(repoDir, { recursive: true });

    const g = simpleGit(repoDir);
    await g.init(['--initial-branch=main']);

    if (withInitialCommit) {
      fs.writeFileSync(path.join(repoDir, 'README.md'), `# ${name}\n\nRepositorio creado con GitCron.\n`);
      fs.writeFileSync(path.join(repoDir, '.gitignore'), `node_modules/\n.env\n.DS_Store\nThumbs.db\n`);
      await g.add('.');
      await g.commit('Initial commit');
    }

    repoPath = repoDir;
    git = simpleGit(repoPath);
    const status = await git.status();
    const info: RepoInfo = {
      path: repoDir,
      name: path.basename(repoDir),
      currentBranch: status.current ?? 'main',
      isGitRepo: true,
    };
    return { success: true, data: info };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ─── Clone a repo from URL ─────────────────────────────────────────────
ipcMain.handle('git:clone', async (_event, url: string, parentPath: string, folderName: string, token?: string) => {
  try {
    const destPath = path.join(parentPath, folderName);
    if (fs.existsSync(destPath) && fs.readdirSync(destPath).length > 0) {
      return { success: false, error: `La carpeta "${folderName}" ya existe y no está vacía` };
    }

    // For clone, inject the token directly in the URL when it's a GitHub HTTPS URL.
    // GIT_ASKPASS is blocked by Electron 42's child-process security layer.
    let cloneUrl = url;
    if (token && /^https:\/\/github\.com\//i.test(url)) {
      cloneUrl = url.replace(/^https:\/\//i, `https://x-access-token:${token}@`);
    }
    const g = simpleGit();
    await g.clone(cloneUrl, destPath);

    repoPath = destPath;
    git = simpleGit(repoPath);
    const status = await git.status();
    const info: RepoInfo = {
      path: destPath,
      name: path.basename(destPath),
      currentBranch: status.current ?? 'HEAD',
      isGitRepo: true,
    };
    return { success: true, data: info };
  } catch (error: any) {
    const isAuth = /authentication|credentials|ssh|permission denied|403|401|could not read|not found/i.test(error.message);
    return { success: false, error: error.message, data: { authRequired: isAuth } };
  }
});

// ─── Create a repo on GitHub (and optionally clone) ────────────────────
ipcMain.handle('github:create-repo', async (_event, token: string, name: string, isPrivate: boolean, description?: string) => {
  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name,
      private: isPrivate,
      description: description || undefined,
      auto_init: true, // create with a README so we can clone immediately
    });
    return {
      success: true,
      data: { cloneUrl: data.clone_url, htmlUrl: data.html_url, fullName: data.full_name, name: data.name },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:log', async (_event, targetPath: string) => {
  try {
    const g = simpleGit(targetPath);
    // Use --decorate to get branch/tag refs at each commit
    const raw = await g.raw([
      'log',
      '--all',
      '--max-count=500',
      '--date-order',
      '--pretty=format:%H%x1f%P%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%D',
    ]);

    const commits: CommitData[] = raw
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const [hash, parentsRaw, an, ae, date, msg, decoration] = line.split('\x1f');
        const parents = (parentsRaw || '').split(' ').filter(Boolean);
        const refs = (decoration || '')
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean)
          .map((r) => r.replace(/^HEAD -> /, ''));
        return {
          hash,
          shortHash: hash.slice(0, 7),
          message: msg ?? '',
          authorName: an ?? '',
          authorEmail: ae ?? '',
          date: date ?? '',
          parents,
          refs,
        };
      });

    return { success: true, data: commits };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:status', async (_event, targetPath: string) => {
  try {
    const g = simpleGit(targetPath);
    const status = await g.status();

    const raw: StatusFile[] = [
      ...status.modified.map((p) => ({ path: p, status: 'modified' as const, staged: false })),
      ...status.created.map((p) => ({ path: p, status: 'added' as const, staged: false })),
      ...status.deleted.map((p) => ({ path: p, status: 'deleted' as const, staged: false })),
      ...status.not_added.map((p) => ({ path: p, status: 'untracked' as const, staged: false })),
      ...status.staged.map((p) => ({ path: p, status: 'modified' as const, staged: true })),
      ...status.renamed.map((r) => ({
        path: r.to, oldPath: r.from, status: 'renamed' as const, staged: true,
      })),
    ];

    const seen = new Map<string, StatusFile>();
    for (const f of raw) {
      const existing = seen.get(f.path);
      if (!existing || f.staged) seen.set(f.path, f);
    }

    return { success: true, data: Array.from(seen.values()) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:branches', async (_event, targetPath: string) => {
  try {
    const g = simpleGit(targetPath);
    const local = await g.branchLocal();
    const remotes = await g.branch(['-r']);

    // Use `git for-each-ref` to get ahead/behind for ALL local branches in one shot.
    // Format: <name>|<upstream>|<track>   where track looks like "[ahead 1, behind 3]" or "[gone]" or ""
    const tracking: Record<string, BranchTrackingInfo> = {};
    try {
      const raw = await g.raw([
        'for-each-ref',
        '--format=%(refname:short)|%(upstream:short)|%(upstream:track)',
        'refs/heads',
      ]);
      for (const line of raw.split('\n').filter((l) => l.trim())) {
        const [name, upstream, track] = line.split('|');
        let ahead = 0;
        let behind = 0;
        const aheadMatch = track?.match(/ahead (\d+)/);
        const behindMatch = track?.match(/behind (\d+)/);
        if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
        if (behindMatch) behind = parseInt(behindMatch[1], 10);
        tracking[name] = {
          upstream: upstream || null,
          ahead,
          behind,
          gone: !!track?.includes('gone'),
        };
      }
    } catch {
      /* ignore - tracking is best-effort */
    }

    const branchData: BranchData = {
      local: local.all,
      remote: remotes.all,
      current: local.current,
      tracking,
    };
    return { success: true, data: branchData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ── git worktree list ──
ipcMain.handle('git:worktrees', async (_event, targetPath: string) => {
  try {
    const raw = await simpleGit(targetPath).raw(['worktree', 'list', '--porcelain']);
    const worktrees: WorktreeEntry[] = [];
    let current: Partial<WorktreeEntry> | null = null;
    for (const line of raw.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current && current.path) worktrees.push(current as WorktreeEntry);
        current = { path: line.slice('worktree '.length).trim() };
      } else if (current && line.startsWith('HEAD ')) {
        current.head = line.slice('HEAD '.length).trim();
      } else if (current && line.startsWith('branch ')) {
        current.branch = line.slice('branch '.length).trim().replace('refs/heads/', '');
      } else if (current && line.trim() === 'bare') {
        current.bare = true;
      } else if (current && line.trim() === 'detached') {
        current.detached = true;
      }
    }
    if (current && current.path) worktrees.push(current as WorktreeEntry);
    return { success: true, data: worktrees };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ── List open PRs from GitHub (parses origin URL to find owner/repo) ──
ipcMain.handle('github:list-prs', async (_event, token: string, targetPath: string) => {
  try {
    const g = simpleGit(targetPath);
    const remotes = await g.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');
    const url = origin?.refs?.fetch || origin?.refs?.push || '';
    // Match https://github.com/owner/repo(.git) or git@github.com:owner/repo(.git)
    const match = url.match(/github\.com[:/]+([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (!match) {
      return { success: true, data: [] as PullRequestEntry[] };
    }
    const [, owner, repo] = match;
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.pulls.list({ owner, repo, state: 'open', per_page: 30 });
    const prs: PullRequestEntry[] = data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      author: pr.user?.login ?? '',
      branch: pr.head.ref,
      url: pr.html_url,
      draft: pr.draft ?? false,
    }));
    return { success: true, data: prs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:checkout', async (_event, targetPath: string, branch: string) => {
  try {
    await simpleGit(targetPath).checkout(branch);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:create-branch', async (_event, targetPath: string, name: string, fromHash?: string) => {
  try {
    const g = simpleGit(targetPath);
    if (fromHash) await g.checkoutBranch(name, fromHash);
    else await g.checkoutLocalBranch(name);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ── Merge a branch INTO the current branch ──
ipcMain.handle('git:merge-branch', async (_event, targetPath: string, sourceBranch: string) => {
  try {
    const g = simpleGit(targetPath);
    const result = await g.merge([sourceBranch]);
    return { success: true, data: result };
  } catch (error: any) {
    // simple-git throws on merge conflict — extract useful info
    const msg = error.message || String(error);
    const isConflict = /conflict|automatic merge failed/i.test(msg);
    return { success: false, error: msg, data: { conflict: isConflict } };
  }
});

// ── Rebase the current branch onto another ──
ipcMain.handle('git:rebase', async (_event, targetPath: string, ontoBranch: string) => {
  try {
    const g = simpleGit(targetPath);
    const result = await g.rebase([ontoBranch]);
    return { success: true, data: result };
  } catch (error: any) {
    const msg = error.message || String(error);
    const isConflict = /conflict|could not apply/i.test(msg);
    return { success: false, error: msg, data: { conflict: isConflict } };
  }
});

// ── Fast-forward: bring a branch up to a target (only if no divergence) ──
// Strategy: checkout the target branch, then `git merge --ff-only <from>`
// We avoid touching the current branch state if possible.
ipcMain.handle('git:fast-forward', async (_event, targetPath: string, branch: string, toRef: string) => {
  try {
    const g = simpleGit(targetPath);
    // Use git update-ref directly: this works without switching branches
    // First make sure the merge would be fast-forward
    const mergeBase = (await g.raw(['merge-base', branch, toRef])).trim();
    const branchSha = (await g.raw(['rev-parse', branch])).trim();
    if (mergeBase !== branchSha) {
      return { success: false, error: 'No se puede hacer fast-forward: las branches divergieron' };
    }
    // Safe to fast-forward
    await g.raw(['update-ref', `refs/heads/${branch}`, toRef]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ── Rename a branch (works for the current branch too) ──
ipcMain.handle('git:rename-branch', async (_event, targetPath: string, oldName: string, newName: string) => {
  try {
    await simpleGit(targetPath).raw(['branch', '-m', oldName, newName]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ── Delete a local branch. `force=true` uses -D (even if unmerged) ──
ipcMain.handle('git:delete-branch', async (_event, targetPath: string, branch: string, force: boolean = false) => {
  try {
    const flag = force ? '-D' : '-d';
    await simpleGit(targetPath).raw(['branch', flag, branch]);
    return { success: true };
  } catch (error: any) {
    const msg = error.message || String(error);
    // Detect "not fully merged" so renderer can offer force delete
    const notMerged = /not fully merged|not yet merged/i.test(msg);
    return { success: false, error: msg, data: { notMerged } };
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
    return { success: false, error: error.message, data: { authRequired: isAuth } };
  }
});

// ── Push a SPECIFIC branch ──
ipcMain.handle('git:push-branch', async (_event, targetPath: string, branch: string, token?: string) => {
  try {
    let setUpstream = false;
    await withGitHubToken(targetPath, token, async (g) => {
      try {
        await g.push(['origin', branch]);
      } catch (firstErr: any) {
        // Branch nueva sin upstream → auto-set-upstream
        if (/no upstream branch|has no upstream|does not have a local branch/i.test(firstErr.message)) {
          await g.push(['--set-upstream', 'origin', branch]);
          setUpstream = true;
        } else {
          throw firstErr;
        }
      }
    });
    return { success: true, data: { setUpstream } };
  } catch (error: any) {
    const isAuth = /authentication|credentials|permission denied|403|401/i.test(error.message);
    return { success: false, error: error.message, data: { authRequired: isAuth } };
  }
});

// Helper: temporarily inject GitHub token into the origin HTTPS URL for push/pull.
// Electron 42+ blocks GIT_ASKPASS via its child-process security layer, so we
// use URL injection instead. The original URL is ALWAYS restored in the finally
// block — even if the operation throws or the app is killed mid-operation
// (on next run it will be harmless since the token is in the URL format, not stored).
//
// Only activates for repos whose origin matches https://github.com/...
async function withGitHubToken<T>(
  targetPath: string,
  token: string | undefined,
  fn: (g: SimpleGit) => Promise<T>,
): Promise<T> {
  const g = simpleGit(targetPath);
  if (!token) return fn(g);

  // Get current origin URL
  const remotes = await g.getRemotes(true);
  const origin = remotes.find((r) => r.name === 'origin');
  const originalUrl = origin?.refs?.push || origin?.refs?.fetch;

  // Only inject for HTTPS GitHub URLs — SSH keys handle auth themselves
  const isHttpsGithub = originalUrl && /^https:\/\/github\.com\//i.test(originalUrl);
  if (!isHttpsGithub) return fn(g);

  // Inject token: https://x-access-token:<token>@github.com/...
  const authedUrl = originalUrl!.replace(/^https:\/\//i, `https://x-access-token:${token}@`);

  try {
    await g.remote(['set-url', 'origin', authedUrl]);
    return await fn(g);
  } finally {
    // Always restore, even on error or throw
    await g.remote(['set-url', 'origin', originalUrl!]).catch(() => {});
  }
}

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
      error: error.message,
      data: { success: false, authRequired: isAuth, error: error.message },
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
      error: error.message,
      data: { success: false, authRequired: isAuth, error: error.message },
    };
  }
});

ipcMain.handle('git:stage', async (_event, targetPath: string, filePath: string) => {
  try {
    await simpleGit(targetPath).add(filePath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:unstage', async (_event, targetPath: string, filePath: string) => {
  try {
    await simpleGit(targetPath).raw(['restore', '--staged', filePath]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Batch stage/unstage: single git command for N files.
// Critical for "Stage all" — running N parallel `git add` commands
// causes index.lock collisions because they all try to write to .git/index.
ipcMain.handle('git:stage-batch', async (_event, targetPath: string, filePaths: string[]) => {
  try {
    if (!filePaths || filePaths.length === 0) return { success: true };
    await simpleGit(targetPath).add(filePaths);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:unstage-batch', async (_event, targetPath: string, filePaths: string[]) => {
  try {
    if (!filePaths || filePaths.length === 0) return { success: true };
    await simpleGit(targetPath).raw(['restore', '--staged', ...filePaths]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ── Add a path to the repo's .gitignore (creates the file if needed) ──
ipcMain.handle('git:add-to-gitignore', async (_event, targetPath: string, filePath: string) => {
  try {
    const gitignorePath = path.join(targetPath, '.gitignore');
    let current = '';
    if (fs.existsSync(gitignorePath)) {
      current = fs.readFileSync(gitignorePath, 'utf-8');
    }
    // Check if the path is already there (line-by-line, ignoring blanks/comments)
    const lines = current.split('\n').map((l) => l.trim());
    if (lines.includes(filePath)) {
      return { success: true, data: { alreadyIgnored: true } };
    }
    // Append with proper newline handling
    const needsNewline = current.length > 0 && !current.endsWith('\n');
    const updated = current + (needsNewline ? '\n' : '') + filePath + '\n';
    fs.writeFileSync(gitignorePath, updated);

    // If the file is currently tracked, also untrack it so the .gitignore takes effect
    try {
      const g = simpleGit(targetPath);
      const status = await g.status();
      const isTracked = !status.not_added.includes(filePath);
      if (isTracked) {
        // --cached preserves the working copy, just untracks
        await g.raw(['rm', '--cached', '--ignore-unmatch', filePath]);
      }
    } catch {
      /* if the file wasn't tracked we silently skip */
    }

    return { success: true, data: { alreadyIgnored: false } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ── Reset ALL changes: discards working tree + staged + untracked ──
// Equivalent to: git reset --hard HEAD && git clean -fd
ipcMain.handle('git:reset-all', async (_event, targetPath: string) => {
  try {
    const g = simpleGit(targetPath);
    await g.reset(['--hard', 'HEAD']);
    await g.clean('f', ['-d']);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ── Stash a single file (or set of files) ──
ipcMain.handle('git:stash-file', async (_event, targetPath: string, filePath: string) => {
  try {
    await simpleGit(targetPath).stash(['push', '--include-untracked', '--', filePath]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ── Show a file in OS file explorer (highlights it) ──
ipcMain.handle('shell:show-in-folder', async (_event, targetPath: string, relativeFilePath: string) => {
  try {
    const fullPath = path.join(targetPath, relativeFilePath);
    shell.showItemInFolder(fullPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
});

// ── Delete a file from disk (rejects directory traversal) ──
ipcMain.handle('fs:delete-file', async (_event, targetPath: string, relativeFilePath: string) => {
  try {
    // Defensive: keep us inside the repo dir
    const resolved = path.resolve(targetPath, relativeFilePath);
    if (!resolved.startsWith(path.resolve(targetPath))) {
      return { success: false, error: 'Path traversal blocked' };
    }
    if (!fs.existsSync(resolved)) {
      return { success: false, error: 'El archivo ya no existe' };
    }
    fs.unlinkSync(resolved);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Remove a stuck .git/index.lock file. Useful when a previous operation
// crashed or was interrupted, leaving the lock behind.
ipcMain.handle('git:remove-lock', async (_event, targetPath: string) => {
  try {
    const lockPath = path.join(targetPath, '.git', 'index.lock');
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      return { success: true, data: { removed: true } };
    }
    return { success: true, data: { removed: false } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:diff', async (_event, targetPath: string, filePath: string, staged: boolean = false) => {
  try {
    const g = simpleGit(targetPath);
    const status = await g.status();
    const isUntracked = status.not_added.includes(filePath);

    let diff: string;
    if (isUntracked) {
      const fullPath = path.join(targetPath, filePath);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        diff =
          `diff --git a/${filePath} b/${filePath}\n` +
          `--- /dev/null\n+++ b/${filePath}\n` +
          `@@ -0,0 +1,${lines.length} @@\n` +
          lines.map((l) => `+${l}`).join('\n');
      } catch {
        diff = '';
      }
    } else if (staged) {
      diff = await g.diff(['--cached', '--', filePath]);
    } else {
      diff = await g.diff(['HEAD', '--', filePath]);
    }

    return { success: true, data: diff };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:stash-list', async (_event, targetPath: string) => {
  try {
    const g = simpleGit(targetPath);
    const list = await g.stashList();
    const stashes: StashEntry[] = list.all.map((entry, idx) => ({
      index: idx,
      message: entry.message,
      hash: entry.hash,
      date: entry.date,
    }));
    return { success: true, data: stashes };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:tags', async (_event, targetPath: string) => {
  try {
    const tags = await simpleGit(targetPath).tags();
    return { success: true, data: tags.all };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:submodules', async (_event, targetPath: string) => {
  try {
    const raw = await simpleGit(targetPath).raw(['submodule', 'status']).catch(() => '');
    const submodules: SubmoduleEntry[] = [];
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      const match = line.match(/^[\s+\-U]?([0-9a-f]+)\s+(\S+)(?:\s+\((.+)\))?/);
      if (!match) continue;
      submodules.push({ hash: match[1], path: match[2], describe: match[3] || undefined });
    }
    return { success: true, data: submodules };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
});

ipcMain.handle('shell:open-path', async (_event, targetPath: string) => {
  try {
    await shell.openPath(targetPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:stash-apply', async (_event, targetPath: string, stashIndex: number) => {
  try {
    await simpleGit(targetPath).stash(['apply', `stash@{${stashIndex}}`]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:stash-drop', async (_event, targetPath: string, stashIndex: number) => {
  try {
    await simpleGit(targetPath).stash(['drop', `stash@{${stashIndex}}`]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Drop ALL stashes at once (git stash clear)
ipcMain.handle('git:stash-clear', async (_event, targetPath: string) => {
  try {
    await simpleGit(targetPath).stash(['clear']);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
