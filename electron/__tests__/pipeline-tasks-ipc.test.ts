import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizedRepoStore } from '../ipc/authorized-repos';

type Handler = (_event: unknown, ...args: unknown[]) => unknown;
const ipc = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  handle: vi.fn((channel: string, handler: Handler) => ipc.handlers.set(channel, handler)),
}));

vi.mock('electron', () => ({ ipcMain: { handle: ipc.handle } }));

/**
 * Autoría y cambio de estado de tareas vía IPC.
 *
 * Se verifica la contención estricta: que ningún canal nuevo escriba ante
 * ruta no autorizada, slug inválido, cambio archivado o mismatch de texto.
 * Se afirma sobre la llamada a la escritura (`written`), no sólo sobre el valor devuelto.
 */
describe('IPC de autoría y estado de tareas', () => {
  const binding = { resolveBinding: vi.fn(async () => ({ repoId: 'r1', canonicalPath: 'C:/repo-real' })) };

  const TASKS = [
    '## 1. Tanda',
    '',
    '- [ ] 1.1 hacer algo',
    '- [x] 1.2 ya hecho',
    '',
  ].join('\n');

  beforeEach(() => {
    ipc.handlers.clear();
    ipc.handle.mockClear();
    binding.resolveBinding.mockClear();
    vi.spyOn(authorizedRepoStore, 'isAuthorized').mockImplementation((p) => p === 'C:/repo' || p === 'C:/repo-real');
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    return {
      run: ipc.handlers.get('pipeline:set-task-checked')!,
      addTask: ipc.handlers.get('pipeline:add-task')!,
      editTask: ipc.handlers.get('pipeline:edit-task')!,
      moveTask: ipc.handlers.get('pipeline:move-task')!,
      removeTask: ipc.handlers.get('pipeline:remove-task')!,
      written,
    };
  }

  const TASKS_REF = 'openspec/changes/mi-cambio/tasks.md';
  const LOG_REF = 'openspec/changes/mi-cambio/task-log.md';

  describe('pipeline:set-task-checked', () => {
    it('marks the task and appends the log entry', async () => {
      const { run, written } = await register({ [TASKS_REF]: TASKS });

      const result = await run(null, 'C:/repo', 'mi-cambio', 3, '1.1 hacer algo', true);

      expect(result).toEqual({ success: true });
      expect(written[0].relative).toBe(TASKS_REF);
      expect(written[0].content).toContain('- [x] 1.1 hacer algo');
      expect(written[1].relative).toBe(LOG_REF);
      expect(written[1].content).toContain('2026-08-04 10:42 — marcada — "1.1 hacer algo"');
    });

    it('registra el actor si se provee explícitamente', async () => {
      const { run, written } = await register({ [TASKS_REF]: TASKS });

      const result = await run(null, 'C:/repo', 'mi-cambio', 3, '1.1 hacer algo', true, 'persona');

      expect(result).toEqual({ success: true });
      expect(written[1].content).toContain('2026-08-04 10:42 — persona — marcada — "1.1 hacer algo"');
    });

    it('refuses to edit an archived change', async () => {
      const { run, written } = await register({});

      expect(await run(null, 'C:/repo', 'mi-cambio', 3, '1.1 hacer algo', true))
        .toMatchObject({ success: false, error: 'archived', stage: 'read' });
      expect(written).toHaveLength(0);
    });

    it('writes nothing when the task text no longer matches', async () => {
      const { run, written } = await register({ [TASKS_REF]: TASKS });

      expect(await run(null, 'C:/repo', 'mi-cambio', 3, '1.1 otra cosa', true))
        .toMatchObject({ success: false, error: 'mismatch', stage: 'toggle' });
      expect(written).toHaveLength(0);
    });

    it('rejects an invalid change id before touching disk', async () => {
      const { run, written } = await register({ [TASKS_REF]: TASKS });

      expect(await run(null, 'C:/repo', '../fuera', 3, '1.1 hacer algo', true))
        .toMatchObject({ success: false });
      expect(written).toHaveLength(0);
      expect(binding.resolveBinding).not.toHaveBeenCalled();
    });

    it('valida el límite exacto del slug (acepta 200 chars y rechaza 201 antes de tocar disco)', async () => {
      const slug200 = '1' + 'a'.repeat(199);
      const slug201 = '1' + 'a'.repeat(200);

      const ref200 = `openspec/changes/${slug200}/tasks.md`;
      const { run, written } = await register({ [ref200]: TASKS });

      const res200 = await run(null, 'C:/repo', slug200, 3, '1.1 hacer algo', true) as { success: boolean };
      expect(res200.success).toBe(true);
      expect(written).not.toHaveLength(0);

      const res201 = await run(null, 'C:/repo', slug201, 3, '1.1 hacer algo', true) as { success: boolean };
      expect(res201.success).toBe(false);
    });

    it('rejects a line that is not a positive integer', async () => {
      const { run, written } = await register({ [TASKS_REF]: TASKS });

      expect(await run(null, 'C:/repo', 'mi-cambio', 0, '1.1 hacer algo', true)).toMatchObject({ success: false });
      expect(await run(null, 'C:/repo', 'mi-cambio', 1.5, '1.1 hacer algo', true)).toMatchObject({ success: false });
      expect(written).toHaveLength(0);
    });
  });

  describe('pipeline:add-task', () => {
    it('agrega una tarea y escribe en tasks.md y task-log.md con operación agregada', async () => {
      const { addTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await addTask(null, 'C:/repo', 'mi-cambio', '1.3 nueva tarea', { line: 3, position: 'below' }, 'persona');

      expect(res).toEqual({ success: true });
      expect(written).toHaveLength(2);
      expect(written[0].relative).toBe(TASKS_REF);
      expect(written[0].content).toContain('- [ ] 1.3 nueva tarea');
      expect(written[1].relative).toBe(LOG_REF);
      expect(written[1].content).toContain('2026-08-04 10:42 — persona — agregada — "1.3 nueva tarea"');
    });

    it('rechaza ruta no autorizada sin tocar disco ni invocar escritura', async () => {
      const { addTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await addTask(null, 'C:/repo-no-autorizado', 'mi-cambio', '1.3 nueva');
      expect(res).toMatchObject({ success: false });
      expect(written).toHaveLength(0);
      expect(binding.resolveBinding).not.toHaveBeenCalled();
    });

    it('rechaza slug inválido sin tocar disco ni invocar escritura', async () => {
      const { addTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await addTask(null, 'C:/repo', '../escape', '1.3 nueva');
      expect(res).toMatchObject({ success: false });
      expect(written).toHaveLength(0);
      expect(binding.resolveBinding).not.toHaveBeenCalled();
    });

    it('rechaza cambio archivado con stage read y sin escribir', async () => {
      const { addTask, written } = await register({});

      const res = await addTask(null, 'C:/repo', 'mi-cambio', '1.3 nueva');
      expect(res).toEqual({ success: false, error: 'archived', stage: 'read' });
      expect(written).toHaveLength(0);
    });

    it('rechaza mismatch en la línea de referencia y NO ESCRIBE', async () => {
      const { addTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await addTask(null, 'C:/repo', 'mi-cambio', '1.3 nueva', {
        line: 3,
        expectedText: '1.1 texto que no coincide',
      });

      expect(res).toEqual({ success: false, error: 'mismatch', stage: 'add' });
      expect(written).toHaveLength(0);
    });
  });

  describe('pipeline:edit-task', () => {
    it('edita el texto de la tarea y escribe en tasks.md y task-log.md', async () => {
      const { editTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await editTask(null, 'C:/repo', 'mi-cambio', 3, '1.1 hacer algo', '1.1 hacer algo mejor', 'agente');

      expect(res).toEqual({ success: true });
      expect(written).toHaveLength(2);
      expect(written[0].relative).toBe(TASKS_REF);
      expect(written[0].content).toContain('- [ ] 1.1 hacer algo mejor');
      expect(written[1].relative).toBe(LOG_REF);
      expect(written[1].content).toContain('2026-08-04 10:42 — agente — editada — "1.1 hacer algo mejor"');
    });

    it('rechaza ruta no autorizada sin escribir', async () => {
      const { editTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await editTask(null, 'C:/no-auth', 'mi-cambio', 3, '1.1 hacer algo', 'nuevo');
      expect(res).toMatchObject({ success: false });
      expect(written).toHaveLength(0);
      expect(binding.resolveBinding).not.toHaveBeenCalled();
    });

    it('rechaza slug inválido sin escribir', async () => {
      const { editTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await editTask(null, 'C:/repo', 'slug/con/slash', 3, '1.1 hacer algo', 'nuevo');
      expect(res).toMatchObject({ success: false });
      expect(written).toHaveLength(0);
    });

    it('rechaza cambio archivado con stage read y sin escribir', async () => {
      const { editTask, written } = await register({});

      const res = await editTask(null, 'C:/repo', 'mi-cambio', 3, '1.1 hacer algo', 'nuevo');
      expect(res).toEqual({ success: false, error: 'archived', stage: 'read' });
      expect(written).toHaveLength(0);
    });

    it('ante mismatch NO ESCRIBE en ningún archivo', async () => {
      const { editTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await editTask(null, 'C:/repo', 'mi-cambio', 3, '1.1 texto viejo incorrecto', 'nuevo');

      expect(res).toEqual({ success: false, error: 'mismatch', stage: 'edit' });
      expect(written).toHaveLength(0);
    });
  });

  describe('pipeline:move-task', () => {
    it('mueve la tarea y escribe en tasks.md y task-log.md', async () => {
      const { moveTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await moveTask(null, 'C:/repo', 'mi-cambio', 3, 4, '1.1 hacer algo', 'persona');

      expect(res).toEqual({ success: true });
      expect(written).toHaveLength(2);
      expect(written[0].relative).toBe(TASKS_REF);
      expect(written[1].relative).toBe(LOG_REF);
      expect(written[1].content).toContain('2026-08-04 10:42 — persona — movida — "1.1 hacer algo"');
    });

    it('rechaza ruta no autorizada sin escribir', async () => {
      const { moveTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await moveTask(null, 'C:/no-auth', 'mi-cambio', 3, 4, '1.1 hacer algo');
      expect(res).toMatchObject({ success: false });
      expect(written).toHaveLength(0);
    });

    it('rechaza slug inválido sin escribir', async () => {
      const { moveTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await moveTask(null, 'C:/repo', '../escape', 3, 4, '1.1 hacer algo');
      expect(res).toMatchObject({ success: false });
      expect(written).toHaveLength(0);
    });

    it('rechaza cambio archivado con stage read y sin escribir', async () => {
      const { moveTask, written } = await register({});

      const res = await moveTask(null, 'C:/repo', 'mi-cambio', 3, 4, '1.1 hacer algo');
      expect(res).toEqual({ success: false, error: 'archived', stage: 'read' });
      expect(written).toHaveLength(0);
    });

    it('ante mismatch NO ESCRIBE en ningún archivo', async () => {
      const { moveTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await moveTask(null, 'C:/repo', 'mi-cambio', 3, 4, '1.1 discrepancia');

      expect(res).toEqual({ success: false, error: 'mismatch', stage: 'move' });
      expect(written).toHaveLength(0);
    });
  });

  describe('pipeline:remove-task', () => {
    it('elimina la tarea y escribe en tasks.md y task-log.md', async () => {
      const { removeTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await removeTask(null, 'C:/repo', 'mi-cambio', 3, '1.1 hacer algo', 'persona');

      expect(res).toEqual({ success: true });
      expect(written).toHaveLength(2);
      expect(written[0].relative).toBe(TASKS_REF);
      expect(written[0].content).not.toContain('1.1 hacer algo');
      expect(written[1].relative).toBe(LOG_REF);
      expect(written[1].content).toContain('2026-08-04 10:42 — persona — eliminada — "1.1 hacer algo"');
    });

    it('rechaza ruta no autorizada sin escribir', async () => {
      const { removeTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await removeTask(null, 'C:/no-auth', 'mi-cambio', 3, '1.1 hacer algo');
      expect(res).toMatchObject({ success: false });
      expect(written).toHaveLength(0);
    });

    it('rechaza slug inválido sin escribir', async () => {
      const { removeTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await removeTask(null, 'C:/repo', 'otro/invalido', 3, '1.1 hacer algo');
      expect(res).toMatchObject({ success: false });
      expect(written).toHaveLength(0);
    });

    it('rechaza cambio archivado con stage read y sin escribir', async () => {
      const { removeTask, written } = await register({});

      const res = await removeTask(null, 'C:/repo', 'mi-cambio', 3, '1.1 hacer algo');
      expect(res).toEqual({ success: false, error: 'archived', stage: 'read' });
      expect(written).toHaveLength(0);
    });

    it('ante mismatch NO ESCRIBE en ningún archivo', async () => {
      const { removeTask, written } = await register({ [TASKS_REF]: TASKS });

      const res = await removeTask(null, 'C:/repo', 'mi-cambio', 3, '1.1 discrepancia');

      expect(res).toEqual({ success: false, error: 'mismatch', stage: 'remove' });
      expect(written).toHaveLength(0);
    });
  });
});
