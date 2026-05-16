import { create } from 'zustand';
import type {
  StashEntry, SubmoduleEntry, GitHubUser,
  BranchTrackingInfo, WorktreeEntry, PullRequestEntry, RepoInfo,
} from '@/types/electron';
import type { Lang } from '@/lib/i18n';

export type FontSize = 'compact' | 'normal' | 'large';

export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
  parents: string[];
  refs?: string[];
}

export interface GitFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  staged: boolean;
  oldPath?: string;
}

export interface RepoState {
  path: string;
  name: string;
  currentBranch: string;
  branches: string[];
  remoteBranches: string[];
  commits: Commit[];
  modifiedFiles: GitFile[];
  stashes: StashEntry[];
  tags: string[];
  submodules: SubmoduleEntry[];
  branchTracking: Record<string, BranchTrackingInfo>;
  worktrees: WorktreeEntry[];
  pullRequests: PullRequestEntry[];
  commitMessage: string;
  selectedCommit: Commit | null;
  selectedFile: GitFile | null;
  currentDiff: string;
  graphShowAllBranches: boolean;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  lastFetchError: string | null;
}

interface GitStore {
  openRepos: RepoState[];
  activeRepoIdx: number;
  getActiveRepo: () => RepoState | null;
  updateActiveRepo: (patch: Partial<RepoState>) => void;
  updateRepoByPath: (path: string, patch: Partial<RepoState>) => void;
  addOrActivateRepo: (info: RepoInfo) => void;
  setActiveRepoIdx: (idx: number) => void;
  closeRepo: (idx: number) => void;

  // Legacy active-repo API. These fields mirror openRepos[activeRepoIdx] so
  // existing hooks/components can keep working while multi-repo lands in steps.
  repoPath: string | null;
  repoName: string | null;
  currentBranch: string;
  branches: string[];
  remoteBranches: string[];
  commits: Commit[];
  modifiedFiles: GitFile[];
  stashes: StashEntry[];
  tags: string[];
  submodules: SubmoduleEntry[];
  branchTracking: Record<string, BranchTrackingInfo>;
  worktrees: WorktreeEntry[];
  pullRequests: PullRequestEntry[];
  commitMessage: string;
  selectedCommit: Commit | null;
  selectedFile: GitFile | null;
  currentDiff: string;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  // GitHub auth
  githubToken: string | null;
  githubUser: GitHubUser | null;
  // Preferences
  language: Lang;
  fontSize: FontSize;
  defaultFolder: string | null;
  autoFetchEnabled: boolean;
  autoFetchIntervalMinutes: number;
  lastFetchTime: number | null;
  isFetchingRemote: boolean;
  osNotificationsEnabled: boolean;
  shortcuts: Record<string, string>;

