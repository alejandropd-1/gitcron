import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ipcMain } from 'electron';
import { isValidOpenSpecChangeSlug } from '../../lib/openspec-slug';
import { PipelineService } from '../pipeline/pipeline-service';
import { initOpenSpecWithCli, instructionsOpenSpecWithCli } from '../pipeline/openspec-cli';
import { safeReadRepoFile } from '../pipeline/repo-paths';
import {
  appendTaskLogEntry,
  composeTaskLogEntry,
  TaskActor,
} from '../pipeline/task-checkbox';
import type { InstructionsOpenSpecResult } from '../../types/pipeline';
import { errMsg, resolveInside, validRepoPath } from './shared';

/**
 * Lectura del contenido de una especificación consolidada y escritura de artefactos de cambios.
 *
 * Va por su propio canal y no dentro del snapshot, y eso se decidió midiendo:
 * las especificaciones de este repositorio pesan 145 KB en quince archivos, con
 * una sola de 84,9 KB, y el snapshot se rearma en cada refresco que dispara el
 * watcher con cada guardado. Una spec consolidada cambia cuando se archiva un
 * cambio, no cuando se guarda un archivo, así que atarla al refresco paga un
 * costo continuo por algo que casi nunca cambia y casi nunca se mira.
 */

/**
 * Mismo alfabeto acotado que el lector de evidencia exige al listar
 * `openspec/specs`. El canal recibe el identificador y compone la ruta acá: no
 * acepta rutas del renderer, ni siquiera la referencia de origen que el snapshot
 * ya expone, porque el proceso principal no recibe paths sin validar.
 */
const SPECIFICATION_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Alfabeto seguro para nombres de artefactos. */
const ARTIFACT_ID_PATTERN = /^[a-z0-9][a-z0-9-_./]*$/i;

/** Tope de lectura. La más grande hoy son 84,9 KB; 512 KB deja margen sin ser ilimitado. */
const MAX_SPECIFICATION_BYTES = 512 * 1024;

export type ReadSpecificationResult =
  | { success: true; content: string }
  | { success: false; error: string };

function validSpecificationId(value: unknown): value is string {
  return typeof value === 'string' && SPECIFICATION_ID_PATTERN.test(value);
}

function validChangeId(value: unknown): value is string {
  return isValidOpenSpecChangeSlug(value);
}

function validArtifactId(value: unknown): value is string {
  return typeof value === 'string' && ARTIFACT_ID_PATTERN.test(value) && !value.includes('..');
}

/** Lectura y escritura contenidas al repositorio. Inyectables para pruebas. */
export type ReadRepoFile = (repoPath: string, relative: string) => Promise<string | null>;
export type WriteRepoFile = (repoPath: string, relative: string, content: string) => Promise<void>;
export type InstructionsRunner = (
  repoPath: string,
  target: string,
  options?: { changeId?: string | null; schema?: string | null },
) => Promise<InstructionsOpenSpecResult>;

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
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, 'utf8');
};

/**
 * Resuelve la lectura sin depender de Electron, para poder probarla.
 *
 * Distingue los tres estados que piden respuestas distintas: contenido leído,
 * archivo vacío —que es un dato real del repositorio— y fallo de lectura, que
 * hay que reportar en vez de disfrazar de contenido vacío.
 */
export async function readSpecificationContent(
  repoPath: string,
  specificationId: unknown,
  resolveBinding: (repoPath: string) => Promise<{ canonicalPath: string }>,
): Promise<ReadSpecificationResult> {
  if (!validSpecificationId(specificationId)) return { success: false, error: 'invalid_specification_id' };
  try {
    const { canonicalPath } = await resolveBinding(repoPath);
    const file = await safeReadRepoFile(
      canonicalPath,
      `openspec/specs/${specificationId}/spec.md`,
      { maxBytes: MAX_SPECIFICATION_BYTES },
    );
    // El motivo real, no uno normalizado: "no existe", "la ruta fue rechazada" y
    // "supera el límite" piden respuestas distintas de quien lo lee. Un archivo
    // vacío llega como contenido vacío, que es un dato del repositorio y no un
    // fallo.
    if (file.content === null) return { success: false, error: file.status };
    return { success: true, content: file.content };
  } catch (error) {
    return { success: false, error: errMsg(error) };
  }
}

