// electron/ai/predict.ts
//
// Orchestrator for a single prediction run (MAIN PROCESS). Ties together:
//   skill text  +  feedback block (decision log)  +  repo context (scoped)
//   →  assembled prompt  →  active provider  →  filtered PredictionResult
//
// Read-only w.r.t. Git: it only READS log / package.json for context. It never
// runs a mutating Git command (brief §0.6). No secrets here — keys live in
// key-store and are read inside the provider adapter.
//
// INTEGRATION NOTE — two one-line edits to the already-scaffolded provider files:
//   • types/temporal-agent.ts: AIPredictionProvider.predictTimelines now takes
//     `AssembledPrompts` (defined below) instead of raw PredictionInput, so the
//     prompt is assembled ONCE here and shared across providers.
//   • electron/ai/providers/claude.ts: drop the dynamic `import('../predict')`
//     hack; the adapter now receives { systemPrompt, userPrompt } directly.

import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import simpleGit from 'simple-git';

import {
  applyPrivacyScope,
  renderFeedbackBlock,
  isSuppressed,
  type RawRepoContext,
} from '../../lib/feedback-context';
import type {
  TemporalAgentConfig,
  TemporalAgentNotes,
  PredictionInput,
  PredictionResult,
  AIPredictionProvider,
} from '../../types/temporal-agent';
import { getProvider, type ProviderId } from './providers';

export interface AssembledPrompts {
  systemPrompt: string;
  userPrompt: string;
  input: PredictionInput;
}

/** Default budget for a single provider call before we give up. */
export const PREDICTION_TIMEOUT_MS = 30_000;

/**
 * fetch() with a hard timeout via AbortController. If the provider hangs, we
 * abort at `timeoutMs` and throw a soft, user-facing message instead of leaving
 * the UI waiting forever. Re-throws other errors untouched.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = PREDICTION_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`La predicción tardó demasiado (más de ${Math.round(timeoutMs / 1000)}s) y se canceló. Probá de nuevo.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// --- skill text -------------------------------------------------------------

const SKILL_REL = 'temporal-attention/SKILL.md';
const DOCTRINE_REL = 'temporal-attention/references/FORECASTING-DOCTRINE.md';

/** Minimal embedded fallback if the SKILL.md isn't found on disk. */
const SKILL_FALLBACK =
  'You are GitCron\'s Temporal Agent. Reason only about this repo\'s trajectory ' +
  'and propose 3-6 grounded, speculative future branches. Output only the ' +
  'PredictionResult JSON. Never re-propose rejected ideas. Honesty over hype.';

/** Minimal doctrine fallback (the entropy capstone in one line). */
const DOCTRINE_FALLBACK =
  'Forecasting doctrine: estimate how strongly the repo history constrains what ' +
  'comes next (entropy); confidence = inverse of that estimate. Think fox not ' +
  'hedgehog (3-6 lenses), speak in calibrated probabilities, show an ensemble of ' +
  'futures (low->creative flight), tag incremental vs paradigm, and never treat ' +
  'hype as evidence.';

/** Loads the skill body (frontmatter stripped) from resources or the repo. */
export function loadSkillText(): string {
  return loadSkillFile(SKILL_REL, SKILL_FALLBACK);
}

/** Loads the forecasting doctrine (the 7 principles; entropy capstone). */
export function loadDoctrineText(): string {
  return loadSkillFile(DOCTRINE_REL, DOCTRINE_FALLBACK);
}

function loadSkillFile(relPath: string, fallback: string): string {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'skills', relPath),
    path.join(app.getAppPath(), '.agents', 'skills', relPath),
    path.join(process.cwd(), '.agents', 'skills', relPath),
  ];
  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      return stripFrontmatter(raw);
    } catch {
      /* try next */
    }
  }
  return fallback;
}

function stripFrontmatter(md: string): string {
  if (md.startsWith('---')) {
    const end = md.indexOf('\n---', 3);
    if (end !== -1) return md.slice(md.indexOf('\n', end + 1) + 1).trim();
  }
  return md.trim();
}

