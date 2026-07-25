import { describe, expect, it } from 'vitest';
import { PipelineEstimationEngine } from '../pipeline/estimation/pipeline-estimation-engine';
import type { CohortIdentifier, HistoricalTaskRecord } from '../pipeline/estimation/pipeline-estimation-types';

describe('PipelineEstimationEngine — Cohort Estimates & Model Comparison (Fase 07 Tanda 3)', () => {
  const engine = new PipelineEstimationEngine();
  const cohort: CohortIdentifier = { taskType: 'refactor', riskCategory: 'medium' };

  it('declares insufficient data when sample size n < 5', () => {
    const history: HistoricalTaskRecord[] = [
      { taskId: 't1', cohort, modelId: 'm1', providerFamily: 'f1', durationMs: 1000, costUsd: 0.1, outcome: 'approved' },
      { taskId: 't2', cohort, modelId: 'm1', providerFamily: 'f1', durationMs: 1200, costUsd: 0.1, outcome: 'approved' },
    ];

    const res = engine.estimateRemainingWork(cohort, history, 2);
    expect(res.hasSufficientData).toBe(false);
    expect(res.sampleSize).toBe(2);
    expect(res.estimatedRemainingDurationMs).toBeNull();
    expect(res.notice).toContain('n = 2 < 5');
  });

  it('calculates P10, mean, and P90 estimates when sample size n >= 5', () => {
    const history: HistoricalTaskRecord[] = [1, 2, 3, 4, 5, 6].map((i) => ({
      taskId: `t${i}`,
      cohort,
      modelId: 'claude-3-7-sonnet',
      providerFamily: 'anthropic',
      durationMs: 1000 * i,
      costUsd: 0.05 * i,
      outcome: 'approved',
    }));

    const res = engine.estimateRemainingWork(cohort, history, 3);
    expect(res.hasSufficientData).toBe(true);
    expect(res.sampleSize).toBe(6);
    expect(res.estimatedRemainingDurationMs).toBeDefined();
    expect(res.estimatedRemainingDurationMs?.mean).toBeGreaterThan(0);
    expect(res.estimatedRemainingCostUsd).toBeDefined();
  });

  it('compares model outcomes within the same cohort fairly', () => {
    const history: HistoricalTaskRecord[] = [
      { taskId: 't1', cohort, modelId: 'claude-3-7-sonnet', providerFamily: 'anthropic', durationMs: 1000, costUsd: 0.1, outcome: 'approved' },
      { taskId: 't2', cohort, modelId: 'claude-3-7-sonnet', providerFamily: 'anthropic', durationMs: 1200, costUsd: 0.1, outcome: 'approved' },
      { taskId: 't3', cohort, modelId: 'claude-3-7-sonnet', providerFamily: 'anthropic', durationMs: 1100, costUsd: 0.1, outcome: 'approved' },
      { taskId: 't4', cohort, modelId: 'gpt-4o', providerFamily: 'openai', durationMs: 2000, costUsd: 0.2, outcome: 'rejected' },
      { taskId: 't5', cohort, modelId: 'gpt-4o', providerFamily: 'openai', durationMs: 2200, costUsd: 0.2, outcome: 'approved' },
    ];

    const comparison = engine.compareModelsInCohort(cohort, history);
    expect(comparison.hasSufficientData).toBe(true);
    expect(comparison.models.length).toBe(2);

    const sonnet = comparison.models.find((m) => m.modelId === 'claude-3-7-sonnet');
    expect(sonnet?.approvalRate).toBe(1.0);
    expect(sonnet?.auditRejectionRate).toBe(0.0);

    const gpt = comparison.models.find((m) => m.modelId === 'gpt-4o');
    expect(gpt?.approvalRate).toBe(0.5);
    expect(gpt?.auditRejectionRate).toBe(0.5);
  });
});
