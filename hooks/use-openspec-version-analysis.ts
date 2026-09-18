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
  redacting: boolean;
  startedAt: number | null;
  partialText: string;
  redact: (model: string) => Promise<void>;
  cancelRedaction: () => Promise<void>;
} {
  const hasBridge = checkHasBridge();
  const shouldFetch = Boolean(enabled && repoPath && hasBridge);

  const [analysis, setAnalysis] = useState<OpenSpecVersionAnalysisResult | null>(null);
  const [loading, setLoading] = useState(shouldFetch);
  const [error, setError] = useState<string | null>(null);
  const [redacting, setRedacting] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [partialText, setPartialText] = useState('');

  const [prevParams, setPrevParams] = useState({ repoPath, enabled });
  if (prevParams.repoPath !== repoPath || prevParams.enabled !== enabled) {
    setPrevParams({ repoPath, enabled });
    setLoading(shouldFetch);
    if (!shouldFetch) {
      setAnalysis(null);
      setError(null);
      setRedacting(false);
      setStartedAt(null);
      setPartialText('');
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

  const redact = async (model: string) => {
    const trimmed = model?.trim();
    if (!trimmed || !repoPath || redacting) return;
    const api = typeof window !== 'undefined' ? (window as unknown as { api?: typeof window.api }).api : null;
    const versionAnalysisFn = api?.pipelineOpenSpec?.versionAnalysis;
    if (!versionAnalysisFn) return;

    setRedacting(true);
    setStartedAt(Date.now());
    setPartialText('');

    let accumulated = '';
    const unsubscribe = api?.pipelineOpenSpec?.onRedactionChunk?.((event) => {
      if (!event?.chunks || !Array.isArray(event.chunks)) return;
      for (const chunk of event.chunks) {
        if (
          chunk &&
          typeof chunk === 'object' &&
          'kind' in chunk &&
          chunk.kind === 'content' &&
          typeof (chunk as { text?: unknown }).text === 'string'
        ) {
          accumulated += (chunk as { text: string }).text;
          setPartialText(accumulated);
        }
      }
    });

    try {
      const result = await versionAnalysisFn(repoPath, { model: trimmed });
      if (result?.redaction) {
        setAnalysis((prev) => (prev ? { ...prev, redaction: result.redaction } : result));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setAnalysis((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          redaction: {
            provider: `LM Studio · ${trimmed}`,
            status: 'error',
            text: '',
            error: message,
          },
        };
      });
    } finally {
      unsubscribe?.();
      setRedacting(false);
      setStartedAt(null);
    }
  };

  const cancelRedaction = async () => {
    const api = typeof window !== 'undefined' ? (window as unknown as { api?: typeof window.api }).api : null;
    await api?.pipelineOpenSpec?.versionRedactionCancel?.();
  };

  return {
    analysis,
    loading,
    error,
    redacting,
    startedAt,
    partialText,
    redact,
    cancelRedaction,
  };
}
