export type ProviderFamily =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'opencode-acp'
  | 'lmstudio-local'
  | 'unknown';

export type PipelineRole =
  | 'scout'
  | 'planner'
  | 'builder'
  | 'auditor'
  | 'fixer'
  | 'orchestrator';

export type CostBasis =
  | 'real_usage'
  | 'estimated'
  | 'flat_subscription'
  | 'local_unpriced'
  | 'unknown';

export interface ModelDescriptor {
  modelId: string;
  displayName: string;
  providerFamily: ProviderFamily;
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  inputCostPer1mUsd: number | null;
  outputCostPer1mUsd: number | null;
  supportsReasoning: boolean;
  supportsVision: boolean;
  requiresAuth: boolean;
  isLocal: boolean;
}

export interface ModelSelectionConfig {
  defaultModelId?: string;
  rolePolicies?: Partial<Record<PipelineRole, string>>;
  changeOverrides?: Record<string, string>;
  taskOverrides?: Record<string, string>;
  runOverrides?: Record<string, string>;
}

export interface ResolvedModelSelection {
  requestedModelId: string;
  resolvedModelId: string;
  reportedModelId: string | null;
  providerFamily: ProviderFamily;
  provenance: 'default' | 'repo' | 'role' | 'change' | 'task' | 'run';
  effectiveModel: ModelDescriptor;
}
