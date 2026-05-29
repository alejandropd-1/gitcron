// ===========================================================================
// MERGE SNIPPET 1 — into electron/preload.ts
// Add inside the existing contextBridge.exposeInMainWorld('api', { ... }) object.
// Keep the existing security model intact (contextBridge only, no Node exposure).
// ===========================================================================

/*
temporalAgent: {
  loadConfig: (repoPath, repoName) =>
    ipcRenderer.invoke('temporal-agent:load-config', repoPath, repoName),
  saveConfig: (repoPath, config) =>
    ipcRenderer.invoke('temporal-agent:save-config', repoPath, config),
  loadNotes: (repoPath, repoName) =>
    ipcRenderer.invoke('temporal-agent:load-notes', repoPath, repoName),
  getNotesMarkdown: (repoPath, repoName) =>
    ipcRenderer.invoke('temporal-agent:get-notes-markdown', repoPath, repoName),
  recordDecision: (repoPath, repoName, decision) =>
    ipcRenderer.invoke('temporal-agent:record-decision', repoPath, repoName, decision),
},
*/

// ===========================================================================
// MERGE SNIPPET 2 — into electron/main.ts
// Call this once during app setup, next to your other register*Handlers() calls.
// ===========================================================================

/*
import { registerTemporalAgentHandlers } from './temporal-agent-ipc';
// ...
registerTemporalAgentHandlers();
*/

// ===========================================================================
// MERGE SNIPPET 3 — into types/electron.d.ts
// Add this property to the window.api interface, and import the types.
// ===========================================================================

/*
import type {
  TemporalAgentConfig,
  TemporalAgentNotes,
  TemporalAgentDecision,
} from './temporal-agent';

// inside the ElectronAPI / window.api interface:
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
};
*/
