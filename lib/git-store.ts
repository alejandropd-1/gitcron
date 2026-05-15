import { create } from 'zustand';
import type {
  StashEntry, SubmoduleEntry, GitHubUser,
  BranchTrackingInfo, WorktreeEntry, PullRequestEntry,
} from '@/types/electron';
import type { Lang } from '@/lib/i18n';

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

interface GitStore {
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
  // GitHub auth
  githubToken: string | null;
  githubUser: GitHubUser | null;
  // Preferences
  language: Lang;

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
  setGithubToken: (token: string | null) => void;
  setGithubUser: (user: GitHubUser | null) => void;
  setLanguage: (lang: Lang) => void;
}

export const useGitStore = create<GitStore>((set) => ({
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
  // Token starts null. It's hydrated asynchronously on app mount via
  // bootstrapGitHub() -> window.api.storageGet(). We DO NOT use localStorage:
  // tokens live encrypted at-rest via Electron's safeStorage (OS keychain).
  githubToken: null,
  githubUser: null,
  language: 'es',

  setRepoPath: (repoPath) => set({ repoPath }),
  setRepoName: (repoName) => set({ repoName }),
  setCurrentBranch: (currentBranch) => set({ currentBranch }),
  setCommitMessage: (commitMessage) => set({ commitMessage }),
  setSelectedCommit: (selectedCommit) => set({ selectedCommit }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  setCurrentDiff: (currentDiff) => set({ currentDiff }),
  setModifiedFiles: (modifiedFiles) => set({ modifiedFiles }),
  setCommits: (commits) => set({ commits }),
  setBranches: (branches) => set({ branches }),
  setRemoteBranches: (remoteBranches) => set({ remoteBranches }),
  setStashes: (stashes) => set({ stashes }),
  setTags: (tags) => set({ tags }),
  setSubmodules: (submodules) => set({ submodules }),
  setBranchTracking: (branchTracking) => set({ branchTracking }),
  setWorktrees: (worktrees) => set({ worktrees }),
  setPullRequests: (pullRequests) => set({ pullRequests }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  // Pure state setter — persistence is handled by hooks via IPC (safeStorage)
  setGithubToken: (githubToken) => set({ githubToken }),
  setLanguage: (language) => set({ language }),
  setGithubUser: (githubUser) => set({ githubUser }),
}));
