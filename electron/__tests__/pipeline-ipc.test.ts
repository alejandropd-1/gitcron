import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineState } from '../../types/pipeline';

type Handler = (_event: unknown, ...args: unknown[]) => unknown;
const ipc = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  handle: vi.fn((channel: string, handler: Handler) => ipc.handlers.set(channel, handler)),
}));

vi.mock('electron', () => ({ ipcMain: { handle: ipc.handle } }));

const snapshot: PipelineState = {
  repoId: 'repo-1', revision: 1, observedAt: '2026-07-23T20:00:00.000Z', tasks: [], reports: [],
  activeChanges: [], archivedChanges: [], mergedChanges: [], diagnostics: [], decisions: [],
  selection: { changeId: null, confidence: 'unknown', selectionRequired: false, reason: 'no-active-change' },
};

vi.mock('../ipc/authorized-repos', () => ({
  authorizedRepoStore: {
    isAuthorized: vi.fn((path: string) => path === 'C:/repo' || path === 'C:\\repo'),
  }
}));

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

  /**
   * Leer evidencia cuesta segundos. Estas pruebas fijan el control de
   * concurrencia y la memoria de selección: sin ellos, cada guardado de archivo
   * apilaba lecturas superpuestas y el snapshot emitido revertía la selección
   * manual del usuario a la automática por branch.
   */
  it('collapses concurrent identical refreshes into a single read', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const refresh = vi.fn(async () => { await gate; return snapshot; });
    const { registerPipelineHandlers } = await import('../ipc/pipeline');
    registerPipelineHandlers(() => ({ webContents: { send: vi.fn() } }) as never, { refresh } as never);

    const first = ipc.handlers.get('pipeline:get-snapshot')?.(null, 'C:/repo', 'change-a');
    const second = ipc.handlers.get('pipeline:get-snapshot')?.(null, 'C:/repo', 'change-a');
    release?.();

    await expect(first).resolves.toEqual({ success: true, data: snapshot });
    await expect(second).resolves.toEqual({ success: true, data: snapshot });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not share a read between different selections', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const refresh = vi.fn(async () => { await gate; return snapshot; });
    const { registerPipelineHandlers } = await import('../ipc/pipeline');
    registerPipelineHandlers(() => ({ webContents: { send: vi.fn() } }) as never, { refresh } as never);

    const first = ipc.handlers.get('pipeline:get-snapshot')?.(null, 'C:/repo', 'change-a');
    const second = ipc.handlers.get('pipeline:get-snapshot')?.(null, 'C:/repo', 'change-b');
    release?.();
    await Promise.all([first, second]);

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledWith('C:/repo', 'change-a');
    expect(refresh).toHaveBeenCalledWith('C:/repo', 'change-b');
  });

  it('keeps the manual selection on watcher-driven refreshes', async () => {
    const refresh = vi.fn(async () => snapshot);
    const send = vi.fn();
    const { registerPipelineHandlers } = await import('../ipc/pipeline');
    const notify = registerPipelineHandlers(() => ({ webContents: { send } }) as never, { refresh } as never);
    await ipc.handlers.get('pipeline:subscribe')?.({ sender: { id: 1, once: vi.fn() } }, 'C:/repo', 'change-a');
    refresh.mockClear();

    notify('C:/repo');
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalledWith('C:/repo', 'change-a');
  });

  it('queues exactly one rerun when changes arrive during an in-flight read', async () => {
    let release: (() => void) | undefined;
    let gate = new Promise<void>((resolve) => { release = resolve; });
    const refresh = vi.fn(async () => { await gate; return snapshot; });
    const send = vi.fn();
    const { registerPipelineHandlers } = await import('../ipc/pipeline');
    const notify = registerPipelineHandlers(() => ({ webContents: { send } }) as never, { refresh } as never);
    // La suscripción resuelve su propia lectura antes de abrir la compuerta.
    release?.();
    await ipc.handlers.get('pipeline:subscribe')?.({ sender: { id: 1, once: vi.fn() } }, 'C:/repo');
    refresh.mockClear();

    gate = new Promise<void>((resolve) => { release = resolve; });
    notify('C:/repo');           // arranca la lectura y queda en vuelo
    notify('C:/repo');           // llega durante el vuelo -> marca sucio
    notify('C:/repo');           // otra mas -> sigue siendo un solo rerun
    expect(refresh).toHaveBeenCalledTimes(1);

    release?.();
    // Una relectura, no tres: el flag es booleano, no un contador.
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
  });

  it('forgets the remembered selection once the last subscriber leaves', async () => {
    const refresh = vi.fn(async () => snapshot);
    const send = vi.fn();
    const { registerPipelineHandlers } = await import('../ipc/pipeline');
    const notify = registerPipelineHandlers(() => ({ webContents: { send } }) as never, { refresh } as never);
    const event = { sender: { id: 1, once: vi.fn() } };
    await ipc.handlers.get('pipeline:subscribe')?.(event, 'C:/repo', 'change-a');
    await ipc.handlers.get('pipeline:unsubscribe')?.(event, 'C:/repo');
    refresh.mockClear();

    notify('C:/repo');
    await Promise.resolve();
    expect(refresh).not.toHaveBeenCalled();

    // Volver a suscribirse sin selección no debe heredar la anterior.
    await ipc.handlers.get('pipeline:subscribe')?.({ sender: { id: 2, once: vi.fn() } }, 'C:/repo');
    refresh.mockClear();
    notify('C:/repo');
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledWith('C:/repo', null));
  });
});
