// lib/materialize-idea.ts
//
// PURE plan builder for materializing a speculative idea into a real branch
// (Phase 6). No React, no Git, no IO — so the UI preview (what the user
// confirms) and the main-process writer compute the EXACT same plan. If they
// ever diverged, the user could approve one thing and get another; sharing this
// module makes that impossible.

import type {
  FlightLevel,
  MaterializeIdeaInput,
  MaterializationPlan,
  SpeculativeType,
} from '../types/temporal-agent';

/**
 * Flight level = how far the idea reaches from the present trajectory.
 * Derived from the prediction's type + confidence. Provisional mapping — easy
 * to retune later; the level is shown to the user before anything is written.
 */
export function flightLevelFor(type: SpeculativeType, confidence: number): FlightLevel {
  if (type === 'breakthrough') return 'creative';
  if (type === 'trend') return 'high';
  // improvement: a high-confidence improvement is the most conservative move.
  return confidence >= 0.75 ? 'conservative' : 'grounded';
}

/** URL/branch-safe slug from a free-text title. Bounded length, no Git-unsafe chars. */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accent combining marks
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .slice(0, 48)
    .replace(/-+$/g, '');
  return base || 'idea';
}

/** The branch name for a materialized idea. Provisional prefix, configurable. */
export function branchNameFor(title: string): string {
  return `imagined/${slugify(title)}`;
}

/** The git tag tying the branch to its flight level. */
export function tagNameFor(level: FlightLevel): string {
  return `flight/${level}`;
}

/** The IDEA.md body committed onto the new branch. */
export function buildIdeaMarkdown(
  idea: MaterializeIdeaInput,
  level: FlightLevel,
): string {
  const pct = Math.round(clamp01(idea.confidence) * 100);
  return [
    `# ${idea.title}`,
    '',
    `> Materialized from a Temporal Agent prediction. This branch is a starting`,
    `> point for an imagined future — not yet real work.`,
    '',
    '## Rationale (agent)',
    '',
    idea.rationale || '_(no rationale provided)_',
    '',
    '## Metadata',
    '',
    `- **Type:** ${idea.type}`,
    `- **Flight level:** ${level}`,
    `- **Agent confidence:** ${pct}%`,
    '',
    '## Next steps',
    '',
    '- [ ] Decide whether this future is worth pursuing.',
    '- [ ] Sketch the first concrete change.',
    '- [ ] Replace this file with a real plan or delete the branch.',
    '',
  ].join('\n');
}

/** The single source of truth for a materialization plan. */
export function buildMaterializationPlan(idea: MaterializeIdeaInput): MaterializationPlan {
  const flightLevel = flightLevelFor(idea.type, idea.confidence);
  return {
    branchName: branchNameFor(idea.title),
    tagName: tagNameFor(flightLevel),
    flightLevel,
    commitMessage: `idea: ${idea.title}`,
    ideaMarkdown: buildIdeaMarkdown(idea, flightLevel),
  };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
