import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RepoEvidenceReader } from '../pipeline/repo-evidence-reader';

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
    expect(snapshot.evidence).toMatchObject({ repoId: 'repo-1', activeChanges: [], tasks: [], gates: [] });
    expect(snapshot.evidence.diagnostics.map((item) => item.code)).toContain('openspec.unavailable');
    expect(snapshot.selection).toMatchObject({ changeId: null, selectionRequired: false });
  });

  it('reads tasks, gates, reports and archives for one selected change', async () => {
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'feature-a'), { recursive: true });
    await fs.writeFile(path.join(root, 'openspec', 'changes', 'feature-a', 'tasks.md'), '- [x] done\n- [ ] open\n');
    await fs.mkdir(path.join(root, 'openspec', 'changes', 'archive', '2026-07-23-old-change'), { recursive: true });
    await fs.mkdir(path.join(root, 'docs', 'ai', 'logs'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs', 'ai', 'logs', 'gates.jsonl'), '{"ts":"t","mode":"fast","result":"VERDE"}\n');
    await fs.writeFile(path.join(root, 'docs', 'ai', 'logs', 'delegations.jsonl'), '{"ts":"t","rol":"builder","modelo":"zai/model","tarea":"audit"}\n');
    await fs.writeFile(path.join(root, 'docs', 'ai', 'logs', 'visual-diff-heights.jsonl'), '{"run_id":"r","ts":"t","route":"/pipeline","excepted":false}\n');
    await fs.mkdir(path.join(root, 'docs', 'reports'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs', 'reports', 'report.md'), '# report');
    await fs.writeFile(path.join(root, 'docs', 'reports', 'audit.md'), '## Veredicto: RECHAZADO\n\n- Hallazgo concreto\n');
    const reader = new RepoEvidenceReader({
      listOpenSpecChanges: async () => ['feature-a'],
      currentBranch: async () => 'feature/feature-a',
      mergedChanges: async (_repoPath, candidates) => candidates.filter((candidate) => candidate === 'old-change'),
      now: () => '2026-07-23T20:00:00.000Z',
    });
    const snapshot = await reader.read(root, 'repo-1');
    expect(snapshot.selection).toMatchObject({ changeId: 'feature-a', confidence: 'confirmed' });
    expect(snapshot.evidence.tasks).toHaveLength(2);
    expect(snapshot.evidence.gates).toEqual([{ ts: 't', mode: 'fast', result: 'VERDE' }]);
    expect(snapshot.evidence.delegations).toHaveLength(1);
    expect(snapshot.evidence.visualDiffs).toHaveLength(1);
    expect(snapshot.evidence.reports).toEqual(['docs/reports/audit.md', 'docs/reports/report.md']);
    expect(snapshot.evidence.decisions).toMatchObject([{ kind: 'audit-rejected', risk: 'unknown', evidenceRefs: ['docs/reports/audit.md'] }]);
    expect(snapshot.evidence.archivedChanges).toEqual(['old-change']);
    expect(snapshot.evidence.mergedChanges).toEqual(['old-change']);
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

  it('continues JSONL from a cursor persisted outside the repo', async () => {
    await fs.mkdir(path.join(root, 'docs', 'ai', 'logs'), { recursive: true });
    const gatePath = path.join(root, 'docs', 'ai', 'logs', 'gates.jsonl');
    await fs.writeFile(gatePath, '{"ts":"1","mode":"fast","result":"ROJO"}\n');
    const cursors = new Map<string, { offset: number; pending: string; generation: string | null }>();
    const cursorStore = {
      loadCursor: (_repoId: string, sourceRef: string) => cursors.get(sourceRef) ?? { offset: 0, pending: '', generation: null },
      saveCursor: (_repoId: string, sourceRef: string, cursor: { offset: number; pending: string; generation: string | null }) => { cursors.set(sourceRef, cursor); },
    };
    const reader = new RepoEvidenceReader({
      listOpenSpecChanges: async () => [], currentBranch: async () => 'main', mergedChanges: async () => [],
      now: () => '2026-07-23T20:00:00.000Z',
    });
    expect((await reader.read(root, 'repo-1', cursorStore)).evidence.gates.map((gate) => gate.ts)).toEqual(['1']);
    await fs.appendFile(gatePath, '{"ts":"2","mode":"fast","result":"VERDE"}\n');
    expect((await reader.read(root, 'repo-1', cursorStore)).evidence.gates.map((gate) => gate.ts)).toEqual(['2']);
  });
});
