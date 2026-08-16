import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (_event: unknown, ...args: unknown[]) => unknown;
const ipc = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  handle: vi.fn((channel: string, handler: Handler) => ipc.handlers.set(channel, handler)),
}));

vi.mock('electron', () => ({ ipcMain: { handle: ipc.handle } }));

/**
 * Archivar escribe en el repositorio, así que vive fuera del módulo de snapshot
 * —cuyo contrato declara que no acepta operaciones de escritura— y valida el
 * slug antes de que llegue a un proceso.
 *
 * Lo que hace es lo que OpenSpec define como archivar, y nada más: **no toca
 * Git**. Antes firmaba una tarea y producía dos commits; eso se retiró porque
 * OpenSpec declara que deja el control de versiones al usuario, y sostenerlo
 * obligaba a convenciones que sólo existían acá.
 */
describe('IPC de archivado de un change', () => {
  const binding = { resolveBinding: vi.fn(async () => ({ repoId: 'r1', canonicalPath: 'C:/repo-real' })) };

  beforeEach(() => {
    ipc.handlers.clear();
    ipc.handle.mockClear();
    binding.resolveBinding.mockClear();
  });

  async function register(
    archive: (repoPath: string, changeId: string) => Promise<{ ok: boolean; error: string | null }>,
  ) {
    const { registerPipelineArchiveHandlers } = await import('../ipc/pipeline-archive');
    registerPipelineArchiveHandlers(() => null, archive, binding as never);
    return {
      plan: ipc.handlers.get('pipeline:archive-plan')!,
      run: ipc.handlers.get('pipeline:archive-change')!,
    };
  }

  const ok = async () => ({ ok: true, error: null });

  it('rejects a change id that is not a valid slug before touching a process', async () => {
    const archive = vi.fn(ok);
    const { run } = await register(archive);

    const result = await run(null, 'C:/repo', '../fuera') as { success: boolean };

    expect(result.success).toBe(false);
    expect(archive).not.toHaveBeenCalled();
  });

  it('valida el límite exacto del slug (acepta 200 chars, rechaza 201)', async () => {
    const archive = vi.fn(ok);
    const { run } = await register(archive);

    const slug200 = '1' + 'a'.repeat(199);
    const slug201 = '1' + 'a'.repeat(200);

    const res200 = await run(null, 'C:/repo', slug200) as { success: boolean };
    expect(res200.success).toBe(true);

    const res201 = await run(null, 'C:/repo', slug201) as { success: boolean };
    expect(res201.success).toBe(false);
  });

  it('rejects an invalid repo path', async () => {
    const archive = vi.fn(ok);
    const { run } = await register(archive);

    expect(await run(null, '', 'mi-cambio')).toMatchObject({ success: false });
    expect(archive).not.toHaveBeenCalled();
  });

  it('archives on the canonical path, not on the one the renderer sent', async () => {
    // Si divergieran, se archivaría en un repositorio distinto del que la vista muestra.
    const archive = vi.fn(ok);
    const { run } = await register(archive);

    await run(null, 'C:/repo', 'mi-cambio');

    expect(archive).toHaveBeenCalledWith('C:/repo-real', 'mi-cambio');
  });

  it('reports the CLI failure instead of declaring success', async () => {
    const archive = vi.fn(async () => ({ ok: false, error: 'el CLI falló' }));
    const { run } = await register(archive);

    expect(await run(null, 'C:/repo', 'mi-cambio'))
      .toMatchObject({ success: false, error: 'el CLI falló', stage: 'archive' });
  });

  it('announces the command it will run before executing anything', async () => {
    const archive = vi.fn(ok);
    const { plan } = await register(archive);

    const result = await plan(null, 'C:/repo', 'mi-cambio') as { success: boolean; data: { archiveCommand: string } };

    expect(result.data.archiveCommand).toBe('openspec archive mi-cambio --yes');
    expect(archive).not.toHaveBeenCalled();
  });
});
