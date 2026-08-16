import { execFile } from 'node:child_process';
import { existsSync, lstatSync, readFile as fsReadFile, statSync, realpathSync } from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type { OpenSpecCliDiscovery, OpenSpecCliProvenance } from '../../types/pipeline';
import {
  classifyOpenSpecVersion,
  parseSemver,
  SUPPORTED_OPENSPEC_VERSIONS,
} from '../../lib/openspec-version';
import { authorizedRepoStore } from '../ipc/authorized-repos';

const execFileAsync = promisify(execFile);
const readFileAsync = promisify(fsReadFile);

/**
 * Descriptor interno autorizado del ejecutable de OpenSpec resuelto por el main.
 *
 * `executablePath` es la ruta canónica absoluta exacta devuelta por realpath.
 * Nunca debe exponerse al renderer ni ser modificada desde IPC.
 */
export interface AuthorizedOpenSpecRuntime {
  /** Ruta canónica absoluta exacta del ejecutable. */
  executablePath: string;
  /** Comando o basename seguro. */
  command: string;
  /** `shell` que corresponde al comando (`true` para `.cmd`/`.bat` en Windows). */
  shell: boolean;
  /** Ruta efectiva informativa y de sólo lectura para exposición en UI/logs. */
  displayPath: string;
  /** Procedencia resuelta. */
  provenance: OpenSpecCliProvenance;
}

/** Alias de compatibilidad hacia atrás. */
export type ResolvedOpenSpecCli = AuthorizedOpenSpecRuntime;

export interface RunAuthorizedOpenSpecOptions {
  cwd?: string;
  timeout?: number;
  maxBuffer?: number;
  env?: Record<string, string | undefined>;
}

/**
 * Ejecutor central único para invocar el runtime autorizado de OpenSpec.
 *
 * Utiliza exclusivamente `runtime.executablePath` (nunca vuelve a buscar por `PATH`).
 * En Windows con shell: true (.cmd/.bat), se utiliza una variable de entorno dedicada
 * `OPENSPEC_EXEC_TARGET` enviando `fileToExec = '"%OPENSPEC_EXEC_TARGET%"'`.
 * Esto evita que `cmd.exe` realice expansión prematura de `%VARIABLE%`, divida la ruta
 * en espacios o interprete metacaracteres (`&`, `!`, `^`) al procesar la línea de comandos inicial.
 */
export async function runAuthorizedOpenSpec(
  runtime: AuthorizedOpenSpecRuntime,
  args: string[],
  options?: RunAuthorizedOpenSpecOptions,
): Promise<{ stdout: string; stderr: string }> {
  const fileToExec = runtime.shell
    ? '"%OPENSPEC_EXEC_TARGET%"'
    : runtime.executablePath;

  const { stdout, stderr } = await execFileAsync(fileToExec, args, {
    cwd: options?.cwd,
    timeout: options?.timeout ?? 15_000,
    maxBuffer: options?.maxBuffer ?? 4 * 1024 * 1024,
    windowsHide: true,
    shell: runtime.shell,
    env: {
      ...process.env,
      ...options?.env,
      OPENSPEC_EXEC_TARGET: runtime.executablePath,
      // Las variables de seguridad e inhabilitación de comprobaciones/telemetría
      // se colocan AL FINAL para que nunca puedan ser anuladas por options.env.
      OPENSPEC_NO_UPDATE_CHECK: '1',
      OPENSPEC_TELEMETRY_DISABLED: '1',
      DO_NOT_TRACK: '1',
      CHECKPOINT_DISABLE: '1',
      TELEMETRY_DISABLED: '1',
    },
  });
  return { stdout: stdout.toString(), stderr: stderr.toString() };
}

function splitPathEnv(pathEnv: string | undefined, platform: NodeJS.Platform): string[] {
  if (typeof pathEnv !== 'string' || pathEnv.length === 0) return [];
  const separator = platform === 'win32' ? ';' : ':';
  return pathEnv.split(separator);
}

export type PathStateResult = 'exists' | 'absent' | 'error';

