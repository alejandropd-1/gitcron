import type {
  ModelDescriptor,
  ModelSelectionConfig,
  PipelineRole,
  ResolvedModelSelection,
} from './model-catalog-types';

export const BUILTIN_MODEL_CATALOG: ModelDescriptor[] = [
  // Google / Antigravity
  {
    modelId: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    providerFamily: 'google',
    contextWindowTokens: 1048576,
    maxOutputTokens: 8192,
    inputCostPer1mUsd: 1.25,
    outputCostPer1mUsd: 5.0,
    supportsReasoning: true,
    supportsVision: true,
    requiresAuth: true,
    isLocal: false,
  },
  {
    modelId: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    providerFamily: 'google',
    contextWindowTokens: 1048576,
    maxOutputTokens: 8192,
    inputCostPer1mUsd: 0.15,
    outputCostPer1mUsd: 0.6,
    supportsReasoning: true,
    supportsVision: true,
    requiresAuth: true,
    isLocal: false,
  },

  // Anthropic
  {
    modelId: 'claude-3-7-sonnet',
    displayName: 'Claude 3.7 Sonnet',
    providerFamily: 'anthropic',
    contextWindowTokens: 200000,
    maxOutputTokens: 8192,
    inputCostPer1mUsd: 3.0,
    outputCostPer1mUsd: 15.0,
    supportsReasoning: true,
    supportsVision: true,
    requiresAuth: true,
    isLocal: false,
  },
  {
    modelId: 'claude-3-5-haiku',
    displayName: 'Claude 3.5 Haiku',
    providerFamily: 'anthropic',
    contextWindowTokens: 200000,
    maxOutputTokens: 8192,
    inputCostPer1mUsd: 0.8,
    outputCostPer1mUsd: 4.0,
    supportsReasoning: false,
    supportsVision: false,
    requiresAuth: true,
    isLocal: false,
  },

  // OpenAI
  {
    modelId: 'gpt-4o',
    displayName: 'GPT-4o',
    providerFamily: 'openai',
    contextWindowTokens: 128000,
    maxOutputTokens: 4096,
    inputCostPer1mUsd: 2.5,
    outputCostPer1mUsd: 10.0,
    supportsReasoning: false,
    supportsVision: true,
    requiresAuth: true,
    isLocal: false,
  },
  {
    modelId: 'o3-mini',
    displayName: 'o3-mini',
    providerFamily: 'openai',
    contextWindowTokens: 200000,
    maxOutputTokens: 100000,
    inputCostPer1mUsd: 1.1,
    outputCostPer1mUsd: 4.4,
    supportsReasoning: true,
    supportsVision: false,
    requiresAuth: true,
    isLocal: false,
  },

  // OpenCode ACP
  {
    modelId: 'opencode-acp-default',
    displayName: 'OpenCode Default ACP',
    providerFamily: 'opencode-acp',
    contextWindowTokens: 128000,
    maxOutputTokens: 4096,
    inputCostPer1mUsd: null,
    outputCostPer1mUsd: null,
    supportsReasoning: false,
    supportsVision: false,
    requiresAuth: false,
    isLocal: true,
  },

  // LM Studio Local
  {
    modelId: 'lmstudio-local-qwen',
    displayName: 'LM Studio Qwen Local',
    providerFamily: 'lmstudio-local',
    contextWindowTokens: 32768,
    maxOutputTokens: 4096,
    inputCostPer1mUsd: null,
    outputCostPer1mUsd: null,
    supportsReasoning: true,
    supportsVision: false,
    requiresAuth: false,
    isLocal: true,
  },
];

export const FALLBACK_MODEL: ModelDescriptor = {
  modelId: 'gemini-2.5-flash',
  displayName: 'Gemini 2.5 Flash (Fallback)',
  providerFamily: 'google',
  contextWindowTokens: 1048576,
  maxOutputTokens: 8192,
  inputCostPer1mUsd: 0.15,
  outputCostPer1mUsd: 0.6,
  supportsReasoning: true,
  supportsVision: true,
  requiresAuth: true,
  isLocal: false,
};

export class ModelCatalog {
  private catalog: Map<string, ModelDescriptor> = new Map();

  constructor(customCatalog: ModelDescriptor[] = BUILTIN_MODEL_CATALOG) {
    for (const desc of customCatalog) {
      this.catalog.set(desc.modelId, desc);
    }
  }

  public getModel(modelId: string): ModelDescriptor | null {
    return this.catalog.get(modelId) ?? null;
  }

  public listModels(): ModelDescriptor[] {
    return Array.from(this.catalog.values());
  }

  /**
   * Resuelve el modelo según la jerarquía:
   * default < repo < role < change < task < run
   */
  public resolveModelSelection(
    role: PipelineRole,
    config: ModelSelectionConfig,
    context?: { changeId?: string; taskId?: string; runOverrideModelId?: string }
  ): ResolvedModelSelection {
    let requestedModelId = config.defaultModelId ?? 'gemini-2.5-flash';
    let provenance: ResolvedModelSelection['provenance'] = 'default';

    if (config.rolePolicies?.[role]) {
      requestedModelId = config.rolePolicies[role]!;
      provenance = 'role';
    }

    if (context?.changeId && config.changeOverrides?.[context.changeId]) {
      requestedModelId = config.changeOverrides[context.changeId];
      provenance = 'change';
    }

    if (context?.taskId && config.taskOverrides?.[context.taskId]) {
      requestedModelId = config.taskOverrides[context.taskId];
      provenance = 'task';
    }

    if (context?.runOverrideModelId) {
      requestedModelId = context.runOverrideModelId;
      provenance = 'run';
    }

    const matched = this.getModel(requestedModelId);
    const effectiveModel = matched ?? FALLBACK_MODEL;
    const resolvedModelId = effectiveModel.modelId;

    return {
      requestedModelId,
      resolvedModelId,
      reportedModelId: null,
      providerFamily: effectiveModel.providerFamily,
      provenance,
      effectiveModel,
    };
  }
}
