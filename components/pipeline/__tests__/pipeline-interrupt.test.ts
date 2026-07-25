import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n';

describe('Pipeline Control — Interruption & Partial Work Invariants (Tanda 3)', () => {
  it('includes explicit no-rollback explanation in modal text for all languages', () => {
    for (const lang of ['es', 'en', 'zh'] as const) {
      const note = translate('pipeline.control.noRollbackNote', lang);
      const explanation = translate('pipeline.control.noRollbackExplanation', lang);
      expect(note).not.toBe('pipeline.control.noRollbackNote');
      expect(explanation).not.toBe('pipeline.control.noRollbackExplanation');
      expect(explanation.length).toBeGreaterThan(10);
    }
  });

  it('provides partial work banner notice strings', () => {
    for (const lang of ['es', 'en', 'zh'] as const) {
      const badge = translate('pipeline.control.interruptedBadge', lang);
      const notice = translate('pipeline.control.partialWorkNotice', lang);
      expect(badge).not.toBe('pipeline.control.interruptedBadge');
      expect(notice).not.toBe('pipeline.control.partialWorkNotice');
    }
  });
});
