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

export type OpenSpecValidationStatus = 'passed' | 'failed' | 'unknown';

/** Evidencia durable de un change activo, leída sólo desde el scaffold OpenSpec. */
export interface OpenSpecChangeEvidence {
  changeId: string;
  intent: string | null;
  tasks: TaskEvidence[];
  proposalExists: boolean;
  designExists: boolean;
  specsCount: number;
  validation: OpenSpecValidationStatus;
  /**
   * Markdown de los artefactos, para poder leerlos sin abrir el repositorio por
   * fuera de la aplicación.
   *
   * Se transporta **sólo para el cambio seleccionado**: el contenido completo de
   * cada change activo haría crecer el snapshot sin que nadie lo mire. `null`
   * distingue "no existe" de "existe y está vacío"; los demás cambios lo dejan
   * en `null` aunque el archivo exista, y para eso está `proposalExists`.
   */
  artifacts: OpenSpecChangeArtifacts | null;
}

export interface OpenSpecChangeArtifacts {
  proposal: string | null;
  design: string | null;
  tasks: string | null;
  /** Un spec delta por capacidad tocada, en el orden en que están en disco. */
  specs: OpenSpecDeltaSpec[];
}

export interface OpenSpecDeltaSpec {
  capability: string;
  content: string | null;
  sourceRef: string;
}

export interface OpenSpecArchivedChangeEvidence {
  changeId: string;
  archivedAt: string | null;
  sourceRef: string;
  /**
   * Contenido de los artefactos, sólo para el archivado seleccionado.
   *
   * Lo que quedó archivado es el registro de lo que se hizo —incluida la firma
   * humana—, y revisarlo obligaba a salir de la aplicación. Viaja acotado al
   * seleccionado por el mismo motivo que en los activos: transportar el markdown
   * de todos haría crecer el snapshot sin que nadie lo mire.
   */
  artifacts?: OpenSpecChangeArtifacts | null;
}

export interface OpenSpecSpecificationEvidence {
  specificationId: string;
  requirements: number | null;
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
  decisions: DecisionRequest[];
  activeChanges: string[];
  archivedChanges: string[];
  mergedChanges: string[];
  diagnostics: PipelineDiagnostic[];
  selection: ChangeSelection;
  /**
   * Proyección rica para el dashboard. Son opcionales para poder abrir snapshots
   * SQLite escritos por versiones anteriores sin fingir datos ausentes.
   */
  openSpecChanges?: OpenSpecChangeEvidence[];
  openSpecArchivedChanges?: OpenSpecArchivedChangeEvidence[];
  openSpecSpecifications?: OpenSpecSpecificationEvidence[];
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
export * from './projection';
