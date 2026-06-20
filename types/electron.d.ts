import type {
  TemporalAgentConfig,
  TemporalAgentNotes,
  TemporalAgentDecision,
  PredictionResult,
  MaterializeIdeaInput,
  MaterializationResult,
} from './temporal-agent';
import type { PredictionHistoryEntry } from '../electron/db/types';
import type { ApplyHunkOptions, FileDiff } from '../lib/hunk-patch';
import type { CartoScanResult } from '../electron/ipc/carto';
import type {
  CartoGraphStatus,
  CartoSearchHit,
  CartoRelatedSymbol,
  CartoImpact,
  CartoFileRelations,
} from '../lib/carto-types';
import type {
  CartoAINodeRef,
  CartoAIContext,
  CartoAIResponse,
  CartoAISettings,
  CartoAIProbe,
} from './carto-ai';

interface GitResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  isAuthError?: boolean;
  status?: number;
  mergeInProgress?: boolean;
  rebaseInProgress?: boolean;
}

export interface RebaseCommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  subject: string;
  isPushed: boolean;
}

export type RebaseAction = 'pick' | 'reword' | 'squash' | 'fixup' | 'drop';

export interface RebasePlanItem {
  hash: string;
  action: RebaseAction;
  newMessage?: string;
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
  conflicted?: boolean;
}

interface GitCleanResult {
  files: string[];
  deleted?: string[];
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
  baseBranch: string;
  url: string;
  draft: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface PullRequestDiffFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  previousFilename?: string;
}

export interface PullRequestDiffData extends PullRequestEntry {
  diff: string;
  files: PullRequestDiffFile[];
}

export interface FileHistoryEntry extends CommitData {
  filePath: string;
}

export interface BlameLine {
  lineNo: number;
  content: string;
  commitHash: string;
  shortHash: string;
  author: string;
  authorEmail?: string;
  authorTime: string;
  summary: string;
  previousCommitHash?: string;
  previousPath?: string;
  isUncommitted: boolean;
}

interface RemoteOpResult {
  success: boolean;
  error?: string;
  authRequired?: boolean;
  conflict?: boolean;
  summary?: string;
  files?: string[];
}

export interface StashEntry {
  index: number;
  message: string;
  hash: string;
  date: string;
}

interface StashPreviewData {
  files: string[];
  diff: string;
}

export interface SubmoduleEntry {
  hash: string;
  path: string;
  describe?: string;
}

