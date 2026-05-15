'use client';

import { useGitStore } from '@/lib/git-store';
import { useRepoLoader } from './use-repo-loader';
import type { Lang } from '@/lib/i18n';

export const useGitActions = () => {
  const {
    repoPath,
    commitMessage,
    setCommitMessage,
    modifiedFiles,
    setModifiedFiles,
    setLoading,
    setError,
    setSuccess,
    githubToken,
    setGithubToken,
    setGithubUser,
    setLanguage,
  } = useGitStore();

  const { refreshLog, refreshStatus, refreshBranches, refreshStashes } = useRepoLoader();

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

  const commitChanges = async () => {
    if (!commitMessage.trim()) { setError('El mensaje del commit no puede estar vacío'); return; }
    const stagedFiles = modifiedFiles.filter((f) => f.staged);
    if (stagedFiles.length === 0) { setError('No hay archivos staged para commitear'); return; }

    setLoading(true); setError(null);
    try {
      if (!window.api || !repoPath) {
        setCommitMessage('');
        setModifiedFiles(modifiedFiles.filter((f) => !f.staged));
        return;
      }
      const result = await window.api.gitCommand(repoPath, ['commit', '-m', commitMessage]);
      if (result.success) {
        setCommitMessage('');
        setSuccess('Commit realizado correctamente');
        await refreshStatus();
        await refreshLog();
        await refreshBranches();
      } else {
        setError(result.error ?? 'Error al commitear');
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const mergeBranch = async (branchName: string) => {
    const result = await runCommand(['merge', branchName]);
    if (result.success) { await refreshLog(); await refreshStatus(); await refreshBranches(); }
    else setError(`Conflicto al mergear ${branchName}: ${result.error}`);
    return result;
  };

  const revertCommit = async (hash: string) => {
    const result = await runCommand(['revert', '--no-edit', hash]);
    if (result.success) { await refreshLog(); await refreshStatus(); }
    else setError(`Error al revertir el commit ${hash}: ${result.error}`);
    return result;
  };

  const stashChanges = async () => {
    const result = await runCommand(['stash']);
    if (result.success) {
      setSuccess('Cambios guardados en el stash');
      await refreshStatus();
      await refreshStashes();
    }
    return result;
  };

  const discardFileChanges = async (filePath: string) => {
    if (!window.api || !repoPath) {
      setModifiedFiles(modifiedFiles.filter((f) => f.path !== filePath));
      return { success: true };
    }
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitCommand(repoPath, ['restore', filePath]);
      if (result.success) await refreshStatus();
      else setError(result.error ?? 'Error al descartar cambios');
      return result;
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally { setLoading(false); }
  };

  const stageFile = async (filePath: string, stage: boolean) => {
    if (!window.api || !repoPath) {
      setModifiedFiles(modifiedFiles.map((f) => (f.path === filePath ? { ...f, staged: stage } : f)));
      return;
    }
    try {
      const result = stage
        ? await window.api.gitStage(repoPath, filePath)
        : await window.api.gitUnstage(repoPath, filePath);
      if (result.success) await refreshStatus();
      else setError(result.error ?? 'Error al stagear archivo');
    } catch (err: any) { setError(err.message); }
  };

  /**
   * Batch stage/unstage. Use this for "Stage all" / "Unstage all" — sends a
   * single git command for all files, avoiding parallel writes to .git/index
   * (which cause "index.lock: File exists" errors).
   */
  const stageFiles = async (filePaths: string[], stage: boolean) => {
    if (!window.api || !repoPath || filePaths.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = stage
        ? await window.api.gitStageBatch(repoPath, filePaths)
        : await window.api.gitUnstageBatch(repoPath, filePaths);
      if (result.success) {
        await refreshStatus();
      } else {
        setError(result.error ?? 'Error al stagear archivos');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /** Append a path to the repo's .gitignore and (if tracked) untrack it. */
  const addToGitignore = async (filePath: string) => {
    if (!window.api || !repoPath) return { success: false as const };
    setLoading(true);
    setError(null);
    try {
      const r = await window.api.gitAddToGitignore(repoPath, filePath);
      if (r.success) {
        await refreshStatus();
        return { success: true as const, alreadyIgnored: r.data?.alreadyIgnored ?? false };
      }
      setError(r.error ?? 'Error al agregar al .gitignore');
      return { success: false as const };
    } finally {
      setLoading(false);
    }
  };

  /** Discard ALL changes (staged + unstaged + untracked). Destructive. */
  const resetAll = async () => {
    if (!window.api || !repoPath) return false;
    setLoading(true);
    setError(null);
    try {
      const r = await window.api.gitResetAll(repoPath);
      if (r.success) {
        await refreshStatus();
        return true;
      }
      setError(r.error ?? 'Error al resetear');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /** Stash a single file. */
  const stashFile = async (filePath: string) => {
    if (!window.api || !repoPath) return;
    setLoading(true);
    setError(null);
    try {
      const r = await window.api.gitStashFile(repoPath, filePath);
      if (r.success) {
        await refreshStatus();
        await refreshStashes();
      } else {
        setError(r.error ?? 'Error al stashear archivo');
      }
    } finally {
      setLoading(false);
    }
  };

  const showInFolder = async (filePath: string) => {
    if (!window.api || !repoPath) return;
    await window.api.shellShowInFolder(repoPath, filePath);
  };

  const openInDefault = async (filePath: string) => {
    if (!window.api || !repoPath) return;
    const r = await window.api.shellOpenItem(repoPath, filePath);
    if (!r.success) setError(r.error ?? 'No se pudo abrir el archivo');
  };

  const deleteFile = async (filePath: string) => {
    if (!window.api || !repoPath) return false;
    setLoading(true);
    setError(null);
    try {
      const r = await window.api.fsDeleteFile(repoPath, filePath);
      if (r.success) {
        await refreshStatus();
        return true;
      }
      setError(r.error ?? 'No se pudo eliminar');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const copyFilePath = async (filePath: string) => {
    if (!repoPath) return;
    // We expose the full absolute path (more useful for terminal/editor pasting)
    const absolute = `${repoPath}\\${filePath.replace(/\//g, '\\')}`;
    await navigator.clipboard.writeText(absolute);
  };

  /**
   * Force-remove a stuck .git/index.lock file. Returns true if a lock was
   * present and removed (or wasn't there to begin with).
   */
  const removeIndexLock = async () => {
    if (!window.api || !repoPath) return false;
    const r = await window.api.gitRemoveLock(repoPath);
    if (r.success) {
      setError(null);
      // Refresh state so the UI catches up
      await refreshStatus();
      return true;
    }
    setError(r.error ?? 'No se pudo eliminar el lock');
    return false;
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
        setSuccess(`Cambiaste a la branch "${branch}"`);
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
          ? `"${sourceBranch}" ya estaba integrada — nada para mergear`
          : `Merge de "${sourceBranch}" completado`);
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
        setSuccess(`"${branch}" actualizada (fast-forward)`);
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
        return { success: true };
      }
      const notMerged = (r.data as any)?.notMerged;
      if (!notMerged) setError(r.error ?? 'Error al eliminar branch');
      return { success: false, notMerged };
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

  const pushChanges = async () => {
    if (!window.api || !repoPath) return;
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitPush(repoPath, githubToken ?? undefined);
      if (!result.success) {
        const isAuth = result.data?.authRequired;
        setError(
          isAuth
            ? 'Push fallido: autenticación requerida. Configurá tu token de GitHub en Settings.'
            : `Push fallido: ${result.error}`
        );
      } else {
        const wasNewBranch = (result.data as any)?.setUpstream;
        setSuccess(wasNewBranch
          ? 'Branch publicada en origin — upstream configurado automáticamente'
          : 'Push exitoso — cambios subidos al remoto');
        await refreshLog();
        await refreshBranches();
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const pullChanges = async () => {
    if (!window.api || !repoPath) return;
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitPull(repoPath, githubToken ?? undefined);
      if (result.success) {
        setSuccess(result.data?.summary ? `Pull completado — ${result.data.summary}` : 'Pull completado');
        await refreshLog(); await refreshStatus(); await refreshBranches();
      } else {
        const isAuth = result.data?.authRequired;
        setError(
          isAuth
            ? 'Pull fallido: autenticación requerida. Configurá tu token de GitHub en Settings.'
            : `Pull fallido: ${result.error}`
        );
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openTerminal = async () => {
    if (!window.api || !repoPath) return;
    const result = await window.api.terminalOpen(repoPath);
    if (!result.success) setError(result.error ?? 'No se pudo abrir el terminal');
  };

  const stashApply = async (index: number) => {
    if (!window.api || !repoPath) return;
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitStashApply(repoPath, index);
      if (result.success) {
        setSuccess('Stash aplicado correctamente');
        await refreshStashes();
        await refreshStatus();
      }
      else setError(result.error ?? 'Error al aplicar stash');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const stashClear = async () => {
    if (!window.api || !repoPath) return false;
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitStashClear(repoPath);
      if (r.success) {
        setSuccess('Todos los stashes eliminados');
        await refreshStashes();
        return true;
      }
      setError(r.error ?? 'Error al limpiar stashes');
      return false;
    } finally { setLoading(false); }
  };

  const stashDrop = async (index: number) => {
    if (!window.api || !repoPath) return;
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitStashDrop(repoPath, index);
      if (result.success) await refreshStashes();
      else setError(result.error ?? 'Error al borrar stash');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const connectGitHub = async (token: string) => {
    if (!window.api) return { success: false, error: 'Electron API no disponible' };
    setLoading(true); setError(null);
    try {
      const result = await window.api.githubAuth(token);
      if (result.success && result.data) {
        setGithubToken(token);
        setGithubUser(result.data);
        // Persist encrypted via OS keychain (safeStorage)
        await window.api.storageSet('githubToken', token);
        return { success: true };
      } else {
        setError(result.error ?? 'Token de GitHub inválido');
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally { setLoading(false); }
  };

  const disconnectGitHub = async () => {
    setGithubToken(null);
    setGithubUser(null);
    if (window.api) {
      await window.api.storageDelete('githubToken').catch(() => {});
    }
  };

  /** Change UI language and persist to encrypted storage. */
  const changeLanguage = async (lang: Lang) => {
    setLanguage(lang);
    if (window.api) {
      await window.api.storageSet('language', lang).catch(() => {});
    }
  };

  /** Hydrate language pref + GitHub auth from storage on mount. */
  const bootstrapPreferences = async () => {
    if (!window.api) return;
    const lr = await window.api.storageGet('language');
    if (lr.success && (lr.data === 'es' || lr.data === 'en')) {
      setLanguage(lr.data as Lang);
    }
  };

  /** Loads token from encrypted storage on app mount. */
  const bootstrapGitHub = async () => {
    if (!window.api) return;
    const r = await window.api.storageGet('githubToken');
    if (r.success && r.data) {
      setGithubToken(r.data);
      // Validate token + fetch user
      const userResult = await window.api.githubAuth(r.data);
      if (userResult.success && userResult.data) {
        setGithubUser(userResult.data);
      } else {
        // Token was revoked/expired — clean up
        await window.api.storageDelete('githubToken').catch(() => {});
        setGithubToken(null);
      }
    }
  };

  /**
   * GitHub OAuth Device Flow.
   * Calls onCode(userCode, verificationUri) so the UI can show the code and
   * open the browser. Polls until the user authorizes or the code expires.
   */
  /**
   * GitHub OAuth Device Flow.
   * The resulting access token is persisted via OS keychain (safeStorage).
   */
  const loginWithGitHubDevice = async (
    onCode: (info: { userCode: string; verificationUri: string }) => void,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!window.api) return { success: false, error: 'Electron API no disponible' };
    setError(null);

    const start = await window.api.githubDeviceStart();
    if (!start.success || !start.data) {
      const msg = start.error ?? 'No se pudo iniciar el login con GitHub';
      setError(msg);
      return { success: false, error: msg };
    }

    const { deviceCode, userCode, verificationUri, expiresIn, interval } = start.data;
    onCode({ userCode, verificationUri });

    // Open browser to the verification URL
    if (window.api.shellOpenPath) {
      window.api.shellOpenPath(verificationUri);
    }

    const deadline = Date.now() + expiresIn * 1000;
    let pollInterval = Math.max(interval, 5) * 1000;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollInterval));
      const poll = await window.api.githubDevicePoll(deviceCode);
      if (poll.success && poll.data?.accessToken) {
        const token = poll.data.accessToken;
        // Now fetch user info
        const userResult = await window.api.githubAuth(token);
        if (userResult.success && userResult.data) {
          setGithubToken(token);
          setGithubUser(userResult.data);
          // Persist encrypted via OS keychain
          await window.api.storageSet('githubToken', token);
          return { success: true };
        }
        return { success: false, error: 'Token obtenido pero no se pudo leer el usuario' };
      }
      // Slow down if requested
      if (poll.error === 'slow_down') pollInterval += 5000;
      // Stop on permanent failures
      if (poll.error && !poll.data?.pending) {
        const msg = `Login cancelado o expirado: ${poll.error}`;
        setError(msg);
        return { success: false, error: msg };
      }
    }
    const msg = 'El código expiró antes de autorizar. Probá de nuevo.';
    setError(msg);
    return { success: false, error: msg };
  };

  return {
    commitChanges,
    mergeBranch,
    revertCommit,
    stashChanges,
    discardFileChanges,
    stageFile,
    stageFiles,
    removeIndexLock,
    addToGitignore,
    resetAll,
    stashFile,
    showInFolder,
    openInDefault,
    deleteFile,
    copyFilePath,
    checkoutBranch,
    checkoutBranchSmart,
    createBranch,
    mergeIntoCurrent,
    rebaseOnto,
    fastForwardBranch,
    renameBranch,
    deleteBranch,
    pullSpecificBranch,
    pushSpecificBranch,
    pushChanges,
    pullChanges,
    openTerminal,
    stashApply,
    stashDrop,
    stashClear,
    connectGitHub,
    disconnectGitHub,
    loginWithGitHubDevice,
    bootstrapGitHub,
    bootstrapPreferences,
    changeLanguage,
  };
};
