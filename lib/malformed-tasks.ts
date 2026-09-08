/**
 * Detección de tareas mal formadas en archivos Markdown (OpenSpec tasks.md).
 *
 * Tarea 8.3: Función pura que detecta líneas que aparentan una tarea mal formada:
 * - Empiezan con guión o numeración y su casilla no cumple el formato esperado
 *   (ej: `- []`, `-[ ]`, `1. []`, `1. [ ]`, `-[x]`, `* [ ]`).
 * - NO genera falsos positivos sobre:
 *   - Encabezados Markdown (`#`, `##`, `###`, etc.)
 *   - Listas estándar (`- item`, `* item`) sin corchetes de casilla
 *   - Sub-listas de texto
 *   - Citas (`>`)
 *   - Bloques de código (``` o ~~~)
 *   - Prosa suelta o texto explicativo con guiones
 *
 * Tarea 8.4: Los resultados se muestran como avisos no bloqueantes en la lista
 * interactiva y en el editor de texto crudo sin impedir guardar.
 */

export interface MalformedTaskLine {
  line: number;
  raw: string;
  reason: string;
}

/**
 * Analiza el contenido de un archivo Markdown y devuelve las líneas que
 * aparentan ser tareas mal formadas.
 */
export function findMalformedTaskLines(content: string): MalformedTaskLine[] {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const results: MalformedTaskLine[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // 1. Ignorar delimitadores de bloques de código (``` o ~~~)
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // 2. Ignorar líneas vacías
    if (!trimmed) continue;

    // 3. Ignorar encabezados (#, ##, ###, etc.)
    if (/^#{1,6}\s/.test(trimmed)) continue;

    // 4. Ignorar citas / blockquotes (> ...)
    if (trimmed.startsWith('>')) continue;

    // 5. Tarea válida según el formato OpenSpec (- [ ] texto o - [x] texto)
    if (/^\s*-\s+\[([ xX])\]\s+\S/.test(raw)) {
      continue;
    }

    // 6. Guion pegado a corchete sin espacio separador: `-[ ]`, `-[x]`, `-[]`, etc.
    if (/^\s*-\[/.test(raw)) {
      results.push({
        line: i + 1,
        raw,
        reason: 'El guion debe estar separado de los corchetes por un espacio (- [ ]).',
      });
      continue;
    }

    // 7. Guion seguido de espacio(s) y corchetes que no cumplen la sintaxis de casilla:
    // Casos: `- []` (vacío), `- [  ]` (múltiples espacios), `- [?]` (símbolo inválido), o `- [ ]` sin texto.
    const hyphenBracketMatch = /^\s*-\s+\[([^\]]*)\](.*)$/.exec(raw);
    if (hyphenBracketMatch) {
      const inside = hyphenBracketMatch[1];
      const after = hyphenBracketMatch[2];
      if (inside === '') {
        results.push({
          line: i + 1,
          raw,
          reason: 'La casilla está vacía (-[] o - []). Debe tener un espacio (- [ ]) o una x (- [x]).',
        });
        continue;
      }
      if (inside !== ' ' && inside !== 'x' && inside !== 'X') {
        results.push({
          line: i + 1,
          raw,
          reason: `Estado de casilla no válido "[${inside}]". Solo se admite "[ ]" o "[x]".`,
        });
        continue;
      }
      if (!after.trim()) {
        results.push({
          line: i + 1,
          raw,
          reason: 'La tarea no tiene descripción posterior a la casilla.',
        });
        continue;
      }
    }

    // 8. Numeración con corchetes de casilla: `1. []`, `1. [ ]`, `1. [x]`, `1) [ ]`, etc.
    const numberedBracketMatch = /^\s*\d+[\.\)]\s*\[([^\]]*)\]/.exec(raw);
    if (numberedBracketMatch) {
      results.push({
        line: i + 1,
        raw,
        reason: 'Las tareas deben comenzar con un guion (- [ ]), no con numeración de lista.',
      });
      continue;
    }

    // 9. Asterisco con corchetes de casilla: `* [ ]`, `* []`, `*[ ]`, etc.
    if (/^\s*\*\[|^\s*\*\s+\[([^\]]*)\]/.test(raw)) {
      results.push({
        line: i + 1,
        raw,
        reason: 'Las tareas deben comenzar con guion (- [ ]), no con asterisco (* [ ]).',
      });
      continue;
    }
  }

  return results;
}
