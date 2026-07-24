import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineState } from '../../types/pipeline';

type Handler = (_event: unknown, ...args: unknown[]) => unknown;
const ipc = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  handle: vi.fn((channel: string, handler: Handler) => ipc.handlers.set(channel, handler)),
}));

vi.mock('electron', () => ({ ipcMain: { handle: ipc.handle } }));

const snapshot: PipelineState = {
  repoId: 'repo-1', revision: 1, observedAt: '2026-07-23T20:00:00.000Z', tasks: [], reports: [], gates: [],
  activeChanges: [], archivedChanges: [], mergedChanges: [], diagnostics: [], delegations: [], visualDiffs: [], decisions: [],
  selection: { changeId: null, confidence: 'unknown', selectionRequired: false, reason: 'no-active-change' },
};

describe('Pipeline read-only IPC', () => {
  beforeEach(() => {
    ipc.handlers.clear();
    ipc.handle.mockClear();
  });

  it('registers only snapshot subscription channels and validates paths', async () => {
    const refresh = vi.fn(async () => snapshot);
    const send = vi.fn();
    const { registerPipelineHandlers } = await import('../ipc/pipeline');
    registerPipelineHandlers(() => ({ webContents: { send } }) as never, { refresh } as never);
    expect([...ipc.handlers.keys()]).toEqual(['pipeline:get-snapshot', 'pipeline:subscribe', 'pipeline:unsubscribe']);
    await expect(ipc.handlers.get('pipeline:get-snapshot')?.(null, '')).resolves.toMatchObject({ success: false });
    expect(refresh).not.toHaveBeenCalled();
    await expect(ipc.handlers.get('pipeline:get-snapshot')?.(null, 'C:/repo')).resolves.toEqual({ success: true, data: snapshot });
  });

  it('refreshes subscribed repos on the watcher trigger and stops after unsubscribe', async () => {
    const refresh = vi.fn(async () => snapshot);
    const send = vi.fn();
    const { registerPipelineHandlers } = await import('../ipc/pipeline');
    const notify = registerPipelineHandlers(() => ({ webContents: { send } }) as never, { refresh } as never);
    let destroyed: (() => void) | undefined;
    const event = { sender: { id: 1, once: vi.fn((_name: string, callback: () => void) => { destroyed = callback; }) } };
    await ipc.handlers.get('pipeline:subscribe')?.(event, 'C:/repo');
    notify('C:/repo');
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith('pipeline:snapshot-updated', { repoPath: 'C:/repo', snapshot }));
    send.mockClear();
    await ipc.handlers.get('pipeline:unsubscribe')?.(event, 'C:/repo');
    notify('C:/repo');
    await Promise.resolve();
    expect(send).not.toHaveBeenCalled();
    expect(destroyed).toBeTypeOf('function');
  });

  it('cleans a subscription when its renderer is destroyed', async () => {
    const refresh = vi.fn(async () => snapshot);
    const send = vi.fn();
    const { registerPipelineHandlers } = await import('../ipc/pipeline');
    const notify = registerPipelineHandlers(() => ({ webContents: { send } }) as never, { refresh } as never);
    let destroyed: (() => void) | undefined;
    await ipc.handlers.get('pipeline:subscribe')?.({ sender: { id: 1, once: (_name: string, callback: () => void) => { destroyed = callback; } } }, 'C:/repo');
    destroyed?.();
    notify('C:/repo');
    await Promise.resolve();
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps a repo subscribed while another renderer still observes it', async () => {
    const refresh = vi.fn(async () => snapshot);
    const send = vi.fn();
    const { registerPipelineHandlers } = await import('../ipc/pipeline');
    const notify = registerPipelineHandlers(() => ({ webContents: { send } }) as never, { refresh } as never);
    let destroyFirst: (() => void) | undefined;
    await ipc.handlers.get('pipeline:subscribe')?.({ sender: { id: 1, once: (_name: string, callback: () => void) => { destroyFirst = callback; } } }, 'C:/repo');
    await ipc.handlers.get('pipeline:subscribe')?.({ sender: { id: 2, once: vi.fn() } }, 'C:/repo');
    destroyFirst?.();
    notify('C:/repo');
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
  });
});