/**
 * Función por defecto para sondear el estado de inspección de una ruta.
 * Utiliza lstatSync sin tragar errores de permisos ni I/O.
 * Sólo ENOENT y ENOTDIR se consideran 'absent'. Permisos (EACCES/EPERM),
 * argumentos inválidos (ERR_INVALID_ARG_VALUE) u otros errores de I/O
 * se consideran 'error'.
 */
export function defaultProbePathState(
  filePath: string,
  statFn?: (p: string) => unknown,
): PathStateResult {
  try {
    const fn = statFn ?? ((p: string) => lstatSync(p));
    const res = fn(filePath);
    if (res === null || res === undefined) {
      return 'absent';
    }
    return 'exists';
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return 'absent';
    }
    return 'error';
  }
}

/**
 * PRECEDENCIA DE RESOLUCIÓN DEL EJECUTABLE OPENSPEC:
 *
 * 1. Local al proyecto (`<repoPath>/node_modules/.bin/openspec`):
 *    El CLI local al repositorio tiene precedencia absoluta sobre el CLI global del sistema
 *    porque su versión está estrictamente fijada por el lockfile del proyecto
 *    (`package.json` / `pnpm-lock.yaml` / `package-lock.json`), garantizando reproducibilidad
 *    y evitando discrepancias entre entornos o versiones globales incompatibles.
 *
 * 2. Global del sistema (`PATH`):
 *    Si el repositorio no contiene una instalación local en `node_modules/.bin`,
 *    se recorre el `PATH` del sistema para ubicar una instalación global.
 *
 * 3. Procedencia `managed`:
 *    Se mantiene tipada y reconocida en el contrato para compatibilidad futura, pero
 *    se declara formalmente no disponible (sin runtime administrado activo).
 *
 * En Windows:
 * - Excluye `.ps1` (sólo admite `.cmd`, `.exe`, `.bat` y ejecutables binarios).
 * - Comprueba que el candidato sea un archivo regular (`statSync.isFile()`).
 * - Canonicaliza mediante `realpathSync`. Si falla, rechaza el candidato (sin fallback a path.resolve).
 * - Para candidatos locales, verifica estricta contención dentro del `repoPath` canónico.
 * En POSIX:
 * - Verifica además que el archivo tenga permisos de ejecución (bit 0o111).
 */
