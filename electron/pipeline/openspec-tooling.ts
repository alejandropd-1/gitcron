/**
 * Qué herramientas usa un repositorio y cuáles tienen OpenSpec configurado.
 *
 * Existe porque un repositorio puede estar correctamente inicializado y aun así
 * dejar a un ejecutor trabajando a ciegas. En `C:\www\odontoPau` convivían
 * `.codex/skills/openspec-*` y ningún `.agent/`, que es donde van los de
 * Antigravity: Codex recibía el método y Antigravity no. Nadie lo vio hasta que
 * un artefacto salió mal, y diagnosticarlo exigió comparar directorios a mano.
 *
 * Las skills son lo que enseña el canal. La de `openspec-propose` dice «Follow
 * the `instruction` field from `openspec instructions`» y que `context` y
 * `rules` son restricciones para el ejecutor. Sin ese archivo, un agente no sabe
 * que tiene que pedir instrucciones: el canal está lleno y nadie lo abre.
 */

/**
 * Directorios por herramienta, según la documentación de OpenSpec.
 *
 * La lista vive acá y no se lee del CLI porque no hay comando que la informe:
 * `openspec init` la conoce, pero la aplica configurando, y correrlo para
 * averiguar el estado escribiría archivos.
 *
 * Que envejezca es aceptable y su modo de fallar es benigno: una herramienta que
 * no está en la lista simplemente no se muestra, y el panel queda como estaba. No
 * se la reporta como faltante, que sería afirmar algo falso.
 */
export const OPENSPEC_TOOL_DIRECTORIES: ReadonlyArray<{ toolId: string; directory: string; label: string }> = [
  { toolId: 'claude', directory: '.claude', label: 'Claude Code' },
  { toolId: 'codex', directory: '.codex', label: 'Codex' },
  { toolId: 'antigravity', directory: '.agent', label: 'Antigravity' },
  { toolId: 'opencode', directory: '.opencode', label: 'OpenCode' },
  { toolId: 'cursor', directory: '.cursor', label: 'Cursor' },
  { toolId: 'gemini', directory: '.gemini', label: 'Gemini CLI' },
  { toolId: 'github-copilot', directory: '.github', label: 'GitHub Copilot' },
  { toolId: 'amazon-q', directory: '.amazonq', label: 'Amazon Q' },
  { toolId: 'auggie', directory: '.augment', label: 'Auggie' },
  { toolId: 'cline', directory: '.cline', label: 'Cline' },
  { toolId: 'crush', directory: '.crush', label: 'Crush' },
  { toolId: 'junie', directory: '.junie', label: 'Junie' },
  { toolId: 'kilocode', directory: '.kilocode', label: 'Kilo Code' },
  { toolId: 'kiro', directory: '.kiro', label: 'Kiro' },
  { toolId: 'qwen', directory: '.qwen', label: 'Qwen Code' },
  { toolId: 'roocode', directory: '.roo', label: 'Roo Code' },
  { toolId: 'trae', directory: '.trae', label: 'Trae' },
  { toolId: 'windsurf', directory: '.windsurf', label: 'Windsurf' },
];

/** Una skill de OpenSpec vive en `<dir>/skills/openspec-<algo>/SKILL.md`. */
export function isOpenSpecSkillEntry(entry: string): boolean {
  return entry.startsWith('openspec-');
}

export type ToolPresence = {
  /** El directorio de la herramienta existe en el repositorio. */
  present: boolean;
  /** Tiene al menos una skill de OpenSpec instalada. */
  configured: boolean;
};

/**
 * Resuelve el estado de cada herramienta a partir de lo que hay en disco.
 *
 * Recibe la lectura ya hecha para poder probarse con tablas: qué directorios
 * existen y qué contiene la carpeta `skills` de cada uno.
 */
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
