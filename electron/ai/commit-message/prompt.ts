// electron/ai/commit-message/prompt.ts
//
// Qué se le manda al modelo para que redacte el asunto de un commit.
//
// Puro sobre sus entradas: el diff, el cambio y las tareas llegan como
// parámetros. Es lo que permite probarlo con tablas, igual que
// `lib/change-commit-scope.ts`, y lo que evita que este módulo termine sabiendo
// de Git.

/**
 * El pedido, en una línea y con formato convencional.
 *
 * Se le dice explícitamente que el tipo salga del diff y no de la
 * documentación: en un change de OpenSpec casi todos los archivos tocados son
 * markdown, y un modelo que mira el conteo de archivos concluye `docs` cuando el
 * trabajo fue una función nueva.
 */
export const SYSTEM_PROMPT = [
  'Sos un asistente que redacta el asunto de un commit de Git. Respondés UNA sola línea, nada más.',
  'Formato: <tipo>(<alcance>): <descripción en castellano, imperativo, sin punto final>',
  'Tipos posibles: feat, fix, chore, refactor, style, test, docs.',
  'Elegí el tipo mirando qué hace el diff, no lo que dice la documentación.',
  'Máximo 72 caracteres.',
].join('\n');

/**
 * Cuántos caracteres entran por token, para presupuestar sin tokenizar.
 *
 * Medido sobre un prompt real: 14.782 caracteres dieron 4.649 tokens, o sea 3,18
 * caracteres por token. Se usa 3 —por debajo de lo medido— para que la
 * estimación se quede corta y no de más: pasarse del contexto es un fallo duro,
 * mientras que recortar de más sólo cuesta un poco de detalle.
 */
export const CHARS_PER_TOKEN = 3;

/**
 * Qué proporción del contexto puede ocupar la entrada.
 *
 * La otra mitad queda para el razonamiento y la respuesta, que en los modelos
 * medidos es lo que más consume: gemma-4-12b gastó 1.585 tokens pensando para
 * devolver una línea de 60 caracteres.
 */
export const INPUT_CONTEXT_SHARE = 0.5;

/**
 * Techo de tokens de salida por omisión.
 *
 * Medido: con 200 y con 1.200 la respuesta llega vacía porque el razonamiento se
 * come el presupuesto; con 3.000 sale el contenido. Es un piso derivado de una
 * medición, no un número elegido, y quien llama puede subirlo —qwen3.5-9b
 * necesitó 8.000—.
 */
export const DEFAULT_MAX_TOKENS = 3_000;

/** Cuántos caracteres de entrada entran en el contexto con el que se cargó. */
export function inputBudgetChars(loadedContextLength: number): number {
  return Math.max(0, Math.floor(loadedContextLength * INPUT_CONTEXT_SHARE * CHARS_PER_TOKEN));
}

export interface TruncatedDiff {
  text: string;
  /** Si hubo que recortar. Se declara; recortar en silencio sería mentir. */
  truncated: boolean;
  /** Cuántos caracteres tenía el diff completo. */
  originalLength: number;
}

/**
 * Recorta el diff al presupuesto disponible.
 *
 * Se corta por el final y en un límite de línea, para no partir una línea de
 * diff al medio y dejarla ilegible. Que se recortó viaja en el resultado: la
 * vista lo declara, porque un asunto redactado sobre la mitad del trabajo no es
 * lo mismo que uno redactado sobre todo.
 */
export function truncateDiff(diff: string, budgetChars: number): TruncatedDiff {
  const originalLength = diff.length;
  if (originalLength <= budgetChars) return { text: diff, truncated: false, originalLength };
  const cut = diff.slice(0, Math.max(0, budgetChars));
  const lastBreak = cut.lastIndexOf('\n');
  return {
    text: lastBreak > 0 ? cut.slice(0, lastBreak) : cut,
    truncated: true,
    originalLength,
  };
}

export interface CommitDraftInput {
  /** El cambio al que pertenece el conjunto, si se lo pudo atribuir a uno solo. */
  changeId: string | null;
  /** Su intención, del `## Why` de la propuesta. Ya viaja en el snapshot. */
  intent: string | null;
  /** Las tareas cerradas en esta tanda, tal como quedaron escritas. */
  tickedTasks: string[];
  /** `git diff --stat` de lo elegido: qué archivos y cuánto se movió. */
  stat: string;
  /** El diff de lo elegido, ya recortado al presupuesto. */
  diff: TruncatedDiff;
}

/**
 * Arma el mensaje del usuario.
 *
 * El orden no es casual: primero lo que enmarca —el cambio y su intención—, y el
 * diff al final. Si algo se recorta es el diff, y conviene que lo que se pierde
 * sea la cola de lo menos importante y no el encuadre.
 *
 * Cada bloque ausente se omite entero en vez de aparecer vacío: una sección con
 * un hueco invita al modelo a rellenarla.
 */
export function buildUserPrompt(input: CommitDraftInput): string {
  const blocks: string[] = [];
  if (input.changeId) blocks.push(`Cambio de OpenSpec: ${input.changeId}`);
  if (input.intent) blocks.push(`Intención del cambio:\n${input.intent}`);
  if (input.tickedTasks.length > 0) {
    blocks.push(`Tareas que se cerraron en esta tanda:\n${input.tickedTasks.join('\n')}`);
  }
  if (input.stat.trim()) blocks.push(`Archivos tocados:\n${input.stat.trim()}`);
  const diffBlock = input.diff.truncated
    ? `Diff (recortado, ${input.diff.originalLength} caracteres en total):\n${input.diff.text}`
    : `Diff:\n${input.diff.text}`;
  blocks.push(diffBlock);
  return blocks.join('\n\n');
}

/**
 * Los tipos que se aceptan. Es la lista que el propio pedido nombra: aceptar uno
 * que no se pidió sería premiar que el modelo ignore la instrucción.
 */
const CONVENTIONAL_TYPES = ['feat', 'fix', 'chore', 'refactor', 'style', 'test', 'docs'] as const;

const SUBJECT_SHAPE = new RegExp(`^(${CONVENTIONAL_TYPES.join('|')})(\\([^)\\n]+\\))?: \\S.*$`);

/**
 * Si lo que devolvió tiene la forma pedida.
 *
 * Existe porque un asunto que no la tiene no puede imponerse en el campo: la
 * sugerencia se ofrece, y ofrecer algo mal formado obliga a corregirlo a mano,
 * que es peor que no sugerir. No se valida el largo —72 caracteres es una guía
 * del pedido, no una condición— porque un asunto correcto de 80 sigue siendo
 * mejor que ninguno.
 */
export function isConventionalSubject(subject: string): boolean {
  return SUBJECT_SHAPE.test(subject.trim());
}
