import { describe, expect, it } from 'vitest';
import {
  classifyCoexistenceSkills,
  deriveOfficialCommand,
  deriveUpdateBlockReason,
  deriveUpdateMatrixAction,
} from '../openspec-update-guide';
import type { OpenSpecEngineStatus, OpenSpecInstalledEvidence } from '@/types/pipeline';

describe('openspec-update-guide (Fase 6: Matriz declarada y Convivencia)', () => {
  describe('deriveOfficialCommand (6.2)', () => {
    it('devuelve openspec update para update y upgrade-update', () => {
      expect(deriveOfficialCommand('update', null)).toBe('openspec update');
      expect(deriveOfficialCommand('upgrade-update', null)).toBe('openspec update');
    });

    it('devuelve openspec init --tools con las herramientas detectadas para init y upgrade-init', () => {
      const mockStatus: OpenSpecEngineStatus = {
        cli: {
          installed: true,
          runtimeVersion: '1.8.0',
          provenance: 'global',
          displayPath: 'C:\\openspec.cmd',
          supportedRange: { min: '1.5.0', max: '1.8.0' },
          versionClass: 'supported',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        },
        latestAvailable: null,
        globalConfig: null,
        installedIntegration: {
          skills: [],
          generatedBy: '1.8.0',
          markersFound: [],
          outputInventory: [],
          evidenceStatus: 'confirmed',
          tools: ['agents', 'antigravity'],
          targets: ['agents', 'antigravity'],
          presentToolDirectories: ['agents', 'antigravity'],
          installedWorkflowsByTarget: {},
          missing: null,
          legacy: [],
          customized: [],
          conflicts: null,
        },
        repoState: 'not-initialized',
        integrationState: 'outdated',
      };

      expect(deriveOfficialCommand('init', mockStatus)).toBe('openspec init --tools agents,antigravity');
      expect(deriveOfficialCommand('upgrade-init', mockStatus)).toBe('openspec init --tools agents,antigravity');
    });

    it('usa agents por omisión si no hay herramientas presentes en init', () => {
      expect(deriveOfficialCommand('init', null)).toBe('openspec init --tools agents');
    });

    it('devuelve null cuando la acción es none o blocked', () => {
      expect(deriveOfficialCommand('none', null)).toBeNull();
      expect(deriveOfficialCommand('blocked', null)).toBeNull();
    });

    it('resuelve correctamente la acción para CLI 1.5.0 compatible con integración al día (none)', () => {
      // Estado desacoplado: motor 1.5.0 compatible con skills generados en 1.5.0
      const status150: OpenSpecEngineStatus = {
        cli: {
          installed: true,
          runtimeVersion: '1.5.0',
          provenance: 'global',
          displayPath: 'C:\\openspec.cmd',
          supportedRange: { min: '1.5.0', max: '1.9.0' },
          versionClass: 'supported',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        },
        latestAvailable: {
          status: 'online',
          latestVersion: '1.9.0',
          checkedAt: 'now',
          fromCache: false,
          cacheAgeSeconds: 0,
          freshness: 'fresh',
          error: null,
        },
        globalConfig: null,
        installedIntegration: {
          skills: [],
          generatedBy: '1.5.0',
          markersFound: [],
          outputInventory: [],
          evidenceStatus: 'confirmed',
          tools: ['agents'],
          targets: ['agents'],
          installedWorkflowsByTarget: {},
          missing: null,
          legacy: [],
          customized: [],
          conflicts: null,
        },
        repoState: 'initialized',
        integrationState: 'up-to-date',
        freshnessState: 'cli-upgrade-available',
      };

      const action = deriveUpdateMatrixAction(status150);
      expect(action).toBe('none');
      expect(deriveOfficialCommand(action, status150)).toBeNull();
    });

    it('resuelve update para CLI 1.9.0 cuando los skills en repo son 1.5.0 (outdated)', () => {
      const status190: OpenSpecEngineStatus = {
        cli: {
          installed: true,
          runtimeVersion: '1.9.0',
          provenance: 'global',
          displayPath: 'C:\\openspec.cmd',
          supportedRange: { min: '1.5.0', max: '1.9.0' },
          versionClass: 'supported',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        },
        latestAvailable: {
          status: 'online',
          latestVersion: '1.9.0',
          checkedAt: 'now',
          fromCache: false,
          cacheAgeSeconds: 0,
          freshness: 'fresh',
          error: null,
        },
        globalConfig: null,
        installedIntegration: {
          skills: [],
          generatedBy: '1.5.0',
          markersFound: [],
          outputInventory: [],
          evidenceStatus: 'confirmed',
          tools: ['agents'],
          targets: ['agents'],
          installedWorkflowsByTarget: {},
          missing: null,
          legacy: [],
          customized: [],
          conflicts: null,
        },
        repoState: 'initialized',
        integrationState: 'outdated',
        freshnessState: 'cli-up-to-date',
      };

      const action = deriveUpdateMatrixAction(status190);
      expect(action).toBe('update');
      expect(deriveOfficialCommand(action, status190)).toBe('openspec update');
    });

    it('resuelve update (no blocked) con motor supported e integración desactualizada (outdated)', () => {
      const action = deriveUpdateMatrixAction({
        versionClass: 'supported',
        integrationState: 'outdated',
        repoState: 'initialized',
      });
      expect(action).toBe('update');
    });
  });

  describe('deriveUpdateBlockReason', () => {
    it('devuelve cli-not-installed cuando el CLI no está instalado en un repo inicializado', () => {
      const reason = deriveUpdateBlockReason({
        cli: {
          installed: false,
          runtimeVersion: null,
          provenance: 'unknown',
          displayPath: null,
          supportedRange: { min: '1.5.0', max: '1.12.0' },
          versionClass: 'unknown',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        },
        repoState: 'initialized',
        integrationState: 'outdated',
        latestAvailable: null,
        globalConfig: null,
        installedIntegration: null,
      });
      expect(reason).toBe('cli-not-installed');
    });

    it('devuelve version-unknown cuando la versión no se puede determinar', () => {
      const reason = deriveUpdateBlockReason({
        versionClass: 'unknown',
        repoState: 'initialized',
      });
      expect(reason).toBe('version-unknown');
    });

    it('devuelve legacy-coexistence cuando conviven skills legacy y nuevos (caso OdontoPau)', () => {
      const reason = deriveUpdateBlockReason({
        versionClass: 'supported',
        integrationState: 'conflicted',
        repoState: 'initialized',
        installedIntegration: {
          skills: [
            { name: 'openspec-explore', path: '.codex/skills/openspec-explore', origin: 'legacy-codex', isOfficial: true },
            { name: 'openspec-apply-change', path: '.agents/skills/openspec-apply-change', origin: 'new-agents', isOfficial: true },
          ],
          generatedBy: '1.5.0',
          markersFound: [],
          outputInventory: [],
          evidenceStatus: 'confirmed',
          tools: ['agents', 'codex'],
          targets: ['agents', 'codex'],
          configuredTools: ['agents', 'codex'],
          presentToolDirectories: ['agents', 'codex'],
          configuredAgentsCount: 2,
          totalPresentAgentsCount: 2,
          conflicts: ['Coexistencia de configuración legacy (.codex/.agent) y nueva (.agents).'],
          installedWorkflowsByTarget: {},
          missing: [],
          legacy: ['codex'],
          customized: [],
        },
      });
      expect(reason).toBe('legacy-coexistence');
    });

    it('no clasifica como legacy-coexistence si solo hay texto de conflicto pero ningún skill de origen legacy', () => {
      const reason = deriveUpdateBlockReason({
        versionClass: 'supported',
        integrationState: 'conflicted',
        repoState: 'initialized',
        installedIntegration: {
          skills: [
            { name: 'openspec-apply-change', path: '.agents/skills/openspec-apply-change', origin: 'new-agents', isOfficial: true },
          ],
          generatedBy: '1.5.0',
          markersFound: [],
          outputInventory: [],
          evidenceStatus: 'confirmed',
          tools: ['agents'],
          targets: ['agents'],
          configuredTools: ['agents'],
          presentToolDirectories: ['agents'],
          configuredAgentsCount: 1,
          totalPresentAgentsCount: 1,
          conflicts: ['Coexistencia de configuración legacy (.codex/.agent) y nueva (.agents).'],
          installedWorkflowsByTarget: {},
          missing: [],
          legacy: [],
          customized: [],
        },
      });
      expect(reason).toBe('unclassified');
    });

    it('devuelve customized cuando la integración está en estado custom', () => {
      const reason = deriveUpdateBlockReason({
        versionClass: 'supported',
        integrationState: 'custom',
        repoState: 'initialized',
      });
      expect(reason).toBe('customized');
    });

    it('devuelve evidence-unknown cuando la integración o evidencia está en estado unknown', () => {
      const reason = deriveUpdateBlockReason({
        versionClass: 'supported',
        integrationState: 'unknown',
        repoState: 'initialized',
      });
      expect(reason).toBe('evidence-unknown');
    });

    it('devuelve unclassified cuando la causa del bloqueo no corresponde a las categorías anteriores', () => {
      const reason = deriveUpdateBlockReason({
        versionClass: 'supported',
        integrationState: 'conflicted',
        repoState: 'initialized',
        installedIntegration: {
          skills: [],
          generatedBy: '1.14.0',
          markersFound: [],
          outputInventory: [],
          evidenceStatus: 'confirmed',
          tools: [],
          targets: [],
          configuredTools: [],
          presentToolDirectories: [],
          configuredAgentsCount: 0,
          totalPresentAgentsCount: 0,
          conflicts: ['Error desconocido de validación'],
          installedWorkflowsByTarget: {},
          missing: [],
          legacy: [],
          customized: [],
        },
      });
      expect(reason).toBe('unclassified');
    });

    it('devuelve null cuando la operación no está bloqueada por estas causas', () => {
      expect(
        deriveUpdateBlockReason({
          versionClass: 'supported',
          integrationState: 'outdated',
          repoState: 'initialized',
        }),
      ).toBeNull();
      expect(
        deriveUpdateBlockReason({
          versionClass: 'supported',
          integrationState: 'up-to-date',
          repoState: 'initialized',
        }),
      ).toBeNull();
    });
  });

  describe('classifyCoexistenceSkills (6.4)', () => {
    it('maneja evidencia nula o vacía sin fallar', () => {
      const result = classifyCoexistenceSkills(null);
      expect(result.legacySkills).toEqual([]);
      expect(result.newAgentsSkills).toEqual([]);
      expect(result.officialOtherSkills).toEqual([]);
      expect(result.customPreexistingSkills).toEqual([]);
      expect(result.customOtherSkills).toEqual([]);
      expect(result.nameCollisions).toEqual([]);
      expect(result.conflicts).toEqual([]);
    });

    it('clasifica correctamente la estructura real del repositorio (5 herramientas)', () => {
      const mockEvidence: OpenSpecInstalledEvidence = {
        skills: [
          // 5 de .codex (legacy)
          { name: 'openspec-propose', path: 'C:\\repo\\.codex\\skills\\openspec-propose', origin: 'legacy-codex', isOfficial: true },
          { name: 'openspec-explore', path: 'C:\\repo\\.codex\\skills\\openspec-explore', origin: 'legacy-codex', isOfficial: true },
          { name: 'openspec-apply-change', path: 'C:\\repo\\.codex\\skills\\openspec-apply-change', origin: 'legacy-codex', isOfficial: true },
          { name: 'openspec-sync-specs', path: 'C:\\repo\\.codex\\skills\\openspec-sync-specs', origin: 'legacy-codex', isOfficial: true },
          { name: 'openspec-archive-change', path: 'C:\\repo\\.codex\\skills\\openspec-archive-change', origin: 'legacy-codex', isOfficial: true },
          // 5 de .agent (legacy)
          { name: 'openspec-propose', path: 'C:\\repo\\.agent\\skills\\openspec-propose', origin: 'legacy-agent', isOfficial: true },
          { name: 'openspec-explore', path: 'C:\\repo\\.agent\\skills\\openspec-explore', origin: 'legacy-agent', isOfficial: true },
          { name: 'openspec-apply-change', path: 'C:\\repo\\.agent\\skills\\openspec-apply-change', origin: 'legacy-agent', isOfficial: true },
          { name: 'openspec-sync-specs', path: 'C:\\repo\\.agent\\skills\\openspec-sync-specs', origin: 'legacy-agent', isOfficial: true },
          { name: 'openspec-archive-change', path: 'C:\\repo\\.agent\\skills\\openspec-archive-change', origin: 'legacy-agent', isOfficial: true },
          // 5 de .claude (official-other)
          { name: 'openspec-propose', path: 'C:\\repo\\.claude\\skills\\openspec-propose', origin: 'official-other', isOfficial: true },
          { name: 'openspec-explore', path: 'C:\\repo\\.claude\\skills\\openspec-explore', origin: 'official-other', isOfficial: true },
          { name: 'openspec-apply-change', path: 'C:\\repo\\.claude\\skills\\openspec-apply-change', origin: 'official-other', isOfficial: true },
          { name: 'openspec-sync-specs', path: 'C:\\repo\\.claude\\skills\\openspec-sync-specs', origin: 'official-other', isOfficial: true },
          { name: 'openspec-archive-change', path: 'C:\\repo\\.claude\\skills\\openspec-archive-change', origin: 'official-other', isOfficial: true },
          // 5 de .opencode (official-other)
          { name: 'openspec-propose', path: 'C:\\repo\\.opencode\\skills\\openspec-propose', origin: 'official-other', isOfficial: true },
          { name: 'openspec-explore', path: 'C:\\repo\\.opencode\\skills\\openspec-explore', origin: 'official-other', isOfficial: true },
          { name: 'openspec-apply-change', path: 'C:\\repo\\.opencode\\skills\\openspec-apply-change', origin: 'official-other', isOfficial: true },
          { name: 'openspec-sync-specs', path: 'C:\\repo\\.opencode\\skills\\openspec-sync-specs', origin: 'official-other', isOfficial: true },
          { name: 'openspec-archive-change', path: 'C:\\repo\\.opencode\\skills\\openspec-archive-change', origin: 'official-other', isOfficial: true },
          // 3 personalizados en .agents
          { name: 'accessibility', path: 'C:\\repo\\.agents\\skills\\accessibility', origin: 'custom-agents', isOfficial: false },
          { name: 'dex', path: 'C:\\repo\\.agents\\skills\\dex', origin: 'custom-agents', isOfficial: false },
          { name: 'seo', path: 'C:\\repo\\.agents\\skills\\seo', origin: 'custom-agents', isOfficial: false },
        ],
        generatedBy: '1.8.0',
        markersFound: [],
        outputInventory: [],
        evidenceStatus: 'confirmed',
        tools: ['agents', 'codex', 'antigravity', 'claude', 'opencode'],
        targets: ['agents', 'codex', 'antigravity', 'claude', 'opencode'],
        installedWorkflowsByTarget: {},
        missing: null,
        legacy: ['codex', 'antigravity'],
        customized: ['accessibility', 'dex', 'seo'],
        conflicts: null,
      };

      const result = classifyCoexistenceSkills(mockEvidence);

      // 10 legacy en total
      expect(result.legacySkills).toHaveLength(10);
      // 10 oficiales en otras herramientas (.claude y .opencode)
      expect(result.officialOtherSkills).toHaveLength(10);
      // 3 personalizados en .agents, NINGÚN openspec-*
      expect(result.customPreexistingSkills.map((s) => s.name)).toEqual(['accessibility', 'dex', 'seo']);
      expect(result.customPreexistingSkills.some((s) => s.name.startsWith('openspec-'))).toBe(false);
      // CERO colisiones falsas (el mismo nombre en .codex y .claude NO es colisión)
      expect(result.nameCollisions).toEqual([]);
    });

    it('detecta colisiones reales cuando un personalizado usa un nombre de flujo oficial', () => {
      const mockEvidence: OpenSpecInstalledEvidence = {
        skills: [
          {
            name: 'openspec-propose',
            path: 'C:\\repo\\.codex\\skills\\openspec-propose',
            origin: 'legacy-codex',
            isOfficial: true,
          },
          {
            name: 'openspec-propose',
            path: 'C:\\repo\\.agents\\skills\\openspec-propose',
            origin: 'custom-agents',
            isOfficial: false,
          },
        ],
        generatedBy: '1.8.0',
        markersFound: [],
        outputInventory: [],
        evidenceStatus: 'confirmed',
        tools: ['agents', 'codex'],
        targets: ['agents', 'codex'],
        installedWorkflowsByTarget: {},
        missing: null,
        legacy: ['codex'],
        customized: ['openspec-propose'],
        conflicts: null,
      };

      const result = classifyCoexistenceSkills(mockEvidence);
      expect(result.nameCollisions).toEqual(['openspec-propose']);
    });
  });
});
