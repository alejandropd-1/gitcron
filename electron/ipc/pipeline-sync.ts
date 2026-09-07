import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BrowserWindow, ipcMain } from 'electron';
import { isValidOpenSpecChangeSlug } from '../../lib/openspec-slug';
import { generateUnifiedDiff } from '../../lib/diff-proposal';
import { PipelineService } from '../pipeline/pipeline-service';
import { errMsg, resolveInside, validRepoPath } from './shared';

/**
 * Sincronización de especificaciones delta de un change a las specs principales (Grupo 4).
 *
 * Implementa la Alternativa B decidida por Alejandro: delegación en el workflow
 * nativo `openspec-sync-specs` del agente.
 *
 * REGLAS FUNDAMENTALES:
 * 1. Nada se escribe sin confirmación explícita previa (pipeline:sync-execute requiere confirmed: true).
 * 2. La vista previa (pipeline:sync-preview) es estrictamente de sólo lectura (no escribe ningún archivo).
 * 3. Si no hay agente disponible, la sincronización se detiene informando el motivo y NO cae en un
 *    cálculo propio de emergencia (que sería la Alternativa A rechazada).
 * 4. Las specs modificadas quedan sin confirmar en Git (GitCron no hace commit).
 */

export interface SyncPreviewItem {
  capability: string;
  mainSpecPath: string;
  deltaSpecPath: string;
  originalContent: string;
  proposedContent: string;
  diff: string;
}

export interface SyncPreviewData {
  changeId: string;
  workflow: string;
  items: SyncPreviewItem[];
}

export interface SyncExecuteItem {
  capability: string;
  content: string;
}

export type ReadRepoFile = (repoPath: string, relativePath: string) => Promise<string | null>;
export type WriteRepoFile = (repoPath: string, relativePath: string, content: string) => Promise<void>;
export type ListDeltaSpecs = (repoPath: string, changeId: string) => Promise<string[]>;
export type IsAgentAvailable = (repoPath: string) => Promise<boolean> | boolean;
export type InvokeSyncWorkflow = (
  repoPath: string,
  changeId: string,
  deltaSpecs: Array<{ capability: string; deltaContent: string; mainContent: string }>,
) => Promise<Array<{ capability: string; proposedContent: string }>>;

const defaultReadRepoFile: ReadRepoFile = async (repoPath, relative) => {
  const resolved = resolveInside(repoPath, relative);
  if (!resolved) return null;
  try {
    return await fs.readFile(resolved, 'utf8');
  } catch {
    return null;
  }
};

const defaultWriteRepoFile: WriteRepoFile = async (repoPath, relative, content) => {
  const resolved = resolveInside(repoPath, relative);
  if (!resolved) throw new Error(`Ruta fuera de límites: ${relative}`);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, 'utf8');
};

const defaultListDeltaSpecs: ListDeltaSpecs = async (repoPath, changeId) => {
  const deltaSpecsDir = resolveInside(repoPath, `openspec/changes/${changeId}/specs`);
  if (!deltaSpecsDir) return [];
  try {
    const entries = await fs.readdir(deltaSpecsDir, { withFileTypes: true });
    const capabilities: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specFile = path.join(deltaSpecsDir, entry.name, 'spec.md');
        try {
          const stat = await fs.stat(specFile);
          if (stat.isFile()) capabilities.push(entry.name);
        } catch {
          // Ignorar carpetas sin spec.md
        }
      }
    }
    return capabilities;
  } catch {
    return [];
  }
};

export interface SyncDeps {
  service?: PipelineService;
  isAgentAvailable?: IsAgentAvailable;
  invokeSyncWorkflow?: InvokeSyncWorkflow;
  listDeltaSpecs?: ListDeltaSpecs;
  readRepoFile?: ReadRepoFile;
  writeRepoFile?: WriteRepoFile;
}

function validChangeId(value: unknown): value is string {
  return isValidOpenSpecChangeSlug(value);
}

const CAPABILITY_ID_PATTERN = /^[a-z0-9][a-z0-9-_./]*$/i;

function validCapabilityId(value: unknown): value is string {
  return typeof value === 'string' && CAPABILITY_ID_PATTERN.test(value) && !value.includes('..');
}