  setRepoPath: (path: string | null) => void;
  setRepoName: (name: string | null) => void;
  setCurrentBranch: (branch: string) => void;
  setCommitMessage: (message: string) => void;
  setSelectedCommit: (commit: Commit | null) => void;
  setSelectedFile: (file: GitFile | null) => void;
  setCurrentDiff: (diff: string) => void;
  setModifiedFiles: (files: GitFile[]) => void;
  setCommits: (commits: Commit[]) => void;
  setBranches: (branches: string[]) => void;
  setRemoteBranches: (branches: string[]) => void;
  setStashes: (stashes: StashEntry[]) => void;
  setTags: (tags: string[]) => void;
  setSubmodules: (submodules: SubmoduleEntry[]) => void;
  setBranchTracking: (tracking: Record<string, BranchTrackingInfo>) => void;
  setWorktrees: (worktrees: WorktreeEntry[]) => void;
  setPullRequests: (prs: PullRequestEntry[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (message: string | null) => void;
  setGithubToken: (token: string | null) => void;
  setGithubUser: (user: GitHubUser | null) => void;
  setLanguage: (lang: Lang) => void;
  setFontSize: (size: FontSize) => void;
  setDefaultFolder: (folder: string | null) => void;
  setAutoFetchEnabled: (enabled: boolean) => void;
  setAutoFetchIntervalMinutes: (minutes: number) => void;
  setLastFetchTime: (ts: number | null) => void;
  setFetchingRemote: (fetching: boolean) => void;
  setOsNotificationsEnabled: (enabled: boolean) => void;
  setShortcuts: (shortcuts: Record<string, string>) => void;
  updateShortcut: (id: string, keys: string) => void;
  resetShortcuts: () => void;
}

type EmptyRepoFields = Omit<RepoState, 'path' | 'name'>;

function createEmptyRepoFields(): EmptyRepoFields {
  return {
    currentBranch: '',
    branches: [],
    remoteBranches: [],
    commits: [],
    modifiedFiles: [],
    stashes: [],
    tags: [],
    submodules: [],
    branchTracking: {},
    worktrees: [],
    pullRequests: [],
    commitMessage: '',
    selectedCommit: null,
    selectedFile: null,
    currentDiff: '',
    graphShowAllBranches: true,
    isLoading: false,
    error: null,
    success: null,
    lastFetchError: null,
  };
}

const emptyLegacyRepoState = {
  repoPath: null,
  repoName: null,
  ...createEmptyRepoFields(),
};

function repoNameFromPath(repoPath: string): string {
  return repoPath.split(/[\\/]/).filter(Boolean).pop() ?? repoPath;
}

function createRepoState(info: RepoInfo): RepoState {
  return {
    path: info.path,
    name: info.name,
    ...createEmptyRepoFields(),
    currentBranch: info.currentBranch,
  };
}

function legacyFromRepo(repo: RepoState | null) {
  if (!repo) return emptyLegacyRepoState;
  return {
    repoPath: repo.path,
    repoName: repo.name,
    currentBranch: repo.currentBranch,
    branches: repo.branches,
    remoteBranches: repo.remoteBranches,
    commits: repo.commits,
    modifiedFiles: repo.modifiedFiles,
    stashes: repo.stashes,
    tags: repo.tags,
    submodules: repo.submodules,
    branchTracking: repo.branchTracking,
    worktrees: repo.worktrees,
    pullRequests: repo.pullRequests,
    commitMessage: repo.commitMessage,
    selectedCommit: repo.selectedCommit,
    selectedFile: repo.selectedFile,
    currentDiff: repo.currentDiff,
    isLoading: repo.isLoading,
    error: repo.error,
    success: repo.success,
  };
}

function activeRepoFrom(openRepos: RepoState[], activeRepoIdx: number): RepoState | null {
  return openRepos[activeRepoIdx] ?? null;
}

export const useGitStore = create<GitStore>((set, get) => ({
  openRepos: [],
  activeRepoIdx: -1,
  getActiveRepo: () => activeRepoFrom(get().openRepos, get().activeRepoIdx),
  updateActiveRepo: (patch) => set((state) => {
    const activeRepo = activeRepoFrom(state.openRepos, state.activeRepoIdx);
    if (!activeRepo) return {};

    const openRepos = state.openRepos.map((repo, idx) => (
      idx === state.activeRepoIdx ? { ...repo, ...patch } : repo
    ));
    return {
      openRepos,
      ...legacyFromRepo(activeRepoFrom(openRepos, state.activeRepoIdx)),
    };
  }),
  updateRepoByPath: (path, patch) => set((state) => {
    const repoIdx = state.openRepos.findIndex((repo) => repo.path === path);
    if (repoIdx === -1) return {};

    const openRepos = state.openRepos.map((repo, idx) => (
      idx === repoIdx ? { ...repo, ...patch } : repo
    ));
    return {
      openRepos,
      ...legacyFromRepo(activeRepoFrom(openRepos, state.activeRepoIdx)),
    };
  }),
  addOrActivateRepo: (info) => set((state) => {
    const existingIdx = state.openRepos.findIndex((repo) => repo.path === info.path);
    const activeRepoIdx = existingIdx >= 0 ? existingIdx : state.openRepos.length;
    const openRepos = existingIdx >= 0
      ? state.openRepos.map((repo, idx) => (
        idx === existingIdx
          ? { ...repo, name: info.name, currentBranch: info.currentBranch }
          : repo
      ))
      : [...state.openRepos, createRepoState(info)];

    return {
      openRepos,
      activeRepoIdx,
      ...legacyFromRepo(activeRepoFrom(openRepos, activeRepoIdx)),
    };
  }),
  setActiveRepoIdx: (idx) => set((state) => {
    if (idx < 0 || idx >= state.openRepos.length) return {};
    return {
      activeRepoIdx: idx,
      ...legacyFromRepo(activeRepoFrom(state.openRepos, idx)),
    };
  }),
  closeRepo: (idx) => set((state) => {
    if (idx < 0 || idx >= state.openRepos.length) return {};

    const openRepos = state.openRepos.filter((_, repoIdx) => repoIdx !== idx);
    const activeRepoIdx = openRepos.length === 0
      ? -1
      : idx < state.activeRepoIdx
        ? state.activeRepoIdx - 1
        : Math.min(state.activeRepoIdx, openRepos.length - 1);

    return {
      openRepos,
      activeRepoIdx,
      ...legacyFromRepo(activeRepoFrom(openRepos, activeRepoIdx)),
    };
  }),

  repoPath: null,
  repoName: null,
  currentBranch: '',
  branches: [],
  remoteBranches: [],
  commits: [],
  modifiedFiles: [],
  stashes: [],
  tags: [],
  submodules: [],
  branchTracking: {},
  worktrees: [],
  pullRequests: [],
  commitMessage: '',
  selectedCommit: null,
  selectedFile: null,
  currentDiff: '',
  isLoading: false,
  error: null,
  success: null,
  // Token starts null. It's hydrated asynchronously on app mount via
  // bootstrapGitHub() -> window.api.storageGet(). We DO NOT use localStorage:
  // tokens live encrypted at-rest via Electron's safeStorage (OS keychain).
  githubToken: null,
  githubUser: null,
  language: 'es',
  fontSize: 'compact',
  defaultFolder: null,
  autoFetchEnabled: true,
  autoFetchIntervalMinutes: 10,
  lastFetchTime: null,
  isFetchingRemote: false,
  osNotificationsEnabled: true,
  shortcuts: {},

  setRepoPath: (repoPath) => set((state) => {
    if (!repoPath) {
      return { openRepos: [], activeRepoIdx: -1, ...emptyLegacyRepoState };
    }

    const existingIdx = state.openRepos.findIndex((repo) => repo.path === repoPath);
    const activeRepoIdx = existingIdx >= 0 ? existingIdx : state.openRepos.length;
    const openRepos = existingIdx >= 0
      ? state.openRepos
      : [
        ...state.openRepos,
        {
          path: repoPath,
          name: repoNameFromPath(repoPath),
          ...createEmptyRepoFields(),
        },
      ];

    return {
      openRepos,
      activeRepoIdx,
      ...legacyFromRepo(activeRepoFrom(openRepos, activeRepoIdx)),
    };
  }),
  setRepoName: (repoName) => get().updateActiveRepo({ name: repoName ?? '' }),
  setCurrentBranch: (currentBranch) => get().updateActiveRepo({ currentBranch }),
  setCommitMessage: (commitMessage) => get().updateActiveRepo({ commitMessage }),
  setSelectedCommit: (selectedCommit) => get().updateActiveRepo({ selectedCommit }),
  setSelectedFile: (selectedFile) => get().updateActiveRepo({ selectedFile }),
  setCurrentDiff: (currentDiff) => get().updateActiveRepo({ currentDiff }),
  setModifiedFiles: (modifiedFiles) => get().updateActiveRepo({ modifiedFiles }),
  setCommits: (commits) => get().updateActiveRepo({ commits }),
  setBranches: (branches) => get().updateActiveRepo({ branches }),
  setRemoteBranches: (remoteBranches) => get().updateActiveRepo({ remoteBranches }),
  setStashes: (stashes) => get().updateActiveRepo({ stashes }),
  setTags: (tags) => get().updateActiveRepo({ tags }),
  setSubmodules: (submodules) => get().updateActiveRepo({ submodules }),
  setBranchTracking: (branchTracking) => get().updateActiveRepo({ branchTracking }),
  setWorktrees: (worktrees) => get().updateActiveRepo({ worktrees }),
  setPullRequests: (pullRequests) => get().updateActiveRepo({ pullRequests }),
  setLoading: (isLoading) => {
    const state = get();
    if (state.activeRepoIdx >= 0) state.updateActiveRepo({ isLoading });
    else set({ isLoading });
  },
  setError: (error) => {
    const state = get();
    if (state.activeRepoIdx >= 0) state.updateActiveRepo({ error });
    else set({ error });
  },
  setSuccess: (success) => {
    const state = get();
    if (state.activeRepoIdx >= 0) state.updateActiveRepo({ success });
    else set({ success });
  },
  // Pure state setter — persistence is handled by hooks via IPC (safeStorage)
  setGithubToken: (githubToken) => set({ githubToken }),
  setLanguage: (language) => set({ language }),
  setFontSize: (fontSize) => set({ fontSize }),
  setDefaultFolder: (defaultFolder) => set({ defaultFolder }),
  setAutoFetchEnabled: (autoFetchEnabled) => set({ autoFetchEnabled }),
  setAutoFetchIntervalMinutes: (autoFetchIntervalMinutes) => set({ autoFetchIntervalMinutes }),
  setLastFetchTime: (lastFetchTime) => set({ lastFetchTime }),
  setFetchingRemote: (isFetchingRemote) => set({ isFetchingRemote }),
  setOsNotificationsEnabled: (osNotificationsEnabled) => set({ osNotificationsEnabled }),
  setShortcuts: (shortcuts) => set({ shortcuts }),
  updateShortcut: (id, keys) => set((s) => ({ shortcuts: { ...s.shortcuts, [id]: keys } })),
  resetShortcuts: () => set({ shortcuts: {} }),
  setGithubUser: (githubUser) => set({ githubUser }),
}));
