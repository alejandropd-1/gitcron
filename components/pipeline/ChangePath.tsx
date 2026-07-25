'use client';

import { useT } from '@/hooks/use-translation';
import { CHANGE_STATIONS, type ChangeStation } from './pipeline-domain';

export type ChangePathProps = {
  stations: ChangeStation[];
};

/**
 * La vía del change: propuesta → aprobación → builder → gates → auditor →
 * fixer → merge.
 *
 * Toma el ADN visual de la vista cronométrica —el recorrido en diagonal— pero
 * no reusa su motor: `ChronometricGraph` proyecta commits sobre un canvas con
 * viewport pan/zoom, y acá hay siete estaciones fijas. Un `<ol>` colocado en
 * grilla diagonal da la misma lectura visual, conserva la semántica de lista
 * ordenada para lectores de pantalla y no cuesta un canvas.
 *
 * Reglas de lectura del brief:
 * - sólido = ocurrió
 * - punteado = camino posible, todavía no ocurrido
 * - retroceso = rechazo del auditor volviendo al fixer
 */
export function ChangePath({ stations }: ChangePathProps) {
  const t = useT();
  const byId = new Map(stations.map((station) => [station.id, station]));
  const ordered = CHANGE_STATIONS.map((id) => byId.get(id) ?? {
    id,
    state: 'possible' as const,
    humanGate: false,
    detailKey: null,
  });
  const hasRejection = ordered.some((station) => station.state === 'rejected');

  return (
    <section className="pipeline-path" aria-labelledby="pipeline-path-title">
      <h3 id="pipeline-path-title" className="pipeline-section__title">
        {t('pipeline.path.title')}
      </h3>

      <ol className="pipeline-path__track" data-has-rejection={hasRejection || undefined}>
        {ordered.map((station, index) => (
          <li
            key={station.id}
            className="pipeline-path__station"
            style={{ '--station-index': index } as React.CSSProperties}
            data-estado={station.state}
            data-human-gate={station.humanGate || undefined}
            aria-current={station.state === 'current' ? 'step' : undefined}
          >
            <span className="pipeline-path__marker" aria-hidden="true" />
            <span className="pipeline-path__label">{t(`pipeline.station.${station.id}`)}</span>
            <span className="pipeline-path__state">
              {t(`pipeline.stationState.${station.state}`)}
            </span>
            {station.humanGate && (
              <span className="pipeline-path__human">{t('pipeline.path.humanGate')}</span>
            )}
          </li>
        ))}
      </ol>

      {hasRejection && (
        <p className="pipeline-path__note" data-estado="rejected">
          {t('pipeline.path.rejectedNote')}
        </p>
      )}
    </section>
  );
}
