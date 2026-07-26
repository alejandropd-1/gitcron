'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/hooks/use-translation';
import { PipelineDetails } from './PipelineDetails';
import { toPipelineSnapshot } from './pipeline-adapter';
import { ActivityFeed } from './ActivityFeed';
import { AgentTree } from './AgentTree';
import { ChangePath } from './ChangePath';
import { EconomyPanel } from './EconomyPanel';
import { DecisionInbox } from './DecisionInbox';
import { PipelineEmptyState } from './PipelineEmptyState';
import { PipelineNow } from './PipelineNow';
import {
  DEV_FIXTURES_ENABLED,
  PipelineDevFixturePicker,
  loadDevFixture,
  type DevFixtureName,
} from './PipelineDevFixtures';
import {
  resolvePipelineViewState,
  type PipelineSnapshot,
  type PipelineViewState,
} from './pipeline-view-state';

export type PipelineSnapshotLoader = (
  repoPath: string,
  signal: AbortSignal,
) => Promise<PipelineSnapshot | null>;

/**
 * Lector real de evidencia per-repo.
 *
 * Llama al canal `pipeline:get-snapshot` de Main —que lee el store SQLite
 * per-repo de F01— y traduce el `PipelineState` al snapshot del workspace.
 *
 * Devuelve `null` cuando el canal no existe (build web sin Electron) o cuando
 * el repo no tiene evidencia todavía. Eso resuelve al estado "sin actividad",
 * que es honesto: no se fabrica un snapshot para llenar la pantalla.
 */
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
  /** Inyectable para tests y para que TANDA 2 sustituya la fuente real. */
  loadSnapshot?: PipelineSnapshotLoader;
};

/**
 * Dueño único del estado de la feature Pipeline.
 *
 * `app/page.tsx` (1900+ líneas) no aprende nada de Pipeline: sólo pasa
 * `repoPath`, un dato que ya tenía. Fetch, snapshot y ciclo de vida viven acá.
 *
 * Dos mecanismos evitan mezclar snapshots entre repos:
 * - el llamador monta con `key={repoPath}`, así que cambiar de repo desmonta;
 * - `loadKey` descarta cualquier respuesta en vuelo que llegue tarde, y el
 *   `AbortController` cancela la request vieja al cambiar de repo o reintentar.
 */
export function PipelineWorkspace({
  repoPath,
  loadSnapshot = loadRealSnapshot,
}: PipelineWorkspaceProps) {
  const t = useT();
  const [result, setResult] = useState<LoadResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Sólo desarrollo: permite recorrer los estados sin lector de evidencia.
  const [devFixture, setDevFixture] = useState<DevFixtureName>('live');

  const loadKey = `${repoPath ?? ''}#${reloadToken}#${devFixture}`;
  // Derivado en vez de almacenado: no puede quedar desincronizado del pedido
  // que está realmente en curso.
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
        setResult({
          key: loadKey,
          snapshot: null,
          error: { messageKey: 'pipeline.error.title', canRetry: true },
        });
      });

    return () => controller.abort();
  }, [repoPath, loadKey, loadSnapshot, devFixture]);

  // Suscripción a cambios del repo. Main reemite el estado cuando detecta
  // evidencia nueva; el fixture de desarrollo no se pisa.
  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!repoPath || !api?.pipelineSubscribe || (DEV_FIXTURES_ENABLED && devFixture !== 'live')) {
      return undefined;
    }
    void api.pipelineSubscribe(repoPath);
    const off = api.onPipelineSnapshotUpdated?.((changedRepo, state) => {
      if (changedRepo !== repoPath) return;
      // Actualización funcional: conserva la clave del pedido vigente sin
      // necesitar un ref, que no puede escribirse durante el render.
      setResult((prev) => (prev
        ? { ...prev, snapshot: toPipelineSnapshot(state), error: null }
        : prev));
    });
    return () => {
      off?.();
      void api.pipelineUnsubscribe?.(repoPath);
    };
  }, [repoPath, devFixture]);

  const handleRetry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const state: PipelineViewState = resolvePipelineViewState({
    repoPath,
    snapshot: result?.snapshot ?? null,
    isLoading,
    error: result?.error ?? null,
  });

  const handleRespondDecision = useCallback((decisionId: string, optionId: string) => {
    if (!repoPath) return;
    const nonce = `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const win = typeof window !== 'undefined'
      ? (window as unknown as {
          electronAPI?: {
            pipelineControl?: {
              respondDecision?: (payload: unknown) => Promise<{ success: boolean }>;
            };
          };
        })
      : null;
    if (win?.electronAPI?.pipelineControl?.respondDecision) {
      void win.electronAPI.pipelineControl.respondDecision({
        repoPath,
        sessionId: 'session-active',
        decisionId,
        optionId,
        nonce,
      });
    }
  }, [repoPath]);

  return (
    <section
      className="pipeline-workspace"
      aria-labelledby="pipeline-title"
      data-repo-path={repoPath ?? undefined}
      data-estado={state.kind}
    >
      <h2 id="pipeline-title" className="pipeline-workspace__title">
        {t('pipeline.title')}
      </h2>

      <PipelineDevFixturePicker value={devFixture} onChange={setDevFixture} />

      {/* Polite y no assertive: el feed de actividad no debe interrumpir al
          lector de pantalla en cada cambio de estado. */}
      <p role="status" aria-live="polite" className="pipeline-workspace__status">
        {state.kind === 'loading' ? t('pipeline.loading') : ''}
      </p>

      {state.kind === 'ready' ? (
        <>
          <PipelineNow now={state.snapshot.now} repoPath={repoPath} />
          {/* El inbox va por encima del feed: es zona prioritaria, no un feed. */}
          <DecisionInbox decisions={state.snapshot.decisions} onRespondDecision={handleRespondDecision} />
          <ChangePath stations={state.snapshot.stations} />
          <AgentTree agents={state.snapshot.agents} />
          <EconomyPanel economy={state.snapshot.economy} />
          <ActivityFeed
            entries={state.snapshot.activity}
            reasoningAvailable={state.snapshot.economy.reasoningAvailable}
            agentRuntimes={Object.fromEntries(
              state.snapshot.agents.map((agent) => [agent.agentId, agent.runtime]),
            )}
          />
          <PipelineDetails snapshot={state.snapshot} />
        </>
      ) : (
        <PipelineEmptyState state={state} onRetry={handleRetry} />
      )}
    </section>
  );
}
