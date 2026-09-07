/**
 * Operaciones sobre tareas en `tasks.md`, y su registro.
 *
 * Módulo puro y sin dependencias: se prueba entero con tablas de entrada y
 * salida. No lee ni escribe disco: la orquestación y validación de seguridad
 * viven en `electron/ipc/pipeline-tasks.ts`.
 *
 * Decisiones arquitectónicas (Tarea 2.6):
 * a. Numeración: el número es un identificador, no un lugar. Mover una línea
 *    mueve su número con ella y no se renumera ninguna otra línea (regla de 2.1:
 *    «sin alterar ninguna línea ajena a la operación»). `addTaskLine` no
 *    sintetiza números automáticos para evitar colisiones con esquemas no
 *    lineales (ej. 3b, 9c); el número es parte del identificador provisto por
 *    el llamador.
 * b. Encabezado del registro: `# Registro de tareas`. Los registros existentes
 *    con el encabezado anterior (`# Registro de tildes`) no se reescriben.
 * c. Tolerancia de `expectedText`: coincidencia exacta estricta para
 *    `editTaskText`, `removeTaskLine` y `moveTaskLine`. Mover o editar sobre
 *    coincidencia de prefijo arriesga alterar la tarea equivocada si el archivo
 *    cambió concurrentemente.
 *
 * Medición de actor (Tarea 2.2):
 * Ni Electron ni el renderer conocen intrínsecamente si una acción provino de
 * una persona o un agente; para no inventar un valor por omisión que mienta,
 * el actor es explícito y opcional (`'persona' | 'agente'`). Si no se provee,
 * se anota la operación sin fingir procedencia.
 */

/** Casilla de tarea: sangría, estado, numeración opcional y texto. */
const TASK_LINE = /^(\s*-\s*\[)([ xX])(\]\s*)(.*)$/;

/** Prefijo numérico o identificador de tarea (ej: `1.1 `, `3b.2 `, `4. `). */
const TASK_NUMBER_PREFIX = /^(\d+[a-z]?(?:\.\d+[a-z]?)*\.?\s+)/i;

export type TaskToggleResult =
  | { ok: true; content: string; text: string }
  /**
   * `mismatch` es el caso importante: la línea existe pero dice otra cosa. Con
   * el watcher andando el archivo puede cambiar entre que se dibujó la pantalla
   * y llegó el clic, y escribir igual marcaría la tarea equivocada en silencio.
   */
  | { ok: false; reason: 'not-found' | 'mismatch' };

export type TaskOperationFailureReason =
  | 'not-found'
  | 'mismatch'
  | 'not-a-task'
  | 'empty-text'
  | 'out-of-bounds';

export type TaskOperationResult =
  | { ok: true; content: string; text: string }
  | { ok: false; reason: TaskOperationFailureReason };

export type TaskOperationType =
  | 'marcada'
  | 'desmarcada'
  | 'agregada'
  | 'editada'
  | 'movida'
  | 'eliminada';

export type TaskActor = 'persona' | 'agente';

export interface AddTaskOptions {
  line?: number;
  position?: 'above' | 'below' | 'end';
  expectedText?: string;
}

