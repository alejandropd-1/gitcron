import { ipcMain } from 'electron';
import type { PipelineAgentRole, PipelineRuntime } from '../../types/pipeline';
import { PipelineService } from '../pipeline/pipeline-service';
import type { RuntimeSessionHub } from '../pipeline/runtime/runtime-session-hub';
import { errMsg } from './shared';

/**
 * Canales `pipeline:runtime:*` — sesiones de runtime vivas.
 *
 * Separado de `pipeline.ts` a propósito: aquél lee evidencia escrita en el repo
 * y es de sólo lectura; éste abre procesos. Mezclarlos escondería que hay una
 * superficie con capacidad de ejecución detrás de la misma pestaña.
 *
 * Todo lo que llega del renderer se valida acá: ni la ruta, ni el runtime, ni
 * el rol, ni la instrucción se pasan crudos al hub.
 */

const MAX_INSTRUCTION_BYTES = 16_384;

const RUNTIMES: PipelineRuntime[] = ['hermes', 'claude', 'codex', 'agy', 'opencode', 'unknown'];
const ROLES: PipelineAgentRole[] = ['scout', 'planner', 'builder', 'auditor', 'fixer', 'orchestrator', 'unknown'];

function validRepoPath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 32_768;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function registerPipelineRuntimeHandlers(
  hub: RuntimeSessionHub,
  service = new PipelineService(),
): void {
  ipcMain.handle('pipeline:runtime:discover', async (_event, repoPath: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };
    try {
      const { canonicalPath } = await service.resolveBinding(repoPath);
      return { success: true, data: await hub.discover(canonicalPath) };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('pipeline:runtime:get', async (_event, repoPath: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };
    try {
      const { canonicalPath } = await service.resolveBinding(repoPath);
      return { success: true, data: hub.get(canonicalPath) };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('pipeline:runtime:history', async (_event, repoPath: unknown, requestedLimit: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };
    const limit = typeof requestedLimit === 'number' && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.trunc(requestedLimit), 100))
      : 20;
    try {
      const { repoId } = await service.resolveBinding(repoPath);
      return { success: true, data: hub.history(repoId, limit) };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('pipeline:runtime:start', async (_event, payload: unknown) => {
    const input = asRecord(payload);
    const repoPath = input.repoPath;
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };

    const runtime = input.runtime;
    if (typeof runtime !== 'string' || !RUNTIMES.includes(runtime as PipelineRuntime)) {
      return { success: false, error: 'Runtime no reconocido' };
    }

    const role = typeof input.role === 'string' && ROLES.includes(input.role as PipelineAgentRole)
      ? input.role as PipelineAgentRole
      // Un rol desconocido no se adivina como `builder`: se declara desconocido.
      : 'unknown';

    const instruction = input.instruction;
    if (typeof instruction !== 'string' || instruction.trim().length === 0) {
      return { success: false, error: 'La instrucción es obligatoria' };
    }
    if (Buffer.byteLength(instruction) > MAX_INSTRUCTION_BYTES) {
      return { success: false, error: 'La instrucción excede el límite permitido' };
    }

    const requestedModel = typeof input.requestedModel === 'string' && input.requestedModel.trim().length > 0
      ? input.requestedModel.trim()
      : null;
    const changeId = typeof input.changeId === 'string' && input.changeId.length > 0
      ? input.changeId
      : null;
    const taskId = typeof input.taskId === 'string' && input.taskId.length > 0 && input.taskId.length <= 256
      ? input.taskId
      : null;

    try {
      const { canonicalPath, repoId } = await service.resolveBinding(repoPath);
      const result = await hub.start({
        canonicalRepoPath: canonicalPath,
        repoId,
        runtime: runtime as PipelineRuntime,
        instruction,
        role,
        requestedModel,
        changeId,
        taskId,
      });
      return result.ok
        ? { success: true, data: { sessionId: result.sessionId } }
        : { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('pipeline:runtime:stop', async (_event, repoPath: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };
    try {
      const { canonicalPath } = await service.resolveBinding(repoPath);
      return { success: true, data: await hub.stop(canonicalPath) };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

}
