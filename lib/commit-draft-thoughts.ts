/**
 * Frases para la espera mientras un modelo local redacta el asunto del commit.
 *
 * Vocabulario propio y no el del Agente Temporal: aquéllas hablan de predecir
 * futuros y ramas especulativas, y acá se está leyendo un diff. Una frase que no
 * describe lo que está pasando convierte la espera en decorado.
 *
 * Describen el proceso real, que es lo que se midió: se arma el contexto con el
 * cambio y las tareas, se recorta el diff al presupuesto, y el modelo razona
 * antes de escribir.
 *
 * La espera **se acortó** y estas frases siguen valiendo, pero por otro motivo
 * que el original. Los 1.585 tokens que gemma-4-12b gastaba pensando para
 * devolver sesenta caracteres no eran el costo de razonar: eran el costo de
 * contar letras para cumplir un «Máximo 72 caracteres» que el pedido ya no
 * incluye. Al retirarlo, en qwen3.8-27b el razonamiento cayó de 2.023 a 640
 * tokens y la espera se redujo en consecuencia. Las cifras son **por modelo** —
 * la app usa el que esté cargado en LM Studio, no uno fijo—, así que la espera
 * real varía: sigue habiendo una, y sigue habiendo algo que contar mientras.
 *
 * El mecanismo que las rota es `hooks/use-rotating-thoughts`, compartido.
 */

export const COMMIT_DRAFT_THOUGHTS_ES: readonly string[] = [
  'Leyendo lo que cambió…',
  'Separando lo que hiciste de lo que ya estaba…',
  'Buscando qué tienen en común los archivos elegidos…',
  'Mirando si esto agrega algo o arregla algo…',
  'Juntando el cambio con su intención…',
  'Repasando las tareas que cerraste…',
  'Recortando el diff a lo que entra en el contexto…',
  'Evitando decir «varios cambios» cuando hay uno solo…',
  'Buscando el alcance en el directorio común…',
  'Descartando adjetivos que no dicen nada…',
  'Pensando si esto es feat, fix o chore…',
  'Tratando de que entre en una línea…',
  'Escribiendo en imperativo, como manda la convención…',
  'Evitando repetir lo que ya dice el nombre del cambio…',
  'Preguntándose qué vas a querer leer dentro de seis meses…',
  'Prefiriendo lo concreto a lo prolijo…',
];

export const COMMIT_DRAFT_THOUGHTS_EN: readonly string[] = [
  'Reading what changed…',
  'Telling your work apart from what was already there…',
  'Looking for what the chosen files have in common…',
  'Checking whether this adds something or fixes something…',
  'Pairing the change with its intent…',
  'Going over the tasks you closed…',
  'Trimming the diff to what fits in the context…',
  'Avoiding "several changes" when there is only one…',
  'Finding the scope in the common directory…',
  'Dropping adjectives that say nothing…',
  'Deciding whether this is feat, fix or chore…',
  'Trying to fit it in one line…',
  'Writing in the imperative, as the convention asks…',
  'Not repeating what the change name already says…',
  'Wondering what you will want to read six months from now…',
  'Preferring concrete over tidy…',
];

export const COMMIT_DRAFT_THOUGHTS_ZH: readonly string[] = [
  '正在阅读改动内容…',
  '正在区分你写的部分和原有的部分…',
  '正在寻找所选文件的共同点…',
  '正在判断这是新增功能还是修复问题…',
  '正在把改动和它的意图对应起来…',
  '正在回顾你完成的任务…',
  '正在把差异裁剪到上下文容得下的范围…',
  '明明只有一处改动，就不要说“多处改动”…',
  '正在从共同目录中确定作用域…',
  '正在删掉没有信息量的形容词…',
  '正在判断该用 feat、fix 还是 chore…',
  '正在设法压缩成一行…',
  '正在按约定使用祈使语气…',
  '避免重复变更名称已经说过的内容…',
  '正在设想半年后的你想读到什么…',
  '宁可具体，也不要只是工整…',
];

/** Las frases del idioma activo, con castellano como respaldo. */
export function commitDraftThoughts(language: string): readonly string[] {
  if (language === 'zh') return COMMIT_DRAFT_THOUGHTS_ZH;
  if (language === 'en') return COMMIT_DRAFT_THOUGHTS_EN;
  return COMMIT_DRAFT_THOUGHTS_ES;
}
