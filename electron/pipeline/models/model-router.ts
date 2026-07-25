import { ModelCatalog } from './model-catalog';
import type {
  ModelDescriptor,
  ModelSelectionConfig,
  PipelineRole,
  ResolvedModelSelection,
} from './model-catalog-types';

export class ModelDecorrelationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelDecorrelationError';
  }
}

export interface RouterSelectionResult {
  builder: ResolvedModelSelection;
  auditor: ResolvedModelSelection;
  decorrelationEnforced: boolean;
  driftDetected: boolean;
}

export class ModelRouter {
  constructor(private catalog: ModelCatalog = new ModelCatalog()) {}

  /**
   * Resuelve los modelos para builder y auditor garantizando decorrelación de familias.
   */
  public resolveBuilderAndAuditor(
    config: ModelSelectionConfig,
    context?: { changeId?: string; taskId?: string }
  ): RouterSelectionResult {
    const builder = this.catalog.resolveModelSelection('builder', config, context);
    let auditor = this.catalog.resolveModelSelection('auditor', config, context);

    let decorrelationEnforced = false;

    if (builder.providerFamily === auditor.providerFamily) {
      // Intentar encontrar un modelo alternativo para auditor de una familia distinta
      const alternativeModel = this.findAlternativeFamilyModel(builder.providerFamily);

      if (!alternativeModel) {
        throw new ModelDecorrelationError(
          `DECORRELATION_VIOLATION: Cannot resolve auditor. No available model from a family different than '${builder.providerFamily}'.`
        );
      }

      auditor = {
        requestedModelId: auditor.requestedModelId,
        resolvedModelId: alternativeModel.modelId,
        reportedModelId: null,
        providerFamily: alternativeModel.providerFamily,
        provenance: auditor.provenance,
        effectiveModel: alternativeModel,
      };

      decorrelationEnforced = true;
    }

    return {
      builder,
      auditor,
      decorrelationEnforced,
      driftDetected: false,
    };
  }

  /**
   * Reconcilia el modelo reportado por el runtime con la resolución esperada para detectar drift.
   */
  public verifyReportedModel(
    selection: ResolvedModelSelection,
    reportedModelId: string
  ): ResolvedModelSelection & { driftDetected: boolean } {
    const reportedModel = this.catalog.getModel(reportedModelId);
    const reportedFamily = reportedModel?.providerFamily ?? 'unknown';

    const driftDetected =
      selection.resolvedModelId !== reportedModelId ||
      selection.providerFamily !== reportedFamily;

    return {
      ...selection,
      reportedModelId,
      driftDetected,
    };
  }

  private findAlternativeFamilyModel(forbiddenFamily: string): ModelDescriptor | null {
    const allModels = this.catalog.listModels();
    return allModels.find((m) => m.providerFamily !== forbiddenFamily) ?? null;
  }
}
