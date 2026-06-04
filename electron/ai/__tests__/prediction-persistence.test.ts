import { describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openTemporalAgentDatabase } from '../../db/connection';
import { getAllRuns, getBranchesForRun, insertPrediction } from '../../db/repository';
import {
  hashPredictionInput,
  persistPredictionRun,
} from '../prediction-persistence';
import type {
  PredictionInput,
  PredictionResult,
  TemporalAgentConfig,
  TemporalAgentNotes,
} from '../../../types/temporal-agent';

const config: TemporalAgentConfig = {
  repoHash: 'repo-hash',
  repoName: 'Repo',
  enabled: true,
  frequency: 'on-demand',
  privacyScope: 'metadata-plus-files',
  lastAnalysis: null,
  skillProfile: {
    focusAreas: [],
    avoidTopics: [],
    confidenceThreshold: 0.5,
  },
  model: '',
};

const notes: TemporalAgentNotes = {
  repoName: 'Repo',
  lastUpdated: '2026-06-03T00:00:00.000Z',
  decisions: [],
  summary: { accepted: 0, rejected: 0, deferred: 0, rejectedThemes: [] },
};

const branchOneId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const branchTwoId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const predictionInput: PredictionInput = {
  commitMessages: ['feat: add temporal agent', 'fix: keep sqlite local'],
  languages: ['TypeScript', 'Electron'],
  dependencies: {
    electron: '^42.0.1',
    next: '^15.4.9',
  },
  fileNames: ['electron/main.ts', 'electron/ai/predict.ts'],
  webTrends: false,
};

const result: PredictionResult = {
  provider: 'openrouter:anthropic/claude-sonnet-4.5',
  generatedAt: '2026-06-03T12:00:00.000Z',
  branches: [
    {
      id: branchOneId,
      sourceId: 'llm-branch-1',
      message: 'Persist prediction history',
      description: 'Store prediction runs and their speculative branches in SQLite for later analysis.',
      rationale: 'SQLite is now available in the main process.',
      type: 'improvement',
      confidence: 0.82,
    },
    {
      id: branchTwoId,
      sourceId: 'llm-branch-2',
      message: 'Add calibration dashboard later',
      description: null,
      rationale: 'Historical confidence/outcome pairs enable analysis.',
      type: 'trend',
      confidence: 0.64,
    },
  ],
  lang: 'es',
};

async function withDb(test: (db: DatabaseSync) => Promise<void> | void): Promise<void> {
  const db = openTemporalAgentDatabase(':memory:');
  try {
    await test(db);
  } finally {
    db.close();
  }
}

function insertForTest(db: DatabaseSync) {
  return (input: Parameters<typeof insertPrediction>[0]) => insertPrediction(input, {
    db,
    deviceIdentity: {
      deviceId: '22222222-2222-4222-8222-222222222222',
      deviceLabel: 'wiring-test',
    },
    appVersion: '1.7.0-test',
    now: () => '2026-06-03T12:00:01.000Z',
  });
}

