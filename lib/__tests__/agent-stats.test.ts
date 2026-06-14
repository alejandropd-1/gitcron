import { describe, expect, it } from 'vitest';
import type { PredictionHistoryEntry, PredictionRunRow, SpeculativeBranchRow, BranchDecisionRow } from '../../electron/db/types';
import {
  brierScore,
  calibrationCurve,
  outcomeBreakdown,
  acceptanceByType,
  providerComparison,
  getBranchOutcome,
  getLatestDecision,
} from '../agent-stats';

// Helper to construct a mock run row
function mockRun(overrides: Partial<PredictionRunRow> = {}): PredictionRunRow {
  return {
    id: 'run-1',
    repoPath: 'C:/work/repo',
    deviceId: 'device-1',
    deviceLabel: 'current-device',
    provider: 'openrouter',
    model: 'anthropic/claude-sonnet-4.5',
    appVersion: '1.8.2',
    contextScope: 'metadata',
    inputCommitCount: 10,
    webTrends: 0,
    headSha: 'abc1234',
    inputHash: 'hash123',
    generatedAt: '2026-06-14T10:00:00.000Z',
    createdAt: '2026-06-14T10:00:01.000Z',
    ...overrides,
  };
}

// Helper to construct a mock branch row
function mockBranch(overrides: Partial<SpeculativeBranchRow> = {}): SpeculativeBranchRow {
  return {
    id: 'branch-1',
    runId: 'run-1',
    sourceId: 'src-1',
    message: 'Test branch suggestion',
    description: 'A test description',
    rationale: 'Rationale for testing',
    type: 'improvement',
    confidence: 0.8,
    ...overrides,
  };
}

// Helper to construct a mock decision row
function mockDecision(overrides: Partial<BranchDecisionRow> = {}): BranchDecisionRow {
  return {
    id: 'decision-1',
    branchId: 'branch-1',
    deviceId: 'device-1',
    decision: 'accepted',
    materializedRef: null,
    note: null,
    decidedAt: '2026-06-14T10:05:00.000Z',
    ...overrides,
  };
}

