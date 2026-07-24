export type EvidenceConfidence = 'confirmed' | 'inferred' | 'unknown';
export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export interface PipelineDiagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  sourceRef: string;
  line?: number;
}

export interface TaskEvidence {
  id: string;
  text: string;
  completed: boolean;
  line: number;
  sourceRef: string;
}

export interface AuditEvidence {
  verdict: 'approved' | 'rejected' | 'unknown';
  findings: string[];
  sourceRef: string;
  confidence: EvidenceConfidence;
}

export interface JsonlCursor {
  offset: number;
  pending: string;
  generation: string | null;
}

export interface ParsedJsonl<T> {
  records: T[];
  cursor: JsonlCursor;
  diagnostics: PipelineDiagnostic[];
  reset: boolean;
}

export interface GateRecord {
  ts: string;
  mode: string;
  result: 'VERDE' | 'ROJO' | 'PENDIENTE';
}

export interface DelegationRecord {
  ts: string;
  role: string;
  model: string;
  task: string;
  result: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
  durationMs: number | null;
  retries: number | null;
  humanWaitMs: number | null;
  humanTouches: number | null;
}

export interface VisualDiffRecord {
  runId: string;
  ts: string;
  route: string;
  viewport: unknown;
  excepted: boolean | null;
  rawMeasurements: Record<string, number>;
}

export interface ControlEvaluation {
  triggered: boolean | null;
  issueCaught: boolean | null;
  acceptedFinding: boolean | null;
  falsePositive: boolean | null;
  humanWaitMs: number | null;
  humanTouches: number | null;
  retries: number | null;
  cycleTimeMs: number | null;
}

export interface ChangeSelection {
  changeId: string | null;
  confidence: EvidenceConfidence;
  selectionRequired: boolean;
  reason: string;
}

export interface DecisionRequest {
  decisionId: string;
  repoId: string;
  changeId: string | null;
  kind: 'audit-rejected' | 'clarification' | 'dependency-request' | 'unknown';
  status: 'pending' | 'answered' | 'unknown';
  title: string;
  summary: string;
  risk: 'low' | 'medium' | 'high' | 'unknown';
  riskReason: string | null;
  provenance: 'repo' | 'derived' | 'human' | 'runtime';
  evidenceRefs: string[];
  requestedAt: string;
}

export interface PipelineEvidence {
  repoId: string;
  observedAt: string;
  tasks: TaskEvidence[];
  reports: string[];
  gates: GateRecord[];
  delegations: DelegationRecord[];
  visualDiffs: VisualDiffRecord[];
  decisions: DecisionRequest[];
  activeChanges: string[];
  archivedChanges: string[];
  mergedChanges: string[];
  diagnostics: PipelineDiagnostic[];
  selection: ChangeSelection;
}

export interface PipelineState extends PipelineEvidence {
  revision: number;
}

export type SemanticEventKind =
  | 'task.completed'
  | 'report.added'
  | 'gate.changed'
  | 'change.merged'
  | 'change.archived';

export interface PipelineSemanticEvent {
  eventId: string;
  repoId: string;
  kind: SemanticEventKind;
  observedAt: string;
  subjectId: string;
  evidenceRefs: string[];
}

export interface ReductionResult {
  state: PipelineState;
  events: PipelineSemanticEvent[];
}

export * from './runtime';
