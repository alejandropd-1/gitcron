import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, Menu } from 'electron';
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

/**
 * Git does NOT allow setting credential.helper= via `-c` on the command line
 * since git 2.35.2 (CVE-2022-24765 hardening). Using it produces:
 *   "Configuring credential.helper is not permitted without enabling
 *    allowUnsafeCredentialHelper"
 *
 * Instead we achieve the same goal through environment variables:
 *
 *   GIT_ASKPASS=echo          → git runs `echo` when it needs a username or
 *                               password; `echo` with no args returns an empty
 *                               line, so every credential prompt returns empty.
 *                               This prevents GCM and OS keychains from being
 *                               consulted, so the auth'd URL is never cached.
 *   GIT_CREDENTIAL_HELPER=''  → explicit empty string tells git not to use
 *                               any helper for this invocation (works in all
 *                               git versions without the CVE restriction).
 *   GIT_TERMINAL_PROMPT=0     → disables interactive terminal prompts.
 *   GCM_INTERACTIVE=never     → GCM-specific: never open the GUI dialog.
 *
 * No config array is needed; everything goes through the env.
 */
const NO_CREDENTIAL_HELPER_CONFIG: string[] = []; // nothing — handled via env

/**
 * Env vars that prevent git from caching credentials or opening prompts.
 * NOTE: GIT_ASKPASS and GIT_CREDENTIAL_HELPER are intentionally excluded —
 * git 2.35.2+ (CVE-2022-24765) blocks both unless allowUnsafeAskPass /
 * allowUnsafeCredentialHelper are explicitly enabled. GIT_TERMINAL_PROMPT=0
 * is sufficient to block interactive prompts without triggering that guard.
 */
const NO_PROMPT_ENV = {
  GIT_TERMINAL_PROMPT: '0',
  GCM_INTERACTIVE: 'never',    // Git Credential Manager: never open GUI
};

/**
 * Redact any GitHub-token-in-URL pattern from a string before logging.
 * Matches `https://x-access-token:<TOKEN>@host/...` produced by withGitHubToken
 * and replaces the token with `[REDACTED]`. Safe to call with any value —
 * non-strings are stringified first.
 */
function sanitizeForLog(value: unknown): string {
  let str: string;
  try {
    str = typeof value === 'string'
      ? value
      : value instanceof Error
        ? `${value.name}: ${value.message}`
        : JSON.stringify(value);
  } catch {
    str = String(value);
  }
  return str.replace(/(x-access-token:)[^@]+@/g, '$1[REDACTED]@');
}