// --- repo context (read-only) -----------------------------------------------

export async function gatherRawContext(
  repoPath: string,
  commitCount = 40,
): Promise<RawRepoContext> {
  const git = simpleGit(repoPath);

  // Commit messages — read-only log.
  let commitMessages: string[] = [];
  try {
    const log = await git.log({ maxCount: commitCount });
    commitMessages = log.all.map((c) => c.message);
  } catch {
    commitMessages = [];
  }

  // Dependencies + language hints from package.json.
  let dependencies: Record<string, string> = {};
  const languages = new Set<string>();
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoPath, 'package.json'), 'utf8'));
    dependencies = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (dependencies['typescript']) languages.add('TypeScript');
    if (dependencies['react']) languages.add('React');
    if (dependencies['next']) languages.add('Next.js');
    if (dependencies['electron']) languages.add('Electron');
  } catch {
    /* no package.json — leave empty */
  }

  // Changed filenames (gathered always; the scope decides if they're sent).
  let fileNames: string[] = [];
  try {
    const raw = await git.raw(['log', '-n', '20', '--name-only', '--pretty=format:']);
    fileNames = Array.from(new Set(raw.split('\n').map((s) => s.trim()).filter(Boolean))).slice(0, 60);
  } catch {
    fileNames = [];
  }

  return { commitMessages, languages: [...languages], dependencies, fileNames };
}

// --- prompt assembly (pure) -------------------------------------------------

export function assemblePrompts(
  skillText: string,
  doctrineText: string,
  feedbackBlock: string,
  input: PredictionInput,
): AssembledPrompts {
  // Order matters: skill (who you are) → doctrine (the method, entropy capstone)
  // → feedback (focus) → context (raw material). See CONTEXT-FEEDBACK-FORMAT.md.
  const systemPrompt = [
    skillText,
    '',
    '# Forecasting doctrine (apply before predicting; estimate entropy first)',
    doctrineText,
    '',
    '# User context & feedback',
    feedbackBlock,
  ].join('\n');

  const userPrompt = [
    '# Repository context',
    `Languages: ${input.languages.join(', ') || '—'}`,
    `Dependencies: ${Object.keys(input.dependencies).join(', ') || '—'}`,
    '',
    'Recent commit messages:',
    ...input.commitMessages.map((m) => `- ${m}`),
    ...(input.fileNames?.length
      ? ['', 'Recently changed files:', ...input.fileNames.map((f) => `- ${f}`)]
      : []),
    '',
    'Return the PredictionResult JSON only.',
  ].join('\n');

  return { systemPrompt, userPrompt, input };
}

// --- orchestrator -----------------------------------------------------------

export interface RunPredictionArgs {
  repoPath: string;
  config: TemporalAgentConfig;
  notes: TemporalAgentNotes;
  providerId: ProviderId;
  /**
   * Optional adapter override. When present, it replaces the registry lookup —
   * used to inject a mock provider (no network) while still exercising the full
   * orchestrator: read-only context gather, privacy scope, feedback, threshold.
   */
  providerOverride?: AIPredictionProvider;
}

export async function runPrediction(args: RunPredictionArgs): Promise<PredictionResult> {
  const { repoPath, config, notes, providerId, providerOverride } = args;

  const raw = await gatherRawContext(repoPath);
  const input = applyPrivacyScope(raw, config.privacyScope);
  const feedbackBlock = renderFeedbackBlock(config.skillProfile, notes);
  const prompts = assemblePrompts(loadSkillText(), loadDoctrineText(), feedbackBlock, input);

  const provider =
    providerOverride ?? getProvider(providerId, { model: config.model?.trim() || undefined });
  const result = await provider.predictTimelines(prompts);

  // Belt-and-suspenders: never surface an idea the user already rejected,
  // and honor the confidence threshold.
  const threshold = config.skillProfile.confidenceThreshold;
  const branches = result.branches.filter(
    (b) => b.confidence >= threshold && !isSuppressed(b.message, notes),
  );

  return { ...result, branches };
}