describe('agent-stats computations', () => {
  describe('getBranchOutcome', () => {
    it('returns null if there are no decisions', () => {
      expect(getBranchOutcome([])).toBeNull();
    });

    it('returns 1 for accepted or materialized decisions', () => {
      const d1 = mockDecision({ decision: 'accepted' });
      expect(getBranchOutcome([d1])).toBe(1);

      const d2 = mockDecision({ decision: 'materialized', decidedAt: '2026-06-14T10:06:00.000Z' });
      expect(getBranchOutcome([d1, d2])).toBe(1);
    });

    it('returns 0 for rejected decisions', () => {
      const d = mockDecision({ decision: 'rejected' });
      expect(getBranchOutcome([d])).toBe(0);
    });

    it('returns null for deferred decisions', () => {
      const d = mockDecision({ decision: 'deferred' });
      expect(getBranchOutcome([d])).toBeNull();
    });

    it('respects chronological order for outcome', () => {
      const d1 = mockDecision({ decision: 'deferred', decidedAt: '2026-06-14T10:01:00.000Z' });
      const d2 = mockDecision({ decision: 'accepted', decidedAt: '2026-06-14T10:02:00.000Z' });
      const d3 = mockDecision({ decision: 'rejected', decidedAt: '2026-06-14T10:03:00.000Z' });

      // Out of order array input should still resolve to d3 (rejected -> 0) since it has latest decidedAt
      expect(getBranchOutcome([d2, d3, d1])).toBe(0);
    });
  });

  describe('brierScore', () => {
    it('returns null for empty predictions array', () => {
      expect(brierScore([])).toBeNull();
    });

    it('returns null if all predictions are deferred or unresolved', () => {
      const input: PredictionHistoryEntry[] = [{
        run: mockRun(),
        branches: [
          { branch: mockBranch({ confidence: 0.8 }), decisions: [mockDecision({ decision: 'deferred' })] },
          { branch: mockBranch({ confidence: 0.5 }), decisions: [] },
        ],
      }];
      expect(brierScore(input)).toBeNull();
    });

    it('correctly calculates Brier score for resolved predictions', () => {
      // Branch 1: confidence 0.8, outcome 1 (accepted) -> squared diff = (0.8 - 1)^2 = 0.04
      // Branch 2: confidence 0.4, outcome 0 (rejected) -> squared diff = (0.4 - 0)^2 = 0.16
      // Branch 3: confidence 0.7, outcome null (deferred) -> excluded
      const input: PredictionHistoryEntry[] = [{
        run: mockRun(),
        branches: [
          { branch: mockBranch({ id: 'b1', confidence: 0.8 }), decisions: [mockDecision({ branchId: 'b1', decision: 'accepted' })] },
          { branch: mockBranch({ id: 'b2', confidence: 0.4 }), decisions: [mockDecision({ branchId: 'b2', decision: 'rejected' })] },
          { branch: mockBranch({ id: 'b3', confidence: 0.7 }), decisions: [mockDecision({ branchId: 'b3', decision: 'deferred' })] },
        ],
      }];

      // Expected = (0.04 + 0.16) / 2 = 0.1
      expect(brierScore(input)).toBeCloseTo(0.1);
    });
  });

  describe('calibrationCurve', () => {
    it('returns empty/null structures for empty predictions', () => {
      const curve = calibrationCurve([], 5);
      expect(curve).toHaveLength(5);
      curve.forEach((bin) => {
        expect(bin.count).toBe(0);
        expect(bin.meanConfidence).toBeNull();
        expect(bin.accuracy).toBeNull();
      });
    });

    it('correctly distributes predictions into confidence bins', () => {
      // Bins width for 5 bins: 0.2
      // Bin 0: [0.0 - 0.2)
      // Bin 1: [0.2 - 0.4)
      // Bin 2: [0.4 - 0.6)
      // Bin 3: [0.6 - 0.8)
      // Bin 4: [0.8 - 1.0]

      const input: PredictionHistoryEntry[] = [{
        run: mockRun(),
        branches: [
          // falls into Bin 4 (conf 0.9, accepted -> 1)
          { branch: mockBranch({ id: 'b1', confidence: 0.9 }), decisions: [mockDecision({ branchId: 'b1', decision: 'accepted' })] },
          // falls into Bin 4 (conf 0.8, rejected -> 0)
          { branch: mockBranch({ id: 'b2', confidence: 0.8 }), decisions: [mockDecision({ branchId: 'b2', decision: 'rejected' })] },
          // falls into Bin 2 (conf 0.5, accepted -> 1)
          { branch: mockBranch({ id: 'b3', confidence: 0.5 }), decisions: [mockDecision({ branchId: 'b3', decision: 'materialized' })] },
          // excluded (deferred)
          { branch: mockBranch({ id: 'b4', confidence: 0.3 }), decisions: [mockDecision({ branchId: 'b4', decision: 'deferred' })] },
        ],
      }];

      const curve = calibrationCurve(input, 5);
      expect(curve).toHaveLength(5);

      // Bin 2: [0.4 - 0.6)
      expect(curve[2].count).toBe(1);
      expect(curve[2].meanConfidence).toBeCloseTo(0.5);
      expect(curve[2].accuracy).toBeCloseTo(1.0);

      // Bin 4: [0.8 - 1.0]
      // Mean confidence: (0.9 + 0.8) / 2 = 0.85
      // Accuracy: (1 + 0) / 2 = 0.5
      expect(curve[4].count).toBe(2);
      expect(curve[4].meanConfidence).toBeCloseTo(0.85);
      expect(curve[4].accuracy).toBeCloseTo(0.5);

      // Bin 0, 1, 3 are empty
      [0, 1, 3].forEach((idx) => {
        expect(curve[idx].count).toBe(0);
        expect(curve[idx].meanConfidence).toBeNull();
        expect(curve[idx].accuracy).toBeNull();
      });
    });

    it('correctly places 1.0 confidence in the last bin', () => {
      const input: PredictionHistoryEntry[] = [{
        run: mockRun(),
        branches: [
          { branch: mockBranch({ id: 'b1', confidence: 1.0 }), decisions: [mockDecision({ branchId: 'b1', decision: 'accepted' })] },
        ],
      }];
      const curve = calibrationCurve(input, 10);
      expect(curve[9].count).toBe(1);
      expect(curve[9].meanConfidence).toBe(1.0);
    });
  });

  describe('outcomeBreakdown', () => {
    it('returns empty array if no predictions exist', () => {
      expect(outcomeBreakdown([])).toEqual([]);
    });

    it('groups counts correctly by day and sorts chronologically', () => {
      const input: PredictionHistoryEntry[] = [
        {
          run: mockRun({ generatedAt: '2026-06-15T10:00:00.000Z' }),
          branches: [
            { branch: mockBranch({ id: 'b1' }), decisions: [mockDecision({ branchId: 'b1', decision: 'accepted' })] },
            { branch: mockBranch({ id: 'b2' }), decisions: [mockDecision({ branchId: 'b2', decision: 'materialized' })] },
            { branch: mockBranch({ id: 'b3' }), decisions: [mockDecision({ branchId: 'b3', decision: 'deferred' })] },
          ],
        },
        {
          run: mockRun({ generatedAt: '2026-06-14T05:00:00.000Z' }),
          branches: [
            { branch: mockBranch({ id: 'b4' }), decisions: [mockDecision({ branchId: 'b4', decision: 'rejected' })] },
            { branch: mockBranch({ id: 'b5' }), decisions: [] },
          ],
        },
      ];

      const breakdown = outcomeBreakdown(input);
      expect(breakdown).toHaveLength(2);

      // Sorted chronologically: 14th comes first, then 15th
      expect(breakdown[0].period).toBe('2026-06-14');
      expect(breakdown[0].rejected).toBe(1);
      expect(breakdown[0].deferred).toBe(1);
      expect(breakdown[0].accepted).toBe(0);

      expect(breakdown[1].period).toBe('2026-06-15');
      expect(breakdown[1].accepted).toBe(1);
      expect(breakdown[1].materialized).toBe(1);
      expect(breakdown[1].deferred).toBe(1);
      expect(breakdown[1].rejected).toBe(0);
    });
  });

  describe('acceptanceByType', () => {
    it('returns 0 rates for all types if empty', () => {
      const stats = acceptanceByType([]);
      expect(stats.improvement).toEqual({ accepted: 0, total: 0, rate: 0 });
      expect(stats.breakthrough).toEqual({ accepted: 0, total: 0, rate: 0 });
      expect(stats.trend).toEqual({ accepted: 0, total: 0, rate: 0 });
    });

    it('calculates totals and rates correctly by prediction type', () => {
      const input: PredictionHistoryEntry[] = [{
        run: mockRun(),
        branches: [
          { branch: mockBranch({ id: 'b1', type: 'improvement' }), decisions: [mockDecision({ branchId: 'b1', decision: 'accepted' })] },
          { branch: mockBranch({ id: 'b2', type: 'improvement' }), decisions: [mockDecision({ branchId: 'b2', decision: 'rejected' })] },
          { branch: mockBranch({ id: 'b3', type: 'breakthrough' }), decisions: [mockDecision({ branchId: 'b3', decision: 'materialized' })] },
          { branch: mockBranch({ id: 'b4', type: 'trend' }), decisions: [mockDecision({ branchId: 'b4', decision: 'deferred' })] },
        ],
      }];

      const stats = acceptanceByType(input);

      expect(stats.improvement).toEqual({ accepted: 1, total: 2, rate: 0.5 });
      expect(stats.breakthrough).toEqual({ accepted: 1, total: 1, rate: 1.0 });
      expect(stats.trend).toEqual({ accepted: 0, total: 0, rate: 0.0 });
    });
  });

  describe('providerComparison', () => {
    it('returns empty array if no predictions exist', () => {
      expect(providerComparison([])).toEqual([]);
    });

    it('correctly compares Brier scores grouped by provider/model', () => {
      const input: PredictionHistoryEntry[] = [
        {
          run: mockRun({ provider: 'openrouter', model: 'claude-3.5' }),
          branches: [
            { branch: mockBranch({ id: 'b1', confidence: 0.9 }), decisions: [mockDecision({ branchId: 'b1', decision: 'accepted' })] }, // diff (0.9-1)^2 = 0.01
          ],
        },
        {
          run: mockRun({ provider: 'openrouter', model: 'gpt-4' }),
          branches: [
            { branch: mockBranch({ id: 'b2', confidence: 0.6 }), decisions: [mockDecision({ branchId: 'b2', decision: 'rejected' })] }, // diff (0.6-0)^2 = 0.36
          ],
        },
        {
          run: mockRun({ provider: 'openrouter', model: 'claude-3.5' }),
          branches: [
            { branch: mockBranch({ id: 'b3', confidence: 0.8 }), decisions: [mockDecision({ branchId: 'b3', decision: 'rejected' })] }, // diff (0.8-0)^2 = 0.64
          ],
        },
      ];

      const comp = providerComparison(input);
      expect(comp).toHaveLength(2);

      // Find claude-3.5 group
      const claude = comp.find(c => c.model === 'claude-3.5')!;
      expect(claude.provider).toBe('openrouter');
      expect(claude.count).toBe(2);
      // Brier for claude: (0.01 + 0.64) / 2 = 0.325
      expect(claude.brierScore).toBeCloseTo(0.325);

      // Find gpt-4 group
      const gpt = comp.find(c => c.model === 'gpt-4')!;
      expect(gpt.provider).toBe('openrouter');
      expect(gpt.count).toBe(1);
      // Brier for gpt: 0.36
      expect(gpt.brierScore).toBeCloseTo(0.36);
    });
  });
});
