import type { CostBasis } from './model-catalog-types';

export interface BudgetLimitPolicy {
  maxCostUsd?: number | null;
  maxTotalTokens?: number | null;
  maxActiveTimeMs?: number | null;
}

export interface BudgetEnforcementResult {
  allowed: boolean;
  status: 'within_budget' | 'soft_limit_warning' | 'hard_limit_exceeded';
  softLimitPercentage?: number;
  reason?: string;
  suggestedAction?: 'none' | 'notify' | 'pause_next_unit';
}

export class BudgetEnforcementEngine {
  /**
   * Evalúa la política de presupuesto antes de iniciar la siguiente unidad o tarea.
   */
  public evaluateBudget(params: {
    policy: BudgetLimitPolicy;
    currentCostUsd: number | null;
    currentTokens: number;
    currentActiveTimeMs: number;
    costBasis: CostBasis;
  }): BudgetEnforcementResult {
    const { policy, currentCostUsd, currentTokens, currentActiveTimeMs, costBasis } = params;

    // 1. Hard limit de costo en USD (solo si hay costo monetario medible)
    if (policy.maxCostUsd != null && currentCostUsd != null && costBasis !== 'local_unpriced' && costBasis !== 'unknown') {
      const usageRatio = currentCostUsd / policy.maxCostUsd;
      if (usageRatio >= 1.0) {
        return {
          allowed: false,
          status: 'hard_limit_exceeded',
          reason: `Exceeded hard budget limit of US$ ${policy.maxCostUsd.toFixed(2)}.`,
          suggestedAction: 'pause_next_unit',
        };
      } else if (usageRatio >= 0.7) {
        return {
          allowed: true,
          status: 'soft_limit_warning',
          softLimitPercentage: Math.floor(usageRatio * 100),
          reason: `Approaching budget limit (US$ ${currentCostUsd.toFixed(2)} / US$ ${policy.maxCostUsd.toFixed(2)}).`,
          suggestedAction: 'notify',
        };
      }
    }

    // 2. Hard limit por tokens totales
    if (policy.maxTotalTokens != null) {
      const tokenRatio = currentTokens / policy.maxTotalTokens;
      if (tokenRatio >= 1.0) {
        return {
          allowed: false,
          status: 'hard_limit_exceeded',
          reason: `Exceeded hard token limit of ${policy.maxTotalTokens.toLocaleString()} tokens.`,
          suggestedAction: 'pause_next_unit',
        };
      } else if (tokenRatio >= 0.7) {
        return {
          allowed: true,
          status: 'soft_limit_warning',
          softLimitPercentage: Math.floor(tokenRatio * 100),
          reason: `Approaching token limit (${currentTokens.toLocaleString()} / ${policy.maxTotalTokens.toLocaleString()}).`,
          suggestedAction: 'notify',
        };
      }
    }

    // 3. Hard limit por tiempo activo
    if (policy.maxActiveTimeMs != null) {
      const timeRatio = currentActiveTimeMs / policy.maxActiveTimeMs;
      if (timeRatio >= 1.0) {
        return {
          allowed: false,
          status: 'hard_limit_exceeded',
          reason: `Exceeded active execution time limit of ${Math.round(policy.maxActiveTimeMs / 1000)}s.`,
          suggestedAction: 'pause_next_unit',
        };
      }
    }

    return {
      allowed: true,
      status: 'within_budget',
      suggestedAction: 'none',
    };
  }
}
