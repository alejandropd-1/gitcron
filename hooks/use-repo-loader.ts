'use client';

import { useEffect, useRef, useState } from 'react';
import { useGitStore, type RepoState } from '@/lib/git-store';
import { isValidExistingGitHubRemoteUrl } from '@/lib/github-remote-url';
import type {
  CommitData, StatusFile, BranchData, StashEntry, SubmoduleEntry,
  RepoInfo, GitHubRepoInfo, WorktreeEntry, PullRequestEntry, RemoteEntry,
} from '@/types/electron';

type GraphMode = 'classic' | 'chronometric';
type RefreshTarget = { target: string; hasExplicitPath: boolean };
export type PendingInitRepo = { path: string; parentPath: string; name: string; isInitialized?: boolean };
export type InitRemoteProgress = 'validating' | 'initializing' | 'linking' | 'recovering';

function isNotARepoResult(result: { success?: boolean; reason?: string; path?: string }): result is { success: false; reason: 'not-a-repo'; path: string } {
  return result.success === false && result.reason === 'not-a-repo' && typeof result.path === 'string';
}

function splitFolderPath(folderPath: string): PendingInitRepo {
  const normalized = folderPath.replace(/[\\/]+$/, '');
  const slash = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
  const name = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const parentPath = slash >= 0 ? normalized.slice(0, slash) : '';
  return {
    path: normalized,
    parentPath,
    name,
  };
}

function isGraphMode(value: unknown): value is GraphMode {
  return value === 'classic' || value === 'chronometric';
}

function parseSavedRepoPaths(raw: string): { hasRepoList: boolean; paths: string[] } {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { hasRepoList: false, paths: [] };
    return {
      hasRepoList: true,
      paths: parsed.filter((path): path is string => typeof path === 'string' && path.length > 0),
    };
  } catch {
    return { hasRepoList: false, paths: [] };
  }
}

function parseRepoGraphModes(raw: unknown): Record<string, GraphMode> {
  if (typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, GraphMode] => isGraphMode(entry[1])),
    );
  } catch {
    return {};
  }
}

