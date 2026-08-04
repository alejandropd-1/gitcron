/**
 * Cambio de estado de una tarea en `tasks.md`, y su registro.
 *
 * `markSignatureTask` hacía esta misma operación pero sólo para una tarea de
 * texto literal, y se retiró con la convención de la firma. Ésta es la versión
 * general: cualquier tarea, en las dos direcciones.
 *
 * Puro y sin dependencias: se prueba entero con tablas de entrada y salida.
 */

/** Casilla de tarea: sangría, estado, numeración opcional y texto. */
const TASK_LINE = /^(\s*-\s*\[)([ xX])(\]\s*)(.*)$/;

export type TaskToggleResult =
  | { ok: true; content: string; text: string }
  /**
   * `mismatch` es el caso importante: la línea existe pero dice otra cosa. Con
   * el watcher andando el archivo puede cambiar entre que se dibujó la pantalla
   * y llegó el clic, y escribir igual marcaría la tarea equivocada en silencio.
   */
  | { ok: false; reason: 'not-found' | 'mismatch' };

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
  const lines = tasksMarkdown.split(/\r?\n/);
  const index = line - 1;
  const raw = lines[index];
  if (raw === undefined) return { ok: false, reason: 'not-found' };

  const match = TASK_LINE.exec(raw);
  if (!match) return { ok: false, reason: 'not-found' };

  const [, open, , close, text] = match;
  if (text.trim() !== expectedText.trim()) return { ok: false, reason: 'mismatch' };

  lines[index] = `${open}${completed ? 'x' : ' '}${close}${text}`;
  return { ok: true, content: lines.join('\n'), text: text.trim() };
}

/**
 * Línea del registro de cambios de estado.
 *
 * Pensada para leerse sin herramientas: una línea por cambio, con la fecha, la
 * tarea y hacia dónde fue. Vive en el repositorio para que la pueda leer
 * cualquiera, con o sin la aplicación.
 */
export function composeTaskLogEntry(at: string, text: string, completed: boolean): string {
  const stamp = at.replace('T', ' ').slice(0, 16);
  return `- ${stamp} — ${completed ? 'marcada' : 'desmarcada'} — "${text}"`;
}

const LOG_HEADING = '# Registro de tildes';

/** Agrega la entrada al registro, creando el encabezado si el archivo no existe. */
export function appendTaskLogEntry(existing: string | null, entry: string): string {
  const body = existing?.trimEnd();
  if (!body) return `${LOG_HEADING}\n\n${entry}\n`;
  return `${body}\n${entry}\n`;
}
