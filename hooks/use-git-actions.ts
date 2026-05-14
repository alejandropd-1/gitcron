'use client';

import { useGitStore } from '@/lib/git-store';
import { useRepoLoader } from './use-repo-loader';

export const useGitActions = () => {
  const {
    repoPath,
    commitMessage,
    setCommitMessage,
    modifiedFiles,
    setModifiedFiles,
    setLoading,
    setError,
    githubToken,
    setGithubToken,
    setGithubUser,
  } = useGitStore();

  const { refreshLog, refreshStatus, refreshBranches, refreshStashes } = useRepoLoader();

  const runCommand = async (args: string[]) => {
    setLoading(true);
    setError(null);
    try {
      if (!window.api) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { success: true };
      }
      return await window.api.gitCommand(args);
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
      const result = await window.api.gitCommand(['commit', '-m', commitMessage]);
      if (result.success) {
        setCommitMessage('');
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
    if (result.success) { await refreshStatus(); await refreshStashes(); }
    return result;
  };

  const discardFileChanges = async (filePath: string) => {
    if (!window.api || !repoPath) {
      setModifiedFiles(modifiedFiles.filter((f) => f.path !== filePath));
      return { success: true };
    }
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitCommand(['restore', filePath]);
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

  const checkoutBranch = async (branch: string) => {
    if (!window.api || !repoPath) return;
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitCheckout(repoPath, branch);
      if (result.success) {
        await refreshBranches(); await refreshLog(); await refreshStatus();
      } else setError(result.error ?? `Error al hacer checkout de ${branch}`);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const createBranch = async (name: string, fromHash?: string) => {
    if (!window.api || !repoPath) return;
    setLoading(true); setError(null);
    try {
      const result = await window.api.gitCreateBranch(repoPath, name, fromHash);
      if (result.success) { await refreshBranches(); await refreshLog(); }
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
        await refreshLog();
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
      if (result.success) { await refreshStashes(); await refreshStatus(); }
      else setError(result.error ?? 'Error al aplicar stash');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
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
    checkoutBranch,
    createBranch,
    pushChanges,
    pullChanges,
    openTerminal,
    stashApply,
    stashDrop,
    connectGitHub,
    disconnectGitHub,
    loginWithGitHubDevice,
    bootstrapGitHub,
  };
};
