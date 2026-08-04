import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ipcMain } from 'electron';
import { CHANGE_ID_PATTERN } from '../pipeline/openspec-cli';
import { PipelineService } from '../pipeline/pipeline-service';
import {
  appendTaskLogEntry,
  composeTaskLogEntry,
  toggleTaskCheckbox,
} from '../pipeline/task-checkbox';
import { errMsg } from './shared';

/**
 * Cambio de estado de una tarea desde la aplicación.
 *
 * Vive en su propio módulo y no en el de archivado: aquél archiva, y mezclarle
 * la edición de tareas volvería a juntar dos dominios que se acaban de separar.
 * Tampoco va en el de snapshot, cuyo contrato declara que no escribe.
 *
 * **Sólo cambia el estado.** No edita el texto de una tarea ni toca ninguna otra
 * línea del archivo.
 */

function validRepoPath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 32_768;
}

function validChangeId(value: unknown): value is string {
  return typeof value === 'string' && CHANGE_ID_PATTERN.test(value);
}

/** Lectura y escritura contenidas al repositorio. Inyectables para pruebas. */
export type ReadRepoFile = (repoPath: string, relative: string) => Promise<string | null>;
export type WriteRepoFile = (repoPath: string, relative: string, content: string) => Promise<void>;

function resolveInside(repoPath: string, relative: string): string | null {
  const resolved = path.resolve(repoPath, relative);
  return resolved === repoPath || resolved.startsWith(repoPath + path.sep) ? resolved : null;
}

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
    ) => {
      if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };
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

        // El registro vive en el repositorio, no en la base local: uno que sólo
        // existe dentro de la aplicación no lo lee quien trabaja sobre los
        // archivos, y desaparece al cambiar de máquina.
        const logRef = `openspec/changes/${changeId}/task-log.md`;
        const logRaw = await read(canonicalPath, logRef);
        await write(
          canonicalPath,
          logRef,
          appendTaskLogEntry(logRaw, composeTaskLogEntry(now(), result.text, completed)),
        );

        return { success: true };
      } catch (error) {
        return { success: false, error: errMsg(error) };
      }
    },
  );
}
