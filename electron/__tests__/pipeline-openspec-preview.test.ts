import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeFingerprint,
  generateDiagnosticPreview,
  generateUpdatePlan,
  readRepoSchemaConfig,
  validatePlanIntegrity,
} from '../pipeline/openspec-preview';
import type { OpenSpecEngineStatus } from '../../types/pipeline';

describe('generateDiagnosticPreview & validatePlanIntegrity (Tasks 2.11 & 2.12)', () => {
  const dummyStatus: OpenSpecEngineStatus = {
    cli: {
      installed: true,
      runtimeVersion: '1.8.0',
      provenance: 'global',
      displayPath: 'C:\\global\\openspec.cmd',
      supportedRange: { min: '1.5.0', max: '1.8.0' },
      versionClass: 'supported',
      evidenceStatus: 'confirmed',
      diagnostics: [],
    },
    latestAvailable: {
      status: 'online',
      latestVersion: '1.8.0',
      checkedAt: 'now',
      fromCache: false,
      cacheAgeSeconds: 0,
      freshness: 'fresh',
      error: null,
    },
    globalConfig: null,
    installedIntegration: null,
    repoState: 'initialized',
    integrationState: 'up-to-date',
  };

  it('declara la vista previa como parcial/no disponible y NUNCA como exacta en Fase 2', () => {
    const preview = generateDiagnosticPreview({
      repoPath: 'C:\\repo',
      engineStatus: dummyStatus,
      gitInfo: { branch: 'main', headCommit: 'abc1234', workingTreeFingerprint: 'clean:0' },
    });

    expect(preview.previewClass).toBe('partial');
    expect((preview as any).previewClass).not.toBe('exact');
    expect(preview.invalidationParams.branch).toBe('main');
    expect(preview.invalidationParams.headCommit).toBe('abc1234');
    expect(preview.invalidationParams.workingTreeFingerprint).toBe('clean:0');
    expect(preview.invalidationParams.packageIntegrity).toBeNull();
  });

  it('generateUpdatePlan evalúa la matriz de decisión y declara canExecute: false', () => {
    const plan = generateUpdatePlan({
      repoPath: 'C:\\repo',
      engineStatus: dummyStatus,
    });

    expect(plan.canExecute).toBe(false);
    expect(plan.requiredAction).toBe('none');
    expect(plan.reason).toContain('POC');

    const uninitializedPlan = generateUpdatePlan({
      repoPath: 'C:\\repo',
      engineStatus: { ...dummyStatus, repoState: 'not-initialized' },
    });
    expect(uninitializedPlan.requiredAction).toBe('init');
  });

  it('validatePlanIntegrity (2.12) invalida el plan ante cualquier cambio en todos los campos transportados', () => {
    const plan = generateUpdatePlan({
      repoPath: 'C:\\repo',
      engineStatus: dummyStatus,
      gitInfo: { branch: 'main', headCommit: 'abc1234', workingTreeFingerprint: 'clean:0' },
    });

    const currentParams = { ...plan.preview.invalidationParams };

    // Mismo parámetro -> válido
    expect(validatePlanIntegrity(plan, currentParams)).toBeNull();

    // Cambio de rama
    expect(validatePlanIntegrity(plan, { ...currentParams, branch: 'feature' })).toBe('branch-changed');

    // Cambio de HEAD
    expect(validatePlanIntegrity(plan, { ...currentParams, headCommit: 'def5678' })).toBe('head-commit-changed');

    // Cambio de fingerprint del working tree
    expect(validatePlanIntegrity(plan, { ...currentParams, workingTreeFingerprint: 'dirty:5' })).toBe('working-tree-changed');

    // Cambio de procedencia del CLI
    expect(validatePlanIntegrity(plan, { ...currentParams, cliProvenance: 'managed' })).toBe('cli-provenance-changed');

    // Cambio de huella de evidencia instalada
    expect(validatePlanIntegrity(plan, { ...currentParams, installedEvidenceFingerprint: 'alt-hash' })).toBe('evidence-changed');
  });

  it('validatePlanIntegrity (2.12) invalida el plan ante un cambio de schema/config del repositorio', () => {
    const schemaConfig = { schemaName: 'spec-driven', repoConfigRaw: 'schema: spec-driven\n' };
    const plan = generateUpdatePlan({
      repoPath: 'C:\\repo',
      engineStatus: dummyStatus,
      gitInfo: { branch: 'main', headCommit: 'abc1234', workingTreeFingerprint: 'clean:0' },
      schemaConfig,
    });

    // Control positivo: mismo schema/config ⇒ válido
    const currentParams = { ...plan.preview.invalidationParams };
    expect(validatePlanIntegrity(plan, currentParams)).toBeNull();

    // Cambia el schemaName del change ⇒ clave tipada propia, no null
    expect(validatePlanIntegrity(plan, {
      ...currentParams,
      schemaConfigFingerprint: computeFingerprint({ ...schemaConfig, schemaName: 'mi-schema' }),
    })).toBe('schema-config-changed');

    // Cambia la configuración de OpenSpec del repo conservando el schema ⇒ idem
    expect(validatePlanIntegrity(plan, {
      ...currentParams,
      schemaConfigFingerprint: computeFingerprint({ ...schemaConfig, repoConfigRaw: 'schema: spec-driven\n# extra\n' }),
    })).toBe('schema-config-changed');
  });

  it('readRepoSchemaConfig lee schema y config de disco real y degrada a null si no existe', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-schema-config-'));
    try {
      // Sin openspec/config.yaml ⇒ ambos null (degradación, no fallo)
      expect(readRepoSchemaConfig(tempDir)).toEqual({ schemaName: null, repoConfigRaw: null });

      const openspecDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(openspecDir, { recursive: true });
      fs.writeFileSync(path.join(openspecDir, 'config.yaml'), 'schema: spec-driven\n');
      const read = readRepoSchemaConfig(tempDir);
      expect(read.schemaName).toBe('spec-driven');
      expect(read.repoConfigRaw).toBe('schema: spec-driven\n');
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it('el preview transporta el inventario clasificado completo, no sólo su huella (2.11)', () => {
    const inventory = [
      {
        id: 'output-agents',
        targetName: 'Agents Multi-Agent',
        kind: 'repo-local' as const,
        displayPath: '.agents/skills/openspec-*',
        descriptionKey: 'pipeline.openspec.engine.output.agentsDesc',
        blocked: false,
        presenceState: 'present' as const,
        contentHash: null,
      },
    ];
    const preview = generateDiagnosticPreview({
      repoPath: 'C:\\repo',
      engineStatus: {
        ...dummyStatus,
        installedIntegration: {
          skills: [],
          generatedBy: null,
          markersFound: [],
          outputInventory: inventory,
          evidenceStatus: 'confirmed',
          tools: [],
          targets: [],
          installedWorkflowsByTarget: {},
          missing: null,
          legacy: [],
          customized: [],
          conflicts: null,
        },
      },
    });

    expect(preview.outputInventory).toEqual(inventory);
    expect(preview.invalidationParams.outputInventoryFingerprint).toBe(computeFingerprint(inventory));
  });
});
