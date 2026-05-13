"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("api", {
  gitCommand: (args) => import_electron.ipcRenderer.invoke("git:command", args),
  githubTest: (token, owner, repo) => import_electron.ipcRenderer.invoke("github:test", { token, owner, repo })
});
