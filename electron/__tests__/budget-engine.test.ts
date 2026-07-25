import { describe, expect, it } from 'vitest';
import { ModelCatalog } from '../pipeline/models/model-catalog';
import { BudgetEngine } from '../pipeline/models/budget-engine';
import type { SingleCallUsage } from '../pipeline/models/budget-types';

describe('BudgetEngine — Token & Cost Accounting (Fase 06 Tanda 3)', () => {
  const catalog = new ModelCatalog();
  const engine = new BudgetEngine(catalog);

  it('calculates USD cost accurately for pricing models', () => {
    // claude-3-7-sonnet: $3.0 input, $15.0 output per 1M tokens
    const { costUsd, costBasis } = engine.calculateCallCost('claude-3-7-sonnet', {
      inputTokens: 100_000,   // $0.30
      outputTokens: 20_000,    // $0.30
    });

    expect(costBasis).toBe('real_usage');
    expect(costUsd).toBe(0.6);
  });

  it('returns null costUsd with local_unpriced basis for local models', () => {
    const { costUsd, costBasis } = engine.calculateCallCost('lmstudio-local-qwen', {
      inputTokens: 50_000,
      outputTokens: 10_000,
    });

    expect(costBasis).toBe('local_unpriced');
    expect(costUsd).toBeNull(); // NEVER 0 USD!
  });

  it('prevents double-counting between parent agent and subagents', () => {
    const calls: SingleCallUsage[] = [
      {
        callId: 'c1',
        agentId: 'parent-agent',
        parentAgentId: null,
        modelId: 'gemini-2.5-flash',
        providerFamily: 'google',
        usage: { inputTokens: 1000, outputTokens: 500 },
        costUsd: 0.00045,
        costBasis: 'real_usage',
        activeDurationMs: 1200,
        timestamp: 1000,
      },
      {
        callId: 'c2',
        agentId: 'subagent-1',
        parentAgentId: 'parent-agent',
        modelId: 'claude-3-5-haiku',
        providerFamily: 'anthropic',
        usage: { inputTokens: 2000, outputTokens: 1000 },
        costUsd: 0.0056,
        costBasis: 'real_usage',
        activeDurationMs: 2500,
        timestamp: 2000,
      },
    ];

    const aggregated = engine.aggregateNodeUsages(calls);
    const parentNode = aggregated.get('parent-agent')!;
    const childNode = aggregated.get('subagent-1')!;

    // Direct tokens of parent are only its own calls
    expect(parentNode.directTokens.inputTokens).toBe(1000);
    expect(parentNode.directTokens.outputTokens).toBe(500);

    // Tree total tokens include child subagent calls
    expect(parentNode.treeTotalTokens.inputTokens).toBe(3000);
    expect(parentNode.treeTotalTokens.outputTokens).toBe(1500);

    // Child node only counts its own calls
    expect(childNode.directTokens.inputTokens).toBe(2000);
    expect(childNode.treeTotalTokens.inputTokens).toBe(2000);
  });

  it('summarizes run correctly and identifies unpriced local runs', () => {
    const calls: SingleCallUsage[] = [
      {
        callId: 'c1',
        agentId: 'a1',
        modelId: 'gpt-4o',
        providerFamily: 'openai',
        usage: { inputTokens: 5000, outputTokens: 1000 },
        costUsd: 0.0225,
        costBasis: 'real_usage',
        activeDurationMs: 1500,
        timestamp: 1000,
      },
      {
        callId: 'c2',
        agentId: 'a2',
        modelId: 'lmstudio-local-qwen',
        providerFamily: 'lmstudio-local',
        usage: { inputTokens: 8000, outputTokens: 2000 },
        costUsd: null,
        costBasis: 'local_unpriced',
        activeDurationMs: 3000,
        timestamp: 2000,
      },
    ];

    const summary = engine.summarizeRun('run-101', calls);
    expect(summary.totalDirectTokens.inputTokens).toBe(13000);
    expect(summary.totalDirectTokens.outputTokens).toBe(3000);
    expect(summary.hasUnpricedLocal).toBe(true);
    expect(summary.totalCostUsd).toBeNull(); // Null because run contains unpriced local call
    expect(summary.costBasisSummary).toContain('real_usage');
    expect(summary.costBasisSummary).toContain('local_unpriced');
  });
});