export const useRepoLoader = () => {
  const [pendingInitRepo, setPendingInitRepo] = useState<PendingInitRepo | null>(null);
  const repoPath = useGitStore((state) => state.repoPath);
  const githubToken = useGitStore((state) => state.githubToken);
  const setCommits = useGitStore((state) => state.setCommits);
  const setModifiedFiles = useGitStore((state) => state.setModifiedFiles);
  const setBranches = useGitStore((state) => state.setBranches);
  const setRemoteBranches = useGitStore((state) => state.setRemoteBranches);
  const setCurrentBranch = useGitStore((state) => state.setCurrentBranch);
  const setStashes = useGitStore((state) => state.setStashes);
  const setTags = useGitStore((state) => state.setTags);
  const setSubmodules = useGitStore((state) => state.setSubmodules);
  const setRemotes = useGitStore((state) => state.setRemotes);
  const setBranchTracking = useGitStore((state) => state.setBranchTracking);
  const setDefaultRemoteBranch = useGitStore((state) => state.setDefaultRemoteBranch);
  const setWorktrees = useGitStore((state) => state.setWorktrees);
  const setPullRequests = useGitStore((state) => state.setPullRequests);
  const setMergeInProgress = useGitStore((state) => state.setMergeInProgress);
  const setRebaseInProgress = useGitStore((state) => state.setRebaseInProgress);
  const updateRepoByPath = useGitStore((state) => state.updateRepoByPath);
  const addOrActivateRepo = useGitStore((state) => state.addOrActivateRepo);
  const setActiveRepoIdx = useGitStore((state) => state.setActiveRepoIdx);
  const closeRepoInStore = useGitStore((state) => state.closeRepo);
  const setCurrentDiff = useGitStore((state) => state.setCurrentDiff);
  const setLoading = useGitStore((state) => state.setLoading);
  const setError = useGitStore((state) => state.setError);
  const setSuccess = useGitStore((state) => state.setSuccess);

  // Firma del `.git/index` de la última lectura exitosa, por repo. La usa la
  // guardia del latido de respaldo para saltear un `git status` cuando el
  // índice no cambió. Es sólo una optimización: nunca descarta un evento.
  const lastIndexSigRef = useRef<Record<string, string>>({});

  const persistOpenRepos = async () => {
    if (!window.api) return;
    const state = useGitStore.getState();
    const paths = state.openRepos.map((repo) => repo.path);
    const activePath = state.openRepos[state.activeRepoIdx]?.path ?? null;

    await window.api.storageSet('openRepoPaths', JSON.stringify(paths)).catch(() => {});
    if (activePath) {
      await Promise.all([
        window.api.storageSet('activeRepoPath', activePath).catch(() => {}),
        window.api.storageSet('lastRepoPath', activePath).catch(() => {}),
      ]);
    } else {
      await Promise.all([
        window.api.storageDelete('activeRepoPath').catch(() => {}),
        window.api.storageDelete('lastRepoPath').catch(() => {}),
      ]);
    }
  };

  const loadRepoGraphModes = async () => {
    if (!window.api) return {};
    const saved = await window.api.storageGet('repoGraphModes').catch(() => null);
    return saved?.success ? parseRepoGraphModes(saved.data) : {};
  };

  const restoreGraphMode = (path: string, modes: Record<string, GraphMode>) => {
    const mode = modes[path];
    if (mode) updateRepoByPath(path, { graphMode: mode });
  };

  const getRefreshTarget = (path?: string): RefreshTarget | null => {
    const target = path ?? repoPath;
    if (!target || !window.api) return null;
    return { target, hasExplicitPath: path !== undefined };
  };

  const writeRepoData = (ctx: RefreshTarget, patch: Partial<RepoState>, writeActive: () => void) => {
    if (ctx.hasExplicitPath) updateRepoByPath(ctx.target, patch);
    else writeActive();
  };

  const applyRepoInfo = async (info: RepoInfo) => {
    addOrActivateRepo(info);
    restoreGraphMode(info.path, await loadRepoGraphModes());
    await persistOpenRepos();
  };

  const openRepo = async () => {
    if (!window.api) { setError('Electron API no disponible'); return; }
    // Capture the currently active repo path BEFORE the dialog opens.
    // applyRepoInfo / addOrActivateRepo will switch the active repo to the
    // newly opened one, so the finally-block's setLoading(false) would
    // clear the *new* repo's spinner, leaving the *previous* repo with
    // isLoading: true permanently. Capturing here lets us reset both.
    const prevPath = useGitStore.getState().repoPath;
    setLoading(true); setError(null);
    try {
      const defaultFolder = useGitStore.getState().defaultFolder ?? undefined;
      const result = await window.api.openRepo(defaultFolder);
      if (result.success && result.data) {
        setPendingInitRepo(null);
        await applyRepoInfo(result.data);
      } else if (isNotARepoResult(result)) {
        setPendingInitRepo(splitFolderPath(result.path));
      } else {
        setError(result.error ?? 'No se pudo abrir el repositorio');
      }
    } catch (err: any) {
      setError(err.message ?? 'Error al abrir el repositorio');
    } finally {
      setLoading(false);
      if (prevPath) updateRepoByPath(prevPath, { isLoading: false });
    }
  };

  const trustSafeDirectory = async (targetPath: string) => {
    if (!window.api) { setError('Electron API no disponible'); return false; }
    const prevPath = useGitStore.getState().repoPath;
    setLoading(true); setError(null);
    try {
      const trusted = await window.api.gitTrustSafeDirectory(targetPath);
      if (!trusted.success) {
        setError(trusted.error ?? 'No se pudo marcar la carpeta como segura');
        return false;
      }

      const opened = await window.api.openPath(targetPath);
      if (opened.success && opened.data) {
        await applyRepoInfo(opened.data);
        setSuccess(`Carpeta confiada: ${opened.data.name}`);
        return true;
      }

      setError(opened.error ?? 'La carpeta se marco como segura, pero no se pudo abrir');
      return false;
    } catch (err: any) {
      setError(err.message ?? 'No se pudo marcar la carpeta como segura');
      return false;
    } finally {
      setLoading(false);
      if (prevPath) updateRepoByPath(prevPath, { isLoading: false });
    }
  };

  /** Restore the last opened repo on startup — no dialog. Silently ignores errors. */
  const restoreLastRepo = async () => {
    if (!window.api) return;
    const savedPaths = await window.api.storageGet('openRepoPaths').catch(() => null);
    if (savedPaths?.success && typeof savedPaths.data === 'string') {
      const { hasRepoList, paths } = parseSavedRepoPaths(savedPaths.data);

      if (hasRepoList) {
        if (paths.length === 0) {
          await persistOpenRepos();
          return;
        }

        const activeSaved = await window.api.storageGet('activeRepoPath').catch(() => null);
        const activePath = activeSaved?.success ? activeSaved.data : null;
        const opened: RepoInfo[] = [];
        const modes = await loadRepoGraphModes();

        for (const path of paths) {
          try {
            const result = await window.api.openPath(path);
            if (result.success && result.data) {
              addOrActivateRepo(result.data);
              restoreGraphMode(path, modes);
              opened.push(result.data);
            }
          } catch { /* ignore moved/deleted repos */ }
        }

        if (opened.length > 0) {
          const activeIdx = activePath
            ? opened.findIndex((repo) => repo.path === activePath)
            : -1;
          if (activeIdx >= 0) setActiveRepoIdx(activeIdx);
          await persistOpenRepos();
        }
        return;
      }
    }

    const saved = await window.api.storageGet('lastRepoPath').catch(() => null);
    if (!saved?.success || !saved.data) return;
    try {
      const result = await window.api.openPath(saved.data);
      if (result.success && result.data) await applyRepoInfo(result.data);
      // If folder moved/deleted → silently show empty state; user picks manually
    } catch { /* ignore */ }
  };

  const closeRepo = async (idx: number) => {
    const repoToClose = useGitStore.getState().openRepos[idx];
    if (repoToClose && window.api) {
      await window.api.closeRepo(repoToClose.path).catch(() => {});
    }
    closeRepoInStore(idx);
    await persistOpenRepos();
  };

  /** Pick a parent folder via native dialog. Returns the chosen path or null. */
  const pickFolder = async (title?: string): Promise<string | null> => {
    if (!window.api) return null;
    const defaultFolder = useGitStore.getState().defaultFolder ?? undefined;
    const r = await window.api.pickFolder(title, defaultFolder);
    if (r.success && r.data) return r.data;
    return null;
  };

  /** Initialize a brand new repo at parentPath/name. */
  const initRepo = async (parentPath: string, name: string, withInitialCommit = true) => {
    if (!window.api) return { success: false as const, error: 'Electron API no disponible' };
    const prevPath = useGitStore.getState().repoPath;
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitInit(parentPath, name, withInitialCommit);
      if (r.success && r.data) {
        await applyRepoInfo(r.data);
        return { success: true as const };
      }
      setError(r.error ?? 'Error al inicializar el repo');
      return { success: false as const, error: r.error };
    } finally {
      setLoading(false);
      if (prevPath) updateRepoByPath(prevPath, { isLoading: false });
    }
  };

  const cancelPendingInitRepo = () => {
    setPendingInitRepo(null);
  };

  const initializePendingRepo = async () => {
    if (!pendingInitRepo) return { success: false as const };
    const targetPath = pendingInitRepo.path;
    if (pendingInitRepo.isInitialized) {
      setPendingInitRepo(null);
      await loadAll(targetPath);
      return { success: true as const };
    }
    const r = await initRepo(pendingInitRepo.parentPath, pendingInitRepo.name, true);
    if (r.success) {
      setPendingInitRepo(null);
      await loadAll(targetPath);
    }
    return r;
  };

  const initializePendingRepoWithRemote = async (
    remoteUrl: string,
    onProgress?: (progress: InitRemoteProgress) => void,
  ) => {
    if (!pendingInitRepo) return { success: false as const, error: 'No hay repositorio pendiente' };
    if (!window.api) return { success: false as const, error: 'Electron API no disponible' };

    const trimmedUrl = remoteUrl.trim();
    onProgress?.('validating');
    if (!isValidExistingGitHubRemoteUrl(trimmedUrl)) {
      return { success: false as const, error: 'invalid-remote-url', code: 'invalid-remote-url' as const };
    }

    const targetPath = pendingInitRepo.path;
    let localRepoReady = !!pendingInitRepo.isInitialized;
    const inspection = await window.api.gitInspectExistingGitHubRemote(
      targetPath,
      trimmedUrl,
      githubToken ?? undefined,
    );
    if (!inspection.success) {
      return {
        success: false as const,
        error: inspection.error,
        code: inspection.data?.code,
        authRequired: inspection.data?.authRequired,
        localRepoReady,
        retryable: inspection.data?.retryable,
      };
    }
    if (inspection.data?.remoteHasHistory) {
      return {
        success: false as const,
        error: 'El remoto ya tiene historial',
        code: 'remote-has-history' as const,
        localRepoReady,
        retryable: true,
      };
    }
    if (!localRepoReady) {
      onProgress?.('initializing');
      const init = await initRepo(pendingInitRepo.parentPath, pendingInitRepo.name, true);
      if (!init.success) return init;
      localRepoReady = true;
      setPendingInitRepo((current) => (
        current?.path === targetPath ? { ...current, isInitialized: true } : current
      ));
    }

    onProgress?.('linking');
    const link = await window.api.gitAddExistingGitHubRemote(targetPath, trimmedUrl, githubToken ?? undefined);
    if (link.success) {
      setPendingInitRepo(null);
      await loadAll(targetPath);
      return { success: true as const };
    }

    setPendingInitRepo((current) => (
      current?.path === targetPath ? { ...current, isInitialized: localRepoReady } : current
    ));
    return {
      success: false as const,
      error: link.error,
      code: link.data?.code,
      authRequired: link.data?.authRequired,
      localRepoReady: link.data?.localRepoReady ?? localRepoReady,
      retryable: link.data?.retryable,
    };
  };

  const adoptPendingRepoRemote = async (
    remoteUrl: string,
    onProgress?: (progress: InitRemoteProgress) => void,
  ) => {
    if (!pendingInitRepo) return { success: false as const, error: 'No hay repositorio pendiente' };
    if (!window.api) return { success: false as const, error: 'Electron API no disponible' };

    const targetPath = pendingInitRepo.path;
    onProgress?.('recovering');
    const result = await window.api.gitAdoptExistingGitHubRemote(
      targetPath,
      remoteUrl.trim(),
      githubToken ?? undefined,
    );
    if (result.success) {
      setPendingInitRepo(null);
      await loadAll(targetPath);
      return {
        success: true as const,
        backupBranch: result.data?.backupBranch,
      };
    }

    return {
      success: false as const,
      error: result.error,
      code: result.data?.code,
      authRequired: result.data?.authRequired,
      localRepoReady: true,
      retryable: result.data?.retryable,
    };
  };

  /** Clone an existing repo. token is optional (used for private GH repos). */
  const cloneRepo = async (url: string, parentPath: string, folderName: string, token?: string) => {
    if (!window.api) return { success: false as const, error: 'Electron API no disponible' };
    const prevPath = useGitStore.getState().repoPath;
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitClone(url, parentPath, folderName, token);
      if (r.success && r.data) {
        await applyRepoInfo(r.data);
        return { success: true as const };
      }
      const isAuth = (r.data as any)?.authRequired;
      setError(
        isAuth
          ? 'Clone fallido: este repo necesita autenticación. Logueate con GitHub en Settings.'
          : `Clone fallido: ${r.error}`,
      );
      return { success: false as const, error: r.error };
    } finally {
      setLoading(false);
      if (prevPath) updateRepoByPath(prevPath, { isLoading: false });
    }
  };

  /** Create a repo on GitHub. Returns the clone URL (caller decides if to clone). */
  const createGitHubRepo = async (token: string, name: string, isPrivate: boolean, description?: string, autoInit?: boolean) => {
    if (!window.api) return { success: false as const, error: 'Electron API no disponible' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.githubCreateRepo(token, name, isPrivate, description, autoInit);
      if (r.success && r.data) return { success: true as const, data: r.data };
      setError(r.error ?? 'Error al crear repo en GitHub');
      return { success: false as const, error: r.error };
    } finally { setLoading(false); }
  };

  /** List user's GitHub repos. */
  const listUserGitHubRepos = async (token: string): Promise<GitHubRepoInfo[]> => {
    if (!window.api) return [];
    const r = await window.api.githubListUserRepos(token);
    return r.success && r.data ? r.data : [];
  };

  const refreshLog = async (path?: string, opts?: { allBranches?: boolean }) => {
    const ctx = getRefreshTarget(path);
    if (!ctx || !window.api) return;
    try {
      const state = useGitStore.getState();
      const repoEntry = state.openRepos.find((r) => r.path === ctx.target);
      const allBranches = opts?.allBranches ?? repoEntry?.graphShowAllBranches ?? true;
      const result = await window.api.gitLog(ctx.target, { allBranches });
      if (result.success && result.data) {
        const commits = result.data as CommitData[];
        writeRepoData(ctx, { commits }, () => setCommits(commits));
      }
    } catch (err: any) { console.error('refreshLog error:', err); }
  };

  const refreshStatus = async (path?: string) => {
    const ctx = getRefreshTarget(path);
    if (!ctx || !window.api) return;
    try {
      const result = await window.api.gitStatus(ctx.target);
      if (result.success && result.data) {
        const modifiedFiles = result.data as StatusFile[];
        const mergeInProgress = result.mergeInProgress ?? false;
        const rebaseInProgress = (result as any).rebaseInProgress ?? false;
        writeRepoData(ctx, { modifiedFiles, mergeInProgress, rebaseInProgress }, () => {
          setModifiedFiles(modifiedFiles);
          setMergeInProgress(mergeInProgress);
          setRebaseInProgress(rebaseInProgress);
        });
      }
    } catch (err: any) { console.error('refreshStatus error:', err); }
  };

  /**
   * Relectura con guardia para el latido de respaldo: comprueba la firma del
   * `.git/index` y **sólo saltea** la lectura completa cuando no cambió desde la
   * última vez. Nunca descarta un evento: ante cualquier ambigüedad (sin
   * firma, primera vez, o `force`) se lee. El camino disparado por un evento de
   * filesystem no pasa por acá: un evento ya es prueba de cambio.
   */
  const refreshStatusIfChanged = async (path?: string, opts?: { force?: boolean }) => {
    const ctx = getRefreshTarget(path);
    if (!ctx || !window.api) return;
    const force = opts?.force === true;
    try {
      const sigResult = await window.api.gitIndexSignature(ctx.target);
      const sig = sigResult.success ? sigResult.data : null;
      const key = sig ? `${sig.mtimeMs}|${sig.size}|${sig.ino}` : '';
      if (!force && sig && lastIndexSigRef.current[ctx.target] === key) return;
      await refreshStatus(ctx.target);
      lastIndexSigRef.current[ctx.target] = key;
    } catch {
      // Si la firma no se pudo obtener, no perdemos la lectura: se lee igual.
      await refreshStatus(ctx.target).catch(() => {});
    }
  };

  const refreshBranches = async (path?: string) => {
    const ctx = getRefreshTarget(path);
    if (!ctx || !window.api) return;
    try {
      const result = await window.api.gitBranches(ctx.target);
      if (result.success && result.data) {
        const data = result.data as BranchData;
        writeRepoData(
          ctx,
          {
            branches: data.local,
            remoteBranches: data.remote,
            currentBranch: data.current,
            ...(data.tracking ? { branchTracking: data.tracking } : {}),
          },
          () => {
          setBranches(data.local);
          setRemoteBranches(data.remote);
          setCurrentBranch(data.current);
          if (data.tracking) setBranchTracking(data.tracking);
          },
        );
        // Rama por defecto del remoto (origin), para que la UI no ofrezca borrarla
        // como objetivo de un upstream mal configurado. Local y sin red; si no está
        // resuelta, va null y la confirmación con nombre remoto queda de respaldo.
        void window.api.gitDefaultBranch(ctx.target, 'origin')
          .then((r) => setDefaultRemoteBranch(r.success ? (r.data ?? null) : null))
          .catch(() => {});
      }
    } catch (err: any) { console.error('refreshBranches error:', err); }
  };

  const refreshWorktrees = async (path?: string) => {
    const ctx = getRefreshTarget(path);
    if (!ctx || !window.api) return;
    try {
      const result = await window.api.gitWorktrees(ctx.target);
      if (result.success && result.data) {
        const worktrees = result.data as WorktreeEntry[];
        writeRepoData(ctx, { worktrees }, () => setWorktrees(worktrees));
      }
    } catch (err: any) { console.error('refreshWorktrees error:', err); }
  };

  const refreshPullRequests = async (path?: string) => {
    const ctx = getRefreshTarget(path);
    if (!ctx || !window.api || !githubToken) return;
    try {
      const result = await window.api.githubListPRs(githubToken, ctx.target);
      if (result.success && result.data) {
        const pullRequests = result.data as PullRequestEntry[];
        writeRepoData(ctx, { pullRequests }, () => setPullRequests(pullRequests));
      }
    } catch (err: any) { console.error('refreshPullRequests error:', err); }
  };

  const refreshStashes = async (path?: string) => {
    const ctx = getRefreshTarget(path);
    if (!ctx || !window.api) return;
    try {
      const result = await window.api.gitStashList(ctx.target);
      if (result.success && result.data) {
        const stashes = result.data as StashEntry[];
        writeRepoData(ctx, { stashes }, () => setStashes(stashes));
      }
    } catch (err: any) { console.error('refreshStashes error:', err); }
  };

  const refreshTags = async (path?: string) => {
    const ctx = getRefreshTarget(path);
    if (!ctx || !window.api) return;
    try {
      const result = await window.api.gitTags(ctx.target);
      if (result.success && result.data) {
        const tags = result.data as string[];
        writeRepoData(ctx, { tags }, () => setTags(tags));
      }
    } catch (err: any) { console.error('refreshTags error:', err); }
  };

  const refreshSubmodules = async (path?: string) => {
    const ctx = getRefreshTarget(path);
    if (!ctx || !window.api) return;
    try {
      const result = await window.api.gitSubmodules(ctx.target);
      if (result.success && result.data) {
        const submodules = result.data as SubmoduleEntry[];
        writeRepoData(ctx, { submodules }, () => setSubmodules(submodules));
      }
    } catch (err: any) { console.error('refreshSubmodules error:', err); }
  };

  const refreshRemotes = async (path?: string) => {
    const ctx = getRefreshTarget(path);
    if (!ctx || !window.api) return;
    try {
      const result = await window.api.gitRemotesList(ctx.target);
      if (result.success && result.data) {
        const remotes = result.data as RemoteEntry[];
        writeRepoData(ctx, { remotes }, () => setRemotes(remotes));
      }
    } catch (err: any) { console.error('refreshRemotes error:', err); }
  };

  const loadDiff = async (filePath: string, staged: boolean = false, path?: string) => {
    const hasExplicitPath = path !== undefined;
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    const targetRepo = useGitStore.getState().openRepos.find((repo) => repo.path === target);
    const selectedFile = targetRepo?.modifiedFiles.find((file) => (
      file.path === filePath && file.staged === staged
    )) ?? targetRepo?.modifiedFiles.find((file) => file.path === filePath);
    try {
      const result = await window.api.gitDiff(target, filePath, staged);
      if (result.success) {
        const currentDiff = (result.data as string) ?? '';
        if (hasExplicitPath) {
          updateRepoByPath(target, {
            currentDiff,
            ...(selectedFile ? { selectedFile } : {}),
          });
        } else {
          setCurrentDiff(currentDiff);
        }
      } else {
        if (hasExplicitPath) updateRepoByPath(target, { currentDiff: '' });
        else setCurrentDiff('');
        setError(result.error ?? 'Error al cargar el diff');
      }
    } catch (err: any) {
      if (hasExplicitPath) updateRepoByPath(target, { currentDiff: '' });
      else setCurrentDiff('');
      console.error('loadDiff error:', err);
    }
  };

  const loadAll = async (path?: string) => {
    const target = path ?? repoPath;
    if (!target) return;
    await Promise.all([
      refreshLog(target),
      refreshStatus(target),
      refreshBranches(target),
      refreshStashes(target),
      refreshTags(target),
      refreshSubmodules(target),
      refreshRemotes(target),
      refreshWorktrees(target),
      refreshPullRequests(target),
    ]);
  };

  return {
    openRepo,
    pendingInitRepo,
    cancelPendingInitRepo,
    initializePendingRepo,
    initializePendingRepoWithRemote, adoptPendingRepoRemote,
    trustSafeDirectory,
    restoreLastRepo,
    closeRepo,
    persistOpenRepos,
    pickFolder,
    initRepo,
    cloneRepo,
    createGitHubRepo,
    listUserGitHubRepos,
    refreshLog,
    refreshStatus,
    refreshStatusIfChanged,
    refreshBranches,
    refreshStashes,
    refreshTags,
    refreshSubmodules,
    refreshRemotes,
    refreshWorktrees,
    refreshPullRequests,
    loadDiff,
    loadAll,
  };
};

