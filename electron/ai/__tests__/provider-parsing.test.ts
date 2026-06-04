import { describe, expect, it } from 'vitest';
import { normalizeBranch } from '../provider-parsing';

function expectUuid(value: string): void {
  expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

describe('normalizeBranch identity', () => {
  it('mints a GitCron UUID for branch.id and preserves the provider id as sourceId', () => {
    const branch = normalizeBranch({
      id: 'llm-branch-1',
      message: 'Persist prediction history',
      rationale: 'SQLite is available in main.',
      type: 'trend',
      confidence: 0.72,
    });

    expect(branch).not.toBeNull();
    expectUuid(branch!.id);
    expect(branch!.id).not.toBe('llm-branch-1');
    expect(branch!.sourceId).toBe('llm-branch-1');
  });

  it('keeps sourceId null when the provider does not emit an id', () => {
    const branch = normalizeBranch({
      message: 'Add calibration dashboard',
      rationale: 'Historical outcomes enable analysis.',
      type: 'improvement',
      confidence: 0.64,
    });

    expect(branch).not.toBeNull();
    expectUuid(branch!.id);
    expect(branch!.sourceId).toBeNull();
  });
});
