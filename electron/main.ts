import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let git: SimpleGit = simpleGit(); // Default to current directory or set baseDir

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#15121b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Note: In build this may point to the compiled .js
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// --- IPC Handlers ---

ipcMain.handle('git:command', async (_event, args: string[]) => {
  try {
    // Basic implementation: mapping args to simple-git methods or raw
    // For a real app, you'd want a more robust dispatcher
    console.log('Executing git command:', args);
    
    let result;
    const command = args[0];

    switch (command) {
      case 'status':
        result = await git.status();
        break;
      case 'commit':
        result = await git.commit(args.slice(1));
        break;
      case 'merge':
        result = await git.merge(args.slice(1));
        break;
      case 'revert':
        result = await git.revert(args[1], args.slice(2).reduce((acc, curr) => ({...acc, [curr]: true}), {}));
        break;
      case 'stash':
        result = await git.stash(args.slice(1));
        break;
      case 'restore':
        result = await git.raw(['restore', args[1]]);
        break;
      default:
        // Raw fallback for generic commands
        result = await git.raw(args);
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
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open',
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
