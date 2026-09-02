import type {
  InstructionsOpenSpecResult,
  OpenSpecArtifactState,
  OpenSpecArtifactStatus,
  OpenSpecChangeStatus,
  OpenSpecInstructionsPayload,
  OpenSpecRunUpdateResult,
  OpenSpecValidationStatus,
} from '../../types/pipeline';
import { simpleGit } from 'simple-git';
import { withRepoLock } from '../git/repo-queue';
import {
  isValidOpenSpecChangeSlug as isValidChangeId,
  OPENSPEC_CHANGE_SLUG_PATTERN as CHANGE_ID_PATTERN,
} from '../../lib/openspec-slug';
import {
  readOpenSpecChangeMetadata,
  resolveOpenSpecExecutable,
  runAuthorizedOpenSpec,
  type AuthorizedOpenSpecRuntime,
} from './openspec-engine';

export { CHANGE_ID_PATTERN, isValidChangeId };

/**
 * Alfabeto de una herramienta de OpenSpec.
 *
 * En Windows el CLI corre con shell: true si es .cmd/.bat. El único valor variable
 * pasado a `init` queda acotado a letras, dígitos y guiones.
 */
export const TOOL_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

export interface InitOpenSpecResult {
  ok: boolean;
  /** Motivo real informado por el CLI. `null` sólo cuando inicializó bien. */
  error: string | null;
  /** El CLI no encontró ninguna herramienta y hay que elegir una. */
  needsTool: boolean;
}

export interface CliExecutionOptions {
  runtime?: AuthorizedOpenSpecRuntime | null;
  resolve?: () => AuthorizedOpenSpecRuntime | null;
}

function resolveRuntime(options?: CliExecutionOptions, repoPath?: string): AuthorizedOpenSpecRuntime | null {
  if (options?.runtime !== undefined) return options.runtime;
  if (options?.resolve) return options.resolve();
  return resolveOpenSpecExecutable({ repoPath });
}

/**
 * Inicializa OpenSpec en un repositorio.
 */
