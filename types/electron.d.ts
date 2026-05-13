export interface GitResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ElectronAPI {
  gitCommand: (args: string[]) => Promise<GitResult>;
  githubTest: (token: string, owner: string, repo: string) => Promise<GitResult>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
