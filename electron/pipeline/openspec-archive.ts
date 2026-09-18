import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { isValidOpenSpecChangeSlug } from '../../lib/openspec-slug';
import {
  resolveOpenSpecExecutable,
  runAuthorizedOpenSpec,
  type AuthorizedOpenSpecRuntime,
} from './openspec-engine';

export interface ArchiveOpenSpecChangeResult {
  ok: boolean;
  archivedDir: string | null;
  specsChanged: string[];
  specsRemoved: string[];
  error: string | null;
}

export interface ArchiveOpenSpecChangeDeps {
  runOpenSpec?: (
    runtime: AuthorizedOpenSpecRuntime,
    args: string[],
    options?: { cwd?: string; timeout?: number; maxBuffer?: number },
  ) => Promise<{ stdout: string; stderr: string }>;
  resolveRuntime?: (options?: { repoPath?: string }) => AuthorizedOpenSpecRuntime | null;
  sleep?: (ms: number) => Promise<void>;
  unlink?: (filePath: string) => Promise<void>;
}

async function computeFileSha256(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function collectFilesAndHashes(dirPath: string): Promise<Map<string, string>> {
  const hashes = new Map<string, string>();
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) return hashes;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return hashes;
    }
    throw err;
  }

  async function walk(current: string, relBase: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile()) {
        const hash = await computeFileSha256(full);
        hashes.set(rel.replace(/\\/g, '/'), hash);
      }
    }
  }

  await walk(dirPath, '');
  return hashes;
}

function mapsEqual(a: Map<string, string>, b: Map<string, string>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, val] of a) {
    if (b.get(key) !== val) return false;
  }
  return true;
}

async function pruneEmptyDirectories(dir: string, stopAt: string): Promise<void> {
  let current = path.resolve(dir);
  const stop = path.resolve(stopAt);
  while (current !== stop && current.startsWith(stop)) {
    try {
      const files = await fs.readdir(current);
      if (files.length === 0) {
        await fs.rmdir(current);
        current = path.dirname(current);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}

async function deleteFolderSafely(
  targetDir: string,
  sleepFn: (ms: number) => Promise<void>,
  unlinkFn: (filePath: string) => Promise<void> = (p) => fs.unlink(p),
): Promise<void> {
  const maxAttempts = 5;
  const delayMs = 200;

  async function removeContentsRecursively(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await removeContentsRecursively(fullPath);
        await removeDirWithRetries(fullPath);
      } else {
        await removeFileWithRetries(fullPath);
      }
    }
  }

  async function removeFileWithRetries(file: string): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await unlinkFn(file);
        return;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
        if (attempt === maxAttempts) throw err;
        await sleepFn(delayMs);
      }
    }
  }

  async function removeDirWithRetries(dir: string): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await fs.rmdir(dir);
        return;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
        if (attempt === maxAttempts) throw err;
        await sleepFn(delayMs);
      }
    }
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await removeContentsRecursively(targetDir);
      await removeDirWithRetries(targetDir);
      return;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      if (attempt === maxAttempts) throw err;
      await sleepFn(delayMs);
    }
  }
}

/**
 * Archiva un cambio de OpenSpec ejecutando el CLI sobre una raíz temporal aislada
 * y trayendo los cambios al repositorio por copia verificada criptográficamente (sha256).
 *
 * Evita bloqueos de archivos en Windows (`EPERM` / `EBUSY` durante `fs.rename`)
 * garantizando que el repositorio sólo se modifica tras confirmar la integridad del cambio.
 */
