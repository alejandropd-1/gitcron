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

/**
 * Momento de un hito de un cambio, con la fuente de la que salió.
 *
 * `commit` es la fecha del commit que lo produjo; `disk` es la fecha de creación
 * del directorio, y sólo aparece mientras el cambio no esté confirmado.
 *
 * La fuente viaja con el dato en vez de deducirse porque las dos afirman cosas
 * distintas y quien lee tiene que poder distinguirlas: la de Git es reproducible
 * en cualquier clon, la del disco se pierde al archivar y al clonar. Además el
 * paso de una a otra es información: significa que el trabajo se confirmó.
 */
export interface ChangeTimestamp {
  at: string;
  source: 'commit' | 'disk';
}

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
  /**
   * Grafo de artefactos con estados `blocked` / `ready` / `done`, leído del
   * CLI. Opcional para no romper snapshots viejos; `null` para los cambios no
   * seleccionados, porque la lectura cuesta y ningún consumidor la mira en
   * ellos (mismo criterio que `artifacts` y `validation`).
   */
  status?: OpenSpecChangeStatus | null;
  /**
   * Cuándo se creó el cambio. Opcional para no romper snapshots viejos; `null`
   * cuando no se pudo determinar ni por Git ni por disco.
   */
  createdAt?: ChangeTimestamp | null;
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

/**
 * Estado de un artefacto dentro del grafo de dependencias de OpenSpec.
 *
 * `state` es el estado del nodo, no del change: `blocked` cuando le faltan
 * dependencias, `ready` cuando sus dependencias están `done`, y `done` cuando
 * el archivo existe en disco. Es el grafo real que el CLI devuelve, no una
 * derivación propia.
 */
export type OpenSpecArtifactState = 'blocked' | 'ready' | 'done';

export interface OpenSpecArtifactStatus {
  id: string;
  state: OpenSpecArtifactState;
  /** Artefactos de los que depende y que todavía no están `done`. */
  missingDeps: string[];
}

/**
 * Grafo de artefactos de un change, leído del CLI (`openspec status`).
 *
 * `available` distingue "el CLI no pudo ejecutarse" de "el grafo está vacío":
 * no poder leer el estado real no es lo mismo que saber que no hay nada. En
 * ese caso `artifacts` va vacío y `isComplete` en `false`, y el consumidor
 * sabe que no hay grafo para mostrar en vez de leerlo como "todo listo".
 */
export interface OpenSpecChangeStatus {
  available: boolean;
  artifacts: OpenSpecArtifactStatus[];
  /** Artefactos que `apply` exige que estén `done`. */
  applyRequires: string[];
  isComplete: boolean;
}

export interface OpenSpecArchivedChangeEvidence {
  changeId: string;
  /**
   * Fecha del nombre de la carpeta, `YYYY-MM-DD` y sin hora. Ordena la lista de
   * archivados, así que no se reemplaza por la marca con hora: son dos datos con
   * usos distintos.
   */
  archivedAt: string | null;
  sourceRef: string;
  /** Cuándo se creó el cambio, alcanzable aunque hoy esté archivado. */
  createdAt?: ChangeTimestamp | null;
  /** Cuándo se archivó, con hora. Distinto de `archivedAt`, que sólo trae el día. */
  archivedOn?: ChangeTimestamp | null;
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