function createSplash(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background:#020f1e; border:1px solid #3c495a55; border-radius:16px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  height:100vh; font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;
  color:#d9e7fc; overflow:hidden; -webkit-app-region:drag;
}
.logo { font-size:42px; font-weight:800; color:#a3f185; letter-spacing:-1px; }
.sub  { font-size:13px; color:#9eacc0; margin-top:6px; letter-spacing:0.5px; }
.bar  { width:200px; height:3px; background:#172d45; border-radius:4px; margin-top:32px; overflow:hidden; }
.fill {
  height:100%; background:linear-gradient(90deg,#a3f185,#68b24f);
  border-radius:4px; animation:load 1.4s ease-in-out forwards;
}
@keyframes load { from{width:0%} to{width:100%} }
</style></head>
<body>
  <div class="logo">GitCron</div>
  <div class="sub">Advanced Git Client</div>
  <div class="bar"><div class="fill"></div></div>
</body></html>`;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return splash;
}

function createWindow() {
  // Remove the default native menu bar (File / Edit / View / Window).
  // GitCron uses a custom in-app topbar for all actions.
  // On macOS we keep a minimal menu so Cmd+Q and system clipboard shortcuts work.
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
    ]));
  } else {
    Menu.setApplicationMenu(null);
  }

  // Resolve the app icon.
  const publicDir = path.join(__dirname, '../../public');
  const resourcesDir = isDev ? publicDir : process.resourcesPath;
  const icoPath = path.join(resourcesDir, 'favicon.ico');
  const pngPath = path.join(resourcesDir, 'gitcron-icon.png');
  const iconPath = fs.existsSync(icoPath) ? icoPath : pngPath;
  const iconExists = fs.existsSync(iconPath);

  // Show splash while the renderer loads.
  const splash = createSplash();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#041425',
    show: false,        // hidden until ready-to-show
    ...(iconExists ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    titleBarStyle: 'hiddenInset',
  });

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(url);

  // Close splash and show main window maximized once ready.
  mainWindow.once('ready-to-show', () => {
    splash.destroy();
    mainWindow!.maximize();
    mainWindow!.show();
  });

  // DevTools toggle in dev only: Ctrl+Shift+I (Win/Linux) or Cmd+Option+I (macOS).
  if (isDev) {
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      const trigger = process.platform === 'darwin'
        ? input.meta && input.alt && input.key === 'I'
        : input.control && input.shift && input.key === 'I';
      if (trigger) mainWindow?.webContents.toggleDevTools();
    });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
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
    console.error('readEncryptedStorage error:', sanitizeForLog(err));
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
    return { success: false, error: errMsg(error) };
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
    return { success: false, error: errMsg(error) };
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

ipcMain.handle('git:command', async (_event, targetPath: string, args: string[]) => {
  try {
    console.log('Executing git command:', targetPath, sanitizeForLog(args));
    const scopedGit = simpleGit(targetPath);
    let result;
    const command = args[0];

    switch (command) {
      case 'status': result = await scopedGit.status(); break;
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
        result = await scopedGit.commit(message);
        break;
      }
      case 'merge': result = await scopedGit.merge(args.slice(1)); break;
      case 'revert':
        result = await scopedGit.revert(args[1], args.slice(2).reduce((acc, curr) => ({ ...acc, [curr]: true }), {}));
        break;
      case 'stash': result = await scopedGit.stash(args.slice(1)); break;
      case 'restore': result = await scopedGit.raw(['restore', args[1]]); break;
      default: result = await scopedGit.raw(args);
    }
    return { success: true, data: typeof result === 'string' ? result : JSON.stringify(result) };
  } catch (error: any) {
    console.error('Git Command Error:', sanitizeForLog(error));
    return { success: false, error: errMsg(error) };
  }
});

ipcMain.handle('github:test', async (_event, { token, owner, repo }) => {
  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.pulls.list({ owner, repo, state: 'open' });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

// ─── GitHub OAuth Device Flow ─────────────────────────────────────────
// Uses the GitHub CLI's public OAuth Client ID for personal-use device flow.
// This works without a client secret and is the same flow `gh auth login` uses.
const GITHUB_CLIENT_ID = '178c6fc778ccc68e1d6a';
const GITHUB_OAUTH_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'GitCron',
};

function formatFetchError(error: unknown): string {
  const err = error as { message?: string; cause?: { message?: string; code?: string } };
  const message = err?.message ?? 'Unknown error';
  const causeMessage = err?.cause?.message;
  const causeCode = err?.cause?.code;
  return sanitizeForLog([message, causeCode, causeMessage].filter(Boolean).join(' - '));
}

/**
 * Safely extract a sanitized error message from any thrown value.
 * Replaces `error.message` in every IPC return path so tokens never leak
 * through git CLI error output (e.g. "fatal: unable to access https://x-access-token:abc@github.com/...").
 */
function errMsg(error: unknown): string {
  const e = error as { message?: string };
  return sanitizeForLog(e?.message ?? String(error));
}

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
    return { success: false, error: errMsg(error) };
  }
});

// ── Open a specific path directly (no dialog) — used to restore last repo ──
ipcMain.handle('git:open-path', async (_event, dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      return { success: false, error: `La carpeta ya no existe: ${dirPath}` };
    }
    const testGit = simpleGit(dirPath);
    const isRepo = await testGit.checkIsRepo();
    if (!isRepo) {
      return { success: false, error: `"${path.basename(dirPath)}" ya no es un repositorio git` };
    }
    repoPath = dirPath;
    git = simpleGit(repoPath);
    const status = await git.status();
    const info: RepoInfo = {
      path: repoPath,
      name: path.basename(repoPath),
      currentBranch: status.current ?? 'HEAD',
      isGitRepo: true,
    };
    return { success: true, data: info };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

ipcMain.handle('git:open-repo', async (_event, defaultPath?: string) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Seleccionar repositorio Git',
      defaultPath: defaultPath || undefined,
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

    // For clone, inject the token directly in the URL when it's a GitHub HTTPS URL.
    // GIT_ASKPASS is blocked by Electron 42's child-process security layer.
    let cloneUrl = url;
    const isAuthClone = token && /^https:\/\/github\.com\//i.test(url);
    if (isAuthClone) {
      // URL-encode the token so chars like '@' or ':' don't break URL parsing
      const encodedToken = encodeURIComponent(token);
      cloneUrl = url.replace(/^https:\/\//i, `https://x-access-token:${encodedToken}@`);
    }
    // When we inject a token, disable the OS credential helper for THIS clone
    // so the auth'd URL never gets cached in Windows Credential Manager /
    // macOS Keychain / libsecret as a ghost 'x-access-token' account.
    const g = isAuthClone
      ? simpleGit({ config: NO_CREDENTIAL_HELPER_CONFIG }).env(NO_PROMPT_ENV)
      : simpleGit();
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
    return { success: false, error: errMsg(error), data: { authRequired: isAuth } };
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

ipcMain.handle('git:log', async (_event, targetPath: string, opts?: { allBranches?: boolean }) => {
  try {
    const g = simpleGit(targetPath);
    // Use --decorate to get branch/tag refs at each commit
    const allBranches = opts?.allBranches !== false;
    const args = ['log'];
    if (allBranches) args.push('--all');
    args.push('--max-count=500', '--date-order', '--pretty=format:%H%x1f%P%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%D');
    const raw = await g.raw(args);

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
    return { success: false, error: errMsg(error) };
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
    return { success: false, error: errMsg(error) };
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
    return { success: false, error: errMsg(error) };
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
    return { success: false, error: errMsg(error) };
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
    return { success: false, error: errMsg(error) };
  }
});

ipcMain.handle('git:checkout', async (_event, targetPath: string, branch: string) => {
  try {
    await simpleGit(targetPath).checkout(branch);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

ipcMain.handle('git:create-branch', async (_event, targetPath: string, name: string, fromHash?: string) => {
  try {
    const g = simpleGit(targetPath);
    if (fromHash) await g.checkoutBranch(name, fromHash);
    else await g.checkoutLocalBranch(name);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

// ── Merge a branch INTO the current branch ──
ipcMain.handle('git:merge-branch', async (_event, targetPath: string, sourceBranch: string) => {
  try {
    const g = simpleGit(targetPath);
    const result = await g.merge([sourceBranch]);
    // Detect "Already up to date." — git exits 0 but nothing changed
    const alreadyUpToDate = /already up.to.date/i.test(result.result ?? '');
    return { success: true, data: { ...result, alreadyUpToDate } };
  } catch (error: any) {
    // simple-git throws on merge conflict — extract useful info
    const msg = sanitizeForLog(error.message || String(error));
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
    const msg = sanitizeForLog(error.message || String(error));
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
    return { success: false, error: errMsg(error) };
  }
});

// ── Rename a branch (works for the current branch too) ──
ipcMain.handle('git:rename-branch', async (_event, targetPath: string, oldName: string, newName: string) => {
  try {
    await simpleGit(targetPath).raw(['branch', '-m', oldName, newName]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

// ── Delete a local branch. `force=true` uses -D (even if unmerged) ──
ipcMain.handle('git:delete-branch', async (_event, targetPath: string, branch: string, force: boolean = false) => {
  try {
    const flag = force ? '-D' : '-d';
    await simpleGit(targetPath).raw(['branch', flag, branch]);
    return { success: true };
  } catch (error: any) {
    const msg = sanitizeForLog(error.message || String(error));
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
    return { success: false, error: errMsg(error), data: { authRequired: isAuth } };
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
    return { success: false, error: errMsg(error), data: { authRequired: isAuth } };
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
  if (!token) return fn(simpleGit(targetPath));

  // Build a simple-git instance that runs every command with credential
  // helpers disabled. This prevents the auth'd URL from leaking into the
  // OS credential store and avoids GUI prompts on auth failure.
  const g = simpleGit({ baseDir: targetPath, config: NO_CREDENTIAL_HELPER_CONFIG });
  g.env(NO_PROMPT_ENV);

  // We still need a vanilla instance to read/write the remote URL (without
  // the no-helper config affecting unrelated git plumbing).
  const plain = simpleGit(targetPath);

  // Get current origin URL
  const remotes = await plain.getRemotes(true);
  const origin = remotes.find((r) => r.name === 'origin');
  const originalUrl = origin?.refs?.push || origin?.refs?.fetch;

  // Only inject for HTTPS GitHub URLs — SSH keys handle auth themselves
  const isHttpsGithub = originalUrl && /^https:\/\/github\.com\//i.test(originalUrl);
  if (!isHttpsGithub) return fn(g);

  // Inject token: https://x-access-token:<token>@github.com/...
  // URL-encode the token so chars like '@' or ':' don't break URL parsing
  const encodedToken = encodeURIComponent(token);
  const authedUrl = originalUrl!.replace(/^https:\/\//i, `https://x-access-token:${encodedToken}@`);

  try {
    await plain.remote(['set-url', 'origin', authedUrl]);
    return await fn(g);
  } finally {
    // Always restore, even on error or throw
    await plain.remote(['set-url', 'origin', originalUrl!]).catch(() => {});
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

ipcMain.handle('git:stage', async (_event, targetPath: string, filePath: string) => {
  try {
    await simpleGit(targetPath).add(filePath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

ipcMain.handle('git:unstage', async (_event, targetPath: string, filePath: string) => {
  try {
    await simpleGit(targetPath).raw(['restore', '--staged', filePath]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
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
    return { success: false, error: errMsg(error) };
  }
});

ipcMain.handle('git:unstage-batch', async (_event, targetPath: string, filePaths: string[]) => {
  try {
    if (!filePaths || filePaths.length === 0) return { success: true };
    await simpleGit(targetPath).raw(['restore', '--staged', ...filePaths]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
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
    return { success: false, error: errMsg(error) };
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
    return { success: false, error: errMsg(error) };
  }
});

// ── Stash a single file (or set of files) ──
ipcMain.handle('git:stash-file', async (_event, targetPath: string, filePath: string) => {
  try {
    await simpleGit(targetPath).stash(['push', '--include-untracked', '--', filePath]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

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
    return { success: false, error: errMsg(error) };
  }
});

// Amend the last commit. If `newMessage` is provided, replaces the message;
// otherwise keeps the existing one (`--no-edit`). Staged changes (if any) are
// folded into the amended commit either way. Refuses to amend a commit that
// has already been pushed unless the caller has accepted the risk (the UI
// shows a confirmation modal mentioning that pushed commits should not be
// amended without force-pushing).
ipcMain.handle('git:amend', async (_event, targetPath: string, newMessage?: string) => {
  try {
    const g = simpleGit(targetPath);
    // Need at least one commit to amend.
    try {
      await g.revparse(['HEAD']);
    } catch {
      return { success: false, error: 'No hay commits que enmendar' };
    }
    const args = ['commit', '--amend'];
    if (newMessage && newMessage.trim()) {
      args.push('-m', newMessage.trim());
    } else {
      args.push('--no-edit');
    }
    await g.raw(args);
    // Return the new HEAD sha for the caller to display
    const newSha = (await g.revparse(['HEAD'])).trim();
    return { success: true, data: { hash: newSha, shortHash: newSha.slice(0, 7) } };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

// Cherry-pick a single commit onto the current branch. Returns { success,
// conflict? } so the renderer can react: a conflict leaves the working tree
// with conflicted files that the user must resolve and then `git
// cherry-pick --continue` (or abort) from the terminal. We don't auto-commit
// on conflict because the user might want to inspect the merge first.
ipcMain.handle('git:cherry-pick', async (_event, targetPath: string, hash: string) => {
  try {
    if (!/^[0-9a-f]{7,40}$/i.test(hash)) {
      return { success: false, error: 'Hash inválido' };
    }
    const g = simpleGit(targetPath);
    await g.raw(['cherry-pick', hash]);
    return { success: true };
  } catch (error: any) {
    const msg = sanitizeForLog(error.message || String(error));
    const isConflict = /conflict|after resolving|could not apply/i.test(msg);
    return { success: false, error: msg, data: { conflict: isConflict } };
  }
});

// Squash the last N commits into one using `git reset --soft HEAD~N` + `git commit -m`.
// Only works on commits that haven't been pushed (or the caller handles the force-push warning).
ipcMain.handle('git:squash', async (_event, targetPath: string, n: number, message: string) => {
  try {
    if (n < 2 || n > 100) return { success: false, error: 'N debe estar entre 2 y 100' };
    if (!message.trim()) return { success: false, error: 'El mensaje del commit no puede estar vacío' };
    const g = simpleGit(targetPath);
    // Verify there are at least N commits
    const log = await g.log({ maxCount: n + 1 });
    if ((log.total ?? log.all.length) < n) {
      return { success: false, error: `No hay ${n} commits para combinar` };
    }
    // Soft-reset to HEAD~N: stages everything from those N commits
    await g.raw(['reset', '--soft', `HEAD~${n}`]);
    // Commit with the provided message
    await g.commit(message.trim());
    const newSha = (await g.revparse(['HEAD'])).trim();
    return { success: true, data: { hash: newSha, shortHash: newSha.slice(0, 7) } };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

// Returns the list of files changed in a specific commit (for the commit detail panel).
// Uses `git diff-tree` which is fast and doesn't require a worktree checkout.
ipcMain.handle('git:show-files', async (_event, targetPath: string, hash: string) => {
  try {
    if (!/^[0-9a-f]{7,40}$/i.test(hash)) {
      return { success: false, error: 'Hash inválido' };
    }
    const g = simpleGit(targetPath);
    // diff-tree -r: recursive, shows files not just top-level dirs
    // --name-status: shows M/A/D/R + path (same format as git status)
    // --no-commit-id: don't print the commit hash in the output
    const raw = await g.raw(['diff-tree', '--no-commit-id', '-r', '--name-status', hash]);
    const files = raw.trim().split('\n').filter(Boolean).map((line) => {
      const parts = line.split('\t');
      const statusChar = parts[0]?.[0] ?? 'M'; // first char handles R100 → R
      const filePath = parts[2] ?? parts[1] ?? ''; // renamed: old\tnew; else: path
      const oldPath = parts[2] ? parts[1] : undefined;
      const statusMap: Record<string, string> = {
        M: 'modified', A: 'added', D: 'deleted', R: 'renamed', C: 'modified', U: 'modified',
      };
      return {
        path: filePath,
        status: (statusMap[statusChar] ?? 'modified') as 'modified' | 'added' | 'deleted' | 'renamed',
        staged: true,  // all files in a commit are "staged" conceptually
        oldPath,
      };
    });
    return { success: true, data: files };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

// Returns the diff for a specific file AT a specific commit hash.
ipcMain.handle('git:diff-at-commit', async (_event, targetPath: string, filePath: string, hash: string) => {
  try {
    const g = simpleGit(targetPath);
    const diff = await g.raw(['show', `${hash}:${filePath}`]).catch(() => null);
    // Use diff between commit and its parent for the actual diff
    const diffOutput = await g.raw(['diff', `${hash}^`, hash, '--', filePath]).catch(() => '');
    return { success: true, data: diffOutput };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
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
    return { success: false, error: errMsg(error) };
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
    return { success: false, error: errMsg(error) };
  }
});

ipcMain.handle('git:tags', async (_event, targetPath: string) => {
  try {
    const tags = await simpleGit(targetPath).tags();
    return { success: true, data: tags.all };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
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

ipcMain.handle('git:stash-apply', async (_event, targetPath: string, stashIndex: number) => {
  try {
    await simpleGit(targetPath).stash(['apply', `stash@{${stashIndex}}`]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

ipcMain.handle('git:stash-drop', async (_event, targetPath: string, stashIndex: number) => {
  try {
    await simpleGit(targetPath).stash(['drop', `stash@{${stashIndex}}`]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

// Drop ALL stashes at once (git stash clear)
ipcMain.handle('git:stash-clear', async (_event, targetPath: string) => {
  try {
    await simpleGit(targetPath).stash(['clear']);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});