/**
 * Inicializa OpenSpec en el repositorio abierto.
 *
 * Escribe, así que va detrás de una acción humana explícita en el panel. Está
 * medido que el comando no pisa `openspec/config.yaml` y que es incremental —en
 * un repositorio ya inicializado sólo agrega la herramienta que falta—, pero eso
 * lo hace seguro, no invisible: lo que se va a escribir se enumera antes.
 *
 * Sin herramientas, el CLI las detecta por los directorios del repositorio. La
 * lista sólo se pasa cuando el comando no encontró ninguna y la persona eligió.
 */
export async function initOpenSpec(
  repoPath: unknown,
  tools: unknown,
  resolveBinding: (repoPath: string) => Promise<{ canonicalPath: string }>,
) {
  if (!validRepoPath(repoPath)) return { success: false, error: 'invalid_repo_path', needsTool: false };
  // Sólo un arreglo de cadenas o nada: cualquier otra cosa se rechaza antes de
  // llegar al CLI, que en Windows corre con shell.
  if (tools !== undefined && (!Array.isArray(tools) || tools.some((tool) => typeof tool !== 'string'))) {
    return { success: false, error: 'invalid_tools', needsTool: false };
  }
  try {
    const { canonicalPath } = await resolveBinding(repoPath);
    const result = await initOpenSpecWithCli(canonicalPath, tools as string[] | undefined);
    return result.ok
      ? { success: true, needsTool: false }
      : { success: false, error: result.error, needsTool: result.needsTool };
  } catch (error) {
    return { success: false, error: errMsg(error), needsTool: false };
  }
}

export interface WriteArtifactOptions {
  overwrite?: boolean;
  actor?: TaskActor;
  targetFile?: string;
}

export type WriteArtifactStage = 'auth' | 'validate' | 'read' | 'instructions' | 'write';

export type WriteArtifactResult =
  | { success: true }
  | { success: false; error: string; stage?: WriteArtifactStage };

export interface WriteArtifactDependencies {
  resolveBinding?: (repoPath: string) => Promise<{ canonicalPath: string }>;
  read?: ReadRepoFile;
  write?: WriteRepoFile;
  getInstructions?: InstructionsRunner;
  now?: () => string;
}

/**
 * Escribe un artefacto dentro del directorio del change correspondiente (Tareas 3.2, 3.3).
 *
 * Contención estricta:
 * 1. Valida repoPath y slug autorizado del change.
 * 2. Verifica que el change esté activo (no archivado).
 * 3. Consulta la ruta con `instructions` del motor CLI.
 * 4. Aplica contención estricta con `resolveInside` contra el directorio canónico
 *    `openspec/changes/<changeId>`: si el CLI estuviese manipulado y devolviese una
 *    ruta fuera del cambio (otra unidad, repo root, escape .. u otro change),
 *    se rechaza inmediatamente con `out-of-bounds` y no se escribe nada en disco.
 * 5. Previene sobrescritura accidental si el archivo ya existe y no se pasó `overwrite: true`.
 * 6. El actor es obligatorio (`'persona' | 'agente'`): si falta o es inválido se
 *    rechaza en `validate` nombrando el valor recibido, sin tocar disco.
 * 7. Registra la operación en `task-log.md` como `'escrita'` preservando formato y actor.
 */
