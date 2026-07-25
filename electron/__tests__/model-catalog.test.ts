import { describe, expect, it } from 'vitest';
import { ModelCatalog } from '../pipeline/models/model-catalog';
import type { ModelSelectionConfig } from '../pipeline/models/model-catalog-types';

describe('ModelCatalog & Hierarchy Selection (Fase 06 Tanda 1)', () => {
  const catalog = new ModelCatalog();

  it('lists built-in models with non-secret descriptors', () => {
    const list = catalog.listModels();
    expect(list.length).toBeGreaterThan(3);

    const sonnet = catalog.getModel('claude-3-7-sonnet');
    expect(sonnet).toBeDefined();
    expect(sonnet?.providerFamily).toBe('anthropic');
    expect(sonnet?.inputCostPer1mUsd).toBe(3.0);
  });

  it('resolves defaults when no role or override is set', () => {
    const config: ModelSelectionConfig = {
      defaultModelId: 'gemini-2.5-flash',
    };

    const res = catalog.resolveModelSelection('builder', config);
    expect(res.requestedModelId).toBe('gemini-2.5-flash');
    expect(res.resolvedModelId).toBe('gemini-2.5-flash');
    expect(res.provenance).toBe('default');
    expect(res.providerFamily).toBe('google');
  });

  it('respects role hierarchy policy (role > default)', () => {
    const config: ModelSelectionConfig = {
      defaultModelId: 'gemini-2.5-flash',
      rolePolicies: {
        builder: 'claude-3-7-sonnet',
        auditor: 'o3-mini',
      },
    };

    const builderRes = catalog.resolveModelSelection('builder', config);
    expect(builderRes.resolvedModelId).toBe('claude-3-7-sonnet');
    expect(builderRes.provenance).toBe('role');
    expect(builderRes.providerFamily).toBe('anthropic');

    const auditorRes = catalog.resolveModelSelection('auditor', config);
    expect(auditorRes.resolvedModelId).toBe('o3-mini');
    expect(auditorRes.provenance).toBe('role');
    expect(auditorRes.providerFamily).toBe('openai');
  });

  it('respects change, task and run overrides in correct precedence order', () => {
    const config: ModelSelectionConfig = {
      defaultModelId: 'gemini-2.5-flash',
      rolePolicies: {
        builder: 'claude-3-7-sonnet',
      },
      changeOverrides: {
        'change-1': 'gpt-4o',
      },
      taskOverrides: {
        'task-1': 'o3-mini',
      },
    };

    // Change override beats role
    const changeRes = catalog.resolveModelSelection('builder', config, { changeId: 'change-1' });
    expect(changeRes.resolvedModelId).toBe('gpt-4o');
    expect(changeRes.provenance).toBe('change');

    // Task override beats change
    const taskRes = catalog.resolveModelSelection('builder', config, {
      changeId: 'change-1',
      taskId: 'task-1',
    });
    expect(taskRes.resolvedModelId).toBe('o3-mini');
    expect(taskRes.provenance).toBe('task');

    // Run override beats task
    const runRes = catalog.resolveModelSelection('builder', config, {
      changeId: 'change-1',
      taskId: 'task-1',
      runOverrideModelId: 'gemini-2.5-pro',
    });
    expect(runRes.resolvedModelId).toBe('gemini-2.5-pro');
    expect(runRes.provenance).toBe('run');
  });

  it('degrades safely to fallback model for unknown model IDs', () => {
    const config: ModelSelectionConfig = {
      defaultModelId: 'non-existent-model-xyz',
    };

    const res = catalog.resolveModelSelection('builder', config);
    expect(res.requestedModelId).toBe('non-existent-model-xyz');
    expect(res.resolvedModelId).toBe('gemini-2.5-flash');
    expect(res.effectiveModel.displayName).toContain('Fallback');
  });
});
