// types/temporal-agent.ts
// Shared types for GitCron's Temporal Agent (Feature B foundation, Phase 0).
// No secrets are ever stored in these structures — see TEMPORAL_AGENT_DESIGN.md §4.

/** What the agent leans toward / away from. Nudged by the decision log. */
export interface TemporalAgentSkillProfile {
  /** Topics to up-weight, e.g. ['security', 'performance', 'timeline']. */
  focusAreas: string[];
  /** Topics to down-weight, e.g. ['refactoring', 'state-management rewrites']. */
  avoidTopics: string[];
  /** Predictions below this confidence are hidden. 0..1. */
  confidenceThreshold: number;
}

export type AnalysisFrequency = 'on-demand' | 'manual' | 'daily' | 'weekly';

/** Per-repo privacy scope. Default is the conservative one; never auto-escalates. */
export type PrivacyScope = 'metadata' | 'metadata-plus-files';

/** Machine state for one repo. Lives in {userData}/temporal-agent/{repoHash}/config.json */
export interface TemporalAgentConfig {
  /** Deterministic id = sha256(path.resolve(repoPath)). */
  repoHash: string;
  /** Human label only (display); not used to build file paths. */
  repoName: string;
  enabled: boolean;
  frequency: AnalysisFrequency;
  privacyScope: PrivacyScope;
  /** ISO timestamp of last successful analysis, or null. */
  lastAnalysis: string | null;
  skillProfile: TemporalAgentSkillProfile;
}

export type DecisionOutcome = 'accepted' | 'rejected' | 'deferred';
export type SpeculativeType = 'improvement' | 'breakthrough' | 'trend';

/** One logged decision. Canonical data lives in notes.json. */
export interface TemporalAgentDecision {
  /** ISO timestamp. */
  date: string;
  /** The prediction's title at the time it was shown. */
  suggestionTitle: string;
  type: SpeculativeType;
  outcome: DecisionOutcome;
  /** Agent's confidence when it made the suggestion. 0..1. */
  confidence: number;
  /** Optional free-text reason the user gave. */
  reasoning?: string;
  /** Optional note on how this should shape future analysis. */
  impact?: string;
}

/** Rolled-up counts for decisions older than the cap. */
export interface DecisionSummary {
  accepted: number;
  rejected: number;
  deferred: number;
  /** Recurring themes among rejected items, for cheap prompt context. */
  rejectedThemes: string[];
}

/** Canonical per-repo notes. {userData}/temporal-agent/{repoHash}/notes.json */
export interface TemporalAgentNotes {
  repoName: string;
  lastUpdated: string;
  /** Newest-first, capped to `decisionLogCap`. */
  decisions: TemporalAgentDecision[];
  summary: DecisionSummary;
}

// ---------------------------------------------------------------------------
// DEFERRED — Feature B proper (after A + A′ + C). Defined here so the storage
// and UI scaffold is forward-compatible. NOT used by Phase 0 code.
// ---------------------------------------------------------------------------

/** Built in MAIN according to the repo + its privacy scope. */
export interface PredictionInput {
  commitMessages: string[];
  languages: string[];
  dependencies: Record<string, string>;
  /** Present ONLY when privacyScope === 'metadata-plus-files'. */
  fileNames?: string[];
  /** Whether web-trend lookup is enabled (optional sub-phase). */
  webTrends?: boolean;
}

export interface SpeculativeBranch {
  id: string;
  message: string;
  rationale: string;
  type: SpeculativeType;
  /** 0..1 — drives opacity / dash styling on the diagonal graph. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// CENTAUR DIALOGUE — the bottom-center panel (human + AI, "voz y voto").
//
// Designed so TODAY it renders a static report (a thread with ONE message) and
// TOMORROW becomes a real back-and-forth (append more turns) with ZERO rewrite.
// The unit is a THREAD, never a single message — that is the whole trick.
// ---------------------------------------------------------------------------

export type DialogueRole = 'agent' | 'user';

export interface DialogueTurn {
  id: string;
  role: DialogueRole;
  /** Natural-language body shown in the panel. */
  text: string;
  /** ISO timestamp. */
  at: string;
}

/**
 * One conversation thread, tied to a speculative branch. Phase "report" = the
 * thread holds a single agent turn (the explanation). Phase "conversation" =
 * user/agent turns accrue. The shape never changes between phases.
 */
export interface SpeculativeDialogue {
  /** Same id as the SpeculativeBranch this explains. */
  branchId: string;
  /** Newest-last (chat order). Starts with one agent turn. */
  turns: DialogueTurn[];
}

/** Builds the opening agent turn from a branch's rationale (the report phase). */
export function openingTurnFromBranch(b: SpeculativeBranch): SpeculativeDialogue {
  const lines = [
    `**${b.message}** (${b.type}, ${Math.round(b.confidence * 100)}% confianza)`,
    '',
    b.rationale,
  ];
  return {
    branchId: b.id,
    turns: [
      {
        id: `${b.id}-t0`,
        role: 'agent',
        text: lines.join('\n'),
        at: new Date().toISOString(),
      },
    ],
  };
}

export interface PredictionResult {
  branches: SpeculativeBranch[];
  provider: string;
  generatedAt: string;
}

/** Multi-provider adapter (brief §6.1). Cloud and local/gateway families. */
export interface AIPredictionProvider {
  id: 'claude' | 'openrouter' | 'openai' | 'gemini' | 'opencode';
  label: string;
  kind: 'cloud' | 'local';
  predictTimelines(input: PredictionInput): Promise<PredictionResult>;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SKILL_PROFILE: TemporalAgentSkillProfile = {
  focusAreas: [],
  avoidTopics: [],
  confidenceThreshold: 0.5,
};

export function defaultConfig(repoHash: string, repoName: string): TemporalAgentConfig {
  return {
    repoHash,
    repoName,
    enabled: false,
    frequency: 'on-demand',
    privacyScope: 'metadata',
    lastAnalysis: null,
    skillProfile: { ...DEFAULT_SKILL_PROFILE },
  };
}

export function emptyNotes(repoName: string): TemporalAgentNotes {
  return {
    repoName,
    lastUpdated: new Date().toISOString(),
    decisions: [],
    summary: { accepted: 0, rejected: 0, deferred: 0, rejectedThemes: [] },
  };
}

/** Keep this many full decisions; older ones collapse into `summary`. */
export const DECISION_LOG_CAP = 200;
