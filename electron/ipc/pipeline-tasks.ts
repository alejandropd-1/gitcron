import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ipcMain } from 'electron';
import { isValidOpenSpecChangeSlug } from '../../lib/openspec-slug';
import { PipelineService } from '../pipeline/pipeline-service';
import {
  addTaskLine,
  AddTaskOptions,
  appendTaskLogEntry,
  composeTaskLogEntry,
  editTaskText,
  moveTaskLine,
  removeTaskLine,
  TaskActor,
  toggleTaskCheckbox,
} from '../pipeline/task-checkbox';
import { errMsg, resolveInside, validRepoPath } from './shared';

/**
 * Autoría y cambio de estado de tareas en `tasks.md` desde la aplicación.
 *
 * Vive en su propio módulo y no en el de archivado: aquél archiva, y mezclarle
 * la edición de tareas volvería a juntar dos dominios que se acaban de separar.
 * Tampoco va en el de snapshot, cuyo contrato declara que no escribe.
 *
 * Expone canales para marcar/desmarcar, agregar, editar texto, mover y eliminar
 * tareas. Cada operación valida ruta autorizada, slug y contención `resolveInside`,
 * y registra la acción en `task-log.md` sin tocar líneas ajenas.
 */

function validChangeId(value: unknown): value is string {
  return isValidOpenSpecChangeSlug(value);
}

function parseActor(value: unknown): TaskActor | undefined {
  return value === 'persona' || value === 'agente' ? value : undefined;
}

/** Lectura y escritura contenidas al repositorio. Inyectables para pruebas. */
export type ReadRepoFile = (repoPath: string, relative: string) => Promise<string | null>;
export type WriteRepoFile = (repoPath: string, relative: string, content: string) => Promise<void>;

const defaultRead: ReadRepoFile = async (repoPath, relative) => {
  const resolved = resolveInside(repoPath, relative);
  if (!resolved) return null;
  try {
    return await fs.readFile(resolved, 'utf8');
  } catch {
    return null;
  }
};

const defaultWrite: WriteRepoFile = async (repoPath, relative, content) => {
  const resolved = resolveInside(repoPath, relative);
  if (!resolved) return;
  await fs.writeFile(resolved, content, 'utf8');
};

