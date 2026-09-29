// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeProjection } from '@/types/pipeline';
import { usePipelineDecisionControl } from '../use-pipeline-decision-control';

function mockProjection(overrides: Partial<RuntimeProjection> = {}): RuntimeProjection {
  return {
    schemaVersion: '1.0',
    repoId: 'repo-1',
    sessionId: 'sess-1',
    runtime: 'claude',
    changeId: null,
    taskId: null,
    role: 'orchestrator',
    active: true,
    outcome: null,
    startedAt: '2026-09-29T10:00:00.000Z',
    endedAt: null,
    agents: [],
    activity: [],
    reasoningVisibility: 'emitted',
    telemetry: null,
    controlCapabilities: ['respond-decision'],
    droppedActivity: 0,
    diagnostics: [],
    ...overrides,
  } as unknown as RuntimeProjection;
}

describe('usePipelineDecisionControl', () => {
  const respondDecisionSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        pipelineControl: {
          respondDecision: respondDecisionSpy,
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    delete (window as { api?: unknown }).api;
  });

  it('1. estado «enviando» por decisión durante el vuelo IPC', async () => {
    let resolveIpc: (val: unknown) => void = () => {};
    respondDecisionSpy.mockReturnValue(
      new Promise((resolve) => {
        resolveIpc = resolve;
      }),
    );

    const { result } = renderHook(
      ({ repo, proj }) => usePipelineDecisionControl(repo, proj),
      {
        initialProps: {
          repo: 'C:/repo-a',
          proj: mockProjection(),
        },
      },
    );

    expect(result.current.isDecisionSending('dec-1')).toBe(false);
    expect(result.current.sendingDecisions['dec-1']).toBeUndefined();

    let promise: Promise<boolean>;
    act(() => {
      promise = result.current.respondDecision('dec-1', 'opt-yes');
    });

    expect(result.current.isDecisionSending('dec-1')).toBe(true);
    expect(result.current.sendingDecisions['dec-1']).toBe(true);
    // Otra decisión no está en estado de envío
    expect(result.current.isDecisionSending('dec-2')).toBe(false);

    await act(async () => {
      resolveIpc({ success: true });
      await promise;
    });

    expect(result.current.isDecisionSending('dec-1')).toBe(false);
    expect(result.current.sendingDecisions['dec-1']).toBeUndefined();
  });

  it('2. error visible si el IPC rechaza o devuelve error', async () => {
    // Subcaso A: devuelve success: false
    respondDecisionSpy.mockResolvedValueOnce({ success: false, error: 'rejected' });
    const { result, rerender } = renderHook(
      ({ repo, proj }) => usePipelineDecisionControl(repo, proj),
      {
        initialProps: {
          repo: 'C:/repo-a',
          proj: mockProjection(),
        },
      },
    );

    await act(async () => {
      await result.current.respondDecision('dec-1', 'opt-yes');
    });

    expect(result.current.controlNotice).toBe('pipeline.decision.error');
    expect(result.current.isDecisionSending('dec-1')).toBe(false);

    // Subcaso B: IPC rechaza con excepción
    respondDecisionSpy.mockRejectedValueOnce(new Error('Network error'));
    await act(async () => {
      await result.current.respondDecision('dec-2', 'opt-no');
    });

    expect(result.current.controlNotice).toBe('pipeline.decision.error');
    expect(result.current.isDecisionSending('dec-2')).toBe(false);
  });

  it('3. protección de doble clic: no vuelve a enviar mientras la decisión está en vuelo', async () => {
    let resolveIpc: (val: unknown) => void = () => {};
    respondDecisionSpy.mockReturnValue(
      new Promise((resolve) => {
        resolveIpc = resolve;
      }),
    );

    const { result } = renderHook(
      ({ repo, proj }) => usePipelineDecisionControl(repo, proj),
      {
        initialProps: {
          repo: 'C:/repo-a',
          proj: mockProjection(),
        },
      },
    );

    let firstPromise: Promise<boolean>;
    let secondPromise: Promise<boolean>;

    act(() => {
      firstPromise = result.current.respondDecision('dec-1', 'opt-yes');
      // Segundo clic inmediato mientras está enviándose
      secondPromise = result.current.respondDecision('dec-1', 'opt-yes');
    });

    expect(respondDecisionSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveIpc({ success: true });
      await firstPromise;
      await secondPromise;
    });

    expect(respondDecisionSpy).toHaveBeenCalledTimes(1);
  });

  it('4. respuesta que llega después de cambiar de repositorio no toca el estado del repositorio nuevo', async () => {
    let resolveIpc: (val: unknown) => void = () => {};
    respondDecisionSpy.mockReturnValue(
      new Promise((resolve) => {
        resolveIpc = resolve;
      }),
    );

    const { result, rerender } = renderHook(
      ({ repo, proj }) => usePipelineDecisionControl(repo, proj),
      {
        initialProps: {
          repo: 'C:/repo-old',
          proj: mockProjection(),
        },
      },
    );

    let promise: Promise<boolean>;
    act(() => {
      promise = result.current.respondDecision('dec-old', 'opt-yes');
    });

    expect(result.current.isDecisionSending('dec-old')).toBe(true);

    // Usuario cambia al nuevo repositorio
    rerender({
      repo: 'C:/repo-new',
      proj: mockProjection(),
    });

    // En el nuevo repo las decisiones anteriores no están enviándose y no hay aviso previo
    expect(result.current.isDecisionSending('dec-old')).toBe(false);
    expect(result.current.controlNotice).toBeNull();

    // Llega respuesta fallida para el repositorio viejo
    await act(async () => {
      resolveIpc({ success: false });
      await promise;
    });

    // El estado del nuevo repo no fue contaminado: no hay error ni decisiones en vuelo
    expect(result.current.controlNotice).toBeNull();
    expect(result.current.isDecisionSending('dec-old')).toBe(false);
  });
});
