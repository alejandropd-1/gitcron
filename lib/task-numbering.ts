/**
 * Cálculo y sugerencia de numeración para tareas de OpenSpec en tasks.md.
 *
 * Tarea 4.11: El número de la tarea es un dato de primera clase.
 * Función pura que sugiere el número siguiente en formato `N.M` para una
 * tarea que se va a insertar (al final, en un grupo, o después de una tarea concreta).
 *
 * Reglas:
 * 1. Formato `N.M` (ej: `1.1`, `1.2`, `2.1`).
 * 2. Archivo vacío: sugiere `'1.1'`.
 * 3. Si el archivo viene en `1.1, 1.2`, sugiere `'1.3'`.
 * 4. Si se inserta en un grupo vacío `2`, sugiere `'2.1'`.
 * 5. Si la última tarea no tiene número, calcula a partir de la última numerada o arranca el grupo.
 * 6. Nunca repite un número existente en el archivo.
 */

export interface TaskItemLike {
  id?: string;
  text: string;
}

export interface SuggestNextTaskNumberOptions {
  /** Índice o posición (0-based) de la tarea después de la cual se inserta. */
  insertAfterIndex?: number;
  /** Id de la tarea después de la cual se inserta. */
  insertAfterId?: string;
  /** Grupo numérico explícito (ej: 2 para sección `## 2. ...`). */
  targetGroup?: number;
  /** Contenido crudo de tasks.md para analizar encabezados de sección. */
  markdown?: string;
}

/** Extrae grupo y sub-número de un prefijo de tarea (ej: `1.2 `, `2.1 -`, `3. `). */
export function extractTaskNumber(text: string): { group: number; sub: number; raw: string } | null {
  const clean = text.trim().replace(/^-\s*\[[ xX]\]\s*/, '');
  const match = clean.match(/^(\d+)(?:\.(\d+))?(?:[a-z]|\b|\s)/i);
  if (!match) return null;
  const group = parseInt(match[1], 10);
  const sub = match[2] !== undefined ? parseInt(match[2], 10) : 1;
  if (Number.isNaN(group) || Number.isNaN(sub)) return null;
  return { group, sub, raw: `${group}.${sub}` };
}

interface ParsedTaskInfo {
  index: number;
  id?: string;
  text: string;
  group: number;
  sub?: number;
}

interface MarkdownStructure {
  groups: number[];
  tasks: ParsedTaskInfo[];
  lastGroupEndedEmpty: boolean;
  lastGroupNumber: number | null;
}

/** Analiza la estructura de grupos y tareas de un texto Markdown tasks.md. */
function parseMarkdownStructure(markdown: string): MarkdownStructure {
  const lines = markdown.split(/\r?\n/);
  const groups: number[] = [];
  const tasks: ParsedTaskInfo[] = [];
  let currentGroup = 1;
  let hasSeenGroupHeading = false;
  let tasksInCurrentGroup = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detección de encabezado de grupo (ej: `## 1. Maquetación`, `## 2. Un vigilante`)
    const headingMatch = trimmed.match(/^#{1,3}\s+(\d+)(?:[.\s]|$)/);
    if (headingMatch) {
      currentGroup = parseInt(headingMatch[1], 10);
      if (!groups.includes(currentGroup)) {
        groups.push(currentGroup);
      }
      hasSeenGroupHeading = true;
      tasksInCurrentGroup = 0;
      continue;
    }

    // Detección de línea de tarea (ej: `- [ ] 1.1 Primera tarea`)
    const taskMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const taskText = taskMatch[2].trim();
      const num = extractTaskNumber(taskText);
      const effectiveGroup = num ? num.group : currentGroup;
      tasks.push({
        index: tasks.length,
        text: taskText,
        group: effectiveGroup,
        sub: num?.sub,
      });
      tasksInCurrentGroup++;
    }
  }

  const lastGroupNumber = groups.length > 0 ? groups[groups.length - 1] : (hasSeenGroupHeading ? currentGroup : null);
  const lastGroupEndedEmpty = hasSeenGroupHeading && tasksInCurrentGroup === 0;

  return {
    groups,
    tasks,
    lastGroupEndedEmpty,
    lastGroupNumber,
  };
}

/**
 * Sugiere el siguiente número de tarea en formato `N.M`.
 *
 * @param input Lista de tareas (TaskEvidence[] o TaskItemLike[]) o string completo con el markdown de tasks.md.
 * @param options Opciones de contexto (índice, targetGroup, markdown complementario).
 */
