/**
 * Manifiesto de commit y tarea de firma de un change.
 *
 * Ambas cosas existen por el mismo motivo: hay información que no es deducible
 * y que por lo tanto se declara en lugar de adivinarse.
 *
 * - **El alcance del commit** no se puede inferir del árbol: puede haber varios
 *   changes en curso a la vez y ningún indicio dice qué archivo es de cuál.
 * - **La tarea de firma** no se puede identificar por posición ni por parecido
 *   de texto. Marcar "la que quede" convertiría el checkbox en "se apretó el
 *   botón", y el archivo afirmaría trabajo que nadie hizo, congelado para
 *   siempre porque archivar no se revierte.
 */

/**
 * Texto exacto de la tarea que marca el archivado.
 *
 * Declara lo que el click prueba —que una persona confirmó el archivado desde
 * la aplicación, con el alcance a la vista— y nada más. No dice "QA aprobado"
 * a propósito: el gesto no demuestra que se haya revisado el resultado, y un
 * checkbox no puede afirmar más de lo que su hecho respalda.
 */
export const SIGNATURE_TASK_TEXT = 'Archivado confirmado por Ale desde la aplicación';

export interface CommitManifest {
  message: string;
  /** Archivos del trabajo, uno por uno. Nunca directorios. */
  files: string[];
}

/**
 * Lee `commit.md`: el mensaje bajo `## Mensaje` y las rutas bajo `## Archivos`.
 *
 * Devuelve `null` si falta cualquiera de las dos: un manifiesto a medias no se
 * completa con defaults, porque el default sería commitear de más o de menos.
 */
export function parseCommitManifest(content: string): CommitManifest | null {
  const messageBlock = /^##\s+Mensaje\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/im.exec(content)?.[1] ?? '';
  const filesBlock = /^##\s+Archivos\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/im.exec(content)?.[1] ?? '';

  const message = messageBlock.trim();
  const files = filesBlock
    .split(/\r?\n/)
    .map((line) => /^\s*[-*]\s+(.+?)\s*$/.exec(line)?.[1] ?? '')
    .map((entry) => entry.replace(/^`|`$/g, '').trim())
    // Una ruta que escape del repositorio o que nombre un directorio no entra:
    // el contrato es enumerar archivos, y la contención la sostiene esto.
    .filter((entry) => entry.length > 0 && !entry.includes('..') && !entry.endsWith('/'));

  if (!message || files.length === 0) return null;
  return { message, files };
}

/**
 * Marca la tarea de firma en el markdown de tareas.
 *
 * Coincide contra el literal declarado y **sólo** contra él. Cualquier otra
 * tarea pendiente conserva su estado: si quedó trabajo sin hacer, el archivo
 * tiene que decirlo.
 */
export function markSignatureTask(tasksMarkdown: string): { content: string; marked: boolean } {
  let marked = false;
  const content = tasksMarkdown.replace(
    /^(\s*-\s*\[)( )(\]\s*(?:\d+(?:\.\d+)*)?\s*)(.*)$/gm,
    (whole, open: string, _box: string, middle: string, text: string) => {
      if (marked || text.trim() !== SIGNATURE_TASK_TEXT) return whole;
      marked = true;
      return `${open}x${middle}${text}`;
    },
  );
  return { content, marked };
}

/** Rutas que siempre pertenecen al commit del trabajo, sin necesidad de declararlas. */
export function deterministicChangePaths(changeId: string, changedFiles: string[]): string[] {
  const changeRoot = `openspec/changes/${changeId}/`;
  return changedFiles.filter((file) => file.startsWith(changeRoot));
}

/** Rutas que produce el archivado: el destino, el origen borrado y las specs consolidadas. */
export function archiveCommitPaths(changeId: string, changedFiles: string[]): string[] {
  return changedFiles.filter((file) => (
    file.startsWith('openspec/changes/archive/')
    || file.startsWith(`openspec/changes/${changeId}/`)
    || file.startsWith('openspec/specs/')
  ));
}
