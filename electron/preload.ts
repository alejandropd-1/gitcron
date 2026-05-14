import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  gitCommand: (args: string[]) => ipcRenderer.invoke('git:command', args),
  githubTest: (token: string, owner: string, repo: string) =>
    ipcRenderer.invoke('github:test', { token, owner, repo }),
  githubAuth: (token: string) => ipcRenderer.invoke('github:auth', token),
  githubDeviceStart: () => ipcRenderer.invoke('github:device-start'),
  githubDevicePoll: (deviceCode: string) => ipcRenderer.invoke('github:device-poll', deviceCode),
  openRepo: () => ipcRenderer.invoke('git:open-repo'),
  pickFolder: (title?: string) => ipcRenderer.invoke('fs:pick-folder', title),
  gitInit: (parentPath: string, name: string, withInitialCommit?: boolean) =>
    ipcRenderer.invoke('git:init', parentPath, name, withInitialCommit ?? true),
  gitClone: (url: string, parentPath: string, folderName: string, token?: string) =>
    ipcRenderer.invoke('git:clone', url, parentPath, folderName, token),
  githubCreateRepo: (token: string, name: string, isPrivate: boolean, description?: string) =>
    ipcRenderer.invoke('github:create-repo', token, name, isPrivate, description),
  githubListUserRepos: (token: string) =>
    ipcRenderer.invoke('github:list-user-repos', token),
  gitLog: (repoPath: string) => ipcRenderer.invoke('git:log', repoPath),
  gitStatus: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
  gitBranches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
  gitCheckout: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:checkout', repoPath, branch),
  gitCreateBranch: (repoPath: string, name: string, fromHash?: string) =>
    ipcRenderer.invoke('git:create-branch', repoPath, name, fromHash),
  gitPush: (repoPath: string, token?: string) => ipcRenderer.invoke('git:push', repoPath, token),
  gitPull: (repoPath: string, token?: string) => ipcRenderer.invoke('git:pull', repoPath, token),
  gitStage: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke('git:stage', repoPath, filePath),
  gitUnstage: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke('git:unstage', repoPath, filePath),
  gitDiff: (repoPath: string, filePath: string, staged?: boolean) =>
    ipcRenderer.invoke('git:diff', repoPath, filePath, staged ?? false),
  gitStashList: (repoPath: string) => ipcRenderer.invoke('git:stash-list', repoPath),
  gitStashApply: (repoPath: string, index: number) =>
    ipcRenderer.invoke('git:stash-apply', repoPath, index),
  gitStashDrop: (repoPath: string, index: number) =>
    ipcRenderer.invoke('git:stash-drop', repoPath, index),
  gitTags: (repoPath: string) => ipcRenderer.invoke('git:tags', repoPath),
  gitSubmodules: (repoPath: string) => ipcRenderer.invoke('git:submodules', repoPath),
  terminalOpen: (repoPath: string) => ipcRenderer.invoke('terminal:open', repoPath),
  shellOpenPath: (targetPath: string) => ipcRenderer.invoke('shell:open-path', targetPath),
  storageSet: (key: string, value: string) => ipcRenderer.invoke('storage:set', key, value),
  storageGet: (key: string) => ipcRenderer.invoke('storage:get', key),
  storageDelete: (key: string) => ipcRenderer.invoke('storage:delete', key),
});
