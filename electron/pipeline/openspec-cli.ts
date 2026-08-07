import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { OpenSpecArtifactState, OpenSpecArtifactStatus, OpenSpecChangeStatus, OpenSpecValidationStatus } from '../../types/pipeline';

const execFileAsync = promisify(execFile);

/**
 * Invocación del CLI de OpenSpec, resuelta por plataforma y en un solo lugar.
 *
 * En Windows el CLI se instala como `openspec.CMD`. `execFile` no lo resuelve
 * por nombre pelado (ENOENT) y nombrarlo con extensión tampoco alcanza: Node
 * rechaza `.cmd`/`.bat` con EINVAL desde la mitigación de CVE-2024-27980. No
 * existe forma de ejecutar un `.cmd` sin shell.
 *
 * Habilitarlo es seguro **acá y sólo acá**: los argumentos son literales fijos y
 * el único valor variable, `changeId`, está validado contra `CHANGE_ID_PATTERN`
 * antes de llegar al proceso, así que no puede contener separadores de comando,
 * comillas ni espacios. Si alguna vez hiciera falta pasar un argumento libre,
 * esta decisión deja de ser válida y hay que volver a resolverlo.
 *
 * Esto existía duplicado en tres lugares y en los tres estaba roto en Windows.
 * Vive acá para que el arreglo no vuelva a quedar a medias.
 */
const CLI = process.platform === 'win32'
  ? { command: 'openspec.cmd', shell: true }
  : { command: 'openspec', shell: false };

/** Mismo contrato que acepta `openspec new change`. */
export const CHANGE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Alfabeto de una herramienta de OpenSpec.
 *
 * Existe por la misma razón que `CHANGE_ID_PATTERN`: en Windows el CLI corre con
 * `shell: true`, así que un argumento libre podría llevar separadores de comando.
 * Con esto, el único valor variable que se le pasa a `init` queda acotado a
 * letras, dígitos y guiones.
 */
export const TOOL_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

export interface InitOpenSpecResult {
  ok: boolean;
  /** Motivo real informado por el CLI. `null` sólo cuando inicializó bien. */
  error: string | null;
  /** El CLI no encontró ninguna herramienta y hay que elegir una. */
  needsTool: boolean;
}

/**
 * Inicializa OpenSpec en un repositorio.
 *
 * Sin `tools`, el CLI **detecta** las herramientas presentes por sus directorios
 * y configura todas: está comprobado que con `.codex`, `.agent` y `.claude` en el
 * mismo repositorio configuró las tres. Por eso el panel no replica la lista de
 * treinta herramientas: sólo hace falta elegir cuando no hay ninguna que
 * detectar, y ese caso se distingue acá con `needsTool`.
 *
 * Es incremental y no destructivo: en un repositorio ya inicializado agrega la
 * herramienta que falte, y **no pisa** `openspec/config.yaml` —comprobado por
 * hash sobre un repositorio real—.
 */
export async function initOpenSpecWithCli(
  repoPath: string,
  tools?: string[],
): Promise<InitOpenSpecResult> {
  const requested = tools?.filter((tool) => TOOL_ID_PATTERN.test(tool)) ?? [];
  if (tools && requested.length !== tools.length) {
    return { ok: false, error: 'invalid-tool-id', needsTool: false };
  }
  try {
    await execFileAsync(
      CLI.command,
      requested.length > 0 ? ['init', '--tools', requested.join(',')] : ['init'],
      {
        cwd: repoPath,
        timeout: 120_000,
        windowsHide: true,
        shell: CLI.shell,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, OPENSPEC_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' },
      },
    );
    return { ok: true, error: null, needsTool: false };
  } catch (error) {
    const detail = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
    const reason = [detail.stderr, detail.stdout, detail.message]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .find((part) => part.length > 0) ?? 'unknown';
    // «No tools detected» no es un fallo del comando: es que hay que elegir. Se
    // distingue para que el panel pueda pedirlo en vez de mostrar un error.
    return { ok: false, error: reason, needsTool: /no tools detected/i.test(reason) };
  }
}

/**
 * Valida un change con `--strict`.
 *
 * `failed` sólo se afirma cuando el CLI corrió y salió con código numérico. Si
 * no se lo pudo ejecutar, la respuesta es `unknown`: no saber si un cambio es
 * válido no es lo mismo que saber que no lo es.
 */
export interface ArchiveOpenSpecChangeResult {
  ok: boolean;
  /** Motivo real informado por el CLI. `null` sólo cuando archivó bien. */
  error: string | null;
}

/**
 * Archiva un change invocando el CLI, desde el proceso principal.
 *
 * No pasa por una sesión de runtime a propósito. Delegarlo en un agente agrega
 * un intermediario que puede no tener el comando —Claude Code lee sus slash
 * commands de `.claude/commands/`, donde `opsx` no existe— o no tener shell para
 * correr `openspec archive`, y devolver éxito sin haber hecho nada. Eso es
 * exactamente lo que pasaba: la sesión cerraba en 7 ms con
 * `"Unknown command: /opsx:archive"` e `is_error: false`.
 *
 * Archivar es determinístico y acotado; no necesita un modelo que lo decida.
 *
 * Vale acá la misma nota de seguridad que en `validateOpenSpecChangeWithCli`:
 * los argumentos son literales fijos y `changeId` está validado contra
 * `CHANGE_ID_PATTERN` antes de llegar al proceso, así que no puede contener
 * separadores de comando, comillas ni espacios.
 */
