import { describe, expect, it } from 'vitest';
import {
  isOpenSpecConfigurableTool,
  isOpenSpecSkillEntry,
  OPENSPEC_TOOL_DIRECTORIES,
  resolveToolStates,
  type ToolPresence,
} from '../pipeline/openspec-tooling';

/**
 * Qué herramientas usa un repositorio y cuáles tienen OpenSpec configurado.
 *
 * El estado que esto existe para mostrar es «presente pero sin configurar»: la
 * herramienta se usa en el repositorio y su ejecutor no sabe que el canal de
 * instrucciones existe. Pasó con Antigravity en `odontoPau`.
 */

function presence(entries: Record<string, ToolPresence>): Map<string, ToolPresence> {
  return new Map(Object.entries(entries));
}

describe('herramientas con OpenSpec configurado', () => {
  it('lista sólo las herramientas presentes en el repositorio', () => {
    const result = resolveToolStates(presence({
      codex: { present: true, configured: true },
      claude: { present: false, configured: false },
    }));
    expect(result.map((tool) => tool.toolId)).toEqual(['codex']);
  });

  it('marca como no configurada la que está presente y no tiene skills', () => {
    // En OpenSpec 1.13, tanto Codex como Antigravity usan .agents como directorio de skills.
    const result = resolveToolStates(presence({
      codex: { present: true, configured: true },
      antigravity: { present: true, configured: false },
    }));
    expect(result).toEqual([
      { toolId: 'codex', label: 'Codex', directory: '.codex', configured: true },
      { toolId: 'antigravity', label: 'Antigravity', directory: '.agent', configured: false },
    ]);
  });

  it('una herramienta desconocida no se reporta como faltante', () => {
    // No reconocerla deja el panel como estaba; reportarla sería afirmar algo
    // que no se sabe.
    const result = resolveToolStates(presence({
      'una-herramienta-nueva': { present: true, configured: false },
    }));
    expect(result).toEqual([]);
  });

  it('sin ninguna herramienta presente no devuelve nada', () => {
    expect(resolveToolStates(presence({}))).toEqual([]);
  });

  it('reconoce una skill de OpenSpec por su prefijo', () => {
    expect(isOpenSpecSkillEntry('openspec-propose')).toBe(true);
    expect(isOpenSpecSkillEntry('openspec-archive-change')).toBe(true);
    // Una skill del usuario en el mismo directorio no cuenta como configuración.
    expect(isOpenSpecSkillEntry('mi-skill-propia')).toBe(false);
    expect(isOpenSpecSkillEntry('')).toBe(false);
  });

  it('cada herramienta conocida tiene identificador único y no incluye github', () => {
    const ids = OPENSPEC_TOOL_DIRECTORIES.map((tool) => tool.toolId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('github');
    expect(ids.length).toBe(20);
  });

  it('isOpenSpecConfigurableTool reconoce herramientas configurables y rechaza vacías o github', () => {
    // Las herramientas de agentes son configurables
    expect(isOpenSpecConfigurableTool('agents')).toBe(true);
    expect(isOpenSpecConfigurableTool('codex')).toBe(true);
    expect(isOpenSpecConfigurableTool('claude')).toBe(true);
    expect(isOpenSpecConfigurableTool('antigravity')).toBe(true);

    // .github no es una herramienta configurable de OpenSpec
    expect(isOpenSpecConfigurableTool('github')).toBe(false);

    // Inválidos
    expect(isOpenSpecConfigurableTool(null)).toBe(false);
    expect(isOpenSpecConfigurableTool(undefined)).toBe(false);
    expect(isOpenSpecConfigurableTool('')).toBe(false);

    // Herramientas personalizadas
    expect(isOpenSpecConfigurableTool('custom-tool')).toBe(true);
  });
});
