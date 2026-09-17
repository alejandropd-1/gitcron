// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOpenSpecInit } from '@/hooks/use-openspec-init';

afterEach(() => {
  cleanup();
  delete (window as unknown as { api?: unknown }).api;
});

describe('useOpenSpecInit', () => {
  let mockPipelineInitOpenSpec: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPipelineInitOpenSpec = vi.fn();
    (window as unknown as { api: unknown }).api = {
      pipelineInitOpenSpec: mockPipelineInitOpenSpec,
    };
  });

  it('runs init successfully and clears needsTool and error', async () => {
    mockPipelineInitOpenSpec.mockResolvedValue({ success: true, needsTool: false });
    const { result } = renderHook(() => useOpenSpecInit('/test/repo'));

    expect(result.current.initBusy).toBe(false);
    expect(result.current.initError).toBeNull();
    expect(result.current.initNeedsTool).toBe(false);

    let promise: Promise<void>;
    act(() => {
      promise = result.current.runOpenSpecInit(['tool-1', 'tool-2']);
    });

    expect(result.current.initBusy).toBe(true);

    await act(async () => {
      await promise;
    });

    expect(result.current.initBusy).toBe(false);
    expect(result.current.initError).toBeNull();
    expect(result.current.initNeedsTool).toBe(false);
    expect(mockPipelineInitOpenSpec).toHaveBeenCalledWith('/test/repo', ['tool-1', 'tool-2']);
  });

  it('sets initNeedsTool to true when response indicates needsTool', async () => {
    mockPipelineInitOpenSpec.mockResolvedValue({ success: false, needsTool: true });
    const { result } = renderHook(() => useOpenSpecInit('/test/repo'));

    let promise: Promise<void>;
    act(() => {
      promise = result.current.runOpenSpecInit();
    });

    await act(async () => {
      await promise;
    });

    expect(result.current.initBusy).toBe(false);
    expect(result.current.initNeedsTool).toBe(true);
    expect(result.current.initError).toBeNull();
    expect(mockPipelineInitOpenSpec).toHaveBeenCalledWith('/test/repo', undefined);
  });

  it('sets initError when response has error', async () => {
    mockPipelineInitOpenSpec.mockResolvedValue({ success: false, error: 'Command failed' });
    const { result } = renderHook(() => useOpenSpecInit('/test/repo'));

    let promise: Promise<void>;
    act(() => {
      promise = result.current.runOpenSpecInit();
    });

    await act(async () => {
      await promise;
    });

    expect(result.current.initBusy).toBe(false);
    expect(result.current.initNeedsTool).toBe(false);
    expect(result.current.initError).toBe('Command failed');
  });

  it('handles promise rejection gracefully', async () => {
    mockPipelineInitOpenSpec.mockRejectedValue(new Error('Network or process error'));
    const { result } = renderHook(() => useOpenSpecInit('/test/repo'));

    let promise: Promise<void>;
    act(() => {
      promise = result.current.runOpenSpecInit();
    });

    await act(async () => {
      await promise;
    });

    expect(result.current.initBusy).toBe(false);
    expect(result.current.initError).toBe('Network or process error');
  });

  it('no-ops when repoPath is not provided', async () => {
    const { result } = renderHook(() => useOpenSpecInit(null));

    await act(async () => {
      await result.current.runOpenSpecInit();
    });

    expect(mockPipelineInitOpenSpec).not.toHaveBeenCalled();
    expect(result.current.initBusy).toBe(false);
  });
});
