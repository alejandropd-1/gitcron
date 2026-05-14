"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("api", {
  gitCommand: (args) => import_electron.ipcRenderer.invoke("git:command", args),
  githubTest: (token, owner, repo) => import_electron.ipcRenderer.invoke("github:test", { token, owner, repo }),
  githubAuth: (token) => import_electron.ipcRenderer.invoke("github:auth", token),
  githubDeviceStart: () => import_electron.ipcRenderer.invoke("github:device-start"),
  githubDevicePoll: (deviceCode) => import_electron.ipcRenderer.invoke("github:device-poll", deviceCode),
  openRepo: () => import_electron.ipcRenderer.invoke("git:open-repo"),
  pickFolder: (title) => import_electron.ipcRenderer.invoke("fs:pick-folder", title),
  gitInit: (parentPath, name, withInitialCommit) => import_electron.ipcRenderer.invoke("git:init", parentPath, name, withInitialCommit != null ? withInitialCommit : true),
  gitClone: (url, parentPath, folderName, token) => import_electron.ipcRenderer.invoke("git:clone", url, parentPath, folderName, token),
  githubCreateRepo: (token, name, isPrivate, description) => import_electron.ipcRenderer.invoke("github:create-repo", token, name, isPrivate, description),
  githubListUserRepos: (token) => import_electron.ipcRenderer.invoke("github:list-user-repos", token),
  gitLog: (repoPath) => import_electron.ipcRenderer.invoke("git:log", repoPath),
  gitStatus: (repoPath) => import_electron.ipcRenderer.invoke("git:status", repoPath),
  gitBranches: (repoPath) => import_electron.ipcRenderer.invoke("git:branches", repoPath),
  gitCheckout: (repoPath, branch) => import_electron.ipcRenderer.invoke("git:checkout", repoPath, branch),
  gitCreateBranch: (repoPath, name, fromHash) => import_electron.ipcRenderer.invoke("git:create-branch", repoPath, name, fromHash),
  gitPush: (repoPath, token) => import_electron.ipcRenderer.invoke("git:push", repoPath, token),
  gitPull: (repoPath, token) => import_electron.ipcRenderer.invoke("git:pull", repoPath, token),
  gitStage: (repoPath, filePath) => import_electron.ipcRenderer.invoke("git:stage", repoPath, filePath),
  gitUnstage: (repoPath, filePath) => import_electron.ipcRenderer.invoke("git:unstage", repoPath, filePath),
  gitDiff: (repoPath, filePath, staged) => import_electron.ipcRenderer.invoke("git:diff", repoPath, filePath, staged != null ? staged : false),
  gitStashList: (repoPath) => import_electron.ipcRenderer.invoke("git:stash-list", repoPath),
  gitStashApply: (repoPath, index) => import_electron.ipcRenderer.invoke("git:stash-apply", repoPath, index),
  gitStashDrop: (repoPath, index) => import_electron.ipcRenderer.invoke("git:stash-drop", repoPath, index),
  gitTags: (repoPath) => import_electron.ipcRenderer.invoke("git:tags", repoPath),
  gitSubmodules: (repoPath) => import_electron.ipcRenderer.invoke("git:submodules", repoPath),
  terminalOpen: (repoPath) => import_electron.ipcRenderer.invoke("terminal:open", repoPath),
  shellOpenPath: (targetPath) => import_electron.ipcRenderer.invoke("shell:open-path", targetPath),
  storageSet: (key, value) => import_electron.ipcRenderer.invoke("storage:set", key, value),
  storageGet: (key) => import_electron.ipcRenderer.invoke("storage:get", key),
  storageDelete: (key) => import_electron.ipcRenderer.invoke("storage:delete", key)
});