function detectEol(content: string): string {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Marca o desmarca la tarea de una línea.
 *
 * La línea viene de `sourceRef`, que es la ubicación exacta; `expectedText` es
 * la verificación de que sigue siendo la misma tarea. Buscar sólo por texto no
 * alcanzaría: dos tareas pueden decir lo mismo en secciones distintas.
 */
export function toggleTaskCheckbox(
  tasksMarkdown: string,
  line: number,
  expectedText: string,
  completed: boolean,
): TaskToggleResult {
  const eol = detectEol(tasksMarkdown);
  const lines = tasksMarkdown.split(/\r?\n/);
  const index = line - 1;
  const raw = lines[index];
  if (raw === undefined) return { ok: false, reason: 'not-found' };

  const match = TASK_LINE.exec(raw);
  if (!match) return { ok: false, reason: 'not-found' };

  const [, open, , close, text] = match;
  if (text.trim() !== expectedText.trim() && !expectedText.trim().startsWith(text.trim())) {
    return { ok: false, reason: 'mismatch' };
  }

  lines[index] = `${open}${completed ? 'x' : ' '}${close}${text}`;
  return { ok: true, content: lines.join(eol), text: text.trim() };
}

/**
 * Agrega una nueva tarea en `tasks.md`.
 *
 * No sintetiza números automáticos: si el llamador incluye un identificador
 * (ej: `2.6 Nueva tarea`), se conserva; si no, queda sin número.
 * Preserva sangría y maneja archivos vacíos o sin salto de línea final.
 */
export function addTaskLine(
  tasksMarkdown: string,
  text: string,
  options?: AddTaskOptions,
): TaskOperationResult {
  const clean = text.trim();
  if (!clean) return { ok: false, reason: 'empty-text' };

  const stripped = clean.replace(/^-\s*\[[ xX]\]\s*/, '');
  if (!stripped) return { ok: false, reason: 'empty-text' };

  const eol = detectEol(tasksMarkdown);

  if (tasksMarkdown.trim() === '') {
    return {
      ok: true,
      content: `- [ ] ${stripped}${eol}`,
      text: stripped,
    };
  }

  const lines = tasksMarkdown.split(/\r?\n/);

  if (options?.line !== undefined) {
    const targetIndex = options.line - 1;
    if (targetIndex < 0 || targetIndex >= lines.length) {
      return { ok: false, reason: 'out-of-bounds' };
    }

    const targetRaw = lines[targetIndex];
    if (options.expectedText !== undefined) {
      const targetMatch = TASK_LINE.exec(targetRaw);
      const actualTargetText = targetMatch ? targetMatch[4].trim() : targetRaw.trim();
      if (actualTargetText !== options.expectedText.trim()) {
        return { ok: false, reason: 'mismatch' };
      }
    }

    const indentMatch = targetRaw.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    const newLine = `${indent}- [ ] ${stripped}`;
    const insertIndex = options.position === 'above' ? targetIndex : targetIndex + 1;
    lines.splice(insertIndex, 0, newLine);
  } else {
    const newLine = `- [ ] ${stripped}`;
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.splice(lines.length - 1, 0, newLine);
    } else {
      lines.push(newLine);
    }
  }

  return { ok: true, content: lines.join(eol), text: stripped };
}

/**
 * Edita el texto de una tarea existente.
 *
 * Preserva estrictamente la sangría, el estado de la casilla (`[ ]` o `[x]`),
 * y la numeración existente (si la tenía y el nuevo texto no la incluye).
 * Exige coincidencia exacta de `expectedText` para evitar sobreescritura accidental.
 */
export function editTaskText(
  tasksMarkdown: string,
  line: number,
  expectedText: string,
  newText: string,
): TaskOperationResult {
  const cleanNew = newText.trim();
  if (!cleanNew) return { ok: false, reason: 'empty-text' };

  const strippedNew = cleanNew.replace(/^-\s*\[[ xX]\]\s*/, '');
  if (!strippedNew) return { ok: false, reason: 'empty-text' };

  const eol = detectEol(tasksMarkdown);
  const lines = tasksMarkdown.split(/\r?\n/);
  const index = line - 1;
  const raw = lines[index];
  if (raw === undefined) return { ok: false, reason: 'not-found' };

  const match = TASK_LINE.exec(raw);
  if (!match) return { ok: false, reason: 'not-a-task' };

  const [, open, check, close, actualText] = match;
  if (actualText.trim() !== expectedText.trim()) {
    return { ok: false, reason: 'mismatch' };
  }

  const numMatch = actualText.trim().match(TASK_NUMBER_PREFIX);
  let finalText: string;
  if (numMatch && !strippedNew.match(TASK_NUMBER_PREFIX)) {
    finalText = `${numMatch[1]}${strippedNew}`;
  } else {
    finalText = strippedNew;
  }

  lines[index] = `${open}${check}${close}${finalText}`;
  return { ok: true, content: lines.join(eol), text: finalText.trim() };
}