export interface RemoteEntry {
  name: string;
  fetchUrl?: string;
  pushUrl?: string;
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
  githubCreateRepo: (token: string, name: string, isPrivate: boolean, description?: string, autoInit?: boolean) => Promise<GitResult<CreatedRepoInfo>>;
  fsExistsAndNotEmpty: (parentPath: string, name: string) => Promise<GitResult<boolean>>;
  githubListUserRepos: (token: string) => Promise<GitResult<GitHubRepoInfo[]>>;
  gitLog: (repoPath: string, opts?: { allBranches?: boolean }) => Promise<GitResult<CommitData[]>>;
  gitStatus: (repoPath: string) => Promise<GitResult<StatusFile[]>>;
  gitBranches: (repoPath: string) => Promise<GitResult<BranchData>>;
  gitCheckout: (repoPath: string, branch: string) => Promise<GitResult>;
  gitCreateBranch: (repoPath: string, name: string, fromHash?: string) => Promise<GitResult>;
  gitRestoreMaterializedBranch: (
    repoPath: string,
    branchName: string,
    sourceTag: string,
  ) => Promise<GitResult<{ branchName: string; sourceTag: string }>>;
  gitMergeBranch: (repoPath: string, sourceBranch: string) => Promise<GitResult>;
  gitRebase: (repoPath: string, ontoBranch: string) => Promise<GitResult>;
  gitFastForward: (repoPath: string, branch: string, toRef: string) => Promise<GitResult>;
  gitRenameBranch: (repoPath: string, oldName: string, newName: string) => Promise<GitResult>;
  gitDeleteBranch: (repoPath: string, branch: string, force?: boolean) => Promise<GitResult<{ notMerged?: boolean }>>;
  gitPullBranch: (repoPath: string, branch: string, token?: string) => Promise<GitResult>;
  gitPushBranch: (repoPath: string, branch: string, token?: string, force?: boolean) => Promise<GitResult>;
  gitPush: (repoPath: string, token?: string) => Promise<GitResult<RemoteOpResult>>;
  gitPull: (repoPath: string, token?: string) => Promise<GitResult<RemoteOpResult>>;
  gitPullFastForward: (repoPath: string, token?: string) => Promise<GitResult<RemoteOpResult>>;
  gitPullRebase: (repoPath: string, token?: string) => Promise<GitResult<RemoteOpResult>>;
  gitPullMerge: (repoPath: string, token?: string) => Promise<GitResult<RemoteOpResult>>;
  gitFetch: (repoPath: string, token?: string) => Promise<GitResult<RemoteOpResult>>;
  gitStage: (repoPath: string, filePath: string) => Promise<GitResult>;
  gitUnstage: (repoPath: string, filePath: string) => Promise<GitResult>;
  gitStageBatch: (repoPath: string, filePaths: string[]) => Promise<GitResult>;
  gitUnstageBatch: (repoPath: string, filePaths: string[]) => Promise<GitResult>;
  gitRemoveLock: (repoPath: string) => Promise<GitResult<{ removed: boolean }>>;
  gitTrustSafeDirectory: (repoPath: string) => Promise<GitResult<{ path: string }>>;
  gitAmend: (repoPath: string, newMessage?: string) => Promise<GitResult<{ hash: string; shortHash: string }>>;
  gitCherryPick: (repoPath: string, hash: string) => Promise<GitResult>;
  gitSquash: (repoPath: string, n: number, message: string) => Promise<GitResult<{ hash: string; shortHash: string }>>;
  gitRebasePrepare: (repoPath: string, commitHash: string) => Promise<GitResult<RebaseCommitInfo[]>>;
  gitRebaseStart: (
    repoPath: string,
    baseHash: string,
    plan: RebasePlanItem[],
  ) => Promise<GitResult<{ success: boolean; conflict?: boolean }>>;
  gitRebaseContinue: (repoPath: string) => Promise<GitResult<{ success: boolean; conflict?: boolean }>>;
  gitRebaseAbort: (repoPath: string) => Promise<GitResult>;
  gitRebaseUndo: (repoPath: string, targetRef: string) => Promise<GitResult>;
  gitShowFiles: (repoPath: string, hash: string) => Promise<GitResult<StatusFile[]>>;
  gitDiffAtCommit: (repoPath: string, filePath: string, hash: string) => Promise<GitResult<string>>;
  gitFileHistory: (repoPath: string, filePath: string, limit?: number) => Promise<GitResult<FileHistoryEntry[]>>;
  gitBlame: (repoPath: string, filePath: string, rev?: string) => Promise<GitResult<BlameLine[]>>;
  gitAddToGitignore: (repoPath: string, filePath: string) => Promise<GitResult<{ alreadyIgnored: boolean }>>;
  gitResetAll: (repoPath: string) => Promise<GitResult>;
  gitClean: (repoPath: string, files?: string[]) => Promise<GitResult<GitCleanResult>>;
  gitReadFile: (repoPath: string, filePath: string) => Promise<GitResult<string>>;
  gitResolveConflictFile: (repoPath: string, filePath: string, content: string) => Promise<GitResult>;
  gitStashFile: (repoPath: string, filePath: string) => Promise<GitResult>;
  shellShowInFolder: (repoPath: string, relativeFilePath: string) => Promise<GitResult>;
  shellOpenItem: (repoPath: string, relativeFilePath: string) => Promise<GitResult>;
  fsDeleteFile: (repoPath: string, relativeFilePath: string) => Promise<GitResult>;
  gitDiff: (repoPath: string, filePath: string, staged?: boolean) => Promise<GitResult<string>>;
  gitDiffHunks: (repoPath: string, filePath: string, staged?: boolean) => Promise<GitResult<FileDiff>>;
  gitApplyHunk: (
    repoPath: string,
    filePath: string,
    hunkPatch: string,
    options: ApplyHunkOptions,
  ) => Promise<GitResult>;
  gitStashList: (repoPath: string) => Promise<GitResult<StashEntry[]>>;
  gitStashPush: (repoPath: string, message?: string) => Promise<GitResult>;
  gitStashApply: (repoPath: string, index: number) => Promise<GitResult>;
  gitStashPop: (repoPath: string, index: number) => Promise<GitResult>;
  gitStashDrop: (repoPath: string, index: number) => Promise<GitResult>;
  gitStashPreview: (repoPath: string, index: number) => Promise<GitResult<StashPreviewData>>;
  gitStashClear: (repoPath: string) => Promise<GitResult>;
  gitDeleteTag: (repoPath: string, tagName: string) => Promise<GitResult>;
  gitCreateTag: (repoPath: string, tagName: string, commitHash: string, message?: string) => Promise<GitResult>;
  gitPushTag: (repoPath: string, tagName: string, token?: string) => Promise<GitResult>;
  gitResetCommit: (repoPath: string, commitHash: string, mode: 'soft' | 'mixed' | 'hard') => Promise<GitResult>;
  gitTags: (repoPath: string) => Promise<GitResult<string[]>>;
  gitSubmodules: (repoPath: string) => Promise<GitResult<SubmoduleEntry[]>>;
  gitWorktrees: (repoPath: string) => Promise<GitResult<WorktreeEntry[]>>;

