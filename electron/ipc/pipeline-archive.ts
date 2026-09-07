import * as fs from 'node:fs/promises';
import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import { archiveOpenSpecChangeWithCli } from '../pipeline/openspec-cli';
import { validateChangeDeltaRequirements } from '../pipeline/openspec-delta-validator';
import { PipelineService } from '../pipeline/pipeline-service';
import { errMsg, resolveInside, validRepoPath } from './shared';
import { withRepoWatcherPaused } from './watchers';
import { isValidOpenSpecChangeSlug } from '../../lib/openspec-slug';

/**
 * Archivado de un change: mover el cambio a su histórico y consolidar specs.
 *
 * Es lo que OpenSpec define como archivar, y nada más. **No toca Git**: la
 * herramienta declara explícitamente que deja el control de versiones al
 * usuario, y acoplarle un commit obligaba a inventar un manifiesto y una tarea
 * de firma que sólo existían en este repositorio y que ningún ejecutor podía
 * descubrir consultando el CLI.
 *
 * Confirmar el trabajo en Git vuelve a ser una acción aparte, con las
 * herramientas de Git que la aplicación ya ofrece.
 */

import type { ArchivePlan } from '../../types/pipeline';
export type { ArchivePlan };

export type WriteArchiveReason = (repoPath: string, changeId: string, reason: string) => Promise<void>;
export type PauseWatcherDuring = <T>(repoPath: string, fn: () => Promise<T>) => Promise<T>;

const defaultWriteReason: WriteArchiveReason = async (repoPath, changeId, reason) => {
  const resolved = resolveInside(repoPath, `openspec/changes/${changeId}/archive-reason.md`);
  if (!resolved) throw new Error('Ruta de motivo fuera de límites');
  await fs.writeFile(resolved, `# Motivo de archivado\n\n${reason.trim()}\n`, 'utf8');
};

const FOLDER_LOCK_PATTERN = /EPERM|operation not permitted|EBUSY|resource busy or locked/i;
const FOLDER_LOCK_MESSAGE =
  'No se pudo mover la carpeta del cambio porque otro proceso (un vigilante de archivos, indexador o antivirus) la mantiene abierta. El contenido del cambio es válido; lo que falló fue la mudanza a openspec/changes/archive.';

function validChangeId(value: unknown): value is string {
  return isValidOpenSpecChangeSlug(value);
}

function buildPlan(changeId: string): ArchivePlan {
  return { archiveCommand: `openspec archive ${changeId} --yes` };
}

export function registerPipelineArchiveHandlers(
  /**
   * Para avisar que el histórico de changes cambió.
   *
   * El watcher emite `repo:fs-change` y eso relee el estado del árbol, que es
   * suficiente ahora que el archivado no produce commits.
   */
  getMainWindow: () => BrowserWindow | null = () => null,
  archive = archiveOpenSpecChangeWithCli,
  service = new PipelineService(),
  validateDelta = validateChangeDeltaRequirements,
  writeReason: WriteArchiveReason = defaultWriteReason,
  pauseWatcher: PauseWatcherDuring = withRepoWatcherPaused,
): void {
  ipcMain.handle('pipeline:archive-plan', async (_event, repoPath: unknown, changeId: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
    if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };
    try {
      const { canonicalPath } = await service.resolveBinding(repoPath);
      const deltaCheck = await validateDelta(canonicalPath, changeId);
      return {
        success: true,
        data: {
          ...buildPlan(changeId),
          canArchive: deltaCheck.valid,
          errors: deltaCheck.errors,
          requirementIssues: deltaCheck.requirementIssues,
          incompleteTasks: deltaCheck.incompleteTasks,
        },
      };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('pipeline:archive-change', async (_event, repoPath: unknown, changeId: unknown, reason?: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
    // El slug se valida acá además de en el wrapper: el renderer no puede
    // inyectar nada al proceso por este camino.
    if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };

    try {
      // Se archiva sobre la ruta canónica, la misma identidad que usa la
      // evidencia: si divergieran, se archivaría en un repositorio distinto del
      // que la vista está mostrando.
      const { canonicalPath } = await service.resolveBinding(repoPath);

      // Comprobar que los requisitos MODIFIED existan en la spec consolidada
      // y que no haya tareas pendientes antes de ejecutar el CLI (Tareas 3.2 y 3.5).
      const deltaCheck = await validateDelta(canonicalPath, changeId);
      if (!deltaCheck.valid) {
        return { success: false, error: deltaCheck.errors.join(' | '), stage: 'validation' };
      }

      // Si se provee motivo opcional, se conserva junto a los artefactos del change (Tarea 5.1)
      if (typeof reason === 'string' && reason.trim().length > 0) {
        await writeReason(canonicalPath, changeId, reason.trim());
      }

      // Soltar vigilante propio durante la mudanza de carpeta en Windows (Tarea 5.3)
      const result = await pauseWatcher(canonicalPath, () => archive(canonicalPath, changeId));

      // El resultado se lee del CLI, no del hecho de que el proceso terminó.
      if (!result.ok) {
        if (result.error && FOLDER_LOCK_PATTERN.test(result.error)) {
          return { success: false, error: FOLDER_LOCK_MESSAGE, stage: 'archive' };
        }
        return { success: false, error: result.error, stage: 'archive' };
      }

      getMainWindow()?.webContents.send('repo:fs-change', { repoPath: canonicalPath });
      return { success: true };
    } catch (error) {
      const message = errMsg(error);
      if (FOLDER_LOCK_PATTERN.test(message)) {
        return { success: false, error: FOLDER_LOCK_MESSAGE, stage: 'archive' };
      }
      return { success: false, error: message };
    }
  });
}
