import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-keystore-test-'));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => tempDir),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((str: string) => Buffer.from(`enc:${str}`)),
    decryptString: vi.fn((buf: Buffer) => buf.toString().replace(/^enc:/, '')),
  },
}));

describe('Baúl de claves con soporte de múltiples secretos nombrados (Tarea 9b.4 corregida)', () => {
  let keyStore: typeof import('../ai/key-store');

  beforeEach(async () => {
    vi.clearAllMocks();
    const filePath = path.join(tempDir, 'ai-keys.enc');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    keyStore = await import('../ai/key-store');
  });

  afterEach(() => {
    const filePath = path.join(tempDir, 'ai-keys.enc');
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    }
  });

  it('guarda y recupera una clave única estándar por proveedor (compatibilidad hacia atrás)', () => {
    expect(keyStore.hasKey('openrouter')).toBe(false);
    expect(keyStore.getKey('openrouter')).toBeUndefined();

    keyStore.setKey('openrouter', 'sk-or-test-12345');
    expect(keyStore.hasKey('openrouter')).toBe(true);
    expect(keyStore.getKey('openrouter')).toBe('sk-or-test-12345');

    const fp = keyStore.getKeyFingerprint('openrouter');
    expect(fp).toBeTruthy();
    expect(fp?.length).toBe(8);

    keyStore.removeKey('openrouter');
    expect(keyStore.hasKey('openrouter')).toBe(false);
    expect(keyStore.getKey('openrouter')).toBeUndefined();
  });

  it('permite guardar y consultar múltiples secretos nombrados para un mismo proveedor (caso Unsloth)', () => {
    // 1. Guardar las tres credenciales de Unsloth Desktop detrás de Cloudflare Access
    keyStore.setKey('unsloth', 'model-token-secret');
    keyStore.setKey('unsloth', 'cf-client-id-abc123', 'cf-client-id');
    keyStore.setKey('unsloth', 'cf-client-secret-xyz789', 'cf-client-secret');

    // 2. Verificar existencia individual
    expect(keyStore.hasKey('unsloth')).toBe(true);
    expect(keyStore.hasKey('unsloth', 'cf-client-id')).toBe(true);
    expect(keyStore.hasKey('unsloth', 'cf-client-secret')).toBe(true);
    expect(keyStore.hasKey('unsloth', 'non-existent')).toBe(false);

    // 3. Verificar recuperación individual
    expect(keyStore.getKey('unsloth')).toBe('model-token-secret');
    expect(keyStore.getKey('unsloth', 'cf-client-id')).toBe('cf-client-id-abc123');
    expect(keyStore.getKey('unsloth', 'cf-client-secret')).toBe('cf-client-secret-xyz789');

    // 4. Helper getUnslothCredentials
    const creds = keyStore.getUnslothCredentials();
    expect(creds.apiKey).toBe('model-token-secret');
    expect(creds.cfAccessClientId).toBe('cf-client-id-abc123');
    expect(creds.cfAccessClientSecret).toBe('cf-client-secret-xyz789');

    // 5. Eliminar un secreto nombrado específico no borra los otros
    keyStore.removeKey('unsloth', 'cf-client-id');
    expect(keyStore.hasKey('unsloth', 'cf-client-id')).toBe(false);
    expect(keyStore.hasKey('unsloth')).toBe(true);
    expect(keyStore.hasKey('unsloth', 'cf-client-secret')).toBe(true);

    // 6. Eliminar el proveedor completo sin secretName purga todos sus secretos asociados
    keyStore.removeKey('unsloth');
    expect(keyStore.hasKey('unsloth')).toBe(false);
    expect(keyStore.hasKey('unsloth', 'cf-client-secret')).toBe(false);
  });
});
