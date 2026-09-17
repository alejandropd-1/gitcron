// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOpenSpecVersionAnalysis } from '@/hooks/use-openspec-version-analysis';
import type { OpenSpecVersionAnalysisResult } from '@/types/pipeline';

const mockAnalysisResult: OpenSpecVersionAnalysisResult = {
  measured: {
    installedVersion: '1.11.0',
    availableVersion: '1.13.0',
    isUpgradeAvailable: true,
    versionClass: 'supported',
    behindCycle: false,
    targetVersion: '1.13.0',
    supportedRange: { min: '1.5.0' },
    changelog: {
      source: 'GitHub Releases (fission-ai/openspec)',
      sourceUrl: 'https://github.com/fission-ai/openspec/releases/tag/v1.13.0',
      fetched: true,
      rawText: '## What\'s New in v1.13.0\n\nRelease notes text.\n\n- Feature A - details',
      error: null,
    },
    consumedSurfaces: [
      { surface: 'status', description: 'Status checks', verdict: 'compatible', evidence: 'no change' },
      { surface: 'instructions', description: 'Agent instructions', verdict: 'compatible', evidence: 'no change' },
    ],
    breakingChangesDetected: false,
    strategyProposal: null,
  },
  redaction: {
    provider: 'lmstudio:local-model',
    status: 'offline',
    text: '',
    error: null,
  },
};

describe('useOpenSpecVersionAnalysis', () => {
  let mockVersionAnalysis: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockVersionAnalysis = vi.fn();
    (window as unknown as { api: unknown }).api = {
      pipelineOpenSpec: {
        versionAnalysis: mockVersionAnalysis,
      },
    };
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as { api?: unknown }).api;
    vi.restoreAllMocks();
  });

  it('no llama a versionAnalysis cuando enabled es false', () => {
    const { result } = renderHook(() => useOpenSpecVersionAnalysis('/test/repo', false));
    expect(mockVersionAnalysis).not.toHaveBeenCalled();
    expect(result.current.analysis).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('llama UNA vez con repoPath cuando enabled es true y expone el análisis', async () => {
    mockVersionAnalysis.mockResolvedValue(mockAnalysisResult);
    const { result } = renderHook(() => useOpenSpecVersionAnalysis('/test/repo', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockVersionAnalysis).toHaveBeenCalledTimes(1);
    expect(mockVersionAnalysis).toHaveBeenCalledWith('/test/repo');
    expect(result.current.analysis).toEqual(mockAnalysisResult);
    expect(result.current.error).toBeNull();
  });

  it('devuelve analysis null y error null si el puente no existe', async () => {
    delete (window as unknown as { api?: unknown }).api;
    const { result } = renderHook(() => useOpenSpecVersionAnalysis('/test/repo', true));

    expect(result.current.analysis).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('captura el rechazo y expone el mensaje de error', async () => {
    mockVersionAnalysis.mockRejectedValue(new Error('Fallo de red al consultar la versión'));
    const { result } = renderHook(() => useOpenSpecVersionAnalysis('/test/repo', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.analysis).toBeNull();
    expect(result.current.error).toBe('Fallo de red al consultar la versión');
  });
});