export async function archiveOpenSpecChange(
  repoPath: string,
  changeId: string,
  runtime?: AuthorizedOpenSpecRuntime | null,
  deps?: ArchiveOpenSpecChangeDeps,
): Promise<ArchiveOpenSpecChangeResult> {
  if (!isValidOpenSpecChangeSlug(changeId)) {
    return {
      ok: false,
      archivedDir: null,
      specsChanged: [],
      specsRemoved: [],
      error: 'invalid-change-id',
    };
  }

  const resolvedRuntime =
    runtime !== undefined
      ? runtime
      : (deps?.resolveRuntime ? deps.resolveRuntime({ repoPath }) : resolveOpenSpecExecutable({ repoPath }));

  if (!resolvedRuntime) {
    return {
      ok: false,
      archivedDir: null,
      specsChanged: [],
      specsRemoved: [],
      error: 'openspec-cli-not-found',
    };
  }

  const repoOpenspecDir = path.join(repoPath, 'openspec');
  const repoSpecsDir = path.join(repoOpenspecDir, 'specs');
  const repoChangeDir = path.join(repoOpenspecDir, 'changes', changeId);
  const repoArchiveBaseDir = path.join(repoOpenspecDir, 'changes', 'archive');

  // Validar existencia de la carpeta del cambio en el repositorio
  try {
    const stat = await fs.stat(repoChangeDir);
    if (!stat.isDirectory()) {
      return {
        ok: false,
        archivedDir: null,
        specsChanged: [],
        specsRemoved: [],
        error: `No existe la carpeta del cambio: ${changeId}`,
      };
    }
  } catch {
    return {
      ok: false,
      archivedDir: null,
      specsChanged: [],
      specsRemoved: [],
      error: `No existe la carpeta del cambio: ${changeId}`,
    };
  }

  const sleepFn = deps?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  // a. Huellas iniciales (sha256 por archivo, rutas relativas) de specs y change
  const initialSpecsHashes = await collectFilesAndHashes(repoSpecsDir);
  const initialChangeHashes = await collectFilesAndHashes(repoChangeDir);

  // b. Directorio temporal con raíz OpenSpec mínima
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-archive-'));

  try {
    const tmpOpenspecDir = path.join(tmpRoot, 'openspec');
    await fs.mkdir(tmpOpenspecDir, { recursive: true });

    // Archivos de primer nivel de openspec/ (config.yaml y lo que haya)
    try {
      const topEntries = await fs.readdir(repoOpenspecDir, { withFileTypes: true });
      for (const entry of topEntries) {
        if (entry.isFile()) {
          await fs.copyFile(
            path.join(repoOpenspecDir, entry.name),
            path.join(tmpOpenspecDir, entry.name),
          );
        }
      }
    } catch {
      // Si la raíz no tiene archivos de primer nivel, se continúa
    }

    // openspec/specs/ entero
    const tmpSpecsDir = path.join(tmpOpenspecDir, 'specs');
    if (initialSpecsHashes.size > 0) {
      await fs.cp(repoSpecsDir, tmpSpecsDir, { recursive: true });
    } else {
      await fs.mkdir(tmpSpecsDir, { recursive: true });
    }

    // openspec/changes/<changeId>/ entero
    const tmpChangeDir = path.join(tmpOpenspecDir, 'changes', changeId);
    await fs.mkdir(path.dirname(tmpChangeDir), { recursive: true });
    await fs.cp(repoChangeDir, tmpChangeDir, { recursive: true });

    // openspec/changes/archive/ vacío
    const tmpArchiveDir = path.join(tmpOpenspecDir, 'changes', 'archive');
    await fs.mkdir(tmpArchiveDir, { recursive: true });

    // c. Ejecución del CLI de OpenSpec en tmpRoot
    const runCli = deps?.runOpenSpec ?? runAuthorizedOpenSpec;
    try {
      await runCli(resolvedRuntime, ['archive', changeId, '--yes'], {
        cwd: tmpRoot,
        timeout: 120_000,
        maxBuffer: 4 * 1024 * 1024,
      });
    } catch (error) {
      const detail = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
      const reason =
        [detail.stderr, detail.stdout, detail.message]
          .map((part) => (typeof part === 'string' ? part.trim() : ''))
          .find((part) => part.length > 0) ?? 'archive-failed';
      return {
        ok: false,
        archivedDir: null,
        specsChanged: [],
        specsRemoved: [],
        error: reason.slice(0, 4000),
      };
    }

    // d. Verificar que las huellas del repositorio no cambiaron durante la ejecución del CLI
    const currentRepoSpecsHashes = await collectFilesAndHashes(repoSpecsDir);
    const currentRepoChangeHashes = await collectFilesAndHashes(repoChangeDir);

    if (
      !mapsEqual(initialSpecsHashes, currentRepoSpecsHashes) ||
      !mapsEqual(initialChangeHashes, currentRepoChangeHashes)
    ) {
      return {
        ok: false,
        archivedDir: null,
        specsChanged: [],
        specsRemoved: [],
        error: 'El repositorio fue modificado externamente durante el archivado; operación abortada sin aplicar cambios',
      };
    }

    // e. Traer de vuelta: specs actualizadas/retiradas y carpeta archivada verificada
    const archiveEntries = await fs.readdir(tmpArchiveDir, { withFileTypes: true });
    const archiveDirs = archiveEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    if (archiveDirs.length === 0) {
      return {
        ok: false,
        archivedDir: null,
        specsChanged: [],
        specsRemoved: [],
        error: 'El CLI no generó ninguna carpeta en openspec/changes/archive',
      };
    }

    const archivedFolder = archiveDirs[0];
    const targetRepoArchivedDir = path.join(repoArchiveBaseDir, archivedFolder);

    // Fallar si la carpeta ya existe en el repositorio
    let destinationAlreadyExists = false;
    try {
      await fs.access(targetRepoArchivedDir);
      destinationAlreadyExists = true;
    } catch {
      destinationAlreadyExists = false;
    }

    if (destinationAlreadyExists) {
      return {
        ok: false,
        archivedDir: null,
        specsChanged: [],
        specsRemoved: [],
        error: `La carpeta archivada ya existe en el repositorio: openspec/changes/archive/${archivedFolder}`,
      };
    }

    // Verificar que la carpeta archivada contiene exactamente el change original
    const tmpArchivedPath = path.join(tmpArchiveDir, archivedFolder);
    const archivedHashes = await collectFilesAndHashes(tmpArchivedPath);

    for (const [relPath, originalHash] of initialChangeHashes) {
      const archivedHash = archivedHashes.get(relPath);
      if (!archivedHash) {
        return {
          ok: false,
          archivedDir: null,
          specsChanged: [],
          specsRemoved: [],
          error: `Verificación fallida: falta el archivo ${relPath} en la carpeta archivada`,
        };
      }
      if (archivedHash !== originalHash) {
        return {
          ok: false,
          archivedDir: null,
          specsChanged: [],
          specsRemoved: [],
          error: `Verificación fallida: el contenido de ${relPath} difiere en la carpeta archivada`,
        };
      }
    }

    // Sincronizar specs: traer modificadas o nuevas de tmp
    const tmpSpecsHashes = await collectFilesAndHashes(tmpSpecsDir);
    const specsChanged: string[] = [];
    const specsRemoved: string[] = [];

    for (const [relPath, tmpHash] of tmpSpecsHashes) {
      const repoHash = initialSpecsHashes.get(relPath);
      if (repoHash !== tmpHash) {
        const src = path.join(tmpSpecsDir, relPath);
        const dest = path.join(repoSpecsDir, relPath);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(src, dest);
        specsChanged.push(relPath);
      }
    }

    // Sincronizar specs: borrar del repositorio las eliminadas en tmp (retiros)
    for (const [relPath] of initialSpecsHashes) {
      if (!tmpSpecsHashes.has(relPath)) {
        const dest = path.join(repoSpecsDir, relPath);
        try {
          await fs.unlink(dest);
          specsRemoved.push(relPath);
          await pruneEmptyDirectories(path.dirname(dest), repoSpecsDir);
        } catch {
          // ignore
        }
      }
    }

    // Copiar la carpeta archivada al repositorio
    await fs.mkdir(path.dirname(targetRepoArchivedDir), { recursive: true });
    await fs.cp(tmpArchivedPath, targetRepoArchivedDir, { recursive: true });

    // f. Borrar repo/openspec/changes/<changeId>/ archivo por archivo y después la carpeta
    await deleteFolderSafely(repoChangeDir, sleepFn, deps?.unlink);

    // g. Devolver resultado
    return {
      ok: true,
      archivedDir: archivedFolder,
      specsChanged,
      specsRemoved,
      error: null,
    };
  } finally {
    // Borrar el temporal siempre
    await fs.rm(tmpRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  }
}
