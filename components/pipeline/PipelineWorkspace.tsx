'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { RuntimeProjection } from '@/types/pipeline';
import { PipelineDetails } from './PipelineDetails';
import { PipelineRuntimeLauncher } from './PipelineRuntimeLauncher';
import { mergeRuntimeIntoSnapshot, toPipelineSnapshot } from './pipeline-adapter';
import { ActivityFeed } from './ActivityFeed';
import { AgentTree } from './AgentTree';
import { ChangePath } from './ChangePath';
import { EconomyPanel } from './EconomyPanel';
import { DecisionInbox } from './DecisionInbox';
import { PipelineEmptyState } from './PipelineEmptyState';
import { PipelineHud } from './PipelineHud';
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
  // Sesión de runtime viva. Vive separada del snapshot porque tiene otro ciclo
  // de vida: el snapshot se recarga, la sesión se abre y se cierra.
  const [projection, setProjection] = useState<RuntimeProjection | null>(null);
  // Por qué un control no se pudo ejecutar. Clave i18n, nunca texto libre.
  const [controlNotice, setControlNotice] = useState<string | null>(null);

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

  // Sesión de runtime: estado inicial y empuje de deltas coalescidos por Main.
  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!repoPath || !api?.pipelineRuntime) return undefined;

    let cancelled = false;
    void api.pipelineRuntime.get(repoPath).then((response) => {
      if (cancelled) return;
      setProjection(response?.success ? response.data ?? null : null);
    });

    const off = api.onPipelineRuntimeUpdated?.((changedRepo, next) => {
      if (changedRepo !== repoPath) return;
      setProjection(next);
    });

    return () => {
      cancelled = true;
      off?.();
    };
  }, [repoPath]);

  const handleRetry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const fixtureActive = DEV_FIXTURES_ENABLED && devFixture !== 'live';

  // La sesión viva se superpone SÓLO al snapshot de evidencia real.
  //
  // Superponerla a un fixture dejaba el stream verdadero y los datos inventados
  // indistinguibles en la misma pantalla, que es exactamente lo que esta fase
  // existe para impedir. Con un fixture elegido, la sesión no se mezcla —siga
  // corriendo o no— y el lanzador queda bloqueado.
  const mergedSnapshot = result?.snapshot
    ? mergeRuntimeIntoSnapshot(result.snapshot, fixtureActive ? null : projection)
    : null;

  const state: PipelineViewState = resolvePipelineViewState({
    repoPath,
    snapshot: mergedSnapshot,
    isLoading,
    error: result?.error ?? null,
  });

  /**
   * Responde una decisión contra la sesión de runtime real.
   *
   * Antes mandaba el literal `'session-active'` a un global inexistente
   * (`window.electronAPI`; el preload expone `window.api`), así que la
   * respuesta no salía nunca y, si hubiera salido, el bus la habría rechazado
   * con `UNAUTHORIZED_TARGET`. Ahora usa el `sessionId` que el hub registró.
   *
   * Las dos guardas previas no son defensivas de más: son los dos motivos
   * reales por los que responder puede no ser posible, y cada uno se dice con
   * su nombre en vez de fallar en silencio.
   */
  const handleRespondDecision = useCallback((decisionId: string, optionId: string) => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!repoPath || !api?.pipelineControl?.respondDecision) return;

    if (!projection?.active) {
      setControlNotice('pipeline.control.noSession');
      return;
    }
    // Un CLI estructurado cierra su stdin al mandar la instrucción: no puede
    // recibir una respuesta a mitad de corrida. El hub no declara la capacidad
    // y acá se explica, en vez de mandar un comando que el bus va a rechazar.
    if (!projection.controlCapabilities.includes('respond-decision')) {
      setControlNotice('pipeline.control.respondUnsupported');
      return;
    }

    setControlNotice(null);
    const nonce = `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    void api.pipelineControl.respondDecision({
      repoPath,
      sessionId: projection.sessionId,
      decisionId,
      optionId,
      nonce,
    });
  }, [repoPath, projection]);

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

      {repoPath && (
        <PipelineRuntimeLauncher
          repoPath={repoPath}
          projection={projection}
          blockedByFixture={fixtureActive}
        />
      )}

      {controlNotice && (
        <p className="pipeline-workspace__notice" role="alert">{t(controlNotice)}</p>
      )}

      {state.kind === 'ready' ? (
        <>
          <PipelineHud snapshot={state.snapshot} />
          <PipelineNow now={state.snapshot.now} repoPath={repoPath} />
          {/* El inbox va por encima del feed: es zona prioritaria, no un feed. */}
          <DecisionInbox decisions={state.snapshot.decisions} onRespondDecision={handleRespondDecision} />
          <ChangePath stations={state.snapshot.stations} />
          <AgentTree agents={state.snapshot.agents} />
          <EconomyPanel economy={state.snapshot.economy} />
          <ActivityFeed
            entries={state.snapshot.activity}
            reasoningAvailable={state.snapshot.economy.reasoningAvailable}
            runtimeAttached={!fixtureActive && projection !== null}
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
