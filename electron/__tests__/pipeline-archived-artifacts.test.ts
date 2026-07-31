import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RepoEvidenceReader } from '../pipeline/repo-evidence-reader';

/**
 * Lo archivado es el registro de lo que se hizo, incluida la firma humana.
 * Revisarlo obligaba a salir de la aplicación: la evidencia sólo transportaba
 * el id y la fecha del archivado.
 */
describe('Artefactos de un cambio archivado', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-archived-'));
    const dir = path.join(root, 'openspec', 'changes', 'archive', '2026-07-31-viejo-cambio');
    await fs.mkdir(path.join(dir, 'specs', 'una-capacidad'), { recursive: true });
    await fs.writeFile(path.join(dir, 'proposal.md'), '## Why\n\nHacía falta.\n');
    await fs.writeFile(path.join(dir, 'tasks.md'), '- [x] 1.1 Archivado confirmado por Ale desde la aplicación\n');
    await fs.writeFile(path.join(dir, 'specs', 'una-capacidad', 'spec.md'), '## ADDED Requirements\n');
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  function reader() {
    return new RepoEvidenceReader({
      listOpenSpecChanges: async () => [],
      currentBranch: async () => 'main',
      mergedChanges: async () => [],
      validateOpenSpecChange: async () => 'unknown',
      now: () => '2026-07-31T00:00:00.000Z',
    });
  }

  it('transporta los artefactos del archivado seleccionado', async () => {
    const snapshot = await reader().read(root, 'repo-1', 'viejo-cambio');
    const archived = snapshot.evidence.openSpecArchivedChanges?.[0];

    expect(archived?.changeId).toBe('viejo-cambio');
    expect(archived?.artifacts?.proposal).toContain('Hacía falta.');
    // El último check tildado, que es lo que se quiere poder revisar.
    expect(archived?.artifacts?.tasks).toContain('[x] 1.1 Archivado confirmado por Ale');
    expect(archived?.artifacts?.specs[0]?.capability).toBe('una-capacidad');
  });

  it('no transporta contenido de los archivados no seleccionados', async () => {
    const snapshot = await reader().read(root, 'repo-1', null);
    expect(snapshot.evidence.openSpecArchivedChanges?.[0]?.artifacts).toBeUndefined();
  });
});
