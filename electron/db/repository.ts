import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { getDatabase } from './connection';
import { getDeviceIdentity } from './device';
import type {
  BranchDecisionRow,
  ContextScope,
  DecisionKind,
  DeviceIdentity,
  NewDecision,
  NewPrediction,
  NewSpeculativeBranch,
  PredictionRunRow,
  PredictionType,
  ProviderId,
  SpeculativeBranchRow,
} from './types';

const PREDICTION_TYPES = new Set<PredictionType>(['improvement', 'breakthrough', 'trend']);
const CONTEXT_SCOPES = new Set<ContextScope>(['metadata', 'metadata_filenames']);
const DECISIONS = new Set<DecisionKind>(['accepted', 'deferred', 'rejected', 'materialized']);

interface RepositoryOptions {
  db?: DatabaseSync;
  userDataPath?: string;
  deviceIdentity?: DeviceIdentity;
  appVersion?: string | null;
  now?: () => string;
}

type PredictionRunDbRow = {
  id: string;
  repo_path: string;
  device_id: string;
  device_label: string | null;
  provider: string;
  model: string | null;
  app_version: string | null;
  context_scope: string;
  input_commit_count: number | null;
  web_trends: number;
  head_sha: string | null;
  input_hash: string | null;
  generated_at: string;
  created_at: string;
};

type SpeculativeBranchDbRow = {
  id: string;
  run_id: string;
  source_id: string | null;
  message: string;
  description: string | null;
  rationale: string;
  type: string;
  confidence: number;
};

type BranchDecisionDbRow = {
  id: string;
  branch_id: string;
  device_id: string;
  decision: string;
  materialized_ref: string | null;
  note: string | null;
  decided_at: string;
};

