import { execFile } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type { PackageManagerType } from '../../types/pipeline';
import type { PathStateResult } from './openspec-engine';

const execFileAsync = promisify(execFile);

export interface ResolvedExecutable {
  name: string;
  executablePath: string;
  command: string;
  shell: boolean;
  displayPath: string;
}

export interface ResolvedPackageManager extends ResolvedExecutable {
  name: PackageManagerType;
}

export interface ResolveExecutableOptions {
  pathEnv?: string;
  platform?: NodeJS.Platform;
  exists?: (p: string) => boolean;
  isRegularFile?: (p: string) => boolean;
  isExecutable?: (p: string) => boolean;
  realpath?: (p: string) => string | null;
  probePathState?: (p: string) => PathStateResult;
}

export interface ResolvePackageManagerOptions extends ResolveExecutableOptions {
  repoPath?: string | null;
  preferredManager?: PackageManagerType;
  readFile?: (p: string) => string | null;
}

export interface RunPackageManagerOptions {
  cwd?: string;
  timeout?: number;
  maxBuffer?: number;
  env?: Record<string, string | undefined>;
}

function splitPathEnv(pathEnv: string | undefined, platform: NodeJS.Platform): string[] {
  if (typeof pathEnv !== 'string' || pathEnv.length === 0) return [];
  const separator = platform === 'win32' ? ';' : ':';
  return pathEnv.split(separator);
}

/**
 * Resuelve un ejecutable en el PATH del sistema aplicando la misma estrategia de contención
 * y canonicalización que `resolveOpenSpecExecutable` en `electron/pipeline/openspec-engine.ts`.
 *
 * - Resuelve en CADA uso y sin memorizar (cero caché).
 * - Distingue win32 con `path.win32` y excluye explícitamente `.ps1` en Windows.
 * - Canonicaliza mediante `realpathSync` (rechaza el candidato si no canonicaliza).
 * - Verifica que el resultado sea un archivo regular ejecutable tras resolver el symlink.
 */
export function resolveSystemExecutable(
  binaryName: string,
  options?: ResolveExecutableOptions,
): ResolvedExecutable | null {
  const platform = options?.platform ?? process.platform;
  const isWin = platform === 'win32';
  const pathMod = isWin ? path.win32 : path.posix;
  const exists = options?.exists ?? existsSync;

  const isRegularFile = options?.isRegularFile ?? ((p: string) => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  });

  const isExecutable = options?.isExecutable ?? ((p: string) => {
    if (isWin) return true;
    try {
      const st = statSync(p);
      return Boolean(st.mode & 0o111);
    } catch {
      return false;
    }
  });

  const realpath = options?.realpath ?? ((p: string) => {
    try {
      return realpathSync.native ? realpathSync.native(p) : realpathSync(p);
    } catch {
      return null;
    }
  });

  const extensions = isWin ? ['.cmd', '.exe', '.bat', ''] : [''];
  const dirs = splitPathEnv(options?.pathEnv ?? process.env.PATH ?? process.env.Path, platform);

  for (const dir of dirs) {
    if (!dir) continue;
    for (const ext of extensions) {
      const candidate = pathMod.join(dir, `${binaryName}${ext}`);
      if (!exists(candidate) || !isRegularFile(candidate) || !isExecutable(candidate)) continue;

      const canonical = realpath(candidate);
      if (!canonical) continue;

      if (!exists(canonical) || !isRegularFile(canonical) || !isExecutable(canonical)) continue;

      const command = isWin ? pathMod.basename(canonical) : binaryName;
      const shell = isWin && (canonical.toLowerCase().endsWith('.cmd') || canonical.toLowerCase().endsWith('.bat'));

      return {
        name: binaryName,
        executablePath: canonical,
        command,
        shell,
        displayPath: canonical,
      };
    }
  }

  return null;
}

/**
 * Detecta el gestor de paquetes de un repositorio a partir de sus archivos de bloqueo o package.json.
 * No presupone el gestor: lo resuelve examinando el árbol de trabajo.
 */
