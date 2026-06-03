import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEVICE_IDENTITY_FILENAME, getDeviceIdentity } from '../device';

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-device-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    if (dir.startsWith(os.tmpdir())) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('Temporal Agent device identity', () => {
  it('generates, persists, and reuses a stable local identity', () => {
    const dir = tempDir();
    const first = getDeviceIdentity(dir);
    const second = getDeviceIdentity(dir);
    const filePath = path.join(dir, DEVICE_IDENTITY_FILENAME);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
      deviceId: string;
      deviceLabel: string | null;
    };

    expect(first.deviceId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second.deviceId).toBe(first.deviceId);
    expect(second.deviceLabel).toBe(first.deviceLabel);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(parsed).toEqual(first);
  });
});
