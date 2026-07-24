import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PipelineDiagnostic } from '../../types/pipeline';

export type SafeReadResult = {
  status: 'ok' | 'missing' | 'unstable' | 'rejected' | 'too-large';
  content: string | null;
  sourceRef: string;
  diagnostics: PipelineDiagnostic[];
  generation?: string | null;
};

export interface SafeReadFileSystem {
  stat: typeof fs.stat;
  readFile: typeof fs.readFile;
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function diagnostic(sourceRef: string, code: string, message: string, severity: 'warning' | 'error' = 'warning'): PipelineDiagnostic {
  return { code, message, severity, sourceRef };
}

export async function resolveContainedRepoPath(repoPath: string, relativePath: string): Promise<string> {
  if (!relativePath || path.isAbsolute(relativePath)) throw new Error('pipeline.path.absolute');
  const realRoot = await fs.realpath(repoPath);
  const lexical = path.resolve(realRoot, relativePath);
  if (!inside(realRoot, lexical)) throw new Error('pipeline.path.escape');
  const realCandidate = await fs.realpath(lexical);
  if (!inside(realRoot, realCandidate)) throw new Error('pipeline.path.symlink-escape');
  return realCandidate;
}

export async function safeListRepoDirectory(repoPath: string, relativePath: string): Promise<string[]> {
  try {
    const directory = await resolveContainedRepoPath(repoPath, relativePath);
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory() || entry.isFile()).map((entry) => entry.name).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw error;
  }
}

export async function safeReadRepoFile(
  repoPath: string,
  relativePath: string,
  options: { maxBytes?: number; retries?: number } = {},
  io: SafeReadFileSystem = fs,
): Promise<SafeReadResult> {
  const sourceRef = relativePath.replaceAll('\\', '/');
  let candidate: string;
  try {
    candidate = await resolveContainedRepoPath(repoPath, relativePath);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'pipeline.path.rejected';
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return { status: 'missing', content: null, sourceRef, diagnostics: [diagnostic(sourceRef, 'file.missing', 'La fuente no existe.')] };
    }
    return { status: 'rejected', content: null, sourceRef, diagnostics: [diagnostic(sourceRef, code, 'La ruta fue rechazada por contención.', 'error')] };
  }

  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const retries = options.retries ?? 1;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const before = await io.stat(candidate);
      if (!before.isFile()) return { status: 'rejected', content: null, sourceRef, diagnostics: [diagnostic(sourceRef, 'file.not-regular', 'La fuente no es un archivo regular.', 'error')] };
      if (before.size > maxBytes) return { status: 'too-large', content: null, sourceRef, diagnostics: [diagnostic(sourceRef, 'file.too-large', 'La fuente supera el límite de lectura.')] };
      const content = await io.readFile(candidate, 'utf8');
      const after = await io.stat(candidate);
      if (before.size === after.size && before.mtimeMs === after.mtimeMs) {
        return { status: 'ok', content, sourceRef, diagnostics: [], generation: `${before.dev}:${before.ino}:${before.birthtimeMs}` };
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return { status: 'missing', content: null, sourceRef, diagnostics: [diagnostic(sourceRef, 'file.disappeared', 'La fuente desapareció durante la lectura.')] };
      }
      return { status: 'rejected', content: null, sourceRef, diagnostics: [diagnostic(sourceRef, 'file.read-failed', 'La fuente no pudo leerse.', 'error')] };
    }
  }
  return { status: 'unstable', content: null, sourceRef, diagnostics: [diagnostic(sourceRef, 'file.unstable', 'La fuente cambió durante la lectura.')] };
}
