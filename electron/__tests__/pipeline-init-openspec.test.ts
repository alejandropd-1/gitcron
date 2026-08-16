import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initOpenSpec } from '../ipc/pipeline-specs';
import { TOOL_ID_PATTERN } from '../pipeline/openspec-cli';
import { authorizedRepoStore } from '../ipc/authorized-repos';

/**
 * Inicialización de OpenSpec desde el panel.
 *
 * Escribe en el repositorio del usuario, así que lo que llega del renderer se
 * valida antes de tocar el CLI: en Windows corre con shell, y un argumento libre
 * podría llevar separadores de comando.
 */
describe('inicializar OpenSpec', () => {
  const binding = async (repoPath: string) => ({ canonicalPath: repoPath });

  beforeEach(() => {
    vi.spyOn(authorizedRepoStore, 'isAuthorized').mockImplementation((p) => p === 'C:/repo');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rechaza una ruta inválida sin resolver el repositorio', async () => {
    const spy = vi.fn(binding);
    expect(await initOpenSpec('', undefined, spy))
      .toEqual({ success: false, error: 'invalid_repo_path', needsTool: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it('rechaza herramientas que no sean un arreglo de cadenas', async () => {
    const spy = vi.fn(binding);
    for (const tools of ['claude', 42, {}, [1], [null]]) {
      expect(await initOpenSpec('C:/repo', tools, spy))
        .toEqual({ success: false, error: 'invalid_tools', needsTool: false });
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('el alfabeto de herramienta no admite separadores de comando', () => {
    // Es la barrera que hace seguro correr el CLI con shell en Windows.
    expect(TOOL_ID_PATTERN.test('claude')).toBe(true);
    expect(TOOL_ID_PATTERN.test('github-copilot')).toBe(true);
    expect(TOOL_ID_PATTERN.test('amazon-q')).toBe(true);
    for (const candidate of ['claude & rm -rf', 'claude;ls', 'claude|cat', '../x', 'Claude', '', ' claude']) {
      expect(TOOL_ID_PATTERN.test(candidate)).toBe(false);
    }
  });
});
