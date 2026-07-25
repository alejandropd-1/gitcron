import type { PipelineDataProvenance, PipelineEvidenceStatus } from '@/types/pipeline';

/** Estaciones de la vía del change, en orden del método. */
export const CHANGE_STATIONS = [
  'proposal',
  'approval',
  'builder',
  'gates',
  'auditor',
  'fixer',
  'merge',
] as const;

export type ChangeStationId = (typeof CHANGE_STATIONS)[number];

/**
 * `done` ocurrió · `current` está pasando · `possible` todavía no ocurrió ·
 * `rejected` se recorrió y volvió atrás · `skipped` no aplica a este change.
 *
 * `possible` existe para poder dibujar el camino punteado sin afirmar que va a
 * pasar: es un futuro posible, no un plan comprometido.
 */
export type ChangeStationState = 'done' | 'current' | 'possible' | 'rejected' | 'skipped';

export type ChangeStation = {
  id: ChangeStationId;
  state: ChangeStationState;
  /** Verdadero cuando la estación depende de una persona, no de una IA. */
  humanGate: boolean;
  detailKey: string | null;
};

export type DecisionOption = {
  id: string;
  labelKey: string;
  /**
   * Texto sanitizado de la fuente. `null` = consecuencia no informada, y así se
   * muestra: no se completa con imaginación.
   */
  consequence: string | null;
  /** En F04 ninguna opción ejecuta nada; esto describe por qué. */
  availability: 'informational' | 'pending-f05' | 'unsupported';
};

export type DecisionRisk = 'low' | 'medium' | 'high' | 'unknown';

export type DecisionRequest = {
  decisionId: string;
  kind: string;
  /**
   * Texto plano sanitizado, no clave i18n: lo redacta la fuente de la decisión,
   * según el contrato de docs/pipeline/UX-DECISIONES.md. Nunca se usa como HTML
   * ni como clave dinámica.
   */
  title: string;
  why: string | null;
  options: DecisionOption[];
  risk: DecisionRisk;
  riskProvenance: PipelineDataProvenance | null;
  evidenceRefs: string[];
  technicalContext: string | null;
  provenance: PipelineDataProvenance;
  evidenceStatus: PipelineEvidenceStatus;
};

export type NowState = {
  /** Clave de la frase humana: "Codex está auditando". */
  headlineKey: string;
  runtime: string | null;
  role: string | null;
  taskLabel: string | null;
  tasksDone: number | null;
  tasksTotal: number | null;
  elapsedMs: number | null;
  /** `null` cuando el runtime no reportó costo. Nunca se sustituye por 0. */
  costUsd: number | null;
  costBasis: 'runtime_reported' | 'estimated' | 'included_plan' | 'local_unpriced' | 'unknown';
  needsHuman: boolean;
};

/**
 * Ordena las decisiones por necesidad humana, no por el último delta recibido.
 *
 * El brief lo pide explícitamente: el inbox no es un feed. Una decisión de
 * riesgo alto que llegó hace rato importa más que una trivial recién emitida.
 * `unknown` se ordena junto a `medium`: no sabemos que sea inofensiva, así que
 * no puede caer al fondo.
 */
const RISK_WEIGHT: Record<DecisionRisk, number> = {
  high: 0,
  unknown: 1,
  medium: 1,
  low: 2,
};

export function sortDecisionsByHumanNeed(decisions: DecisionRequest[]): DecisionRequest[] {
  return [...decisions].sort((a, b) => {
    const byRisk = RISK_WEIGHT[a.risk] - RISK_WEIGHT[b.risk];
    if (byRisk !== 0) return byRisk;
    // Empate: preservar el orden de llegada en vez de reordenar arbitrariamente.
    return 0;
  });
}

/** Formatea una duración sin librerías: mm:ss o h:mm. */
export function formatElapsed(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