export async function archiveOpenSpecChangeWithCli(
  repoPath: string,
  changeId: string,
): Promise<ArchiveOpenSpecChangeResult> {
  if (!CHANGE_ID_PATTERN.test(changeId)) return { ok: false, error: 'invalid-change-id' };
  try {
    await execFileAsync(CLI.command, ['archive', changeId, '--yes'], {
      cwd: repoPath,
      timeout: 120_000,
      windowsHide: true,
      shell: CLI.shell,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, OPENSPEC_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' },
    });
    return { ok: true, error: null };
  } catch (error) {
    // El motivo real del CLI vale más que un mensaje propio: los fallos típicos
    // —un `MODIFIED` cuyo header no existe en la spec consolidada— sólo se
    // entienden leyendo lo que el CLI tiene para decir.
    const detail = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
    const reason = [detail.stderr, detail.stdout, detail.message]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .find((value) => value.length > 0) ?? 'archive-failed';
    return { ok: false, error: reason.slice(0, 4000) };
  }
}

export async function validateOpenSpecChangeWithCli(
  repoPath: string,
  changeId: string,
): Promise<OpenSpecValidationStatus> {
  if (!CHANGE_ID_PATTERN.test(changeId)) return 'unknown';
  try {
    await execFileAsync(CLI.command, ['validate', changeId, '--strict', '--no-interactive'], {
      cwd: repoPath,
      timeout: 15_000,
      windowsHide: true,
      shell: CLI.shell,
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, OPENSPEC_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' },
    });
    return 'passed';
  } catch (error) {
    return typeof (error as { code?: unknown })?.code === 'number' ? 'failed' : 'unknown';
  }
}

/**
 * Forma cruda del JSON que devuelve `openspec status --json`. Se mapea a los
 * tipos propios antes de salir del wrapper, para no filtrar la forma del CLI
 * al resto del código.
 */
interface OpenSpecStatusCliArtifact {
  id?: unknown;
  status?: unknown;
  missingDeps?: unknown;
}
interface OpenSpecStatusCliOutput {
  artifacts?: unknown;
  applyRequires?: unknown;
  isComplete?: unknown;
}

const ARTIFACT_STATES: ReadonlySet<string> = new Set(['blocked', 'ready', 'done']);

/**
 * Mapea el `status` del CLI al `state` del tipo propio, tolerando lo que no
 * encaja. Un artefacto sin `id` o con un `status` desconocido se descarta en
 * vez de romper todo el grafo: una versión futura del CLI podría sumar estados,
 * y un crash acá dejaría al panel sin snapshot.
 */
function mapCliArtifact(raw: OpenSpecStatusCliArtifact): OpenSpecArtifactStatus | null {
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  const state = typeof raw.status === 'string' && ARTIFACT_STATES.has(raw.status)
    ? (raw.status as OpenSpecArtifactState)
    : null;
  if (state === null) return null;
  const missingDeps = Array.isArray(raw.missingDeps)
    ? raw.missingDeps.filter((dep): dep is string => typeof dep === 'string')
    : [];
  return { id: raw.id, state, missingDeps };
}

/**
 * Lee el grafo de artefactos de un change con `openspec status --json`.
 *
 * `available: false` significa que no se pudo leer el grafo —el CLI no está,
 * timed out, o la salida no era JSON válido—. No es lo mismo que un grafo
 * vacío, y por eso se distingue: el consumidor declara "no hay grafo" en vez
 * de leerlo como "todo listo". Es el mismo principio que `validate → unknown`.
 *
 * Vale la misma nota de seguridad que los demás wrappers: los argumentos son
 * literales y `changeId` pasó `CHANGE_ID_PATTERN`.
 */
export async function statusOpenSpecChangeWithCli(
  repoPath: string,
  changeId: string,
): Promise<OpenSpecChangeStatus> {
  const unavailable: OpenSpecChangeStatus = { available: false, artifacts: [], applyRequires: [], isComplete: false };
  if (!CHANGE_ID_PATTERN.test(changeId)) return unavailable;
  try {
    const { stdout } = await execFileAsync(CLI.command, ['status', changeId, '--json'], {
      cwd: repoPath,
      timeout: 15_000,
      windowsHide: true,
      shell: CLI.shell,
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, OPENSPEC_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' },
    });
    const parsed = JSON.parse(stdout) as OpenSpecStatusCliOutput;
    const artifacts = Array.isArray(parsed.artifacts)
      ? parsed.artifacts
        .map((raw) => mapCliArtifact(raw as OpenSpecStatusCliArtifact))
        .filter((artifact): artifact is OpenSpecArtifactStatus => artifact !== null)
      : [];
    const applyRequires = Array.isArray(parsed.applyRequires)
      ? parsed.applyRequires.filter((req): req is string => typeof req === 'string')
      : [];
    return {
      available: true,
      artifacts,
      applyRequires,
      isComplete: parsed.isComplete === true,
    };
  } catch {
    // No distinguir fallo de validación de indisponibilidad del binario: acá no
    // hay nada que validar, sólo leer. Cualquier fallo es "no hay grafo".
    return unavailable;
  }
}