export function resolveOpenSpecExecutable(options?: {
  pathEnv?: string;
  platform?: NodeJS.Platform;
  userDataDir?: string | null;
  repoPath?: string | null;
  exists?: (p: string) => boolean;
  isRegularFile?: (p: string) => boolean;
  isExecutable?: (p: string) => boolean;
  realpath?: (p: string) => string | null;
  probePathState?: (p: string) => PathStateResult;
  isRepoAuthorized?: (p: string) => boolean;
}): AuthorizedOpenSpecRuntime | null {
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

  const isRepoAuthorized = options?.isRepoAuthorized ?? ((p: string) => authorizedRepoStore.isAuthorized(p));

  // En Windows se excluye explícitamente .ps1 ya que execFile sin wrapper seguro no lo ejecuta directamente.
  const extensions = isWin ? ['.cmd', '.exe', '.bat', ''] : [''];

  // =========================================================================
  // ESTRATEGIA 1: Búsqueda del ejecutable local al proyecto (precedencia alta)
  // =========================================================================
  if (options?.repoPath && typeof options.repoPath === 'string' && options.repoPath.trim()) {
    const rawRepo = options.repoPath.trim();
    // DEFENSA EN PROFUNDIDAD: El candidato local sólo se evalúa si el repositorio está autorizado.
    if (isRepoAuthorized(rawRepo)) {
      const canonicalRepo = realpath(rawRepo);

      if (canonicalRepo) {
        const localBinDir = pathMod.join(rawRepo, 'node_modules', '.bin');

        for (const ext of extensions) {
          const candidate = pathMod.join(localBinDir, `openspec${ext}`);
          if (!exists(candidate) || !isRegularFile(candidate) || !isExecutable(candidate)) continue;

          const canonicalCandidate = realpath(candidate);
          if (!canonicalCandidate) continue;

          // GUARDA DE SEGURIDAD: Contención estricta bajo repoPath canonicalizado.
          // Un symlink en node_modules/.bin que apunte fuera del repositorio se rechaza inmediatamente.
          const sep = isWin ? '\\' : '/';
          let normCandidate = pathMod.normalize(canonicalCandidate);
          let normRepo = pathMod.normalize(canonicalRepo);
          if (isWin) {
            normCandidate = normCandidate.toLowerCase();
            normRepo = normRepo.toLowerCase();
          }
          normRepo = normRepo.replace(/[/\\]+$/, '');
          const isContained = normCandidate === normRepo || normCandidate.startsWith(normRepo + sep);
          if (!isContained) {
            continue;
          }

          const command = isWin ? pathMod.basename(canonicalCandidate) : 'openspec';
          const shell = isWin && (canonicalCandidate.toLowerCase().endsWith('.cmd') || canonicalCandidate.toLowerCase().endsWith('.bat'));

          const provenance = classifyOpenSpecProvenance(canonicalCandidate, {
            userDataDir: options?.userDataDir ?? null,
            repoPath: options?.repoPath ?? null,
            platform,
            realpath: options?.realpath,
            probePathState: options?.probePathState,
          });

          return {
            executablePath: canonicalCandidate,
            command,
            shell,
            displayPath: canonicalCandidate,
            provenance,
          };
        }
      }
    }
  }

  // =========================================================================
  // ESTRATEGIA 2: Recorrido del PATH del sistema (fallback global)
  // =========================================================================
  const dirs = splitPathEnv(options?.pathEnv ?? process.env.PATH ?? process.env.Path, platform);

  for (const dir of dirs) {
    if (!dir) continue;
    for (const ext of extensions) {
      const candidate = pathMod.join(dir, `openspec${ext}`);
      if (!exists(candidate) || !isRegularFile(candidate) || !isExecutable(candidate)) continue;

      const canonical = realpath(candidate);
      if (!canonical) continue;

      const command = isWin ? pathMod.basename(canonical) : 'openspec';
      const shell = isWin && (canonical.toLowerCase().endsWith('.cmd') || canonical.toLowerCase().endsWith('.bat'));

      const provenance = classifyOpenSpecProvenance(canonical, {
        userDataDir: options?.userDataDir ?? null,
        repoPath: options?.repoPath ?? null,
        platform,
        realpath: options?.realpath,
        probePathState: options?.probePathState,
      });

      return {
        executablePath: canonical,
        command,
        shell,
        displayPath: canonical,
        provenance,
      };
    }
  }
  return null;
}

export interface ClassifyOpenSpecProvenanceRefs {
  userDataDir?: string | null;
  repoPath?: string | null;
  platform?: NodeJS.Platform;
  realpath?: (p: string) => string | null;
  probePathState?: (p: string) => PathStateResult;
}

/**
 * Clasifica la procedencia de la ruta efectiva comparando target canónico contra raíces canónicas.
 *
 * `managed`: exige contención estricta bajo `<userData>/openspec-runtimes/` (canonicalizado).
 * `local`: exige contención estricta bajo `repoPath` (canonicalizado).
 * `unknown`: target no canonicalizable o error de permisos/I/O en alguna raíz sin coincidencia positiva.
 * `global`: target y todas las raíces aplicables fueron inspeccionados y descartados (o confirmados ausentes).
 * Sensibilidad a mayúsculas: case-insensitive sólo en Windows.
 */