export function insertPrediction(
  input: NewPrediction,
  options: RepositoryOptions = {},
): { runId: string; branchIds: string[] } {
  const provider = normalizeProvider(input.provider);
  validateContextScope(input.contextScope);
  if (!Array.isArray(input.branches) || input.branches.length === 0) {
    throw new Error('Prediction must include at least one branch');
  }

  const db = resolveDatabase(options);
  const identity = resolveDeviceIdentity(options);
  const appVersion = resolveAppVersion(options);
  const createdAt = timestamp(options);
  const runId = randomUUID();
  const branchIds: string[] = [];

  db.exec('BEGIN');
  try {
    db.prepare(`
      INSERT INTO prediction_run (
        id, repo_path, device_id, device_label, provider, model, app_version,
        context_scope, input_commit_count, web_trends, head_sha, input_hash,
        generated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId,
      input.repoPath,
      identity.deviceId,
      identity.deviceLabel,
      provider,
      input.model ?? null,
      appVersion,
      input.contextScope,
      input.inputCommitCount ?? null,
      input.webTrends ? 1 : 0,
      input.headSha ?? null,
      input.inputHash ?? null,
      input.generatedAt,
      createdAt,
    );

    for (const branch of input.branches) {
      validateBranch(branch);
      db.prepare(`
        INSERT INTO speculative_branch (
          id, run_id, source_id, message, description, rationale, type, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        branch.id,
        runId,
        branch.sourceId ?? null,
        branch.message,
        branch.description ?? null,
        branch.rationale,
        branch.type,
        branch.confidence,
      );
      branchIds.push(branch.id);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return { runId, branchIds };
}

export function insertDecision(
  input: NewDecision,
  options: RepositoryOptions = {},
): { decisionId: string } {
  validateDecision(input.decision);
  const db = resolveDatabase(options);
  const identity = resolveDeviceIdentity(options);
  const decisionId = randomUUID();

  db.prepare(`
    INSERT INTO branch_decision (
      id, branch_id, device_id, decision, materialized_ref, note, decided_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    decisionId,
    input.branchId,
    identity.deviceId,
    input.decision,
    input.materializedRef ?? null,
    input.note ?? null,
    input.decidedAt ?? timestamp(options),
  );

  return { decisionId };
}

export function getRunsForRepo(
  repoPath: string,
  options: RepositoryOptions = {},
): PredictionRunRow[] {
  return (resolveDatabase(options)
    .prepare('SELECT * FROM prediction_run WHERE repo_path = ? ORDER BY generated_at ASC, created_at ASC')
    .all(repoPath) as PredictionRunDbRow[])
    .map(mapPredictionRun);
}

export function getAllRuns(options: RepositoryOptions = {}): PredictionRunRow[] {
  return (resolveDatabase(options)
    .prepare('SELECT * FROM prediction_run ORDER BY generated_at ASC, created_at ASC')
    .all() as PredictionRunDbRow[])
    .map(mapPredictionRun);
}

export function getBranchesForRun(
  runId: string,
  options: RepositoryOptions = {},
): SpeculativeBranchRow[] {
  return (resolveDatabase(options)
    .prepare('SELECT * FROM speculative_branch WHERE run_id = ? ORDER BY rowid ASC')
    .all(runId) as SpeculativeBranchDbRow[])
    .map(mapSpeculativeBranch);
}

export function getDecisionsForBranch(
  branchId: string,
  options: RepositoryOptions = {},
): BranchDecisionRow[] {
  return (resolveDatabase(options)
    .prepare('SELECT * FROM branch_decision WHERE branch_id = ? ORDER BY decided_at ASC, rowid ASC')
    .all(branchId) as BranchDecisionDbRow[])
    .map(mapBranchDecision);
}

export function getLatestDecision(
  branchId: string,
  options: RepositoryOptions = {},
): BranchDecisionRow | null {
  const row = resolveDatabase(options)
    .prepare('SELECT * FROM branch_decision WHERE branch_id = ? ORDER BY decided_at DESC, rowid DESC LIMIT 1')
    .get(branchId) as BranchDecisionDbRow | undefined;
  return row ? mapBranchDecision(row) : null;
}

function validateBranch(branch: NewSpeculativeBranch): void {
  validateBranchId(branch.id);
  validatePredictionType(branch.type);
  validateConfidence(branch.confidence);
}

function validateBranchId(branchId: string): void {
  if (typeof branchId !== 'string' || branchId.trim().length === 0) {
    throw new Error('Invalid branch id: expected a non-empty string');
  }
}

function normalizeProvider(provider: ProviderId | null | undefined): string {
  const normalized = typeof provider === 'string' ? provider.trim().toLowerCase() : '';
  if (!normalized) {
    throw new Error('Invalid prediction provider: expected a non-empty provider family');
  }
  return normalized;
}

function validatePredictionType(type: string): void {
  if (!PREDICTION_TYPES.has(type as PredictionType)) {
    throw new Error(`Invalid prediction type: ${type}`);
  }
}

function validateContextScope(contextScope: string): void {
  if (!CONTEXT_SCOPES.has(contextScope as ContextScope)) {
    throw new Error(`Invalid context scope: ${contextScope}`);
  }
}

function validateDecision(decision: string): void {
  if (!DECISIONS.has(decision as DecisionKind)) {
    throw new Error(`Invalid decision: ${decision}`);
  }
}

function validateConfidence(confidence: number): void {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(`Invalid confidence: ${confidence}. Expected a value from 0 to 1`);
  }
}

function resolveDatabase(options: RepositoryOptions): DatabaseSync {
  return options.db ?? getDatabase(resolveUserDataPath(options));
}

function resolveDeviceIdentity(options: RepositoryOptions): DeviceIdentity {
  return options.deviceIdentity ?? getDeviceIdentity(options.userDataPath);
}

function resolveAppVersion(options: RepositoryOptions): string | null {
  if (options.appVersion !== undefined) return options.appVersion;
  return electronApp().getVersion();
}

function resolveUserDataPath(options: RepositoryOptions): string {
  return options.userDataPath ?? electronApp().getPath('userData');
}

function timestamp(options: RepositoryOptions): string {
  return options.now?.() ?? new Date().toISOString();
}

function electronApp(): { getPath(name: 'userData'): string; getVersion(): string } {
  const electron = require('electron') as {
    app?: { getPath(name: 'userData'): string; getVersion(): string };
  };
  if (!electron.app) {
    throw new Error('Electron app is unavailable; pass repository test options outside Electron');
  }
  return electron.app;
}

function mapPredictionRun(row: PredictionRunDbRow): PredictionRunRow {
  return {
    id: row.id,
    repoPath: row.repo_path,
    deviceId: row.device_id,
    deviceLabel: row.device_label,
    provider: row.provider,
    model: row.model,
    appVersion: row.app_version,
    contextScope: row.context_scope,
    inputCommitCount: row.input_commit_count,
    webTrends: row.web_trends,
    headSha: row.head_sha,
    inputHash: row.input_hash,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
  };
}

function mapSpeculativeBranch(row: SpeculativeBranchDbRow): SpeculativeBranchRow {
  return {
    id: row.id,
    runId: row.run_id,
    sourceId: row.source_id,
    message: row.message,
    description: row.description,
    rationale: row.rationale,
    type: row.type,
    confidence: row.confidence,
  };
}

function mapBranchDecision(row: BranchDecisionDbRow): BranchDecisionRow {
  return {
    id: row.id,
    branchId: row.branch_id,
    deviceId: row.device_id,
    decision: row.decision,
    materializedRef: row.materialized_ref,
    note: row.note,
    decidedAt: row.decided_at,
  };
}
