import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  gitCommand: (args: string[]) => ipcRenderer.invoke('git:command', args),
  githubTest: (token: string, owner: string, repo: string) => 
    ipcRenderer.invoke('github:test', { token, owner, repo }),
});
