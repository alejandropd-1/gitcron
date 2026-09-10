import type { OpenSpecGlobalConfig } from '../../types/pipeline';
import {
  resolveOpenSpecExecutable,
  runAuthorizedOpenSpec,
  type AuthorizedOpenSpecRuntime,
} from './openspec-engine';

/**
 * Lector minimizado de la configuración global de OpenSpec.
 *
 * Lee, una por una y sólo las necesarias, las claves que la tarjeta necesita:
 * `profile`, `delivery` y `workflows`. No pide `telemetry`, `anonymousId`,
 * `featureFlags` ni el archivo global completo: la regla es transportar lo
 * mínimo, y nada que no se use. Cada lectura tiene timeout y límite de bytes, y
 * si una clave falla se registra de forma explícita sin tirar las demás.
 *
 * Transporta DOS listas de workflows distintas, porque son datos distintos:
 * - `configuredWorkflows`: lo escrito en el archivo (`config get workflows`).
 * - `resolvedWorkflows`: lo que el perfil vigente RESUELVE, es decir lo que el
 *   motor realmente habilita. Medido en OpenSpec 1.12.0 no existe ninguna clave
 *   de `config get` para esa lista (las claves conocidas son `featureFlags`,
 *   `profile`, `delivery`, `workflows`, `defaultStore`, `telemetry.*` y
 *   `completionTipSeen`; una clave desconocida sale con código 1 y stdout vacío,
 *   y `config list --json` sólo vuelca el config crudo). La única superficie que
 *   la reporta es el modo texto de `openspec config list`, en su bloque
 *   "Profile settings:", del cual se extrae la línea `workflows:`.
 *
 * Ninguna lista se enumera en el código: los nombres salen de lo que el motor
 * informa y un nombre desconocido se transporta igual.
 *
 * El renderer nunca ve el archivo global: recibe el struct ya filtrado.
 */

const GLOBAL_CONFIG_KEYS = ['profile', 'delivery', 'workflows'] as const;
export type GlobalConfigKey = (typeof GLOBAL_CONFIG_KEYS)[number];

export interface ReadOpenSpecGlobalConfigOptions {
  /** Runtime inyectable autorizado. */
  runtime?: AuthorizedOpenSpecRuntime | null;
  /** Resolvedor inyectable para tests (default: `resolveOpenSpecExecutable`). */
  resolve?: () => AuthorizedOpenSpecRuntime | null;
  /** Getter inyectable para tests: devuelve el stdout de `openspec config get <key>`. */
  runGet?: (key: GlobalConfigKey, runtime: AuthorizedOpenSpecRuntime) => Promise<string>;
  /**
   * Getter inyectable para tests: devuelve el stdout de `openspec config list`
   * (modo texto; es la única superficie que reporta los workflows resueltos).
   */
  runList?: (runtime: AuthorizedOpenSpecRuntime) => Promise<string>;
}

async function defaultRunGet(
  key: GlobalConfigKey,
  runtime: AuthorizedOpenSpecRuntime,
): Promise<string> {
  const { stdout } = await runAuthorizedOpenSpec(runtime, ['config', 'get', key], {
    timeout: 10_000,
    maxBuffer: 16 * 1024,
  });
  return stdout;
}

async function defaultRunList(runtime: AuthorizedOpenSpecRuntime): Promise<string> {
  const { stdout } = await runAuthorizedOpenSpec(runtime, ['config', 'list'], {
    timeout: 10_000,
    maxBuffer: 16 * 1024,
  });
  return stdout;
}

function parseProfile(stdout: string | null): { value: string | null; state: 'read' | 'failed' } {
  if (stdout === null) return { value: null, state: 'failed' };
  const value = stdout.trim();
  return value.length > 0 ? { value, state: 'read' } : { value: null, state: 'failed' };
}

function parseDelivery(stdout: string | null): { value: string | null; state: 'read' | 'failed' } {
  if (stdout === null) return { value: null, state: 'failed' };
  const value = stdout.trim();
  return value.length > 0 ? { value, state: 'read' } : { value: null, state: 'failed' };
}

function parseWorkflows(stdout: string | null): { value: string[] | null; state: 'read' | 'failed' } {
  if (stdout === null) return { value: null, state: 'failed' };
  const trimmed = stdout.trim();
  if (trimmed.length === 0) return { value: null, state: 'failed' };
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return { value: null, state: 'failed' };
    const list = parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
    return { value: list, state: 'read' };
  } catch {
    return { value: null, state: 'failed' };
  }
}

