import { describe, expect, it } from 'vitest';
import {
  classifyCoexistenceSkills,
  deriveOfficialCommand,
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
