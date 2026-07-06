import { describe, expect, it } from 'vitest';
import { resolveCodeGraphExport } from '../carto/graph-engine';

// Este test NO carga el motor real: sólo ejercita el resolvedor de export, que es
// el que se rompió en v1.10.1 (el `await import()` deja la clase bajo `.default`,
// no en `.CodeGraph`, por el interop CJS/ESM).
class FakeCodeGraph {
  static isInitialized() {
    return false;
  }
}

describe('resolveCodeGraphExport — interop CJS/ESM', () => {
  it('encuentra la clase bajo .default.CodeGraph (forma de await import de un CJS)', () => {
    const mod = { default: { CodeGraph: FakeCodeGraph } };
    expect(resolveCodeGraphExport(mod)).toBe(FakeCodeGraph);
  });

  it('encuentra la clase como named export .CodeGraph (forma del bundle esbuild)', () => {
    const mod = { CodeGraph: FakeCodeGraph };
    expect(resolveCodeGraphExport(mod)).toBe(FakeCodeGraph);
  });

  it('prefiere el named export cuando ambos están presentes', () => {
    const mod = { CodeGraph: FakeCodeGraph, default: { CodeGraph: class Other {} } };
    expect(resolveCodeGraphExport(mod)).toBe(FakeCodeGraph);
  });

  it('devuelve null si no hay ninguna clase (motor no disponible)', () => {
    expect(resolveCodeGraphExport({})).toBeNull();
    expect(resolveCodeGraphExport({ default: {} })).toBeNull();
    expect(resolveCodeGraphExport({ CodeGraph: 42 })).toBeNull();
    expect(resolveCodeGraphExport(undefined)).toBeNull();
  });
});
