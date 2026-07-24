import { describe, expect, it } from 'vitest';
import type { PipelineEvidence, PipelineState } from '../../../types/pipeline';
import { reducePipelineEvidence } from '../reducer';

function evidence(overrides: Partial<PipelineEvidence> = {}): PipelineEvidence {
  return {
    repoId: 'repo-1', observedAt: '2026-07-23T20:00:00.000Z', tasks: [], reports: [], gates: [],
    activeChanges: [], archivedChanges: [], mergedChanges: [], diagnostics: [], delegations: [], visualDiffs: [], decisions: [],
    selection: { changeId: null, confidence: 'unknown', selectionRequired: false, reason: 'no-active-change' },
    ...overrides,
  };
}

describe('reducePipelineEvidence', () => {
  it('emits stable semantic transitions once', () => {
    const previous = { ...evidence({
      tasks: [{ id: 'task-1', text: 'Work', completed: false, line: 1, sourceRef: 'tasks.md' }],
      gates: [{ ts: '1', mode: 'fast', result: 'ROJO' }],
    }), revision: 1 } satisfies PipelineState;
    const current = evidence({
      tasks: [{ id: 'task-1', text: 'Work', completed: true, line: 1, sourceRef: 'tasks.md' }],
      reports: ['report.md'], gates: [{ ts: '2', mode: 'fast', result: 'VERDE' }],
      archivedChanges: ['change-a'], mergedChanges: ['change-a'],
    });
    const first = reducePipelineEvidence(current, previous);
    expect(first.events.map((item) => item.kind)).toEqual([
      'task.completed', 'report.added', 'gate.changed', 'change.merged', 'change.archived',
    ]);
    const second = reducePipelineEvidence(current, first.state);
    expect(second.events).toEqual([]);
    expect(first.events[0].eventId).toHaveLength(64);
  });
});
