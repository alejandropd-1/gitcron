'use client';

// Branch & tag actions: checkout, create/rename/delete, merge, rebase,
// fast-forward y tags. Sub-hook de useGitActions — no usar directo.

import { useGitStore } from '@/lib/git-store';
import { useRepoLoader } from '../use-repo-loader';
import { tNow as t } from '../use-translation';
import { setRepoLoading } from './repo-loading';

export const useBranchActions = () => {
  const {
    repoPath,
    setError,
    setSuccess,
  } = useGitStore();

  const { refreshLog, refreshStatus, refreshBranches, refreshTags } = useRepoLoader();
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

  const mergeBranch = async (branchName: string) => {
    const result = await runCommand(['merge', branchName]);
    if (result.success) {
      setSuccess(t('success.merge', { branch: branchName }));
      await refreshLog(); await refreshStatus(); await refreshBranches();
    }
    else setError(`Conflicto al mergear ${branchName}: ${result.error}`);
    return result;
  };

  /**
   * Checkout a branch. Returns a structured result so callers can detect
   * the "uncommitted changes would be overwritten" conflict and offer
   * stash-and-retry UX.
   */
  const checkoutBranch = async (branch: string): Promise<{
    success: boolean;
    conflict?: boolean;
    error?: string;
  }> => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gitCheckout(repoPath, branch);
      if (result.success) {
        const actualBranch = (result.data as any)?.checkedOut || branch;
        setSuccess(`Cambiaste a la branch "${actualBranch}"`);
        await refreshBranches();
        await refreshLog();
        await refreshStatus();
        return { success: true };
      }
      const errMsg = result.error ?? `Error al hacer checkout de ${branch}`;
      // Detect "uncommitted changes would be overwritten" — main cause of failed checkouts
      const isConflict = /would be overwritten|local changes|please commit|stash/i.test(errMsg);
      if (!isConflict) setError(errMsg);
      return { success: false, conflict: isConflict, error: errMsg };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * "Smart checkout" — like GitKraken's flow.
   *
   *   1. If working tree is clean → just checkout
   *   2. If dirty and checkout would conflict → caller is informed via the
   *      `conflict: true` return value, and can offer to stash first
   *   3. If `stashFirst` is true, we git stash, then checkout, then optionally
   *      pop the stash (left up to caller for safety)
   */
  const checkoutBranchSmart = async (branch: string, opts?: { stashFirst?: boolean }) => {
    if (!window.api || !repoPath) return { success: false as const };

    if (opts?.stashFirst) {
      setLoading(true); setError(null);
      try {
        // Stash includes untracked so nothing is lost
        const stashed = await window.api.gitCommand(repoPath, ['stash', 'push', '--include-untracked', '-m', `GitCron auto-stash before checkout to ${branch}`]);
        if (!stashed.success) {
          setError(stashed.error ?? 'No se pudo stashear antes del checkout');
          return { success: false as const, error: stashed.error };
        }
      } catch (err: any) {
        setError(err.message);
        return { success: false as const };
      } finally { setLoading(false); }
    }

    return await checkoutBranch(branch);
  };

  /**
   * Merge a source branch INTO the current branch.
   * Returns `{ success, conflict }` so callers can react to merge conflicts.
   */
  const mergeIntoCurrent = async (sourceBranch: string): Promise<{ success: boolean; conflict?: boolean; error?: string }> => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitMergeBranch(repoPath, sourceBranch);
      if (r.success) {
        const alreadyUpToDate = (r.data as any)?.alreadyUpToDate;
        setSuccess(alreadyUpToDate
          ? t('success.mergeUpToDate', { branch: sourceBranch })
          : t('success.merge', { branch: sourceBranch }));
        await refreshLog(); await refreshStatus(); await refreshBranches();
        return { success: true };
      }
      const conflict = (r.data as any)?.conflict;
      setError(conflict
        ? `Conflictos al mergear ${sourceBranch}. Resolvé los archivos y commiteá para completar el merge.`
        : (r.error ?? 'Error al mergear'));
      // Even on conflict, refresh status so the user sees the conflicted files
      if (conflict) await refreshStatus();
      return { success: false, conflict, error: r.error };
    } finally { setLoading(false); }
  };

  /** Rebase the current branch onto another. */
  const rebaseOnto = async (ontoBranch: string): Promise<{ success: boolean; conflict?: boolean; error?: string }> => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitRebase(repoPath, ontoBranch);
      if (r.success) {
        setSuccess(`Rebase sobre "${ontoBranch}" completado`);
        await refreshLog(); await refreshStatus(); await refreshBranches();
        return { success: true };
      }
      const conflict = (r.data as any)?.conflict;
      setError(conflict
        ? `Conflictos durante el rebase onto ${ontoBranch}. Resolvé y usá 'git rebase --continue' en terminal.`
        : (r.error ?? 'Error en rebase'));
      return { success: false, conflict, error: r.error };
    } finally { setLoading(false); }
  };

  /** Fast-forward `branch` up to a reference (only if no divergence). */
  const fastForwardBranch = async (branch: string, toRef: string) => {
    if (!window.api || !repoPath) return { success: false as const };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitFastForward(repoPath, branch, toRef);
      if (r.success) {
        setSuccess(t('success.fastForward', { branch }));
        await refreshLog(); await refreshBranches();
        return { success: true as const };
      }
      setError(r.error ?? 'No se pudo hacer fast-forward');
      return { success: false as const, error: r.error };
    } finally { setLoading(false); }
  };

  const renameBranch = async (oldName: string, newName: string) => {
    if (!window.api || !repoPath) return false;
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitRenameBranch(repoPath, oldName, newName);
      if (r.success) {
        await refreshBranches();
        return true;
      }
      setError(r.error ?? 'Error al renombrar');
      return false;
    } finally { setLoading(false); }
  };

  /**
   * Delete a local branch. Returns `{ success, notMerged }`. If `notMerged`
   * is true on a failure, the caller can ask for confirmation and retry with
   * `force=true`.
   */
  const deleteBranch = async (branch: string, force = false): Promise<{ success: boolean; notMerged?: boolean }> => {
    if (!window.api || !repoPath) return { success: false };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitDeleteBranch(repoPath, branch, force);
      if (r.success) {
        await refreshBranches();
        await refreshTags();
        await refreshLog();
        return { success: true };
      }
      const notMerged = (r.data as any)?.notMerged;
      if (!notMerged) setError(r.error ?? 'Error al eliminar branch');
      return { success: false, notMerged };
    } finally { setLoading(false); }
  };

  const deleteTag = async (tagName: string): Promise<{ success: boolean }> => {
    if (!window.api || !repoPath) return { success: false };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitDeleteTag(repoPath, tagName);
      if (r.success) {
        setSuccess(`Tag "${tagName}" eliminado`);
        await refreshTags();
        await refreshLog();
        return { success: true };
      }
      setError(r.error ?? 'Error al eliminar tag');
      return { success: false };
    } finally { setLoading(false); }
  };

  const createTag = async (tagName: string, commitHash: string, message?: string): Promise<{ success: boolean }> => {
    if (!window.api || !repoPath) return { success: false };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitCreateTag(repoPath, tagName, commitHash, message);
      if (r.success) {
        setSuccess(t('success.createTag', { name: tagName }));
        await refreshTags();
        await refreshLog();
        return { success: true };
      }
      setError(r.error ?? 'Error al crear tag');
      return { success: false };
    } finally { setLoading(false); }
  };

  const createBranch = async (name: string, fromHash?: string) => {
    if (!window.api || !repoPath) return;
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitCreateBranch(repoPath, name, fromHash);
      if (result.success) {
        setSuccess(`Branch "${name}" creada`);
        await refreshBranches();
        await refreshLog();
      }
      else setError(result.error ?? `Error al crear la branch ${name}`);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return {
    mergeBranch,
    checkoutBranch,
    checkoutBranchSmart,
    createBranch,
    mergeIntoCurrent,
    rebaseOnto,
    fastForwardBranch,
    renameBranch,
    deleteBranch,
    deleteTag,
    createTag,
  };
};
