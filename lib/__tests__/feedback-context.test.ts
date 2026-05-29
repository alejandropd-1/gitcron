// lib/__tests__/feedback-context.test.ts
import { describe, it, expect } from 'vitest';
import {
  renderFeedbackBlock,
  applyPrivacyScope,
  isSuppressed,
  type RawRepoContext,
} from '@/lib/feedback-context';
import type {
  TemporalAgentSkillProfile,
  TemporalAgentNotes,
} from '@/types/temporal-agent';

const profile: TemporalAgentSkillProfile = {
  focusAreas: ['security', 'performance'],
  avoidTopics: ['state-management rewrites'],
  confidenceThreshold: 0.5,
};

const notes: TemporalAgentNotes = {
  repoName: 'GitCron',
  lastUpdated: '2026-05-28T19:00:00Z',
  decisions: [
    { date: '2026-05-28', suggestionTitle: 'Add code signing', type: 'improvement', outcome: 'accepted', confidence: 0.8 },
    { date: '2026-05-27', suggestionTitle: 'Migrate to Redux', type: 'breakthrough', outcome: 'rejected', confidence: 0.3 },
    { date: '2026-05-26', suggestionTitle: 'PR diff view', type: 'improvement', outcome: 'deferred', confidence: 0.6 },
    { date: '2026-05-25', suggestionTitle: 'Add code signing', type: 'improvement', outcome: 'accepted', confidence: 0.7 }, // dup
  ],
  summary: { accepted: 0, rejected: 0, deferred: 0, rejectedThemes: ['canvas rewrite'] },
};

describe('renderFeedbackBlock', () => {
  const block = renderFeedbackBlock(profile, notes);

  it('includes the focus and avoid profile', () => {
    expect(block).toContain('Focus areas: security, performance');
    expect(block).toContain('Avoid topics: state-management rewrites');
    expect(block).toContain('Confidence threshold: 0.5');
  });

  it('lists rejected items and recurring themes under do-not-repeat', () => {
    expect(block).toContain('Do NOT re-propose');
    expect(block).toContain('"Migrate to Redux"');
    expect(block).toContain('theme: canvas rewrite');
  });

  it('lists accepted and deferred, and dedups repeated titles', () => {
    expect(block).toContain('Recently accepted');
    expect(block).toContain('"Add code signing"');
    expect(block).toContain('Deferred');
    expect(block).toContain('"PR diff view"');
    // "Add code signing" appears twice in the log but only once in the block
    const occurrences = block.split('"Add code signing"').length - 1;
    expect(occurrences).toBe(1);
  });

  it('respects the empty profile gracefully', () => {
    const empty = renderFeedbackBlock(
      { focusAreas: [], avoidTopics: [], confidenceThreshold: 0.5 },
      { repoName: 'x', lastUpdated: '', decisions: [], summary: { accepted: 0, rejected: 0, deferred: 0, rejectedThemes: [] } },
    );
    expect(empty).toContain('Focus areas: —');
    expect(empty).not.toContain('Do NOT re-propose');
  });
});

describe('applyPrivacyScope', () => {
  const raw: RawRepoContext = {
    commitMessages: ['fix: x'],
    languages: ['TypeScript'],
    dependencies: { next: '15.4.9' },
    fileNames: ['electron/main.ts'],
  };

  it('drops filenames at the default metadata scope', () => {
    const input = applyPrivacyScope(raw, 'metadata');
    expect(input.fileNames).toBeUndefined();
    expect(input.commitMessages).toEqual(['fix: x']);
  });

  it('includes filenames only with the explicit opt-in', () => {
    const input = applyPrivacyScope(raw, 'metadata-plus-files');
    expect(input.fileNames).toEqual(['electron/main.ts']);
  });
});

describe('isSuppressed', () => {
  it('suppresses an exact rejected title (case-insensitive)', () => {
    expect(isSuppressed('migrate to redux', notes)).toBe(true);
  });

  it('suppresses titles matching a recurring rejected theme', () => {
    expect(isSuppressed('Canvas rewrite of the graph', notes)).toBe(true);
  });

  it('allows a fresh, unrelated idea', () => {
    expect(isSuppressed('Add OS notifications for rebase', notes)).toBe(false);
  });
});
