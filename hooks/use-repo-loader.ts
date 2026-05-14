'use client';

import { useGitStore } from '@/lib/git-store';
import type {
  CommitData, StatusFile, BranchData, StashEntry, SubmoduleEntry,
  RepoInfo, GitHubRepoInfo,
} from '@/types/electron';

export const useRepoLoader = () => {
  const {
    repoPath,
    setRepoPath,
    setRepoName,
    setCurrentBranch,
    setCommits,
    setModifiedFiles,
    setBranches,
    setRemoteBranches,
    setStashes,
    setTags,
    setSubmodules,
    setCurrentDiff,
    setLoading,
    setError,
  } = useGitStore();

  const applyRepoInfo = (info: RepoInfo) => {
    setRepoPath(info.path);
    setRepoName(info.name);
    setCurrentBranch(info.currentBranch);
  };

  const openRepo = async () => {
    if (!window.api) { setError('Electron API no disponible'); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.openRepo();
      if (result.success && result.data) applyRepoInfo(result.data);
      else setError(result.error ?? 'No se pudo abrir el repositorio');
    } catch (err: any) {
      setError(err.message ?? 'Error al abrir el repositorio');
    } finally { setLoading(false); }
  };

  /** Pick a parent folder via native dialog. Returns the chosen path or null. */
  const pickFolder = async (title?: string): Promise<string | null> => {
    if (!window.api) return null;
    const r = await window.api.pickFolder(title);
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
        applyRepoInfo(r.data);
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
        applyRepoInfo(r.data);
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

  const refreshLog = async (path?: string) => {
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitLog(target);
      if (result.success && result.data) {
        setCommits(result.data as CommitData[]);
      }
    } catch (err: any) { console.error('refreshLog error:', err); }
  };

  const refreshStatus = async (path?: string) => {
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitStatus(target);
      if (result.success && result.data) setModifiedFiles(result.data as StatusFile[]);
    } catch (err: any) { console.error('refreshStatus error:', err); }
  };

  const refreshBranches = async (path?: string) => {
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitBranches(target);
      if (result.success && result.data) {
        const data = result.data as BranchData;
        setBranches(data.local);
        setRemoteBranches(data.remote);
        setCurrentBranch(data.current);
      }
    } catch (err: any) { console.error('refreshBranches error:', err); }
  };

  const refreshStashes = async (path?: string) => {
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitStashList(target);
      if (result.success && result.data) setStashes(result.data as StashEntry[]);
    } catch (err: any) { console.error('refreshStashes error:', err); }
  };

  const refreshTags = async (path?: string) => {
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitTags(target);
      if (result.success && result.data) setTags(result.data as string[]);
    } catch (err: any) { console.error('refreshTags error:', err); }
  };

  const refreshSubmodules = async (path?: string) => {
    const target = path ?? repoPath;
    if (!target || !window.api) return;
    try {
      const result = await window.api.gitSubmodules(target);
      if (result.success && result.data) setSubmodules(result.data as SubmoduleEntry[]);
    } catch (err: any) { console.error('refreshSubmodules error:', err); }
  };

  const loadDiff = async (filePath: string, staged: boolean = false) => {
    if (!repoPath || !window.api) return;
    try {
      const result = await window.api.gitDiff(repoPath, filePath, staged);
      if (result.success) setCurrentDiff((result.data as string) ?? '');
      else { setCurrentDiff(''); setError(result.error ?? 'Error al cargar el diff'); }
    } catch (err: any) { setCurrentDiff(''); console.error('loadDiff error:', err); }
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
    ]);
  };

  return {
    openRepo,
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
    loadDiff,
    loadAll,
  };
};
