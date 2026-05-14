import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { simpleGit, SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';
import type {
  StatusFile, CommitData, BranchData, RepoInfo, StashEntry, SubmoduleEntry, GitHubUser,
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
      case 'commit': result = await git.commit(args.slice(1)); break;
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

    const g = simpleGit();
    if (token) {
      g.env({
        ...process.env,
        GIT_ASKPASS: ensureAskpassScript(),
        GITCRON_TOKEN: token,
        GIT_TERMINAL_PROMPT: '0',
      });
    }
    await g.clone(url, destPath);

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
    const branchData: BranchData = {
      local: local.all,
      remote: remotes.all,
      current: local.current,
    };
    return { success: true, data: branchData };
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

// Helper: run a git operation with GIT_ASKPASS so the token never touches
// the repo's .git/config nor the remote URL on disk. The askpass script
// reads the token from the GITCRON_TOKEN env var only for the lifetime of
// this child process.
async function withGitHubToken<T>(
  targetPath: string,
  token: string | undefined,
  fn: (g: SimpleGit) => Promise<T>,
): Promise<T> {
  const g = simpleGit(targetPath);
  if (!token) return fn(g);

  const askpass = ensureAskpassScript();
  g.env({
    ...process.env,
    GIT_ASKPASS: askpass,
    GITCRON_TOKEN: token,
    // Prevent git from trying interactive terminal prompts
    GIT_TERMINAL_PROMPT: '0',
  });

  return fn(g);
}

ipcMain.handle('git:push', async (_event, targetPath: string, token?: string) => {
  try {
    await withGitHubToken(targetPath, token, (g) => g.push());
    return { success: true, data: { success: true } };
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
