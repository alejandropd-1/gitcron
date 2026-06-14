'use client';

import { useEffect, useRef } from 'react';
import { useGitStore, type RepoState } from '@/lib/git-store';
import type {
  CommitData, StatusFile, BranchData, StashEntry, SubmoduleEntry,
  RepoInfo, GitHubRepoInfo, WorktreeEntry, PullRequestEntry, RemoteEntry,
} from '@/types/electron';

type GraphMode = 'classic' | 'chronometric';
type RefreshTarget = { target: string; hasExplicitPath: boolean };

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
      if (result.success && result.data) await applyRepoInfo(result.data);
      else setError(result.error ?? 'No se pudo abrir el repositorio');
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

  // Watch working-tree for changes so UNSTAGED updates without a manual git action.
  const fsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!repoPath || !window.api) return;
    const target = repoPath;

    window.api.repoWatch(target);

    const unsubFsChange = window.api.onRepoFsChange((changedPath) => {
      if (changedPath !== target) return;
      if (fsDebounceRef.current) clearTimeout(fsDebounceRef.current);
      fsDebounceRef.current = setTimeout(() => refreshStatus(target), 150);
    });

    const onFocus = () => refreshStatus(target);
    window.addEventListener('focus', onFocus);

    return () => {
      unsubFsChange();
      window.removeEventListener('focus', onFocus);
      window.api?.repoUnwatch(target);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath]);

  return {
    openRepo,
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
