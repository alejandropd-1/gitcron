'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { RuntimeProjection } from '@/types/pipeline';
import { mergeRuntimeIntoSnapshot, toPipelineSnapshot } from './pipeline-adapter';
import { DEV_FIXTURE_NAMES, DEV_FIXTURES_ENABLED, loadDevFixture, type DevFixtureName } from './PipelineDevFixtures';
import { PipelineEmptyState } from './PipelineEmptyState';
import { OpenSpecDashboard } from './OpenSpecDashboard';
import { SUPPORTED_SNAPSHOT_VERSION, type PipelineSnapshot, type PipelineViewState } from './pipeline-view-state';
import styles from './OpenSpecDashboard.module.css';

export type PipelineSnapshotLoader = (
  repoPath: string,
  signal: AbortSignal,
) => Promise<PipelineSnapshot | null>;

const loadRealSnapshot: PipelineSnapshotLoader = async (repoPath) => {
  const api = typeof window !== 'undefined' ? window.api : undefined;
  if (!api?.pipelineGetSnapshot) return null;
  const result = await api.pipelineGetSnapshot(repoPath);
  if (!result?.success || !result.data) return null;
  return toPipelineSnapshot(result.data);
};

type LoadResult = {
  key: string;
  snapshot: PipelineSnapshot | null;
  error: { messageKey: string; canRetry: boolean } | null;
};

export type PipelineWorkspaceProps = {
  repoPath: string | null;
  currentBranch?: string;
  workingTreeClean?: boolean;
  leftOpen?: boolean;
  rightOpen?: boolean;
  leftWidth?: number;
  rightWidth?: number;
  onResizeLeft?: (event: React.MouseEvent) => void;
  onResizeRight?: (event: React.MouseEvent) => void;
  loadSnapshot?: PipelineSnapshotLoader;
};

/**
 * Frontera única de la solapa Pipeline.
 *
 * La carcasa global sólo entrega el estado de sus dos paneles. Este componente
 * conserva la lectura per-repo, el stream vivo y los controles supervisados,
 * pero presenta la evidencia como un workspace OpenSpec en lugar del tablero
 * experimental de siete fases.
 */