export function suggestNextTaskNumber(
  input: Array<TaskItemLike | string> | string,
  options?: SuggestNextTaskNumberOptions,
): string {
  // 1. Recopilar todas las tareas y números existentes
  const allExistingNumbers = new Set<string>();
  const parsedTasks: ParsedTaskInfo[] = [];
  let mdStructure: MarkdownStructure | null = null;

  if (typeof input === 'string') {
    mdStructure = parseMarkdownStructure(input);
    for (const t of mdStructure.tasks) {
      parsedTasks.push(t);
      if (t.sub !== undefined) {
        allExistingNumbers.add(`${t.group}.${t.sub}`);
      }
    }
  } else {
    // Array de tareas
    if (options?.markdown) {
      mdStructure = parseMarkdownStructure(options.markdown);
      for (const t of mdStructure.tasks) {
        if (t.sub !== undefined) {
          allExistingNumbers.add(`${t.group}.${t.sub}`);
        }
      }
    }

    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const text = typeof item === 'string' ? item : item.text;
      const id = typeof item === 'object' && item !== null ? item.id : undefined;
      const num = extractTaskNumber(text);
      if (num) {
        allExistingNumbers.add(num.raw);
        parsedTasks.push({ index: i, id, text, group: num.group, sub: num.sub });
      } else {
        parsedTasks.push({ index: i, id, text, group: 1 });
      }
    }
  }

  // 2. Determinar grupo de destino
  let targetGroup: number;

  if (options?.targetGroup !== undefined) {
    targetGroup = options.targetGroup;
  } else if (options?.insertAfterId !== undefined || options?.insertAfterIndex !== undefined) {
    // Inserción contextual: ubicar tarea de referencia
    let refIdx = -1;
    if (options.insertAfterId !== undefined) {
      refIdx = parsedTasks.findIndex((t) => t.id === options.insertAfterId);
    }
    if (refIdx === -1 && options.insertAfterIndex !== undefined) {
      refIdx = options.insertAfterIndex;
    }

    if (refIdx >= 0 && refIdx < parsedTasks.length) {
      // Buscar última tarea numerada hacia atrás desde la referencia
      let foundGroup: number | null = null;
      for (let j = refIdx; j >= 0; j--) {
        if (parsedTasks[j].sub !== undefined) {
          foundGroup = parsedTasks[j].group;
          break;
        }
      }
      targetGroup = foundGroup ?? parsedTasks[refIdx].group ?? 1;
    } else {
      targetGroup = 1;
    }
  } else if (mdStructure?.lastGroupEndedEmpty && mdStructure.lastGroupNumber !== null) {
    // El archivo termina con un encabezado de grupo vacío (ej: `## 2. Segundo grupo`)
    targetGroup = mdStructure.lastGroupNumber;
  } else {
    // Inserción al final por omisión:
    // Buscar la última tarea con número en todo el archivo
    let lastNumbered: ParsedTaskInfo | null = null;
    for (let j = parsedTasks.length - 1; j >= 0; j--) {
      if (parsedTasks[j].sub !== undefined) {
        lastNumbered = parsedTasks[j];
        break;
      }
    }

    if (lastNumbered) {
      targetGroup = lastNumbered.group;
    } else if (mdStructure?.lastGroupNumber !== null && mdStructure?.lastGroupNumber !== undefined) {
      targetGroup = mdStructure.lastGroupNumber;
    } else {
      targetGroup = 1;
    }
  }

  // 3. Determinar el sub-número sugerido dentro de targetGroup
  // Encontrar todas las tareas pertenecientes a targetGroup
  const groupTasks = parsedTasks.filter((t) => t.group === targetGroup && t.sub !== undefined);
  let candidateSub = 1;

  if (groupTasks.length > 0) {
    // Última tarea numerada en este grupo o máximo existente
    const maxSubInGroup = Math.max(...groupTasks.map((t) => t.sub!));
    candidateSub = maxSubInGroup + 1;
  } else {
    // Grupo nuevo o sin tareas numeradas: arranca en 1
    candidateSub = 1;
  }

  // 4. Garantizar que nunca colisione con ningún número existente en el archivo
  while (allExistingNumbers.has(`${targetGroup}.${candidateSub}`)) {
    candidateSub++;
  }

  return `${targetGroup}.${candidateSub}`;
}
