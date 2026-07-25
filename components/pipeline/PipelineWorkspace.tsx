'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/hooks/use-translation';
import { PipelineEmptyState } from './PipelineEmptyState';
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
 * Fuente por defecto de TANDA 1.
 *
 * La lectura real de evidencia per-repo se conecta en TANDA 2, junto con la
 * vista que la consume. Hasta entonces no se fabrica un snapshot: se responde
 * honestamente "no hay actividad", que es un estado legítimo del workspace.
 */
const loadNoSnapshotYet: PipelineSnapshotLoader = async () => null;

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
  loadSnapshot = loadNoSnapshotYet,
}: PipelineWorkspaceProps) {
  const t = useT();
  const [result, setResult] = useState<LoadResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const loadKey = `${repoPath ?? ''}#${reloadToken}`;
  // Derivado en vez de almacenado: no puede quedar desincronizado del pedido
  // que está realmente en curso.
  const isLoading = Boolean(repoPath) && result?.key !== loadKey;

  useEffect(() => {
    if (!repoPath) return undefined;
    const controller = new AbortController();

    loadSnapshot(repoPath, controller.signal)
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
  }, [repoPath, loadKey, loadSnapshot]);

  const handleRetry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const state: PipelineViewState = resolvePipelineViewState({
    repoPath,
    snapshot: result?.snapshot ?? null,
    isLoading,
    error: result?.error ?? null,
  });

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

      {/* Polite y no assertive: el feed de actividad no debe interrumpir al
          lector de pantalla en cada cambio de estado. */}
      <p role="status" aria-live="polite" className="pipeline-workspace__status">
        {state.kind === 'loading' ? t('pipeline.loading') : ''}
      </p>

      {state.kind === 'ready'
        ? null /* Las vistas del workspace llegan en TANDA 2. */
        : <PipelineEmptyState state={state} onRetry={handleRetry} />}
    </section>
  );
}