  // Remotes
  gitRemotesList: (repoPath: string) => Promise<GitResult<RemoteEntry[]>>;
  gitRemoteAdd: (repoPath: string, name: string, url: string) => Promise<GitResult>;
  gitRemoteRemove: (repoPath: string, name: string) => Promise<GitResult>;
  gitRemoteSetUrl: (repoPath: string, name: string, url: string) => Promise<GitResult>;
  gitRemoteRename: (repoPath: string, oldName: string, newName: string) => Promise<GitResult>;

  // Worktrees
  gitWorktreeAdd: (repoPath: string, path: string, branch: string) => Promise<GitResult>;
  gitWorktreeRemove: (repoPath: string, path: string, force?: boolean) => Promise<GitResult>;

  // Submodules
  gitSubmoduleUpdate: (repoPath: string, path?: string, init?: boolean) => Promise<GitResult>;
  gitSubmoduleAdd: (repoPath: string, url: string, path: string) => Promise<GitResult>;
  gitSubmoduleSync: (repoPath: string) => Promise<GitResult>;
  githubListPRs: (token: string, repoPath: string) => Promise<GitResult<PullRequestEntry[]>>;
  githubGetPRDiff: (token: string, repoPath: string, number: number) => Promise<GitResult<PullRequestDiffData>>;
  terminalOpen: (repoPath: string) => Promise<GitResult>;
  shellOpenPath: (targetPath: string) => Promise<GitResult>;
  shellOpenExternal: (url: string) => Promise<GitResult>;
  storageSet: (key: string, value: string) => Promise<GitResult>;
  storageGet: (key: string) => Promise<GitResult<string | null>>;
  storageDelete: (key: string) => Promise<GitResult>;
  checkForUpdate: () => Promise<GitResult>;
  downloadUpdate: () => Promise<GitResult>;
  installUpdate: () => Promise<GitResult>;
  getChangelog: () => Promise<GitResult<string>>;
  windowMinimize: () => Promise<GitResult>;
  windowToggleMaximize: () => Promise<GitResult<{ maximized: boolean }>>;
  windowClose: () => Promise<GitResult>;
  onUpdateNotAvailable: (cb: () => void) => () => void;
  onUpdateAvailable: (cb: (info: { version: string; currentVersion: string; releaseDate?: string }) => void) => () => void;
  onUpdateDownloaded: (cb: (info: { version: string; currentVersion: string; releaseDate?: string }) => void) => () => void;
  onUpdateError: (cb: (msg: string) => void) => () => void;
  onDownloadProgress: (cb: (info: { percent: number; transferred: number; total: number }) => void) => () => void;
  /** Cartografía: escaneo de SOLO LECTURA del árbol de archivos del repo activo. */
  cartoScanTree: (repoPath: string) => Promise<GitResult<CartoScanResult>>;
  /**
   * Cartografía Fase 3: motor CodeGraph embebido (local, solo lectura). Devuelve
   * SIEMPRE el contrato normalizado (lib/carto-types), nunca la forma cruda del motor.
   * Las queries devuelven `data: null` mientras el índice no esté `ready`.
   */
  cartoGraph: {
    /** Abre/indexa el repo en background. No bloquea; el avance llega por onProgress. */
    ensure(repoPath: string): Promise<GitResult<CartoGraphStatus>>;
    status(repoPath: string): Promise<GitResult<CartoGraphStatus>>;
    search(repoPath: string, query: string, limit?: number): Promise<GitResult<CartoSearchHit[] | null>>;
    callers(repoPath: string, nodeId: string): Promise<GitResult<CartoRelatedSymbol[] | null>>;
    callees(repoPath: string, nodeId: string): Promise<GitResult<CartoRelatedSymbol[] | null>>;
    impact(repoPath: string, nodeId: string): Promise<GitResult<CartoImpact | null>>;
    fileRelations(repoPath: string, filePath: string): Promise<GitResult<CartoFileRelations | null>>;
    /** Avance del indexado del repo. Devuelve un disposer. */
    onProgress(cb: (payload: { repoPath: string; status: CartoGraphStatus }) => void): () => void;
    /** El watch re-sincronizó el índice del repo (relaciones frescas). Devuelve un disposer. */
    onUpdated(cb: (payload: { repoPath: string }) => void): () => void;
  };
  /**
   * Cartografía Fase 4: capa de proveedor de IA (local LM Studio / online).
   * Opt-in y apagada por defecto. Las API keys nunca cruzan al renderer: se usan
   * sólo en main. Con la IA apagada o el proveedor caído, los métodos devuelven
   * `success: false` con un mensaje claro y la vista sigue funcionando sin IA.
   */
  cartoAi: {
    getSettings(): Promise<GitResult<CartoAISettings>>;
    setSettings(patch: Partial<CartoAISettings>): Promise<GitResult<CartoAISettings>>;
    /** Sondea disponibilidad sin gastar una generación (servidor local / key online). */
    probe(): Promise<GitResult<CartoAIProbe>>;
    explain(node: CartoAINodeRef, context: CartoAIContext): Promise<GitResult<CartoAIResponse>>;
    ask(question: string, context: CartoAIContext): Promise<GitResult<CartoAIResponse>>;
  };
  repoWatch: (targetPath: string) => Promise<GitResult>;
  repoUnwatch: (targetPath: string) => Promise<GitResult>;
  onRepoFsChange: (cb: (repoPath: string) => void) => () => void;
  materializeIdea(repoPath: string, idea: MaterializeIdeaInput): Promise<GitResult<MaterializationResult>>;
  ai: {
    predictTimelines(repoPath: string, repoName: string, lang?: string): Promise<GitResult<PredictionResult>>;
    loadPrediction(repoPath: string): Promise<GitResult<PredictionResult | null>>;
    hasKey(provider: string): Promise<GitResult<boolean>>;
    keyFingerprint(provider: string): Promise<GitResult<string | null>>;
    /** One-way: submits a key to be encrypted in main. The key never comes back. */
    setKey(provider: string, key: string): Promise<GitResult>;
    removeKey(provider: string): Promise<GitResult>;
    cancelPrediction(): Promise<GitResult>;
  };
  temporalAgent: {
    loadConfig(repoPath: string, repoName: string): Promise<TemporalAgentConfig>;
    saveConfig(repoPath: string, config: TemporalAgentConfig): Promise<{ success: true }>;
    loadNotes(repoPath: string, repoName: string): Promise<TemporalAgentNotes>;
    getNotesMarkdown(repoPath: string, repoName: string): Promise<string>;
    recordDecision(
      repoPath: string,
      repoName: string,
      decision: TemporalAgentDecision,
    ): Promise<TemporalAgentNotes>;
    removeDecision(
      repoPath: string,
      repoName: string,
      suggestionTitle: string,
    ): Promise<TemporalAgentNotes>;
    getHistory(repoPath?: string | null): Promise<PredictionHistoryEntry[]>;
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
