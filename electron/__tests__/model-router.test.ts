import { describe, expect, it } from 'vitest';
import { ModelCatalog } from '../pipeline/models/model-catalog';
import type { ModelDescriptor, ModelSelectionConfig } from '../pipeline/models/model-catalog-types';
import { ModelDecorrelationError, ModelRouter } from '../pipeline/models/model-router';

describe('ModelRouter & Family Decorrelation (Fase 06 Tanda 2)', () => {
  const catalog = new ModelCatalog();
  const router = new ModelRouter(catalog);

  it('allows builder and auditor from different families without adjustment', () => {
    const config: ModelSelectionConfig = {
      rolePolicies: {
        builder: 'claude-3-7-sonnet', // anthropic
        auditor: 'gemini-2.5-pro',    // google
      },
    };

    const res = router.resolveBuilderAndAuditor(config);
    expect(res.builder.providerFamily).toBe('anthropic');
    expect(res.auditor.providerFamily).toBe('google');
    expect(res.decorrelationEnforced).toBe(false);
  });

  it('enforces decorrelation when builder and auditor have the same family', () => {
    const config: ModelSelectionConfig = {
      rolePolicies: {
        builder: 'claude-3-7-sonnet', // anthropic
        auditor: 'claude-3-5-haiku',   // anthropic (same family!)
      },
    };

    const res = router.resolveBuilderAndAuditor(config);
    expect(res.builder.providerFamily).toBe('anthropic');
    // Auditor must be rerouted to a non-anthropic family
    expect(res.auditor.providerFamily).not.toBe('anthropic');
    expect(res.decorrelationEnforced).toBe(true);
  });

  it('throws ModelDecorrelationError if no alternative family model is available', () => {
    const singleFamilyCatalog: ModelDescriptor[] = [
      {
        modelId: 'm1',
        displayName: 'Model 1',
        providerFamily: 'anthropic',
        contextWindowTokens: 100000,
        maxOutputTokens: 4096,
        inputCostPer1mUsd: 1,
        outputCostPer1mUsd: 2,
        supportsReasoning: false,
        supportsVision: false,
        requiresAuth: true,
        isLocal: false,
      },
      {
        modelId: 'm2',
        displayName: 'Model 2',
        providerFamily: 'anthropic',
        contextWindowTokens: 100000,
        maxOutputTokens: 4096,
        inputCostPer1mUsd: 1,
        outputCostPer1mUsd: 2,
        supportsReasoning: false,
        supportsVision: false,
        requiresAuth: true,
        isLocal: false,
      },
    ];

    const restrictedRouter = new ModelRouter(new ModelCatalog(singleFamilyCatalog));
    const config: ModelSelectionConfig = {
      defaultModelId: 'm1',
    };

    expect(() => restrictedRouter.resolveBuilderAndAuditor(config)).toThrowError(
      ModelDecorrelationError
    );
  });

  it('detects runtime model drift when reported model differs from resolved model', () => {
    const config: ModelSelectionConfig = {
      rolePolicies: { builder: 'claude-3-7-sonnet' },
    };

    const selection = catalog.resolveModelSelection('builder', config);
    expect(selection.resolvedModelId).toBe('claude-3-7-sonnet');

    // Case 1: Same model reported -> no drift
    const noDrift = router.verifyReportedModel(selection, 'claude-3-7-sonnet');
    expect(noDrift.driftDetected).toBe(false);

    // Case 2: Different model reported -> drift detected!
    const withDrift = router.verifyReportedModel(selection, 'gpt-4o');
    expect(withDrift.driftDetected).toBe(true);
    expect(withDrift.reportedModelId).toBe('gpt-4o');
  });
});
