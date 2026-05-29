// lib/feedback-context.ts
//
// Pure logic for the Temporal Agent's RETROALIMENTACIÓN — turning the per-repo
// decision log into the compact text injected before the repo context, applying
// the privacy scope, and suppressing ideas the user already rejected.
//
// No React, no Electron, no IO → fully testable. The orchestrator in
// electron/ai/predict.ts wires these into the real prompt. Format spec lives in
// .agents/skills/temporal-attention/references/CONTEXT-FEEDBACK-FORMAT.md

import type {
  TemporalAgentSkillProfile,
  TemporalAgentNotes,
  PredictionInput,
  PrivacyScope,
} from '@/types/temporal-agent';

export interface RawRepoContext {
  commitMessages: string[];
  languages: string[];
  dependencies: Record<string, string>;
  fileNames: string[];
}

export interface FeedbackBlockOptions {
  maxRejected?: number;
  maxAccepted?: number;
  maxDeferred?: number;
}

const DEFAULTS: Required<FeedbackBlockOptions> = {
  maxRejected: 8,
  maxAccepted: 5,
  maxDeferred: 5,
};

/**
 * Renders the compact feedback block (recency + rules, NOT the whole log) that
 * gets prepended to the repo context. Kept small on purpose so the prompt stays
 * cheap. Returns '' when there is nothing meaningful to say.
 */
export function renderFeedbackBlock(
  profile: TemporalAgentSkillProfile,
  notes: TemporalAgentNotes,
  options: FeedbackBlockOptions = {},
): string {
  const { maxRejected, maxAccepted, maxDeferred } = { ...DEFAULTS, ...options };
  const out: string[] = [];

  const focus = profile.focusAreas.filter(Boolean);
  const avoid = profile.avoidTopics.filter(Boolean);

  out.push('## User preference profile');
  out.push(`Focus areas: ${focus.length ? focus.join(', ') : '—'}`);
  out.push(`Avoid topics: ${avoid.length ? avoid.join(', ') : '—'}`);
  out.push(`Confidence threshold: ${profile.confidenceThreshold}`);

  const rejected = recentTitles(notes, 'rejected', maxRejected);
  const rejectedThemes = notes.summary.rejectedThemes ?? [];
  if (rejected.length || rejectedThemes.length) {
    out.push('', '## Do NOT re-propose (recently rejected or recurring)');
    for (const t of rejected) out.push(`- "${t}"`);
    for (const theme of rejectedThemes) out.push(`- theme: ${theme}`);
  }

  const accepted = recentTitles(notes, 'accepted', maxAccepted);
  if (accepted.length) {
    out.push('', '## Recently accepted (lean into these)');
    for (const t of accepted) out.push(`- "${t}"`);
  }

  const deferred = recentTitles(notes, 'deferred', maxDeferred);
  if (deferred.length) {
    out.push('', '## Deferred (only if newly relevant; say what changed)');
    for (const t of deferred) out.push(`- "${t}"`);
  }

  return out.join('\n');
}

function recentTitles(
  notes: TemporalAgentNotes,
  outcome: 'accepted' | 'rejected' | 'deferred',
  limit: number,
): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const d of notes.decisions) {
    // decisions are newest-first
    if (d.outcome !== outcome) continue;
    const key = d.suggestionTitle.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(d.suggestionTitle.trim());
    if (titles.length >= limit) break;
  }
  return titles;
}

/**
 * Strips context the privacy scope doesn't allow. 'metadata' (default) NEVER
 * includes filenames; only the explicit 'metadata-plus-files' opt-in does.
 */
export function applyPrivacyScope(raw: RawRepoContext, scope: PrivacyScope): PredictionInput {
  const base: PredictionInput = {
    commitMessages: raw.commitMessages,
    languages: raw.languages,
    dependencies: raw.dependencies,
  };
  if (scope === 'metadata-plus-files') {
    base.fileNames = raw.fileNames;
  }
  return base;
}

/**
 * True if a candidate prediction should be hidden because the user already
 * rejected it (exact title, or it matches a recurring rejected theme).
 * Used to filter provider output BEFORE it reaches the graph.
 */
export function isSuppressed(title: string, notes: TemporalAgentNotes): boolean {
  const needle = title.trim().toLowerCase();
  if (!needle) return false;

  for (const d of notes.decisions) {
    if (d.outcome === 'rejected' && d.suggestionTitle.trim().toLowerCase() === needle) {
      return true;
    }
  }
  for (const theme of notes.summary.rejectedThemes ?? []) {
    const t = theme.trim().toLowerCase();
    if (t && (needle.includes(t) || t.includes(needle))) return true;
  }
  return false;
}
