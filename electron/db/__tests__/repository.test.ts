import { describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openTemporalAgentDatabase } from '../connection';
import {
  getAllRuns,
  getBranchesForRun,
  getDecisionsForBranch,
  getLatestDecision,
  getRunsForRepo,
  insertDecision,
  insertPrediction,
} from '../repository';
import type { DeviceIdentity, NewPrediction } from '../types';

const DEVICE: DeviceIdentity = {
  deviceId: '11111111-1111-4111-8111-111111111111',
  deviceLabel: 'test-machine',
};

function withDb(test: (db: DatabaseSync) => void): void {
  const db = openTemporalAgentDatabase(':memory:');
  try {
    test(db);
  } finally {
    db.close();
  }
}

function basePrediction(overrides: Partial<NewPrediction> = {}): NewPrediction {
  return {
    repoPath: 'C:/work/repo',
    provider: 'claude',
    model: 'claude-sonnet-4.5',
    contextScope: 'metadata',
    inputCommitCount: 40,
    webTrends: false,
    generatedAt: '2026-06-03T10:00:00.000Z',
    branches: [
      {
        sourceId: 'branch-1',
        message: 'Extract IPC layer into a typed contract module',
        rationale: 'Recent commits keep touching Electron handlers.',
        type: 'improvement',
        confidence: 0.82,
      },
      {
        sourceId: 'branch-2',
        message: 'Add prediction history search',
        rationale: 'Persisted runs will need basic navigation later.',
        type: 'trend',
        confidence: 0.61,
      },
      {
        sourceId: 'branch-3',
        message: 'Introduce speculative replay mode',
        rationale: 'The historical data can support richer future analysis.',
        type: 'breakthrough',
        confidence: 0.73,
      },
    ],
    ...overrides,
  };
}

function repositoryOptions(db: DatabaseSync, now = () => '2026-06-03T10:00:01.000Z') {
  return {
    db,
    deviceIdentity: DEVICE,
    appVersion: '1.7.0-test',
    now,
  };
}

function expectUuid(value: string): void {
  expect(value).toMatch(/^[0-9a-f-]{36}$/i);
}

function tableCount(db: DatabaseSync, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}

