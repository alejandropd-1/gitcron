'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/hooks/use-translation';
import { CHANGE_STATIONS, type ChangeStation, type ChangeStationId } from './pipeline-domain';

export type ChangePathProps = {
  stations: ChangeStation[];
};

/**
 * La vía del change como multistep de nodos.
 *
 * Toma el ADN de la línea de tiempo cronométrica —nodos sobre un riel, con un
 * desnivel progresivo— pero **con `margin-top`, no `transform`**. Es la
 * diferencia entre que funcione y que no: `transform` no aporta altura al
 * layout, así que el contenedor colapsaba en cuanto el flex padre necesitaba
 * espacio. `margin-top` sí ocupa lugar real.
 *
 * Lectura del brief, cada regla con un canal propio para que no dependan del
 * color solo:
 * - número del paso → dónde estás en la secuencia
 * - relleno del nodo → ocurrió
 * - contorno punteado → camino posible, todavía no
 * - nodo cuadrado → acá decide una persona
 * - riel rojo hacia atrás → el auditor rechazó y volvió al fixer
 */
export function ChangePath({ stations }: ChangePathProps) {
  const t = useT();
  const [selected, setSelected] = useState<ChangeStationId | null>(null);

  const ordered = useMemo(() => {
    const byId = new Map(stations.map((station) => [station.id, station]));
    return CHANGE_STATIONS.map((id) => byId.get(id) ?? {
      id,
      state: 'possible' as const,
      humanGate: false,
      detailKey: null,
    });
  }, [stations]);

  const currentIndex = ordered.findIndex((station) => station.state === 'current');
  const doneCount = ordered.filter((station) => station.state === 'done').length;
  // Sin estación "en curso", el contador refleja lo recorrido, no inventa una.
  const stepNumber = currentIndex >= 0 ? currentIndex + 1 : doneCount;
  const hasRejection = ordered.some((station) => station.state === 'rejected');
  const current = currentIndex >= 0 ? ordered[currentIndex] : null;
  const detail = selected ? ordered.find((station) => station.id === selected) ?? null : null;

  return (
    <section className="pipeline-path" aria-labelledby="pipeline-path-title">
      <div className="pipeline-path__header">
        <h3 id="pipeline-path-title" className="pipeline-section__title">
          {t('pipeline.path.title')}
        </h3>
        <p className="pipeline-path__counter" data-has-current={Boolean(current)}>
          <span className="pipeline-path__counter-step">
            {t('pipeline.path.counter', { step: stepNumber, total: ordered.length })}
          </span>
          {current && (
            <span className="pipeline-path__counter-name">
              {t(`pipeline.station.${current.id}`)}
            </span>
          )}
        </p>
      </div>

      <ol className="pipeline-path__track" data-has-rejection={hasRejection || undefined}>
        {ordered.map((station, index) => {
          const isSelected = selected === station.id;
          return (
            <li
              key={station.id}
              className="pipeline-path__station"
              style={{ '--station-index': index } as React.CSSProperties}
              data-estado={station.state}
              data-human-gate={station.humanGate || undefined}
              data-selected={isSelected || undefined}
              aria-current={station.state === 'current' ? 'step' : undefined}
            >
              <button
                type="button"
                className="pipeline-path__node"
                aria-expanded={isSelected}
                onClick={() => setSelected(isSelected ? null : station.id)}
              >
                <span className="pipeline-path__number" aria-hidden="true">{index + 1}</span>
                <span className="pipeline-path__label">
                  {t(`pipeline.station.${station.id}`)}
                </span>
                <span className="pipeline-path__state">
                  {t(`pipeline.stationState.${station.state}`)}
                </span>
                {station.humanGate && (
                  <span className="pipeline-path__human">{t('pipeline.path.humanGate')}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {detail && (
        <div className="pipeline-path__detail" data-estado={detail.state}>
          <strong>{t(`pipeline.station.${detail.id}`)}</strong>
          <span>{t(`pipeline.stationDetail.${detail.id}`)}</span>
        </div>
      )}

      {hasRejection && (
        <p className="pipeline-path__note" data-estado="rejected">
          {t('pipeline.path.rejectedNote')}
        </p>
      )}
    </section>
  );
}
