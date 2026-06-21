// lib/carto-retrieval.ts
//
// Cartografía — Fase 6 (ventanita de preguntas). Lógica PURA de recuperación
// ESTRUCTURAL: de una pregunta en lenguaje natural a los términos buscables que
// luego el motor (electron/carto/graph-engine) resuelve contra el índice del repo.
//
// No hace I/O ni toca el motor: sólo transforma texto, por eso se testea con
// fixtures. La recuperación real (search + vecinos por relación) vive en el motor;
// acá sólo decidimos QUÉ buscar a partir de la pregunta. La recuperación difusa por
// significado (embeddings) es una fase posterior: esto es puramente por nombre.

/**
 * Palabras vacías ES/EN que no sirven como término de búsqueda de símbolos:
 * artículos, preposiciones, pronombres y los verbos/interrogativos más comunes de
 * una pregunta ("¿qué pasa cuando hago un pull?"). Filtrarlas evita búsquedas
 * ruidosas; los nombres reales del código (pull, commit, store…) sobreviven.
 */
const STOPWORDS = new Set<string>([
  // Español — estructura
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
  'de', 'a', 'en', 'y', 'o', 'u', 'que', 'qué', 'cual', 'cuál', 'cuales',
  'quien', 'quién', 'como', 'cómo', 'cuando', 'cuándo', 'donde', 'dónde',
  'por', 'para', 'con', 'sin', 'sobre', 'entre', 'desde', 'hasta', 'su', 'sus',
  'mi', 'mis', 'me', 'te', 'se', 'le', 'les', 'nos', 'es', 'son', 'esta', 'este',
  'esto', 'estos', 'estas', 'ese', 'esa', 'eso', 'si', 'sí', 'no', 'ya', 'muy',
  'más', 'mas', 'pero', 'porque', 'cuándo', 'algo', 'todo', 'toda', 'hay',
  // Español — verbos comunes en preguntas
  'pasa', 'pasan', 'hago', 'hace', 'hacer', 'haces', 'hacen', 'tiene', 'tienen',
  'usa', 'usan', 'usar', 'anda', 'funciona', 'funcionan', 'sirve', 'sirven',
  'puede', 'pueden', 'va', 'van', 'ver', 'mostrar', 'explica', 'explicar',
  // Inglés — estructura/verbos comunes
  'the', 'a', 'an', 'of', 'in', 'on', 'and', 'or', 'to', 'for', 'with', 'what',
  'which', 'who', 'how', 'when', 'where', 'why', 'is', 'are', 'do', 'does', 'did',
  'happen', 'happens', 'use', 'uses', 'used', 'work', 'works', 'this', 'that',
  'it', 'my', 'your', 'show', 'explain', 'about', 'into', 'from',
]);

/** Longitud mínima de un término para considerarlo buscable (descarta ruido). */
const MIN_TERM_LENGTH = 3;
/** Tope de términos buscables: una pregunta no necesita más para anclarse. */
const MAX_TERMS = 8;

/** Normaliza un texto: minúsculas y sin acentos, para comparar contra STOPWORDS. */
function normalize(text: string): string {
  // \p{Diacritic} = marcas diacríticas combinantes (los acentos descompuestos
  // por NFD), que removemos para comparar contra STOPWORDS sin tildes.
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Extrae los términos buscables de una pregunta libre. Tokeniza por separadores no
 * alfanuméricos (conserva `_`), descarta palabras vacías y tokens cortos, deduplica
 * preservando el orden de aparición y acota al tope. Devuelve los términos ya
 * normalizados (sin acentos, en minúsculas) — listos para `searchNodes`.
 *
 * Ejemplo: "¿Qué pasa cuando hago un pull?" → `['pull']`.
 */
export function extractQueryTerms(question: string): string[] {
  const tokens = normalize(question).split(/[^a-z0-9_]+/);
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const token of tokens) {
    if (token.length < MIN_TERM_LENGTH) continue;
    if (STOPWORDS.has(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    terms.push(token);
    if (terms.length >= MAX_TERMS) break;
  }
  return terms;
}
