export type ProviderId = string;
export type PredictionType = 'improvement' | 'breakthrough' | 'trend';
export type ContextScope = 'metadata' | 'metadata_filenames';
export type DecisionKind = 'accepted' | 'deferred' | 'rejected' | 'materialized';

export interface DeviceIdentity {
  deviceId: string;
  deviceLabel: string | null;
}

export interface NewSpeculativeBranch {
  id: string;
  sourceId?: string | null;
  message: string;
  description?: string | null;
  rationale: string;
  type: PredictionType;
  confidence: number;
}

export interface NewPrediction {
  repoPath: string;
  provider: ProviderId;
  model?: string;
  contextScope: ContextScope;
  inputCommitCount?: number;
  webTrends?: boolean;
  headSha?: string;
  inputHash?: string;
  generatedAt: string;
  branches: NewSpeculativeBranch[];
}

export interface NewDecision {
  branchId: string;
  decision: DecisionKind;
  materializedRef?: string | null;
  note?: string | null;
  decidedAt?: string;
}

export interface PredictionRunRow {
  id: string;
  repoPath: string;
  deviceId: string;
  deviceLabel: string | null;
  provider: string;
  model: string | null;
  appVersion: string | null;
  contextScope: string;
  inputCommitCount: number | null;
  webTrends: number;
  headSha: string | null;
  inputHash: string | null;
  generatedAt: string;
  createdAt: string;
}

export interface SpeculativeBranchRow {
  id: string;
  runId: string;
  sourceId: string | null;
  message: string;
  description: string | null;
  rationale: string;
  type: string;
  confidence: number;
}

export interface BranchDecisionRow {
  id: string;
  branchId: string;
  deviceId: string;
  decision: string;
  materializedRef: string | null;
  note: string | null;
  decidedAt: string;
}
