// lib/openspec-update-guide.ts
//
// Lógica pura para la revisión diagnóstica de actualización de OpenSpec (Fase 6).
//
// Determina la operación oficial, compone el comando literal exacto y clasifica
// la convivencia de skills entre esquemas legacy (.codex/.agent) y nuevo (.agents).
// No invoca ningún proceso ni realiza mutaciones sobre el disco.

import type {
  OpenSpecEngineStatus,
  OpenSpecInstalledEvidence,
  OpenSpecInstalledSkill,
  OpenSpecUpdatePlan,
} from '@/types/pipeline';
import { isOpenSpecConfigurableTool } from '@/electron/pipeline/openspec-tooling';

export interface CoexistenceDiagnostic {
  legacySkills: OpenSpecInstalledSkill[];
  newAgentsSkills: OpenSpecInstalledSkill[];
  officialOtherSkills: OpenSpecInstalledSkill[];
  customPreexistingSkills: OpenSpecInstalledSkill[];
  customOtherSkills: OpenSpecInstalledSkill[];
  nameCollisions: string[];
  conflicts: string[];
}

/**
 * Clasifica los skills instalados para el diagnóstico de convivencia (Tarea 6.4).
 *
 * Distingue explícitamente:
 * - Skills legacy (.codex / .agent) a migrar.
 * - Skills oficiales nuevos (.agents) a incorporar.
 * - Skills oficiales en otras herramientas (.claude, .opencode, etc.).
 * - Skills personalizados preexistentes en .agents que NO deben tocarse (ej. dex, seo, accessibility).
 * - Skills personalizados en otras herramientas.
 * - Colisiones de nombres reales (personalizados colisionando con flujos oficiales) y conflictos declarados.
 */
export function classifyCoexistenceSkills(
  installed: OpenSpecInstalledEvidence | null | undefined,
): CoexistenceDiagnostic {
  if (!installed || !Array.isArray(installed.skills)) {
    return {
      legacySkills: [],
      newAgentsSkills: [],
      officialOtherSkills: [],
      customPreexistingSkills: [],
      customOtherSkills: [],
      nameCollisions: [],
      conflicts: installed?.conflicts ?? [],
    };
  }

  const legacySkills = installed.skills.filter(
    (s) => s.origin === 'legacy-codex' || s.origin === 'legacy-agent',
  );
  const newAgentsSkills = installed.skills.filter((s) => s.origin === 'new-agents');
  const officialOtherSkills = installed.skills.filter((s) => s.origin === 'official-other');
  const customPreexistingSkills = installed.skills.filter((s) => s.origin === 'custom-agents');
  const customOtherSkills = installed.skills.filter((s) => s.origin === 'custom-other');

  // Colisiones reales: un skill personalizado colisiona con el nombre de un skill oficial
  const customNames = new Set(customPreexistingSkills.map((s) => s.name.toLowerCase()));
  const legacyOfficialNames = new Set(legacySkills.filter((s) => s.isOfficial).map((s) => s.name.toLowerCase()));
  const newOfficialNames = new Set(newAgentsSkills.filter((s) => s.isOfficial).map((s) => s.name.toLowerCase()));

  const nameCollisions: string[] = [];
  for (const name of customNames) {
    if (legacyOfficialNames.has(name) || newOfficialNames.has(name)) {
      nameCollisions.push(name);
    }
  }

  const conflicts = [...(installed.conflicts ?? [])];

  return {
    legacySkills,
    newAgentsSkills,
    officialOtherSkills,
    customPreexistingSkills,
    customOtherSkills,
    nameCollisions,
    conflicts,
  };
}

/**
 * Entradas desacopladas para la matriz de actualización.
 */
export interface UpdateMatrixInputs {
  versionClass?: OpenSpecEngineStatus['cli']['versionClass'];
  freshnessState?: OpenSpecEngineStatus['freshnessState'];
  integrationState?: OpenSpecEngineStatus['integrationState'];
  repoState?: OpenSpecEngineStatus['repoState'];
  installedIntegration?: OpenSpecEngineStatus['installedIntegration'];
}

export type UpdateBlockReason =
  | 'cli-not-installed'
  | 'version-unknown'
  | 'legacy-coexistence'
  | 'unconfigured-tools'
  | 'customized'
  | 'evidence-unknown'
  | 'unclassified';

/**
 * Deriva la acción requerida de actualización evaluando de forma independiente
 * los tres ejes: compatibilidad del motor, novedad en npm y vigencia de la integración (Tarea 1.3).
 *
 * Reglas fundamentales:
 * - Novedad en npm ('cli-upgrade-available') informa al usuario pero NO fuerza 'update' sobre el repositorio.
 * - Si el motor es compatible ('supported') y la integración está al día ('up-to-date'), la acción es 'none'.
 * - Si el motor es 'too-old', se requiere 'upgrade-init' o 'upgrade-update'.
 * - Si el motor es ausente o desconocido, se bloquea ('blocked').
 * - Si el repo no está inicializado ('not-initialized'), la acción es 'init' (o 'upgrade-init').
 * - Si la integración está desactualizada ('outdated'), la acción es 'update'.
 * - Si la integración tiene conflictos ('conflicted') o es personalizada ('custom'), se bloquea ('blocked').
 */
