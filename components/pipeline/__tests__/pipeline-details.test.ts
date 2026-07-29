import { describe, expect, it } from 'vitest';
import { RUNNING_SNAPSHOT } from '../__fixtures__/pipeline-fixtures';

describe('Pipeline details', () => {
  it('includes proposal and diffs in RUNNING_SNAPSHOT', () => {
    expect(RUNNING_SNAPSHOT.proposal).toBeDefined();
    expect(RUNNING_SNAPSHOT.diffs).toBeDefined();
    expect(RUNNING_SNAPSHOT.diffs?.length).toBeGreaterThan(0);
  });

  it('ensures diffs preserve agent and task provenance correlation without dummy fallback', () => {
    const diffs = RUNNING_SNAPSHOT.diffs ?? [];
    const withAgent = diffs.find((d) => d.agentId !== null);
    const withoutAgent = diffs.find((d) => d.agentId === null);

    expect(withAgent?.agentId).toBe('orch-1');
    expect(withAgent?.taskId).toBe('setup-workspace');

    // Honesty rule: missing provenance is explicitly null, never empty string or false ID
    expect(withoutAgent?.agentId).toBeNull();
    expect(withoutAgent?.taskId).toBeNull();
  });
});
