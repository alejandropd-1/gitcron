import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = new Map<string, (_event: unknown, ...args: any[]) => Promise<any>>();

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => 'C:/dummy/temp'),
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers.set(channel, handler);
    }),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((str: string) => Buffer.from(`enc:${str}`)),
    decryptString: vi.fn((buf: Buffer) => buf.toString().replace(/^enc:/, '')),
  },
}));

vi.mock('../ipc/storage', () => ({
  readEncryptedStorage: vi.fn(() => ({})),
}));

vi.mock('../ipc/shared', () => ({
  errMsg: vi.fn((err: any) => err?.message ?? String(err)),
  sanitizeForLog: vi.fn((v: any) => String(v)),
  validRepoPath: vi.fn((p: unknown) => typeof p === 'string' && p.startsWith('C:/authorized')),
}));

vi.mock('../temporal-agent-ipc', () => ({
  loadConfig: vi.fn(),
  loadNotes: vi.fn(),
  savePrediction: vi.fn(),
  loadPrediction: vi.fn(),
}));

describe('Auditoría y validación en frontera IPC ai:* (Tarea 9b.10)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    handlers.clear();
    const { registerAiHandlers } = await import('../ipc/ai');
    registerAiHandlers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ai:set-key', () => {
    it('rechaza proveedor inválido con INVALID_PROVIDER sin eco de valores', async () => {
      const handler = handlers.get('ai:set-key')!;
      const res = await handler({}, 'unsloth:cf-client-secret', 'secret-val');
      expect(res).toEqual({ success: false, error: 'INVALID_PROVIDER' });
    });

    it('rechaza secretName con separador ":" con INVALID_SECRET_NAME', async () => {
      const handler = handlers.get('ai:set-key')!;
      const res = await handler({}, 'unsloth', 'secret-val', 'client:secret');
      expect(res).toEqual({ success: false, error: 'INVALID_SECRET_NAME' });
    });

    it('rechaza clave vacía con INVALID_KEY', async () => {
      const handler = handlers.get('ai:set-key')!;
      const res = await handler({}, 'unsloth', '');
      expect(res).toEqual({ success: false, error: 'INVALID_KEY' });
    });
  });

  describe('ai:has-key, ai:remove-key, ai:key-fingerprint', () => {
    it('ai:has-key valida provider y secretName', async () => {
      const handler = handlers.get('ai:has-key')!;
      expect(await handler({}, 'unknown-llm')).toEqual({ success: false, error: 'INVALID_PROVIDER' });
      expect(await handler({}, 'unsloth', 'bad:name')).toEqual({ success: false, error: 'INVALID_SECRET_NAME' });
    });

    it('ai:remove-key valida provider y secretName', async () => {
      const handler = handlers.get('ai:remove-key')!;
      expect(await handler({}, 'unknown-llm')).toEqual({ success: false, error: 'INVALID_PROVIDER' });
      expect(await handler({}, 'unsloth', 'bad:name')).toEqual({ success: false, error: 'INVALID_SECRET_NAME' });
    });

    it('ai:key-fingerprint valida provider y secretName', async () => {
      const handler = handlers.get('ai:key-fingerprint')!;
      expect(await handler({}, 'unknown-llm')).toEqual({ success: false, error: 'INVALID_PROVIDER' });
      expect(await handler({}, 'unsloth', 'bad:name')).toEqual({ success: false, error: 'INVALID_SECRET_NAME' });
    });
  });

  describe('ai:predict-timelines y ai:load-prediction', () => {
    it('rechaza repositorio no autorizado o inválido con INVALID_REPO_PATH', async () => {
      const predictHandler = handlers.get('ai:predict-timelines')!;
      expect(await predictHandler({}, 'C:/unauthorized/repo', 'repo')).toEqual({
        success: false,
        error: 'INVALID_REPO_PATH',
      });

      const loadHandler = handlers.get('ai:load-prediction')!;
      expect(await loadHandler({}, 'C:/unauthorized/repo')).toEqual({
        success: false,
        error: 'INVALID_REPO_PATH',
      });
    });

    it('rechaza parámetros maliciosos en repoName y lang', async () => {
      const predictHandler = handlers.get('ai:predict-timelines')!;
      expect(await predictHandler({}, 'C:/authorized/repo', '')).toEqual({
        success: false,
        error: 'INVALID_REPO_NAME',
      });
      expect(await predictHandler({}, 'C:/authorized/repo', 'my-repo', 'invalid_lang_too_long_payload_attack')).toEqual({
        success: false,
        error: 'INVALID_LANG',
      });
    });
  });

  describe('git:materialize-idea', () => {
    it('rechaza repositorio no autorizado con INVALID_REPO_PATH', async () => {
      const handler = handlers.get('git:materialize-idea')!;
      expect(await handler({}, 'C:/unauthorized/repo', { title: 'Test' } as any)).toEqual({
        success: false,
        error: 'INVALID_REPO_PATH',
      });
    });

    it('rechaza idea inválida con INVALID_IDEA', async () => {
      const handler = handlers.get('git:materialize-idea')!;
      expect(await handler({}, 'C:/authorized/repo', null as any)).toEqual({
        success: false,
        error: 'INVALID_IDEA',
      });
      expect(await handler({}, 'C:/authorized/repo', {} as any)).toEqual({
        success: false,
        error: 'INVALID_IDEA',
      });
    });
  });
});
