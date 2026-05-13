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
var import_simple_git = require("simple-git");
var import_rest = require("@octokit/rest");
var isDev = !import_electron.app.isPackaged;
var mainWindow = null;
var git = (0, import_simple_git.simpleGit)();
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#15121b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // Note: In build this may point to the compiled .js
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
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
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
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open"
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
