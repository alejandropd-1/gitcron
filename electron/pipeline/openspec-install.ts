import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import type {
  OpenSpecEngineStatus,
  OpenSpecInstallResult,
  PackageManagerType,
} from '../../types/pipeline';
import {
  getPackageManagerInstallArgs,
  resolvePackageManager,
  resolveSystemExecutable,
  runPackageManager,
  type ResolvedExecutable,
  type ResolvedPackageManager,
  type ResolvePackageManagerOptions,
  type RunPackageManagerOptions,
} from './package-manager';
import { withRepoWatcherPaused } from '../ipc/watchers';
import type { OpenSpecIpcDeps } from '../ipc/pipeline-openspec';

/**
 * Patrón estricto para versiones semánticas y etiquetas de distribución de npm.
 * Excluye cualquier metacarácter de shell (&, |, ;, `, $, <, >, ^, comillas, espacios, etc.)
 * protegiendo la invocación bajo cmd.exe en Windows.
 */
export const NPM_TARGET_VERSION_REGEX =
  /^(?:latest|next|beta|alpha|canary|rc|dev|nightly|v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/i;

/**
 * Valida si un valor es una versión semántica o etiqueta de npm segura para instalar.
 */
export function isValidTargetVersion(version: unknown): boolean {
  if (typeof version !== 'string') return false;
  const trimmed = version.trim();
  return trimmed.length > 0 && NPM_TARGET_VERSION_REGEX.test(trimmed);
}

/**
 * Extrae y valida la versión de una especificación de paquete (ej. @fission-ai/openspec@1.11.0).
 */
export function isValidTargetPackageSpec(pkg: string): boolean {
  const atIdx = pkg.lastIndexOf('@');
  if (atIdx <= 0) return isValidTargetVersion(pkg);
  const version = pkg.slice(atIdx + 1);
  return isValidTargetVersion(version);
}

export interface InstallOpenSpecOptions extends ResolvePackageManagerOptions {
  targetPackage?: string;
  timeout?: number;
  git?: SimpleGit;
  runPackageManager?: (
    manager: ResolvedPackageManager,
    args: string[],
    options?: RunPackageManagerOptions,
  ) => Promise<{ stdout: string; stderr: string }>;
  resolvePackageManager?: (options?: ResolvePackageManagerOptions) => ResolvedPackageManager | null;
  resolveNode?: (binaryName: string, options?: ResolvePackageManagerOptions) => ResolvedExecutable | null;
  pauseWatcher?: typeof withRepoWatcherPaused;
  recalculateStatus?: (repoPath?: string) => Promise<OpenSpecEngineStatus>;
  engineDeps?: OpenSpecIpcDeps;
}

/**
 * Recalcula el estado del motor leyendo del disco tras la instalación.
 * Nunca asume que quedó instalada la versión pedida porque el comando devolvió cero.
 */
async function recalculateEngineStatusFromDisk(
  repoPath?: string,
  options?: InstallOpenSpecOptions,
): Promise<OpenSpecEngineStatus | null> {
  if (options?.recalculateStatus) {
    try {
      return await options.recalculateStatus(repoPath);
    } catch {
      return null;
    }
  }

  try {
    const { buildEngineStatusSnapshot } = await import('../ipc/pipeline-openspec');
    return await buildEngineStatusSnapshot(repoPath, options?.engineDeps);
  } catch {
    return null;
  }
}

/**
 * Tarea 6.2: Ejecución de la instalación local al repositorio.
 *
 * - No interactiva, con tope de tiempo y salida capturada.
 * - Comprueba la presencia del manifiesto package.json antes de intentar resolver.
 * - Pausa el vigilante del repositorio durante la ejecución para evitar saturación de I/O.
 * - Deja manifiesto y archivo de bloqueo modificados SIN confirmar en Git.
 * - Devuelve la lista exacta de archivos tocados.
 * - Tarea 6.4: Al terminar, recalcula el estado del motor leyendo del disco.
 */
export async function installOpenSpecLocal(
  repoPath: string,
  options?: InstallOpenSpecOptions,
): Promise<OpenSpecInstallResult> {
  const exists = options?.exists ?? existsSync;

  // 1. Verificación previa de manifiesto (Scenario: El repositorio no tiene manifiesto)
  const manifestPath = path.join(repoPath, 'package.json');
  if (!exists(manifestPath)) {
    const engineStatus = await recalculateEngineStatusFromDisk(repoPath, options);
    return {
      success: false,
      mode: 'local',
      code: 'no-manifest',
      commandExecuted: '',
      nodePath: null,
      filesUpdated: [],
      stdout: '',
      stderr: '',
      error: 'El repositorio no cuenta con un archivo package.json para instalación local',
      engineStatus,
    };
  }

  // 2. Resolución del gestor de paquetes del sistema para el repositorio
  const pmResolver = options?.resolvePackageManager ?? resolvePackageManager;
  const pm = pmResolver({ repoPath, ...options });

  if (!pm) {
    const engineStatus = await recalculateEngineStatusFromDisk(repoPath, options);
    return {
      success: false,
      mode: 'local',
      code: 'package-manager-not-found',
      commandExecuted: '',
      nodePath: null,
      filesUpdated: [],
      stdout: '',
      stderr: '',
      error: 'No se encontró un gestor de paquetes compatible en el sistema',
      engineStatus,
    };
  }

  // 3. Resolución informativa del ejecutable de Node en el sistema
  const nodeResolver = options?.resolveNode ?? resolveSystemExecutable;
  const nodeExe = nodeResolver('node', options);
  const nodePath = nodeExe?.executablePath ?? null;

  // 4. Preparación del comando exacto y no interactivo
  const targetPackage = options?.targetPackage ?? '@fission-ai/openspec@latest';
  if (!isValidTargetPackageSpec(targetPackage)) {
    const engineStatus = await recalculateEngineStatusFromDisk(repoPath, options);
    return {
      success: false,
      mode: 'local',
      code: 'invalid-target-version',
      commandExecuted: '',
      nodePath,
      filesUpdated: [],
      stdout: '',
      stderr: '',
      error: `Versión o especificación de paquete inválida: "${targetPackage}"`,
      engineStatus,
    };
  }

  const args = getPackageManagerInstallArgs(pm.name, 'local', targetPackage);
  const commandExecuted = `${pm.name} ${args.join(' ')}`;

  // 5. Captura del estado del working tree de Git antes de ejecutar
  const git = options?.git ?? simpleGit(repoPath);
  const initialModifiedFiles = new Set<string>();
  try {
    const initialStatus = await git.status();
    for (const f of initialStatus.files) {
      initialModifiedFiles.add(f.path);
    }
  } catch {
    // Si falla la consulta inicial de git, se continúa
  }

  // 6. Ejecución no interactiva bajo pausa del vigilante del repositorio
  const pauseWatcher = options?.pauseWatcher ?? withRepoWatcherPaused;
  const runner = options?.runPackageManager ?? runPackageManager;
  let stdout = '';
  let stderr = '';
  let execError: unknown = null;

  try {
    const res = await pauseWatcher(repoPath, async () => {
      return runner(pm, args, {
        cwd: repoPath,
        timeout: options?.timeout ?? 120_000,
      });
    });
    stdout = res.stdout;
    stderr = res.stderr;
  } catch (err: unknown) {
    execError = err;
    const detail = err as { stdout?: unknown; stderr?: unknown; message?: unknown };
    stdout = typeof detail.stdout === 'string' ? detail.stdout : (detail.stdout ? String(detail.stdout) : '');
    stderr = typeof detail.stderr === 'string' ? detail.stderr : (detail.stderr ? String(detail.stderr) : String(detail.message || ''));
  }

  // 7. Detección de archivos tocados en Git sin confirmar
  const filesUpdated: string[] = [];
  try {
    const currentStatus = await git.status();
    for (const f of currentStatus.files) {
      // Registrar sólo los archivos modificados o no rastreados resultantes de la instalación,
      // excluyendo aquellos que ya estaban modificados antes de iniciar la operación.
      if (!initialModifiedFiles.has(f.path)) {
        filesUpdated.push(f.path);
      }
    }
  } catch {
    // Si git status falla, registrar al menos los manifiestos esperados si existen
    if (exists(manifestPath) && !initialModifiedFiles.has('package.json')) {
      filesUpdated.push('package.json');
    }
  }

  // 8. Tarea 6.4: Recalcular estado del motor leyendo del disco
  const engineStatus = await recalculateEngineStatusFromDisk(repoPath, options);

  if (execError) {
    const errCode = (execError as { code?: string })?.code;
    const isPerm = errCode === 'EACCES' || errCode === 'EPERM' || /permission/i.test(stderr);
    return {
      success: false,
      mode: 'local',
      code: isPerm ? 'permission-denied' : 'install-failed',
      commandExecuted,
      packageManager: pm.name,
      packageManagerPath: pm.executablePath,
      nodePath,
      filesUpdated,
      stdout,
      stderr,
      error: stderr || (execError as Error).message || 'Error durante la instalación local',
      engineStatus,
    };
  }

  return {
    success: true,
    mode: 'local',
    commandExecuted,
    packageManager: pm.name,
    packageManagerPath: pm.executablePath,
    nodePath,
    filesUpdated,
    stdout,
    stderr,
    engineStatus,
  };
}

/**
 * Tarea 6.3: Ejecución de la instalación global.
 *
 * - No interactiva, con tope de tiempo y salida capturada.
 * - Devuelve el comando ejecutado y las rutas resueltas (gestor y Node) para el renderer.
 * - Tarea 6.4: Al terminar, recalcula el estado del motor leyendo del disco.
 */
export async function installOpenSpecGlobal(
  options?: InstallOpenSpecOptions,
): Promise<OpenSpecInstallResult> {
  const pmResolver = options?.resolvePackageManager ?? resolvePackageManager;
  const pm = pmResolver(options);

  if (!pm) {
    const engineStatus = await recalculateEngineStatusFromDisk(options?.repoPath ?? undefined, options);
    return {
      success: false,
      mode: 'global',
      code: 'package-manager-not-found',
      commandExecuted: '',
      nodePath: null,
      stdout: '',
      stderr: '',
      error: 'No se encontró un gestor de paquetes compatible en el sistema',
      engineStatus,
    };
  }

  // Resolución de rutas para exposición fidedigna en renderer
  const nodeResolver = options?.resolveNode ?? resolveSystemExecutable;
  const nodeExe = nodeResolver('node', options);
  const nodePath = nodeExe?.executablePath ?? null;

  const targetPackage = options?.targetPackage ?? '@fission-ai/openspec@latest';
  if (!isValidTargetPackageSpec(targetPackage)) {
    const engineStatus = await recalculateEngineStatusFromDisk(options?.repoPath ?? undefined, options);
    return {
      success: false,
      mode: 'global',
      code: 'invalid-target-version',
      commandExecuted: '',
      nodePath,
      stdout: '',
      stderr: '',
      error: `Versión o especificación de paquete inválida: "${targetPackage}"`,
      engineStatus,
    };
  }

  const args = getPackageManagerInstallArgs(pm.name, 'global', targetPackage);
  const commandExecuted = `${pm.name} ${args.join(' ')}`;

  const runner = options?.runPackageManager ?? runPackageManager;
  let stdout = '';
  let stderr = '';
  let execError: unknown = null;

  try {
    const res = await runner(pm, args, {
      timeout: options?.timeout ?? 120_000,
    });
    stdout = res.stdout;
    stderr = res.stderr;
  } catch (err: unknown) {
    execError = err;
    const detail = err as { stdout?: unknown; stderr?: unknown; message?: unknown };
    stdout = typeof detail.stdout === 'string' ? detail.stdout : (detail.stdout ? String(detail.stdout) : '');
    stderr = typeof detail.stderr === 'string' ? detail.stderr : (detail.stderr ? String(detail.stderr) : String(detail.message || ''));
  }

  // Tarea 6.4: Recalcular estado del motor leyendo del disco
  const engineStatus = await recalculateEngineStatusFromDisk(options?.repoPath ?? undefined, options);

  if (execError) {
    const errCode = (execError as { code?: string })?.code;
    const isPerm = errCode === 'EACCES' || errCode === 'EPERM' || /permission/i.test(stderr);
    return {
      success: false,
      mode: 'global',
      code: isPerm ? 'permission-denied' : 'install-failed',
      commandExecuted,
      packageManager: pm.name,
      packageManagerPath: pm.executablePath,
      nodePath,
      stdout,
      stderr,
      error: stderr || (execError as Error).message || 'Error durante la instalación global',
      engineStatus,
    };
  }

  return {
    success: true,
    mode: 'global',
    commandExecuted,
    packageManager: pm.name,
    packageManagerPath: pm.executablePath,
    nodePath,
    stdout,
    stderr,
    engineStatus,
  };
}
