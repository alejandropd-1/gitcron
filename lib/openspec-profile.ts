/**
 * Clasificación del perfil de OpenSpec a partir de los workflows instalados.
 *
 * OpenSpec persiste oficialmente sólo `core` o `custom` como `profile`. Los
 * conjuntos de workflows son los definidos por OpenSpec 1.8:
 *
 * - **core**: `propose`, `explore`, `apply`, `update`, `sync`, `archive` (seis).
 * - **ampliado**: los seis anteriores más `new`, `continue`, `ff`, `verify`,
 *   `bulk-archive`, `onboard` (doce en total).
 *
 * `expanded` NO es un valor que persista OpenSpec: es una clasificación que
 * GitCron **deriva** cuando están presentes los doce workflows del conjunto
 * ampliado. Cualquier otra combinación se clasifica `custom`, y cuando no puede
 * leerse, `unknown`. La función es pura y no toca el CLI: la fuente son los
 * workflows ya leídos, sobre los que se decide la clase.
 */

export const OPENSPEC_CORE_WORKFLOWS = [
  'propose',
  'explore',
  'apply',
  'update',
  'sync',
  'archive',
] as const;

export const OPENSPEC_EXPANDED_EXTRA_WORKFLOWS = [
  'new',
  'continue',
  'ff',
  'verify',
  'bulk-archive',
  'onboard',
] as const;

/** Conjunto ampliado completo: los seis core más los seis adicionales (doce). */
export const OPENSPEC_EXPANDED_WORKFLOWS: readonly string[] = [
  ...OPENSPEC_CORE_WORKFLOWS,
  ...OPENSPEC_EXPANDED_EXTRA_WORKFLOWS,
];

export type OpenSpecProfileClass = 'core' | 'expanded' | 'custom' | 'unknown';

export type OpenSpecProfileSource = 'global-config' | 'installed-integration' | 'unknown';

export interface ClassifyOpenSpecProfileInput {
  /** Valor crudo de `profile` informado por OpenSpec (opcional, se conserva separado). */
  rawProfile?: string | null;
  /** Workflows configurados/instalados. Es la fuente principal de la clasificación. */
  workflows?: readonly string[] | null;
  /** Origen de la fuente sobre la cual se calcula el perfil. */
  source?: OpenSpecProfileSource;
}

export interface OpenSpecProfileClassification {
  profileClass: OpenSpecProfileClass;
  source: OpenSpecProfileSource;
  rawProfile: string | null;
}

function containsAll(workflows: Set<string>, required: readonly string[]): boolean {
  return required.every((name) => workflows.has(name));
}

/**
 * Clasifica el perfil. La decisión se basa en los workflows:
 * - `core`: exactamente los seis oficiales.
 * - `expanded`: exactamente los doce oficiales.
 * - `custom`: cualquier otra combinación leíble (incluido un superset de 13).
 * - `unknown`: fuente no leíble.
 * Conserva `rawProfile` separado y retorna la fuente sobre la que se calculó.
 */
export function classifyOpenSpecProfile(
  input: ClassifyOpenSpecProfileInput,
): OpenSpecProfileClassification {
  const source = input?.source ?? 'unknown';
  const rawProfile = input?.rawProfile ?? null;

  const list = input?.workflows;
  if (!Array.isArray(list)) {
    return { profileClass: 'unknown', source: 'unknown', rawProfile };
  }

  const workflows = new Set(
    list.filter((name): name is string => typeof name === 'string' && name.length > 0),
  );
  if (workflows.size === 0) {
    return { profileClass: 'unknown', source: 'unknown', rawProfile };
  }

  const isExactlyExpanded =
    workflows.size === OPENSPEC_EXPANDED_WORKFLOWS.length &&
    containsAll(workflows, OPENSPEC_EXPANDED_WORKFLOWS);
  if (isExactlyExpanded) {
    return { profileClass: 'expanded', source, rawProfile };
  }

  const isExactlyCore =
    workflows.size === OPENSPEC_CORE_WORKFLOWS.length &&
    containsAll(workflows, OPENSPEC_CORE_WORKFLOWS);
  if (isExactlyCore) {
    return { profileClass: 'core', source, rawProfile };
  }

  return { profileClass: 'custom', source, rawProfile };
}

export interface ProfileWorkflowRow {
  /** Nombre del workflow tal como lo informó el CLI (sin validar contra ningún conjunto). */
  workflow: string;
  /** `true` cuando el perfil vigente RESUELVE ese workflow (lo que el motor habilita). */
  enabled: boolean;
  /** `true` cuando el workflow está escrito en el archivo de configuración global. */
  configured: boolean;
}

function toNameList(list: string[] | null): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((name): name is string => typeof name === 'string' && name.length > 0);
}

/**
 * Deriva las filas del panel de perfil de workflows a partir de las dos fuentes
 * independientes que ya llegan al renderer:
 *
 * - `configured`: lo escrito en el archivo de configuración global.
 * - `resolved`: lo que el perfil vigente RESUELVE (lo que el motor habilita).
 *
 * El universo es la unión ordenada: se preserva el orden de `configured` y se
 * anexa al final cualquier workflow presente en `resolved` pero ausente de
 * `configured`. Un nombre que este código no conoce aparece igual como fila
 * válida: NO se valida ni filtra contra ningún conjunto. Si ambas listas son
 * null (o vacías) se devuelve un array vacío: el panel mostrará «sin datos».
 */
export function deriveProfileWorkflowRows(
  configured: string[] | null,
  resolved: string[] | null,
): ProfileWorkflowRow[] {
  const configuredList = toNameList(configured);
  const resolvedList = toNameList(resolved);

  if (configuredList.length === 0 && resolvedList.length === 0) {
    return [];
  }

  const configuredSet = new Set(configuredList);
  const resolvedSet = new Set(resolvedList);

  const universe: string[] = [];
  const seen = new Set<string>();
  for (const name of [...configuredList, ...resolvedList]) {
    if (!seen.has(name)) {
      seen.add(name);
      universe.push(name);
    }
  }

  return universe.map((workflow) => ({
    workflow,
    enabled: resolvedSet.has(workflow),
    configured: configuredSet.has(workflow),
  }));
}
