import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (_event: unknown, ...args: unknown[]) => unknown;
const ipc = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  handle: vi.fn((channel: string, handler: Handler) => ipc.handlers.set(channel, handler)),
}));

vi.mock('electron', () => ({ ipcMain: { handle: ipc.handle } }));

/**
 * Cambiar el estado de una tarea escribe en el repositorio, así que vive fuera
 * del módulo de snapshot y valida el identificador antes de tocar disco.
 *
 * Lo que se fija acá es la orquestación: que no escriba cuando no corresponde
 * —cambio archivado, texto que ya no coincide— y que el registro acompañe a
 * cada cambio aplicado.
 */
describe('IPC de estado de tareas', () => {
  const binding = { resolveBinding: vi.fn(async () => ({ repoId: 'r1', canonicalPath: 'C:/repo-real' })) };

  const TASKS = ['## 1. Tanda', '', '- [ ] 1.1 hacer algo', ''].join('\n');

  beforeEach(() => {
    ipc.handlers.clear();
    ipc.handle.mockClear();
    binding.resolveBinding.mockClear();
  });

  async function register(files: Record<string, string | null>) {
    const written: Array<{ relative: string; content: string }> = [];
    const { registerPipelineTaskHandlers } = await import('../ipc/pipeline-tasks');
    registerPipelineTaskHandlers(
      binding as never,
      async (_repo, relative) => files[relative] ?? null,
      async (_repo, relative, content) => { written.push({ relative, content }); },
      () => '2026-08-04T10:42:00.000Z',
    );
    return { run: ipc.handlers.get('pipeline:set-task-checked')!, written };
  }

  const TASKS_REF = 'openspec/changes/mi-cambio/tasks.md';
  const LOG_REF = 'openspec/changes/mi-cambio/task-log.md';

  it('marks the task and appends the log entry', async () => {
    const { run, written } = await register({ [TASKS_REF]: TASKS });

    const result = await run(null, 'C:/repo', 'mi-cambio', 3, '1.1 hacer algo', true);

    expect(result).toEqual({ success: true });
    expect(written[0].relative).toBe(TASKS_REF);
    expect(written[0].content).toContain('- [x] 1.1 hacer algo');
    // El registro vive en el repositorio, junto al cambio que describe.
    expect(written[1].relative).toBe(LOG_REF);
    expect(written[1].content).toContain('2026-08-04 10:42 — marcada — "1.1 hacer algo"');
  });

  it('refuses to edit an archived change', async () => {
    // Un archivado no tiene `tasks.md` bajo `changes/<id>/`: su ausencia es lo
    // que impide editarlo. Es el registro de cómo se trabajó entonces.
    const { run, written } = await register({});

    expect(await run(null, 'C:/repo', 'mi-cambio', 3, '1.1 hacer algo', true))
      .toMatchObject({ success: false, error: 'archived' });
    expect(written).toHaveLength(0);
  });

  it('writes nothing when the task text no longer matches', async () => {
    // El archivo puede haber cambiado entre que se dibujó la lista y llegó el
    // clic: escribir igual marcaría la tarea equivocada, en silencio.
    const { run, written } = await register({ [TASKS_REF]: TASKS });

    expect(await run(null, 'C:/repo', 'mi-cambio', 3, '1.1 otra cosa', true))
      .toMatchObject({ success: false, error: 'mismatch' });
    expect(written).toHaveLength(0);
  });

  it('rejects an invalid change id before touching disk', async () => {
    const { run, written } = await register({ [TASKS_REF]: TASKS });

    expect(await run(null, 'C:/repo', '../fuera', 3, '1.1 hacer algo', true))
      .toMatchObject({ success: false });
    expect(written).toHaveLength(0);
    expect(binding.resolveBinding).not.toHaveBeenCalled();
  });

  it('rejects a line that is not a positive integer', async () => {
    const { run, written } = await register({ [TASKS_REF]: TASKS });

    expect(await run(null, 'C:/repo', 'mi-cambio', 0, '1.1 hacer algo', true)).toMatchObject({ success: false });
    expect(await run(null, 'C:/repo', 'mi-cambio', 1.5, '1.1 hacer algo', true)).toMatchObject({ success: false });
    expect(written).toHaveLength(0);
  });
});