export function deriveUpdateMatrixAction(
  inputs: UpdateMatrixInputs | OpenSpecEngineStatus | null | undefined,
): OpenSpecUpdatePlan['requiredAction'] {
  if (!inputs) return 'blocked';

  const versionClass = ('cli' in inputs && inputs.cli)
    ? (inputs.cli.versionClass ?? (inputs.cli.runtimeVersion ? 'supported' : undefined))
    : (inputs as UpdateMatrixInputs).versionClass;
  const integrationState = inputs.integrationState;
  const repoState = inputs.repoState;
  const isCliInstalled = ('cli' in inputs && inputs.cli) ? inputs.cli.installed : true;

  if (!isCliInstalled || !versionClass || versionClass === 'unknown') {
    return repoState === 'not-initialized' && !isCliInstalled ? 'init' : 'blocked';
  }

  if (versionClass === 'too-old') {
    return repoState === 'not-initialized' ? 'upgrade-init' : 'upgrade-update';
  }

  if (repoState === 'not-initialized') {
    return 'init';
  }

  if (integrationState === 'up-to-date') {
    return 'none';
  }

  if (integrationState === 'outdated') {
    return 'update';
  }

  return 'blocked';
}

/**
 * Deriva el motivo del bloqueo cuando la acción de actualización es 'blocked'.
 * Devuelve un código tipado o null cuando la operación no está bloqueada.
 */
export function deriveUpdateBlockReason(
  inputs: UpdateMatrixInputs | OpenSpecEngineStatus | null | undefined,
): UpdateBlockReason | null {
  if (!inputs) return 'cli-not-installed';

  const isCliInstalled = ('cli' in inputs && inputs.cli) ? inputs.cli.installed : true;
  const repoState = inputs.repoState;

  if (!isCliInstalled) {
    return repoState === 'not-initialized' ? null : 'cli-not-installed';
  }

  const versionClass = ('cli' in inputs && inputs.cli)
    ? (inputs.cli.versionClass ?? (inputs.cli.runtimeVersion ? 'supported' : undefined))
    : (inputs as UpdateMatrixInputs).versionClass;

  if (!versionClass || versionClass === 'unknown') {
    return 'version-unknown';
  }

  const installed = ('installedIntegration' in inputs && inputs.installedIntegration)
    ? inputs.installedIntegration
    : (inputs as UpdateMatrixInputs).installedIntegration;

  const hasLegacySkills = installed?.skills?.some(
    (s) => s.origin === 'legacy-codex' || s.origin === 'legacy-agent',
  );

  if (hasLegacySkills) {
    return 'legacy-coexistence';
  }

  const configured = installed?.configuredTools ?? installed?.tools ?? [];
  const hasUnconfiguredTools = installed?.presentToolDirectories?.some(
    (tool) => isOpenSpecConfigurableTool(tool) && !configured.includes(tool),
  );

  if (hasUnconfiguredTools) {
    return 'unconfigured-tools';
  }

  const action = deriveUpdateMatrixAction(inputs);
  if (action !== 'blocked') {
    return null;
  }

  const integrationState = inputs.integrationState;

  if (integrationState === 'custom') {
    return 'customized';
  }

  if (integrationState === 'unknown' || installed?.evidenceStatus === 'unknown' || repoState === 'unknown') {
    return 'evidence-unknown';
  }

  return 'unclassified';
}

/**
 * Devuelve la clave de i18n para el motivo por el cual la actualización está detenida
 * o la integración no quedó al día.
 */
export function getUpdateBlockReasonKey(
  input: UpdateBlockReason | UpdateMatrixInputs | OpenSpecEngineStatus | null | undefined,
): string {
  const reason = typeof input === 'string' ? input : deriveUpdateBlockReason(input);
  switch (reason) {
    case 'cli-not-installed':
      return 'pipeline.openspec.engine.matrix.blockedCliNotInstalled';
    case 'version-unknown':
      return 'pipeline.openspec.engine.matrix.blockedVersionUnknown';
    case 'legacy-coexistence':
      return 'pipeline.openspec.engine.matrix.blockedLegacyCoexistence';
    case 'unconfigured-tools':
      return 'pipeline.openspec.engine.summary.reasonUnconfiguredTools';
    case 'customized':
      return 'pipeline.openspec.engine.matrix.blockedCustomized';
    case 'evidence-unknown':
      return 'pipeline.openspec.engine.matrix.blockedEvidenceUnknown';
    case 'unclassified':
    default:
      return 'pipeline.openspec.engine.matrix.blockedUnclassified';
  }
}

/**
 * Deriva el comando oficial literal a sugerir al usuario según la matriz de actualización (Tarea 6.2).
 *
 * Devuelve el comando exacto (sin traducir ni alterar) o `null` si no corresponde ejecutar nada
 * o si la actualización se encuentra bloqueada.
 */
export function deriveOfficialCommand(
  action: OpenSpecUpdatePlan['requiredAction'],
  status: OpenSpecEngineStatus | null | undefined,
): string | null {
  if (action === 'none' || action === 'blocked') {
    return null;
  }

  if (action === 'update' || action === 'upgrade-update') {
    return 'openspec update';
  }

  if (action === 'init' || action === 'upgrade-init') {
    const presentTools = status?.installedIntegration?.presentToolDirectories ?? [];
    const toolsArg = presentTools.length > 0 ? presentTools.join(',') : 'agents';
    return `openspec init --tools ${toolsArg}`;
  }

  return null;
}