export function PipelineWorkspace({
  repoPath,
  currentBranch = '',
  workingTreeClean = true,
  leftOpen = true,
  rightOpen = true,
  leftWidth = 288,
  rightWidth = 320,
  onResizeLeft = () => undefined,
  onResizeRight = () => undefined,
  loadSnapshot = loadRealSnapshot,
}: PipelineWorkspaceProps) {
  const t = useT();
  const [result, setResult] = useState<LoadResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [devFixture] = useState<DevFixtureName>(() => {
    if (!DEV_FIXTURES_ENABLED || typeof window === 'undefined') return 'live';
    const fixture = new URLSearchParams(window.location.search).get('pipelineFixture');
    return fixture && DEV_FIXTURE_NAMES.includes(fixture as DevFixtureName)
      ? fixture as DevFixtureName
      : 'live';
  });
  const [projection, setProjection] = useState<RuntimeProjection | null>(null);
  const [runtimeHistory, setRuntimeHistory] = useState<RuntimeProjection[]>([]);
  const [controlNotice, setControlNotice] = useState<string | null>(null);

  const loadKey = `${repoPath ?? ''}#${reloadToken}#${devFixture}`;
  const isLoading = Boolean(repoPath) && result?.key !== loadKey;

  useEffect(() => {
    if (!repoPath) return undefined;
    const controller = new AbortController();
    const load = DEV_FIXTURES_ENABLED && devFixture !== 'live'
      ? loadDevFixture(devFixture)
      : loadSnapshot(repoPath, controller.signal);

    load
      .then((snapshot) => {
        if (controller.signal.aborted) return;
        setResult({ key: loadKey, snapshot, error: null });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult({ key: loadKey, snapshot: null, error: { messageKey: 'pipeline.error.title', canRetry: true } });
      });
    return () => controller.abort();
  }, [repoPath, loadKey, loadSnapshot, devFixture]);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!repoPath || !api?.pipelineSubscribe || (DEV_FIXTURES_ENABLED && devFixture !== 'live')) return undefined;
    void api.pipelineSubscribe(repoPath);
    const off = api.onPipelineSnapshotUpdated?.((changedRepo, state) => {
      if (changedRepo !== repoPath) return;
      setResult((previous) => previous
        ? { ...previous, snapshot: toPipelineSnapshot(state), error: null }
        : previous);
    });
    return () => {
      off?.();
      void api.pipelineUnsubscribe?.(repoPath);
    };
  }, [repoPath, devFixture]);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!repoPath || !api?.pipelineRuntime) return undefined;
    let cancelled = false;
    void Promise.all([
      api.pipelineRuntime.get(repoPath),
      api.pipelineRuntime.history(repoPath, 30),
    ]).then(([currentResponse, historyResponse]) => {
      if (cancelled) return;
      setProjection(currentResponse?.success ? currentResponse.data ?? null : null);
      setRuntimeHistory(historyResponse?.success ? historyResponse.data ?? [] : []);
    });
    const off = api.onPipelineRuntimeUpdated?.((changedRepo, next) => {
      if (changedRepo !== repoPath) return;
      setProjection(next);
      if (next) {
        setRuntimeHistory((previous) => [
          next,
          ...previous.filter((entry) => entry.sessionId !== next.sessionId),
        ].slice(0, 30));
      }
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, [repoPath]);

  const handleRetry = useCallback(() => setReloadToken((token) => token + 1), []);
  const fixtureActive = DEV_FIXTURES_ENABLED && devFixture !== 'live';
  const snapshot = result?.snapshot
    ? mergeRuntimeIntoSnapshot(result.snapshot, fixtureActive ? null : projection)
    : null;

  const handleRespondDecision = useCallback((decisionId: string, optionId: string) => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!repoPath || !api?.pipelineControl?.respondDecision) return;
    if (!projection?.active) {
      setControlNotice('pipeline.control.noSession');
      return;
    }
    if (!projection.controlCapabilities.includes('respond-decision')) {
      setControlNotice('pipeline.control.respondUnsupported');
      return;
    }
    setControlNotice(null);
    void api.pipelineControl.respondDecision({
      repoPath,
      sessionId: projection.sessionId,
      decisionId,
      optionId,
      nonce: `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });
  }, [repoPath, projection]);

  const handlePauseAfterTask = useCallback(() => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!repoPath || !projection?.active || !api?.pipelineControl?.pause) {
      setControlNotice('pipeline.control.noSession');
      return;
    }
    if (!projection.controlCapabilities.includes('pause-after-task')) {
      setControlNotice('pipeline.control.respondUnsupported');
      return;
    }
    setControlNotice('pipeline.control.ackPending');
    void api.pipelineControl.pause({
      repoPath,
      sessionId: projection.sessionId,
      mode: 'after-task',
      nonce: `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }).then((response) => {
      const success = (response as { success?: boolean } | null)?.success === true;
      setControlNotice(success ? 'pipeline.control.ackSuccess' : 'pipeline.control.ackError');
    }).catch(() => setControlNotice('pipeline.control.ackError'));
  }, [repoPath, projection]);

  let nonReadyState: Exclude<PipelineViewState, { kind: 'ready' }> | null = null;
  if (!repoPath) nonReadyState = { kind: 'no-repo' };
  else if (result?.error) nonReadyState = { kind: 'error', ...result.error };
  else if (isLoading) nonReadyState = { kind: 'loading' };
  else if (!snapshot) nonReadyState = { kind: 'no-pipeline' };
  else if (snapshot.schemaVersion !== SUPPORTED_SNAPSHOT_VERSION) {
    nonReadyState = { kind: 'incompatible', foundVersion: snapshot.schemaVersion || null };
  }

  return (
    <section className={styles.workspace} aria-label={t('pipeline.title')} data-repo-path={repoPath ?? undefined}>
      {controlNotice && (
        <p className="pipeline-workspace__notice" role="status" aria-live="polite">{t(controlNotice)}</p>
      )}
      {snapshot && repoPath && !nonReadyState ? (
        <OpenSpecDashboard
          snapshot={snapshot}
          repoPath={repoPath}
          currentBranch={currentBranch}
          workingTreeClean={workingTreeClean}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          leftWidth={leftWidth}
          rightWidth={rightWidth}
          onResizeLeft={onResizeLeft}
          onResizeRight={onResizeRight}
          projection={fixtureActive ? null : projection}
          runtimeHistory={fixtureActive ? [] : runtimeHistory}
          fixtureActive={fixtureActive}
          onRefresh={handleRetry}
          onPauseAfterTask={handlePauseAfterTask}
          onRespondDecision={handleRespondDecision}
        />
      ) : nonReadyState ? (
        <div className="pipeline-workspace__empty">
          <PipelineEmptyState state={nonReadyState} onRetry={handleRetry} />
        </div>
      ) : null}
    </section>
  );
}
