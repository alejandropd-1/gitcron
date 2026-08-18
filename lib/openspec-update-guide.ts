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
