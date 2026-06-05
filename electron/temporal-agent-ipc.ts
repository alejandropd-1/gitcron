// electron/temporal-agent-ipc.ts
// Main-process storage + IPC for GitCron's Temporal Agent (Phase 0).
//
// SECURITY (brief §0 / SECURITY.md):
//  - Stores ONLY preferences + decisions. NEVER stores AI API keys or any secret.
//    (Keys are a separate Feature-B concern handled via safeStorage in main.)
//  - Makes ZERO network calls. No CSP change is needed for this file.
//  - File paths are derived from a sha256 hash of the resolved repo path, never
//    from raw user strings — no path-traversal surface.
//  - Never logs file contents.
//
// Register once from electron/main.ts:  registerTemporalAgentHandlers()

import { app, ipcMain } from 'electron';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  getBranchesForRun,
  getDecisionsForBranch,
  getRunsForRepo,
  insertDecision,
} from './db/repository';
import type {
  BranchDecisionRow,
  DecisionKind,
  NewDecision,
  PredictionHistoryEntry,
  PredictionRunRow,
  SpeculativeBranchRow,
} from './db/types';
import {
  type TemporalAgentConfig,
  type TemporalAgentNotes,
  type TemporalAgentDecision,
  type DecisionSummary,
  type PredictionResult,
  defaultConfig,
  emptyNotes,
  DECISION_LOG_CAP,
} from '../types/temporal-agent';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function repoHashOf(repoPath: string): string {
  return createHash('sha256').update(path.resolve(repoPath)).digest('hex');
}

function repoDir(repoPath: string): string {
  return path.join(app.getPath('userData'), 'temporal-agent', repoHashOf(repoPath));
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
}

const MAX_BYTES = 1_000_000; // hard ceiling so notes can't grow unbounded

type InsertDecisionFn = (input: NewDecision) => { decisionId: string };

interface RecordDecisionOptions {
  insertDecision?: InsertDecisionFn;
  logError?: (error: unknown) => void;
}

