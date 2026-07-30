import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultListOpenSpecChanges, RepoEvidenceReader } from '../pipeline/repo-evidence-reader';

describe('RepoEvidenceReader', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-evidence-reader-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('degrades a repo without the method kit while preserving a snapshot', async () => {
    const reader = new RepoEvidenceReader({
      listOpenSpecChanges: async () => { throw new Error('missing'); },
      currentBranch: async () => 'main',
      mergedChanges: async () => [],
      now: () => '2026-07-23T20:00:00.000Z',
    });
    const snapshot = await reader.read(root, 'repo-1');
    expect(snapshot.evidence).toMatchObject({ repoId: 'repo-1', activeChanges: [], tasks: [] });
    expect(snapshot.evidence.diagnostics.map((item) => item.code)).toContain('openspec.unavailable');
    expect(snapshot.selection).toMatchObject({ changeId: null, selectionRequired: false });
  });

  // Regresión: esto salía por `execFile('openspec', ...)`, que en Windows no
  // resuelve `openspec.cmd` (ENOENT), y con la extensión Node lo rechaza por la
  // mitigación de CVE-2024-27980 (EINVAL). El lector caía en su `catch` y
  // reportaba cero cambios activos aunque el scaffold existiera.
  it('lists active changes from the scaffold without spawning the OpenSpec CLI', async () => {
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'feature-a'), { recursive: true });
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'feature-b'), { recursive: true });
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'archive', '2026-07-23-old-change'), { recursive: true });

    const active = await defaultListOpenSpecChanges(root);

    expect(active).toEqual(['feature-a', 'feature-b']);
    // `archive` es el contenedor de los cerrados, no un cambio activo.
    expect(active).not.toContain('archive');
  });

  it('reports no active changes when the scaffold is absent', async () => {
    expect(await defaultListOpenSpecChanges(root)).toEqual([]);
  });

  it('reads tasks, reports and archives for one selected change', async () => {
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'feature-a'), { recursive: true });
    await fs.writeFile(path.join(root, 'openspec', 'changes', 'feature-a', 'tasks.md'), '- [x] done\n- [ ] open\n');
    await fs.writeFile(path.join(root, 'openspec', 'changes', 'feature-a', 'proposal.md'), '## Why\n\nShip one grounded workflow.\n\n## What Changes\n\n- UI\n');
    await fs.writeFile(path.join(root, 'openspec', 'changes', 'feature-a', 'design.md'), '## Context\n\nDesign.\n');
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'feature-a', 'specs', 'feature-a'), { recursive: true });
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'archive', '2026-07-23-old-change'), { recursive: true });
    await fs.mkdir(path.join(root, 'openspec', 'specs', 'feature-a'), { recursive: true });
    await fs.writeFile(path.join(root, 'openspec', 'specs', 'feature-a', 'spec.md'), '### Requirement: First\n\n### Requirement: Second\n');
    await fs.mkdir(path.join(root, 'docs', 'reports'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs', 'reports', 'report.md'), '# report');
    await fs.writeFile(path.join(root, 'docs', 'reports', 'audit.md'), '## Veredicto: RECHAZADO\n\n- Hallazgo concreto\n');
    const reader = new RepoEvidenceReader({
      listOpenSpecChanges: async () => ['feature-a'],
      currentBranch: async () => 'feature/feature-a',
      mergedChanges: async (_repoPath, candidates) => candidates.filter((candidate) => candidate === 'old-change'),
      validateOpenSpecChange: async () => 'passed',
      now: () => '2026-07-23T20:00:00.000Z',
    });
    const snapshot = await reader.read(root, 'repo-1');
    expect(snapshot.selection).toMatchObject({ changeId: 'feature-a', confidence: 'confirmed' });
    expect(snapshot.evidence.tasks).toHaveLength(2);
    expect(snapshot.evidence.reports).toEqual(['docs/reports/audit.md', 'docs/reports/report.md']);
    expect(snapshot.evidence.decisions).toMatchObject([{ kind: 'audit-rejected', risk: 'unknown', evidenceRefs: ['docs/reports/audit.md'] }]);
    expect(snapshot.evidence.archivedChanges).toEqual(['old-change']);
    expect(snapshot.evidence.mergedChanges).toEqual(['old-change']);
    expect(snapshot.evidence.openSpecChanges).toMatchObject([{
      changeId: 'feature-a',
      intent: 'Ship one grounded workflow.',
      proposalExists: true,
      designExists: true,
      specsCount: 1,
      validation: 'passed',
    }]);
    expect(snapshot.evidence.openSpecArchivedChanges).toEqual([{
      changeId: 'old-change',
      archivedAt: '2026-07-23',
      sourceRef: 'openspec/changes/archive/2026-07-23-old-change',
    }]);
    expect(snapshot.evidence.openSpecSpecifications).toEqual([{
      specificationId: 'feature-a',
      requirements: 2,
      sourceRef: 'openspec/specs/feature-a/spec.md',
    }]);
  });

  it('does not choose among multiple unmatched active changes', async () => {
    const reader = new RepoEvidenceReader({
      listOpenSpecChanges: async () => ['one', 'two'],
      currentBranch: async () => 'main',
      mergedChanges: async () => [],
      now: () => '2026-07-23T20:00:00.000Z',
    });
    const snapshot = await reader.read(root, 'repo-1');
    expect(snapshot.selection).toMatchObject({ changeId: null, selectionRequired: true });
    expect(snapshot.evidence.tasks).toEqual([]);
  });

  // Escenario declarado en la spec: un repositorio puede conservar los registros
  // del kit retirado en disco, y Pipeline debe ignorarlos por completo.
  it('ignores leftover kit logs still present on disk', async () => {
    await fs.mkdir(path.join(root, 'docs', 'ai', 'logs'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs', 'ai', 'logs', 'gates.jsonl'), '{"ts":"1","mode":"fast","result":"ROJO"}\n');
    const reader = new RepoEvidenceReader({
      listOpenSpecChanges: async () => [], currentBranch: async () => 'main', mergedChanges: async () => [],
      now: () => '2026-07-23T20:00:00.000Z',
    });
    const snapshot = await reader.read(root, 'repo-1');
    expect(snapshot.evidence).not.toHaveProperty('gates');
    expect(snapshot.evidence).not.toHaveProperty('delegations');
    expect(snapshot.evidence).not.toHaveProperty('visualDiffs');
  });

  it('honors a manual selection over the automatic branch match', async () => {
    // Dos changes activos en `main`: la selección automática es null (la rama
    // no coincide con ninguno y hay varios). Con selección manual, ése es el
    // que transporta contenido.
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'feature-a'), { recursive: true });
    await fs.writeFile(path.join(root, 'openspec', 'changes', 'feature-a', 'tasks.md'), '- [ ] one\n');
    await fs.writeFile(path.join(root, 'openspec', 'changes', 'feature-a', 'proposal.md'), '## Why\n\nA\n');
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'feature-b'), { recursive: true });
    await fs.writeFile(path.join(root, 'openspec', 'changes', 'feature-b', 'tasks.md'), '- [ ] two\n');
    await fs.writeFile(path.join(root, 'openspec', 'changes', 'feature-b', 'proposal.md'), '## Why\n\nB\n');

    const reader = new RepoEvidenceReader({
      listOpenSpecChanges: async () => ['feature-a', 'feature-b'],
      currentBranch: async () => 'main',
      mergedChanges: async () => [],
      validateOpenSpecChange: async () => 'unknown',
      now: () => '2026-07-23T20:00:00.000Z',
    });

    // Sin selección manual: ningún change transporta contenido (ambos null).
    const automatic = await reader.read(root, 'repo-1');
    expect(automatic.selection.changeId).toBeNull();

    // Con selección manual de feature-b: ése transporta su contenido, el otro no.
    const manual = await reader.read(root, 'repo-1', 'feature-b');
    expect(manual.selection).toMatchObject({ changeId: 'feature-b', confidence: 'confirmed', reason: 'manual' });
    const changes = manual.evidence.openSpecChanges ?? [];
    const b = changes.find((c) => c.changeId === 'feature-b');
    const a = changes.find((c) => c.changeId === 'feature-a');
    expect(b?.artifacts?.proposal).toBe('## Why\n\nB\n');
    // El change no seleccionado no transporta contenido (artifacts ausente).
    expect(a?.artifacts?.proposal ?? null).toBeNull();

    // Un selectedChangeId que no está entre los activos se ignora (fallback).
    const ignored = await reader.read(root, 'repo-1', 'does-not-exist');
    expect(ignored.selection.changeId).toBeNull();
  });
});
