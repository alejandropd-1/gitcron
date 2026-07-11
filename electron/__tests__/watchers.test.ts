import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type IpcHandler = (_event: unknown, ...args: unknown[]) => Promise<unknown>;

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, IpcHandler>(),
  watchers: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  }>,
  watch: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: IpcHandler) => mocks.handlers.set(channel, handler)),
  },
}));

vi.mock('chokidar', () => ({
  default: { watch: mocks.watch },
}));

describe('repository watcher lifecycle', () => {
  beforeEach(() => {
    mocks.handlers.clear();
    mocks.watch.mockReset();
    mocks.watch.mockImplementation(() => {
      const watcher = {
        close: vi.fn(async () => undefined),
        on: vi.fn(),
      };
      watcher.on.mockReturnValue(watcher);
      mocks.watchers.push(watcher);
      return watcher;
    });
  });

  afterEach(async () => {
    const { closeAllRepoWatchers } = await import('../ipc/watchers');
    await closeAllRepoWatchers();
    mocks.watchers.length = 0;
  });

  it('serializes unwatch and a quick re-watch of the same repository', async () => {
    const { registerWatcherHandlers } = await import('../ipc/watchers');
    registerWatcherHandlers(() => null);
    const watch = mocks.handlers.get('repo:watch');
    const unwatch = mocks.handlers.get('repo:unwatch');
    if (!watch || !unwatch) throw new Error('watcher handlers were not registered');

    const repoPath = 'C:/work/repo';
    await watch(null, repoPath);
    expect(mocks.watch).toHaveBeenCalledTimes(1);

    let finishClose: () => void = () => undefined;
    const closeGate = new Promise<void>((resolve) => {
      finishClose = resolve;
    });
    mocks.watchers[0].close.mockImplementation(() => closeGate);

    const closing = unwatch(null, repoPath);
    const reopening = watch(null, repoPath);
    await Promise.resolve();
    expect(mocks.watch).toHaveBeenCalledTimes(1);

    finishClose();
    await closing;
    await reopening;
    expect(mocks.watch).toHaveBeenCalledTimes(2);
  });
});
