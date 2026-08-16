/**
 * Herramientas y targets reconocidos por GitCron para OpenSpec 1.8.
 *
 * Fuente única de verdad para la tabla de herramientas, directorios, clases de outputs,
 * conjuntos oficiales de workflows y bloqueo de seguridad.
 */

export const OPENSPEC_CORE_WORKFLOW_SET = new Set([
  'propose',
  'explore',
  'apply',
  'update',
  'sync',
  'archive',
]);

export const OPENSPEC_EXPANDED_WORKFLOW_SET = new Set([
  'propose',
  'explore',
  'apply',
  'update',
  'sync',
  'archive',
  'new',
  'continue',
  'ff',
  'verify',
  'bulk-archive',
  'onboard',
]);

/**
 * Mapeo canónico exacto de nombres de artefactos/skills oficiales a sus nombres de workflow.
 * Ningún skill fuera de este mapeo es considerado oficial (ej. `openspec-mi-flujo` no lo es).
 */
export const OFFICIAL_WORKFLOW_MAP: Readonly<Record<string, string>> = {
  'openspec-propose': 'propose',
  'openspec-explore': 'explore',
  'openspec-apply-change': 'apply',
  'openspec-apply': 'apply',
  'openspec-update-plan': 'update',
  'openspec-update': 'update',
  'openspec-sync-specs': 'sync',
  'openspec-sync': 'sync',
  'openspec-archive-change': 'archive',
  'openspec-archive': 'archive',
  'openspec-new-change': 'new',
  'openspec-new': 'new',
  'openspec-continue-change': 'continue',
  'openspec-continue': 'continue',
  'openspec-ff-change': 'ff',
  'openspec-ff': 'ff',
  'openspec-verify-change': 'verify',
  'openspec-verify': 'verify',
  'openspec-bulk-archive': 'bulk-archive',
  'openspec-onboard': 'onboard',
};

export const OFFICIAL_OPENSPEC_SKILL_SLUGS = new Set(Object.keys(OFFICIAL_WORKFLOW_MAP));

export type OpenSpecToolCategory = 'interactive-agent' | 'ci' | 'global-agent';

export interface OpenSpecToolDef {
  toolId: string;
  directory: string;
  label: string;
  kind: 'repo-local' | 'external-global';
  category: OpenSpecToolCategory;
  isInteractiveAgent: boolean;
  displayPath: string;
  blocked: boolean;
  descriptionKey: string;
}

export const OPENSPEC_TOOL_DIRECTORIES: ReadonlyArray<OpenSpecToolDef> = [
  { toolId: 'agents', directory: '.agents', label: 'Agents Multi-Agent', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.agents/skills/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.agentsDesc' },
  { toolId: 'codex', directory: '.codex', label: 'Codex', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.codex/skills/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.codexDesc' },
  { toolId: 'claude', directory: '.claude', label: 'Claude Code', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.claude/skills/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.claudeDesc' },
  { toolId: 'antigravity', directory: '.agent', label: 'Antigravity', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.agent/skills/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.antigravityDesc' },
  { toolId: 'opencode', directory: '.opencode', label: 'OpenCode', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.opencode/skills/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.opencodeDesc' },
  { toolId: 'github', directory: '.github', label: 'GitHub Workflows', kind: 'repo-local', category: 'ci', isInteractiveAgent: false, displayPath: '.github/workflows/openspec-*.yml', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.githubDesc' },
  { toolId: 'minimax-code', directory: '.minimax', label: 'MiniMax Code', kind: 'external-global', category: 'global-agent', isInteractiveAgent: false, displayPath: '~/.minimax/skills/openspec-*', blocked: true, descriptionKey: 'pipeline.openspec.engine.output.minimaxDesc' },
  { toolId: 'cursor', directory: '.cursor', label: 'Cursor', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.cursor/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.cursorDesc' },
  { toolId: 'gemini', directory: '.gemini', label: 'Gemini CLI', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.gemini/skills/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.geminiDesc' },
  { toolId: 'github-copilot', directory: '.github-copilot', label: 'GitHub Copilot', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.github-copilot/prompts/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.copilotDesc' },
  { toolId: 'amazon-q', directory: '.amazonq', label: 'Amazon Q', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.amazonq/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.amazonqDesc' },
  { toolId: 'auggie', directory: '.augment', label: 'Auggie', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.augment/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.auggieDesc' },
  { toolId: 'cline', directory: '.cline', label: 'Cline', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.cline/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.clineDesc' },
  { toolId: 'crush', directory: '.crush', label: 'Crush', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.crush/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.crushDesc' },
  { toolId: 'junie', directory: '.junie', label: 'Junie', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.junie/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.junieDesc' },
  { toolId: 'kilocode', directory: '.kilocode', label: 'Kilo Code', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.kilocode/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.kilocodeDesc' },
  { toolId: 'kiro', directory: '.kiro', label: 'Kiro', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.kiro/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.kiroDesc' },
  { toolId: 'qwen', directory: '.qwen', label: 'Qwen Code', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.qwen/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.qwenDesc' },
  { toolId: 'roocode', directory: '.roo', label: 'Roo Code', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.roo/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.roocodeDesc' },
  { toolId: 'trae', directory: '.trae', label: 'Trae', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.trae/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.traeDesc' },
  { toolId: 'windsurf', directory: '.windsurf', label: 'Windsurf', kind: 'repo-local', category: 'interactive-agent', isInteractiveAgent: true, displayPath: '.windsurf/rules/openspec-*', blocked: false, descriptionKey: 'pipeline.openspec.engine.output.windsurfDesc' },
];

export function getToolDef(toolId: string): OpenSpecToolDef | undefined {
  return OPENSPEC_TOOL_DIRECTORIES.find((t) => t.toolId === toolId);
}

/** Comprueba si una entrada corresponde a una skill oficial o declarada de OpenSpec. */
export function isOpenSpecSkillEntry(entry: string): boolean {
  return OFFICIAL_OPENSPEC_SKILL_SLUGS.has(entry);
}

export type ToolPresence = {
  present: boolean;
  configured: boolean;
};

export function resolveToolStates(
  presence: ReadonlyMap<string, ToolPresence>,
): Array<{ toolId: string; label: string; directory: string; configured: boolean }> {
  return OPENSPEC_TOOL_DIRECTORIES
    .filter((tool) => presence.get(tool.toolId)?.present)
    .map((tool) => ({
      toolId: tool.toolId,
      label: tool.label,
      directory: tool.directory,
      configured: presence.get(tool.toolId)?.configured ?? false,
    }));
}
