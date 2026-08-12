// @vitest-environment jsdom
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGitStore } from '@/lib/git-store';
import { useBranchActions } from '../git-actions/branches';

/**
 * Soltar el worktree y borrar la rama, en ese orden y sin atajos.
 *
 * El caso viene de Ale: no podía borrar `claude/cool-driscoll-aa09d4` porque un
 * worktree la tenía abierta, y GitCron le volcaba el error crudo de Git sin
 * ofrecer salida. La acción resuelve eso, pero soltar un worktree **borra una
 * copia de trabajo entera**: si tenía cambios sin confirmar, se pierden.
 *
 * Lo que estas pruebas protegen es la secuencia. Si el borrado de la rama
 * ocurriera igual cuando el worktree no se pudo soltar, quedaría un directorio
 * apuntando a una rama inexistente; y si `HAS_CHANGES` no se reportara, la
 * interfaz no tendría con qué pedir la segunda confirmación y se perderían
 * cambios en silencio.
 *
 * `useRepoLoader` se mockea entero: `useBranchActions` lo usa sólo para
 * refrescar después de actuar, y montarlo de verdad arrastraría observadores de
 * filesystem y temporizadores que no tienen nada que ver con lo que se prueba.
 */
vi.mock('../use-repo-loader', () => ({
  useRepoLoader: () => ({
    refreshLog: vi.fn(),
    refreshStatus: vi.fn(),
    refreshBranches: vi.fn(),
    refreshTags: vi.fn(),
    refreshWorktrees: vi.fn(),
  }),
}));

type Accion = (
  branch: string,
  worktreePath: string,
  opts?: { force?: boolean },
) => Promise<{ success: boolean; hasChanges?: boolean; notMerged?: boolean; error?: string }>;

function montarAccion(): Accion {
  let capturada: Accion | null = null;
  function Sonda() {
    capturada = useBranchActions().deleteBranchAndWorktree as Accion;
    return null;
  }
  render(createElement(Sonda));
  if (!capturada) throw new Error('No se pudo capturar la acción');
  return capturada;
}

const gitWorktreeRemove = vi.fn();
const gitDeleteBranch = vi.fn();

describe('soltar el worktree y borrar la rama', () => {
  beforeEach(() => {
    gitWorktreeRemove.mockReset();
    gitDeleteBranch.mockReset();
    (window as unknown as { api: unknown }).api = { gitWorktreeRemove, gitDeleteBranch };
    useGitStore.setState({ repoPath: 'C:/repo' });
  });

  it('suelta primero y recién entonces borra la rama', async () => {
    gitWorktreeRemove.mockResolvedValue({ success: true });
    gitDeleteBranch.mockResolvedValue({ success: true });

    const resultado = await montarAccion()('claude/cool-driscoll', 'C:/repo/.claude/worktrees/x');

    expect(resultado.success).toBe(true);
    expect(gitWorktreeRemove).toHaveBeenCalledWith('C:/repo', 'C:/repo/.claude/worktrees/x', false);
    expect(gitDeleteBranch).toHaveBeenCalledWith('C:/repo', 'claude/cool-driscoll', false);
  });

  it('si el worktree tiene cambios sin confirmar, NO borra la rama y lo reporta', async () => {
    gitWorktreeRemove.mockResolvedValue({ success: false, error: 'HAS_CHANGES' });

    const resultado = await montarAccion()('claude/cool-driscoll', 'C:/repo/.claude/worktrees/x');

    // Lo que se reporta es lo que permite pedir la segunda confirmación: sin
    // esto, la interfaz no tendría cómo advertir qué se va a perder.
    expect(resultado.hasChanges).toBe(true);
    expect(resultado.success).toBe(false);
    // Y la rama sigue: soltar falló, así que borrarla dejaría el directorio
    // apuntando a una rama que ya no existe.
    expect(gitDeleteBranch).not.toHaveBeenCalled();
  });

  it('con `force` confirmado, pasa el forzado al soltar', async () => {
    gitWorktreeRemove.mockResolvedValue({ success: true });
    gitDeleteBranch.mockResolvedValue({ success: true });

    await montarAccion()('claude/x', 'C:/repo/wt', { force: true });

    expect(gitWorktreeRemove).toHaveBeenCalledWith('C:/repo', 'C:/repo/wt', true);
  });
});
