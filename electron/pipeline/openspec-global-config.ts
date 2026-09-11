import type { OpenSpecGlobalConfig, SetOpenSpecWorkflowResult } from '../../types/pipeline';
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

async function defaultRunSet(args: string[], runtime: AuthorizedOpenSpecRuntime): Promise<string> {
  const { stdout } = await runAuthorizedOpenSpec(runtime, args, {
    timeout: 10_000,
    maxBuffer: 16 * 1024,
  });
  return stdout;
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface SetOpenSpecWorkflowOptions {
  /** Nombre del workflow a alternar (no se valida contra ningún conjunto cerrado). */
  workflow: string;
  /** `true` para habilitarlo, `false` para deshabilitarlo. */
  enabled: boolean;
  /** Runtime inyectable autorizado. */
  runtime?: AuthorizedOpenSpecRuntime | null;
  /** Resolvedor inyectable para tests (default: `resolveOpenSpecExecutable`). */
  resolve?: () => AuthorizedOpenSpecRuntime | null;
  /**
   * Setter inyectable para tests: ejecuta el `config set` con los args exactos y
   * devuelve el stdout. El valor SIEMPRE se pasa como `JSON.stringify(lista)`;
   * nunca como string con comas (ver `coerceValue` del CLI 1.12.0).
   */
  runSet?: (args: string[], runtime: AuthorizedOpenSpecRuntime) => Promise<string>;
  /** Lector inyectable para tests (default: `readOpenSpecGlobalConfig`). */
  read?: (options?: ReadOpenSpecGlobalConfigOptions) => Promise<OpenSpecGlobalConfig>;
}

/**
 * Alterna UN workflow en la configuración global de OpenSpec (`config set workflows`).
 *
 * No hardcodea ningún nombre válido: solo agrega o quita el string recibido dentro
 * de la lista YA LEÍDA del CLI. El conjunto válido sale del motor, no del código.
 *
 * Flujo: leer estado actual → calcular nueva lista → (si hay cambio) escribir con
 * `JSON.stringify` → re-leer y devolver el estado fresco. Si la lista no se pudo
 * leer, NO escribe nada y devuelve fallo explícito (no adivina la lista).
 *
 * Elección documentada para el caso sin cambio (ya en el estado pedido): se OMITE
 * la escritura (no toca disco) pero SÍ se re-lee para confirmar y devolver el
 * estado fresco.
 */
export async function setOpenSpecWorkflow(
  options: SetOpenSpecWorkflowOptions,
): Promise<SetOpenSpecWorkflowResult> {
  const workflow = typeof options.workflow === 'string' ? options.workflow.trim() : '';
  if (!workflow) {
    return { ok: false, appliedWorkflows: null, config: null, error: 'workflow-required' };
  }

  const runtime = options.runtime !== undefined
    ? options.runtime
    : (options.resolve ?? resolveOpenSpecExecutable)();

  if (!runtime) {
    return { ok: false, appliedWorkflows: null, config: null, error: 'no-authorized-runtime' };
  }

  const read = options.read ?? ((opts?: ReadOpenSpecGlobalConfigOptions) => readOpenSpecGlobalConfig(opts ?? {}));
  const runSet = options.runSet ?? ((args: string[], rt: AuthorizedOpenSpecRuntime) => defaultRunSet(args, rt));

  // Paso 1: leer el estado actual.
  let current: OpenSpecGlobalConfig;
  try {
    current = await read({ runtime });
  } catch (err) {
    return { ok: false, appliedWorkflows: null, config: null, error: toErrorMessage(err) };
  }

  if (current.configuredWorkflows === null || current.workflowsState !== 'read') {
    return {
      ok: false,
      appliedWorkflows: null,
      config: current,
      error: 'configured-workflows-unread',
    };
  }

  // Paso 2: calcular la nueva lista desde la leída.
  const base = current.configuredWorkflows;
  const present = base.includes(workflow);
  let nextList: string[];
  let changed: boolean;
  if (options.enabled) {
    if (present) {
      nextList = base; // ya habilitado: sin cambio
      changed = false;
    } else {
      nextList = [...base, workflow]; // agrega al final, conserva orden existente
      changed = true;
    }
  } else {
    if (present) {
      nextList = base.filter((w) => w !== workflow); // lo quita
      changed = true;
    } else {
      nextList = base; // ya deshabilitado: sin cambio
      changed = false;
    }
  }

  // Paso 3: escribir SOLO si hubo cambio. El valor SIEMPRE viaja como JSON array.
  if (changed) {
    try {
      await runSet(['config', 'set', 'workflows', JSON.stringify(nextList)], runtime);
    } catch (err) {
      return { ok: false, appliedWorkflows: null, config: current, error: toErrorMessage(err) };
    }
  }

  // Paso 4: re-leer para confirmar y devolver el estado fresco.
  let fresh: OpenSpecGlobalConfig;
  try {
    fresh = await read({ runtime });
  } catch (err) {
    return { ok: false, appliedWorkflows: null, config: current, error: toErrorMessage(err) };
  }

  return { ok: true, appliedWorkflows: fresh.configuredWorkflows, config: fresh };
}

export const __parsers = { parseProfile, parseDelivery, parseWorkflows, parseResolvedWorkflows };
