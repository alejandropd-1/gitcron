import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createHash } from 'node:crypto';
import type {
  OpenSpecInstalledEvidence,
  OpenSpecInstalledSkill,
  OpenSpecOutputItem,
} from '../../types/pipeline';
import {
  OFFICIAL_WORKFLOW_MAP,
  OPENSPEC_TOOL_DIRECTORIES,
  getToolDef,
  type OpenSpecToolDef,
} from './openspec-tooling';
import { isContainedWithin } from '../ipc/authorized-repos';

export interface InspectInstalledEvidenceDeps {
  lstat?: (p: string) => fs.Stats | null;
  readdir?: (p: string) => string[];
  readFile?: (p: string) => string;
  realpath?: (p: string) => string | null;
  getHomeDir?: () => string;
}

function defaultLstat(p: string): fs.Stats | null {
  return fs.lstatSync(p);
}

function defaultReaddir(p: string): string[] {
  return fs.readdirSync(p);
}

function defaultReadFile(p: string): string {
  return fs.readFileSync(p, 'utf8');
}

function defaultRealpath(p: string): string | null {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
}

/**
 * Convierte un nombre de artefacto/skill a su nombre de workflow oficial 1.8.
 * Sólo devuelve el nombre de workflow si pertenece al conjunto oficial exacto.
 * Cualquier otro nombre (ej. `openspec-mi-flujo`) devuelve `null`.
 */
export function skillToWorkflowName(skillName: string): string | null {
  if (!skillName || typeof skillName !== 'string') return null;
  const clean = skillName.replace(/\.(md|yml|yaml|prompt)$/i, '');
  return OFFICIAL_WORKFLOW_MAP[clean] ?? null;
}

/**
 * Extrae la cabecera `generatedBy` de un archivo SKILL.md o .openspec.yaml.
 */
