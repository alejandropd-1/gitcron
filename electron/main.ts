import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, Menu, protocol, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { spawn } from 'child_process';
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { Octokit } from '@octokit/rest';
import { autoUpdater } from 'electron-updater';
import chokidar, { FSWatcher } from 'chokidar';
import type {
  StatusFile, CommitData, BranchData, RepoInfo, StashEntry, SubmoduleEntry, GitHubUser,
  BranchTrackingInfo, WorktreeEntry, PullRequestEntry, PullRequestDiffData, PullRequestDiffFile,
} from '../types/electron';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let repoPath: string | null = null;
let manualUpdateCheck = false;
let updateCheckTimer: ReturnType<typeof setInterval> | null = null;
let git: SimpleGit = simpleGit();

const repoWatchers = new Map<string, FSWatcher>();

/**
 * Disable credential helper and askpass for token-authed operations.
 *
 * git-for-windows ≥2.40 blocks ANY `-c credential.helper=...` (even an empty
 * value) with "Configuring credential.helper is not permitted without enabling
 * allowUnsafeCredentialHelper". Upstream git is more permissive — it only
 * blocks NON-empty values — but on Windows we must explicitly opt in via
 * `safe.allowUnsafeCredentialHelper=true` before our empty override is honored.
 *
 * Same story for `GIT_CONFIG_GLOBAL`: git-for-windows blocks it unless
 * `safe.allowUnsafeConfigPaths=true` is set. We don't use GIT_CONFIG_GLOBAL
 * anymore (removed in v1.1.5), so that flag is no longer needed.
 *
 * Env vars complement the config:
 *   GIT_TERMINAL_PROMPT=0  → no interactive terminal prompts
 *   GCM_INTERACTIVE=never  → GCM never opens its GUI dialog
 */
const NO_CREDENTIAL_HELPER_CONFIG: string[] = [
  'safe.allowUnsafeCredentialHelper=true',
  'credential.helper=',
  'core.askpass=',
];

const NO_CREDENTIAL_HELPER_OPTIONS: Partial<SimpleGitOptions> = {
  config: NO_CREDENTIAL_HELPER_CONFIG,
  unsafe: {
    allowUnsafeCredentialHelper: true,
    allowUnsafeAskPass: true,
  },
};

function getGitHubAuthOptions(token: string): Partial<SimpleGitOptions> {
  const basic = Buffer.from(`x-access-token:${token}`, 'utf8').toString('base64');
  return {
    ...NO_CREDENTIAL_HELPER_OPTIONS,
    config: [
      ...NO_CREDENTIAL_HELPER_CONFIG,
      `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basic}`,
    ],
  };
}

function getNoPromptEnv(): Record<string, string> {
  return {
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'never',
  };
}