/**
 * Mueve una tarea de una línea a otra.
 *
 * No renumera ninguna línea ajena a la operación: el número viaja con la tarea.
 * Exige coincidencia exacta de `expectedText`.
 */
export function moveTaskLine(
  tasksMarkdown: string,
  fromLine: number,
  toLine: number,
  expectedText: string,
): TaskOperationResult {
  const eol = detectEol(tasksMarkdown);
  const lines = tasksMarkdown.split(/\r?\n/);
  const fromIndex = fromLine - 1;
  const toIndex = toLine - 1;

  if (fromIndex < 0 || fromIndex >= lines.length) {
    return { ok: false, reason: 'not-found' };
  }
  if (toIndex < 0 || toIndex >= lines.length) {
    return { ok: false, reason: 'out-of-bounds' };
  }

  const raw = lines[fromIndex];
  const match = TASK_LINE.exec(raw);
  if (!match) return { ok: false, reason: 'not-a-task' };

  const [, , , , actualText] = match;
  if (actualText.trim() !== expectedText.trim()) {
    return { ok: false, reason: 'mismatch' };
  }

  if (fromIndex === toIndex) {
    return { ok: true, content: tasksMarkdown, text: actualText.trim() };
  }

  const [removed] = lines.splice(fromIndex, 1);
  lines.splice(toIndex, 0, removed);

  return { ok: true, content: lines.join(eol), text: actualText.trim() };
}

/**
 * Elimina una línea de tarea.
 *
 * Exige coincidencia exacta de `expectedText`. Deja las demás líneas intactas.
 */
export function removeTaskLine(
  tasksMarkdown: string,
  line: number,
  expectedText: string,
): TaskOperationResult {
  const eol = detectEol(tasksMarkdown);
  const lines = tasksMarkdown.split(/\r?\n/);
  const index = line - 1;

  if (index < 0 || index >= lines.length) {
    return { ok: false, reason: 'not-found' };
  }

  const raw = lines[index];
  const match = TASK_LINE.exec(raw);
  if (!match) return { ok: false, reason: 'not-a-task' };

  const [, , , , actualText] = match;
  if (actualText.trim() !== expectedText.trim()) {
    return { ok: false, reason: 'mismatch' };
  }

  lines.splice(index, 1);
  const content = lines.length === 1 && lines[0] === '' ? '' : lines.join(eol);

  return { ok: true, content, text: actualText.trim() };
}

/**
 * Línea del registro de cambios sobre tareas.
 *
 * Pensada para leerse sin herramientas: una línea por cambio, con fecha,
 * actor (opcional), operación y texto de la tarea.
 */
export function composeTaskLogEntry(
  at: string,
  text: string,
  operation: TaskOperationType | boolean,
  actor?: TaskActor,
): string {
  const stamp = at.replace('T', ' ').slice(0, 16);
  const op: TaskOperationType =
    typeof operation === 'boolean'
      ? (operation ? 'marcada' : 'desmarcada')
      : operation;

  if (actor) {
    return `- ${stamp} — ${actor} — ${op} — "${text}"`;
  }
  return `- ${stamp} — ${op} — "${text}"`;
}

const LOG_HEADING = '# Registro de tareas';

/**
 * Agrega la entrada al registro, creando el encabezado si el archivo no existe.
 * Los registros preexistentes que comiencen con `# Registro de tildes` se conservan
 * sin modificar ni duplicar encabezados.
 */
export function appendTaskLogEntry(existing: string | null, entry: string): string {
  const body = existing?.trimEnd();
  if (!body) return `${LOG_HEADING}\n\n${entry}\n`;
  return `${body}\n${entry}\n`;
}