export function classifyOpenSpecProvenance(
  displayPath: string | null,
  refs: ClassifyOpenSpecProvenanceRefs,
): OpenSpecCliProvenance {
  if (!displayPath) return 'unknown';
  const platform = refs.platform ?? process.platform;
  const isWin = platform === 'win32';
  const pathMod = isWin ? path.win32 : path.posix;

  const realpath = refs.realpath ?? ((p: string) => {
    try {
      return realpathSync.native ? realpathSync.native(p) : realpathSync(p);
    } catch {
      return null;
    }
  });

  const probe = refs.probePathState ?? defaultProbePathState;

  const resolveRoot = (p: string) => {
    let state: PathStateResult;
    try {
      state = probe(p);
    } catch {
      state = 'error';
    }

    if (state === 'absent') {
      return { state: 'absent' as const, canonical: null };
    }
    if (state === 'error') {
      return { state: 'error' as const, canonical: null };
    }

    let canonical: string | null = null;
    try {
      canonical = realpath(p);
    } catch {
      canonical = null;
    }

    if (!canonical) {
      return { state: 'error' as const, canonical: null };
    }

    let s = pathMod.normalize(canonical);
    if (isWin) s = s.toLowerCase();
    return { state: 'exists' as const, canonical: s.replace(/[/\\]+$/, '') };
  };

  const targetRes = resolveRoot(displayPath);
  if (targetRes.state !== 'exists' || !targetRes.canonical) {
    return 'unknown';
  }
  const target = targetRes.canonical;

  let hadRootError = false;

  if (refs.userDataDir) {
    const managedPath = pathMod.join(refs.userDataDir, 'openspec-runtimes');
    const managedRes = resolveRoot(managedPath);
    if (managedRes.state === 'exists' && managedRes.canonical) {
      const sep = isWin ? '\\' : '/';
      if (target === managedRes.canonical || target.startsWith(managedRes.canonical + sep)) {
        return 'managed';
      }
    } else if (managedRes.state === 'error') {
      hadRootError = true;
    }
  }

  if (refs.repoPath) {
    const repoRes = resolveRoot(refs.repoPath);
    if (repoRes.state === 'exists' && repoRes.canonical) {
      const sep = isWin ? '\\' : '/';
      if (target === repoRes.canonical || target.startsWith(repoRes.canonical + sep)) {
        return 'local';
      }
    } else if (repoRes.state === 'error') {
      hadRootError = true;
    }
  }

  if (hadRootError) {
    return 'unknown';
  }

  return 'global';
}

/** Extrae `MAJOR.MINOR.PATCH` de la salida de `openspec --version` rechazando basura pegada. */
export function parseOpenSpecVersionOutput(stdout: string): string | null {
  if (typeof stdout !== 'string') return null;
  const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const match = /^(?:openspec\s+)?v?(\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?)$/i.exec(line);
    if (match) {
      const ver = match[1];
      if (parseSemver(ver)) {
        return ver;
      }
    }
  }
  return null;
}

export interface DiscoverOpenSpecCliOptions {
  runtime?: AuthorizedOpenSpecRuntime | null;
  userDataDir?: string | null;
  repoPath?: string | null;
  /** Runner inyectable para tests. */
  runVersion?: (runtime: AuthorizedOpenSpecRuntime) => Promise<{ stdout: string; stderr: string }>;
  /** Resolvedor inyectable para tests. */
  resolve?: () => AuthorizedOpenSpecRuntime | null;
  /** Realpath inyectable para tests. */
  realpath?: (p: string) => string | null;
  /** Sonda de inspección de estado de ruta inyectable para tests. */
  probePathState?: (p: string) => PathStateResult;
  /** PATH controlado para tests. */
  pathEnv?: string;
}

/**
 * Descubre el CLI de OpenSpec usando el ejecutor central.
 */