export async function initOpenSpecWithCli(
  repoPath: string,
  tools?: string[],
  options?: CliExecutionOptions,
): Promise<InitOpenSpecResult> {
  const requested = tools?.filter((tool) => TOOL_ID_PATTERN.test(tool)) ?? [];
  if (tools && requested.length !== tools.length) {
    return { ok: false, error: 'invalid-tool-id', needsTool: false };
  }

  const runtime = resolveRuntime(options, repoPath);
  if (!runtime) {
    return { ok: false, error: 'openspec-cli-not-found', needsTool: false };
  }

  const args = requested.length > 0 ? ['init', '--tools', requested.join(',')] : ['init'];

  try {
    await runAuthorizedOpenSpec(runtime, args, {
      cwd: repoPath,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return { ok: true, error: null, needsTool: false };
  } catch (error) {
    const detail = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
    const reason = [detail.stderr, detail.stdout, detail.message]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .find((part) => part.length > 0) ?? 'unknown';
    return { ok: false, error: reason, needsTool: /no tools detected/i.test(reason) };
  }
}

export interface ArchiveOpenSpecChangeResult {
  ok: boolean;
  /** Motivo real informado por el CLI. `null` sólo cuando archivó bien. */
  error: string | null;
}

/**
 * Archiva un change invocando el CLI desde el proceso principal.
 */
export async function archiveOpenSpecChangeWithCli(
  repoPath: string,
  changeId: string,
  options?: CliExecutionOptions,
): Promise<ArchiveOpenSpecChangeResult> {
  if (!isValidChangeId(changeId)) return { ok: false, error: 'invalid-change-id' };

  const runtime = resolveRuntime(options, repoPath);
  if (!runtime) return { ok: false, error: 'openspec-cli-not-found' };

  try {
    await runAuthorizedOpenSpec(runtime, ['archive', changeId, '--yes'], {
      cwd: repoPath,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return { ok: true, error: null };
  } catch (error) {
    const detail = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
    const reason = [detail.stderr, detail.stdout, detail.message]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .find((value) => value.length > 0) ?? 'archive-failed';
    return { ok: false, error: reason.slice(0, 4000) };
  }
}

/**
 * Valida un change con `--strict`.
 */
export async function validateOpenSpecChangeWithCli(
  repoPath: string,
  changeId: string,
  options?: CliExecutionOptions,
): Promise<OpenSpecValidationStatus> {
  if (!isValidChangeId(changeId)) return 'unknown';

  const runtime = resolveRuntime(options, repoPath);
  if (!runtime) return 'unknown';

  try {
    await runAuthorizedOpenSpec(runtime, ['validate', changeId, '--strict', '--no-interactive'], {
      cwd: repoPath,
      timeout: 15_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return 'passed';
  } catch (error) {
    return typeof (error as { code?: unknown })?.code === 'number' ? 'failed' : 'unknown';
  }
}

interface OpenSpecStatusCliArtifact {
  id?: unknown;
  status?: unknown;
  missingDeps?: unknown;
  requires?: unknown;
}

interface OpenSpecStatusCliOutput {
  artifacts?: unknown;
  applyRequires?: unknown;
  isComplete?: unknown;
  isPlanningComplete?: unknown;
  schemaName?: unknown;
  skip_specs?: unknown;
  skipSpecs?: unknown;
}

const KNOWN_ARTIFACT_STATES: ReadonlySet<string> = new Set(['blocked', 'ready', 'done', 'skipped']);

/**
 * Mapea el `status` del CLI al `state` del tipo propio.
 * Tolera elementos que no son objetos válidos (primitivos, null, arrays) descartándolos.
 * Preserva artefactos con estados futuros/desconocidos asignando `state: 'unknown'`
 * y `rawState`. Sólo descarta artefactos sin `id` válido.
 */
function mapCliArtifact(raw: unknown): OpenSpecArtifactStatus | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const item = raw as OpenSpecStatusCliArtifact;
  if (typeof item.id !== 'string' || item.id.length === 0) return null;

  let state: OpenSpecArtifactState = 'unknown';
  let rawState: string | undefined = undefined;

  if (typeof item.status === 'string') {
    if (KNOWN_ARTIFACT_STATES.has(item.status)) {
      state = item.status as OpenSpecArtifactState;
    } else {
      state = 'unknown';
      rawState = item.status.slice(0, 100);
    }
  }

  const missingDeps = Array.isArray(item.missingDeps)
    ? item.missingDeps.filter((dep): dep is string => typeof dep === 'string')
    : [];

  const requires = Array.isArray(item.requires)
    ? item.requires.filter((dep): dep is string => typeof dep === 'string')
    : [];

  return { id: item.id, state, rawState, missingDeps, requires };
}

/**
 * Lee el grafo de artefactos de un change con `openspec status --json`.
 */
export async function statusOpenSpecChangeWithCli(
  repoPath: string,
  changeId: string,
  options?: CliExecutionOptions,
): Promise<OpenSpecChangeStatus> {
  const unavailable: OpenSpecChangeStatus = {
    available: false,
    artifacts: [],
    applyRequires: [],
    isComplete: false,
  };

  if (!isValidChangeId(changeId)) return unavailable;

  const runtime = resolveRuntime(options, repoPath);
  if (!runtime) return unavailable;

  try {
    const { stdout } = await runAuthorizedOpenSpec(runtime, ['status', '--change', changeId, '--json'], {
      cwd: repoPath,
      timeout: 15_000,
      maxBuffer: 2 * 1024 * 1024,
    });

    const parsed = JSON.parse(stdout) as OpenSpecStatusCliOutput;
    const artifacts = Array.isArray(parsed.artifacts)
      ? parsed.artifacts
        .map((raw) => mapCliArtifact(raw))
        .filter((artifact): artifact is OpenSpecArtifactStatus => artifact !== null)
      : [];

    const applyRequires = Array.isArray(parsed.applyRequires)
      ? parsed.applyRequires.filter((req): req is string => typeof req === 'string')
      : [];

    // Precedencia explícita de `isPlanningComplete` (1.8) sobre alias legacy:
    const isPlanningComplete =
      typeof parsed.isPlanningComplete === 'boolean' ? parsed.isPlanningComplete : null;
    const isComplete = isPlanningComplete ?? (parsed.isComplete === true);

    // Metadata del change desde .openspec.yaml (evidencia independiente de status)
    const fileMeta = await readOpenSpecChangeMetadata(repoPath, changeId);

    // Combinar schemaName del status JSON o de .openspec.yaml
    const schemaName =
      (typeof parsed.schemaName === 'string' && parsed.schemaName.length > 0
        ? parsed.schemaName
        : fileMeta.schemaName) ?? null;

    // Precedencia de skipSpecs (contrato tri-estado: boolean | null):
    // 1. Campo top-level booleano del status JSON (skip_specs o skipSpecs) tiene máxima precedencia.
    // 2. Si no viene en status JSON, se utiliza fileMeta.skipSpecs desde .openspec.yaml (boolean o null).
    // 3. Si ambos están ausentes o son inválidos, resulta en null.
    let skipSpecs: boolean | null = null;
    if (typeof (parsed as any).skip_specs === 'boolean') {
      skipSpecs = (parsed as any).skip_specs;
    } else if (typeof (parsed as any).skipSpecs === 'boolean') {
      skipSpecs = (parsed as any).skipSpecs;
    } else {
      skipSpecs = fileMeta.skipSpecs;
    }

    return {
      available: true,
      artifacts,
      applyRequires,
      isPlanningComplete,
      schemaName,
      skipSpecs,
      isComplete,
    };
  } catch {
    return unavailable;
  }
}

/**
 * Determina si una ruta de archivo corresponde a las generadas o gestionadas por OpenSpec (Hallazgo 6).
 */
export function isOpenSpecManagedPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const targetPrefixes = [
    'openspec/',
    '.agents/',
    '.claude/',
    '.codex/',
    '.opencode/',
    '.cursor/',
    '.github/',
    '.gitlab/',
    '.gemini/',
    '.factory/',
    '.windsurf/',
    '.cline/',
    '.devin/',
    '.continue/',
    '.amazonq/',
    '.copilot/',
    '.roocline/',
  ];
  if (targetPrefixes.some((prefix) => normalized.startsWith(prefix) || normalized.includes(`/${prefix}`))) {
    return true;
  }
  const rootFiles = ['.openspec.yaml', 'openspec.yaml', '.cursorrules', 'AGENTS.md'];
  const base = normalized.split('/').pop() ?? '';
  return rootFiles.includes(base);
}

export interface RunOpenSpecUpdateOptions {
  runtime?: AuthorizedOpenSpecRuntime | null;
  force?: boolean;
}

/**
 * Ejecuta openspec update en el repositorio autorizado con variables de entorno controladas.
 */
export async function runOpenSpecUpdate(
  repoPath: string,
  options?: RunOpenSpecUpdateOptions,
): Promise<OpenSpecRunUpdateResult> {
  const runtime = resolveRuntime(options, repoPath);
  if (!runtime) {
    return {
      success: false,
      status: 'error',
      filesUpdated: [],
      errors: ['openspec-cli-not-found'],
    };
  }

  const args = options?.force ? ['update', '--force'] : ['update'];

  try {
    const { stderr } = await runAuthorizedOpenSpec(runtime, args, {
      cwd: repoPath,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    });

    let filesUpdated: string[] = [];
    try {
      await withRepoLock(repoPath, async () => {
        const git = simpleGit(repoPath);
        const status = await git.status();
        filesUpdated = status.files
          .map((f) => f.path)
          .filter(isOpenSpecManagedPath);
      });
    } catch {
      // ignore
    }

    return {
      success: true,
      status: 'completed',
      filesUpdated,
      errors: stderr ? [stderr.trim()].filter(Boolean) : [],
    };
  } catch (error) {
    const detail = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
    const reason = [detail.stderr, detail.stdout, detail.message]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .find((part) => part.length > 0) ?? 'update-failed';

    let filesUpdated: string[] = [];
    try {
      await withRepoLock(repoPath, async () => {
        const git = simpleGit(repoPath);
        const status = await git.status();
        filesUpdated = status.files
          .map((f) => f.path)
          .filter(isOpenSpecManagedPath);
      });
    } catch {
      // ignore
    }

    const isIncomplete = filesUpdated.length > 0;
    return {
      success: false,
      status: isIncomplete ? 'update-incomplete' : 'error',
      filesUpdated,
      errors: [reason.slice(0, 4000)],
    };
  }
}

export interface InstructionsOpenSpecOptions extends CliExecutionOptions {
  changeId?: string | null;
  schema?: string | null;
}

/**
 * Obtiene las instrucciones enriquecidas del CLI con `openspec instructions <target> --json`.
 */
export async function instructionsOpenSpecWithCli(
  repoPath: string,
  target: string,
  options?: InstructionsOpenSpecOptions,
): Promise<InstructionsOpenSpecResult> {
  const runtime = resolveRuntime(options, repoPath);
  if (!runtime) return { ok: false, error: 'openspec-cli-not-found', data: null };

  const args = ['instructions', target];
  if (options?.changeId && isValidChangeId(options.changeId)) {
    args.push('--change', options.changeId);
  }
  if (options?.schema && typeof options.schema === 'string' && options.schema.trim().length > 0) {
    args.push('--schema', options.schema.trim());
  }
  args.push('--json');

  try {
    const { stdout } = await runAuthorizedOpenSpec(runtime, args, {
      cwd: repoPath,
      timeout: 15_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout) as OpenSpecInstructionsPayload;
    if (Array.isArray(parsed.status) && parsed.status.some((s) => s.severity === 'error')) {
      const errorMsg = parsed.status.find((s) => s.severity === 'error')?.message ?? 'instructions-error';
      return { ok: false, error: errorMsg, data: parsed };
    }
    return { ok: true, error: null, data: parsed };
  } catch (error) {
    const detail = error as { stderr?: unknown; stdout?: unknown; message?: unknown };
    let reason = [detail.stderr, detail.stdout, detail.message]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .find((part) => part.length > 0) ?? 'instructions-failed';
    try {
      if (typeof detail.stdout === 'string') {
        const parsed = JSON.parse(detail.stdout) as OpenSpecInstructionsPayload;
        if (Array.isArray(parsed.status) && parsed.status.some((s) => s.severity === 'error')) {
          reason = parsed.status.find((s) => s.severity === 'error')?.message ?? reason;
          return { ok: false, error: reason, data: parsed };
        }
      }
    } catch {
      // ignore
    }
    return { ok: false, error: reason.slice(0, 4000), data: null };
  }
}
