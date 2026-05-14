"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var import_child_process = require("child_process");
var import_simple_git = require("simple-git");
var import_rest = require("@octokit/rest");
var isDev = !import_electron.app.isPackaged;
var mainWindow = null;
var repoPath = null;
var git = (0, import_simple_git.simpleGit)();
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#041425",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: "hiddenInset"
  });
  const url = isDev ? "http://localhost:3000" : `file://${path.join(__dirname, "../out/index.html")}`;
  mainWindow.loadURL(url);
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.app.on("ready", createWindow);
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron.app.quit();
});
import_electron.app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
var STORAGE_FILENAME = "storage.enc";
function storagePath() {
  return path.join(import_electron.app.getPath("userData"), STORAGE_FILENAME);
}
function readEncryptedStorage() {
  try {
    if (!import_electron.safeStorage.isEncryptionAvailable()) return {};
    const file = storagePath();
    if (!fs.existsSync(file)) return {};
    const buf = fs.readFileSync(file);
    const json = import_electron.safeStorage.decryptString(buf);
    return JSON.parse(json);
  } catch (err) {
    console.error("readEncryptedStorage error:", err);
    return {};
  }
}
function writeEncryptedStorage(data) {
  if (!import_electron.safeStorage.isEncryptionAvailable()) {
    throw new Error("safeStorage no disponible en este sistema");
  }
  const dir = import_electron.app.getPath("userData");
  fs.mkdirSync(dir, { recursive: true });
  const buf = import_electron.safeStorage.encryptString(JSON.stringify(data));
  fs.writeFileSync(storagePath(), buf, { mode: 384 });
}
import_electron.ipcMain.handle("storage:set", async (_event, key, value) => {
  try {
    const data = readEncryptedStorage();
    data[key] = value;
    writeEncryptedStorage(data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("storage:get", async (_event, key) => {
  var _a;
  const data = readEncryptedStorage();
  return { success: true, data: (_a = data[key]) != null ? _a : null };
});
import_electron.ipcMain.handle("storage:delete", async (_event, key) => {
  try {
    const data = readEncryptedStorage();
    delete data[key];
    writeEncryptedStorage(data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
var askpassScriptPath = null;
function ensureAskpassScript() {
  if (askpassScriptPath && fs.existsSync(askpassScriptPath)) return askpassScriptPath;
  const dir = import_electron.app.getPath("userData");
  fs.mkdirSync(dir, { recursive: true });
  if (process.platform === "win32") {
    const p = path.join(dir, "gitcron-askpass.cmd");
    const content = '@echo off\r\necho %1 | findstr /i "Username" >nul\r\nif %errorlevel%==0 (\r\n  echo x-access-token\r\n) else (\r\n  echo %GITCRON_TOKEN%\r\n)\r\n';
    fs.writeFileSync(p, content);
    askpassScriptPath = p;
  } else {
    const p = path.join(dir, "gitcron-askpass.sh");
    const content = '#!/bin/sh\ncase "$1" in\n  *Username*) echo "x-access-token" ;;\n  *)          echo "$GITCRON_TOKEN" ;;\nesac\n';
    fs.writeFileSync(p, content, { mode: 448 });
    askpassScriptPath = p;
  }
  return askpassScriptPath;
}
import_electron.ipcMain.handle("git:command", async (_event, args) => {
  try {
    console.log("Executing git command:", args);
    let result;
    const command = args[0];
    switch (command) {
      case "status":
        result = await git.status();
        break;
      case "commit":
        result = await git.commit(args.slice(1));
        break;
      case "merge":
        result = await git.merge(args.slice(1));
        break;
      case "revert":
        result = await git.revert(args[1], args.slice(2).reduce((acc, curr) => __spreadProps(__spreadValues({}, acc), { [curr]: true }), {}));
        break;
      case "stash":
        result = await git.stash(args.slice(1));
        break;
      case "restore":
        result = await git.raw(["restore", args[1]]);
        break;
      default:
        result = await git.raw(args);
    }
    return { success: true, data: result };
  } catch (error) {
    console.error("Git Command Error:", error);
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("github:test", async (_event, { token, owner, repo }) => {
  try {
    const octokit = new import_rest.Octokit({ auth: token });
    const { data } = await octokit.rest.pulls.list({ owner, repo, state: "open" });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
var GITHUB_CLIENT_ID = "178c6fc778ccc68e1d6a";
import_electron.ipcMain.handle("github:device-start", async () => {
  try {
    const response = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: "repo read:user user:email" })
    });
    const data = await response.json();
    if (data.error) return { success: false, error: data.error_description || data.error };
    return {
      success: true,
      data: {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        expiresIn: data.expires_in,
        interval: data.interval || 5
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("github:device-poll", async (_event, deviceCode) => {
  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      })
    });
    const data = await response.json();
    if (data.error) {
      return { success: false, error: data.error, data: { pending: data.error === "authorization_pending" || data.error === "slow_down" } };
    }
    return { success: true, data: { accessToken: data.access_token } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("github:auth", async (_event, token) => {
  try {
    const octokit = new import_rest.Octokit({ auth: token });
    const { data } = await octokit.rest.users.getAuthenticated();
    const user = {
      login: data.login,
      name: data.name,
      avatarUrl: data.avatar_url,
      email: data.email
    };
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:open-repo", async () => {
  var _a;
  try {
    const result = await import_electron.dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Seleccionar repositorio Git"
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: "No se seleccion\xF3 ninguna carpeta" };
    }
    const selectedPath = result.filePaths[0];
    const testGit = (0, import_simple_git.simpleGit)(selectedPath);
    const isRepo = await testGit.checkIsRepo();
    if (!isRepo) {
      return {
        success: false,
        error: `"${path.basename(selectedPath)}" no es un repositorio git`
      };
    }
    repoPath = selectedPath;
    git = (0, import_simple_git.simpleGit)(repoPath);
    const status = await git.status();
    const repoInfo = {
      path: repoPath,
      name: path.basename(repoPath),
      currentBranch: (_a = status.current) != null ? _a : "HEAD",
      isGitRepo: true
    };
    return { success: true, data: repoInfo };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("fs:pick-folder", async (_event, title) => {
  const result = await import_electron.dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: title != null ? title : "Seleccionar carpeta"
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: "No se seleccion\xF3 carpeta" };
  }
  return { success: true, data: result.filePaths[0] };
});
import_electron.ipcMain.handle("git:init", async (_event, parentPath, name, withInitialCommit = true) => {
  var _a;
  try {
    const repoDir = path.join(parentPath, name);
    if (fs.existsSync(repoDir) && fs.readdirSync(repoDir).length > 0) {
      return { success: false, error: `La carpeta "${name}" ya existe y no est\xE1 vac\xEDa` };
    }
    fs.mkdirSync(repoDir, { recursive: true });
    const g = (0, import_simple_git.simpleGit)(repoDir);
    await g.init(["--initial-branch=main"]);
    if (withInitialCommit) {
      fs.writeFileSync(path.join(repoDir, "README.md"), `# ${name}

Repositorio creado con GitCron.
`);
      fs.writeFileSync(path.join(repoDir, ".gitignore"), `node_modules/
.env
.DS_Store
Thumbs.db
`);
      await g.add(".");
      await g.commit("Initial commit");
    }
    repoPath = repoDir;
    git = (0, import_simple_git.simpleGit)(repoPath);
    const status = await git.status();
    const info = {
      path: repoDir,
      name: path.basename(repoDir),
      currentBranch: (_a = status.current) != null ? _a : "main",
      isGitRepo: true
    };
    return { success: true, data: info };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:clone", async (_event, url, parentPath, folderName, token) => {
  var _a;
  try {
    const destPath = path.join(parentPath, folderName);
    if (fs.existsSync(destPath) && fs.readdirSync(destPath).length > 0) {
      return { success: false, error: `La carpeta "${folderName}" ya existe y no est\xE1 vac\xEDa` };
    }
    const g = (0, import_simple_git.simpleGit)();
    if (token) {
      g.env(__spreadProps(__spreadValues({}, process.env), {
        GIT_ASKPASS: ensureAskpassScript(),
        GITCRON_TOKEN: token,
        GIT_TERMINAL_PROMPT: "0"
      }));
    }
    await g.clone(url, destPath);
    repoPath = destPath;
    git = (0, import_simple_git.simpleGit)(repoPath);
    const status = await git.status();
    const info = {
      path: destPath,
      name: path.basename(destPath),
      currentBranch: (_a = status.current) != null ? _a : "HEAD",
      isGitRepo: true
    };
    return { success: true, data: info };
  } catch (error) {
    const isAuth = /authentication|credentials|ssh|permission denied|403|401|could not read|not found/i.test(error.message);
    return { success: false, error: error.message, data: { authRequired: isAuth } };
  }
});
import_electron.ipcMain.handle("github:create-repo", async (_event, token, name, isPrivate, description) => {
  try {
    const octokit = new import_rest.Octokit({ auth: token });
    const { data } = await octokit.rest.repos.createForAuthenticatedUser({
      name,
      private: isPrivate,
      description: description || void 0,
      auto_init: true
      // create with a README so we can clone immediately
    });
    return {
      success: true,
      data: { cloneUrl: data.clone_url, htmlUrl: data.html_url, fullName: data.full_name, name: data.name }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("github:list-user-repos", async (_event, token) => {
  try {
    const octokit = new import_rest.Octokit({ auth: token });
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      affiliation: "owner,collaborator"
    });
    return {
      success: true,
      data: data.map((r) => ({
        name: r.name,
        fullName: r.full_name,
        cloneUrl: r.clone_url,
        private: r.private,
        description: r.description,
        updatedAt: r.updated_at
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:log", async (_event, targetPath) => {
  try {
    const g = (0, import_simple_git.simpleGit)(targetPath);
    const raw = await g.raw([
      "log",
      "--all",
      "--max-count=500",
      "--date-order",
      "--pretty=format:%H%x1f%P%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%D"
    ]);
    const commits = raw.split("\n").filter((l) => l.trim()).map((line) => {
      const [hash, parentsRaw, an, ae, date, msg, decoration] = line.split("");
      const parents = (parentsRaw || "").split(" ").filter(Boolean);
      const refs = (decoration || "").split(",").map((r) => r.trim()).filter(Boolean).map((r) => r.replace(/^HEAD -> /, ""));
      return {
        hash,
        shortHash: hash.slice(0, 7),
        message: msg != null ? msg : "",
        authorName: an != null ? an : "",
        authorEmail: ae != null ? ae : "",
        date: date != null ? date : "",
        parents,
        refs
      };
    });
    return { success: true, data: commits };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:status", async (_event, targetPath) => {
  try {
    const g = (0, import_simple_git.simpleGit)(targetPath);
    const status = await g.status();
    const raw = [
      ...status.modified.map((p) => ({ path: p, status: "modified", staged: false })),
      ...status.created.map((p) => ({ path: p, status: "added", staged: false })),
      ...status.deleted.map((p) => ({ path: p, status: "deleted", staged: false })),
      ...status.not_added.map((p) => ({ path: p, status: "untracked", staged: false })),
      ...status.staged.map((p) => ({ path: p, status: "modified", staged: true })),
      ...status.renamed.map((r) => ({
        path: r.to,
        oldPath: r.from,
        status: "renamed",
        staged: true
      }))
    ];
    const seen = /* @__PURE__ */ new Map();
    for (const f of raw) {
      const existing = seen.get(f.path);
      if (!existing || f.staged) seen.set(f.path, f);
    }
    return { success: true, data: Array.from(seen.values()) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:branches", async (_event, targetPath) => {
  try {
    const g = (0, import_simple_git.simpleGit)(targetPath);
    const local = await g.branchLocal();
    const remotes = await g.branch(["-r"]);
    const branchData = {
      local: local.all,
      remote: remotes.all,
      current: local.current
    };
    return { success: true, data: branchData };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:checkout", async (_event, targetPath, branch) => {
  try {
    await (0, import_simple_git.simpleGit)(targetPath).checkout(branch);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:create-branch", async (_event, targetPath, name, fromHash) => {
  try {
    const g = (0, import_simple_git.simpleGit)(targetPath);
    if (fromHash) await g.checkoutBranch(name, fromHash);
    else await g.checkoutLocalBranch(name);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
async function withGitHubToken(targetPath, token, fn) {
  const g = (0, import_simple_git.simpleGit)(targetPath);
  if (!token) return fn(g);
  const askpass = ensureAskpassScript();
  g.env(__spreadProps(__spreadValues({}, process.env), {
    GIT_ASKPASS: askpass,
    GITCRON_TOKEN: token,
    // Prevent git from trying interactive terminal prompts
    GIT_TERMINAL_PROMPT: "0"
  }));
  return fn(g);
}
import_electron.ipcMain.handle("git:push", async (_event, targetPath, token) => {
  try {
    await withGitHubToken(targetPath, token, (g) => g.push());
    return { success: true, data: { success: true } };
  } catch (error) {
    const isAuth = /authentication|credentials|ssh|permission denied|403|401/i.test(error.message);
    return {
      success: false,
      error: error.message,
      data: { success: false, authRequired: isAuth, error: error.message }
    };
  }
});
import_electron.ipcMain.handle("git:pull", async (_event, targetPath, token) => {
  try {
    const r = await withGitHubToken(targetPath, token, (g) => g.pull());
    return {
      success: true,
      data: {
        success: true,
        summary: `${r.summary.changes} changed, ${r.summary.insertions} insertions, ${r.summary.deletions} deletions`
      }
    };
  } catch (error) {
    const isAuth = /authentication|credentials|ssh|permission denied|403|401/i.test(error.message);
    return {
      success: false,
      error: error.message,
      data: { success: false, authRequired: isAuth, error: error.message }
    };
  }
});
import_electron.ipcMain.handle("git:stage", async (_event, targetPath, filePath) => {
  try {
    await (0, import_simple_git.simpleGit)(targetPath).add(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:unstage", async (_event, targetPath, filePath) => {
  try {
    await (0, import_simple_git.simpleGit)(targetPath).raw(["restore", "--staged", filePath]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:diff", async (_event, targetPath, filePath, staged = false) => {
  try {
    const g = (0, import_simple_git.simpleGit)(targetPath);
    const status = await g.status();
    const isUntracked = status.not_added.includes(filePath);
    let diff;
    if (isUntracked) {
      const fullPath = path.join(targetPath, filePath);
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        diff = `diff --git a/${filePath} b/${filePath}
--- /dev/null
+++ b/${filePath}
@@ -0,0 +1,${lines.length} @@
` + lines.map((l) => `+${l}`).join("\n");
      } catch (e) {
        diff = "";
      }
    } else if (staged) {
      diff = await g.diff(["--cached", "--", filePath]);
    } else {
      diff = await g.diff(["HEAD", "--", filePath]);
    }
    return { success: true, data: diff };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:stash-list", async (_event, targetPath) => {
  try {
    const g = (0, import_simple_git.simpleGit)(targetPath);
    const list = await g.stashList();
    const stashes = list.all.map((entry, idx) => ({
      index: idx,
      message: entry.message,
      hash: entry.hash,
      date: entry.date
    }));
    return { success: true, data: stashes };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:tags", async (_event, targetPath) => {
  try {
    const tags = await (0, import_simple_git.simpleGit)(targetPath).tags();
    return { success: true, data: tags.all };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:submodules", async (_event, targetPath) => {
  try {
    const raw = await (0, import_simple_git.simpleGit)(targetPath).raw(["submodule", "status"]).catch(() => "");
    const submodules = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      const match = line.match(/^[\s+\-U]?([0-9a-f]+)\s+(\S+)(?:\s+\((.+)\))?/);
      if (!match) continue;
      submodules.push({ hash: match[1], path: match[2], describe: match[3] || void 0 });
    }
    return { success: true, data: submodules };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("terminal:open", async (_event, targetPath) => {
  try {
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
      return { success: false, error: "El directorio del repo no existe" };
    }
    const spawnOpts = { detached: true, stdio: "ignore", shell: false };
    if (process.platform === "win32") {
      const wt = (0, import_child_process.spawn)("wt.exe", ["-d", targetPath], spawnOpts);
      wt.on("error", () => {
        const cmd = (0, import_child_process.spawn)("cmd.exe", [], __spreadProps(__spreadValues({}, spawnOpts), { cwd: targetPath }));
        cmd.unref();
      });
      wt.unref();
    } else if (process.platform === "darwin") {
      const child = (0, import_child_process.spawn)("open", ["-a", "Terminal", targetPath], spawnOpts);
      child.unref();
    } else {
      const child = (0, import_child_process.spawn)("x-terminal-emulator", [], __spreadProps(__spreadValues({}, spawnOpts), { cwd: targetPath }));
      child.unref();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("shell:open-path", async (_event, targetPath) => {
  try {
    await import_electron.shell.openPath(targetPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:stash-apply", async (_event, targetPath, stashIndex) => {
  try {
    await (0, import_simple_git.simpleGit)(targetPath).stash(["apply", `stash@{${stashIndex}}`]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
import_electron.ipcMain.handle("git:stash-drop", async (_event, targetPath, stashIndex) => {
  try {
    await (0, import_simple_git.simpleGit)(targetPath).stash(["drop", `stash@{${stashIndex}}`]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
