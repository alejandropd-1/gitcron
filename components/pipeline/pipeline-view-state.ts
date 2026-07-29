/**
 * Contrato de estado del workspace Pipeline (F04).
 *
 * Vive aparte del componente para que la lógica de resolución de estado sea
 * testeable sin montar React y sin tocar el DOM.
 */

import type {
  ActivityEntry,
  AgentNode,
  AuditorFinding,
  ChangeStation,
  DecisionRequest,
  EconomyState,
  GateHistoryEntry,
  NowState,
  PipelineDiffItem,
  PipelineProposal,
} from './pipeline-domain';
import type { OpenSpecValidationStatus, TaskEvidence } from '@/types/pipeline';

export type PipelineSource = 'git' | 'openspec' | 'runtime';

/** Versión de sobre que esta build sabe interpretar (F01/F03). */
export const SUPPORTED_SNAPSHOT_VERSION = '1.0';

export type OpenSpecChangeSummary = {
  changeId: string;
  intent: string | null;
  tasks: TaskEvidence[];
  proposalExists: boolean;
  designExists: boolean;
  specsCount: number;
  validation: OpenSpecValidationStatus;
};

export type OpenSpecWorkspaceSnapshot = {
  selectedChangeId: string | null;
  activeChanges: OpenSpecChangeSummary[];
  archivedChanges: Array<{
    changeId: string;
    archivedAt: string | null;
    sourceRef: string;
  }>;
  specifications: Array<{
    specificationId: string;
    requirements: number | null;
    sourceRef: string;
  }>;
  reports: string[];
  diagnostics: Array<{ code: string; message: string; severity: string; sourceRef: string }>;
  observedAt: string | null;
  latestGate: { result: 'VERDE' | 'ROJO' | 'PENDIENTE'; mode: string; ts: string } | null;
};

export type PipelineSnapshot = {
  schemaVersion: string;
  repoId: string;
  availableSources: PipelineSource[];
  hasPipelineActivity: boolean;
  now: NowState;
  stations: ChangeStation[];
  decisions: DecisionRequest[];
  agents: AgentNode[];
  activity: ActivityEntry[];
  economy: EconomyState;
  proposal?: PipelineProposal | null;
  diffs?: PipelineDiffItem[];
  /** Vista OpenSpec. Opcional para snapshots/fixtures históricos. */
  openSpec?: OpenSpecWorkspaceSnapshot;
};

export type PipelineViewState =
  | { kind: 'loading' }
  | { kind: 'no-repo' }
  | { kind: 'no-pipeline' }
  | { kind: 'incompatible'; foundVersion: string | null }
  | { kind: 'error'; messageKey: string; canRetry: boolean }
  | { kind: 'ready'; snapshot: PipelineSnapshot };

/**
 * Traduce un snapshot crudo al estado que la UI debe mostrar.
 *
 * El orden de las guardas importa y es deliberado:
 *
 * 1. Sin repo no hay nada que resolver.
 * 2. Una versión desconocida gana sobre todo lo demás: si no sabemos leer el
 *    sobre, no podemos afirmar nada sobre su contenido.
 * 3. Sin actividad no es un error, es un repo que todavía no corrió nada.
 * 4. Hermes desconectado y repo sin kit son degradaciones informativas, no
 *    fallas: el resto de la evidencia sigue siendo válida y se muestra.
 */
export function resolvePipelineViewState(input: {
  repoPath: string | null;
  snapshot: PipelineSnapshot | null;
  isLoading: boolean;
  error: { messageKey: string; canRetry: boolean } | null;
}): PipelineViewState {
  if (!input.repoPath) return { kind: 'no-repo' };
  if (input.error) return { kind: 'error', ...input.error };
  if (input.isLoading) return { kind: 'loading' };
  if (!input.snapshot) return { kind: 'no-pipeline' };

  const { snapshot } = input;
  if (snapshot.schemaVersion !== SUPPORTED_SNAPSHOT_VERSION) {
    return { kind: 'incompatible', foundVersion: snapshot.schemaVersion || null };
  }
  if (!snapshot.hasPipelineActivity) return { kind: 'no-pipeline' };
  // Ya no se exige la presencia del kit multi-agente ni una conexión con un
  // orquestador: el workspace se muestra con la evidencia de OpenSpec y Git, y
  // resuelve por sí mismo el caso de no tener ningún cambio activo.
  return { kind: 'ready', snapshot };
}