export async function discoverOpenSpecCli(
  options: DiscoverOpenSpecCliOptions = {},
): Promise<OpenSpecCliDiscovery> {
  const diagnostics: string[] = [];
  const resolved = options.runtime !== undefined
    ? options.runtime
    : (options.resolve
        ? options.resolve()
        : resolveOpenSpecExecutable({
            pathEnv: options.pathEnv,
            userDataDir: options.userDataDir,
            repoPath: options.repoPath,
            realpath: options.realpath,
            probePathState: options.probePathState,
          }));

  if (!resolved) {
    diagnostics.push('openspec not found in PATH');
    return {
      installed: false,
      runtimeVersion: null,
      provenance: 'unknown',
      displayPath: null,
      supportedRange: SUPPORTED_OPENSPEC_VERSIONS,
      versionClass: 'unknown',
      evidenceStatus: 'unknown',
      diagnostics,
    };
  }

  let runtimeVersion: string | null = null;
  let evidenceStatus: 'confirmed' | 'inferred' | 'unknown' = 'unknown';
  try {
    const { stdout } = options.runVersion
      ? await options.runVersion(resolved)
      : await runAuthorizedOpenSpec(resolved, ['--version'], { timeout: 10_000 });
    runtimeVersion = parseOpenSpecVersionOutput(stdout);
    evidenceStatus = runtimeVersion ? 'confirmed' : 'unknown';
    if (!runtimeVersion) diagnostics.push('version output not recognized');
  } catch (error) {
    const detail = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
    const reason = [detail.stderr, detail.stdout, detail.message]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .find((part) => part.length > 0);
    diagnostics.push(reason ? reason.slice(0, 4000) : 'openspec --version failed');
  }

  return {
    installed: true,
    runtimeVersion,
    provenance: resolved.provenance,
    displayPath: resolved.displayPath,
    supportedRange: SUPPORTED_OPENSPEC_VERSIONS,
    versionClass: classifyOpenSpecVersion(runtimeVersion, SUPPORTED_OPENSPEC_VERSIONS),
    evidenceStatus,
    diagnostics,
  };
}

/** Evidencia de metadata de un change leída de su .openspec.yaml de forma minimizada. */
export interface OpenSpecChangeMetadata {
  schemaName: string | null;
  skipSpecs: boolean | null;
}

const VALID_SCHEMA_NAME_PATTERN = /^(?=[a-z0-9])(?!.*--)(?=.{1,200}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Lector minimizado y contenido de metadata de un change (`.openspec.yaml`).
 * No utiliza librerías externas (como `yaml`). Realiza un parseo simple línea por línea.
 */
export async function readOpenSpecChangeMetadata(
  repoPath: string,
  changeId: string,
  readFile?: (filePath: string) => Promise<string>,
): Promise<OpenSpecChangeMetadata> {
  const metadataPath = path.join(repoPath, 'openspec', 'changes', changeId, '.openspec.yaml');
  const read = readFile ?? ((p: string) => readFileAsync(p, 'utf8'));

  try {
    const content = await read(metadataPath);
    if (typeof content !== 'string') {
      return { schemaName: null, skipSpecs: null };
    }

    const lines = content.split(/\r?\n/);

    let foundSchema: string | null = null;
    let schemaCount = 0;

    let foundSkipSpecs: boolean | null = null;
    let skipSpecsCount = 0;

    let isInvalid = false;

    for (const rawLine of lines) {
      const commentIndex = rawLine.indexOf('#');
      const lineWithoutComment = commentIndex >= 0 ? rawLine.slice(0, commentIndex) : rawLine;

      if (!lineWithoutComment.trim()) continue;

      // Las claves top-level no pueden tener sangría (espacios/tabuladores iniciales)
      const hasLeadingWhitespace = /^\s+/.test(lineWithoutComment);
      if (hasLeadingWhitespace) {
        continue;
      }

      const match = /^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/.exec(lineWithoutComment.trim());
      if (!match) {
        isInvalid = true;
        break;
      }

      const key = match[1];
      const rawVal = match[2].trim();

      if (key === 'schema') {
        schemaCount++;
        let val = rawVal;
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1).trim();
        }
        if (!VALID_SCHEMA_NAME_PATTERN.test(val)) {
          isInvalid = true;
          break;
        }
        foundSchema = val;
      } else if (key === 'skip_specs' || key === 'skipSpecs') {
        skipSpecsCount++;
        const lower = rawVal.toLowerCase();
        if (lower === 'true') {
          foundSkipSpecs = true;
        } else if (lower === 'false') {
          foundSkipSpecs = false;
        } else {
          isInvalid = true;
          break;
        }
      }
    }

    if (isInvalid || schemaCount > 1 || skipSpecsCount > 1) {
      return { schemaName: null, skipSpecs: null };
    }

    if (!foundSchema) {
      return { schemaName: null, skipSpecs: null };
    }

    const finalSkipSpecs = foundSkipSpecs !== null ? foundSkipSpecs : false;

    return { schemaName: foundSchema, skipSpecs: finalSkipSpecs };
  } catch {
    return { schemaName: null, skipSpecs: null };
  }
}