describe('Temporal Agent prediction persistence wiring', () => {
  it('persists a mocked prediction result with mapped run and branch fields', async () => {
    await withDb(async (db) => {
      const ok = await persistPredictionRun({
        repoPath: 'C:/work/repo',
        config,
        providerId: 'openrouter',
        predictionInput,
        result,
      }, {
        insertPrediction: insertForTest(db),
        readHeadSha: async () => 'abc123head',
      });

      expect(ok).toBe(true);
      const runs = getAllRuns({ db });
      expect(runs).toHaveLength(1);
      expect(runs[0]).toMatchObject({
        repoPath: 'C:/work/repo',
        provider: 'anthropic',
        model: 'anthropic/claude-sonnet-4.5',
        contextScope: 'metadata_filenames',
        inputCommitCount: 2,
        webTrends: 0,
        headSha: 'abc123head',
        inputHash: hashPredictionInput(predictionInput),
        generatedAt: '2026-06-03T12:00:00.000Z',
        deviceId: '22222222-2222-4222-8222-222222222222',
      });

      const branches = getBranchesForRun(runs[0].id, { db });
      expect(branches).toHaveLength(2);
      expect(branches[0]).toMatchObject({
        id: branchOneId,
        sourceId: 'llm-branch-1',
        message: 'Persist prediction history',
        description: 'Store prediction runs and their speculative branches in SQLite for later analysis.',
        rationale: 'SQLite is now available in the main process.',
        type: 'improvement',
        confidence: 0.82,
      });
      expect(branches[1]).toMatchObject({
        id: branchTwoId,
        sourceId: 'llm-branch-2',
        type: 'trend',
        confidence: 0.64,
        description: null,
      });
    });
  });

  it('persists null source_id when the provider did not emit a source id', async () => {
    await withDb(async (db) => {
      await persistPredictionRun({
        repoPath: 'C:/work/no-source-id',
        config,
        providerId: 'openrouter',
        predictionInput,
        result: {
          ...result,
          branches: [{
            ...result.branches[0],
            id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            sourceId: null,
          }],
        },
      }, {
        insertPrediction: insertForTest(db),
        readHeadSha: async () => 'abc123head',
      });

      const run = getAllRuns({ db })[0];
      expect(getBranchesForRun(run.id, { db })[0]).toMatchObject({
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        sourceId: null,
      });
    });
  });

  it.each([
    ['anthropic/claude-3.5-sonnet', 'anthropic'],
    ['openai/gpt-4o', 'openai'],
    ['google/gemini-2.0-flash', 'google'],
    ['deepseek/deepseek-chat', 'deepseek'],
    ['meta-llama/llama-3.3-70b', 'meta-llama'],
    ['mistralai/mistral-large', 'mistralai'],
    ['qwen/qwen-2.5-72b', 'qwen'],
  ])('persists OpenRouter model family %s as provider %s', async (model, provider) => {
    await withDb(async (db) => {
      await persistPredictionRun({
        repoPath: `C:/work/${provider}`,
        config,
        providerId: 'openrouter',
        predictionInput,
        result: { ...result, provider: `openrouter:${model}` },
      }, {
        insertPrediction: insertForTest(db),
        readHeadSha: async () => 'abc123head',
      });

      expect(getAllRuns({ db })[0]).toMatchObject({
        provider,
        model,
      });
    });
  });

  it('persists deepseek as deepseek instead of the old openai fallback', async () => {
    await withDb(async (db) => {
      await persistPredictionRun({
        repoPath: 'C:/work/deepseek',
        config,
        providerId: 'openrouter',
        predictionInput,
        result: { ...result, provider: 'openrouter:deepseek/deepseek-chat' },
      }, {
        insertPrediction: insertForTest(db),
        readHeadSha: async () => 'abc123head',
      });

      expect(getAllRuns({ db })[0]).toMatchObject({
        provider: 'deepseek',
        model: 'deepseek/deepseek-chat',
      });
      expect(getAllRuns({ db })[0].provider).not.toBe('openai');
    });
  });

  it('keeps opencode provider attribution unchanged', async () => {
    await withDb(async (db) => {
      await persistPredictionRun({
        repoPath: 'C:/work/opencode',
        config,
        providerId: 'opencode',
        predictionInput,
        result: { ...result, provider: 'opencode' },
      }, {
        insertPrediction: insertForTest(db),
        readHeadSha: async () => 'abc123head',
      });

      expect(getAllRuns({ db })[0]).toMatchObject({
        provider: 'opencode',
        model: null,
      });
    });
  });

  it('computes a stable input hash for the same prediction input', () => {
    const reordered: PredictionInput = {
      webTrends: false,
      fileNames: ['electron/main.ts', 'electron/ai/predict.ts'],
      dependencies: {
        next: '^15.4.9',
        electron: '^42.0.1',
      },
      languages: ['TypeScript', 'Electron'],
      commitMessages: ['feat: add temporal agent', 'fix: keep sqlite local'],
    };

    expect(hashPredictionInput(reordered)).toBe(hashPredictionInput(predictionInput));
  });

  it('does not propagate insert failures to the prediction flow', async () => {
    const errors: unknown[] = [];
    const predictedResult: PredictionResult = { ...result, provider: 'claude' };
    async function predictionFlow(): Promise<PredictionResult> {
      await persistPredictionRun({
        repoPath: 'C:/work/repo',
        config: { ...config, privacyScope: 'metadata' },
        providerId: 'claude',
        predictionInput: { ...predictionInput, fileNames: undefined },
        result: predictedResult,
      }, {
        insertPrediction: () => {
          throw new Error('forced insert failure');
        },
        readHeadSha: async () => 'abc123head',
        logError: (error) => errors.push(error),
      });
      return predictedResult;
    }

    await expect(predictionFlow()).resolves.toEqual(predictedResult);
    expect(errors).toHaveLength(1);
    expect(predictedResult.branches).toHaveLength(2);
    expect(notes.decisions).toHaveLength(0);
  });
});
