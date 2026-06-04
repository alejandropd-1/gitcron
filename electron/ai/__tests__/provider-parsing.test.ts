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
      description: 'Store each prediction run and its speculative branches in SQLite.',
      rationale: 'SQLite is available in main.',
      type: 'trend',
      confidence: 0.72,
    });

    expect(branch).not.toBeNull();
    expectUuid(branch!.id);
    expect(branch!.id).not.toBe('llm-branch-1');
    expect(branch!.sourceId).toBe('llm-branch-1');
    expect(branch!.message).toBe('Persist prediction history');
    expect(branch!.description).toBe('Store each prediction run and its speculative branches in SQLite.');
    expect(branch!.rationale).toBe('SQLite is available in main.');
    expect(branch!.type).toBe('trend');
    expect(branch!.confidence).toBe(0.72);
  });

  it('keeps sourceId and description null when the provider does not emit them', () => {
    const branch = normalizeBranch({
      message: 'Add calibration dashboard',
      rationale: 'Historical outcomes enable analysis.',
      type: 'improvement',
      confidence: 0.64,
    });

    expect(branch).not.toBeNull();
    expectUuid(branch!.id);
    expect(branch!.sourceId).toBeNull();
    expect(branch!.description).toBeNull();
    expect(branch!.message).toBe('Add calibration dashboard');
    expect(branch!.rationale).toBe('Historical outcomes enable analysis.');
    expect(branch!.type).toBe('improvement');
    expect(branch!.confidence).toBe(0.64);
  });

  it('normalizes empty descriptions to null without changing existing fields', () => {
    const branch = normalizeBranch({
      id: 'llm-branch-blank-description',
      message: 'Keep legacy parsing stable',
      description: '   ',
      rationale: 'Some models may ignore or partially fill the new field.',
      type: 'breakthrough',
      confidence: '55%',
    });

    expect(branch).not.toBeNull();
    expect(branch!.sourceId).toBe('llm-branch-blank-description');
    expect(branch!.message).toBe('Keep legacy parsing stable');
    expect(branch!.description).toBeNull();
    expect(branch!.rationale).toBe('Some models may ignore or partially fill the new field.');
    expect(branch!.type).toBe('breakthrough');
    expect(branch!.confidence).toBe(0.55);
  });
});
