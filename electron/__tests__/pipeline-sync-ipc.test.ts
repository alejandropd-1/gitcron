import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizedRepoStore } from '../ipc/authorized-repos';
import type { SyncDeps } from '../ipc/pipeline-sync';

type Handler = (_event: unknown, ...args: unknown[]) => Promise<unknown>;

const ipc = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  handle: vi.fn((channel: string, handler: Handler) => ipc.handlers.set(channel, handler)),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: ipc.handle },
}));

describe('IPC de sincronización de specs - Alternativa B (Grupo 4)', () => {
  const binding = {
    resolveBinding: vi.fn().mockResolvedValue({ canonicalPath: 'C:/repo-real' }),
  };

  beforeEach(() => {
    ipc.handlers.clear();
    ipc.handle.mockClear();
    vi.clearAllMocks();
    vi.spyOn(authorizedRepoStore, 'isAuthorized').mockImplementation((p) => p === 'C:/repo' || p === 'C:/repo-real');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function register(overrides: SyncDeps = {}) {
    const { registerPipelineSyncHandlers } = await import('../ipc/pipeline-sync');
    const readRepoFile = overrides.readRepoFile ?? vi.fn().mockResolvedValue('# Spec\n');
    const writeRepoFile = overrides.writeRepoFile ?? vi.fn().mockResolvedValue(undefined);
    const listDeltaSpecs = overrides.listDeltaSpecs ?? vi.fn().mockResolvedValue(['auth', 'billing']);
    const isAgentAvailable = overrides.isAgentAvailable ?? vi.fn().mockResolvedValue(true);

    registerPipelineSyncHandlers(() => null, {
      service: binding as never,
      readRepoFile,
      writeRepoFile,
      listDeltaSpecs,
      isAgentAvailable,
      ...overrides,
    });

    return {
      preview: ipc.handlers.get('pipeline:sync-preview')!,
      execute: ipc.handlers.get('pipeline:sync-execute')!,
      readRepoFile,
      writeRepoFile,
      listDeltaSpecs,
      isAgentAvailable,
    };
  }

  describe('pipeline:sync-preview', () => {
    it('rechaza una ruta de repositorio inválida o no autorizada', async () => {
      const { preview } = await register();
      const res = (await preview(null, '', 'mi-cambio')) as { success: boolean; error: string };
      expect(res.success).toBe(false);
      expect(res.error).toContain('inválida o no autorizada');
    });

    it('rechaza un changeId que no sea un slug válido', async () => {
      const { preview } = await register();
      const res = (await preview(null, 'C:/repo', '../fuera')) as { success: boolean; error: string };
      expect(res.success).toBe(false);
      expect(res.error).toContain('Identificador de cambio inválido');
    });

    it('si no hay agente disponible, la sincronización se detiene sin caer en cálculo propio (Alternativa B)', async () => {
      const { preview, writeRepoFile } = await register({
        isAgentAvailable: vi.fn().mockResolvedValue(false),
      });

      const res = (await preview(null, 'C:/repo', 'mi-cambio')) as {
        success: boolean;
        error: string;
        reason?: string;
      };

      expect(res.success).toBe(false);
      expect(res.reason).toBe('no-agent');
      expect(res.error).toContain('No hay ningún agente disponible');
      expect(res.error).toContain('GitCron no realiza fusión algorítmica propia de emergencia');
      expect(writeRepoFile).not.toHaveBeenCalled();
    });

    it('la vista previa NO escribe ningún archivo en disco (Afirmación Tarea 4.3 / 4.7)', async () => {
      const { preview, writeRepoFile } = await register({
        readRepoFile: vi.fn(async (_repo, rel) => {
          if (rel.includes('changes')) {
            return '## ADDED Requirements\n### Requirement: Login\n';
          }
          return '# Auth Spec\n\n## Requirements\n';
        }),
      });

      const res = (await preview(null, 'C:/repo', 'mi-cambio')) as {
        success: boolean;
        data?: { items: any[]; workflow: string };
      };

      expect(res.success).toBe(true);
      expect(res.data?.workflow).toBe('openspec-sync-specs');
      expect(res.data?.items).toHaveLength(2);
      expect(res.data?.items[0].diff).toContain('@@');

      // VERIFICACIÓN CENTRAL: la vista previa NO toca el disco
      expect(writeRepoFile).not.toHaveBeenCalled();
    });
  });

  describe('pipeline:sync-execute', () => {
    it('la ejecución sin confirmación previa explícita se rechaza y no escribe nada (Afirmación Tarea 4.3 / 4.7)', async () => {
      const { execute, writeRepoFile } = await register();

      const items = [{ capability: 'auth', content: '# Updated Spec' }];

      // Llamada sin options.confirmed
      const resWithoutOptions = (await execute(null, 'C:/repo', 'mi-cambio', items)) as {
        success: boolean;
        stage?: string;
        error: string;
      };
      expect(resWithoutOptions.success).toBe(false);
      expect(resWithoutOptions.stage).toBe('confirmation');
      expect(resWithoutOptions.error).toContain('requiere confirmación explícita previa');
      expect(writeRepoFile).not.toHaveBeenCalled();

      // Llamada con confirmed: false
      const resWithFalse = (await execute(null, 'C:/repo', 'mi-cambio', items, { confirmed: false })) as {
        success: boolean;
        stage?: string;
      };
      expect(resWithFalse.success).toBe(false);
      expect(resWithFalse.stage).toBe('confirmation');
      expect(writeRepoFile).not.toHaveBeenCalled();
    });

    it('la ejecución con confirmación escribe ÚNICAMENTE las especificaciones aceptadas en disco', async () => {
      const { execute, writeRepoFile } = await register();

      const items = [
        { capability: 'auth', content: '# Auth Spec Final\n' },
        { capability: 'billing', content: '# Billing Spec Final\n' },
      ];

      const res = (await execute(null, 'C:/repo', 'mi-cambio', items, { confirmed: true })) as {
        success: boolean;
        filesWritten: string[];
      };

      expect(res.success).toBe(true);
      expect(res.filesWritten).toEqual([
        'openspec/specs/auth/spec.md',
        'openspec/specs/billing/spec.md',
      ]);
      expect(writeRepoFile).toHaveBeenCalledTimes(2);
      expect(writeRepoFile).toHaveBeenCalledWith('C:/repo-real', 'openspec/specs/auth/spec.md', '# Auth Spec Final\n');
      expect(writeRepoFile).toHaveBeenCalledWith('C:/repo-real', 'openspec/specs/billing/spec.md', '# Billing Spec Final\n');
    });

    it('rechaza nombres de capacidad que intenten escapar del directorio de specs', async () => {
      const { execute, writeRepoFile } = await register();

      const items = [{ capability: '../../fuera', content: '# Exploit' }];
      const res = (await execute(null, 'C:/repo', 'mi-cambio', items, { confirmed: true })) as {
        success: boolean;
        error: string;
      };

      expect(res.success).toBe(false);
      expect(res.error).toContain('inválido');
      expect(writeRepoFile).not.toHaveBeenCalled();
    });
  });
});
