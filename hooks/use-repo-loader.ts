'use client';

import { useGitStore } from '@/lib/git-store';
import type {
  CommitData, StatusFile, BranchData, StashEntry, SubmoduleEntry,
  RepoInfo, GitHubRepoInfo, WorktreeEntry, PullRequestEntry,
} from '@/types/electron';

export const useRepoLoader = () => {
  const {
    openRepos,
    repoPath,
    setCommits,
    setModifiedFiles,
    setBranches,
    setRemoteBranches,
    setCurrentBranch,
    setStashes,
    setTags,
    setSubmodules,
    setBranchTracking,
    setWorktrees,
    setPullRequests,
    updateRepoByPath,
    addOrActivateRepo,
    setActiveRepoIdx,
    closeRepo: closeRepoInStore,
    githubToken,
    setCurrentDiff,
    setLoading,
    setError,
  } = useGitStore();

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

  const applyRepoInfo = async (info: RepoInfo) => {
    addOrActivateRepo(info);
    await persistOpenRepos();
  };

  const openRepo = async () => {
    if (!window.api) { setError('Electron API no disponible'); return; }
    setLoading(true); setError(null);
    try {
      const defaultFolder = useGitStore.getState().defaultFolder ?? undefined;
      const result = await window.api.openRepo(defaultFolder);
      if (result.success && result.data) await applyRepoInfo(result.data);
      else setError(result.error ?? 'No se pudo abrir el repositorio');
    } catch (err: any) {
      setError(err.message ?? 'Error al abrir el repositorio');
    } finally { setLoading(false); }
  };

  /** Restore the last opened repo on startup — no dialog. Silently ignores errors. */
  const restoreLastRepo = async () => {
    if (!window.api) return;
    const savedPaths = await window.api.storageGet('openRepoPaths').catch(() => null);
    if (savedPaths?.success && typeof savedPaths.data === 'string') {
      let paths: string[] = [];
      let hasRepoList = false;
      try {
        const rawPaths = savedPaths.data;
        const parsed = JSON.parse(rawPaths);
        if (Array.isArray(parsed)) {
          hasRepoList = true;
          paths = parsed.filter((path): path is string => typeof path === 'string' && path.length > 0);
        }
      } catch { /* fall back to lastRepoPath */ }

      if (hasRepoList) {
        if (paths.length === 0) {
          await persistOpenRepos();
          return;
        }

        const activeSaved = await window.api.storageGet('activeRepoPath').catch(() => null);
        const activePath = activeSaved?.success ? activeSaved.data : null;
        const opened: RepoInfo[] = [];

        for (const path of paths) {
          try {
            const result = await window.api.openPath(path);
            if (result.success && result.data) {
              addOrActivateRepo(result.data);
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
    setLoading(true); setError(null);
    try {
      const r = await window.api.gitInit(parentPath, name, withInitialCommit);
      if (r.success && r.data) {
        await applyRepoInfo(r.data);
        return { success: true as const };
      }
      setError(r.error ?? 'Error al inicializar el repo');
      return { success: false as const, error: r.error };
    } finally { setLoading(false); }
  };

  /** Clone an existing repo. token is optional (used for private GH repos). */
  const cloneRepo = async (url: string, parentPath: string, folderName: string, token?: string) => {
    if (!window.api) return { success: false as const, error: 'Electron API no disponible' };
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
    } finally { setLoading(false); }
  };

  /** Create a repo on GitHub. Returns the clone URL (caller decides if to clone). */
  const createGitHubRepo = async (token: string, name: string, isPrivate: boolean, description?: string) => {
    if (!window.api) return { success: false as const, error: 'Electron API no disponible' };
    setLoading(true); setError(null);
    try {
      const r = await window.api.githubCreateRepo(token, name, isPrivate, description);
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
    const hasExplicitPath = path !== undefined;
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const state = useGitStore.getState();
      const repoEntry = state.openRepos.find((r) => r.path === target);
      const allBranches = opts?.allBranches ?? repoEntry?.graphShowAllBranches ?? true;
      const result = await window.api.gitLog(target, { allBranches });
      if (result.success && result.data) {
        const commits = result.data as CommitData[];
        if (hasExplicitPath) updateRepoByPath(target, { commits });
        else setCommits(commits);
      }
    } catch (err: any) { console.error('refreshLog error:', err); }
  };

  const refreshStatus = async (path?: string) => {
    const hasExplicitPath = path !== undefined;
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitStatus(target);
      if (result.success && result.data) {
        const modifiedFiles = result.data as StatusFile[];
        if (hasExplicitPath) updateRepoByPath(target, { modifiedFiles });
        else setModifiedFiles(modifiedFiles);
      }
    } catch (err: any) { console.error('refreshStatus error:', err); }
  };

  const refreshBranches = async (path?: string) => {
    const hasExplicitPath = path !== undefined;
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitBranches(target);
      if (result.success && result.data) {
        const data = result.data as BranchData;
        if (hasExplicitPath) {
          updateRepoByPath(target, {
            branches: data.local,
            remoteBranches: data.remote,
            currentBranch: data.current,
            ...(data.tracking ? { branchTracking: data.tracking } : {}),
          });
        } else {
          setBranches(data.local);
          setRemoteBranches(data.remote);
          setCurrentBranch(data.current);
          if (data.tracking) setBranchTracking(data.tracking);
        }
      }
    } catch (err: any) { console.error('refreshBranches error:', err); }
  };

  const refreshWorktrees = async (path?: string) => {
    const hasExplicitPath = path !== undefined;
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitWorktrees(target);
      if (result.success && result.data) {
        const worktrees = result.data as WorktreeEntry[];
        if (hasExplicitPath) updateRepoByPath(target, { worktrees });
        else setWorktrees(worktrees);
      }
    } catch (err: any) { console.error('refreshWorktrees error:', err); }
  };

  const refreshPullRequests = async (path?: string) => {
    const hasExplicitPath = path !== undefined;
    const target = path ?? repoPath;
    if (!target || !window.api || !githubToken) return;
    try {
      const result = await window.api.githubListPRs(githubToken, target);
      if (result.success && result.data) {
        const pullRequests = result.data as PullRequestEntry[];
        if (hasExplicitPath) updateRepoByPath(target, { pullRequests });
        else setPullRequests(pullRequests);
      }
    } catch (err: any) { console.error('refreshPullRequests error:', err); }
  };

  const refreshStashes = async (path?: string) => {
    const hasExplicitPath = path !== undefined;
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitStashList(target);
      if (result.success && result.data) {
        const stashes = result.data as StashEntry[];
        if (hasExplicitPath) updateRepoByPath(target, { stashes });
        else setStashes(stashes);
      }
    } catch (err: any) { console.error('refreshStashes error:', err); }
  };

  const refreshTags = async (path?: string) => {
    const hasExplicitPath = path !== undefined;
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitTags(target);
      if (result.success && result.data) {
        const tags = result.data as string[];
        if (hasExplicitPath) updateRepoByPath(target, { tags });
        else setTags(tags);
      }
    } catch (err: any) { console.error('refreshTags error:', err); }
  };

  const refreshSubmodules = async (path?: string) => {
    const hasExplicitPath = path !== undefined;
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitSubmodules(target);
      if (result.success && result.data) {
        const submodules = result.data as SubmoduleEntry[];
        if (hasExplicitPath) updateRepoByPath(target, { submodules });
        else setSubmodules(submodules);
      }
    } catch (err: any) { console.error('refreshSubmodules error:', err); }
  };

  const loadDiff = async (filePath: string, staged: boolean = false, path?: string) => {
    const hasExplicitPath = path !== undefined;
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    const targetRepo = openRepos.find((repo) => repo.path === target);
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
      refreshWorktrees(target),
      refreshPullRequests(target),
    ]);
  };

  return {
    openRepo,
    restoreLastRepo,
    closeRepo,
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
    refreshWorktrees,
    refreshPullRequests,
    loadDiff,
    loadAll,
  };
};
