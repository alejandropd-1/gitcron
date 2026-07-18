'use client';

// History & conflict actions: revert, reset, amend, cherry-pick, squash y
// resolución de conflictos. Sub-hook de useGitActions — no usar directo.

import { useGitStore } from '@/lib/git-store';
import { useRepoLoader } from '../use-repo-loader';
import { tNow as t } from '../use-translation';
import type { GitResult, RebaseCommitInfo, RebasePlanItem } from '@/types/electron';
import { setRepoLoading } from './repo-loading';

export const useHistoryActions = () => {
  const {
    repoPath,
    setError,
    setSuccess,
  } = useGitStore();

  const { refreshLog, refreshStatus, refreshBranches, refreshStashes } = useRepoLoader();
  const setLoading = (isLoading: boolean) => setRepoLoading(repoPath, isLoading);

  const runCommand = async (args: string[]) => {
    setLoading(true);
    setError(null);
    try {
      if (!repoPath) return { success: false, error: 'no repo' };
      if (!window.api) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { success: true };
      }
      return await window.api.gitCommand(repoPath, args);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const revertCommit = async (hash: string) => {
    const result = await runCommand(['revert', '--no-edit', hash]);
    if (result.success) { await refreshLog(); await refreshStatus(); }
    else setError(`Error al revertir el commit ${hash}: ${result.error}`);
    return result;
  };

  const resetToCommit = async (hash: string, mode: 'soft' | 'mixed' | 'hard') => {
    if (!window.api || !repoPath) return { success: false, error: 'No repo' };
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitResetCommit(repoPath, hash, mode);
      if (result.success) {
        setSuccess(t('success.resetCommit', { hash: hash.slice(0, 7) }));
        await refreshLog();
        await refreshStatus();
        await refreshBranches();
        await refreshStashes();
      } else {
        setError(t('error.resetCommit', { error: result.error ?? 'Unknown error' }));
      }
      return result;
    } catch (err: any) {
      const msg = err.message || 'Unknown error';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Amend the last commit. If `newMessage` is provided, replaces the commit
   * message; otherwise the existing message is kept (`--no-edit`). Any staged
   * changes at the time of the call are folded into the amended commit.
   */
  const amendLastCommit = async (newMessage?: string) => {
    if (!window.api || !repoPath) return { success: false as const };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitAmend(repoPath, newMessage);
      if (r.success) {
        setSuccess(t('success.amend'));
        // After amend, the working tree may have lost its staged changes
        // (they were folded into the commit). Refresh everything.
        await refreshLog(); await refreshStatus(); await refreshBranches();
        return { success: true as const, data: r.data };
      }
      setError(r.error ?? 'No se pudo enmendar el commit');
      return { success: false as const, error: r.error };
    } finally { setLoading(false); }
  };

  /** Squash the last N local commits into one with a new message. */
  const squashCommits = async (n: number, message: string): Promise<{ success: boolean; error?: string }> => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitSquash(repoPath, n, message);
      if (r.success) {
        setSuccess(t('success.squash', { n: String(n) }));
        await refreshLog(); await refreshStatus(); await refreshBranches();
        return { success: true };
      }
      setError(r.error ?? 'No se pudo hacer squash');
      return { success: false, error: r.error };
    } finally { setLoading(false); }
  };

  /**
   * Cherry-pick a single commit (by full or short hash) onto the current
   * branch. On conflict, the working tree is left in the cherry-pick state
   * and the user must resolve manually + run `git cherry-pick --continue`
   * or `--abort` from the terminal.
   */
  const cherryPickCommit = async (hash: string, shortHash?: string): Promise<{ success: boolean; conflict?: boolean; error?: string }> => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitCherryPick(repoPath, hash);
      if (r.success) {
        setSuccess(t('success.cherryPick', { hash: shortHash ?? hash.slice(0, 7) }));
        await refreshLog(); await refreshStatus(); await refreshBranches();
        return { success: true };
      }
      const conflict = (r.data as any)?.conflict;
      setError(conflict
        ? `Conflictos al hacer cherry-pick. Resolvé los archivos y usá "git cherry-pick --continue" en terminal.`
        : (r.error ?? 'Error al hacer cherry-pick'));
      if (conflict) await refreshStatus();
      return { success: false, conflict, error: r.error };
    } finally { setLoading(false); }
  };

  const resolveConflict = async (filePath: string, strategy: 'ours' | 'theirs') => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const checkoutArgs = ['checkout', `--${strategy}`, filePath];
      const rCheckout = await window.api.gitCommand(repoPath, checkoutArgs);
      if (!rCheckout.success) {
        setError(rCheckout.error ?? 'Error al aplicar resolución');
        return { success: false, error: rCheckout.error };
      }
      const rStage = await window.api.gitStage(repoPath, filePath);
      if (!rStage.success) {
        setError(rStage.error ?? 'Error al stagear resolución');
        return { success: false, error: rStage.error };
      }
      setSuccess(`Conflicto en "${filePath}" resuelto usando versión ${strategy === 'ours' ? 'local' : 'remota'}`);
      await refreshStatus();
      await refreshLog();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const loadConflictFile = async (filePath: string) => {
    if (!window.api || !repoPath) return { success: false as const, content: '', error: 'no api' };
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitReadFile(repoPath, filePath);
      if (result.success && typeof result.data === 'string') {
        return { success: true as const, content: result.data };
      }
      setError(result.error ?? 'Error al leer archivo conflictuado');
      return { success: false as const, content: '', error: result.error };
    } catch (err: any) {
      setError(err.message);
      return { success: false as const, content: '', error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const resolveConflictContent = async (filePath: string, content: string) => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitResolveConflictFile(repoPath, filePath, content);
      if (!result.success) {
        setError(result.error ?? 'Error al guardar resolución');
        return { success: false, error: result.error };
      }
      setSuccess(`Conflicto en "${filePath}" resuelto y preparado para commit`);
      await refreshStatus();
      await refreshLog();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const prepareInteractiveRebase = async (commitHash: string): Promise<GitResult<RebaseCommitInfo[]>> => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitRebasePrepare(repoPath, commitHash);
      return r;
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al preparar rebase' };
    } finally {
      setLoading(false);
    }
  };

  const startInteractiveRebase = async (baseHash: string, plan: RebasePlanItem[]): Promise<GitResult<{ success: boolean; conflict?: boolean }>> => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitRebaseStart(repoPath, baseHash, plan);
      if (r.success) {
        setSuccess('Rebase completado con éxito');
        await refreshLog();
        await refreshStatus();
        await refreshBranches();
      } else if (r.data?.conflict) {
        setError('Rebase detenido por conflictos. Resolvé los conflictos y continuá.');
        await refreshStatus();
      } else {
        setError(r.error ?? 'Error al iniciar rebase');
      }
      return r;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar rebase');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const continueInteractiveRebase = async (): Promise<GitResult<{ success: boolean; conflict?: boolean }>> => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitRebaseContinue(repoPath);
      if (r.success) {
        setSuccess('Rebase continuado con éxito');
        await refreshLog();
        await refreshStatus();
        await refreshBranches();
      } else if (r.data?.conflict) {
        setError('Rebase detenido por conflictos. Resolvé los conflictos y continuá.');
        await refreshStatus();
      } else {
        setError(r.error ?? 'Error al continuar rebase');
      }
      return r;
    } catch (err: any) {
      setError(err.message || 'Error al continuar rebase');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const abortInteractiveRebase = async (): Promise<GitResult> => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitRebaseAbort(repoPath);
      if (r.success) {
        setSuccess('Rebase abortado con éxito');
        await refreshLog();
        await refreshStatus();
        await refreshBranches();
      } else {
        setError(r.error ?? 'Error al abortar rebase');
      }
      return r;
    } catch (err: any) {
      setError(err.message || 'Error al abortar rebase');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const undoInteractiveRebase = async (targetRef: string): Promise<GitResult> => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitRebaseUndo(repoPath, targetRef);
      if (r.success) {
        setSuccess('Rebase deshecho con éxito');
        await refreshLog();
        await refreshStatus();
        await refreshBranches();
      } else {
        setError(r.error ?? 'Error al deshacer rebase');
      }
      return r;
    } catch (err: any) {
      setError(err.message || 'Error al deshacer rebase');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    revertCommit,
    resetToCommit,
    amendLastCommit,
    squashCommits,
    cherryPickCommit,
    resolveConflict,
    loadConflictFile,
    resolveConflictContent,
    prepareInteractiveRebase,
    startInteractiveRebase,
    continueInteractiveRebase,
    abortInteractiveRebase,
    undoInteractiveRebase,
  };
};
