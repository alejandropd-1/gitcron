// electron/ipc/storage.ts
// Encrypted storage (OS-level) + handlers storage:*.
// Uses Electron's safeStorage which leverages:
//   - Windows: DPAPI (Data Protection API)
//   - macOS:   Keychain
//   - Linux:   libsecret / kwallet
// Encrypted file is stored in app.getPath('userData').

import { app, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { errMsg, sanitizeForLog } from './shared';

const STORAGE_FILENAME = 'storage.enc';

function storagePath(): string {
  return path.join(app.getPath('userData'), STORAGE_FILENAME);
}

export function readEncryptedStorage(): Record<string, string> {
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

export function registerStorageHandlers(): void {
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
}
