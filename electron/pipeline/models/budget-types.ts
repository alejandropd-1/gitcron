import type { CostBasis, ProviderFamily } from './model-catalog-types';

export interface TokenUsageDetails {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheWriteTokens?: number | null;
}

export interface SingleCallUsage {
  callId: string;
  agentId: string;
  parentAgentId?: string | null;
  modelId: string;
  providerFamily: ProviderFamily;
  usage: TokenUsageDetails;
  costUsd: number | null;
  costBasis: CostBasis;
  activeDurationMs: number;
  timestamp: number;
}

export interface NodeUsageAccumulation {
  agentId: string;
  directTokens: TokenUsageDetails;
  directCostUsd: number | null;
  treeTotalTokens: TokenUsageDetails;
  treeTotalCostUsd: number | null;
  hasUnpricedOrUnknown: boolean;
  activeDurationMs: number;
}

export interface RunBudgetSummary {
  runId: string;
  totalDirectTokens: TokenUsageDetails;
  totalTreeTokens: TokenUsageDetails;
  totalCostUsd: number | null;
  costBasisSummary: CostBasis[];
  totalActiveDurationMs: number;
  hasUnpricedLocal: boolean;
}
