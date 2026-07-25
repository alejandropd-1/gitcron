import type {
  CohortIdentifier,
  EstimationResult,
  HistoricalTaskRecord,
  ModelComparisonResult,
} from './pipeline-estimation-types';

export class PipelineEstimationEngine {
  /**
   * Estima el tiempo y costo restante para las tareas pendientes basándose en la muestra histórica del cohort.
   */
  public estimateRemainingWork(
    cohort: CohortIdentifier,
    history: HistoricalTaskRecord[],
    remainingTasksCount: number
  ): EstimationResult {
    const matchingRecords = history.filter(
      (r) =>
        r.cohort.taskType === cohort.taskType &&
        r.cohort.riskCategory === cohort.riskCategory
    );

    const sampleSize = matchingRecords.length;

    // Regla de suficiencia muestral: n >= 5
    if (sampleSize < 5) {
      return {
        hasSufficientData: false,
        sampleSize,
        cohort,
        estimatedRemainingDurationMs: null,
        estimatedRemainingCostUsd: null,
        notice: `Muestra insuficiente (n = ${sampleSize} < 5). Estimación diferida.`,
      };
    }

    // Ordenar duraciones para P10, Media, P90
    const durations = matchingRecords.map((r) => r.durationMs).sort((a, b) => a - b);
    const meanDuration = durations.reduce((a, b) => a + b, 0) / sampleSize;
    const p10Idx = Math.floor(sampleSize * 0.1);
    const p90Idx = Math.floor(sampleSize * 0.9);

    const unitDurationP10 = durations[p10Idx] ?? meanDuration;
    const unitDurationP90 = durations[p90Idx] ?? meanDuration;

    // Calcular costos (solo registros con costo en USD conocido)
    const validCosts = matchingRecords
      .map((r) => r.costUsd)
      .filter((c): c is number => c !== null)
      .sort((a, b) => a - b);

    let costEst: EstimationResult['estimatedRemainingCostUsd'] = null;

    if (validCosts.length >= 5) {
      const meanCost = validCosts.reduce((a, b) => a + b, 0) / validCosts.length;
      const c10Idx = Math.floor(validCosts.length * 0.1);
      const c90Idx = Math.floor(validCosts.length * 0.9);
      costEst = {
        p10: Number((validCosts[c10Idx]! * remainingTasksCount).toFixed(4)),
        mean: Number((meanCost * remainingTasksCount).toFixed(4)),
        p90: Number((validCosts[c90Idx]! * remainingTasksCount).toFixed(4)),
      };
    }

    return {
      hasSufficientData: true,
      sampleSize,
      cohort,
      estimatedRemainingDurationMs: {
        p10: Math.round(unitDurationP10 * remainingTasksCount),
        mean: Math.round(meanDuration * remainingTasksCount),
        p90: Math.round(unitDurationP90 * remainingTasksCount),
      },
      estimatedRemainingCostUsd: costEst,
    };
  }

  /**
   * Compara el desempeño de los modelos dentro de un mismo cohort por outcomes.
   */
  public compareModelsInCohort(
    cohort: CohortIdentifier,
    history: HistoricalTaskRecord[]
  ): ModelComparisonResult {
    const matching = history.filter(
      (r) =>
        r.cohort.taskType === cohort.taskType &&
        r.cohort.riskCategory === cohort.riskCategory
    );

    const sampleSize = matching.length;
    if (sampleSize < 5) {
      return {
        cohort,
        sampleSize,
        hasSufficientData: false,
        models: [],
      };
    }

    const modelGroups = new Map<string, HistoricalTaskRecord[]>();
    for (const record of matching) {
      const group = modelGroups.get(record.modelId) ?? [];
      group.push(record);
      modelGroups.set(record.modelId, group);
    }

    const modelsSummary = Array.from(modelGroups.entries()).map(([modelId, records]) => {
      const total = records.length;
      const approvedCount = records.filter((r) => r.outcome === 'approved').length;
      const rejectedCount = records.filter((r) => r.outcome === 'rejected').length;
      const avgDurationMs = Math.round(records.reduce((a, b) => a + b.durationMs, 0) / total);

      const costs = records.map((r) => r.costUsd).filter((c): c is number => c !== null);
      const avgCostUsd =
        costs.length > 0
          ? Number((costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(4))
          : null;

      return {
        modelId,
        sampleSize: total,
        approvalRate: Number((approvedCount / total).toFixed(2)),
        auditRejectionRate: Number((rejectedCount / total).toFixed(2)),
        avgDurationMs,
        avgCostUsd,
      };
    });

    return {
      cohort,
      sampleSize,
      hasSufficientData: true,
      models: modelsSummary,
    };
  }
}