export async function writeArtifact(
  repoPath: unknown,
  changeId: unknown,
  artifactId: unknown,
  content: unknown,
  options?: unknown,
  deps?: WriteArtifactDependencies,
): Promise<WriteArtifactResult> {
  if (!validRepoPath(repoPath)) {
    return { success: false, error: 'Ruta de repositorio inválida o no autorizada', stage: 'auth' };
  }
  if (!validChangeId(changeId)) {
    return { success: false, error: 'Identificador de cambio inválido', stage: 'validate' };
  }
  if (!validArtifactId(artifactId)) {
    return { success: false, error: 'Identificador de artefacto inválido', stage: 'validate' };
  }
  if (typeof content !== 'string') {
    return { success: false, error: 'Contenido inválido', stage: 'validate' };
  }

  let parsedOptions: WriteArtifactOptions | undefined;
  let rawActor: unknown;
  if (options && typeof options === 'object') {
    const opt = options as Record<string, unknown>;
    rawActor = opt.actor;
    parsedOptions = {
      overwrite: opt.overwrite === true,
      actor: opt.actor === 'persona' || opt.actor === 'agente' ? opt.actor : undefined,
      targetFile: typeof opt.targetFile === 'string' ? opt.targetFile : undefined,
    };
  }

  if (rawActor !== 'persona' && rawActor !== 'agente') {
    const received = typeof rawActor === 'string' ? `"${rawActor}"` : String(rawActor);
    return { success: false, error: `Actor inválido: se esperaba 'persona' o 'agente', recibido ${received}`, stage: 'validate' };
  }

  const resolveBinding = deps?.resolveBinding ?? (async (p) => ({ canonicalPath: p }));
  const read = deps?.read ?? defaultRead;
  const write = deps?.write ?? defaultWrite;
  const getInstructions = deps?.getInstructions ?? instructionsOpenSpecWithCli;
  const now = deps?.now ?? (() => new Date().toISOString());

  try {
    const { canonicalPath } = await resolveBinding(repoPath);

    // Un cambio archivado no tiene proposal.md ni tasks.md en openspec/changes/<changeId>/.
    const tasksRaw = await read(canonicalPath, `openspec/changes/${changeId}/tasks.md`);
    const proposalRaw = await read(canonicalPath, `openspec/changes/${changeId}/proposal.md`);
    if (tasksRaw === null && proposalRaw === null) {
      return { success: false, error: 'archived', stage: 'read' };
    }

    const instructionsRes = await getInstructions(canonicalPath, artifactId, { changeId });
    if (!instructionsRes.ok || !instructionsRes.data) {
      return { success: false, error: instructionsRes.error ?? 'instructions-failed', stage: 'instructions' };
    }

    let cliResolved = instructionsRes.data.resolvedOutputPath;
    if (!cliResolved || typeof cliResolved !== 'string') {
      return { success: false, error: 'invalid-resolved-path', stage: 'validate' };
    }

    const expectedChangeDir = path.resolve(canonicalPath, 'openspec', 'changes', changeId);

    if (cliResolved.includes('*')) {
      if (parsedOptions?.targetFile) {
        cliResolved = path.resolve(expectedChangeDir, parsedOptions.targetFile);
      } else {
        return { success: false, error: 'target-path-contains-wildcard', stage: 'validate' };
      }
    }

    const safeTarget = resolveInside(expectedChangeDir, cliResolved);
    if (!safeTarget) {
      return { success: false, error: 'out-of-bounds', stage: 'validate' };
    }

    const relPath = path.relative(canonicalPath, safeTarget).replace(/\\/g, '/');

    // Comprobación de existencia previa para evitar sobrescrituras accidentales
    const existingOnDisk = (await read(canonicalPath, relPath)) !== null;
    const reportedInExisting =
      Array.isArray(instructionsRes.data.existingOutputPaths) &&
      instructionsRes.data.existingOutputPaths.some(
        (p) => path.resolve(p).toLowerCase() === safeTarget.toLowerCase(),
      );

    if ((existingOnDisk || reportedInExisting) && !parsedOptions?.overwrite) {
      return { success: false, error: 'already-exists', stage: 'validate' };
    }

    await write(canonicalPath, relPath, content);

    const logRef = `openspec/changes/${changeId}/task-log.md`;
    const logRaw = await read(canonicalPath, logRef);
    const entry = composeTaskLogEntry(now(), artifactId, 'escrita', rawActor);
    await write(canonicalPath, logRef, appendTaskLogEntry(logRaw, entry));

    return { success: true };
  } catch (error) {
    return { success: false, error: errMsg(error), stage: 'write' };
  }
}

export function registerPipelineSpecHandlers(
  service = new PipelineService(),
  read: ReadRepoFile = defaultRead,
  write: WriteRepoFile = defaultWrite,
  getInstructions: InstructionsRunner = instructionsOpenSpecWithCli,
  now: () => string = () => new Date().toISOString(),
): void {
  ipcMain.handle('pipeline:init-openspec', async (_event, repoPath: unknown, tools: unknown) =>
    initOpenSpec(repoPath, tools, (path) => service.resolveBinding(path)));

  ipcMain.handle('pipeline:read-specification', async (_event, repoPath: unknown, specificationId: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'invalid_repo_path' };
    return readSpecificationContent(repoPath, specificationId, (path) => service.resolveBinding(path));
  });

  ipcMain.handle(
    'pipeline:write-artifact',
    async (
      _event,
      repoPath: unknown,
      changeId: unknown,
      artifactId: unknown,
      content: unknown,
      options?: unknown,
    ) =>
      writeArtifact(repoPath, changeId, artifactId, content, options, {
        resolveBinding: (p) => service.resolveBinding(p),
        read,
        write,
        getInstructions,
        now,
      }),
  );
}