export function registerPipelineSyncHandlers(
  getMainWindow: () => BrowserWindow | null = () => null,
  deps: SyncDeps = {},
): void {
  const service = deps.service ?? new PipelineService();
  const isAgentAvailable = deps.isAgentAvailable ?? (async () => false);
  const listDeltaSpecs = deps.listDeltaSpecs ?? defaultListDeltaSpecs;
  const readRepoFile = deps.readRepoFile ?? defaultReadRepoFile;
  const writeRepoFile = deps.writeRepoFile ?? defaultWriteRepoFile;

  // Canal de vista previa: genera diff de la propuesta del agente sin escribir en disco
  ipcMain.handle('pipeline:sync-preview', async (_event, repoPath: unknown, changeId: unknown) => {
    if (!validRepoPath(repoPath)) {
      return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
    }
    if (!validChangeId(changeId)) {
      return { success: false, error: 'Identificador de cambio inválido' };
    }

    try {
      const { canonicalPath } = await service.resolveBinding(repoPath);

      // Desventaja declarada de la Alternativa B: requiere agente disponible
      const agentAvailable = await isAgentAvailable(canonicalPath);
      if (!agentAvailable) {
        return {
          success: false,
          error:
            'No hay ningún agente disponible para ejecutar el workflow openspec-sync-specs. La sincronización sin archivar requiere un agente de IA y aún no está disponible. Para sincronizar las especificaciones ahora podés archivar el cambio ("openspec archive"), que fusiona automáticamente las delta specs en openspec/specs/.',
          reason: 'no-agent',
        };
      }

      // Si no hay ejecutor configurado para el workflow del agente, el canal se detiene y lo declara
      if (!deps.invokeSyncWorkflow) {
        return {
          success: false,
          error:
            'No hay un ejecutor configurado para el workflow openspec-sync-specs. La sincronización sin archivar aún no está disponible; archivar el cambio ("openspec archive") sí sincroniza y fusiona las delta specs en openspec/specs/.',
          reason: 'no-workflow-runner',
        };
      }

      // Localizar especificaciones delta del cambio
      const capabilities = await listDeltaSpecs(canonicalPath, changeId);
      if (capabilities.length === 0) {
        return {
          success: false,
          error: `El cambio '${changeId}' no contiene especificaciones delta bajo openspec/changes/${changeId}/specs/`,
          reason: 'no-delta-specs',
        };
      }

      // Leer delta specs y main specs existentes
      const deltaSpecsData: Array<{ capability: string; deltaContent: string; mainContent: string }> = [];
      for (const cap of capabilities) {
        const deltaContent = (await readRepoFile(canonicalPath, `openspec/changes/${changeId}/specs/${cap}/spec.md`)) ?? '';
        const mainContent = (await readRepoFile(canonicalPath, `openspec/specs/${cap}/spec.md`)) ?? '';
        deltaSpecsData.push({ capability: cap, deltaContent, mainContent });
      }

      // Invocar el workflow real del agente
      const workflowResults = await deps.invokeSyncWorkflow(canonicalPath, changeId, deltaSpecsData);

      // Construir items de vista previa con diff unificado
      // IMPORTANTE: NO SE ESCRIBE NINGÚN ARCHIVO
      const items: SyncPreviewItem[] = [];
      for (const spec of deltaSpecsData) {
        const wf = workflowResults.find((r) => r.capability === spec.capability);
        const proposedContent = wf ? wf.proposedContent : spec.mainContent;
        const diff = generateUnifiedDiff(spec.mainContent, proposedContent, `specs/${spec.capability}/spec.md`);

        items.push({
          capability: spec.capability,
          mainSpecPath: `openspec/specs/${spec.capability}/spec.md`,
          deltaSpecPath: `openspec/changes/${changeId}/specs/${spec.capability}/spec.md`,
          originalContent: spec.mainContent,
          proposedContent,
          diff,
        });
      }

      return {
        success: true,
        data: {
          changeId,
          workflow: 'openspec-sync-specs',
          items,
        },
      };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  // Canal de ejecución: escribe ÚNICAMENTE tras confirmación explícita
  ipcMain.handle(
    'pipeline:sync-execute',
    async (_event, repoPath: unknown, changeId: unknown, acceptedItems: unknown, options?: unknown) => {
      if (!validRepoPath(repoPath)) {
        return { success: false, error: 'Ruta de repositorio inválida o no autorizada' };
      }
      if (!validChangeId(changeId)) {
        return { success: false, error: 'Identificador de cambio inválido' };
      }

      // REGLA: Sin confirmación previa explícita, se rechaza
      const isConfirmed = typeof options === 'object' && options !== null && (options as { confirmed?: boolean }).confirmed === true;
      if (!isConfirmed) {
        return {
          success: false,
          error: 'La sincronización requiere confirmación explícita previa antes de escribir en disco.',
          stage: 'confirmation',
        };
      }

      if (!Array.isArray(acceptedItems) || acceptedItems.length === 0) {
        return { success: false, error: 'No se proporcionaron especificaciones para sincronizar.' };
      }

      try {
        const { canonicalPath } = await service.resolveBinding(repoPath);
        const filesWritten: string[] = [];

        for (const item of acceptedItems) {
          if (!item || typeof item !== 'object') continue;
          const { capability, content } = item as SyncExecuteItem;
          if (!validCapabilityId(capability) || typeof content !== 'string') {
            return { success: false, error: `Especificación o contenido inválido para '${String(capability)}'` };
          }

          const targetRel = `openspec/specs/${capability}/spec.md`;
          const resolved = resolveInside(canonicalPath, targetRel);
          if (!resolved) {
            return {
              success: false,
              error: `Ruta de especificación fuera de límites: ${targetRel}`,
              stage: 'validate',
            };
          }

          // Escribir la especificación consolidada aceptada
          await writeRepoFile(canonicalPath, targetRel, content);
          filesWritten.push(targetRel);
        }

        // Notificar que el árbol cambió sin crear commit en Git
        getMainWindow()?.webContents.send('repo:fs-change', { repoPath: canonicalPath });

        return {
          success: true,
          filesWritten,
        };
      } catch (error) {
        return { success: false, error: errMsg(error), stage: 'write' };
      }
    },
  );
}