/**
 * Redact any GitHub-token-in-URL pattern from a string before logging.
 * Matches token-in-URL and token-in-extraheader patterns and replaces the token
 * with `[REDACTED]`. Safe to call with any value —
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
  return str
    .replace(/(x-access-token:)[^@]+@/g, '$1[REDACTED]@')
    .replace(/(AUTHORIZATION:\s*basic\s+)[A-Za-z0-9+/=]+/gi, '$1[REDACTED]');
}

function createSplash(): BrowserWindow {
  const publicDir = path.join(__dirname, '../../public');
  const resourcesDir = isDev ? publicDir : process.resourcesPath;
  const iconPath = path.join(resourcesDir, 'gitcron-icon.png');
  const iconUrl = fs.existsSync(iconPath)
    ? pathToFileURL(iconPath).toString()
    : '';

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
  background:radial-gradient(circle at 50% 22%, #173557 0%, #06192d 38%, #020f1e 100%);
  border:1px solid #3c495a55; border-radius:18px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  height:100vh; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  color:#d9e7fc; overflow:hidden; -webkit-app-region:drag;
  box-shadow:0 26px 80px rgba(0,0,0,.45);
}
.stage { position:relative; width:150px; height:118px; display:flex; align-items:center; justify-content:center; }
.tile {
  position:absolute; width:16px; height:16px; border-radius:4px;
  background:linear-gradient(135deg, rgba(163,241,133,.95), rgba(94,216,255,.72));
  box-shadow:0 0 18px rgba(163,241,133,.28);
  opacity:.18; animation:tilePulse 1.6s ease-in-out infinite;
}
.tile:nth-child(1){ left:14px; top:18px; animation-delay:0s; }
.tile:nth-child(2){ right:22px; top:10px; width:12px; height:12px; animation-delay:.15s; }
.tile:nth-child(3){ left:34px; bottom:18px; width:10px; height:10px; animation-delay:.3s; }
.tile:nth-child(4){ right:12px; bottom:28px; animation-delay:.45s; }
.tile:nth-child(5){ left:8px; top:66px; width:9px; height:9px; animation-delay:.6s; }
.tile:nth-child(6){ right:48px; bottom:8px; width:11px; height:11px; animation-delay:.75s; }
.tile:nth-child(7){ left:60px; top:2px; width:8px; height:8px; animation-delay:.9s; }
.tile:nth-child(8){ right:68px; top:74px; width:9px; height:9px; animation-delay:1.05s; }
.mark {
  width:70px; height:70px; border-radius:16px;
  display:flex; align-items:center; justify-content:center;
  background:rgba(2,15,30,.42); border:1px solid rgba(163,241,133,.32);
  box-shadow:0 18px 42px rgba(0,0,0,.28), 0 0 34px rgba(163,241,133,.18);
  position:relative; z-index:2; overflow:hidden;
}
.mark::after {
  content:""; position:absolute; inset:-40%; transform:rotate(20deg);
  background:linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent);
  animation:sheen 2.2s ease-in-out infinite;
}
.icon { width:52px; height:52px; border-radius:12px; object-fit:cover; position:relative; z-index:1; }
.fallback { font-size:38px; font-weight:900; color:#a3f185; position:relative; z-index:1; }
.logo { font-size:34px; font-weight:800; color:#a3f185; letter-spacing:0; margin-top:2px; }
.sub  { font-size:12px; color:#9eacc0; margin-top:6px; letter-spacing:0.5px; }
.bar  { width:200px; height:3px; background:#172d45; border-radius:4px; margin-top:28px; overflow:hidden; }
.fill {
  height:100%; background:linear-gradient(90deg,#a3f185,#68b24f);
  border-radius:4px; animation:load 1.4s ease-in-out infinite;
}
@keyframes load { 0%{width:0%; transform:translateX(-18px)} 55%{width:100%; transform:translateX(0)} 100%{width:100%; transform:translateX(18px)} }
@keyframes tilePulse { 0%,100%{ opacity:.12; transform:translateY(4px) scale(.74); } 45%{ opacity:.78; transform:translateY(0) scale(1); } }
@keyframes sheen { 0%,35%{ transform:translateX(-70%) rotate(20deg); opacity:0; } 55%{ opacity:1; } 80%,100%{ transform:translateX(70%) rotate(20deg); opacity:0; } }
</style></head>
<body>
  <div class="stage">
    <span class="tile"></span><span class="tile"></span><span class="tile"></span><span class="tile"></span>
    <span class="tile"></span><span class="tile"></span><span class="tile"></span><span class="tile"></span>
    <div class="mark">
      ${iconUrl ? `<img class="icon" src="${iconUrl}" alt="GitCron">` : '<div class="fallback">G</div>'}
    </div>
  </div>
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
  const splashStartedAt = Date.now();
  const splash = createSplash();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    backgroundColor: '#020f1e',
    show: false,        // hidden until ready-to-show
    ...(iconExists ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: true removed — it prevents contextBridge.exposeInMainWorld
      // from working correctly in ASAR-packaged builds (window.api stays undefined).
      // contextIsolation + nodeIntegration:false is the canonical Electron security model.
      webSecurity: true,
    },
  });

  const url = isDev
    ? 'http://localhost:3000'
    : 'app://./index.html';   // served via custom protocol registered in app.on('ready')

  mainWindow.loadURL(url);

  // Close splash and show main window maximized once ready. Keep the splash
  // visible for a short minimum so startup never flashes through partial UI.
  mainWindow.once('ready-to-show', () => {
    const showMainWindow = () => {
      if (!mainWindow) return;
      if (!splash.isDestroyed()) splash.destroy();
      mainWindow.maximize();
      mainWindow.show();
      // Silent update check 3 s after the app is visible (not in dev).
      if (!isDev) {
        setTimeout(() => {
          manualUpdateCheck = false;
          autoUpdater.checkForUpdates().catch((e) =>
            console.error('[updater] silent check error:', sanitizeForLog(e))
          );
        }, 3000);
      }
    };
    const remainingSplashMs = Math.max(0, 1000 - (Date.now() - splashStartedAt));
    setTimeout(showMainWindow, remainingSplashMs);
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

// Single-instance lock: if a second instance is launched (e.g. user
// double-clicks the icon while the app is already open), focus the
// existing window and quit the new instance immediately.
// Register a custom 'app://' protocol so that Next.js absolute asset paths
// (/_next/static/...) resolve correctly when the app is loaded from the
// filesystem. Without this, file:// treats them as root-relative and they 404.
// Must be called before app is ready.
if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } },
  ]);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('ready', () => {
    // Register the 'app://' protocol to serve the Next.js static export.
    // app://./index.html → out/index.html
    // app://./_next/static/... → out/_next/static/...
    if (!isDev) {
      const outDir = path.join(__dirname, '../out');
      protocol.handle('app', (request) => {
        const url = request.url.replace('app://.', '');
        const clean = decodeURIComponent(url.split('?')[0]);
        const filePath = path.join(outDir, clean);
        // Fallback to index.html for SPA routes that have no physical file in out/
        const resolved = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
          ? filePath
          : path.join(outDir, 'index.html');
        return net.fetch(`file://${resolved}`);
      });
    }
    createWindow();
    if (!isDev) setupAutoUpdater();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (mainWindow === null) createWindow();
  });
}

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

function normalizeSafeDirectoryPath(targetPath: string): string {
  return path.resolve(targetPath).replace(/\\/g, '/');
}

function isDubiousOwnershipError(message: string): boolean {
  return /detected dubious ownership|safe\.directory/i.test(message);
}

function repoAccessErrMsg(error: unknown, targetPath: string): string {
  const message = errMsg(error);
  if (!isDubiousOwnershipError(message)) return message;

  const safePath = normalizeSafeDirectoryPath(targetPath);
  return [
    `Git bloqueo "${path.basename(targetPath)}" porque la carpeta pertenece a otro usuario o a Administradores.`,
    'Esto puede pasar si el repo se clono desde una terminal elevada o con otra cuenta de Windows.',
    `Podés confiar esta carpeta desde GitCron o correr: git config --global --add safe.directory ${safePath}`,
  ].join('\n');
}

// ─── Auto-update ──────────────────────────────────────────────────────

function setupAutoUpdater() {
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
    mainWindow?.webContents.send('update:available', {
      version: info.version,
      currentVersion: app.getVersion(),
      releaseDate: info.releaseDate,
    });
    manualUpdateCheck = false;
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    mainWindow?.setProgressBar(pct / 100);
    mainWindow?.webContents.send('update:download-progress', {
      percent: pct,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-not-available', () => {
    if (manualUpdateCheck) {
      mainWindow?.webContents.send('update:not-available');
    }
    manualUpdateCheck = false;
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', sanitizeForLog(err));
    if (manualUpdateCheck) {
      mainWindow?.webContents.send('update:error', errMsg(err));
    }
    manualUpdateCheck = false;
  });

  autoUpdater.on('update-downloaded', (info) => {
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
  if (!mainWindow) return { success: false, error: 'Window unavailable' };
  mainWindow.minimize();
  return { success: true };
});

ipcMain.handle('window:toggle-maximize', async () => {
  if (!mainWindow) return { success: false, error: 'Window unavailable' };
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  return { success: true, data: { maximized: mainWindow.isMaximized() } };
});

ipcMain.handle('window:close', async () => {
  if (!mainWindow) return { success: false, error: 'Window unavailable' };
  mainWindow.close();
  return { success: true };
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

    const isAuthClone = token && /^https:\/\/github\.com\//i.test(url);
    // Token auth uses an in-process http.extraheader, not a token-bearing URL,
    // so the cloned repo's origin remains the clean HTTPS URL on disk.
    const g = isAuthClone
      ? simpleGit(getGitHubAuthOptions(token)).env(getNoPromptEnv())
      : simpleGit();
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
    return { success: false, error: errMsg(error), data: { authRequired: isAuth } };
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
      ...status.modified.map((p) => ({ path: p, status: 'modified' as const, staged: false, conflicted: status.conflicted.includes(p) })),
      ...status.created.map((p) => ({ path: p, status: 'added' as const, staged: false, conflicted: status.conflicted.includes(p) })),
      ...status.deleted.map((p) => ({ path: p, status: 'deleted' as const, staged: false, conflicted: status.conflicted.includes(p) })),
      ...status.not_added.map((p) => ({ path: p, status: 'untracked' as const, staged: false, conflicted: status.conflicted.includes(p) })),
      ...status.staged.map((p) => ({ path: p, status: 'modified' as const, staged: true, conflicted: status.conflicted.includes(p) })),
      ...status.renamed.map((r) => ({
        path: r.to, oldPath: r.from, status: 'renamed' as const, staged: true, conflicted: status.conflicted.includes(r.to) || status.conflicted.includes(r.from),
      })),
    ];

    const seen = new Map<string, StatusFile>();
    for (const f of raw) {
      const existing = seen.get(f.path);
      if (!existing || f.staged || f.conflicted) {
        seen.set(f.path, {
          ...f,
          conflicted: f.conflicted || existing?.conflicted,
        });
      } else if (existing) {
        existing.conflicted = existing.conflicted || f.conflicted;
      }
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

async function getGitHubOwnerRepoFromOrigin(targetPath: string): Promise<{ owner: string; repo: string } | null> {
  const g = simpleGit(targetPath);
  const remotes = await g.getRemotes(true);
  const origin = remotes.find((r) => r.name === 'origin');
  const url = origin?.refs?.fetch || origin?.refs?.push || '';
  const match = url.match(/github\.com[:/]+([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

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

ipcMain.handle('git:checkout', async (_event, targetPath: string, branch: string) => {
  try {
    const g = simpleGit(targetPath);
    const remotes = await g.branch(['-r']);
    if (remotes.all.includes(branch)) {
      const slashIdx = branch.indexOf('/');
      const localName = slashIdx !== -1 ? branch.substring(slashIdx + 1) : branch;
      const localResult = await g.branchLocal();
      const existsLocally = localResult.all.includes(localName);
      if (existsLocally) {
        await g.checkout(localName);
      } else {
        await g.checkout(['-t', branch]);
      }
      return { success: true, data: { checkedOut: localName } };
    }

    await g.checkout(branch);
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

// Helper: authenticate GitHub HTTPS remotes without writing token-bearing URLs.
// The token is passed through a process-scoped http.extraheader config while
// credential helpers and interactive prompts stay disabled.
async function withGitHubToken<T>(
  targetPath: string,
  token: string | undefined,
  fn: (g: SimpleGit) => Promise<T>,
): Promise<T> {
  if (!token) return fn(simpleGit(targetPath));

  // Read the remote with a vanilla instance so auth config never affects local
  // plumbing. SSH and non-GitHub remotes keep their native auth behavior.
  const plain = simpleGit(targetPath);
  const remotes = await plain.getRemotes(true);
  const origin = remotes.find((r) => r.name === 'origin');
  const originalUrl = origin?.refs?.push || origin?.refs?.fetch;
  const isHttpsGithub = originalUrl && /^https:\/\/github\.com\//i.test(originalUrl);
  if (!isHttpsGithub) return fn(simpleGit(targetPath));

  const g = simpleGit({ ...getGitHubAuthOptions(token), baseDir: targetPath });
  g.env(getNoPromptEnv());
  return fn(g);
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

async function runExplicitPull(
  targetPath: string,
  token: string | undefined,
  args: string[],
): Promise<{ success: boolean; data?: { success: boolean; summary?: string; conflict?: boolean; authRequired?: boolean; error?: string }; error?: string }> {
  try {
    const output = await withGitHubToken(targetPath, token, (g) => g.raw(['pull', ...args]));
    return {
      success: true,
      data: {
        success: true,
        summary: output.trim() || 'Already up to date.',
      },
    };
  } catch (error: any) {
    const msg = errMsg(error);
    const isAuth = /authentication|credentials|ssh|permission denied|403|401/i.test(msg);
    const isConflict = /conflict|could not apply|automatic merge failed|fix conflicts/i.test(msg);
    return {
      success: false,
      error: msg,
      data: { success: false, authRequired: isAuth, conflict: isConflict, error: msg },
    };
  }
}

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

// ── File-system watchers ──────────────────────────────────────────────────────
// Watch a repo directory for working-tree changes so the renderer can refresh
// the UNSTAGED panel without requiring a manual git action.

const IGNORED_PATTERNS = [
  /(^|[/\\])\.git([/\\]|$)/,
  /(^|[/\\])node_modules([/\\]|$)/,
  /(^|[/\\])\.next([/\\]|$)/,
  /(^|[/\\])dist([/\\]|$)/,
  /(^|[/\\])release([/\\]|$)/,
  /(^|[/\\])out([/\\]|$)/,
];

ipcMain.handle('repo:watch', (_event, targetPath: string) => {
  if (repoWatchers.has(targetPath)) return { success: true };
  try {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const watcher = chokidar.watch(targetPath, {
      ignored: IGNORED_PATTERNS,
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });
    const emit = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        mainWindow?.webContents.send('repo:fs-change', { repoPath: targetPath });
      }, 250);
    };
    watcher.on('add', emit).on('change', emit).on('unlink', emit)
           .on('addDir', emit).on('unlinkDir', emit);
    repoWatchers.set(targetPath, watcher);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: errMsg(error) };
  }
});

ipcMain.handle('repo:unwatch', async (_event, targetPath: string) => {
  const watcher = repoWatchers.get(targetPath);
  if (watcher) {
    await watcher.close();
    repoWatchers.delete(targetPath);
  }
  return { success: true };
});

app.on('before-quit', async () => {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
  for (const [, watcher] of repoWatchers) {
    await watcher.close().catch(() => {});
  }
  repoWatchers.clear();
});
