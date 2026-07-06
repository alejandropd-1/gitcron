import { describe, expect, it, vi } from 'vitest';
import type { CartoGraphStatus } from '../../lib/carto-types';
import { ensureGraph, getGraphStatus } from '../carto/graph-engine';

// Simula el escenario del hotfix v1.10.1: el módulo nativo del motor está presente
// como paquete pero su clase no se puede cargar (en producción, `web-tree-sitter`
// no resuelve en el `.exe`). Modelamos ese fallo con un getter que tira al acceder
// a `CodeGraph`, que es exactamente lo que atrapa `loadCodeGraph()`.
vi.mock('@colbymchenry/codegraph', () => ({
  get CodeGraph() {
    throw new Error("Cannot find module 'web-tree-sitter'");
  },
}));

/** Espera a que el índice llegue a un estado terminal vía el callback de progreso. */
function ensureUntilSettled(repoPath: string): Promise<CartoGraphStatus> {
  return new Promise((resolve) => {
    ensureGraph(repoPath, {
      onProgress: (status) => {
        if (status.state === 'engine-unavailable' || status.state === 'error' || status.state === 'ready') {
          resolve(status);
        }
      },
    });
  });
}

describe('ensureGraph — motor no disponible', () => {
  it('degrada a estado engine-unavailable en vez de tirar', async () => {
    const repoPath = '/tmp/repo-sin-motor';
    const settled = await ensureUntilSettled(repoPath);

    // No propaga la excepción: la carga fallida se traduce a un estado degradado.
    expect(settled.state).toBe('engine-unavailable');
    expect(getGraphStatus(repoPath).state).toBe('engine-unavailable');
    // Estado degradado, no un error crudo del índice: sin mensaje de error genérico.
    expect(settled).not.toHaveProperty('error');
  });
});
