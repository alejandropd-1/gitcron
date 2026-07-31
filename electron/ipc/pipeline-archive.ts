import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ipcMain } from 'electron';
import { simpleGit } from 'simple-git';
import {
  archiveCommitPaths,
  deterministicChangePaths,
  markSignatureTask,
  parseCommitManifest,
} from '../pipeline/change-commit-manifest';
import { archiveOpenSpecChangeWithCli, CHANGE_ID_PATTERN } from '../pipeline/openspec-cli';
import { PipelineService } from '../pipeline/pipeline-service';
import { errMsg } from './shared';

/**
 * Archivado de un change: firma, commits y consolidación de specs.
 *
 * Vive en su propio módulo y no en `ipc/pipeline.ts` a propósito: aquél expone
 * snapshot y suscripción, y su contrato declara que no acepta operaciones que
 * escriban en el repositorio. Esto sí escribe.
 *
 * **Nunca publica.** No ejecuta `push`, `merge` ni `tag`: la confirmación humana
 * autoriza esta acción concreta y nada más.
 */

/** Plan de lo que va a ocurrir, para mostrarlo antes de ejecutar nada. */
interface ArchivePlan {
  workMessage: string | null;
  archiveMessage: string;
  archiveCommand: string;
  included: string[];
  /** Modificados que NO entran. Se muestran para que un manifiesto con una omisión se vea antes. */
  excluded: string[];
  signature: boolean;
}

function validRepoPath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 32_768;
}

function validChangeId(value: unknown): value is string {
  return typeof value === 'string' && CHANGE_ID_PATTERN.test(value);
}

/** Rutas con cambios sin commitear, relativas a la raíz y con separador POSIX. */
export interface ArchiveGit {
  changedFiles(repoPath: string): Promise<string[]>;
  add(repoPath: string, files: string[]): Promise<void>;
  commit(repoPath: string, message: string): Promise<void>;
}

/**
 * Implementación real.
 *
 * Se inyecta para poder probar la orquestación —y sobre todo sus caminos de
 * fallo— sin un repositorio real. `add` recibe siempre una lista explícita de
 * archivos: nunca un directorio.
 */
const defaultGit: ArchiveGit = {
  async changedFiles(repoPath) {
    const status = await simpleGit(repoPath, { timeout: { block: 20_000 } }).status();
    return [...new Set(status.files.map((file) => file.path.replace(/\\/g, '/')))].sort();
  },
  async add(repoPath, files) {
    await simpleGit(repoPath, { timeout: { block: 60_000 } }).add(files);
  },
  async commit(repoPath, message) {
    await simpleGit(repoPath, { timeout: { block: 60_000 } }).commit(message);
  },
};

/** Lectura contenida de un artefacto del repositorio. Inyectable para pruebas. */
export type ReadRepoFile = (repoPath: string, relative: string) => Promise<string | null>;

const defaultRead: ReadRepoFile = async (repoPath, relative) => readIfPresent(repoPath, relative);

/** Escritura contenida de un artefacto del repositorio. Inyectable para pruebas. */
export type WriteRepoFile = (repoPath: string, relative: string, content: string) => Promise<void>;

const defaultWrite: WriteRepoFile = async (repoPath, relative, content) => {
  const resolved = path.resolve(repoPath, relative);
  if (resolved !== repoPath && !resolved.startsWith(repoPath + path.sep)) return;
  await fs.writeFile(resolved, content, 'utf8');
};

async function readIfPresent(repoPath: string, relative: string): Promise<string | null> {
  // Contención: la ruta resuelta tiene que caer dentro del repositorio.
  const resolved = path.resolve(repoPath, relative);
  if (resolved !== repoPath && !resolved.startsWith(repoPath + path.sep)) return null;
  try {
    return await fs.readFile(resolved, 'utf8');
  } catch {
    return null;
  }
}

