import { describe, expect, it } from 'vitest';
import { RUNNING_SNAPSHOT } from '../__fixtures__/pipeline-fixtures';

describe('Pipeline details', () => {
  // La propuesta ya no viaja en un campo propio del snapshot: llega dentro de
  // los artefactos del cambio seleccionado, que es lo que lee el panel.
  it('carries the selected change artifacts and the diffs', () => {
    const selected = RUNNING_SNAPSHOT.openSpec?.activeChanges[0];
    expect(selected?.artifacts?.proposal).toBeTruthy();
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
