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
      origin: 'unknown',
      readAt,
    };
  }

  const runGet = options.runGet ?? ((key, rt) => defaultRunGet(key, rt));

  const [profileOut, deliveryOut, workflowsOut] = await Promise.all([
    runGet('profile', runtime).catch(() => null),
    runGet('delivery', runtime).catch(() => null),
    runGet('workflows', runtime).catch(() => null),
  ]);

  const profileRes = parseProfile(profileOut);
  const deliveryRes = parseDelivery(deliveryOut);
  const workflowsRes = parseWorkflows(workflowsOut);

  const hasAnySuccess =
    profileRes.state === 'read' ||
    deliveryRes.state === 'read' ||
    workflowsRes.state === 'read';

  return {
    rawProfile: profileRes.value,
    profileState: profileRes.state,
    delivery: deliveryRes.value,
    deliveryState: deliveryRes.state,
    configuredWorkflows: workflowsRes.value,
    workflowsState: workflowsRes.state,
    origin: hasAnySuccess ? 'cli' : 'unknown',
    readAt,
  };
}

export const __parsers = { parseProfile, parseDelivery, parseWorkflows };
