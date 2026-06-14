import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  gitCommand: (repoPath: string, args: string[]) => ipcRenderer.invoke('git:command', repoPath, args),
  githubTest: (token: string, owner: string, repo: string) =>
    ipcRenderer.invoke('github:test', { token, owner, repo }),
  githubAuth: (token: string) => ipcRenderer.invoke('github:auth', token),
  githubDeviceStart: () => ipcRenderer.invoke('github:device-start'),
  githubDevicePoll: (deviceCode: string) => ipcRenderer.invoke('github:device-poll', deviceCode),
  openRepo: (defaultPath?: string) => ipcRenderer.invoke('git:open-repo', defaultPath),
  openPath: (dirPath: string) => ipcRenderer.invoke('git:open-path', dirPath),
  pickFolder: (title?: string, defaultPath?: string) => ipcRenderer.invoke('fs:pick-folder', title, defaultPath),
  gitInit: (parentPath: string, name: string, withInitialCommit?: boolean) =>
    ipcRenderer.invoke('git:init', parentPath, name, withInitialCommit ?? true),
  gitClone: (url: string, parentPath: string, folderName: string, token?: string) =>
    ipcRenderer.invoke('git:clone', url, parentPath, folderName, token),
  githubCreateRepo: (token: string, name: string, isPrivate: boolean, description?: string, autoInit?: boolean) =>
    ipcRenderer.invoke('github:create-repo', token, name, isPrivate, description, autoInit),
  fsExistsAndNotEmpty: (parentPath: string, name: string) =>
    ipcRenderer.invoke('fs:exists-and-not-empty', parentPath, name),
  githubListUserRepos: (token: string) =>
    ipcRenderer.invoke('github:list-user-repos', token),
  gitLog: (repoPath: string, opts?: { allBranches?: boolean }) => ipcRenderer.invoke('git:log', repoPath, opts),
  gitFileHistory: (repoPath: string, filePath: string, limit?: number) =>
    ipcRenderer.invoke('git:file-history', repoPath, filePath, limit),
  gitBlame: (repoPath: string, filePath: string, rev?: string) =>
    ipcRenderer.invoke('git:blame', repoPath, filePath, rev),
  gitStatus: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
  gitBranches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
  gitCheckout: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:checkout', repoPath, branch),
  gitCreateBranch: (repoPath: string, name: string, fromHash?: string) =>
    ipcRenderer.invoke('git:create-branch', repoPath, name, fromHash),
  gitRestoreMaterializedBranch: (repoPath: string, branchName: string, sourceTag: string) =>
    ipcRenderer.invoke('git:restore-materialized-branch', repoPath, branchName, sourceTag),
  gitMergeBranch: (repoPath: string, sourceBranch: string) =>
    ipcRenderer.invoke('git:merge-branch', repoPath, sourceBranch),
  gitRebase: (repoPath: string, ontoBranch: string) =>
    ipcRenderer.invoke('git:rebase', repoPath, ontoBranch),
  gitFastForward: (repoPath: string, branch: string, toRef: string) =>
    ipcRenderer.invoke('git:fast-forward', repoPath, branch, toRef),
  gitRenameBranch: (repoPath: string, oldName: string, newName: string) =>
    ipcRenderer.invoke('git:rename-branch', repoPath, oldName, newName),
  gitDeleteBranch: (repoPath: string, branch: string, force?: boolean) =>
    ipcRenderer.invoke('git:delete-branch', repoPath, branch, force ?? false),
  gitPullBranch: (repoPath: string, branch: string, token?: string) =>
    ipcRenderer.invoke('git:pull-branch', repoPath, branch, token),
  gitPushBranch: (repoPath: string, branch: string, token?: string, force?: boolean) =>
    ipcRenderer.invoke('git:push-branch', repoPath, branch, token, force),
  gitPush: (repoPath: string, token?: string) => ipcRenderer.invoke('git:push', repoPath, token),
  gitPull: (repoPath: string, token?: string) => ipcRenderer.invoke('git:pull', repoPath, token),
  gitPullFastForward: (repoPath: string, token?: string) =>
    ipcRenderer.invoke('git:pull-ff-only', repoPath, token),
  gitPullRebase: (repoPath: string, token?: string) =>
    ipcRenderer.invoke('git:pull-rebase', repoPath, token),
  gitPullMerge: (repoPath: string, token?: string) =>
    ipcRenderer.invoke('git:pull-merge', repoPath, token),
  gitFetch: (repoPath: string, token?: string) => ipcRenderer.invoke('git:fetch', repoPath, token),
  gitStage: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke('git:stage', repoPath, filePath),
  gitUnstage: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke('git:unstage', repoPath, filePath),
  gitStageBatch: (repoPath: string, filePaths: string[]) =>
    ipcRenderer.invoke('git:stage-batch', repoPath, filePaths),
  gitUnstageBatch: (repoPath: string, filePaths: string[]) =>
    ipcRenderer.invoke('git:unstage-batch', repoPath, filePaths),
  gitRemoveLock: (repoPath: string) =>
    ipcRenderer.invoke('git:remove-lock', repoPath),
  gitTrustSafeDirectory: (repoPath: string) =>
    ipcRenderer.invoke('git:trust-safe-directory', repoPath),
  gitAmend: (repoPath: string, newMessage?: string) =>
    ipcRenderer.invoke('git:amend', repoPath, newMessage),
  gitCherryPick: (repoPath: string, hash: string) =>
    ipcRenderer.invoke('git:cherry-pick', repoPath, hash),
  gitSquash: (repoPath: string, n: number, message: string) =>
    ipcRenderer.invoke('git:squash', repoPath, n, message),
  gitRebasePrepare: (repoPath: string, commitHash: string) =>
    ipcRenderer.invoke('git:rebase-prepare', repoPath, commitHash),
  gitRebaseStart: (repoPath: string, baseHash: string, plan: any[]) =>
    ipcRenderer.invoke('git:rebase-start', repoPath, baseHash, plan),
  gitRebaseContinue: (repoPath: string) =>
    ipcRenderer.invoke('git:rebase-continue', repoPath),
  gitRebaseAbort: (repoPath: string) =>
    ipcRenderer.invoke('git:rebase-abort', repoPath),
  gitRebaseUndo: (repoPath: string, targetRef: string) =>
    ipcRenderer.invoke('git:rebase-undo', repoPath, targetRef),
  gitShowFiles: (repoPath: string, hash: string) =>
    ipcRenderer.invoke('git:show-files', repoPath, hash),
  gitDiffAtCommit: (repoPath: string, filePath: string, hash: string) =>
    ipcRenderer.invoke('git:diff-at-commit', repoPath, filePath, hash),
  gitAddToGitignore: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke('git:add-to-gitignore', repoPath, filePath),
  gitResetAll: (repoPath: string) =>
    ipcRenderer.invoke('git:reset-all', repoPath),
  gitClean: (repoPath: string, files?: string[]) =>
    ipcRenderer.invoke('git:clean', repoPath, files),
  gitReadFile: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke('git:read-file', repoPath, filePath),
  gitResolveConflictFile: (repoPath: string, filePath: string, content: string) =>
    ipcRenderer.invoke('git:resolve-conflict-file', repoPath, filePath, content),
  gitStashFile: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke('git:stash-file', repoPath, filePath),
  shellShowInFolder: (repoPath: string, relativeFilePath: string) =>
    ipcRenderer.invoke('shell:show-in-folder', repoPath, relativeFilePath),
  shellOpenItem: (repoPath: string, relativeFilePath: string) =>
    ipcRenderer.invoke('shell:open-item', repoPath, relativeFilePath),
  fsDeleteFile: (repoPath: string, relativeFilePath: string) =>
    ipcRenderer.invoke('fs:delete-file', repoPath, relativeFilePath),
  gitDiff: (repoPath: string, filePath: string, staged?: boolean) =>
    ipcRenderer.invoke('git:diff', repoPath, filePath, staged ?? false),
  gitDiffHunks: (repoPath: string, filePath: string, staged?: boolean) =>
    ipcRenderer.invoke('git:diff-hunks', repoPath, filePath, staged ?? false),
  gitApplyHunk: (repoPath: string, filePath: string, hunkPatch: string, options: unknown) =>
    ipcRenderer.invoke('git:apply-hunk', repoPath, filePath, hunkPatch, options),
  gitStashList: (repoPath: string) => ipcRenderer.invoke('git:stash-list', repoPath),
  gitStashPush: (repoPath: string, message?: string) =>
    ipcRenderer.invoke('git:stash-push', repoPath, message),
  gitStashApply: (repoPath: string, index: number) =>
    ipcRenderer.invoke('git:stash-apply', repoPath, index),
  gitStashPop: (repoPath: string, index: number) =>
    ipcRenderer.invoke('git:stash-pop', repoPath, index),
  gitStashDrop: (repoPath: string, index: number) =>
    ipcRenderer.invoke('git:stash-drop', repoPath, index),
  gitStashPreview: (repoPath: string, index: number) =>
    ipcRenderer.invoke('git:stash-preview', repoPath, index),
  gitStashClear: (repoPath: string) =>
    ipcRenderer.invoke('git:stash-clear', repoPath),
  gitDeleteTag: (repoPath: string, tagName: string) =>
    ipcRenderer.invoke('git:delete-tag', repoPath, tagName),
  gitCreateTag: (repoPath: string, tagName: string, commitHash: string, message?: string) =>
    ipcRenderer.invoke('git:create-tag', repoPath, tagName, commitHash, message),
  gitPushTag: (repoPath: string, tagName: string, token?: string) =>
    ipcRenderer.invoke('git:push-tag', repoPath, tagName, token),
  gitResetCommit: (repoPath: string, commitHash: string, mode: 'soft' | 'mixed' | 'hard') =>
    ipcRenderer.invoke('git:reset-commit', repoPath, commitHash, mode),
  gitTags: (repoPath: string) => ipcRenderer.invoke('git:tags', repoPath),
  gitSubmodules: (repoPath: string) => ipcRenderer.invoke('git:submodules', repoPath),
  gitWorktrees: (repoPath: string) => ipcRenderer.invoke('git:worktrees', repoPath),
  gitRemotesList: (repoPath: string) => ipcRenderer.invoke('git:remotes-list', repoPath),
  gitRemoteAdd: (repoPath: string, name: string, url: string) => ipcRenderer.invoke('git:remote-add', repoPath, name, url),
  gitRemoteRemove: (repoPath: string, name: string) => ipcRenderer.invoke('git:remote-remove', repoPath, name),
  gitRemoteSetUrl: (repoPath: string, name: string, url: string) => ipcRenderer.invoke('git:remote-set-url', repoPath, name, url),
  gitRemoteRename: (repoPath: string, oldName: string, newName: string) => ipcRenderer.invoke('git:remote-rename', repoPath, oldName, newName),
  gitWorktreeAdd: (repoPath: string, path: string, branch: string) => ipcRenderer.invoke('git:worktree-add', repoPath, path, branch),
  gitWorktreeRemove: (repoPath: string, path: string, force?: boolean) => ipcRenderer.invoke('git:worktree-remove', repoPath, path, force),
  gitSubmoduleUpdate: (repoPath: string, path?: string, init?: boolean) => ipcRenderer.invoke('git:submodule-update', repoPath, path, init),
  gitSubmoduleAdd: (repoPath: string, url: string, path: string) => ipcRenderer.invoke('git:submodule-add', repoPath, url, path),
  gitSubmoduleSync: (repoPath: string) => ipcRenderer.invoke('git:submodule-sync', repoPath),
  githubListPRs: (token: string, repoPath: string) => ipcRenderer.invoke('github:list-prs', token, repoPath),
  githubGetPRDiff: (token: string, repoPath: string, number: number) =>
    ipcRenderer.invoke('github:get-pr-diff', token, repoPath, number),
  terminalOpen: (repoPath: string) => ipcRenderer.invoke('terminal:open', repoPath),
  shellOpenPath: (targetPath: string) => ipcRenderer.invoke('shell:open-path', targetPath),
  shellOpenExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  storageSet: (key: string, value: string) => ipcRenderer.invoke('storage:set', key, value),
  storageGet: (key: string) => ipcRenderer.invoke('storage:get', key),
  storageDelete: (key: string) => ipcRenderer.invoke('storage:delete', key),
  checkForUpdate: () => ipcRenderer.invoke('app:check-update'),
  downloadUpdate: () => ipcRenderer.invoke('app:download-update'),
  installUpdate: () => ipcRenderer.invoke('app:install-update'),
  getChangelog: () => ipcRenderer.invoke('app:get-changelog'),
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowToggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  onUpdateNotAvailable: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('update:not-available', handler);
    return () => ipcRenderer.removeListener('update:not-available', handler);
  },
  onUpdateAvailable: (cb: (info: { version: string; currentVersion: string; releaseDate?: string }) => void) => {
    const handler = (_e: unknown, info: { version: string; currentVersion: string; releaseDate?: string }) => cb(info);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },
  onUpdateDownloaded: (cb: (info: { version: string; currentVersion: string; releaseDate?: string }) => void) => {
    const handler = (_e: unknown, info: { version: string; currentVersion: string; releaseDate?: string }) => cb(info);
    ipcRenderer.on('update:downloaded', handler);
    return () => ipcRenderer.removeListener('update:downloaded', handler);
  },
  onUpdateError: (cb: (msg: string) => void) => {
    const handler = (_e: unknown, msg: string) => cb(msg);
    ipcRenderer.on('update:error', handler);
    return () => ipcRenderer.removeListener('update:error', handler);
  },
  onDownloadProgress: (cb: (info: { percent: number; transferred: number; total: number }) => void) => {
    const handler = (_e: unknown, info: { percent: number; transferred: number; total: number }) => cb(info);
    ipcRenderer.on('update:download-progress', handler);
    return () => ipcRenderer.removeListener('update:download-progress', handler);
  },
  repoWatch: (targetPath: string) => ipcRenderer.invoke('repo:watch', targetPath),
  repoUnwatch: (targetPath: string) => ipcRenderer.invoke('repo:unwatch', targetPath),
  onRepoFsChange: (cb: (repoPath: string) => void) => {
    const handler = (_e: unknown, payload: { repoPath: string }) => cb(payload.repoPath);
    ipcRenderer.on('repo:fs-change', handler);
    return () => ipcRenderer.removeListener('repo:fs-change', handler);
  },
  materializeIdea: (repoPath: string, idea: unknown) =>
    ipcRenderer.invoke('git:materialize-idea', repoPath, idea),
  ai: {
    predictTimelines: (repoPath: string, repoName: string, lang?: string) =>
      ipcRenderer.invoke('ai:predict-timelines', repoPath, repoName, lang),
    loadPrediction: (repoPath: string) =>
      ipcRenderer.invoke('ai:load-prediction', repoPath),
    hasKey: (provider: string) => ipcRenderer.invoke('ai:has-key', provider),
    keyFingerprint: (provider: string) => ipcRenderer.invoke('ai:key-fingerprint', provider),
    // One-way: the key goes IN to be encrypted; it never comes back out.
    setKey: (provider: string, key: string) => ipcRenderer.invoke('ai:set-key', provider, key),
    removeKey: (provider: string) => ipcRenderer.invoke('ai:remove-key', provider),
    cancelPrediction: () => ipcRenderer.invoke('ai:cancel-prediction'),
  },
  temporalAgent: {
    loadConfig: (repoPath: string, repoName: string) =>
      ipcRenderer.invoke('temporal-agent:load-config', repoPath, repoName),
    saveConfig: (repoPath: string, config: unknown) =>
      ipcRenderer.invoke('temporal-agent:save-config', repoPath, config),
    loadNotes: (repoPath: string, repoName: string) =>
      ipcRenderer.invoke('temporal-agent:load-notes', repoPath, repoName),
    getNotesMarkdown: (repoPath: string, repoName: string) =>
      ipcRenderer.invoke('temporal-agent:get-notes-markdown', repoPath, repoName),
    recordDecision: (repoPath: string, repoName: string, decision: unknown) =>
      ipcRenderer.invoke('temporal-agent:record-decision', repoPath, repoName, decision),
    removeDecision: (repoPath: string, repoName: string, suggestionTitle: string) =>
      ipcRenderer.invoke('temporal-agent:remove-decision', repoPath, repoName, suggestionTitle),
    getHistory: (repoPath: string) =>
      ipcRenderer.invoke('temporal-agent:get-history', repoPath),
  },
});
