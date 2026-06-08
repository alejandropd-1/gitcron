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

/** Filler words in Spanish and English to remove from branch slugs. */
const FILLER_WORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'y', 'al', 'en', 'con', 'para', 'por',
  'the', 'a', 'an', 'of', 'and', 'to', 'in', 'on', 'for', 'with'
]);

/**
 * Generates a concise branch slug from a free-text title by removing ES+EN filler words,
 * slugifying, taking the first ~3-4 meaningful words, and limiting to ~40 characters on
 * word boundaries, without double or trailing/leading hyphens.
 */
export function branchSlugFromTitle(title: string): string {
  if (!title) return 'idea';

  // Normalize: lower case and remove accents
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Split into words by any sequence of non-alphanumeric characters
  const rawWords = normalized.split(/[^a-z0-9]+/g).filter(Boolean);

  // Filter out filler words
  const meaningfulWords = rawWords.filter(word => !FILLER_WORDS.has(word));

  // If all words were fillers, fall back to rawWords. If that's also empty, fallback to ['idea']
  const wordsToUse = meaningfulWords.length > 0 ? meaningfulWords : rawWords;
  if (wordsToUse.length === 0) {
    return 'idea';
  }

  // Take up to 4 words and clamp at <= 40 chars
  let result = '';
  const maxWords = Math.min(4, wordsToUse.length);
  for (let count = maxWords; count >= 1; count--) {
    const candidate = wordsToUse.slice(0, count).join('-');
    if (candidate.length <= 40) {
      result = candidate;
      break;
    }
  }

  // If even the first word is longer than 40 chars, truncate it to 40
  if (!result && wordsToUse.length > 0) {
    result = wordsToUse[0].slice(0, 40);
  }

  return result || 'idea';
}

/**
 * Escapes markdown code fences by scanning the longest run of backticks
 * in the content and returning a fence of (longest_run + 1) backticks, minimum 3.
 */
export function codeFenceFor(content: string): string {
  if (!content) return '```';
  const matches = content.match(/`+/g);
  if (!matches) return '```';
  const longestRun = Math.max(...matches.map(m => m.length));
  return '`'.repeat(Math.max(3, longestRun + 1));
}

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

/** The branch name for a materialized idea with optional deduplication. */
export function branchNameFor(title: string, existingBranches?: string[]): string {
  const baseSlug = branchSlugFromTitle(title);
  let slug = baseSlug;
  let counter = 2;
  const prefix = 'imagined/';
  
  if (existingBranches) {
    while (existingBranches.includes(`${prefix}${slug}`)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
  return `${prefix}${slug}`;
}

/** The git tag tying the branch to its flight level with optional deduplication. */
export function tagNameFor(level: FlightLevel, existingTags?: string[]): string {
  const baseTag = `flight/${level}`;
  let tag = baseTag;
  let counter = 2;
  
  if (existingTags) {
    while (existingTags.includes(tag)) {
      tag = `${baseTag}-${counter}`;
      counter++;
    }
  }
  return tag;
}

/** The copyable execution brief shown in the materialization preview. */
export function buildAgentBriefMarkdown(idea: MaterializeIdeaInput): string {
  const sections = [
    `# ${idea.title}`,
    '',
    `> Materialized from a Temporal Agent prediction. This branch is a starting`,
    `> point for an imagined future — not yet real work.`,
    '',
    '## Rationale (agent)',
    '',
    idea.rationale || '_(no rationale provided)_',
  ];

  if (idea.reasoning) {
    sections.push(
      '',
      '## Reasoning',
      '',
      idea.reasoning,
    );
  }

  if (idea.agentPrompt) {
    const fence = codeFenceFor(idea.agentPrompt);
    sections.push(
      '',
      '## AI Agent Prompt (for execution)',
      '',
      `${fence}text`,
      idea.agentPrompt,
      fence,
    );
  }

  return sections.join('\n');
}

/** The IDEA.md body committed onto the new branch. */
function buildIdeaMarkdown(
  idea: MaterializeIdeaInput,
  level: FlightLevel,
): string {
  const pct = Math.round(clamp01(idea.confidence) * 100);
  const sections = [
    buildAgentBriefMarkdown(idea),
    '',
    '## Metadata',
    '',
    `- **Type:** ${idea.type}`,
    `- **Flight level:** ${level}`,
    `- **Agent confidence:** ${pct}%`,
    '',
    '## Next steps',
    '',
    '- [ ] Pass the AI Agent Prompt to a coding agent (like Antigravity or Claude) to start implementing this idea.',
    '- [ ] Decide whether this future is worth pursuing.',
    '- [ ] Sketch the first concrete change.',
    '- [ ] Replace this file with a real plan or delete the branch.',
    '',
  ];

  return sections.join('\n');
}

/** The single source of truth for a materialization plan. */
export function buildMaterializationPlan(
  idea: MaterializeIdeaInput,
  existingBranches?: string[],
  existingTags?: string[],
): MaterializationPlan {
  const flightLevel = flightLevelFor(idea.type, idea.confidence);
  return {
    branchName: branchNameFor(idea.title, existingBranches),
    tagName: tagNameFor(flightLevel, existingTags),
    flightLevel,
    commitMessage: `idea: ${idea.title}`,
    ideaMarkdown: buildIdeaMarkdown(idea, flightLevel),
    agentBriefMarkdown: buildAgentBriefMarkdown(idea),
  };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
