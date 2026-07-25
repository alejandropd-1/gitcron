import type { ContextHealthStatus, MeasurementSource } from './context-health-types';

export class ContextHealthEngine {
  /**
   * Evalúa la salud del contexto del modelo.
   */
  public evaluateContextHealth(params: {
    usedTokens: number | null;
    maxTokens: number | null;
    source?: MeasurementSource;
    recentCompactionCount?: number;
    reinjectedContextCostUsd?: number | null;
  }): ContextHealthStatus {
    const {
      usedTokens,
      maxTokens,
      source = 'measured',
      recentCompactionCount = 0,
      reinjectedContextCostUsd = null,
    } = params;

    if (usedTokens === null || maxTokens === null || maxTokens <= 0) {
      return {
        usedTokens,
        maxTokens,
        fillPercentage: null,
        headroomTokens: null,
        healthState: 'unknown',
        measurementSource: 'unknown',
        recentCompactionCount,
        reinjectedContextCostUsd,
        recommendation: 'none',
      };
    }

    const fillPercentage = Number(((usedTokens / maxTokens) * 100).toFixed(1));
    const headroomTokens = Math.max(0, maxTokens - usedTokens);

    let healthState: ContextHealthStatus['healthState'] = 'healthy';
    let recommendation: ContextHealthStatus['recommendation'] = 'none';

    if (fillPercentage >= 90) {
      healthState = 'critical';
      recommendation = 'recommend_new_session';
    } else if (fillPercentage >= 70) {
      healthState = 'pressure';
      recommendation = 'recommend_compact';
    } else if (recentCompactionCount > 0) {
      healthState = 'compressed';
    }

    return {
      usedTokens,
      maxTokens,
      fillPercentage,
      headroomTokens,
      healthState,
      measurementSource: source,
      recentCompactionCount,
      reinjectedContextCostUsd,
      recommendation,
    };
  }
}
