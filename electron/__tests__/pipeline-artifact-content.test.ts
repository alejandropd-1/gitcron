import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RepoEvidenceReader } from '../pipeline/repo-evidence-reader';

/**
 * El lector ya abría estos archivos para extraer el intent y descartaba el
 * contenido. Estas pruebas fijan que ahora lo conserve, y sobre todo que lo haga
 * sólo para el cambio seleccionado: transportar el markdown de todos los cambios
 * activos haría crecer el snapshot sin que nadie lo mire.
 */
describe('Contenido de artefactos en la evidencia', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-artifacts-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  async function writeChange(changeId: string, files: Record<string, string>) {
    const dir = path.join(root, 'openspec', 'changes', changeId);
    await fs.mkdir(dir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      await fs.writeFile(path.join(dir, name), content);
    }
  }

  function reader(active: string[], branch: string) {
    return new RepoEvidenceReader({
      listOpenSpecChanges: async () => active,
      currentBranch: async () => branch,
      mergedChanges: async () => [],
      validateOpenSpecChange: async () => 'unknown',
      now: () => '2026-07-29T00:00:00.000Z',
    });
  }

  it('conserva el markdown de los tres artefactos del cambio seleccionado', async () => {
    await writeChange('feature-a', {
      'proposal.md': '## Why\n\nHace falta.\n',
      'design.md': '## Context\n\nAsi se hace.\n',
      'tasks.md': '- [ ] 1.1 Empezar\n',
    });

    const snapshot = await reader(['feature-a'], 'feature/feature-a').read(root, 'repo-1');
    const change = snapshot.evidence.openSpecChanges?.find((item) => item.changeId === 'feature-a');

    expect(change?.artifacts?.proposal).toContain('Hace falta.');
    expect(change?.artifacts?.design).toContain('Asi se hace.');
    expect(change?.artifacts?.tasks).toContain('1.1 Empezar');
  });

  it('distingue un artefacto ausente de uno vacio', async () => {
    await writeChange('feature-a', {
      'proposal.md': '## Why\n\nHace falta.\n',
      'tasks.md': '- [ ] 1.1 Empezar\n',
    });

    const snapshot = await reader(['feature-a'], 'feature/feature-a').read(root, 'repo-1');
    const change = snapshot.evidence.openSpecChanges?.find((item) => item.changeId === 'feature-a');

    // `design.md` no existe: el contenido es null y la senal de existencia es false.
    expect(change?.artifacts?.design).toBeNull();
    expect(change?.designExists).toBe(false);
    expect(change?.proposalExists).toBe(true);
  });

  it('no transporta contenido de los cambios que no estan seleccionados', async () => {
    await writeChange('feature-a', { 'proposal.md': '## Why\n\nSeleccionado.\n' });
    await writeChange('feature-b', { 'proposal.md': '## Why\n\nEl otro.\n' });

    const snapshot = await reader(['feature-a', 'feature-b'], 'feature/feature-a').read(root, 'repo-1');
    const selected = snapshot.evidence.openSpecChanges?.find((item) => item.changeId === 'feature-a');
    const other = snapshot.evidence.openSpecChanges?.find((item) => item.changeId === 'feature-b');

    expect(selected?.artifacts?.proposal).toContain('Seleccionado.');
    expect(other?.artifacts).toBeNull();
    // La existencia se sigue informando aunque el contenido no viaje.
    expect(other?.proposalExists).toBe(true);
  });

  it('lee el spec delta de cada capacidad tocada', async () => {
    await writeChange('feature-a', { 'proposal.md': '## Why\n\nHace falta.\n' });
    const specDir = path.join(root, 'openspec', 'changes', 'feature-a', 'specs', 'mi-capacidad');
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(path.join(specDir, 'spec.md'), '## ADDED Requirements\n\n### Requirement: Una\n');

    const snapshot = await reader(['feature-a'], 'feature/feature-a').read(root, 'repo-1');
    const change = snapshot.evidence.openSpecChanges?.find((item) => item.changeId === 'feature-a');

    expect(change?.artifacts?.specs).toHaveLength(1);
    expect(change?.artifacts?.specs[0].capability).toBe('mi-capacidad');
    expect(change?.artifacts?.specs[0].content).toContain('Requirement: Una');
    expect(change?.artifacts?.specs[0].sourceRef).toBe('openspec/changes/feature-a/specs/mi-capacidad/spec.md');
  });

  it('conserva la capacidad aunque le falte el spec.md', async () => {
    await writeChange('feature-a', { 'proposal.md': '## Why\n\nHace falta.\n' });
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'feature-a', 'specs', 'sin-archivo'), { recursive: true });

    const snapshot = await reader(['feature-a'], 'feature/feature-a').read(root, 'repo-1');
    const change = snapshot.evidence.openSpecChanges?.find((item) => item.changeId === 'feature-a');

    // La carpeta existe y eso es evidencia: se lista con contenido nulo.
    expect(change?.artifacts?.specs[0]).toMatchObject({ capability: 'sin-archivo', content: null });
  });
});