interface PredictionHistoryOptions {
  readRunsForRepo?: (repoPath: string) => PredictionRunRow[];
  readBranchesForRun?: (runId: string) => SpeculativeBranchRow[];
  readDecisionsForBranch?: (branchId: string) => BranchDecisionRow[];
  logError?: (error: unknown) => void;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export async function loadConfig(repoPath: string, repoName: string): Promise<TemporalAgentConfig> {
  const file = path.join(repoDir(repoPath), 'config.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as TemporalAgentConfig;
  } catch {
    // First run: return a default (not yet persisted).
    return defaultConfig(repoHashOf(repoPath), repoName);
  }
}

async function saveConfig(repoPath: string, config: TemporalAgentConfig): Promise<void> {
  const dir = repoDir(repoPath);
  await ensureDir(dir);
  // Re-stamp the hash so a renderer can't redirect the write.
  const safe: TemporalAgentConfig = { ...config, repoHash: repoHashOf(repoPath) };
  await fs.writeFile(path.join(dir, 'config.json'), JSON.stringify(safe, null, 2), { mode: 0o600 });
}

// ---------------------------------------------------------------------------
// Notes (canonical JSON + rendered markdown mirror)
// ---------------------------------------------------------------------------

export async function loadNotes(repoPath: string, repoName: string): Promise<TemporalAgentNotes> {
  const file = path.join(repoDir(repoPath), 'notes.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as TemporalAgentNotes;
  } catch {
    return emptyNotes(repoName);
  }
}

async function saveNotes(repoPath: string, notes: TemporalAgentNotes): Promise<void> {
  const dir = repoDir(repoPath);
  await ensureDir(dir);
  const json = JSON.stringify(notes, null, 2);
  if (Buffer.byteLength(json, 'utf8') > MAX_BYTES) {
    throw new Error('temporal-agent notes exceed size limit');
  }
  await fs.writeFile(path.join(dir, 'notes.json'), json, { mode: 0o600 });
  // Regenerate the human/agent-readable mirror from the same source of truth.
  await fs.writeFile(path.join(dir, 'notes.md'), renderNotesMarkdown(notes), { mode: 0o600 });
}

/** Append a decision, keep the log capped, roll older entries into the summary. */
export async function recordDecision(
  repoPath: string,
  repoName: string,
  decision: TemporalAgentDecision,
  options: RecordDecisionOptions = {},
): Promise<TemporalAgentNotes> {
  const notes = await loadNotes(repoPath, repoName);
  notes.decisions.unshift(decision); // newest first
  notes.lastUpdated = new Date().toISOString();

  if (notes.decisions.length > DECISION_LOG_CAP) {
    const overflow = notes.decisions.splice(DECISION_LOG_CAP);
    notes.summary = rollUp(notes.summary, overflow);
  }
  await saveNotes(repoPath, notes);
  persistDecisionBestEffort(decision, options);
  return notes;
}

function persistDecisionBestEffort(decision: TemporalAgentDecision, options: RecordDecisionOptions): void {
  try {
    (options.insertDecision ?? insertDecision)(buildNewDecision(decision));
  } catch (error) {
    if (options.logError) {
      options.logError(error);
    } else {
      console.error('[temporal-agent-db] decision persistence miss:', sanitizeForLog(error));
    }
  }
}

function buildNewDecision(decision: TemporalAgentDecision): NewDecision {
  return {
    branchId: decision.branchId,
    decision: decision.persistenceDecision ?? mapDecisionOutcome(decision.outcome),
    materializedRef: decision.materializedRef ?? null,
    note: decision.reasoning ?? null,
    decidedAt: decision.date,
  };
}

export function mapDecisionOutcome(outcome: TemporalAgentDecision['outcome']): DecisionKind {
  switch (outcome) {
    case 'accepted':
      return 'accepted';
    case 'rejected':
      return 'rejected';
    case 'deferred':
      return 'deferred';
    default: {
      const exhaustive: never = outcome;
      throw new Error(`Unsupported decision outcome: ${exhaustive}`);
    }
  }
}

function sanitizeForLog(value: unknown): string {
  let str: string;
  try {
    str = typeof value === 'string'
      ? value
      : value instanceof Error
        ? `${value.name}: ${value.message}`
        : JSON.stringify(value);
  } catch {
    str = String(value);
  }
  return str
    .replace(/(x-access-token:)[^@]+@/g, '$1[REDACTED]@')
    .replace(/(AUTHORIZATION:\s*basic\s+)[A-Za-z0-9+/=]+/gi, '$1[REDACTED]');
}

function rollUp(prev: DecisionSummary, overflow: TemporalAgentDecision[]): DecisionSummary {
  const next: DecisionSummary = {
    accepted: prev.accepted,
    rejected: prev.rejected,
    deferred: prev.deferred,
    rejectedThemes: [...prev.rejectedThemes],
  };
  for (const d of overflow) {
    if (d.outcome === 'accepted') next.accepted++;
    else if (d.outcome === 'rejected') {
      next.rejected++;
      const theme = d.suggestionTitle.split(' ').slice(0, 4).join(' ');
      if (!next.rejectedThemes.includes(theme)) next.rejectedThemes.push(theme);
    } else next.deferred++;
  }
  // keep the theme list bounded
  next.rejectedThemes = next.rejectedThemes.slice(-25);
  return next;
}

/** Remove the most recent decision whose title matches. Keeps the summary consistent. */
async function removeDecision(
  repoPath: string,
  repoName: string,
  suggestionTitle: string,
): Promise<void> {
  const notes = await loadNotes(repoPath, repoName);
  const idx = notes.decisions.findIndex((d) => d.suggestionTitle === suggestionTitle);
  if (idx === -1) return;
  const removed = notes.decisions[idx];
  notes.decisions.splice(idx, 1);
  notes.lastUpdated = new Date().toISOString();

  // Guard: don't let counters go negative.
  if (removed.outcome === 'accepted' && notes.summary.accepted > 0) {
    notes.summary.accepted--;
  } else if (removed.outcome === 'rejected' && notes.summary.rejected > 0) {
    notes.summary.rejected--;
  } else if (removed.outcome === 'deferred' && notes.summary.deferred > 0) {
    notes.summary.deferred--;
  }
  await saveNotes(repoPath, notes);
}

// ---------------------------------------------------------------------------
// Markdown rendering (mirror of notes.json — do not hand-edit notes.md)
// ---------------------------------------------------------------------------

function renderNotesMarkdown(notes: TemporalAgentNotes): string {
  const lines: string[] = [];
  lines.push('<!-- Generated from notes.json. Do not hand-edit; changes are overwritten. -->');
  lines.push(`# Temporal Agent Notes — ${notes.repoName}`, '');
  lines.push(`_Last updated: ${notes.lastUpdated} · Decisions recorded: ${notes.decisions.length}_`, '');

  lines.push('## Decision log', '');
  if (notes.decisions.length === 0) {
    lines.push('_No decisions yet._', '');
  } else {
    for (const d of notes.decisions) {
      lines.push(`### ${d.date} — ${d.suggestionTitle}`);
      lines.push(`- **Type:** ${d.type}`);
      lines.push(`- **Decision:** ${d.outcome}`);
      lines.push(`- **Confidence (agent):** ${d.confidence}`);
      if (d.reasoning) lines.push(`- **Your reasoning:** ${d.reasoning}`);
      if (d.impact) lines.push(`- **Effect on future analysis:** ${d.impact}`);
      lines.push('');
    }
  }

  const s = notes.summary;
  lines.push('## Rolled-up summary (older decisions)', '');
  lines.push(`- Accepted: ${s.accepted}`);
  lines.push(`- Rejected: ${s.rejected}`);
  lines.push(`- Deferred: ${s.deferred}`);
  lines.push(`- Recurring rejected themes: ${s.rejectedThemes.join(', ') || '—'}`, '');
  return lines.join('\n');
}

/** Returns the rendered markdown for the UI viewer (reads from JSON). */
async function getNotesMarkdown(repoPath: string, repoName: string): Promise<string> {
  return renderNotesMarkdown(await loadNotes(repoPath, repoName));
}

// ---------------------------------------------------------------------------
// Last prediction (Capa 1) — persist the most recent PredictionResult per-repo
// so speculative branches survive close/reopen without re-spending credit.
// Separate file from notes.json: this is WHAT was proposed, not WHAT was decided.
// ---------------------------------------------------------------------------

export async function savePrediction(repoPath: string, result: PredictionResult): Promise<void> {
  const dir = repoDir(repoPath);
  await ensureDir(dir);
  const json = JSON.stringify(result, null, 2);
  if (Buffer.byteLength(json, 'utf8') > MAX_BYTES) {
    throw new Error('temporal-agent prediction exceeds size limit');
  }
  await fs.writeFile(path.join(dir, 'prediction.json'), json, { mode: 0o600 });
}

/** Loads the last prediction, or null. Silent discard on missing/corrupt/old schema. */
export async function loadPrediction(repoPath: string): Promise<PredictionResult | null> {
  const file = path.join(repoDir(repoPath), 'prediction.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as PredictionResult;
    // Minimal shape guard — same spirit as loadNotes' silent fallback.
    if (!parsed || !Array.isArray(parsed.branches)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SQLite prediction history — read-only bridge for the renderer
// ---------------------------------------------------------------------------

export function getPredictionHistory(
  repoPath: string,
  options: PredictionHistoryOptions = {},
): PredictionHistoryEntry[] {
  if (typeof repoPath !== 'string' || repoPath.trim().length === 0) {
    return [];
  }

  try {
    const readRunsForRepo = options.readRunsForRepo ?? getRunsForRepo;
    const readBranchesForRun = options.readBranchesForRun ?? getBranchesForRun;
    const readDecisionsForBranch = options.readDecisionsForBranch ?? getDecisionsForBranch;

    return [...readRunsForRepo(repoPath)]
      .reverse()
      .map((run) => ({
        run,
        branches: readBranchesForRun(run.id).map((branch) => ({
          branch,
          decisions: readDecisionsForBranch(branch.id),
        })),
      }));
  } catch (error) {
    if (options.logError) {
      options.logError(error);
    } else {
      console.error('[temporal-agent-db] history read miss:', sanitizeForLog(error));
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// IPC registration (typed bridge; mirrors existing GitCron handler style)
// ---------------------------------------------------------------------------

export function registerTemporalAgentHandlers(): void {
  ipcMain.handle('temporal-agent:load-config', (_e, repoPath: string, repoName: string) =>
    loadConfig(repoPath, repoName),
  );
  ipcMain.handle('temporal-agent:save-config', async (_e, repoPath: string, config: TemporalAgentConfig) => {
    await saveConfig(repoPath, config);
    return { success: true as const };
  });
  ipcMain.handle('temporal-agent:load-notes', (_e, repoPath: string, repoName: string) =>
    loadNotes(repoPath, repoName),
  );
  ipcMain.handle('temporal-agent:get-notes-markdown', (_e, repoPath: string, repoName: string) =>
    getNotesMarkdown(repoPath, repoName),
  );
  ipcMain.handle(
    'temporal-agent:record-decision',
    (_e, repoPath: string, repoName: string, decision: TemporalAgentDecision) =>
      recordDecision(repoPath, repoName, decision),
  );
  ipcMain.handle(
    'temporal-agent:remove-decision',
    async (_e, repoPath: string, repoName: string, suggestionTitle: string) => {
      await removeDecision(repoPath, repoName, suggestionTitle);
      return loadNotes(repoPath, repoName);
    },
  );
  ipcMain.handle('temporal-agent:get-history', (_e, repoPath: string) =>
    getPredictionHistory(repoPath),
  );
}
