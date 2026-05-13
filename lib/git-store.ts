import { create } from 'zustand';

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
  avatar?: string;
  parents: string[];
}

export interface GitFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked';
  staged: boolean;
}

interface GitStore {
  currentBranch: string;
  branches: string[];
  commits: Commit[];
  modifiedFiles: GitFile[];
  commitMessage: string;
  selectedCommit: Commit | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentBranch: (branch: string) => void;
  setCommitMessage: (message: string) => void;
  setSelectedCommit: (commit: Commit | null) => void;
  setModifiedFiles: (files: GitFile[]) => void;
  setCommits: (commits: Commit[]) => void;
  setBranches: (branches: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useGitStore = create<GitStore>((set) => ({
  currentBranch: 'main',
  branches: ['main', 'feature/ui-refresh', 'fix/bug-123'],
  commits: [
    {
      hash: '371838',
      message: 'Update styling for top navigation and add new icons',
      author: 'Alejandro Delgado',
      date: '1 hour ago',
      parents: ['a9b4f2'],
    },
    {
      hash: 'a9b4f2',
      message: 'Refactor component hierarchy and shared models',
      author: 'S. Chen',
      date: '3 hours ago',
      parents: ['7c21e5'],
    },
    {
      hash: '7c21e5',
      message: 'Merge pull request #42 from feature/auth',
      author: 'Alejandro Delgado',
      date: 'Yesterday',
      parents: ['old-hash'],
    },
  ],
  modifiedFiles: [
    { path: 'src/components/TopAppBar.tsx', status: 'modified', staged: true },
    { path: 'src/icons/NavigationIcons.json', status: 'added', staged: false },
    { path: 'src/styles/old_nav.css', status: 'deleted', staged: false },
  ],
  commitMessage: '',
  selectedCommit: null,
  isLoading: false,
  error: null,

  setCurrentBranch: (currentBranch) => set({ currentBranch }),
  setCommitMessage: (commitMessage) => set({ commitMessage }),
  setSelectedCommit: (selectedCommit) => set({ selectedCommit }),
  setModifiedFiles: (modifiedFiles) => set({ modifiedFiles }),
  setCommits: (commits) => set({ commits }),
  setBranches: (branches) => set({ branches }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
