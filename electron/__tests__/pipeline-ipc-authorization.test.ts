import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { removeTempDir } from '@/test-utils/temp-dir';
import { simpleGit } from 'simple-git';
import { authorizedRepoStore } from '../ipc/authorized-repos';
import type { PipelineState } from '../../types/pipeline';

type Handler = (_event: unknown, ...args: unknown[]) => unknown;

const ipc = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  handle: vi.fn((channel: string, handler: Handler) => ipc.handlers.set(channel, handler)),
}));

vi.mock('electron', () => ({ ipcMain: { handle: ipc.handle } }));

const snapshot: PipelineState = {
  repoId: 'repo-1', revision: 1, observedAt: '2026-08-14T12:00:00.000Z', tasks: [], reports: [],
  activeChanges: [], archivedChanges: [], mergedChanges: [], diagnostics: [], decisions: [],
  selection: { changeId: null, confidence: 'unknown', selectionRequired: false, reason: 'no-active-change' },
};

/**
 * Candado de autorización sobre los canales `pipeline:*`. A diferencia de
 * `pipeline-ipc.test.ts` (que usa un doble del store), acá se ejercita el
 * store real: sin el chequeo de `isAuthorized` en `validRepoPath`, una ruta
 * bien formada llegaría al lector de evidencia.
 */
describe('Pipeline IPC — candado de autorización sobre pipeline:*', () => {
  let tempRoot: string;
  let repoDir: string;
  let refresh: ReturnType<typeof vi.fn>;

  const get = (channel: string): Handler => {
    const h = ipc.handlers.get(channel);
    if (!h) throw new Error(`No handler registered for channel: ${channel}`);
    return h;
  };

  beforeEach(async () => {
    ipc.handlers.clear();
    ipc.handle.mockClear();
    authorizedRepoStore.clear();

    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-pipeline-authz-'));
    repoDir = path.join(tempRoot, 'repo-vigilado');
    fs.mkdirSync(repoDir, { recursive: true });
    await simpleGit(repoDir).init(['--initial-branch=main']);

    refresh = vi.fn(async () => snapshot);
    const { registerPipelineHandlers } = await import('../ipc/pipeline');
    registerPipelineHandlers(() => null as never, { refresh } as never);
  });

  afterEach(() => {
    authorizedRepoStore.clear();
    removeTempDir(tempRoot);
  });

  it('rechaza una ruta bien formada pero no autorizada en los tres canales, sin leer el repo', async () => {
    const event = { sender: { id: 1, once: vi.fn() } };

    // El repo existe y es una raíz Git válida: lo único que lo frena es que
    // nadie lo abrió/autorizó. Ese es exactamente el candado bajo prueba.
    await expect(get('pipeline:get-snapshot')(null, repoDir)).resolves.toEqual({
      success: false,
      error: 'Ruta de repositorio inválida o no autorizada',
    });
    await expect(get('pipeline:subscribe')(event, repoDir)).resolves.toEqual({
      success: false,
      error: 'Ruta de repositorio inválida o no autorizada',
    });
    // El handler de unsubscribe es sincrónico: devuelve el objeto directo.
    const unsubRejected = await get('pipeline:unsubscribe')(event, repoDir);
    expect(unsubRejected).toEqual({
      success: false,
      error: 'Ruta de repositorio inválida o no autorizada',
    });

    // El lector de evidencia no se invocó: el rechazo es del candado, no un
    // error de lectura disfrazado.
    expect(refresh).not.toHaveBeenCalled();
  });

  it('la ruta autorizada pasa en los tres canales y llega al lector', async () => {
    const canonical = authorizedRepoStore.authorizeRepo(repoDir);
    expect(canonical).not.toBeNull();

    await expect(get('pipeline:get-snapshot')(null, repoDir)).resolves.toEqual({
      success: true,
      data: snapshot,
    });
    expect(refresh).toHaveBeenCalledWith(repoDir, null);

    const event = { sender: { id: 1, once: vi.fn() } };
    await expect(get('pipeline:subscribe')(event, repoDir)).resolves.toMatchObject({ success: true });
    const unsubOk = await get('pipeline:unsubscribe')(event, repoDir);
    expect(unsubOk).toEqual({ success: true });
  });

  it('al cerrar la última pestaña el canal vuelve a rechazar la ruta', async () => {
    authorizedRepoStore.authorizeRepo(repoDir);
    await expect(get('pipeline:get-snapshot')(null, repoDir)).resolves.toMatchObject({ success: true });

    authorizedRepoStore.deauthorizeRepo(repoDir);
    refresh.mockClear();
    await expect(get('pipeline:get-snapshot')(null, repoDir)).resolves.toMatchObject({ success: false });
    expect(refresh).not.toHaveBeenCalled();
  });
});
