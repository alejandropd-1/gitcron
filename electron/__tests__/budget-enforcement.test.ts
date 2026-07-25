import { describe, expect, it } from 'vitest';
import { BudgetEnforcementEngine } from '../pipeline/models/budget-enforcement';

describe('BudgetEnforcementEngine — Soft & Hard Budget Enforcement (Fase 06 Tanda 5)', () => {
  const engine = new BudgetEnforcementEngine();

  it('allows execution within budget', () => {
    const res = engine.evaluateBudget({
      policy: { maxCostUsd: 10.0 },
      currentCostUsd: 2.0,
      currentTokens: 50_000,
      currentActiveTimeMs: 5000,
      costBasis: 'real_usage',
    });

    expect(res.allowed).toBe(true);
    expect(res.status).toBe('within_budget');
  });

  it('triggers soft limit warning at >= 70% usage without blocking', () => {
    const res = engine.evaluateBudget({
      policy: { maxCostUsd: 10.0 },
      currentCostUsd: 7.5,
      currentTokens: 50_000,
      currentActiveTimeMs: 5000,
      costBasis: 'real_usage',
    });

    expect(res.allowed).toBe(true);
    expect(res.status).toBe('soft_limit_warning');
    expect(res.suggestedAction).toBe('notify');
    expect(res.softLimitPercentage).toBe(75);
  });

  it('triggers hard limit exceeded and pauses next unit at >= 100%', () => {
    const res = engine.evaluateBudget({
      policy: { maxCostUsd: 10.0 },
      currentCostUsd: 10.5,
      currentTokens: 50_000,
      currentActiveTimeMs: 5000,
      costBasis: 'real_usage',
    });

    expect(res.allowed).toBe(false);
    expect(res.status).toBe('hard_limit_exceeded');
    expect(res.suggestedAction).toBe('pause_next_unit');
  });

  it('ignores monetary limit when costBasis is local_unpriced', () => {
    const res = engine.evaluateBudget({
      policy: { maxCostUsd: 5.0 },
      currentCostUsd: null,
      currentTokens: 100_000,
      currentActiveTimeMs: 5000,
      costBasis: 'local_unpriced',
    });

    expect(res.allowed).toBe(true);
    expect(res.status).toBe('within_budget');
  });
});
