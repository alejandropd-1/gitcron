'use client';

import { useEffect, useState } from 'react';
import type { OpenSpecVersionAnalysisResult } from '@/types/pipeline';

function checkHasBridge(): boolean {
  if (typeof window === 'undefined') return false;
  const api = (window as unknown as { api?: typeof window.api }).api;
  return Boolean(api?.pipelineOpenSpec?.versionAnalysis);
}

export function useOpenSpecVersionAnalysis(
  repoPath: string | null | undefined,
  enabled: boolean,
): {
  analysis: OpenSpecVersionAnalysisResult | null;
  loading: boolean;
  error: string | null;
} {
  const hasBridge = checkHasBridge();
  const shouldFetch = Boolean(enabled && repoPath && hasBridge);

  const [analysis, setAnalysis] = useState<OpenSpecVersionAnalysisResult | null>(null);
  const [loading, setLoading] = useState(shouldFetch);
  const [error, setError] = useState<string | null>(null);

  const [prevParams, setPrevParams] = useState({ repoPath, enabled });
  if (prevParams.repoPath !== repoPath || prevParams.enabled !== enabled) {
    setPrevParams({ repoPath, enabled });
    setLoading(shouldFetch);
    if (!shouldFetch) {
      setAnalysis(null);
      setError(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    if (!enabled || !repoPath) {
      return;
    }

    const api = typeof window !== 'undefined' ? (window as unknown as { api?: typeof window.api }).api : null;
    const versionAnalysisFn = api?.pipelineOpenSpec?.versionAnalysis;

    if (!versionAnalysisFn) {
      return;
    }

    versionAnalysisFn(repoPath)
      .then((result) => {
        if (cancelled) return;
        setAnalysis(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message || 'Error desconocido al analizar la versión de OpenSpec');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [repoPath, enabled]);

  return {
    analysis,
    loading,
    error,
  };
}
