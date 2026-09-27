import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createHash } from 'node:crypto';
import type {
  OpenSpecInstalledEvidence,
  OpenSpecInstalledSkill,
  OpenSpecOutputItem,
  OpenSpecToolReport,
} from '../../types/pipeline';
import {
  OFFICIAL_WORKFLOW_MAP,
  OPENSPEC_TOOL_DIRECTORIES,
  getToolDef,
  type OpenSpecToolDef,
} from './openspec-tooling';
import { buildFallbackToolReport } from './openspec-engine-tools';
import { isContainedWithin } from '../ipc/authorized-repos';

export interface InspectInstalledEvidenceDeps {
  lstat?: (p: string) => fs.Stats | null;
  readdir?: (p: string) => string[];
  readFile?: (p: string) => string;
  realpath?: (p: string) => string | null;
  getHomeDir?: () => string;
  toolReport?: OpenSpecToolReport | null;
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

export interface ReadSharedSkillTargetDeps {
  lstat?: (p: string) => fs.Stats | null;
  readFile?: (p: string) => string;
  realpath?: (p: string) => string | null;
  onEscape?: (realMarkerPath: string) => void;
}

/**
 * Resuelve la herramienta dueña de la carpeta compartida `.agents/skills`
 * a partir de la marca `.agents/skills/.openspec-target` (Decisiones 9 y 12).
 *
 * Aplica contención de rutas respecto a la raíz del repositorio y sólo devuelve
 * un `toolId` si corresponde a una herramienta configurable por OpenSpec.
 */
export function readSharedSkillTarget(
  repoPath: string,
  deps: ReadSharedSkillTargetDeps = {},
): string | null {
  const realpathFn = deps.realpath ?? defaultRealpath;
  const lstatFn = deps.lstat ?? defaultLstat;
  const readFileFn = deps.readFile ?? defaultReadFile;

  let canonicalRepoRoot: string | null = null;
  try {
    canonicalRepoRoot = realpathFn(repoPath) ?? repoPath;
  } catch {
    return null;
  }

  const sharedTargetMarkerPath = path.join(repoPath, '.agents', 'skills', '.openspec-target');
  if (canonicalRepoRoot) {
    let realMarkerPath = sharedTargetMarkerPath;
    try {
      realMarkerPath = realpathFn(sharedTargetMarkerPath) ?? sharedTargetMarkerPath;
    } catch {
      realMarkerPath = sharedTargetMarkerPath;
    }
    if (!isContainedWithin(canonicalRepoRoot, realMarkerPath)) {
      deps.onEscape?.(realMarkerPath);
      return null;
    }
  }

  try {
    const markerStat = lstatFn(sharedTargetMarkerPath);
    if (!markerStat?.isFile()) return null;
    const targetToolName = readFileFn(sharedTargetMarkerPath).trim();
    if (!targetToolName) return null;
    const toolDef = getToolDef(targetToolName);
    if (!toolDef) return null;
    return toolDef.toolId;
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
  const scannedSkillDirs = new Set<string>();

  // 1. Agrupar la tabla oficial por carpeta física real (kind + directory)
  const toolGroups = new Map<string, OpenSpecToolDef[]>();
  for (const toolDef of OPENSPEC_TOOL_DIRECTORIES) {
    const key = `${toolDef.kind}:${toolDef.directory}`;
    const list = toolGroups.get(key) ?? [];
    list.push(toolDef);
    toolGroups.set(key, list);
  }

  // Inspeccionar cada carpeta física única
  for (const tools of toolGroups.values()) {
    const primary = tools.find((t) => t.toolId === 'agents') ?? tools[0];
    const isGlobal = primary.kind === 'external-global';
    let targetPath: string;
    let parentDir: string;

    if (isGlobal && primary.toolId === 'minimax-code') {
      parentDir = getHomeDir();
      targetPath = path.join(parentDir, '.minimax');
    } else {
      parentDir = repoPath;
      targetPath = path.join(repoPath, primary.directory);
    }

    const observedCasing = getObservedCasing(parentDir, primary.directory, safeReaddir);
    const { stat: toolStat, isAbsent, isError } = safeLstat(targetPath);
    const targetName = tools.length > 1 ? tools.map((t) => t.label).join(', ') : primary.label;
    const outputId = primary.directory === '.agents' ? 'output-agents' : `output-${primary.toolId}`;
    const isBlocked = tools.some((t) => t.blocked);

    if (isAbsent) {
      outputInventory.push({
        id: outputId,
        targetName,
        kind: primary.kind,
        displayPath: primary.displayPath,
        descriptionKey: primary.descriptionKey,
        blocked: isBlocked,
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
        id: outputId,
        targetName,
        kind: primary.kind,
        displayPath: primary.displayPath,
        descriptionKey: primary.descriptionKey,
        blocked: isBlocked,
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
          conflictsList.push(`Symlink o junction en ${primary.directory} apunta fuera del repositorio: ${symlinkTarget}`);
        }
      }
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

      if (!scannedSkillDirs.has(primary.directory)) {
        scannedSkillDirs.add(primary.directory);

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

            let origin: OpenSpecInstalledSkill['origin'];
            if (primary.directory === '.agents') {
              origin = isOfficial ? 'new-agents' : 'custom-agents';
            } else if (isOfficial) {
              origin = 'official-other';
            } else if (getToolDef(primary.toolId)) {
              origin = 'custom-other';
            } else {
              origin = 'unknown';
            }

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
    }

    if (detectedOfficialWorkflows.length > 0) {
      if (primary.directory === '.agents') {
        installedWorkflowsByTarget['agents'] = Array.from(new Set(detectedOfficialWorkflows)).sort();
      } else {
        for (const t of tools) {
          installedWorkflowsByTarget[t.toolId] = Array.from(new Set(detectedOfficialWorkflows)).sort();
        }
      }
    }

    // Una carpeta sólo se marca 'present' si contiene workflows oficiales de OpenSpec.
    // Si no contiene workflows oficiales (o no hay skills), figura 'absent' para OpenSpec.
    const isPresent = detectedOfficialWorkflows.length > 0;
    const presenceState: OpenSpecOutputItem['presenceState'] = isConflicting
      ? 'conflicting'
      : isPresent
        ? 'present'
        : 'absent';

    outputInventory.push({
      id: outputId,
      targetName,
      kind: primary.kind,
      displayPath: primary.displayPath,
      descriptionKey: primary.descriptionKey,
      blocked: isBlocked,
      presenceState,
      entryType: isSymlink ? 'symlink' : 'directory',
      isSymlink,
      symlinkTarget,
      casing: observedCasing,
      contentHash: presenceState === 'absent' ? null : (folderHash || null),
      hashTruncated,
    });
  }

  // 1.5. Inspeccionar directorios legacy (.codex y .agent) si existen
  const legacySpecs: Array<{ dir: string; toolId: string; origin: 'legacy-codex' | 'legacy-agent' }> = [
    { dir: '.codex', toolId: 'codex', origin: 'legacy-codex' },
    { dir: '.agent', toolId: 'antigravity', origin: 'legacy-agent' },
  ];

  for (const leg of legacySpecs) {
    const legPath = path.join(repoPath, leg.dir);
    const { stat: legStat, isAbsent } = safeLstat(legPath);
    if (isAbsent || !legStat) continue;

    const skillsSubDir = path.join(legPath, 'skills');
    let dirToInspect = legPath;
    if (safeLstat(skillsSubDir).stat?.isDirectory()) {
      dirToInspect = skillsSubDir;
    }

    const { entries } = safeReaddir(dirToInspect);
    if (entries.length > 0) {
      const legWorkflows: string[] = [];
      for (const entry of [...entries].sort()) {
        const entryPath = path.join(dirToInspect, entry);
        const wf = skillToWorkflowName(entry);
        const isOfficial = wf !== null;

        if (isOfficial && wf) {
          legWorkflows.push(wf);
        }

        const origin: OpenSpecInstalledSkill['origin'] = isOfficial ? leg.origin : 'custom-other';

        skills.push({
          name: entry,
          path: entryPath,
          origin,
          isOfficial,
        });

        if (isOfficial && !generatedBy) {
          const skillMdPath = path.join(entryPath, 'SKILL.md');
          const content = safeReadFile(skillMdPath);
          const gen = extractGeneratedByHeader(content);
          if (gen) generatedBy = gen;
        }
      }

      if (legWorkflows.length > 0) {
        installedWorkflowsByTarget[leg.toolId] = Array.from(new Set(legWorkflows)).sort();
      }
    }
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

  // 4. Derivar herramientas configuradas y presentes desde el informe del motor o el respaldo (Decisiones 3 y 4)
  const toolReport =
    deps.toolReport ??
    buildFallbackToolReport({
      repoPath,
      deps: {
        realpath: (p) => realpathFn(p),
        readFile: (p) => safeReadFile(p),
        readdir: (p) => safeReaddir(p).entries,
        existsSync: (p) => !safeLstat(p).isAbsent,
      },
    });

  const configuredTools = toolReport.tools.filter((t) => t.configured).map((t) => t.id);
  const presentToolDirectories = toolReport.tools.filter((t) => t.available).map((t) => t.id);
  const targetsFound = new Set(configuredTools);
  if (installedWorkflowsByTarget['agents']) {
    for (const toolId of configuredTools) {
      const def = getToolDef(toolId);
      if (def?.skillsDir === '.agents' && !installedWorkflowsByTarget[toolId]) {
        installedWorkflowsByTarget[toolId] = installedWorkflowsByTarget['agents'];
      }
    }
  }

  // Conflictos entre legacy y nuevos si ambos están presentes (mirando origen de skills para legacy)
  const hasLegacy = skills.some((s) => s.origin === 'legacy-codex' || s.origin === 'legacy-agent');
  const hasNew = skills.some((s) => s.origin === 'new-agents');
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

  const legacyTools = new Set<string>();
  for (const s of skills) {
    if (s.origin === 'legacy-codex') legacyTools.add('codex');
    if (s.origin === 'legacy-agent') legacyTools.add('antigravity');
  }

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
    legacy: Array.from(legacyTools).sort(),
    customized: skills.filter((s) => !s.isOfficial).map((s) => s.name),
    conflicts: conflictsList.length > 0 ? conflictsList : null,
  };
}
