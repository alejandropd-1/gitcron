import * as fs from 'node:fs';
import * as path from 'node:path';
import { simpleGit } from 'simple-git';
import type {
  OpenSpecEngineStatus,
  OpenSpecLegacySkillPlanItem,
  OpenSpecLegacySkillsPlan,
  OpenSpecRemoveLegacySkillsResult,
} from '../../types/pipeline';
import { inspectInstalledEvidence } from './openspec-evidence';
import { withRepoWatcherPaused } from '../ipc/watchers';
import { buildEngineStatusSnapshot } from '../ipc/pipeline-openspec';

export interface LegacySkillsDeps {
  inspectEvidence?: typeof inspectInstalledEvidence;
  simpleGitInstance?: typeof simpleGit;
  pauseWatcher?: typeof withRepoWatcherPaused;
  buildStatusSnapshot?: typeof buildEngineStatusSnapshot;
  rm?: (p: string, options?: fs.RmOptions) => Promise<void>;
  statusDeps?: any;
}

/**
 * Plan de retiro de copias viejas de instrucciones (Decisión 8 / Tarea 6.3).
 *
 * Examina cada skill con procedencia `legacy-codex` o `legacy-agent` medido
 * por `inspectInstalledEvidence`. Para cada uno verifica su estado en Git:
 * - `removable: true` si está seguido en Git y sin cambios pendientes.
 * - `removable: false, reason: 'untracked'` si no está seguido en Git.
 * - `removable: false, reason: 'modified'` si tiene cambios sin confirmar.
 */
export async function getLegacySkillsPlan(
  repoPath: string,
  deps: LegacySkillsDeps = {},
): Promise<OpenSpecLegacySkillsPlan> {
  const inspectEvidence = deps.inspectEvidence ?? inspectInstalledEvidence;
  const evidence = inspectEvidence(repoPath);

  const legacySkills = evidence.skills.filter(
    (s) => s.origin === 'legacy-codex' || s.origin === 'legacy-agent',
  );

  if (legacySkills.length === 0) {
    return { items: [] };
  }

  const uniqueSkills = new Map<string, (typeof legacySkills)[0]>();
  for (const s of legacySkills) {
    if (!uniqueSkills.has(s.path)) {
      uniqueSkills.set(s.path, s);
    }
  }

  const gitFn = deps.simpleGitInstance ?? simpleGit;
  const git = gitFn(repoPath);
  const items: OpenSpecLegacySkillPlanItem[] = [];

  for (const skill of uniqueSkills.values()) {
    const relPath = path.relative(repoPath, skill.path).replace(/\\/g, '/');

    let tracked = '';
    try {
      tracked = (await git.raw(['ls-files', '--', relPath])).trim();
    } catch {
      tracked = '';
    }

    if (!tracked) {
      items.push({
        name: skill.name,
        path: skill.path,
        origin: skill.origin as 'legacy-codex' | 'legacy-agent',
        removable: false,
        reason: 'untracked',
      });
      continue;
    }

    let porcelain = '';
    try {
      porcelain = (await git.raw(['status', '--porcelain', '--', relPath])).trim();
    } catch {
      porcelain = '';
    }

    if (porcelain) {
      items.push({
        name: skill.name,
        path: skill.path,
        origin: skill.origin as 'legacy-codex' | 'legacy-agent',
        removable: false,
        reason: 'modified',
      });
      continue;
    }

    items.push({
      name: skill.name,
      path: skill.path,
      origin: skill.origin as 'legacy-codex' | 'legacy-agent',
      removable: true,
    });
  }

  return { items };
}

/**
 * Retira copias viejas de instrucciones desde el proceso principal (Decisión 8 / Tarea 6.3).
 *
 * Recalcula el plan en el backend (no acepta rutas libres del renderer),
 * borra únicamente las retirables con `fs.rm` recursivo bajo `withRepoWatcherPaused`,
 * NO confirma nada en Git, y devuelve `{ removed, skipped, engineStatus }` con el estado recalculado.
 */
export async function removeLegacySkills(
  repoPath: string,
  deps: LegacySkillsDeps = {},
): Promise<OpenSpecRemoveLegacySkillsResult> {
  const plan = await getLegacySkillsPlan(repoPath, deps);
  const removed: string[] = [];
  const skipped: Array<{ path: string; reason: 'untracked' | 'modified' }> = [];
  const pauseWatcher = deps.pauseWatcher ?? withRepoWatcherPaused;
  const rmFn = deps.rm ?? fs.promises.rm;

  await pauseWatcher(repoPath, async () => {
    for (const item of plan.items) {
      if (!item.removable) {
        skipped.push({ path: item.path, reason: item.reason ?? 'untracked' });
        continue;
      }

      try {
        await rmFn(item.path, { recursive: true, force: true });
        removed.push(item.path);
      } catch {
        skipped.push({ path: item.path, reason: 'modified' });
      }
    }
  });

  const buildStatus = deps.buildStatusSnapshot ?? buildEngineStatusSnapshot;
  const engineStatus = await buildStatus(repoPath, deps.statusDeps);

  return {
    removed,
    skipped,
    engineStatus,
  };
}
