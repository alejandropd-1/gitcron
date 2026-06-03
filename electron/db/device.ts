import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { DeviceIdentity } from './types';

export const DEVICE_IDENTITY_FILENAME = 'device.json';

interface DeviceIdentityFile {
  deviceId: string;
  deviceLabel: string | null;
}

function deviceIdentityPath(basePath: string): string {
  return path.join(basePath, DEVICE_IDENTITY_FILENAME);
}

function isDeviceIdentityFile(value: unknown): value is DeviceIdentityFile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.deviceId === 'string'
    && (typeof candidate.deviceLabel === 'string' || candidate.deviceLabel === null)
  );
}

export function getDeviceIdentity(overridePath?: string): DeviceIdentity {
  const basePath = overridePath ?? defaultUserDataPath();
  const filePath = deviceIdentityPath(basePath);

  if (fs.existsSync(filePath)) {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    if (!isDeviceIdentityFile(parsed)) {
      throw new Error('Invalid Temporal Agent device identity file');
    }
    return { deviceId: parsed.deviceId, deviceLabel: parsed.deviceLabel };
  }

  fs.mkdirSync(basePath, { recursive: true, mode: 0o700 });
  const identity: DeviceIdentity = {
    deviceId: randomUUID(),
    deviceLabel: os.hostname() || null,
  };
  fs.writeFileSync(filePath, JSON.stringify(identity, null, 2), { mode: 0o600 });
  return identity;
}

function defaultUserDataPath(): string {
  const electron = require('electron') as { app?: { getPath(name: 'userData'): string } };
  const userDataPath = electron.app?.getPath('userData');
  if (!userDataPath) {
    throw new Error('Electron app is unavailable; pass overridePath when testing device identity');
  }
  return userDataPath;
}
