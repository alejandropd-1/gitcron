import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface DeltaSpecRequirementIssue {
  capability: string;
  requirement: string;
  operation: 'MODIFIED' | 'REMOVED';
  reason: string;
}

export interface IncompleteTaskIssue {
  id: string;
  text: string;
}

export interface DeltaValidationResult {
  valid: boolean;
  errors: string[];
  requirementIssues: DeltaSpecRequirementIssue[];
  incompleteTasks: IncompleteTaskIssue[];
  hasIncompleteTasks: boolean;
}

const SECTION_HEADER_REGEX = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements/i;
const REQUIREMENT_TITLE_REGEX = /^###\s+(?:Requirement|FROM\s+Requirement):\s*(.+)$/i;
const TASK_LINE_REGEX = /^-\s+\[( |x|X)\]\s+(?:(\d+(?:\.\d+)*)[.)]?\s+)?(.*)$/;

/**
 * Parsea los títulos de requisitos declarados en un archivo de spec markdown.
 */
export function extractRequirementTitlesFromMarkdown(content: string): Set<string> {
  const titles = new Set<string>();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = REQUIREMENT_TITLE_REGEX.exec(line.trim());
    if (match?.[1]) {
      titles.add(match[1].trim());
    }
  }
  return titles;
}

/**
 * Parsea los requisitos por sección de operación (MODIFIED, REMOVED, etc.) de una delta spec.
 */
export function parseDeltaSpecRequirements(content: string): Map<'MODIFIED' | 'REMOVED' | 'ADDED' | 'RENAMED', string[]> {
  const result = new Map<'MODIFIED' | 'REMOVED' | 'ADDED' | 'RENAMED', string[]>([
    ['ADDED', []],
    ['MODIFIED', []],
    ['REMOVED', []],
    ['RENAMED', []],
  ]);

  let currentSection: 'MODIFIED' | 'REMOVED' | 'ADDED' | 'RENAMED' | null = null;
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      const sectionMatch = SECTION_HEADER_REGEX.exec(trimmed);
      if (sectionMatch?.[1]) {
        currentSection = sectionMatch[1].toUpperCase() as 'MODIFIED' | 'REMOVED' | 'ADDED' | 'RENAMED';
      } else {
        currentSection = null;
      }
      continue;
    }

    if (currentSection && trimmed.startsWith('### ')) {
      const reqMatch = REQUIREMENT_TITLE_REGEX.exec(trimmed);
      if (reqMatch?.[1]) {
        result.get(currentSection)?.push(reqMatch[1].trim());
      }
    }
  }

  return result;
}

/**
 * Comprueba que cada bloque `## MODIFIED Requirements` y `## REMOVED Requirements`
 * apunte a un requisito que efectivamente exista en la spec consolidada correspondiente.
 * También verifica si el change tiene tareas sin completar antes de archivar.
 */
export async function validateChangeDeltaRequirements(
  repoPath: string,
  changeId: string,
): Promise<DeltaValidationResult> {
  const errors: string[] = [];
  const requirementIssues: DeltaSpecRequirementIssue[] = [];
  const incompleteTasks: IncompleteTaskIssue[] = [];

  // 1. Validar tareas incompletas en tasks.md (Tarea 3.2)
  const taskFilePath = path.join(repoPath, 'openspec', 'changes', changeId, 'tasks.md');
  try {
    const taskContent = await fs.readFile(taskFilePath, 'utf-8');
    const lines = taskContent.split(/\r?\n/);
    for (const line of lines) {
      const match = TASK_LINE_REGEX.exec(line.trim());
      if (match) {
        const isDone = match[1].toLowerCase() === 'x';
        if (!isDone) {
          const id = match[2] || `task-${incompleteTasks.length + 1}`;
          const text = match[3] || line.trim();
          incompleteTasks.push({ id, text });
        }
      }
    }
  } catch {
    // Si no existe tasks.md, no hay tareas pendientes registradas
  }

  if (incompleteTasks.length > 0) {
    errors.push(`El change tiene ${incompleteTasks.length} tarea(s) sin completar. OpenSpec validate --archived requiere que todas las tareas estén completas antes de archivar.`);
  }

  // 2. Validar correspondencia de MODIFIED / REMOVED en delta specs (Tarea 3.5)
  const deltaSpecsDir = path.join(repoPath, 'openspec', 'changes', changeId, 'specs');
  let specEntries: string[] = [];
  try {
    specEntries = await fs.readdir(deltaSpecsDir);
  } catch {
    // Si no existe la carpeta specs, no hay delta specs que validar
    specEntries = [];
  }

  for (const entry of specEntries) {
    let capability = entry;
    let deltaFilePath = path.join(deltaSpecsDir, entry);

    try {
      const stat = await fs.stat(deltaFilePath);
      if (stat.isDirectory()) {
        capability = entry;
        deltaFilePath = path.join(deltaSpecsDir, entry, 'spec.md');
      } else if (entry.endsWith('.md')) {
        capability = entry.slice(0, -3);
      } else {
        continue;
      }

      const deltaContent = await fs.readFile(deltaFilePath, 'utf-8');
      const parsedOperations = parseDeltaSpecRequirements(deltaContent);

      const modifiedReqs = parsedOperations.get('MODIFIED') ?? [];
      const removedReqs = parsedOperations.get('REMOVED') ?? [];

      if (modifiedReqs.length === 0 && removedReqs.length === 0) {
        continue;
      }

      // Buscar spec consolidada
      let consolidatedContent: string | null = null;
      const candidateSpecPath1 = path.join(repoPath, 'openspec', 'specs', capability, 'spec.md');
      const candidateSpecPath2 = path.join(repoPath, 'openspec', 'specs', `${capability}.md`);

      try {
        consolidatedContent = await fs.readFile(candidateSpecPath1, 'utf-8');
      } catch {
        try {
          consolidatedContent = await fs.readFile(candidateSpecPath2, 'utf-8');
        } catch {
          consolidatedContent = null;
        }
      }

      if (!consolidatedContent) {
        const msg = `La spec consolidada «${capability}» no existe en openspec/specs/. No se pueden modificar ni eliminar requisitos de una spec que no existe previamente.`;
        errors.push(msg);
        for (const req of modifiedReqs) {
          requirementIssues.push({ capability, requirement: req, operation: 'MODIFIED', reason: 'Spec consolidada inexistente' });
        }
        for (const req of removedReqs) {
          requirementIssues.push({ capability, requirement: req, operation: 'REMOVED', reason: 'Spec consolidada inexistente' });
        }
        continue;
      }

      const consolidatedTitles = extractRequirementTitlesFromMarkdown(consolidatedContent);

      for (const req of modifiedReqs) {
        if (!consolidatedTitles.has(req)) {
          const msg = `El requisito «${req}» declarado como MODIFIED en «${capability}» no existe en openspec/specs/${capability}/spec.md (corresponde declararlo como ADDED).`;
          errors.push(msg);
          requirementIssues.push({ capability, requirement: req, operation: 'MODIFIED', reason: 'Requisito no encontrado en spec consolidada' });
        }
      }

      for (const req of removedReqs) {
        if (!consolidatedTitles.has(req)) {
          const msg = `El requisito «${req}» declarado como REMOVED en «${capability}» no existe en openspec/specs/${capability}/spec.md.`;
          errors.push(msg);
          requirementIssues.push({ capability, requirement: req, operation: 'REMOVED', reason: 'Requisito no encontrado en spec consolidada' });
        }
      }
    } catch {
      // Ignorar archivos no legibles
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    requirementIssues,
    incompleteTasks,
    hasIncompleteTasks: incompleteTasks.length > 0,
  };
}
