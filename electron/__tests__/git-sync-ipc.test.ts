import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { simpleGit } from 'simple-git';

type IpcHandler = (_event: unknown, ...args: unknown[]) => Promise<unknown>;

const mockIpc = vi.hoisted(() => ({
  handlers: new Map<string, IpcHandler>(),
  handle: vi.fn((channel: string, handler: IpcHandler) => {
    mockIpc.handlers.set(channel, handler);
  }),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockIpc.handle,
  },
}));

describe('git remote IPC handlers', () => {
  let tempDir: string;
  let handler: (channel: string) => IpcHandler;

  beforeEach(async () => {
    mockIpc.handlers.clear();
    mockIpc.handle.mockClear();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-remote-ipc-'));
    const { registerGitSyncHandlers } = await import('../../electron/ipc/git-sync');
    registerGitSyncHandlers();
    handler = (channel: string) => {
      const h = mockIpc.handlers.get(channel);
      if (!h) throw new Error(`No handler registered for channel: ${channel}`);
      return h;
    };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('manages remotes correctly', async () => {
    // 1. Initialize a new repo in tempDir
    const git = simpleGit(tempDir);
    await git.init(['--initial-branch=main']);
    // Git requires at least one commit to perform some actions, but remote management works on empty repos.

    const listRemotes = handler('git:remotes-list');
    const addRemote = handler('git:remote-add');
    const renameRemote = handler('git:remote-rename');
    const setRemoteUrl = handler('git:remote-set-url');
    const removeRemote = handler('git:remote-remove');

    // Start: no remotes
    const r0 = await listRemotes(null, tempDir) as { success: boolean; data: any[] };
    expect(r0.success).toBe(true);
    expect(r0.data).toEqual([]);

    // Add a remote
    const r1 = await addRemote(null, tempDir, 'origin', 'https://github.com/alejandropd-1/gitcron.git') as { success: boolean };
    expect(r1.success).toBe(true);

    // List remotes
    const r2 = await listRemotes(null, tempDir) as { success: boolean; data: any[] };
    expect(r2.success).toBe(true);
    expect(r2.data).toEqual([
      {
        name: 'origin',
        fetchUrl: 'https://github.com/alejandropd-1/gitcron.git',
        pushUrl: 'https://github.com/alejandropd-1/gitcron.git',
      }
    ]);

    // Rename remote
    const r3 = await renameRemote(null, tempDir, 'origin', 'upstream') as { success: boolean };
    expect(r3.success).toBe(true);

    const r4 = await listRemotes(null, tempDir) as { success: boolean; data: any[] };
    expect(r4.data).toEqual([
      {
        name: 'upstream',
        fetchUrl: 'https://github.com/alejandropd-1/gitcron.git',
        pushUrl: 'https://github.com/alejandropd-1/gitcron.git',
      }
    ]);

    // Set Remote URL
    const r5 = await setRemoteUrl(null, tempDir, 'upstream', 'git@github.com:another/repo.git') as { success: boolean };
    expect(r5.success).toBe(true);

    const r6 = await listRemotes(null, tempDir) as { success: boolean; data: any[] };
    expect(r6.data).toEqual([
      {
        name: 'upstream',
        fetchUrl: 'git@github.com:another/repo.git',
        pushUrl: 'git@github.com:another/repo.git',
      }
    ]);

    // Remove remote
    const r7 = await removeRemote(null, tempDir, 'upstream') as { success: boolean };
    expect(r7.success).toBe(true);

    const r8 = await listRemotes(null, tempDir) as { success: boolean; data: any[] };
    expect(r8.data).toEqual([]);
  });
});
