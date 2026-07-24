import { describe, expect, it } from 'vitest';
import { openTemporalAgentDatabase } from '../connection';
import { PipelineRepository } from '../../pipeline/pipeline-repository';
import type { PipelineSemanticEvent, PipelineState } from '../../../types/pipeline';

function state(repoId: string, revision = 1): PipelineState {
  return {
    repoId, revision, observedAt: '2026-07-23T20:00:00.000Z', tasks: [], reports: [], gates: [],
    activeChanges: [], archivedChanges: [], mergedChanges: [], diagnostics: [], delegations: [], visualDiffs: [], decisions: [],
    selection: { changeId: null, confidence: 'unknown', selectionRequired: false, reason: 'no-active-change' },
  };
}

function event(repoId: string, eventId = 'event-1'): PipelineSemanticEvent {
  return { eventId, repoId, kind: 'report.added', observedAt: '2026-07-23T20:00:00.000Z', subjectId: 'report', evidenceRefs: ['report.md'] };
}

describe('PipelineRepository', () => {
  it('keeps stable bindings and isolates the same event id across repos', () => {
    const db = openTemporalAgentDatabase(':memory:');
    try {
      const repository = new PipelineRepository(db, () => '2026-07-23T20:00:00.000Z');
      const first = repository.getOrCreateBinding('C:/repo-a', 'digest-a');
      expect(repository.getOrCreateBinding('C:/repo-a', 'digest-a').repoId).toBe(first.repoId);
      const second = repository.getOrCreateBinding('C:/repo-b', 'digest-b');
      repository.persist(first, state(first.repoId), [event(first.repoId)]);
      repository.persist(first, state(first.repoId, 2), [event(first.repoId)]);
      repository.persist(second, state(second.repoId), [event(second.repoId)]);
      expect(repository.eventCount(first.repoId)).toBe(1);
      expect(repository.eventCount(second.repoId)).toBe(1);
      expect(repository.loadSnapshot(first.repoId)).toMatchObject({ sequence: 1, state: { revision: 2 } });
    } finally {
      db.close();
    }
  });

  it('redacts sensitive fields before persistence', () => {
    const db = openTemporalAgentDatabase(':memory:');
    try {
      const repository = new PipelineRepository(db);
      const binding = repository.getOrCreateBinding('C:/repo', 'digest');
      const unsafe = { ...state(binding.repoId), diagnostics: [], apiToken: 'do-not-store', nested: { reasoning: 'private' } } as PipelineState;
      repository.persist(binding, unsafe, []);
      const raw = db.prepare('SELECT state_json FROM pipeline_snapshot WHERE repo_id = ?').get(binding.repoId) as { state_json: string };
      expect(raw.state_json).not.toContain('do-not-store');
      expect(raw.state_json).not.toContain('private');
      expect(raw.state_json).toContain('[REDACTED]');
    } finally {
      db.close();
    }
  });

  it('persists JSONL cursors outside the observed repo', () => {
    const db = openTemporalAgentDatabase(':memory:');
    try {
      const repository = new PipelineRepository(db, () => '2026-07-23T20:00:00.000Z');
      const binding = repository.getOrCreateBinding('C:/repo', 'digest');
      repository.saveCursor(binding.repoId, 'docs/ai/logs/gates.jsonl', { offset: 42, pending: '{"partial":', generation: null });
      expect(repository.loadCursor(binding.repoId, 'docs/ai/logs/gates.jsonl')).toEqual({ offset: 42, pending: '{"partial":', generation: null });
    } finally {
      db.close();
    }
  });
});