export function registerPipelineTaskHandlers(
  service = new PipelineService(),
  read: ReadRepoFile = defaultRead,
  write: WriteRepoFile = defaultWrite,
  now: () => string = () => new Date().toISOString(),
): void {
  ipcMain.handle(
    'pipeline:set-task-checked',
    async (
      _event,
      repoPath: unknown,
      changeId: unknown,
      line: unknown,
      expectedText: unknown,
      completed: unknown,
      actor?: unknown,
    ) => {
      if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
      if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };
      if (typeof line !== 'number' || !Number.isInteger(line) || line < 1) {
        return { success: false, error: 'Línea inválida' };
      }
      if (typeof expectedText !== 'string' || typeof completed !== 'boolean') {
        return { success: false, error: 'Pedido inválido' };
      }

      try {
        const { canonicalPath } = await service.resolveBinding(repoPath);
        const tasksRef = `openspec/changes/${changeId}/tasks.md`;
        const tasksRaw = await read(canonicalPath, tasksRef);
        // Un cambio archivado no tiene `tasks.md` bajo `changes/<id>/`: su
        // ausencia es lo que impide editarlo, sin necesitar otra comprobación.
        if (tasksRaw === null) return { success: false, error: 'archived', stage: 'read' };

        const result = toggleTaskCheckbox(tasksRaw, line, expectedText, completed);
        if (!result.ok) return { success: false, error: result.reason, stage: 'toggle' };

        await write(canonicalPath, tasksRef, result.content);

        const logRef = `openspec/changes/${changeId}/task-log.md`;
        const logRaw = await read(canonicalPath, logRef);
        await write(
          canonicalPath,
          logRef,
          appendTaskLogEntry(logRaw, composeTaskLogEntry(now(), result.text, completed, parseActor(actor))),
        );

        return { success: true };
      } catch (error) {
        return { success: false, error: errMsg(error) };
      }
    },
  );

  ipcMain.handle(
    'pipeline:add-task',
    async (
      _event,
      repoPath: unknown,
      changeId: unknown,
      text: unknown,
      options?: unknown,
      actor?: unknown,
    ) => {
      if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
      if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };
      if (typeof text !== 'string' || text.trim() === '') {
        return { success: false, error: 'Pedido inválido' };
      }

      let parsedOptions: AddTaskOptions | undefined;
      let optActor: unknown;
      if (options && typeof options === 'object') {
        const opt = options as Record<string, unknown>;
        if (opt.line !== undefined && (typeof opt.line !== 'number' || !Number.isInteger(opt.line) || opt.line < 1)) {
          return { success: false, error: 'Línea inválida' };
        }
        if (opt.expectedText !== undefined && typeof opt.expectedText !== 'string') {
          return { success: false, error: 'Pedido inválido' };
        }
        if (opt.position !== undefined && opt.position !== 'above' && opt.position !== 'below' && opt.position !== 'end') {
          return { success: false, error: 'Pedido inválido' };
        }
        parsedOptions = {
          line: opt.line as number | undefined,
          position: opt.position as 'above' | 'below' | 'end' | undefined,
          expectedText: opt.expectedText as string | undefined,
        };
        optActor = opt.actor;
      }

      const resolvedActor = parseActor(actor) ?? parseActor(optActor);

      try {
        const { canonicalPath } = await service.resolveBinding(repoPath);
        const tasksRef = `openspec/changes/${changeId}/tasks.md`;
        const tasksRaw = await read(canonicalPath, tasksRef);
        if (tasksRaw === null) return { success: false, error: 'archived', stage: 'read' };

        const result = addTaskLine(tasksRaw, text, parsedOptions);
        if (!result.ok) return { success: false, error: result.reason, stage: 'add' };

        await write(canonicalPath, tasksRef, result.content);

        const logRef = `openspec/changes/${changeId}/task-log.md`;
        const logRaw = await read(canonicalPath, logRef);
        await write(
          canonicalPath,
          logRef,
          appendTaskLogEntry(logRaw, composeTaskLogEntry(now(), result.text, 'agregada', resolvedActor)),
        );

        return { success: true };
      } catch (error) {
        return { success: false, error: errMsg(error) };
      }
    },
  );

  ipcMain.handle(
    'pipeline:edit-task',
    async (
      _event,
      repoPath: unknown,
      changeId: unknown,
      line: unknown,
      expectedText: unknown,
      newText: unknown,
      actor?: unknown,
    ) => {
      if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
      if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };
      if (typeof line !== 'number' || !Number.isInteger(line) || line < 1) {
        return { success: false, error: 'Línea inválida' };
      }
      if (typeof expectedText !== 'string' || typeof newText !== 'string' || newText.trim() === '') {
        return { success: false, error: 'Pedido inválido' };
      }

      try {
        const { canonicalPath } = await service.resolveBinding(repoPath);
        const tasksRef = `openspec/changes/${changeId}/tasks.md`;
        const tasksRaw = await read(canonicalPath, tasksRef);
        if (tasksRaw === null) return { success: false, error: 'archived', stage: 'read' };

        const result = editTaskText(tasksRaw, line, expectedText, newText);
        if (!result.ok) return { success: false, error: result.reason, stage: 'edit' };

        await write(canonicalPath, tasksRef, result.content);

        const logRef = `openspec/changes/${changeId}/task-log.md`;
        const logRaw = await read(canonicalPath, logRef);
        await write(
          canonicalPath,
          logRef,
          appendTaskLogEntry(logRaw, composeTaskLogEntry(now(), result.text, 'editada', parseActor(actor))),
        );

        return { success: true };
      } catch (error) {
        return { success: false, error: errMsg(error) };
      }
    },
  );

  ipcMain.handle(
    'pipeline:move-task',
    async (
      _event,
      repoPath: unknown,
      changeId: unknown,
      fromLine: unknown,
      toLine: unknown,
      expectedText: unknown,
      actor?: unknown,
    ) => {
      if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
      if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };
      if (typeof fromLine !== 'number' || !Number.isInteger(fromLine) || fromLine < 1) {
        return { success: false, error: 'Línea inválida' };
      }
      if (typeof toLine !== 'number' || !Number.isInteger(toLine) || toLine < 1) {
        return { success: false, error: 'Línea inválida' };
      }
      if (typeof expectedText !== 'string') {
        return { success: false, error: 'Pedido inválido' };
      }

      try {
        const { canonicalPath } = await service.resolveBinding(repoPath);
        const tasksRef = `openspec/changes/${changeId}/tasks.md`;
        const tasksRaw = await read(canonicalPath, tasksRef);
        if (tasksRaw === null) return { success: false, error: 'archived', stage: 'read' };

        const result = moveTaskLine(tasksRaw, fromLine, toLine, expectedText);
        if (!result.ok) return { success: false, error: result.reason, stage: 'move' };

        await write(canonicalPath, tasksRef, result.content);

        const logRef = `openspec/changes/${changeId}/task-log.md`;
        const logRaw = await read(canonicalPath, logRef);
        await write(
          canonicalPath,
          logRef,
          appendTaskLogEntry(logRaw, composeTaskLogEntry(now(), result.text, 'movida', parseActor(actor))),
        );

        return { success: true };
      } catch (error) {
        return { success: false, error: errMsg(error) };
      }
    },
  );

  ipcMain.handle(
    'pipeline:remove-task',
    async (
      _event,
      repoPath: unknown,
      changeId: unknown,
      line: unknown,
      expectedText: unknown,
      actor?: unknown,
    ) => {
      if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
      if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };
      if (typeof line !== 'number' || !Number.isInteger(line) || line < 1) {
        return { success: false, error: 'Línea inválida' };
      }
      if (typeof expectedText !== 'string') {
        return { success: false, error: 'Pedido inválido' };
      }

      try {
        const { canonicalPath } = await service.resolveBinding(repoPath);
        const tasksRef = `openspec/changes/${changeId}/tasks.md`;
        const tasksRaw = await read(canonicalPath, tasksRef);
        if (tasksRaw === null) return { success: false, error: 'archived', stage: 'read' };

        const result = removeTaskLine(tasksRaw, line, expectedText);
        if (!result.ok) return { success: false, error: result.reason, stage: 'remove' };

        await write(canonicalPath, tasksRef, result.content);

        const logRef = `openspec/changes/${changeId}/task-log.md`;
        const logRaw = await read(canonicalPath, logRef);
        await write(
          canonicalPath,
          logRef,
          appendTaskLogEntry(logRaw, composeTaskLogEntry(now(), result.text, 'eliminada', parseActor(actor))),
        );

        return { success: true };
      } catch (error) {
        return { success: false, error: errMsg(error) };
      }
    },
  );
}
