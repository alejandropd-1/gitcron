import { beforeEach, describe, expect, it, vi } from 'vitest';

type IpcHandler = (_event: unknown, ...args: unknown[]) => Promise<unknown>;

const mockIpc = vi.hoisted(() => ({
  handlers: new Map<string, IpcHandler>(),
  handle: vi.fn((channel: string, handler: IpcHandler) => {
    mockIpc.handlers.set(channel, handler);
  }),
}));

const mockRepoGit = vi.hoisted(() => ({
  raw: vi.fn(),
}));

const mockAuthedGit = vi.hoisted(() => ({
  push: vi.fn(),
}));

const mockSimpleGit = vi.hoisted(() => vi.fn(() => mockRepoGit));
const mockWithGitHubToken = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockIpc.handle,
  },
}));

vi.mock('simple-git', () => ({
  simpleGit: mockSimpleGit,
}));

vi.mock('../../electron/ipc/shared', () => ({
  errMsg: (error: unknown) => {
    const e = error as { message?: string };
    return e?.message ?? String(error);
  },
  sanitizeForLog: (value: unknown) => String(value),
  withGitHubToken: mockWithGitHubToken,
}));

describe('git existing GitHub remote link IPC handlers', () => {
  beforeEach(() => {
    mockIpc.handlers.clear();
    mockIpc.handle.mockClear();
    mockRepoGit.raw.mockReset();
    mockAuthedGit.push.mockReset();
    mockSimpleGit.mockClear();
    mockWithGitHubToken.mockReset();
    mockWithGitHubToken.mockImplementation(async (_targetPath, _token, fn) => fn(mockAuthedGit));
  });

  it('validates existing GitHub remote URLs', async () => {
    const { isValidExistingGitHubRemoteUrl } = await import('../../electron/ipc/git-sync');

    expect(isValidExistingGitHubRemoteUrl('https://github.com/acme/project.git')).toBe(true);
    expect(isValidExistingGitHubRemoteUrl('git@github.com:acme/project.git')).toBe(true);
    expect(isValidExistingGitHubRemoteUrl('https://github.com/acme/project')).toBe(true);
    expect(isValidExistingGitHubRemoteUrl('http://github.com/acme/project.git')).toBe(false);
    expect(isValidExistingGitHubRemoteUrl('https://github.com/token@acme/project.git')).toBe(false);
    expect(isValidExistingGitHubRemoteUrl('https://gitlab.com/acme/project.git')).toBe(false);
  });

  it('returns a structured invalid-url result before touching git', async () => {
    const { registerGitSyncHandlers } = await import('../../electron/ipc/git-sync');
    registerGitSyncHandlers();

    const handler = mockIpc.handlers.get('git:add-existing-github-remote');
    if (!handler) throw new Error('git:add-existing-github-remote handler was not registered');

    const result = await handler(null, 'C:/repo', 'https://gitlab.com/acme/project.git');

    expect(result).toMatchObject({
      success: false,
      data: {
        code: 'invalid-remote-url',
        localRepoReady: true,
        retryable: true,
      },
    });
    expect(mockSimpleGit).not.toHaveBeenCalled();
    expect(mockWithGitHubToken).not.toHaveBeenCalled();
  });

  it('rolls back origin when the first push fails', async () => {
    mockRepoGit.raw.mockResolvedValue('');
    mockAuthedGit.push.mockRejectedValue(new Error('remote: Repository not found.'));

    const { addExistingGitHubRemoteAndPushMain } = await import('../../electron/ipc/git-sync');
    const result = await addExistingGitHubRemoteAndPushMain(
      'C:/repo',
      'https://github.com/acme/project.git',
      'gho_secret',
    );

    expect(mockRepoGit.raw).toHaveBeenNthCalledWith(1, ['remote', 'add', 'origin', 'https://github.com/acme/project.git']);
    expect(mockWithGitHubToken).toHaveBeenCalledWith('C:/repo', 'gho_secret', expect.any(Function));
    expect(mockAuthedGit.push).toHaveBeenCalledWith(['--set-upstream', 'origin', 'main']);
    expect(mockRepoGit.raw).toHaveBeenNthCalledWith(2, ['remote', 'remove', 'origin']);
    expect(result).toMatchObject({
      success: false,
      data: {
        code: 'first-push-failed',
        authRequired: true,
        localRepoReady: true,
        retryable: true,
        remoteAdded: false,
        remoteRolledBack: true,
      },
    });
  });
});