/**
 * Extrae la lista RESUELTA por el perfil del modo texto de `openspec config list`.
 *
 * Formato medido en OpenSpec 1.12.0: después del volcado YAML (donde la clave
 * `workflows:` va seguida de líneas `- <nombre>`) aparece un bloque final
 * indentado `Profile settings:` cuya línea `workflows:` lleva la lista resuelta
 * inline, con una anotación de origen entre paréntesis al final, p. ej.:
 *
 *   Profile settings:
 *     profile: core (explicit)
 *     delivery: both (explicit)
 *     workflows: propose, explore, apply, update, sync, archive (from core profile)
 *
 * La clave YAML superior no tiene contenido inline y queda fuera por diseño.
 * `workflows: (none)` es un valor válido del CLI (perfil que resuelve a cero
 * workflows) y se transporta como lista vacía leída, no como fallo. Los
 * nombres no se validan contra ningún conjunto: lo que el motor informa llega.
 */
function parseResolvedWorkflows(stdout: string | null): { value: string[] | null; state: 'read' | 'failed' } {
  if (stdout === null) return { value: null, state: 'failed' };
  const lines = stdout.split(/\r?\n/);
  const sectionStart = lines.findIndex((line) => line.trim() === 'Profile settings:');
  if (sectionStart === -1) return { value: null, state: 'failed' };
  for (let i = sectionStart + 1; i < lines.length; i++) {
    const line = lines[i];
    // El bloque termina en la primera línea vacía o no indentada.
    if (line.trim().length === 0 || !/^\s/.test(line)) break;
    const match = line.match(/^\s*workflows:\s*(.+?)\s*$/);
    if (!match) continue;
    const inline = match[1];
    if (inline === '(none)') return { value: [], state: 'read' };
    // Quita la anotación de origen final que el CLI agrega, p. ej. "(from core profile)".
    const withoutAnnotation = inline.replace(/\s*\([^)]*\)\s*$/, '');
    const list = withoutAnnotation
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return { value: list, state: 'read' };
  }
  return { value: null, state: 'failed' };
}

/**
 * Lee la configuración global efectiva de forma minimizada.
 * Si el CLI no está o todas las claves fallan, devuelve `origin: 'unknown'`.
 * Si al menos una clave produce evidencia válida, devuelve `origin: 'cli'`.
 */
export async function readOpenSpecGlobalConfig(
  options: ReadOpenSpecGlobalConfigOptions = {},
): Promise<OpenSpecGlobalConfig> {
  const readAt = new Date().toISOString();
  const runtime = options.runtime !== undefined
    ? options.runtime
    : (options.resolve ?? resolveOpenSpecExecutable)();

  if (!runtime) {
    return {
      rawProfile: null,
      profileState: 'unread',
      delivery: null,
      deliveryState: 'unread',
      configuredWorkflows: null,
      workflowsState: 'unread',
      resolvedWorkflows: null,
      resolvedWorkflowsState: 'unread',
      origin: 'unknown',
      readAt,
    };
  }

  const runGet = options.runGet ?? ((key, rt) => defaultRunGet(key, rt));
  const runList = options.runList ?? ((rt) => defaultRunList(rt));

  const [profileOut, deliveryOut, workflowsOut, listOut] = await Promise.all([
    runGet('profile', runtime).catch(() => null),
    runGet('delivery', runtime).catch(() => null),
    runGet('workflows', runtime).catch(() => null),
    runList(runtime).catch(() => null),
  ]);

  const profileRes = parseProfile(profileOut);
  const deliveryRes = parseDelivery(deliveryOut);
  const workflowsRes = parseWorkflows(workflowsOut);
  const resolvedRes = parseResolvedWorkflows(listOut);

  const hasAnySuccess =
    profileRes.state === 'read' ||
    deliveryRes.state === 'read' ||
    workflowsRes.state === 'read' ||
    resolvedRes.state === 'read';

  return {
    rawProfile: profileRes.value,
    profileState: profileRes.state,
    delivery: deliveryRes.value,
    deliveryState: deliveryRes.state,
    configuredWorkflows: workflowsRes.value,
    workflowsState: workflowsRes.state,
    resolvedWorkflows: resolvedRes.value,
    resolvedWorkflowsState: resolvedRes.state,
    origin: hasAnySuccess ? 'cli' : 'unknown',
    readAt,
  };
}

export const __parsers = { parseProfile, parseDelivery, parseWorkflows, parseResolvedWorkflows };
