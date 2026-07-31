import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { OpenSpecValidationStatus } from '../../types/pipeline';

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
