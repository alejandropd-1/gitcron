// electron/ipc/carto.ts
//
// Cartografía — Fase 2. Handler IPC de SOLO LECTURA `carto:scan-tree`.
//
// Camina el working dir del repo activo y devuelve el árbol de archivos ya
// armado (estructura serializable). Invariantes de Cartografía:
//   · sólo lectura de filesystem — nunca escribe en el repo,
//   · cero red, cero invocación de Git (no toca lógica de Git),
//   · todo el cómputo vive acá, en el proceso main, no en el renderer.
//
// La transformación rutas→árbol es una función pura testeable (lib/carto-tree).

import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {
  buildFileTree,
  countFiles,
  countDirs,
  type CartoTreeNode,
} from '../../lib/carto-tree';
import { errMsg } from './shared';

/** Resultado serializable de un escaneo del árbol del repo activo. */
export interface CartoScanResult {
  /** Nodos raíz del árbol (carpetas primero, luego archivos). */
  root: CartoTreeNode[];
  fileCount: number;
  dirCount: number;
  /** `true` si se alcanzó el tope de entradas y el árbol quedó parcial. */
  truncated: boolean;
  /** Momento del escaneo (epoch ms), para mostrar "última actualización". */
  scannedAt: number;
}

// Carpetas excluidas SIEMPRE, estén o no en .gitignore. Son ruido (deps,
// artefactos de build) o internas de Git. Comparadas por nombre exacto.
const ALWAYS_EXCLUDED_DIRS = new Set<string>([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.git',
]);

// Tope defensivo: evita que un working dir gigante (o un symlink en bucle)
// cuelgue el escaneo. Si se supera, el árbol se devuelve truncado.
const MAX_ENTRIES = 50_000;

/**
 * Lee el .gitignore de la raíz y extrae nombres simples a excluir, "sin
 * sobre-ingeniería": sólo entradas literales (sin globs, sin negaciones, sin
 * rutas anidadas), tratadas como nombres de carpeta/archivo a saltar en
 * cualquier nivel. Cubre casos comunes (`coverage/`, `.env`, `out/`) sin
 * implementar la semántica completa de gitignore. Errores → conjunto vacío.
 */
function readSimpleGitignoreNames(repoRoot: string): Set<string> {
  const names = new Set<string>();
  try {
    const raw = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('!')) continue;            // negación: no soportada
      if (/[*?[\]]/.test(trimmed)) continue;            // glob: no soportado
      const name = trimmed.replace(/^\/+|\/+$/g, '');    // quita / de los extremos
      if (!name || name.includes('/')) continue;        // sólo nombres simples
      names.add(name);
    }
  } catch {
    // Sin .gitignore o ilegible: nada extra que excluir.
  }
  return names;
}

/**
 * Walk recursivo, async, sin seguir symlinks de carpeta (evita bucles).
 * Acumula rutas relativas POSIX de ARCHIVO. Respeta el tope MAX_ENTRIES.
 */
async function walkDir(
  absDir: string,
  relDir: string,
  excludedNames: Set<string>,
  out: string[],
): Promise<boolean> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(absDir, { withFileTypes: true });
  } catch {
    return false; // carpeta ilegible (permisos): la salteamos en silencio
  }

  for (const entry of entries) {
    const name = entry.name;
    const relPath = relDir ? `${relDir}/${name}` : name;

    if (entry.isSymbolicLink()) continue; // no seguimos symlinks (ni archivo ni dir)

    if (entry.isDirectory()) {
      if (ALWAYS_EXCLUDED_DIRS.has(name) || excludedNames.has(name)) continue;
      const truncated = await walkDir(
        path.join(absDir, name),
        relPath,
        excludedNames,
        out,
      );
      if (truncated) return true;
    } else if (entry.isFile()) {
      if (excludedNames.has(name)) continue;
      out.push(relPath);
      if (out.length >= MAX_ENTRIES) return true;
    }
  }
  return false;
}

export function registerCartoHandlers(): void {
  ipcMain.handle('carto:scan-tree', async (_event, repoPath: string): Promise<{
    success: boolean;
    data?: CartoScanResult;
    error?: string;
  }> => {
    try {
      if (!repoPath || typeof repoPath !== 'string') {
        return { success: false, error: 'Ruta de repositorio inválida' };
      }
      const root = path.resolve(repoPath);
      let stat: fs.Stats;
      try {
        stat = await fs.promises.stat(root);
      } catch {
        return { success: false, error: `La carpeta ya no existe: ${repoPath}` };
      }
      if (!stat.isDirectory()) {
        return { success: false, error: `No es una carpeta: ${repoPath}` };
      }

      const excludedNames = readSimpleGitignoreNames(root);
      const paths: string[] = [];
      const truncated = await walkDir(root, '', excludedNames, paths);

      const tree = buildFileTree(paths);
      return {
        success: true,
        data: {
          root: tree,
          fileCount: countFiles(tree),
          dirCount: countDirs(tree),
          truncated,
          scannedAt: Date.now(),
        },
      };
    } catch (error: unknown) {
      return { success: false, error: errMsg(error) };
    }
  });
}
