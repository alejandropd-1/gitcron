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

  it('never renders a missing value as zero', () => {
    // La regla central del brief: unknown no es cero.
    for (const lang of LANGUAGES) {
      for (const key of ['pipeline.unknown.unknown', 'pipeline.unknown.notReported'] as const) {
        expect(translate(key, lang).trim()).not.toBe('0');
      }
    }
  });
});
