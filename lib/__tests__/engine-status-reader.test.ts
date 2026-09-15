import { describe, expect, it, vi } from 'vitest';
import {
  createEngineStatusReader,
  readEngineStatus,
  _resetDefaultEngineStatusReader,
} from '../engine-status-reader';
import type { OpenSpecEngineStatus } from '@/types/pipeline';

describe('createEngineStatusReader', () => {
  it('dos read con el mismo repoPath concurrentes llaman a fetch UNA sola vez y resuelven al mismo objeto', async () => {
    const dummyStatus = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    let resolveFetch!: (val: OpenSpecEngineStatus | null) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<OpenSpecEngineStatus | null>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const reader = createEngineStatusReader(fetchMock);
    const p1 = reader.read('C:\\repo');
    const p2 = reader.read('C:\\repo');

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(dummyStatus);
    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1).toBe(dummyStatus);
    expect(res2).toBe(dummyStatus);
  });

  it('read de dos repos distintos genera dos llamadas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus);

    const reader = createEngineStatusReader(fetchMock);
    await Promise.all([reader.read('C:\\repo1'), reader.read('C:\\repo2')]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('C:\\repo1');
    expect(fetchMock).toHaveBeenCalledWith('C:\\repo2');
  });

  it('incompleto y después completo: onResult recibe primero el incompleto y después el completo; la promesa resuelve con el completo; fetch llamado 2 veces', async () => {
    const incompleteStatus = {
      cli: { installed: true, runtimeVersion: null },
      globalConfig: null,
    } as unknown as OpenSpecEngineStatus;
    const completeStatus = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(incompleteStatus)
      .mockResolvedValueOnce(completeStatus);

    let resolveWait!: () => void;
    const waitMock = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
      resolveWait = resolve;
    }));

    const reader = createEngineStatusReader(fetchMock, {
      retryDelaysMs: [4000],
      wait: waitMock,
    });

    const results: Array<OpenSpecEngineStatus | null> = [];
    const onResult = vi.fn((s) => results.push(s));

    const promise = reader.read('C:\\repo', onResult);

    await vi.waitFor(() => {
      expect(onResult).toHaveBeenCalledTimes(1);
    });
    expect(results[0]).toBe(incompleteStatus);
    expect(waitMock).toHaveBeenCalledTimes(1);
    expect(waitMock).toHaveBeenCalledWith(4000);

    resolveWait();

    const finalResult = await promise;
    expect(finalResult).toBe(completeStatus);
    expect(onResult).toHaveBeenCalledTimes(2);
    expect(results[1]).toBe(completeStatus);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('incompleto siempre con retryDelaysMs [1, 1]: onResult llamado 3 veces; la promesa resuelve con el último; wait llamado con 1 y 1', async () => {
    const incompleteStatus = {
      cli: { installed: true, runtimeVersion: null },
      globalConfig: null,
    } as unknown as OpenSpecEngineStatus;

    const fetchMock = vi.fn().mockResolvedValue(incompleteStatus);
    const waitCalls: number[] = [];
    const waitMock = vi.fn().mockImplementation(async (ms: number) => {
      waitCalls.push(ms);
    });

    const reader = createEngineStatusReader(fetchMock, {
      retryDelaysMs: [1, 1],
      wait: waitMock,
    });

    const onResult = vi.fn();
    const finalResult = await reader.read('C:\\repo', onResult);

    expect(onResult).toHaveBeenCalledTimes(3);
    expect(onResult).toHaveBeenNthCalledWith(1, incompleteStatus);
    expect(onResult).toHaveBeenNthCalledWith(2, incompleteStatus);
    expect(onResult).toHaveBeenNthCalledWith(3, incompleteStatus);
    expect(finalResult).toBe(incompleteStatus);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(waitMock).toHaveBeenCalledTimes(2);
    expect(waitCalls).toEqual([1, 1]);
  });

  it('completo a la primera: onResult una vez; wait nunca', async () => {
    const completeStatus = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    const fetchMock = vi.fn().mockResolvedValue(completeStatus);
    const waitMock = vi.fn().mockResolvedValue(undefined);

    const reader = createEngineStatusReader(fetchMock, {
      retryDelaysMs: [4000, 10000],
      wait: waitMock,
    });

    const onResult = vi.fn();
    const result = await reader.read('C:\\repo', onResult);

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(completeStatus);
    expect(waitMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(completeStatus);
  });

  it('un segundo read() durante una lectura en vuelo que ya tiene latest: recibe latest de inmediato, recibe también el resultado del reintento, y fetch NO se llama de nuevo', async () => {
    const incompleteStatus = {
      cli: { installed: true, runtimeVersion: null },
      globalConfig: null,
    } as unknown as OpenSpecEngineStatus;
    const completeStatus = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(incompleteStatus)
      .mockResolvedValueOnce(completeStatus);

    let resolveWait!: () => void;
    const waitMock = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
      resolveWait = resolve;
    }));

    const reader = createEngineStatusReader(fetchMock, {
      retryDelaysMs: [4000],
      wait: waitMock,
    });

    const firstOnResult = vi.fn();
    const p1 = reader.read('C:\\repo', firstOnResult);

    await vi.waitFor(() => {
      expect(firstOnResult).toHaveBeenCalledWith(incompleteStatus);
    });
    expect(waitMock).toHaveBeenCalledTimes(1);

    const secondOnResult = vi.fn();
    const p2 = reader.read('C:\\repo', secondOnResult);

    expect(secondOnResult).toHaveBeenCalledTimes(1);
    expect(secondOnResult).toHaveBeenCalledWith(incompleteStatus);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveWait();

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1).toBe(completeStatus);
    expect(res2).toBe(completeStatus);
    expect(firstOnResult).toHaveBeenCalledTimes(2);
    expect(firstOnResult).toHaveBeenNthCalledWith(2, completeStatus);
    expect(secondOnResult).toHaveBeenCalledTimes(2);
    expect(secondOnResult).toHaveBeenNthCalledWith(2, completeStatus);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fetch que rechaza: la promesa rechaza, onResult nunca se llama, y una lectura posterior del mismo repo vuelve a llamar a fetch', async () => {
    const error = new Error('Process timeout');
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw error;
      }
      return {
        cli: { installed: true, runtimeVersion: '1.12.0' },
        globalConfig: { profileState: 'read' },
      } as unknown as OpenSpecEngineStatus;
    });

    const reader = createEngineStatusReader(fetchMock);
    const onResult1 = vi.fn();

    await expect(reader.read('C:\\repo', onResult1)).rejects.toThrow('Process timeout');
    expect(onResult1).not.toHaveBeenCalled();

    const onResult2 = vi.fn();
    const result2 = await reader.read('C:\\repo', onResult2);
    expect(result2).toBeDefined();
    expect(onResult2).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('un segundo read() antes de que termine el primer fetch suma el listener y ambos reciben el resultado', async () => {
    const dummyStatus = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    let resolveFetch!: (val: OpenSpecEngineStatus | null) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<OpenSpecEngineStatus | null>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const reader = createEngineStatusReader(fetchMock);
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const p1 = reader.read('C:\\repo', listener1);
    const p2 = reader.read('C:\\repo', listener2);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();

    resolveFetch(dummyStatus);
    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1).toBe(dummyStatus);
    expect(res2).toBe(dummyStatus);
    expect(listener1).toHaveBeenCalledWith(dummyStatus);
    expect(listener2).toHaveBeenCalledWith(dummyStatus);
  });

  it('read sin onResult resuelve la promesa final correctamente tras reintentos', async () => {
    const incompleteStatus = {
      cli: { installed: true, runtimeVersion: null },
      globalConfig: null,
    } as unknown as OpenSpecEngineStatus;
    const completeStatus = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(incompleteStatus)
      .mockResolvedValueOnce(completeStatus);

    const waitMock = vi.fn().mockResolvedValue(undefined);

    const reader = createEngineStatusReader(fetchMock, {
      retryDelaysMs: [1],
      wait: waitMock,
    });

    const res = await reader.read('C:\\repo');
    expect(res).toBe(completeStatus);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('readEngineStatus (función global lazy)', () => {
  it('devuelve null si window.api?.pipelineOpenSpec?.getEngineStatus no existe', async () => {
    _resetDefaultEngineStatusReader();
    const originalApi = (globalThis as unknown as { window?: { api?: unknown } }).window?.api;
    try {
      (globalThis as unknown as { window?: { api?: unknown } }).window = {} as unknown as Window & typeof globalThis;
      const res = await readEngineStatus('C:\\repo');
      expect(res).toBeNull();
    } finally {
      if (originalApi) {
        (globalThis as unknown as { window: { api: unknown } }).window.api = originalApi;
      }
      _resetDefaultEngineStatusReader();
    }
  });

  it('construye el lector y delega a window.api.pipelineOpenSpec.getEngineStatus entregando por onResult', async () => {
    _resetDefaultEngineStatusReader();
    const mockStatus = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    const mockGetEngineStatus = vi.fn().mockResolvedValue(mockStatus);

    const prevWindow = globalThis.window;
    try {
      (globalThis as unknown as { window: unknown }).window = {
        api: {
          pipelineOpenSpec: {
            getEngineStatus: mockGetEngineStatus,
          },
        },
      };

      const onResult = vi.fn();
      const result = await readEngineStatus('C:\\repo', onResult);
      expect(result).toBe(mockStatus);
      expect(onResult).toHaveBeenCalledWith(mockStatus);
      expect(mockGetEngineStatus).toHaveBeenCalledWith('C:\\repo');
    } finally {
      (globalThis as unknown as { window: unknown }).window = prevWindow;
      _resetDefaultEngineStatusReader();
    }
  });

  it('captura la referencia de getEngineStatus al crear el lector para aislar llamadas ante cambios de window.api', async () => {
    _resetDefaultEngineStatusReader();
    const oldApiMock = vi.fn().mockResolvedValue({
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus);

    const prevWindow = globalThis.window;
    try {
      (globalThis as unknown as { window: unknown }).window = {
        api: {
          pipelineOpenSpec: {
            getEngineStatus: oldApiMock,
          },
        },
      };

      await readEngineStatus('C:\\repo');
      expect(oldApiMock).toHaveBeenCalledWith('C:\\repo');
    } finally {
      (globalThis as unknown as { window: unknown }).window = prevWindow;
      _resetDefaultEngineStatusReader();
    }
  });
});

