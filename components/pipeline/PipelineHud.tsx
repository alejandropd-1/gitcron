'use client';

import { useT } from '@/hooks/use-translation';
import { UnknownValue } from './primitives/UnknownValue';
import { CHANGE_STATIONS, runtimeDisplayName, formatElapsed } from './pipeline-domain';
import type { PipelineSnapshot } from './pipeline-view-state';

export type PipelineHudProps = {
  snapshot: PipelineSnapshot;
};

/**
 * Tablero de estado del pipeline, de un vistazo.
 *
 * Estética TCARS/LCARS, que ya es el lenguaje visual del proyecto: la vista
 * cronométrica se define así en `docs/00_FUENTE_DE_VERDAD.md` y Cartografía usa
 * sus propios tokens ámbar. Pipeline se suma a esa familia en vez de inventar
 * una estética paralela.
 *
 * La jerarquía es deliberada: **lo que te reclama a vos manda**. Si hay una
 * decisión pendiente, ese segmento domina en color y peso; el resto es
 * telemetría de apoyo. Un HUD donde todo grita no dice nada.
 */
export function PipelineHud({ snapshot }: PipelineHudProps) {
  const t = useT();
  const { now, stations, decisions, economy } = snapshot;

  const currentIndex = stations.findIndex((station) => station.state === 'current');
  const doneCount = stations.filter((station) => station.state === 'done').length;
  const step = currentIndex >= 0 ? currentIndex + 1 : doneCount;
  const currentStation = currentIndex >= 0 ? stations[currentIndex] : null;
  const rejected = stations.some((station) => station.state === 'rejected');

  const runtime = runtimeDisplayName(now.runtime);
  const elapsed = formatElapsed(now.elapsedMs);
  const pending = decisions.length;

  return (
    <div
      className="pipeline-hud"
      data-needs-human={pending > 0 || undefined}
      data-rejected={rejected || undefined}
      role="group"
      aria-label={t('pipeline.hud.title')}
    >
      {/* Codo LCARS: ancla visual, puramente decorativo. */}
      <span className="pipeline-hud__elbow" aria-hidden="true" />

      <div className="pipeline-hud__segment" data-segment="phase">
        <span className="pipeline-hud__label">{t('pipeline.hud.phase')}</span>
        <span className="pipeline-hud__readout">
          {`${step}/${CHANGE_STATIONS.length}`}
        </span>
        <span className="pipeline-hud__caption">
          {currentStation
            ? t(`pipeline.station.${currentStation.id}`)
            : t('pipeline.hud.noPhase')}
        </span>
      </div>

      <div className="pipeline-hud__segment" data-segment="agent">
        <span className="pipeline-hud__label">{t('pipeline.now.agent')}</span>
        <span className="pipeline-hud__readout" data-runtime={now.runtime ?? undefined}>
          {runtime ?? <UnknownValue reason="not-reported" />}
        </span>
        <span className="pipeline-hud__caption">
          {elapsed ?? <UnknownValue reason="not-reported" />}
        </span>
      </div>

      <div className="pipeline-hud__segment" data-segment="cost" data-cost-basis={economy.costBasis}>
        <span className="pipeline-hud__label">{t('pipeline.now.cost')}</span>
        <span className="pipeline-hud__readout">
          {economy.costUsd === null
            ? <UnknownValue reason={economy.costBasis === 'local_unpriced' ? 'not-applicable' : 'not-reported'} />
            : `US$ ${economy.costUsd.toFixed(4)}`}
        </span>
        <span className="pipeline-hud__caption">
          {t(`pipeline.costBasis.${economy.costBasis}`)}
        </span>
      </div>

      {/* Último y con más peso: es lo único que exige acción de la persona. */}
      <div className="pipeline-hud__segment" data-segment="decisions" data-pending={pending > 0}>
        <span className="pipeline-hud__label">{t('pipeline.hud.decisions')}</span>
        <span className="pipeline-hud__readout">{pending}</span>
        <span className="pipeline-hud__caption">
          {pending > 0 ? t('pipeline.hud.needsYou') : t('pipeline.hud.allClear')}
        </span>
      </div>
    </div>
  );
}
