import { describe, expect, it } from 'vitest';
import { extractQueryTerms } from '../carto-retrieval';

describe('extractQueryTerms', () => {
  it('descarta palabras vacías y se queda con los nombres reales', () => {
    // El caso de aceptación de la fase.
    expect(extractQueryTerms('¿Qué pasa cuando hago un pull?')).toEqual(['pull']);
  });

  it('normaliza acentos y mayúsculas', () => {
    expect(extractQueryTerms('¿Dónde está la Migración?')).toEqual(['migracion']);
  });

  it('deduplica preservando el orden de aparición', () => {
    expect(extractQueryTerms('commit y luego commit otra vez')).toEqual(['commit', 'luego', 'otra', 'vez']);
  });

  it('descarta tokens demasiado cortos', () => {
    expect(extractQueryTerms('a b ok go')).toEqual([]); // "ok"/"go" < 3
  });

  it('conserva identificadores con guión bajo y dígitos', () => {
    expect(extractQueryTerms('cómo funciona git_store2')).toEqual(['git_store2']);
  });

  it('devuelve vacío para una pregunta toda de palabras vacías', () => {
    expect(extractQueryTerms('¿qué pasa con esto?')).toEqual([]);
  });

  it('acota la cantidad de términos', () => {
    const q = 'alfa beta gamma delta epsilon zeta eta theta iota kappa';
    expect(extractQueryTerms(q).length).toBeLessThanOrEqual(8);
  });

  it('filtra stopwords en inglés', () => {
    expect(extractQueryTerms('what happens when I push the branch')).toEqual(['push', 'branch']);
  });
});