describe('Temporal Agent repository', () => {
  it('inserts a prediction batch and reads its run and branches back', () => {
    withDb((db) => {
      const result = insertPrediction(basePrediction(), repositoryOptions(db));

      expectUuid(result.runId);
      expect(result.branchIds).toHaveLength(3);
      result.branchIds.forEach(expectUuid);

      const runs = getRunsForRepo('C:/work/repo', { db });
      expect(runs).toHaveLength(1);
      expect(runs[0]).toMatchObject({
        id: result.runId,
        repoPath: 'C:/work/repo',
        deviceId: DEVICE.deviceId,
        deviceLabel: DEVICE.deviceLabel,
        provider: 'claude',
        model: 'claude-sonnet-4.5',
        appVersion: '1.7.0-test',
        contextScope: 'metadata',
        inputCommitCount: 40,
        webTrends: 0,
        generatedAt: '2026-06-03T10:00:00.000Z',
        createdAt: '2026-06-03T10:00:01.000Z',
      });

      const branches = getBranchesForRun(result.runId, { db });
      expect(branches).toHaveLength(3);
      expect(branches[0]).toMatchObject({
        id: result.branchIds[0],
        runId: result.runId,
        sourceId: 'branch-1',
        message: 'Extract IPC layer into a typed contract module',
        type: 'improvement',
        confidence: 0.82,
      });
    });
  });

  it('persists optional pass-through fields when provided and null otherwise', () => {
    withDb((db) => {
      const withOptional = insertPrediction(
        basePrediction({
          headSha: 'abc123',
          inputHash: 'input-hash-1',
          branches: [
            {
              sourceId: 'with-description',
              message: 'Describe the idea',
              description: 'A concise proposal description.',
              rationale: 'The prompt may start emitting descriptions later.',
              type: 'improvement',
              confidence: 0.4,
            },
          ],
        }),
        repositoryOptions(db),
      );
      const withoutOptional = insertPrediction(
        basePrediction({
          repoPath: 'C:/work/other',
          branches: [
            {
              message: 'No optional fields',
              rationale: 'Older prediction outputs may omit optional fields.',
              type: 'trend',
              confidence: 0.5,
            },
          ],
        }),
        repositoryOptions(db),
      );

      expect(getRunsForRepo('C:/work/repo', { db })[0]).toMatchObject({
        headSha: 'abc123',
        inputHash: 'input-hash-1',
      });
      expect(getBranchesForRun(withOptional.runId, { db })[0].description).toBe(
        'A concise proposal description.',
      );

      expect(getRunsForRepo('C:/work/other', { db })[0]).toMatchObject({
        headSha: null,
        inputHash: null,
      });
      expect(getBranchesForRun(withoutOptional.runId, { db })[0]).toMatchObject({
        sourceId: null,
        description: null,
      });
    });
  });

  it('rolls back the whole prediction batch if a branch insert is invalid', () => {
    withDb((db) => {
      expect(() => {
        insertPrediction(
          basePrediction({
            branches: [
              {
                message: 'Valid first branch',
                rationale: 'This should still roll back with the batch.',
                type: 'improvement',
                confidence: 0.3,
              },
              {
                message: 'Invalid branch',
                rationale: 'Confidence is not normalized.',
                type: 'trend',
                confidence: 85,
              },
            ],
          }),
          repositoryOptions(db),
        );
      }).toThrow(/confidence/i);

      expect(getAllRuns({ db })).toHaveLength(0);
      expect(tableCount(db, 'speculative_branch')).toBe(0);
    });
  });

  it('inserts decisions as an append-only log and returns the latest event', () => {
    withDb((db) => {
      let index = 0;
      const times = [
        '2026-06-03T10:00:01.000Z',
        '2026-06-03T10:00:02.000Z',
        '2026-06-03T10:00:03.000Z',
      ];
      const prediction = insertPrediction(basePrediction(), repositoryOptions(db, () => times[index++]));
      const branchId = prediction.branchIds[0];
      const options = repositoryOptions(db, () => times[index++]);

      const first = insertDecision({ branchId, decision: 'deferred', note: 'Wait.' }, options);
      const second = insertDecision(
        { branchId, decision: 'materialized', materializedRef: 'flight/conservative' },
        options,
      );

      const decisions = getDecisionsForBranch(branchId, { db });
      expect(decisions.map((decision) => decision.id)).toEqual([first.decisionId, second.decisionId]);
      expect(decisions.map((decision) => decision.decision)).toEqual(['deferred', 'materialized']);
      expect(decisions.every((decision) => decision.deviceId === DEVICE.deviceId)).toBe(true);
      expect(decisions[1].materializedRef).toBe('flight/conservative');
      expect(getLatestDecision(branchId, { db })).toMatchObject({
        id: second.decisionId,
        decision: 'materialized',
      });
    });
  });

  it('returns deferred as the latest event without interpreting it, and null for no decisions', () => {
    withDb((db) => {
      const prediction = insertPrediction(basePrediction(), repositoryOptions(db));
      const [withDeferred, withoutDecision] = prediction.branchIds;
      insertDecision({ branchId: withDeferred, decision: 'deferred' }, repositoryOptions(db));

      expect(getLatestDecision(withDeferred, { db })?.decision).toBe('deferred');
      expect(getLatestDecision(withoutDecision, { db })).toBeNull();
    });
  });

  it('validates provider, type, context scope, decision, and confidence', () => {
    withDb((db) => {
      expect(() => insertPrediction(
        { ...basePrediction(), provider: 'openrouter' as NewPrediction['provider'] },
        repositoryOptions(db),
      )).toThrow(/provider/i);
      expect(() => insertPrediction(
        { ...basePrediction(), contextScope: 'metadata-plus-files' as NewPrediction['contextScope'] },
        repositoryOptions(db),
      )).toThrow(/context scope/i);
      expect(() => insertPrediction(
        basePrediction({
          branches: [{
            message: 'Invalid type',
            rationale: 'Types are validated in access layer.',
            type: 'refactor' as NewPrediction['branches'][number]['type'],
            confidence: 0.5,
          }],
        }),
        repositoryOptions(db),
      )).toThrow(/prediction type/i);
      expect(() => insertPrediction(
        basePrediction({
          branches: [{
            message: 'Invalid confidence',
            rationale: 'Do not clamp confidence.',
            type: 'trend',
            confidence: -0.1,
          }],
        }),
        repositoryOptions(db),
      )).toThrow(/confidence/i);

      const edges = insertPrediction(
        basePrediction({
          repoPath: 'C:/work/confidence-edges',
          branches: [
            {
              message: 'Zero confidence edge',
              rationale: 'A normalized lower-bound confidence is valid.',
              type: 'improvement',
              confidence: 0,
            },
            {
              message: 'One confidence edge',
              rationale: 'A normalized upper-bound confidence is valid.',
              type: 'trend',
              confidence: 1,
            },
          ],
        }),
        repositoryOptions(db),
      );
      expect(getBranchesForRun(edges.runId, { db }).map((branch) => branch.confidence)).toEqual([0, 1]);

      const prediction = insertPrediction(basePrediction(), repositoryOptions(db));
      expect(() => insertDecision(
        { branchId: prediction.branchIds[0], decision: 'accepted' as never },
        repositoryOptions(db),
      )).toThrow(/decision/i);
    });
  });
});
