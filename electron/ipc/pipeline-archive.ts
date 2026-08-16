import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import { archiveOpenSpecChangeWithCli } from '../pipeline/openspec-cli';
import { PipelineService } from '../pipeline/pipeline-service';
import { errMsg, validRepoPath } from './shared';
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

/** Lo que va a ocurrir, para mostrarlo antes de ejecutar nada. */
interface ArchivePlan {
  archiveCommand: string;
}

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
): void {
  ipcMain.handle('pipeline:archive-plan', async (_event, repoPath: unknown, changeId: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
    if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };
    try {
      await service.resolveBinding(repoPath);
      return { success: true, data: buildPlan(changeId) };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('pipeline:archive-change', async (_event, repoPath: unknown, changeId: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
    // El slug se valida acá además de en el wrapper: el renderer no puede
    // inyectar nada al proceso por este camino.
    if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };

    try {
      // Se archiva sobre la ruta canónica, la misma identidad que usa la
      // evidencia: si divergieran, se archivaría en un repositorio distinto del
      // que la vista está mostrando.
      const { canonicalPath } = await service.resolveBinding(repoPath);
      const result = await archive(canonicalPath, changeId);
      // El resultado se lee del CLI, no del hecho de que el proceso terminó.
      if (!result.ok) return { success: false, error: result.error, stage: 'archive' };

      getMainWindow()?.webContents.send('repo:fs-change', { repoPath: canonicalPath });
      return { success: true };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });
}