export function detectRepoPackageManager(
  repoPath: string,
  options?: { exists?: (p: string) => boolean; readFile?: (p: string) => string | null },
): PackageManagerType | null {
  const exists = options?.exists ?? existsSync;
  const read = options?.readFile ?? ((p: string) => {
    try {
      return readFileSync(p, 'utf8');
    } catch {
      return null;
    }
  });

  // 1. Detección por archivo de bloqueo (máxima fidelidad con el estado del proyecto)
  if (exists(path.join(repoPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (exists(path.join(repoPath, 'yarn.lock'))) return 'yarn';
  if (exists(path.join(repoPath, 'package-lock.json'))) return 'npm';
  if (exists(path.join(repoPath, 'bun.lockb')) || exists(path.join(repoPath, 'bun.lock'))) return 'bun';

  // 2. Detección por campo packageManager en package.json
  const pkgPath = path.join(repoPath, 'package.json');
  if (exists(pkgPath)) {
    try {
      const content = read(pkgPath);
      if (content) {
        const parsed = JSON.parse(content) as { packageManager?: unknown };
        if (typeof parsed.packageManager === 'string') {
          const pm = parsed.packageManager.toLowerCase();
          if (pm.startsWith('pnpm')) return 'pnpm';
          if (pm.startsWith('yarn')) return 'yarn';
          if (pm.startsWith('npm')) return 'npm';
          if (pm.startsWith('bun')) return 'bun';
        }
      }
    } catch {
      // Ignorar errores de parseo de JSON
    }
  }

  return null;
}

const SUPPORTED_PACKAGE_MANAGERS: PackageManagerType[] = ['pnpm', 'npm', 'yarn', 'bun'];

/**
 * Resuelve el gestor de paquetes del sistema para un repositorio o para uso global.
 * Si se pasa un `repoPath`, detecta el gestor correspondiente al proyecto (ej. pnpm para GitCron).
 * Si no se encuentra en el repo o es global, sondea los gestores disponibles en el sistema en orden de prioridad.
 */
export function resolvePackageManager(
  options?: ResolvePackageManagerOptions,
): ResolvedPackageManager | null {
  if (options?.preferredManager) {
    const res = resolveSystemExecutable(options.preferredManager, options);
    if (res) {
      return { ...res, name: options.preferredManager };
    }
    return null;
  }

  if (options?.repoPath) {
    const detected = detectRepoPackageManager(options.repoPath, {
      exists: options.exists,
      readFile: options.readFile,
    });
    if (detected) {
      const res = resolveSystemExecutable(detected, options);
      if (res) {
        return { ...res, name: detected };
      }
      // Si el repositorio exige un gestor específico (ej. pnpm) pero este no está en PATH,
      // no debemos hacer fallback a otro gestor que corrompa los lockfiles del proyecto.
      return null;
    }
  }

  // Sondeo global en orden de prioridad
  for (const pm of SUPPORTED_PACKAGE_MANAGERS) {
    const res = resolveSystemExecutable(pm, options);
    if (res) {
      return { ...res, name: pm };
    }
  }

  return null;
}

/**
 * Genera el argv exacto para cada modo (local o global) y gestor de paquetes.
 * Las opciones son no interactivas y agregan la dependencia a desarrollo en local.
 */
export function getPackageManagerInstallArgs(
  manager: PackageManagerType,
  mode: 'local' | 'global',
  targetPackage: string = '@fission-ai/openspec@latest',
): string[] {
  if (mode === 'local') {
    switch (manager) {
      case 'pnpm':
        return ['add', '-D', targetPackage];
      case 'npm':
        return ['install', '-D', targetPackage];
      case 'yarn':
        return ['add', '-D', targetPackage];
      case 'bun':
        return ['add', '-d', targetPackage];
    }
  } else {
    switch (manager) {
      case 'pnpm':
        return ['add', '-g', targetPackage];
      case 'npm':
        return ['install', '-g', targetPackage];
      case 'yarn':
        return ['global', 'add', targetPackage];
      case 'bun':
        return ['add', '-g', targetPackage];
    }
  }
}

/**
 * Ejecutor no interactivo para el gestor de paquetes resuelto.
 * Aplica contención de ejecución en Windows, límites de buffer y tope de tiempo.
 */
export async function runPackageManager(
  manager: ResolvedPackageManager,
  args: string[],
  options?: RunPackageManagerOptions,
): Promise<{ stdout: string; stderr: string }> {
  const fileToExec = manager.shell ? '"%PM_EXEC_TARGET%"' : manager.executablePath;

  const { stdout, stderr } = await execFileAsync(fileToExec, args, {
    cwd: options?.cwd,
    timeout: options?.timeout ?? 120_000,
    maxBuffer: options?.maxBuffer ?? 4 * 1024 * 1024,
    windowsHide: true,
    shell: manager.shell,
    env: {
      ...process.env,
      ...options?.env,
      PM_EXEC_TARGET: manager.executablePath,
      CI: '1',
      npm_config_yes: 'true',
      NO_COLOR: '1',
    },
  });

  return { stdout: stdout.toString(), stderr: stderr.toString() };
}
