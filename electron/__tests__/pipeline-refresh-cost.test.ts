import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenSpecChangeStatus } from '../../types/pipeline';
import { RepoEvidenceReader } from '../pipeline/repo-evidence-reader';

/**
 * Validar un change invoca el CLI de OpenSpec como subproceso: ~2,4 s cada uno,
 * y el bucle del lector es secuencial. Con cuatro cambios activos eran ~9 s por
 * refresco, y el watcher refresca en cada guardado de archivo. Estas pruebas
 * fijan que ese costo se pague sólo por el cambio seleccionado, que es el único
 * cuya validación alguna vista consume.
 *
 * Lo mismo rige para `statusOpenSpecChange` (el grafo de artefactos): mismo
 * spawn, mismo costo, mismo criterio de pago-sólo-el-seleccionado.
 */
const STATUS_GRAPH: OpenSpecChangeStatus = {
  available: true,
  artifacts: [{ id: 'proposal', state: 'ready', missingDeps: [] }],
  applyRequires: ['tasks'],
  schemaName: null,
  skipSpecs: null,
  isComplete: false,
};

describe('Alcance de la validación por CLI', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-refresh-cost-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  async function writeChange(changeId: string) {
    const dir = path.join(root, 'openspec', 'changes', changeId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'proposal.md'), '## Why\n\nHace falta.\n');
  }

  it('valida una sola vez, y sólo el cambio seleccionado', async () => {
    await writeChange('feature-a');
    await writeChange('feature-b');
    await writeChange('feature-c');
    const validateOpenSpecChange = vi.fn(async () => 'passed' as const);

    const snapshot = await new RepoEvidenceReader({
      listOpenSpecChanges: async () => ['feature-a', 'feature-b', 'feature-c'],
      currentBranch: async () => 'feature/feature-a',
      mergedChanges: async () => [],
      validateOpenSpecChange,
      now: () => '2026-07-31T00:00:00.000Z',
    }).read(root, 'repo-1');

    expect(validateOpenSpecChange).toHaveBeenCalledTimes(1);
    expect(validateOpenSpecChange).toHaveBeenCalledWith(root, 'feature-a');

    const changes = snapshot.evidence.openSpecChanges ?? [];
    expect(changes.find((item) => item.changeId === 'feature-a')?.validation).toBe('passed');
    // `unknown` no es un default optimista: es no haber validado, declarado.
    expect(changes.find((item) => item.changeId === 'feature-b')?.validation).toBe('unknown');
    expect(changes.find((item) => item.changeId === 'feature-c')?.validation).toBe('unknown');
  });

  it('respeta la selección manual por encima de la automática al validar', async () => {
    await writeChange('feature-a');
    await writeChange('feature-b');
    const validateOpenSpecChange = vi.fn(async () => 'passed' as const);

    await new RepoEvidenceReader({
      listOpenSpecChanges: async () => ['feature-a', 'feature-b'],
      currentBranch: async () => 'feature/feature-a',
      mergedChanges: async () => [],
      validateOpenSpecChange,
      now: () => '2026-07-31T00:00:00.000Z',
    }).read(root, 'repo-1', 'feature-b');

    expect(validateOpenSpecChange).toHaveBeenCalledTimes(1);
    expect(validateOpenSpecChange).toHaveBeenCalledWith(root, 'feature-b');
  });

  it('no valida nada cuando la selección es ambigua', async () => {
    await writeChange('feature-a');
    await writeChange('feature-b');
    const validateOpenSpecChange = vi.fn(async () => 'passed' as const);

    const snapshot = await new RepoEvidenceReader({
      listOpenSpecChanges: async () => ['feature-a', 'feature-b'],
      // Una branch que no identifica ninguno, con dos activos: selectionRequired.
      currentBranch: async () => 'main',
      mergedChanges: async () => [],
      validateOpenSpecChange,
      now: () => '2026-07-31T00:00:00.000Z',
    }).read(root, 'repo-1');

    expect(snapshot.selection.changeId).toBeNull();
    expect(validateOpenSpecChange).not.toHaveBeenCalled();
  });

  it('lee el grafo una sola vez, y sólo para el cambio seleccionado', async () => {
    await writeChange('feature-a');
    await writeChange('feature-b');
    await writeChange('feature-c');
    const statusOpenSpecChange = vi.fn(async () => STATUS_GRAPH);

    const snapshot = await new RepoEvidenceReader({
      listOpenSpecChanges: async () => ['feature-a', 'feature-b', 'feature-c'],
      currentBranch: async () => 'feature/feature-a',
      mergedChanges: async () => [],
      validateOpenSpecChange: async () => 'unknown',
      statusOpenSpecChange,
      now: () => '2026-07-31T00:00:00.000Z',
    }).read(root, 'repo-1');

    expect(statusOpenSpecChange).toHaveBeenCalledTimes(1);
    expect(statusOpenSpecChange).toHaveBeenCalledWith(root, 'feature-a');

    const changes = snapshot.evidence.openSpecChanges ?? [];
    expect(changes.find((item) => item.changeId === 'feature-a')?.status).toEqual(STATUS_GRAPH);
    // Los no seleccionados transportan `null`: no es lo mismo que un grafo
    // vacío o indisponible, es que no se leyó porque nadie lo consume.
    expect(changes.find((item) => item.changeId === 'feature-b')?.status).toBeNull();
    expect(changes.find((item) => item.changeId === 'feature-c')?.status).toBeNull();
  });

  it('no lee el grafo cuando la selección es ambigua', async () => {
    await writeChange('feature-a');
    await writeChange('feature-b');
    const statusOpenSpecChange = vi.fn(async () => STATUS_GRAPH);

    const snapshot = await new RepoEvidenceReader({
      listOpenSpecChanges: async () => ['feature-a', 'feature-b'],
      currentBranch: async () => 'main',
      mergedChanges: async () => [],
      statusOpenSpecChange,
      now: () => '2026-07-31T00:00:00.000Z',
    }).read(root, 'repo-1');

    expect(snapshot.selection.changeId).toBeNull();
    expect(statusOpenSpecChange).not.toHaveBeenCalled();
  });
});
