import type { ModelCatalog } from './model-catalog';
import type { CostBasis } from './model-catalog-types';
import type {
  NodeUsageAccumulation,
  RunBudgetSummary,
  SingleCallUsage,
  TokenUsageDetails,
} from './budget-types';

export class BudgetEngine {
  constructor(private catalog?: ModelCatalog) {}

  /**
   * Calcula el costo en USD para una llamada basándose en el descriptor del modelo y su tarifa.
   */
  public calculateCallCost(
    modelId: string,
    usage: TokenUsageDetails,
    overrideBasis?: CostBasis
  ): { costUsd: number | null; costBasis: CostBasis } {
    if (!this.catalog) {
      return { costUsd: null, costBasis: overrideBasis ?? 'unknown' };
    }

    const model = this.catalog.getModel(modelId);
    if (!model) {
      return { costUsd: null, costBasis: 'unknown' };
    }

    if (model.isLocal || model.inputCostPer1mUsd === null || model.outputCostPer1mUsd === null) {
      return { costUsd: null, costBasis: 'local_unpriced' };
    }

    const inputCost = (usage.inputTokens / 1_000_000) * model.inputCostPer1mUsd;
    const outputCost = (usage.outputTokens / 1_000_000) * model.outputCostPer1mUsd;
    const totalCost = Number((inputCost + outputCost).toFixed(6));

    return {
      costUsd: totalCost,
      costBasis: overrideBasis ?? 'real_usage',
    };
  }

  /**
   * Acumula el uso por agente respetando la regla de no double-counting entre padre e hijos.
   */
  public aggregateNodeUsages(calls: SingleCallUsage[]): Map<string, NodeUsageAccumulation> {
    const nodeMap = new Map<string, NodeUsageAccumulation>();

    // 1. Acumular uso directo por agente
    for (const call of calls) {
      const existing = nodeMap.get(call.agentId) ?? {
        agentId: call.agentId,
        directTokens: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        directCostUsd: 0,
        treeTotalTokens: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        treeTotalCostUsd: 0,
        hasUnpricedOrUnknown: false,
        activeDurationMs: 0,
      };

      existing.directTokens.inputTokens += call.usage.inputTokens;
      existing.directTokens.outputTokens += call.usage.outputTokens;
      existing.directTokens.reasoningTokens = (existing.directTokens.reasoningTokens ?? 0) + (call.usage.reasoningTokens ?? 0);
      existing.directTokens.cacheReadTokens = (existing.directTokens.cacheReadTokens ?? 0) + (call.usage.cacheReadTokens ?? 0);
      existing.directTokens.cacheWriteTokens = (existing.directTokens.cacheWriteTokens ?? 0) + (call.usage.cacheWriteTokens ?? 0);

      if (call.costUsd !== null && existing.directCostUsd !== null) {
        existing.directCostUsd += call.costUsd;
      } else {
        existing.directCostUsd = null;
        existing.hasUnpricedOrUnknown = true;
      }

      existing.activeDurationMs += call.activeDurationMs;
      nodeMap.set(call.agentId, existing);
    }

    // 2. Calcular treeTotalTokens sumando uso propio + hijos (de forma jerárquica)
    for (const node of nodeMap.values()) {
      node.treeTotalTokens = { ...node.directTokens };
      node.treeTotalCostUsd = node.directCostUsd;
    }

    // Atribuir subagentes a los padres si existen parentAgentId en las llamadas
    for (const call of calls) {
      if (call.parentAgentId && nodeMap.has(call.parentAgentId)) {
        const parentNode = nodeMap.get(call.parentAgentId)!;
        parentNode.treeTotalTokens.inputTokens += call.usage.inputTokens;
        parentNode.treeTotalTokens.outputTokens += call.usage.outputTokens;
        parentNode.treeTotalTokens.reasoningTokens = (parentNode.treeTotalTokens.reasoningTokens ?? 0) + (call.usage.reasoningTokens ?? 0);
        parentNode.treeTotalTokens.cacheReadTokens = (parentNode.treeTotalTokens.cacheReadTokens ?? 0) + (call.usage.cacheReadTokens ?? 0);
        parentNode.treeTotalTokens.cacheWriteTokens = (parentNode.treeTotalTokens.cacheWriteTokens ?? 0) + (call.usage.cacheWriteTokens ?? 0);

        if (call.costUsd !== null && parentNode.treeTotalCostUsd !== null) {
          parentNode.treeTotalCostUsd += call.costUsd;
        } else {
          parentNode.treeTotalCostUsd = null;
          parentNode.hasUnpricedOrUnknown = true;
        }
      }
    }

    return nodeMap;
  }

  /**
   * Genera el resumen consolidado de la corrida.
   */
  public summarizeRun(runId: string, calls: SingleCallUsage[]): RunBudgetSummary {
    const totalDirectTokens: TokenUsageDetails = {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };

    let totalCostUsd: number | null = 0;
    let hasUnpricedLocal = false;
    let totalActiveDurationMs = 0;
    const basesSet = new Set<CostBasis>();

    for (const call of calls) {
      totalDirectTokens.inputTokens += call.usage.inputTokens;
      totalDirectTokens.outputTokens += call.usage.outputTokens;
      totalDirectTokens.reasoningTokens = (totalDirectTokens.reasoningTokens ?? 0) + (call.usage.reasoningTokens ?? 0);
      totalDirectTokens.cacheReadTokens = (totalDirectTokens.cacheReadTokens ?? 0) + (call.usage.cacheReadTokens ?? 0);
      totalDirectTokens.cacheWriteTokens = (totalDirectTokens.cacheWriteTokens ?? 0) + (call.usage.cacheWriteTokens ?? 0);

      totalActiveDurationMs += call.activeDurationMs;
      basesSet.add(call.costBasis);

      if (call.costBasis === 'local_unpriced') {
        hasUnpricedLocal = true;
      }

      if (call.costUsd !== null && totalCostUsd !== null) {
        totalCostUsd += call.costUsd;
      } else {
        totalCostUsd = null;
      }
    }

    return {
      runId,
      totalDirectTokens,
      totalTreeTokens: { ...totalDirectTokens }, // El total global de la corrida es el acumulado de llamadas únicas
      totalCostUsd: totalCostUsd !== null ? Number(totalCostUsd.toFixed(6)) : null,
      costBasisSummary: Array.from(basesSet),
      totalActiveDurationMs,
      hasUnpricedLocal,
    };
  }
}
