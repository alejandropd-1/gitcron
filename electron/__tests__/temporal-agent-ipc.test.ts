import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase } from '../db/connection';
import { DEVICE_IDENTITY_FILENAME } from '../db/device';
import { getDecisionsForBranch, insertDecision, insertPrediction } from '../db/repository';
import type { NewDecision, NewPrediction } from '../db/types';
import {
  loadNotes,
  mapDecisionOutcome,
  recordDecision,
} from '../temporal-agent-ipc';
import type { TemporalAgentDecision } from '../../types/temporal-agent';

const electronMock = vi.hoisted(() => ({
  userDataPath: '',
  handlers: new Map<string, unknown>(),
}));

vi.mock('electron', () => ({
  app: {
    getPath: () => electronMock.userDataPath,
    getVersion: () => '1.7.0-test',
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: unknown) => {
      electronMock.handlers.set(channel, handler);
    }),
  },
}));

const DEVICE_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function basePrediction(): NewPrediction {
  return {
    repoPath: 'C:/work/repo',
    provider: 'deepseek',
    model: 'deepseek/deepseek-chat',
    contextScope: 'metadata',
    inputCommitCount: 12,
    webTrends: false,
    generatedAt: '2026-06-04T10:00:00.000Z',
    branches: [{
      id: BRANCH_ID,
      sourceId: 'llm-branch-1',
      message: 'Persist human decisions',
      rationale: 'Decision events are useful history.',
      type: 'improvement',
      confidence: 0.84,
    }],
  };
}

function baseDecision(overrides: Partial<TemporalAgentDecision> = {}): TemporalAgentDecision {
  return {
    date: '2026-06-04T10:00:01.000Z',
    branchId: BRANCH_ID,
    suggestionTitle: 'Persist human decisions',
    type: 'improvement',
    outcome: 'accepted',
    confidence: 0.84,
    reasoning: 'Worth trying.',
    impact: 'Accepted for materialization evaluation.',
    ...overrides,
  };
}

function writeDeviceIdentity(userDataPath: string): void {
  fs.mkdirSync(userDataPath, { recursive: true });
  fs.writeFileSync(
    path.join(userDataPath, DEVICE_IDENTITY_FILENAME),
    JSON.stringify({ deviceId: DEVICE_ID, deviceLabel: 'current-device' }),
  );
}

function insertDecisionForTest(input: NewDecision): { decisionId: string } {
  return insertDecision(input, { userDataPath: electronMock.userDataPath });
}

beforeEach(() => {
  electronMock.userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-temporal-ipc-'));
  writeDeviceIdentity(electronMock.userDataPath);
});

afterEach(() => {
  closeDatabase();
  if (electronMock.userDataPath.startsWith(os.tmpdir())) {
    fs.rmSync(electronMock.userDataPath, { recursive: true, force: true });
  }
});

describe('Temporal Agent decision persistence wiring', () => {
  it('maps UI outcomes to branch_decision values', () => {
    expect(mapDecisionOutcome('accepted')).toBe('accepted');
    expect(mapDecisionOutcome('rejected')).toBe('rejected');
    expect(mapDecisionOutcome('deferred')).toBe('deferred');
  });

  it('records a known branch decision in JSON and SQLite with the current device id', async () => {
    insertPrediction(basePrediction(), {
      userDataPath: electronMock.userDataPath,
      appVersion: '1.7.0-test',
      now: () => '2026-06-04T10:00:00.500Z',
    });

    const notes = await recordDecision('C:/work/repo', 'Repo', baseDecision(), {
      insertDecision: insertDecisionForTest,
    });

    expect(notes.decisions).toHaveLength(1);
    expect(notes.decisions[0].branchId).toBe(BRANCH_ID);

    const decisions = getDecisionsForBranch(BRANCH_ID, { userDataPath: electronMock.userDataPath });
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      branchId: BRANCH_ID,
      deviceId: DEVICE_ID,
      decision: 'accepted',
      materializedRef: null,
      note: 'Worth trying.',
      decidedAt: '2026-06-04T10:00:01.000Z',
    });
  });

  it('records accept and materialize as distinct append-only decision events', async () => {
    insertPrediction(basePrediction(), {
      userDataPath: electronMock.userDataPath,
      appVersion: '1.7.0-test',
    });

    await recordDecision('C:/work/repo', 'Repo', baseDecision(), {
      insertDecision: insertDecisionForTest,
    });
    await recordDecision('C:/work/repo', 'Repo', baseDecision({
      date: '2026-06-04T10:00:02.000Z',
      persistenceDecision: 'materialized',
      materializedRef: 'flight/conservative',
      impact: 'Materialized as flight/conservative.',
    }), {
      insertDecision: insertDecisionForTest,
    });

    const decisions = getDecisionsForBranch(BRANCH_ID, { userDataPath: electronMock.userDataPath });
    expect(decisions.map((decision) => decision.decision)).toEqual(['accepted', 'materialized']);
    expect(decisions[0].materializedRef).toBeNull();
    expect(decisions[1].materializedRef).toBe('flight/conservative');
  });

  it('keeps decision events append-only for repeated decisions on the same branch', async () => {
    insertPrediction(basePrediction(), {
      userDataPath: electronMock.userDataPath,
      appVersion: '1.7.0-test',
    });

    await recordDecision('C:/work/repo', 'Repo', baseDecision({ outcome: 'rejected' }), {
      insertDecision: insertDecisionForTest,
    });
    await recordDecision('C:/work/repo', 'Repo', baseDecision({
      date: '2026-06-04T10:00:02.000Z',
      outcome: 'deferred',
      reasoning: undefined,
    }), {
      insertDecision: insertDecisionForTest,
    });

    const decisions = getDecisionsForBranch(BRANCH_ID, { userDataPath: electronMock.userDataPath });
    expect(decisions.map((decision) => decision.decision)).toEqual(['rejected', 'deferred']);
  });

  it('does not propagate insertDecision failures and still writes JSON notes', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failingInsert = (_input: NewDecision) => {
      throw new Error('forced insert failure https://x-access-token:super-secret@github.com/acme/repo.git');
    };

    await expect(recordDecision('C:/work/repo', 'Repo', baseDecision(), {
      insertDecision: failingInsert,
    })).resolves.toMatchObject({
      decisions: [expect.objectContaining({ branchId: BRANCH_ID })],
    });

    expect(errorSpy).toHaveBeenCalledWith(
      '[temporal-agent-db] decision persistence miss:',
      expect.stringContaining('x-access-token:[REDACTED]@github.com/acme/repo.git'),
    );
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('super-secret'),
    );
    expect((await loadNotes('C:/work/repo', 'Repo')).decisions).toHaveLength(1);
    errorSpy.mockRestore();
  });

  it('logs a missing branch FK miss and still writes JSON notes', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(recordDecision('C:/work/repo', 'Repo', baseDecision({
      branchId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    }), {
      insertDecision: insertDecisionForTest,
    })).resolves.toMatchObject({
      decisions: [expect.objectContaining({ branchId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })],
    });

    expect(errorSpy).toHaveBeenCalledWith(
      '[temporal-agent-db] decision persistence miss:',
      expect.stringMatching(/FOREIGN KEY|constraint/i),
    );
    errorSpy.mockRestore();
  });
});
