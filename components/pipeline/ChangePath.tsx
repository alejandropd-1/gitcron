'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/hooks/use-translation';
import { CHANGE_STATIONS, type ChangeStation, type ChangeStationId } from './pipeline-domain';

export type ChangePathProps = {
  stations: ChangeStation[];
};

/**
 * La vía del change: nodos sobre un riel continuo.
 *
 * El riel se dibuja **una sola vez sobre la pista**, no como un `::after` por
 * estación. Esa era la causa de que los nodos "no se unieran": cada tramo se
 * pintaba aparte, con su propio redondeo y su propio corte, así que en los
 * bordes quedaban costuras. Ahora hay una línea sola de punta a punta y encima
 * una segunda que sólo cubre lo recorrido; los nodos se apoyan sobre ellas.
 *
 * También desaparece el desnivel por estación (`margin-top` escalonado). El
 * escalón venía del intento de imitar la pendiente cronométrica nodo por nodo,
 * y a siete pasos leía como escalera rota. La pertenencia a esa familia la dan
 * ahora la retícula diagonal del fondo, el halo de los nodos y la tipografía
 * monoespaciada de las anotaciones — no un desplazamiento vertical.
 *
 * Cada regla del brief conserva un canal propio, para no depender del color:
 * - número del paso → dónde estás en la secuencia
 * - nodo relleno → ocurrió · contorno punteado → camino posible, todavía no
 * - nodo cuadrado → acá decide una persona
 * - estado escrito bajo cada nodo → legible sin ver un solo color
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

  /**
   * Hasta dónde llega el riel recorrido, en porcentaje del ancho.
   *
   * El centro del nodo `i` cae en `(i + 0.5) / total`. Se toma el último nodo
   * alcanzado —el actual si lo hay, si no el último hecho— para que la línea
   * termine **en** ese nodo y no a mitad de camino del siguiente: llegar más
   * lejos afirmaría un avance que nadie observó.
   */
  const reachedIndex = currentIndex >= 0 ? currentIndex : doneCount - 1;
  const progress = reachedIndex >= 0
    ? ((reachedIndex + 0.5) / ordered.length) * 100
    : 0;

  return (
    <div className="pipeline-path" data-has-rejection={hasRejection || undefined}>
      <ol
        className="pipeline-path__track"
        style={{
          '--path-progress': `${progress}%`,
          '--path-count': ordered.length,
        } as React.CSSProperties}
      >
        {ordered.map((station, index) => {
          const isSelected = selected === station.id;
          return (
            <li
              key={station.id}
              className="pipeline-path__station"
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
                <span className="pipeline-path__marker">
                  <span className="pipeline-path__number" aria-hidden="true">{index + 1}</span>
                </span>
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
    </div>
  );
}