/**
 * Cuántas observaciones hay montadas a la vez.
 *
 * Sólo informa: no decide quién observa. Un contador que elige comportamiento
 * dependería del orden de montaje, que ningún consumidor declara; uno que sólo
 * declara una condición no puede romper nada.
 */
let mountedWatchers = 0;

/**
 * Observación del repositorio abierto. **Se monta una sola vez**, en la raíz.
 *
 * Vivía dentro de `useRepoLoader`, que se llama desde ocho lugares por sus
 * funciones de refresco. Cada llamada montaba su propia suscripción y su propio
 * intervalo: la consola declaraba `11 repo:fs-change listeners added`, y un solo
 * cambio de archivo disparaba eleven `git status` sin deduplicar. Ninguno de esos
 * consumidores pidió observar; lo heredaban por pedir las funciones.
 */

// Cadencia del latido de respaldo. Un único `setInterval` (la prueba
// `use-repo-watch` afirma que hay exactamente uno); la cadencia efectiva es
// adaptativa por skip-logic, no por re-agendar el timer.
//
//   TICK_MS               — granularidad fija del timer (2 s).
//   ACTIVE_WINDOW_MS      — tras cualquier evento, 8 s en escalón activo.
//   ACTIVE_FULL_EVERY     — en activo, lectura completa cada 3.ᵒ tick (6 s); los
//                           demás ticks usan la guardia (stat ~16 µs). Acota la
//                           staleness de un evento perdido a 6 s.
//   QUIET_READ_EVERY      — en quieto, una lectura completa cada 5.ᵒ tick (10 s).
//
// Fundamento de los números (medido en 1.1/1.2/2.2): un `git status` cuesta
// 42 ms en reposo y 74 ms bajo carga; la guardia, ~16 µs. En reposo quieto el
// latido pasa de 30 lecturas/min a 6 (~5× menos CPU). El escalón quieto no se
// alarga más allá de 10 s a propósito: justo después de un checkout es donde
// chokidar sufre la tormenta EPERM y el latido más falta hace (tarea 1.2), y un
// evento cualquiera devuelve al escalón activo.
const HEARTBEAT_TICK_MS = 2000;
const HEARTBEAT_ACTIVE_WINDOW_MS = 8000;
const HEARTBEAT_ACTIVE_FULL_EVERY = 3;
const HEARTBEAT_QUIET_READ_EVERY = 5;

