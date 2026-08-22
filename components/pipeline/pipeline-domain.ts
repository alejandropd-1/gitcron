import type { PipelineDataProvenance, PipelineEvidenceStatus } from '@/types/pipeline';


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

/* ─────────── TANDA 3: agentes, actividad y economía ─────────── */

/**
 * Nombres de presentación de los runtimes.
 *
 * La identidad viaja como id en minúscula (`claude`, `lmstudio`), pero mostrar
 * "claude está corrigiendo" lee mal. Un runtime desconocido devuelve su propio
 * id en vez de un placeholder: es más honesto mostrar el identificador crudo
 * que inventarle un nombre comercial.
 */
const RUNTIME_DISPLAY_NAMES: Record<string, string> = {
  claude: 'Claude',
  codex: 'Codex',
  opencode: 'OpenCode',
  agy: 'Antigravity',
  lmstudio: 'LM Studio',
  hermes: 'Hermes',
};

export function runtimeDisplayName(runtime: string | null): string | null {
  if (!runtime) return null;
  return RUNTIME_DISPLAY_NAMES[runtime] ?? runtime;
}

export type AgentNode = {
  agentId: string;
  parentAgentId: string | null;
  runtime: string | null;
  provider: string | null;
  model: string | null;
  role: string | null;
  state: 'running' | 'done' | 'failed' | 'unknown';
  elapsedMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type AgentTreeNode = AgentNode & { children: AgentTreeNode[] };

/**
 * Arma el árbol parent/child a partir de la lista plana.
 *
 * Los huérfanos —cuyo padre no está en la lista— se promueven a raíz en vez de
 * desaparecer. Perder un agente de la vista sería peor que mostrarlo sin su
 * jerarquía, y un ciclo no puede colgar el render.
 */
export function buildAgentTree(nodes: AgentNode[]): AgentTreeNode[] {
  const byId = new Map<string, AgentTreeNode>();
  for (const node of nodes) byId.set(node.agentId, { ...node, children: [] });

  const roots: AgentTreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentAgentId ? byId.get(node.parentAgentId) : undefined;
    if (parent && parent.agentId !== node.agentId) parent.children.push(node);
    else roots.push(node);
  }

  // Un ciclo dejaría nodos fuera de `roots` y desaparecerían de la vista.
  const reachable = new Set<string>();
  const walk = (list: AgentTreeNode[]) => {
    for (const node of list) {
      if (reachable.has(node.agentId)) continue;
      reachable.add(node.agentId);
      walk(node.children);
    }
  };
  walk(roots);
  for (const node of byId.values()) {
    if (!reachable.has(node.agentId)) roots.push(node);
  }
  return roots;
}

export type ActivityChannel = 'narrative' | 'reasoning' | 'tool' | 'file' | 'system';

export type ActivityEntry = {
  entryId: string;
  channel: ActivityChannel;
  /** Texto sanitizado ya listo para mostrar. Nunca se interpreta como HTML. */
  text: string;
  at: string | null;
  agentId: string | null;
};

export type ActivityGroup = {
  key: string;
  channel: ActivityChannel;
  text: string;
  at: string | null;
  agentId: string | null;
  /** >1 cuando se colapsaron deltas consecutivos del mismo canal y agente. */
  count: number;
};

/**
 * Agrupa deltas consecutivos del mismo canal y agente.
 *
 * Sin esto, un stream de reasoning renderiza un nodo por token y la vista se
 * vuelve inusable. Se colapsa sólo lo *consecutivo*: dos ráfagas separadas por
 * otro canal siguen siendo dos entradas, porque el orden es información.
 */
export function groupActivity(entries: ActivityEntry[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    const collapsible = entry.channel === 'reasoning' || entry.channel === 'tool';
    if (last && collapsible && last.channel === entry.channel && last.agentId === entry.agentId) {
      last.count += 1;
      last.text = entry.text;
      last.at = entry.at ?? last.at;
      continue;
    }
    groups.push({
      key: entry.entryId,
      channel: entry.channel,
      text: entry.text,
      at: entry.at,
      agentId: entry.agentId,
      count: 1,
    });
  }
  return groups;
}

export type TokenTotals = {
  input: number | null;
  output: number | null;
  reasoning: number | null;
  cacheRead: number | null;
};

export type EconomyState = {
  tokens: TokenTotals;
  costUsd: number | null;
  costBasis: 'runtime_reported' | 'estimated' | 'included_plan' | 'local_unpriced' | 'unknown';
  /** Cuántos agentes de la corrida aportaron costo en USD, sobre el total. */
  costCoverage: { withCost: number; total: number };
  contextMaxTokens: number | null;
  contextCurrentTokens: number | null;
  compactionCount: number | null;
  /**
   * `true` el runtime lo emite · `false` el runtime declara que no lo expone ·
   * `null` todavía no lo sabemos.
   *
   * El tercer estado no es un lujo: sin sesión de runtime adjunta no hay
   * evidencia de ninguna de las dos cosas, y devolver `false` haría que la UI
   * afirmara "este runtime no expone su razonamiento" sin que ningún runtime lo
   * haya dicho. Es exactamente el mismo error que `unknown` valiendo `0`.
   */
  reasoningAvailable: boolean | null;
};

/**
 * Decide si la vista monetaria es representativa.
 *
 * El brief lo pide explícito: con cobertura parcial no se dibuja un ranking ni
 * una torta en dólares, porque compararía agentes medidos contra agentes sin
 * medir y el gráfico mentiría. En ese caso se muestran tokens y la cobertura.
 */
export function hasUsableCostCoverage(economy: EconomyState): boolean {
  const { withCost, total } = economy.costCoverage;
  if (total <= 0 || withCost <= 0) return false;
  return withCost === total;
}

export type PipelineDiffItem = {
  filePath: string;
  diffContent: string;
  agentId?: string | null;
  taskId?: string | null;
};

export const SESSION_STATUS_KEYS = [
  'running',
  'completed',
  'failed',
  'interrupted',
  'unknown',
  'latest',
  'none',
  'idle',
] as const;

export type SessionStatusKey = typeof SESSION_STATUS_KEYS[number];

export const SESSION_STATUS_I18N_MAP: Record<SessionStatusKey, string> = {
  running: 'pipeline.openspec.activity.status.running',
  completed: 'pipeline.openspec.activity.status.completed',
  failed: 'pipeline.openspec.activity.status.failed',
  interrupted: 'pipeline.openspec.activity.status.interrupted',
  unknown: 'pipeline.openspec.activity.status.unknown',
  latest: 'pipeline.openspec.activity.status.latest',
  none: 'pipeline.openspec.activity.status.none',
  idle: 'pipeline.openspec.activity.status.idle',
};

export function resolveSessionStatusI18nKey(status: string | null | undefined): string {
  if (!status) return 'pipeline.openspec.activity.status.none';
  return (SESSION_STATUS_I18N_MAP as Record<string, string>)[status] ?? 'pipeline.openspec.activity.status.unknown';
}
