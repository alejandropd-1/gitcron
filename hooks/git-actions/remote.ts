'use client';

// Remote actions: push / pull / fetch contra origin, con notificaciones del SO
// cuando la operación es lenta o la ventana está en background.
// Sub-hook de useGitActions — no usar directo.

import { useGitStore } from '@/lib/git-store';
import { useRepoLoader } from '../use-repo-loader';
import { tNow as t } from '../use-translation';
import { notify } from '@/lib/os-notify';

export const useRemoteActions = () => {
  const {
    repoPath,
    setLoading,
    setError,
    setSuccess,
    githubToken,
  } = useGitStore();

  const { refreshLog, refreshStatus, refreshBranches, refreshTags } = useRepoLoader();

  const pushTag = async (tagName: string): Promise<{ success: boolean }> => {
    if (!window.api || !repoPath) return { success: false };
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitPushTag(repoPath, tagName, githubToken ?? undefined);
      if (r.success) {
        setSuccess(t('success.pushTag', { name: tagName }));
        await refreshTags();
        return { success: true };
      }
      const isAuth = (r.data as any)?.authRequired;
      setError(isAuth
        ? 'Push fallido: autenticación requerida. Conectá con GitHub en Settings.'
        : `Push fallido: ${r.error}`);
      return { success: false };
    } finally { setLoading(false); }
  };

  const pullSpecificBranch = async (branch: string) => {
    if (!window.api || !repoPath) return;
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitPullBranch(repoPath, branch, githubToken ?? undefined);
      if (r.success) {
        await refreshLog(); await refreshBranches();
      } else {
        const isAuth = (r.data as any)?.authRequired;
        setError(isAuth
          ? 'Pull fallido: autenticación requerida. Conectá con GitHub en Settings.'
          : `Pull fallido: ${r.error}`);
      }
    } finally { setLoading(false); }
  };

  const pushSpecificBranch = async (branch: string) => {
    if (!window.api || !repoPath) return;
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitPushBranch(repoPath, branch, githubToken ?? undefined);
      if (r.success) {
        const wasNewBranch = (r.data as any)?.setUpstream;
        setSuccess(wasNewBranch
          ? `Branch "${branch}" publicada en origin`
          : `Push de "${branch}" exitoso`);
        await refreshLog(); await refreshBranches();
      } else {
        const isAuth = (r.data as any)?.authRequired;
        setError(isAuth
          ? 'Push fallido: autenticación requerida. Conectá con GitHub en Settings.'
          : `Push fallido: ${r.error}`);
      }
    } finally { setLoading(false); }
  };

  const pushChanges = async () => {
    if (!window.api || !repoPath) return;
    const startedAt = Date.now();
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitPush(repoPath, githubToken ?? undefined);
      if (!result.success) {
        const isAuth = result.data?.authRequired;
        const errMsg = isAuth
          ? 'Push fallido: autenticación requerida. Configurá tu token de GitHub en Settings.'
          : `Push fallido: ${result.error}`;
        setError(errMsg);
        // Notify only if window unfocused (don't bother user otherwise)
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          notify('GitCron — Push fallido', { body: errMsg });
        }
      } else {
        const wasNewBranch = (result.data as any)?.setUpstream;
        const msg = wasNewBranch
          ? 'Branch publicada en origin — upstream configurado automáticamente'
          : 'Push exitoso — cambios subidos al remoto';
        setSuccess(msg);
        // Notify when push took > 3s OR the window is not focused
        const elapsed = Date.now() - startedAt;
        const unfocused = typeof document !== 'undefined' && document.visibilityState !== 'visible';
        if (elapsed > 3000 || unfocused) {
          notify('GitCron — Push completado', { body: msg });
        }
        await refreshLog();
        await refreshBranches();
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const pullChanges = async () => {
    if (!window.api || !repoPath) return;
    const startedAt = Date.now();
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitPull(repoPath, githubToken ?? undefined);
      if (result.success) {
        const msg = result.data?.summary ? `Pull completado — ${result.data.summary}` : 'Pull completado';
        setSuccess(msg);
        const elapsed = Date.now() - startedAt;
        const unfocused = typeof document !== 'undefined' && document.visibilityState !== 'visible';
        if (elapsed > 3000 || unfocused) {
          notify('GitCron — Pull completado', { body: msg });
        }
        await refreshLog(); await refreshStatus(); await refreshBranches();
      } else {
        const isAuth = result.data?.authRequired;
        const errMsg = isAuth
          ? 'Pull fallido: autenticación requerida. Configurá tu token de GitHub en Settings.'
          : `Pull fallido: ${result.error}`;
        setError(errMsg);
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          notify('GitCron — Pull fallido', { body: errMsg });
        }
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const pullWithDecision = async (mode: 'ff-only' | 'rebase' | 'merge') => {
    if (!window.api || !repoPath) return { success: false, error: 'no api' };
    const startedAt = Date.now();
    setLoading(true); setError(null);
    try {
      const result = mode === 'ff-only'
        ? await window.api.gitPullFastForward(repoPath, githubToken ?? undefined)
        : mode === 'rebase'
          ? await window.api.gitPullRebase(repoPath, githubToken ?? undefined)
          : await window.api.gitPullMerge(repoPath, githubToken ?? undefined);

      if (result.success) {
        const label = mode === 'ff-only'
          ? 'Fast-forward completado'
          : mode === 'rebase'
            ? 'Pull con rebase completado'
            : 'Pull con merge completado';
        const msg = result.data?.summary ? `${label} — ${result.data.summary}` : label;
        setSuccess(msg);
        const elapsed = Date.now() - startedAt;
        const unfocused = typeof document !== 'undefined' && document.visibilityState !== 'visible';
        if (elapsed > 3000 || unfocused) {
          notify('GitCron — Pull completado', { body: msg });
        }
        await refreshLog(); await refreshStatus(); await refreshBranches();
        return { success: true };
      }

      const isAuth = result.data?.authRequired;
      const isConflict = result.data?.conflict;
      const errMsg = isAuth
        ? 'Pull fallido: autenticación requerida. Configurá tu token de GitHub en Settings.'
        : isConflict
          ? 'Pull dejó conflictos. Resolvé los archivos marcados y continuá el rebase/merge desde Git.'
          : `Pull fallido: ${result.error}`;
      setError(errMsg);
      if (isConflict) await refreshStatus();
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        notify('GitCron — Pull fallido', { body: errMsg });
      }
      return { success: false, conflict: isConflict, error: result.error };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally { setLoading(false); }
  };

  return {
    pushTag,
    pullSpecificBranch,
    pushSpecificBranch,
    pushChanges,
    pullChanges,
    pullWithDecision,
  };
};
