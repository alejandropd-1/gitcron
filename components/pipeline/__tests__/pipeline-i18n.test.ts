import { describe, expect, it } from 'vitest';
import { translate, LANGS, type Lang } from '@/lib/i18n';

const LANGUAGES: Lang[] = ['es', 'en', 'zh'];

/** Claves que TANDA 1 estrena. Crece con cada tanda. */
const PIPELINE_KEYS = [
  'tab.pipeline',
  'pipeline.title',
  'pipeline.loading',
  'pipeline.noRepo.title',
  'pipeline.noRepo.body',
  'pipeline.noPipeline.title',
  'pipeline.noPipeline.body',
  'pipeline.noKit.title',
  'pipeline.noKit.body',
  'pipeline.noKit.sources',
  'pipeline.hermesOffline.title',
  'pipeline.hermesOffline.body',
  'pipeline.incompatible.title',
  'pipeline.incompatible.unknownVersion',
  'pipeline.error.title',
  'pipeline.error.retry',
  'pipeline.source.git',
  'pipeline.source.hermes',
  'pipeline.source.runtime',
  'pipeline.source.kit',
  'pipeline.unknown.notReported',
  'pipeline.unknown.notApplicable',
  'pipeline.unknown.pendingFixture',
  'pipeline.unknown.unknown',
  'pipeline.unknown.notReported.help',
  'pipeline.unknown.notApplicable.help',
  'pipeline.unknown.pendingFixture.help',
  'pipeline.unknown.unknown.help',
  'pipeline.provenance.runtime',
  'pipeline.provenance.repo',
  'pipeline.provenance.derived',
  'pipeline.provenance.human',
  'pipeline.evidence.verified',
  'pipeline.evidence.inferred',
  'pipeline.evidence.unknown',
  'pipeline.evidence.blocked',
  'pipeline.evidence.pending_fixture',
  'pipeline.option.viewEvidence',
  'pipeline.option.approve',
  'pipeline.option.copyAnswer',
  'pipeline.agents.title',
  'pipeline.agents.empty',
  'pipeline.agent.model',
  'pipeline.agent.provider',
  'pipeline.agent.tokens',
  'pipeline.agentState.running',
  'pipeline.agentState.done',
  'pipeline.agentState.failed',
  'pipeline.agentState.unknown',
  'pipeline.role.builder',
  'pipeline.role.auditor',
  'pipeline.role.orchestrator',
  'pipeline.role.scout',
  'pipeline.activity.title',
  'pipeline.activity.filters',
  'pipeline.activity.empty',
  'pipeline.activity.noReasoning',
  'pipeline.channel.narrative',
  'pipeline.channel.reasoning',
  'pipeline.channel.tool',
  'pipeline.channel.file',
  'pipeline.channel.system',
  'pipeline.economy.title',
  'pipeline.economy.input',
  'pipeline.economy.output',
  'pipeline.economy.reasoning',
  'pipeline.economy.cacheRead',
  'pipeline.economy.cost',
  'pipeline.economy.contextMax',
  'pipeline.economy.contextCurrent',
  'pipeline.economy.compactions',
  'pipeline.details.title',
  'pipeline.details.proposal',
  'pipeline.details.diffs',
  'pipeline.details.auditorFindings',
  'pipeline.details.gateHistory',
  'pipeline.details.touchedFiles',
  'pipeline.details.provenance',
  'pipeline.details.location',
  'pipeline.details.recommendation',
  'pipeline.details.noProposal',
  'pipeline.details.noDiffs',
  'pipeline.details.noFindings',
  'pipeline.details.noGateHistory',
] as const;

describe('Pipeline i18n', () => {
  it('covers the three shipped languages', () => {
    expect(LANGS.map((entry) => entry.code).sort()).toEqual([...LANGUAGES].sort());
  });

  it.each(LANGUAGES)('resolves every pipeline key in %s', (lang) => {
    const missing = PIPELINE_KEYS.filter((key) => {
      const value = translate(key, lang);
      // translate() devuelve la clave cuando no encuentra traducción.
      return !value || value === key;
    });
    expect(missing).toEqual([]);
  });

  it('interpolates the version into the incompatible message in every language', () => {
    for (const lang of LANGUAGES) {
      const text = translate('pipeline.incompatible.body', lang, { version: '9.9' });
      expect(text).toContain('9.9');
      expect(text).not.toContain('{version}');
    }
  });

  it('interpolates every multi-variable string in all languages', () => {
    for (const lang of LANGUAGES) {
      const coverage = translate('pipeline.economy.partialCoverage', lang, { withCost: 2, total: 3 });
      expect(coverage).toContain('2');
      expect(coverage).toContain('3');
      expect(coverage).not.toMatch(/\{\{/);

      const tokens = translate('pipeline.agent.tokensValue', lang, { input: 10, output: 20 });
      expect(tokens).toContain('10');
      expect(tokens).not.toMatch(/\{\{/);

      const progress = translate('pipeline.now.taskProgress', lang, { done: 3, total: 7 });
      expect(progress).not.toMatch(/\{\{/);
    }
  });

  it('never renders a missing value as zero', () => {
    // La regla central del brief: unknown no es cero.
    for (const lang of LANGUAGES) {
      for (const key of ['pipeline.unknown.unknown', 'pipeline.unknown.notReported'] as const) {
        expect(translate(key, lang).trim()).not.toBe('0');
      }
    }
  });
});