export const useRepoWatch = () => {
  const repoPath = useGitStore((state) => state.repoPath);
  const { refreshStatus, refreshStatusIfChanged, refreshLog, refreshBranches } = useRepoLoader();
  // Última actividad observada (cualquier evento de fs o commit). Mantiene al
  // latido en el escalón activo; su ausencia lo pasa al quieto.
  const lastActivityRef = useRef(0);

  useEffect(() => {
    mountedWatchers += 1;
    if (process.env.NODE_ENV !== 'production' && mountedWatchers > 1) {
      console.warn(
        `[useRepoWatch] hay ${mountedWatchers} observaciones montadas a la vez. `
        + 'Debe montarse una sola, en la raíz: cada una duplica las suscripciones '
        + 'y el intervalo de refresco.'
      );
    }
    return () => { mountedWatchers -= 1; };
  }, []);

  // Watch working-tree for changes so UNSTAGED updates without a manual git action.
  const fsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Si algo de lo agrupado en esta ventana tocó `.git/`. Vive en un ref y no en
  // el cierre del último evento: dentro de los 150 ms puede llegar un cambio del
  // árbol después de uno de `.git/`, y el segundo no puede borrar lo que declaró
  // el primero.
  const gitStateDirtyRef = useRef(false);
  useEffect(() => {
    if (!repoPath || !window.api) return;
    const target = repoPath;
    void window.api.repoWatch(target).then((result) => {
      if (!result.success) console.error('repoWatch error:', result.error);
    });

    const unsubFsChange = window.api.onRepoFsChange((changedPath, gitState) => {
      if (changedPath !== target) return;
      lastActivityRef.current = Date.now();
      if (gitState) gitStateDirtyRef.current = true;
      if (fsDebounceRef.current) clearTimeout(fsDebounceRef.current);
      fsDebounceRef.current = setTimeout(() => {
        // Un cambio del árbol se resuelve releyendo el estado. Uno de `.git/`
        // no: cambiar de rama, borrar una o confirmar desde afuera mueve la
        // rama vigente y el log, y `refreshStatus` no los mira.
        //
        // Ale lo encontró validando: creó una rama desde la terminal y tardó en
        // aparecer; al borrarla tuvo que refrescar a mano. El evento llegaba
        // —la lista blanca de `.git/` funciona— pero de este lado sólo se
        // releía el árbol, así que la mitad de la cadena quedaba sin conectar.
        const gitStateChanged = gitStateDirtyRef.current;
        gitStateDirtyRef.current = false;
        void refreshStatus(target);
        if (gitStateChanged) {
          void refreshBranches(target);
          void refreshLog(target);
        }
      }, 150);
    });

    // Commits hechos por la propia aplicación —el archivado de un change—.
    // `repo:fs-change` sólo relee el estado del árbol, así que el grafo y el
    // log se quedaban en el commit anterior: los commits eran reales y la vista
    // los desconocía.
    const unsubCommits = window.api.onRepoCommitsChanged?.((changedPath) => {
      if (changedPath !== target) return;
      lastActivityRef.current = Date.now();
      void refreshLog(target);
      void refreshStatus(target);
      void refreshBranches(target);
    });

    const onFocus = () => refreshStatus(target);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshStatus(target);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Chokidar es el camino rápido. Este latido de ventana enfocada es la red
    // de seguridad para eventos que Windows, los editores o los guardados
    // atómicos pierden —y la única fuente durante una operación masiva, donde
    // chokidar sufre una tormenta de EPERM (tarea 1.2)—. Por eso no se elimina:
    // la cadencia es adaptativa, no nula. Un único intervalo; la frecuencia
    // efectiva la decide el cuerpo según haya actividad reciente o no.
    let tick = 0;
    const statusHeartbeat = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      tick += 1;
      const active = Date.now() - lastActivityRef.current < HEARTBEAT_ACTIVE_WINDOW_MS;
      if (active) {
        // Escalón activo: la guardia ahorra cuando el index no cambió, con una
        // lectura completa periódica (cada 3.ᵉʳ tick ≈ 6 s) que acota la
        // staleness de un evento que chokidar haya perdido.
        void refreshStatusIfChanged(target, { force: tick % HEARTBEAT_ACTIVE_FULL_EVERY === 0 });
      } else if (tick % HEARTBEAT_QUIET_READ_EVERY === 0) {
        // Escalón quieto: una lectura completa cada 5.ᵒ tick (≈ 10 s). Forzada
        // (sin guardia) para no dejar pasar un cambio que chokidar no vio.
        void refreshStatusIfChanged(target, { force: true });
      }
    }, HEARTBEAT_TICK_MS);

    return () => {
      unsubFsChange();
      unsubCommits?.();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(statusHeartbeat);
      if (fsDebounceRef.current) {
        clearTimeout(fsDebounceRef.current);
        fsDebounceRef.current = null;
      }
      void window.api?.repoUnwatch(target);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath]);
};
