// electron/carto/repo-files.ts
//
// Scanner compartido de Cartografia: lista archivos reales del repo activo desde
// filesystem, sin Git y sin red. Lo usan el Explorador y el snapshot del Grafo
// para que ambos partan del mismo universo de archivos.

import * as fs from 'node:fs';
import * as path from 'node:path';

// Carpetas excluidas SIEMPRE, esten o no en .gitignore. Son ruido (deps,
// artefactos de build) o internas de Git. Comparadas por nombre exacto.
const ALWAYS_EXCLUDED_DIRS = new Set<string>([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.git',
]);

// Tope defensivo: evita que un working dir gigante (o un symlink en bucle)
// cuelgue el escaneo. Si se supera, el arbol/snapshot se devuelve truncado.
const MAX_ENTRIES = 50_000;

export interface RepoFileScan {
  paths: string[];
  truncated: boolean;
}

/**
 * Lee el .gitignore de la raiz y extrae nombres simples a excluir, "sin
 * sobre-ingenieria": solo entradas literales (sin globs, sin negaciones, sin
 * rutas anidadas), tratadas como nombres de carpeta/archivo a saltar en
 * cualquier nivel. Cubre casos comunes (`coverage/`, `.env`, `out/`) sin
 * implementar la semantica completa de gitignore. Errores -> conjunto vacio.
 */
function readSimpleGitignoreNames(repoRoot: string): Set<string> {
  const names = new Set<string>();
  try {
    const raw = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('!')) continue;
      if (/[*?[\]]/.test(trimmed)) continue;
      const name = trimmed.replace(/^\/+|\/+$/g, '');
      if (!name || name.includes('/')) continue;
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
async function walkRepoFiles(
  absDir: string,
  relDir: string,
  excludedNames: Set<string>,
  out: string[],
): Promise<boolean> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(absDir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    const name = entry.name;
    const relPath = relDir ? `${relDir}/${name}` : name;

    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      if (ALWAYS_EXCLUDED_DIRS.has(name) || excludedNames.has(name)) continue;
      const truncated = await walkRepoFiles(
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

export async function scanRepoFilePaths(repoRoot: string): Promise<RepoFileScan> {
  const root = path.resolve(repoRoot);
  const excludedNames = readSimpleGitignoreNames(root);
  const paths: string[] = [];
  const truncated = await walkRepoFiles(root, '', excludedNames, paths);
  paths.sort((a, b) => a.localeCompare(b));
  return { paths, truncated };
}
