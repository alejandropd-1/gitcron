interface GitResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RepoInfo {
  path: string;
  name: string;
  currentBranch: string;
  isGitRepo: boolean;
}

export interface CommitData {
  hash: string;
  shortHash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
  parents: string[];
  refs?: string[]; // branch/tag pointers at this commit
}

export interface StatusFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  staged: boolean;
  oldPath?: string;
}

export interface BranchTrackingInfo {
  upstream: string | null;
  ahead: number;
  behind: number;
  gone: boolean;       // true when upstream was deleted
}

export interface BranchData {
  local: string[];
  remote: string[];
  current: string;
  tracking?: Record<string, BranchTrackingInfo>;
}

export interface WorktreeEntry {
  path: string;
  head?: string;
  branch?: string;
  bare?: boolean;
  detached?: boolean;
}

export interface PullRequestEntry {
  number: number;
  title: string;
  author: string;
  branch: string;
  url: string;
  draft: boolean;
}

interface RemoteOpResult {
  success: boolean;
  error?: string;
  authRequired?: boolean;
  summary?: string;
}

export interface StashEntry {
  index: number;
  message: string;
  hash: string;
  date: string;
}

export interface SubmoduleEntry {
  hash: string;
  path: string;
  describe?: string;
}

interface DeviceCodeInfo {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface GitHubRepoInfo {
  name: string;
  fullName: string;
  cloneUrl: string;
  private: boolean;
  description: string | null;
  updatedAt: string | null;
}

interface CreatedRepoInfo {
  cloneUrl: string;
  htmlUrl: string;
  fullName: string;
  name: string;
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  email: string | null;
}

interface ElectronAPI {
  gitCommand: (repoPath: string, args: string[]) => Promise<GitResult<string>>;
  githubTest: (token: string, owner: string, repo: string) => Promise<GitResult>;
  githubAuth: (token: string) => Promise<GitResult<GitHubUser>>;
  githubDeviceStart: () => Promise<GitResult<DeviceCodeInfo>>;
  githubDevicePoll: (deviceCode: string) => Promise<GitResult<{ accessToken?: string; pending?: boolean }>>;
  openRepo: (defaultPath?: string) => Promise<GitResult<RepoInfo>>;
  openPath: (dirPath: string) => Promise<GitResult<RepoInfo>>;
  pickFolder: (title?: string, defaultPath?: string) => Promise<GitResult<string>>;
  gitInit: (parentPath: string, name: string, withInitialCommit?: boolean) => Promise<GitResult<RepoInfo>>;
  gitClone: (url: string, parentPath: string, folderName: string, token?: string) => Promise<GitResult<RepoInfo>>;
  githubCreateRepo: (token: string, name: string, isPrivate: boolean, description?: string) => Promise<GitResult<CreatedRepoInfo>>;
  githubListUserRepos: (token: string) => Promise<GitResult<GitHubRepoInfo[]>>;
  gitLog: (repoPath: string, opts?: { allBranches?: boolean }) => Promise<GitResult<CommitData[]>>;
  gitStatus: (repoPath: string) => Promise<GitResult<StatusFile[]>>;
  gitBranches: (repoPath: string) => Promise<GitResult<BranchData>>;
  gitCheckout: (repoPath: string, branch: string) => Promise<GitResult>;
  gitCreateBranch: (repoPath: string, name: string, fromHash?: string) => Promise<GitResult>;
  gitMergeBranch: (repoPath: string, sourceBranch: string) => Promise<GitResult>;
  gitRebase: (repoPath: string, ontoBranch: string) => Promise<GitResult>;
  gitFastForward: (repoPath: string, branch: string, toRef: string) => Promise<GitResult>;
  gitRenameBranch: (repoPath: string, oldName: string, newName: string) => Promise<GitResult>;
  gitDeleteBranch: (repoPath: string, branch: string, force?: boolean) => Promise<GitResult<{ notMerged?: boolean }>>;
  gitPullBranch: (repoPath: string, branch: string, token?: string) => Promise<GitResult>;
  gitPushBranch: (repoPath: string, branch: string, token?: string) => Promise<GitResult>;
  gitPush: (repoPath: string, token?: string) => Promise<GitResult<RemoteOpResult>>;
  gitPull: (repoPath: string, token?: string) => Promise<GitResult<RemoteOpResult>>;
  gitFetch: (repoPath: string, token?: string) => Promise<GitResult<RemoteOpResult>>;
  gitStage: (repoPath: string, filePath: string) => Promise<GitResult>;
  gitUnstage: (repoPath: string, filePath: string) => Promise<GitResult>;
  gitStageBatch: (repoPath: string, filePaths: string[]) => Promise<GitResult>;
  gitUnstageBatch: (repoPath: string, filePaths: string[]) => Promise<GitResult>;
  gitRemoveLock: (repoPath: string) => Promise<GitResult<{ removed: boolean }>>;
  gitAmend: (repoPath: string, newMessage?: string) => Promise<GitResult<{ hash: string; shortHash: string }>>;
  gitCherryPick: (repoPath: string, hash: string) => Promise<GitResult>;
  gitSquash: (repoPath: string, n: number, message: string) => Promise<GitResult<{ hash: string; shortHash: string }>>;
  gitShowFiles: (repoPath: string, hash: string) => Promise<GitResult<StatusFile[]>>;
  gitDiffAtCommit: (repoPath: string, filePath: string, hash: string) => Promise<GitResult<string>>;
  gitAddToGitignore: (repoPath: string, filePath: string) => Promise<GitResult<{ alreadyIgnored: boolean }>>;
  gitResetAll: (repoPath: string) => Promise<GitResult>;
  gitStashFile: (repoPath: string, filePath: string) => Promise<GitResult>;
  shellShowInFolder: (repoPath: string, relativeFilePath: string) => Promise<GitResult>;
  shellOpenItem: (repoPath: string, relativeFilePath: string) => Promise<GitResult>;
  fsDeleteFile: (repoPath: string, relativeFilePath: string) => Promise<GitResult>;
  gitDiff: (repoPath: string, filePath: string, staged?: boolean) => Promise<GitResult<string>>;
  gitStashList: (repoPath: string) => Promise<GitResult<StashEntry[]>>;
  gitStashApply: (repoPath: string, index: number) => Promise<GitResult>;
  gitStashDrop: (repoPath: string, index: number) => Promise<GitResult>;
  gitStashClear: (repoPath: string) => Promise<GitResult>;
  gitTags: (repoPath: string) => Promise<GitResult<string[]>>;
  gitSubmodules: (repoPath: string) => Promise<GitResult<SubmoduleEntry[]>>;
  gitWorktrees: (repoPath: string) => Promise<GitResult<WorktreeEntry[]>>;
  githubListPRs: (token: string, repoPath: string) => Promise<GitResult<PullRequestEntry[]>>;
  terminalOpen: (repoPath: string) => Promise<GitResult>;
  shellOpenPath: (targetPath: string) => Promise<GitResult>;
  storageSet: (key: string, value: string) => Promise<GitResult>;
  storageGet: (key: string) => Promise<GitResult<string | null>>;
  storageDelete: (key: string) => Promise<GitResult>;
  checkForUpdate: () => Promise<GitResult>;
  onUpdateNotAvailable: (cb: () => void) => () => void;
  onUpdateError: (cb: (msg: string) => void) => () => void;
  onDownloadProgress: (cb: (info: { percent: number; transferred: number; total: number }) => void) => () => void;
  repoWatch: (targetPath: string) => Promise<GitResult>;
  repoUnwatch: (targetPath: string) => Promise<GitResult>;
  onRepoFsChange: (cb: (repoPath: string) => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
