'use client';

import { useT } from '@/hooks/use-translation';
import { UnknownValue } from './primitives/UnknownValue';
import { hasUsableCostCoverage, type EconomyState } from './pipeline-domain';

export type EconomyPanelProps = {
  economy: EconomyState;
};

/**
 * Stat tile: rótulo arriba, número grande abajo.
 *
 * Es la forma correcta para estas cifras, y la elección tiene fundamento: la
 * fuente real deja casi todo en `null`, y un gráfico de cuatro categorías sobre
 * datos ausentes dibuja un hueco que parece un error. Un tile con
 * `<UnknownValue>` dice "no lo sabemos" con la misma prolijidad con la que
 * diría un número.
 *
 * (Se descartó además una barra apilada de 4 colores: los tokens del design
 * system caen todos en la misma banda de luminosidad y no separan por
 * daltonismo. Corregirlo exigía colores literales nuevos, prohibidos acá.)
 */
function StatTile({
  labelKey,
  value,
  reason = 'not-reported',
}: {
  labelKey: string;
  value: number | null;
  reason?: 'not-reported' | 'not-applicable';
}) {
  const t = useT();
  return (
    <div className="pipeline-stat">
      <dt className="pipeline-stat__label">{t(labelKey)}</dt>
      <dd className="pipeline-stat__value">
        {value === null
          ? <UnknownValue reason={reason} />
          : <span className="pipeline-stat__number">{value.toLocaleString()}</span>}
      </dd>
    </div>
  );
}

/**
 * Medidor de cobertura de costo.
 *
 * Una sola serie y un solo tono: no es una comparación entre categorías, es
 * "qué proporción de la muestra está medida". Lleva el número escrito al lado,
 * así que la barra ilustra pero no es la única forma de leerlo — si no se
 * distingue el relleno, el texto sigue estando.
 */
function CoverageMeter({ withCost, total }: { withCost: number; total: number }) {
  const t = useT();
  const pct = total > 0 ? Math.round((withCost / total) * 100) : 0;
  return (
    <div className="pipeline-meter">
      <div className="pipeline-meter__head">
        <span className="pipeline-meter__label">{t('pipeline.economy.coverageLabel')}</span>
        <span className="pipeline-meter__value">
          {t('pipeline.economy.coverageRatio', { withCost, total })}
        </span>
      </div>
      <div
        className="pipeline-meter__track"
        role="meter"
        aria-valuenow={withCost}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={t('pipeline.economy.coverageLabel')}
      >
        <span className="pipeline-meter__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Economía y contexto.
 *
 * La regla que gobierna este panel: **sigue siendo útil sin USD**. Si la
 * cobertura monetaria es parcial, no se dibuja ranking ni torta —compararía
 * agentes medidos contra agentes sin medir— y se muestran tokens más la
 * cobertura real de la muestra.
 */
export function EconomyPanel({ economy }: EconomyPanelProps) {
  const t = useT();
  const costUsable = hasUsableCostCoverage(economy);
  const { withCost, total } = economy.costCoverage;

  return (
    <div className="pipeline-economy">
      {/* El costo es la cifra que se busca primero: va como número héroe. */}
      <div className="pipeline-economy__hero" data-cost-basis={economy.costBasis} data-usable={costUsable}>
        <span className="pipeline-economy__hero-label">{t('pipeline.economy.cost')}</span>
        <span className="pipeline-economy__hero-value">
          {economy.costUsd === null ? (
            <UnknownValue reason={economy.costBasis === 'local_unpriced' ? 'not-applicable' : 'not-reported'} />
          ) : (
            `US$ ${economy.costUsd.toFixed(4)}`
          )}
        </span>
        <span className="pipeline-economy__hero-basis">{t(`pipeline.costBasis.${economy.costBasis}`)}</span>
      </div>

      {total > 0 && <CoverageMeter withCost={withCost} total={total} />}

      {!costUsable && total > 0 && (
        <p className="pipeline-economy__coverage">
          {t('pipeline.economy.partialCoverage', { withCost, total })}
        </p>
      )}

      <dl className="pipeline-stats">
        <StatTile labelKey="pipeline.economy.input" value={economy.tokens.input} />
        <StatTile labelKey="pipeline.economy.output" value={economy.tokens.output} />
        <StatTile labelKey="pipeline.economy.reasoning" value={economy.tokens.reasoning} />
        <StatTile labelKey="pipeline.economy.cacheRead" value={economy.tokens.cacheRead} />
        <StatTile labelKey="pipeline.economy.contextMax" value={economy.contextMaxTokens} />
        <StatTile labelKey="pipeline.economy.contextCurrent" value={economy.contextCurrentTokens} />
        <StatTile labelKey="pipeline.economy.compactions" value={economy.compactionCount} />
      </dl>
    </div>
  );
}
