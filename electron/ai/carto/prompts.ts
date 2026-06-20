// electron/ai/carto/prompts.ts
//
// Cartografía — Fase 4. Armado de prompts para explain/ask. Funciones PURAS
// (sin I/O, sin red): toman el nodo/pregunta + el contexto estructural ya
// verificado por el motor CodeGraph y devuelven {system, user}. Vive en main.
//
// Doctrina de grounding: el contexto que pasamos son relaciones REALES del grafo
// (las mismas del panel), así el modelo razona sobre hechos del repo y no inventa
// aristas. Se lo decimos explícito en el system prompt.

import type { CartoAINodeRef, CartoAIContext } from '../../../types/carto-ai';

/** Mapea el código de idioma a una instrucción clara para el modelo. */
function languageDirective(lang?: string): string {
  switch (lang) {
    case 'en':
      return 'Answer in English.';
    case 'zh':
      return 'Answer in Chinese (中文).';
    case 'es':
    default:
      return 'Respondé en español (rioplatense, claro y directo).';
  }
}

const BASE_SYSTEM = [
  'Sos un asistente de cartografía de código embebido en GitCron, un cliente Git de escritorio.',
  'Tu trabajo es ayudar a entender un repositorio: qué hace un símbolo o archivo, cómo se relaciona con el resto y qué se rompería si se toca.',
  'REGLA DE ORO: basate ÚNICAMENTE en el contexto estructural que se te da (relaciones reales extraídas del grafo de código). NO inventes funciones, archivos ni relaciones que no aparezcan. Si algo no está en el contexto, decí que no lo podés afirmar desde el grafo.',
  'Sé conciso y técnico. Sin relleno, sin disculpas, sin repetir la pregunta.',
].join(' ');

// System prompt del EXPLAIN: misma regla de oro (grounding), pero la AUDIENCIA es
// alguien NO experto. Se le pide bajar a tierra el rol del nodo en lenguaje humano,
// sin jerga innecesaria, apoyándose en el código y las relaciones reales que se dan.
const EXPLAIN_SYSTEM = [
  'Sos un asistente de cartografía de código embebido en GitCron, un cliente Git de escritorio.',
  'Le explicás una pieza del código a alguien que NO es experto: poca jerga, y si usás un término técnico, aclaralo en una frase.',
  'REGLA DE ORO: basate ÚNICAMENTE en el contexto que se te da (el código del nodo y sus relaciones reales del grafo). NO inventes funciones, archivos ni relaciones que no aparezcan. Si algo no se puede afirmar desde el contexto, decilo.',
  'Sé claro y breve. Sin relleno, sin disculpas, sin repetir la consigna. No vuelques el código tal cual: explicá qué hace en palabras.',
].join(' ');

/** Serializa el contexto estructural a un bloque legible para el modelo. */
function renderContext(context: CartoAIContext): string {
  const lines: string[] = [];
  if (context.filePath) lines.push(`Archivo focal: ${context.filePath}`);
  if (context.imports?.length) {
    lines.push(`Importa a (${context.imports.length}): ${context.imports.slice(0, 30).join(', ')}`);
  }
  if (context.usedBy?.length) {
    lines.push(`Es usado por (${context.usedBy.length}): ${context.usedBy.slice(0, 30).join(', ')}`);
  }
  if (context.callers?.length) {
    lines.push(`Lo llaman/usan (${context.callers.length}): ${context.callers.slice(0, 20).join(', ')}`);
  }
  if (context.callees?.length) {
    lines.push(`Llama/usa a (${context.callees.length}): ${context.callees.slice(0, 20).join(', ')}`);
  }
  if (context.impact) {
    const sample = context.impact.sampleFiles?.slice(0, 15).join(', ');
    lines.push(
      `Radio de impacto: ${context.impact.fileCount} archivos · ${context.impact.symbolCount} símbolos` +
        (sample ? ` (ej.: ${sample})` : ''),
    );
  }
  return lines.length ? lines.join('\n') : '(sin relaciones registradas en el grafo)';
}

/**
 * Prompt para EXPLICAR un nodo del grafo en lenguaje humano, para alguien no
 * técnico, anclado en su código y relaciones REALES. Pide: qué hace, a qué le pide
 * datos / qué consume, qué se afecta si se toca, y con qué suele cambiar junto.
 */
export function buildExplainPrompts(
  node: CartoAINodeRef,
  context: CartoAIContext,
): { system: string; user: string } {
  const system = `${EXPLAIN_SYSTEM} ${languageDirective(context.lang)}`;
  const loc =
    node.startLine != null
      ? `${node.filePath}:${node.startLine}${node.endLine != null ? `-${node.endLine}` : ''}`
      : node.filePath;
  const user = [
    `Explicá esta pieza del código para alguien que recién llega al proyecto:`,
    `- Nombre: ${node.name}`,
    `- Tipo: ${node.kind}`,
    `- Ubicación: ${loc}`,
    node.signature ? `- Firma: ${node.signature}` : null,
    context.source ? '' : null,
    context.source ? 'Código del nodo (recortado):' : null,
    context.source ? '```\n' + context.source + '\n```' : null,
    '',
    'Contexto estructural verificado (del grafo de código):',
    renderContext(context),
    '',
    'Respondé en prosa breve, sin encabezados ni listas numeradas, cubriendo:',
    '- qué hace, en una frase simple;',
    '- a qué le pide datos o qué consume (en qué se apoya);',
    '- "si tocás esto, se puede afectar…" (nombrando lo que está en el impacto/relaciones);',
    '- "suele cambiar junto con…" (si las relaciones lo sugieren).',
  ]
    .filter((l) => l !== null)
    .join('\n');
  return { system, user };
}

/** Prompt para RESPONDER una pregunta libre, con el contexto disponible como anclaje. */
export function buildAskPrompts(
  question: string,
  context: CartoAIContext,
): { system: string; user: string } {
  const system = `${BASE_SYSTEM} ${languageDirective(context.lang)}`;
  const hasContext =
    context.filePath || context.imports?.length || context.usedBy?.length || context.impact;
  const user = [
    'Pregunta del usuario sobre el repositorio:',
    question.trim(),
    '',
    hasContext ? 'Contexto estructural verificado (del grafo de código):' : null,
    hasContext ? renderContext(context) : null,
  ]
    .filter((l) => l !== null)
    .join('\n');
  return { system, user };
}
