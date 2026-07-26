import { describe, expect, it } from 'vitest';
import type { PipelineState } from '@/types/pipeline';
import { toPipelineSnapshot } from '../pipeline-adapter';
import { hasUsableCostCoverage } from '../pipeline-domain';

function state(overrides: Partial<PipelineState> = {}): PipelineState {
  return {
    repoId: 'repo-1',
    observedAt: '2026-07-25T00:00:00.000Z',
    revision: 1,
    tasks: [],
    reports: [],
    gates: [],
    delegations: [],
    visualDiffs: [],
    decisions: [],
    activeChanges: [],
    archivedChanges: [],
    mergedChanges: [],
    diagnostics: [],
    selection: { changeId: null, confidence: 'unknown', selectionRequired: false, reason: '' },
    ...overrides,
  };
}

const delegation = (over: Partial<PipelineState['delegations'][number]> = {}) => ({
  ts: '2026-07-25T00:00:00.000Z',
  role: 'builder',
  model: 'claude-opus-5',
  task: 'x',
  result: 'ok',
  tokensIn: 100,
  tokensOut: 50,
  costUsd: 0.5,
  durationMs: 1000,
  retries: null,
  humanWaitMs: null,
  humanTouches: null,
  ...over,
});

describe('toPipelineSnapshot', () => {
  it('reports no activity for an empty repo instead of inventing one', () => {
    expect(toPipelineSnapshot(state()).hasPipelineActivity).toBe(false);
  });

  it('never turns missing telemetry into zero', () => {
    const snapshot = toPipelineSnapshot(state({
      delegations: [delegation({ tokensIn: null, tokensOut: null, costUsd: null })],
    }));
    expect(snapshot.economy.tokens.input).toBeNull();
    expect(snapshot.economy.tokens.output).toBeNull();
    expect(snapshot.economy.costUsd).toBeNull();
    expect(snapshot.economy.costBasis).toBe('unknown');
  });

  it('keeps reasoning and cache tokens unknown: this source does not carry them', () => {
    const snapshot = toPipelineSnapshot(state({ delegations: [delegation()] }));
    expect(snapshot.economy.tokens.reasoning).toBeNull();
    expect(snapshot.economy.tokens.cacheRead).toBeNull();
    expect(snapshot.economy.reasoningAvailable).toBe(false);
  });

  it('sums only the records that reported a value', () => {
    const snapshot = toPipelineSnapshot(state({
      delegations: [delegation({ tokensIn: 100 }), delegation({ tokensIn: null })],
    }));
    expect(snapshot.economy.tokens.input).toBe(100);
  });

  it('marks cost coverage as partial when some delegations lack it', () => {
    const snapshot = toPipelineSnapshot(state({
      delegations: [delegation({ costUsd: 0.5 }), delegation({ costUsd: null })],
    }));
    expect(snapshot.economy.costCoverage).toEqual({ withCost: 1, total: 2 });
    expect(hasUsableCostCoverage(snapshot.economy)).toBe(false);
  });

  it('does not invent a parent/child tree the evidence never recorded', () => {
    const snapshot = toPipelineSnapshot(state({
      delegations: [delegation(), delegation()],
    }));
    expect(snapshot.agents.every((agent) => agent.parentAgentId === null)).toBe(true);
    expect(snapshot.agents.every((agent) => agent.runtime === null)).toBe(true);
  });

  it('does not guess which runtime ran from repo evidence', () => {
    const snapshot = toPipelineSnapshot(state({ delegations: [delegation()] }));
    expect(snapshot.now.runtime).toBeNull();
  });

  it('sends the path back to the fixer when the auditor rejected', () => {
    const snapshot = toPipelineSnapshot(state({
      activeChanges: ['change-1'],
      decisions: [{
        decisionId: 'd1', repoId: 'repo-1', changeId: null, kind: 'audit-rejected',
        status: 'pending', title: 'rechazo', summary: '', risk: 'high', riskReason: null,
        provenance: 'repo', evidenceRefs: [], requestedAt: '2026-07-25T00:00:00.000Z',
      }],
    }));
    const byId = new Map(snapshot.stations.map((s) => [s.id, s.state]));
    expect(byId.get('auditor')).toBe('rejected');
    expect(byId.get('fixer')).toBe('current');
  });

  it('marks a red gate as rejected rather than merely pending', () => {
    const snapshot = toPipelineSnapshot(state({
      gates: [{ ts: '2026-07-25T00:00:00.000Z', mode: 'fast', result: 'ROJO' }],
    }));
    expect(snapshot.stations.find((s) => s.id === 'gates')?.state).toBe('rejected');
  });

  it('only advertises the kit as a source when gates or reports exist', () => {
    expect(toPipelineSnapshot(state()).availableSources).toEqual(['git']);
    const withKit = toPipelineSnapshot(state({ reports: ['r.md'] }));
    expect(withKit.availableSources).toContain('kit');
  });

  it('surfaces only pending decisions and never exposes an executable option', () => {
    const snapshot = toPipelineSnapshot(state({
      decisions: [
        {
          decisionId: 'd1', repoId: 'repo-1', changeId: null, kind: 'dependency-request',
          status: 'pending', title: 'dep', summary: 'por qué', risk: 'high', riskReason: 'x',
          provenance: 'repo', evidenceRefs: ['gates.jsonl'], requestedAt: '2026-07-25T00:00:00.000Z',
        },
        {
          decisionId: 'd2', repoId: 'repo-1', changeId: null, kind: 'clarification',
          status: 'answered', title: 'vieja', summary: '', risk: 'low', riskReason: null,
          provenance: 'repo', evidenceRefs: [], requestedAt: '2026-07-25T00:00:00.000Z',
        },
      ],
    }));
    expect(snapshot.decisions.map((d) => d.decisionId)).toEqual(['d1']);
    expect(snapshot.decisions[0].options.every((o) => o.availability === 'informational')).toBe(true);
    expect(snapshot.now.needsHuman).toBe(true);
  });

  it('leaves the activity log empty because this source has no runtime stream', () => {
    expect(toPipelineSnapshot(state({ delegations: [delegation()] })).activity).toEqual([]);
  });
});
