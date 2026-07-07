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
  ipcMain: { handle: mockIpc.handle },
}));

describe('branch delete IPC handlers (remote delete + merged check)', () => {
  let tempDir: string;
  let repoPath: string;
  let barePath: string;
  let handler: (channel: string) => IpcHandler;

  beforeEach(async () => {
    mockIpc.handlers.clear();
    mockIpc.handle.mockClear();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-branch-del-'));
    repoPath = path.join(tempDir, 'work');
    barePath = path.join(tempDir, 'origin.git');
    fs.mkdirSync(repoPath);

    // Bare repo que actúa de "origin" (sin red, transporte local de archivos)
    await simpleGit().init(['--bare', '--initial-branch=main', barePath]);

    const git = simpleGit(repoPath);
    await git.init(['--initial-branch=main']);
    await git.addConfig('user.name', 'GitCron Test');
    await git.addConfig('user.email', 'gitcron@example.test');
    fs.writeFileSync(path.join(repoPath, 'file.txt'), 'hello', 'utf-8');
    await git.add('file.txt');
    await git.commit('initial commit');
    await git.addRemote('origin', barePath);
    await git.push(['-u', 'origin', 'main']);

    // Branch mergeada: apunta a main, sin commits nuevos
    await git.branch(['merged-branch']);
    await git.push(['-u', 'origin', 'merged-branch']);

    // Branch NO mergeada: tiene un commit propio que no está en main
    await git.checkoutLocalBranch('feature-x');
    fs.writeFileSync(path.join(repoPath, 'feature.txt'), 'wip', 'utf-8');
    await git.add('feature.txt');
    await git.commit('feature work');
    await git.checkout('main');

    const { registerGitOpsHandlers } = await import('../../electron/ipc/git-ops');
    const { registerGitSyncHandlers } = await import('../../electron/ipc/git-sync');
    registerGitOpsHandlers();
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

  it('git:is-branch-merged distingue mergeada de no-mergeada', async () => {
    const isMerged = handler('git:is-branch-merged');

    const rMerged = await isMerged(null, repoPath, 'merged-branch') as { success: boolean; data: { merged: boolean; base: string } };
    expect(rMerged.success).toBe(true);
    expect(rMerged.data.merged).toBe(true);
    expect(rMerged.data.base).toBe('main');

    const rUnmerged = await isMerged(null, repoPath, 'feature-x') as { success: boolean; data: { merged: boolean } };
    expect(rUnmerged.success).toBe(true);
    expect(rUnmerged.data.merged).toBe(false);
  });

  it('git:delete-remote-branch borra la branch en origin', async () => {
    const bare = simpleGit(barePath);
    const before = await bare.branchLocal();
    expect(before.all).toContain('merged-branch');

    const deleteRemote = handler('git:delete-remote-branch');
    const r = await deleteRemote(null, repoPath, 'origin', 'merged-branch') as { success: boolean; error?: string };
    if (!r.success) console.error('delete-remote error:', r.error);
    expect(r.success).toBe(true);

    const after = await bare.branchLocal();
    expect(after.all).not.toContain('merged-branch');
  });
});