export function extractGeneratedByHeader(content: string): string | null {
  if (!content) return null;
  const match = /generatedBy:\s*["']?(?:openspec[@/])?([0-9a-z.-]+)["']?/i.exec(content);
  return match && match[1] ? match[1] : null;
}

/**
 * Obtiene el casing real observado en disco enumerando el directorio padre.
 */
function getObservedCasing(
  parentDir: string,
  expectedName: string,
  safeReaddir: (p: string) => { entries: string[]; isError: boolean },
): string {
  const { entries } = safeReaddir(parentDir);
  const match = entries.find((e) => e.toLowerCase() === expectedName.toLowerCase());
  return match ?? expectedName;
}

/**
 * Topes del recorrido de contenido (invariante 19). Este código corre en el
 * proceso principal de Electron: un recorrido sin límites sobre un árbol
 * profundo, muy ancho o cíclico congela la aplicación entera sin posibilidad
 * de cancelar.
 */
export const DIR_HASH_MAX_DEPTH = 16;
export const DIR_HASH_MAX_ENTRIES = 10_000;

export interface DirContentHashResult {
  /** Huella SHA-256 (16 hex) sensible al contenido; `null` si el recorrido se truncó. */
  hash: string | null;
  /** `true` cuando se alcanzó un tope y la lectura es parcial: no se reporta convergencia sobre ella. */
  truncated: boolean;
}

/**
 * Computa una huella SHA-256 sensible al contenido de todos los archivos
 * del directorio administrado, sensible a cambios en los archivos internos (ej. SKILL.md).
 *
 * El recorrido está acotado: tope de profundidad, tope de entradas procesadas
 * y conjunto de rutas ya visitadas (canonicalizadas con `/`) que corta la
 * reentrada. Al alcanzar cualquier tope devuelve `truncated: true` y `hash: null`
 * en vez de un hash parcial presentado como completo.
 */
function computeDirContentHash(
  baseDir: string,
  safeReaddir: (p: string) => { entries: string[]; isError: boolean },
  safeLstat: (p: string) => { stat: fs.Stats | null; isAbsent: boolean; isError: boolean },
  safeReadFile: (p: string) => string,
): DirContentHashResult {
  const hasher = createHash('sha256');
  const queue: Array<{ rel: string; depth: number }> = [{ rel: '', depth: 0 }];
  const visited = new Set<string>(['']);
  let processedEntries = 0;
  let hasFiles = false;
  let truncated = false;
  let entriesCapHit = false;

  while (queue.length > 0 && !entriesCapHit) {
    const { rel, depth } = queue.shift()!;
    const current = rel ? path.join(baseDir, rel) : baseDir;
    const { entries } = safeReaddir(current);
    for (const entry of entries.sort()) {
      // `fs.readdir` real nunca devuelve '.' ni '..'; un doble sí puede.
      if (entry === '' || entry === '.' || entry === '..') continue;
      processedEntries += 1;
      if (processedEntries > DIR_HASH_MAX_ENTRIES) {
        truncated = true;
        entriesCapHit = true;
        break;
      }
      const childRel = rel ? path.join(rel, entry) : entry;
      const canonicalChild = childRel.replace(/\\/g, '/');
      if (visited.has(canonicalChild)) continue;
      visited.add(canonicalChild);
      const childFull = path.join(baseDir, childRel);
      const st = safeLstat(childFull).stat;
      if (st?.isDirectory()) {
        if (depth + 1 > DIR_HASH_MAX_DEPTH) {
          truncated = true;
          continue;
        }
        queue.push({ rel: childRel, depth: depth + 1 });
      } else if (st?.isFile()) {
        hasFiles = true;
        const content = safeReadFile(childFull);
        const fileHash = createHash('sha256').update(content).digest('hex');
        hasher.update(`${canonicalChild}:${content.length}:${fileHash}\n`);
      }
    }
  }

  if (truncated) return { hash: null, truncated: true };
  return { hash: hasFiles ? hasher.digest('hex').slice(0, 16) : '', truncated: false };
}

/**
 * Inspecciona la evidencia de integración instalada en un repositorio.
 */
export function inspectInstalledEvidence(
  repoPath: string,
  deps: InspectInstalledEvidenceDeps = {},
): OpenSpecInstalledEvidence {
  const lstatFn = deps.lstat ?? defaultLstat;
  const readdirFn = deps.readdir ?? defaultReaddir;
  const readFileFn = deps.readFile ?? defaultReadFile;
  const realpathFn = deps.realpath ?? defaultRealpath;
  const getHomeDir = deps.getHomeDir ?? (() => os.homedir());

  const skills: OpenSpecInstalledSkill[] = [];
  const markersFound: string[] = [];
  let generatedBy: string | null = null;
  let hasReadError = false;
  let hasTraversalTruncation = false;

  const presentToolDirectories: string[] = [];
  const configuredTools: string[] = [];
  const targetsFound = new Set<string>();
  const installedWorkflowsByTarget: Record<string, string[]> = {};
  const conflictsList: string[] = [];

  let canonicalRepoRoot: string | null = null;
  try {
    canonicalRepoRoot = realpathFn(repoPath) ?? repoPath;
  } catch {
    hasReadError = true;
  }

  const safeLstat = (p: string): { stat: fs.Stats | null; isAbsent: boolean; isError: boolean } => {
    try {
      const st = lstatFn(p);
      if (st === null) {
        return { stat: null, isAbsent: true, isError: false };
      }
      return { stat: st, isAbsent: false, isError: false };
    } catch (err: any) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        return { stat: null, isAbsent: true, isError: false };
      }
      hasReadError = true;
      return { stat: null, isAbsent: false, isError: true };
    }
  };

  const safeReaddir = (p: string): { entries: string[]; isError: boolean } => {
    try {
      const entries = readdirFn(p);
      return { entries, isError: false };
    } catch (err: any) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        return { entries: [], isError: false };
      }
      hasReadError = true;
      return { entries: [], isError: true };
    }
  };

  const safeReadFile = (p: string): string => {
    try {
      return readFileFn(p);
    } catch (err: any) {
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        return '';
      }
      hasReadError = true;
      return '';
    }
  };

  const outputInventory: OpenSpecOutputItem[] = [];

  // 1. Inspeccionar cada target en la tabla oficial
  for (const toolDef of OPENSPEC_TOOL_DIRECTORIES) {
    const isGlobal = toolDef.kind === 'external-global';
    let targetPath: string;
    let parentDir: string;

    if (isGlobal && toolDef.toolId === 'minimax-code') {
      parentDir = getHomeDir();
      targetPath = path.join(parentDir, '.minimax');
    } else {
      parentDir = repoPath;
      targetPath = path.join(repoPath, toolDef.directory);
    }

    const observedCasing = getObservedCasing(parentDir, toolDef.directory, safeReaddir);
    const { stat: toolStat, isAbsent, isError } = safeLstat(targetPath);

    if (isAbsent) {
      outputInventory.push({
        id: `output-${toolDef.toolId}`,
        targetName: toolDef.label,
        kind: toolDef.kind,
        displayPath: toolDef.displayPath,
        descriptionKey: toolDef.descriptionKey,
        blocked: toolDef.blocked,
        presenceState: 'absent',
        entryType: 'absent',
        isSymlink: false,
        symlinkTarget: null,
        casing: observedCasing,
        contentHash: null,
      });
      continue;
    }

    if (isError || !toolStat) {
      outputInventory.push({
        id: `output-${toolDef.toolId}`,
        targetName: toolDef.label,
        kind: toolDef.kind,
        displayPath: toolDef.displayPath,
        descriptionKey: toolDef.descriptionKey,
        blocked: toolDef.blocked,
        presenceState: 'unreadable',
        entryType: 'directory',
        isSymlink: false,
        symlinkTarget: null,
        casing: observedCasing,
        contentHash: null,
      });
      continue;
    }

    // Comprobación de symlink y escape del contenedor
    const isSymlink = toolStat.isSymbolicLink();
    let symlinkTarget: string | null = null;
    let isConflicting = false;

    if (isSymlink) {
      symlinkTarget = realpathFn(targetPath);
      if (!isGlobal && canonicalRepoRoot && symlinkTarget) {
        if (!isContainedWithin(canonicalRepoRoot, symlinkTarget)) {
          isConflicting = true;
          conflictsList.push(`Symlink o junction en ${toolDef.directory} apunta fuera del repositorio: ${symlinkTarget}`);
        }
      }
    }

    if (!isGlobal) {
      presentToolDirectories.push(toolDef.toolId);
    }

    // Leer entradas de habilidades o workflows
    let detectedOfficialWorkflows: string[] = [];
    let detectedCustomSkillsCount = 0;
    let folderHash = '';
    let hashTruncated = false;

    if (!isConflicting) {
      const skillsSubDir = path.join(targetPath, 'skills');
      const rulesSubDir = path.join(targetPath, 'rules');
      const workflowsSubDir = path.join(targetPath, 'workflows');
      const promptsSubDir = path.join(targetPath, 'prompts');

      let dirToInspect = targetPath;
      if (safeLstat(skillsSubDir).stat?.isDirectory()) {
        dirToInspect = skillsSubDir;
      } else if (safeLstat(rulesSubDir).stat?.isDirectory()) {
        dirToInspect = rulesSubDir;
      } else if (safeLstat(workflowsSubDir).stat?.isDirectory()) {
        dirToInspect = workflowsSubDir;
      } else if (safeLstat(promptsSubDir).stat?.isDirectory()) {
        dirToInspect = promptsSubDir;
      }

      const hashResult = computeDirContentHash(dirToInspect, safeReaddir, safeLstat, safeReadFile);
      folderHash = hashResult.hash ?? '';
      hashTruncated = hashResult.truncated;
      if (hashTruncated) hasTraversalTruncation = true;

      const { entries } = safeReaddir(dirToInspect);
      if (entries.length > 0) {
        const sortedEntries = [...entries].sort();

        for (const entry of sortedEntries) {
          const entryPath = path.join(dirToInspect, entry);
          const wf = skillToWorkflowName(entry);
          const isOfficial = wf !== null;

          if (isOfficial && wf) {
            detectedOfficialWorkflows.push(wf);
          } else {
            detectedCustomSkillsCount++;
          }

          let origin: OpenSpecInstalledSkill['origin'] = 'custom-agents';
          if (toolDef.toolId === 'codex') origin = 'legacy-codex';
          else if (toolDef.toolId === 'antigravity') origin = 'legacy-agent';
          else if (toolDef.toolId === 'agents' && isOfficial) origin = 'new-agents';
          else if (toolDef.toolId === 'agents') origin = 'custom-agents';

          skills.push({
            name: entry,
            path: entryPath,
            origin,
            isOfficial,
          });

          // Intentar leer generatedBy de SKILL.md
          if (isOfficial && !generatedBy) {
            const skillMdPath = path.join(entryPath, 'SKILL.md');
            const content = safeReadFile(skillMdPath);
            const gen = extractGeneratedByHeader(content);
            if (gen) generatedBy = gen;
          }
        }
      }
    }

    if (detectedOfficialWorkflows.length > 0) {
      configuredTools.push(toolDef.toolId);
      targetsFound.add(toolDef.toolId);
      installedWorkflowsByTarget[toolDef.toolId] = Array.from(new Set(detectedOfficialWorkflows)).sort();
    }

    outputInventory.push({
      id: `output-${toolDef.toolId}`,
      targetName: toolDef.label,
      kind: toolDef.kind,
      displayPath: toolDef.displayPath,
      descriptionKey: toolDef.descriptionKey,
      blocked: toolDef.blocked,
      presenceState: isConflicting ? 'conflicting' : 'present',
      entryType: isSymlink ? 'symlink' : 'directory',
      isSymlink,
      symlinkTarget,
      casing: observedCasing,
      contentHash: folderHash || null,
      hashTruncated,
    });
  }

  // 2. Comprobar .openspec.yaml para markers y generatedBy
  const openspecYamlPath = path.join(repoPath, '.openspec.yaml');
  const openspecYamlStat = safeLstat(openspecYamlPath);
  if (openspecYamlStat.stat?.isFile()) {
    markersFound.push('.openspec.yaml');
    if (!generatedBy) {
      const content = safeReadFile(openspecYamlPath);
      const gen = extractGeneratedByHeader(content);
      if (gen) generatedBy = gen;
    }
  }

  // 3. Comprobar directorio openspec/
  const openspecDirPath = path.join(repoPath, 'openspec');
  const openspecDirStat = safeLstat(openspecDirPath);
  if (openspecDirStat.stat?.isDirectory()) {
    markersFound.push('openspec/');
  }

  // Conflictos entre legacy y nuevos si ambos están presentes
  const hasLegacy = configuredTools.includes('antigravity') || configuredTools.includes('codex');
  const hasNew = configuredTools.includes('agents');
  if (hasLegacy && hasNew) {
    conflictsList.push('Coexistencia de configuración legacy (.codex/.agent) y nueva (.agents).');
  }

  // Un recorrido truncado degrada la evidencia a `unknown`: no se reporta
  // convergencia sobre una lectura parcial del árbol.
  const evidenceStatus: OpenSpecInstalledEvidence['evidenceStatus'] = hasReadError || hasTraversalTruncation
    ? 'unknown'
    : markersFound.length > 0 || configuredTools.length > 0 || presentToolDirectories.length > 0
    ? 'confirmed'
    : 'unconfirmed';

  // Separar agentes interactivos de integraciones CI o globales
  const configuredAgentsCount = configuredTools.filter((t) => getToolDef(t)?.isInteractiveAgent).length;
  const totalPresentAgentsCount = presentToolDirectories.filter((t) => getToolDef(t)?.isInteractiveAgent).length;

  return {
    skills,
    generatedBy,
    markersFound,
    outputInventory,
    evidenceStatus,
    tools: configuredTools,
    targets: Array.from(targetsFound),
    configuredTools,
    presentToolDirectories,
    configuredAgentsCount,
    totalPresentAgentsCount,
    configuredCount: configuredAgentsCount,
    totalPresentCount: totalPresentAgentsCount,
    installedWorkflowsByTarget,
    missing: configuredTools.length === 0 && markersFound.length > 0 ? ['openspec-tooling'] : null,
    legacy: configuredTools.filter((t) => t === 'codex' || t === 'antigravity'),
    customized: skills.filter((s) => !s.isOfficial).map((s) => s.name),
    conflicts: conflictsList.length > 0 ? conflictsList : null,
  };
}
