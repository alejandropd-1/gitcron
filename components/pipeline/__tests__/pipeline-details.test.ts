import { describe, expect, it } from 'vitest';
import { RUNNING_SNAPSHOT, REJECTED_SNAPSHOT } from '../__fixtures__/pipeline-fixtures';

describe('Pipeline Details Data & Domain (Tanda 4)', () => {
  it('includes proposal, diffs, auditor findings and gate history in RUNNING_SNAPSHOT', () => {
    expect(RUNNING_SNAPSHOT.proposal).toBeDefined();
    expect(RUNNING_SNAPSHOT.proposal?.title).toContain('Fase 04');
    expect(RUNNING_SNAPSHOT.diffs).toBeDefined();
    expect(RUNNING_SNAPSHOT.diffs?.length).toBeGreaterThan(0);
    expect(RUNNING_SNAPSHOT.auditorFindings).toBeDefined();
    expect(RUNNING_SNAPSHOT.gateHistory).toBeDefined();
  });

  it('populates high risk auditor findings and failed gates in REJECTED_SNAPSHOT', () => {
    expect(REJECTED_SNAPSHOT.auditorFindings).toBeDefined();
    const highRisk = REJECTED_SNAPSHOT.auditorFindings?.find((f) => f.risk === 'high');
    expect(highRisk).toBeDefined();
    expect(highRisk?.category).toContain('Dependencias');

    const failedGate = REJECTED_SNAPSHOT.gateHistory?.find((g) => g.status === 'ROJO');
    expect(failedGate).toBeDefined();
    expect(failedGate?.gateId).toBe('C2');
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