async function buildPlan(git: ArchiveGit, read: ReadRepoFile, repoPath: string, changeId: string): Promise<ArchivePlan> {
  const manifestRaw = await read(repoPath, `openspec/changes/${changeId}/commit.md`);
  const manifest = manifestRaw ? parseCommitManifest(manifestRaw) : null;
  const tasksRaw = await read(repoPath, `openspec/changes/${changeId}/tasks.md`);
  const signature = tasksRaw ? markSignatureTask(tasksRaw).marked : false;

  const changed = await git.changedFiles(repoPath);
  // Un archivo declarado que no está modificado no se incluye: no hay nada que
  // commitear de él, y afirmarlo sería inventar alcance.
  const declared = (manifest?.files ?? []).filter((file) => changed.includes(file));
  const included = [...new Set([...declared, ...deterministicChangePaths(changeId, changed)])].sort();
  const excluded = changed.filter((file) => !included.includes(file));

  return {
    workMessage: manifest?.message ?? null,
    archiveMessage: `chore(openspec): archivar ${changeId}`,
    archiveCommand: `openspec archive ${changeId} --yes`,
    included,
    excluded,
    signature,
  };
}

export function registerPipelineArchiveHandlers(
  archive = archiveOpenSpecChangeWithCli,
  service = new PipelineService(),
  git: ArchiveGit = defaultGit,
  read: ReadRepoFile = defaultRead,
  write: WriteRepoFile = defaultWrite,
): void {
  ipcMain.handle('pipeline:archive-plan', async (_event, repoPath: unknown, changeId: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };
    if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };
    try {
      const { canonicalPath } = await service.resolveBinding(repoPath);
      return { success: true, data: await buildPlan(git, read, canonicalPath, changeId) };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });

  ipcMain.handle('pipeline:archive-change', async (_event, repoPath: unknown, changeId: unknown, commit: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };
    // El slug se valida acá además de en el wrapper: el renderer no puede
    // inyectar nada al proceso por este camino.
    if (!validChangeId(changeId)) return { success: false, error: 'Identificador de cambio inválido' };
    const shouldCommit = commit === true;

    try {
      // Se archiva sobre la ruta canónica, la misma identidad que usa la
      // evidencia: si divergieran, se archivaría en un repositorio distinto del
      // que la vista está mostrando.
      const { canonicalPath } = await service.resolveBinding(repoPath);
      const plan = await buildPlan(git, read, canonicalPath, changeId);

      // 1 · La firma va antes de archivar por obligación: archivar mueve el
      //     directorio y después `tasks.md` ya no está ahí para marcar.
      const tasksRef = `openspec/changes/${changeId}/tasks.md`;
      const tasksRaw = await read(canonicalPath, tasksRef);
      if (tasksRaw) {
        const signed = markSignatureTask(tasksRaw);
        if (signed.marked) await write(canonicalPath, tasksRef, signed.content);
      }

      // 2 · Commit del trabajo. Si falla, no se archiva: dejar el change
      //     archivado con su trabajo sin commitear es un estado peor que no
      //     haber empezado, y bastante menos evidente.
      if (shouldCommit && plan.workMessage) {
        const files = [...new Set([...plan.included, tasksRef])]
          .filter((file) => file !== '');
        try {
          if (files.length > 0) await git.add(canonicalPath, files);
          await git.commit(canonicalPath, plan.workMessage);
        } catch (error) {
          return { success: false, error: errMsg(error), stage: 'work-commit' };
        }
      }

      // 3 · Archivado.
      const result = await archive(canonicalPath, changeId);
      // El resultado se lee del CLI, no del hecho de que el proceso terminó.
      if (!result.ok) return { success: false, error: result.error, stage: 'archive' };

      // 4 · Commit del archivado. Si falla, el paso 3 ya ocurrió: se informa tal
      //     cual, sin declarar éxito. El trabajo no se perdió y se resuelve
      //     commiteando a mano.
      if (shouldCommit) {
        try {
          const paths = archiveCommitPaths(changeId, await git.changedFiles(canonicalPath));
          if (paths.length > 0) {
            await git.add(canonicalPath, paths);
            await git.commit(canonicalPath, plan.archiveMessage);
          }
        } catch (error) {
          return { success: false, error: errMsg(error), stage: 'archive-commit' };
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  });
}
