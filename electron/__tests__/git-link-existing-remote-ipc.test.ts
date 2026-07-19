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
  checkIsRepo: vi.fn(),
  init: vi.fn(),
}));

const mockAuthedGit = vi.hoisted(() => ({
  push: vi.fn(),
  raw: vi.fn(),
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
  CheckRepoActions: { IS_REPO_ROOT: 'is-repo-root' },
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
    mockRepoGit.checkIsRepo.mockReset();
    mockRepoGit.checkIsRepo.mockResolvedValue(true);
    mockRepoGit.init.mockReset();
    mockAuthedGit.push.mockReset();
    mockAuthedGit.raw.mockReset();
    mockAuthedGit.raw.mockResolvedValue('');
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

  it('detects remote main history before adding origin or pushing', async () => {
    mockAuthedGit.raw.mockResolvedValue('abc123\trefs/heads/main\n');

    const { addExistingGitHubRemoteAndPushMain } = await import('../../electron/ipc/git-sync');
    const result = await addExistingGitHubRemoteAndPushMain(
      'C:/repo',
      'https://github.com/acme/project.git',
      'gho_secret',
    );

    expect(mockAuthedGit.raw).toHaveBeenCalledWith([
      'ls-remote', '--heads', 'https://github.com/acme/project.git', 'refs/heads/main',
    ]);
    expect(mockRepoGit.raw).not.toHaveBeenCalled();
    expect(mockAuthedGit.push).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: false,
      data: {
        code: 'remote-has-history',
        remoteHasHistory: true,
        localRepoReady: true,
      },
    });
  });

  it('adopts remote main with a local backup branch and a mixed reset', async () => {
    mockRepoGit.raw.mockResolvedValue('');

    const { adoptExistingGitHubRemoteMain } = await import('../../electron/ipc/git-sync');
    const result = await adoptExistingGitHubRemoteMain(
      'C:/repo',
      'https://github.com/acme/project.git',
      'gho_secret',
    );

    expect(mockRepoGit.raw).toHaveBeenNthCalledWith(1, [
      'remote', 'add', 'origin', 'https://github.com/acme/project.git',
    ]);
    expect(mockAuthedGit.raw).toHaveBeenCalledWith(['fetch', 'origin', 'main']);
    expect(mockRepoGit.raw).toHaveBeenNthCalledWith(2, ['rev-parse', '--verify', 'HEAD']);
    expect(mockRepoGit.raw.mock.calls[2][0]).toEqual([
      'branch', expect.stringMatching(/^gitcron\/local-before-link-/),
    ]);
    expect(mockRepoGit.raw).toHaveBeenNthCalledWith(4, ['reset', '--mixed', 'origin/main']);
    expect(mockRepoGit.raw).toHaveBeenNthCalledWith(5, ['branch', '--set-upstream-to=origin/main', 'main']);
    expect(result).toMatchObject({
      success: true,
      data: {
        adoptedRemoteHistory: true,
        preservedWorkingTree: true,
        backupBranch: expect.stringMatching(/^gitcron\/local-before-link-/),
      },
    });
  });

  it('adopts remote main in a non-repo folder without creating a parallel commit', async () => {
    mockRepoGit.checkIsRepo.mockResolvedValue(false);
    mockRepoGit.raw
      .mockResolvedValueOnce('')
      .mockRejectedValueOnce(new Error('fatal: Needed a single revision'))
      .mockResolvedValue('');

    const { adoptExistingGitHubRemoteMain } = await import('../../electron/ipc/git-sync');
    const result = await adoptExistingGitHubRemoteMain(
      'C:/folder',
      'https://github.com/acme/project.git',
    );

    expect(mockRepoGit.init).toHaveBeenCalledWith(['--initial-branch=main']);
    expect(mockRepoGit.raw).not.toHaveBeenCalledWith([
      'branch', expect.stringMatching(/^gitcron\/local-before-link-/),
    ]);
    expect(mockRepoGit.raw).toHaveBeenCalledWith(['reset', '--mixed', 'origin/main']);
    expect(result).toMatchObject({
      success: true,
      data: {
        adoptedRemoteHistory: true,
        preservedWorkingTree: true,
        backupBranch: undefined,
      },
    });
  });
});
