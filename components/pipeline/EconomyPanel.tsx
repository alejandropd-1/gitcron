'use client';

import { useT } from '@/hooks/use-translation';
import { UnknownValue } from './primitives/UnknownValue';
import { hasUsableCostCoverage, type EconomyState } from './pipeline-domain';

export type EconomyPanelProps = {
  economy: EconomyState;
};

function TokenRow({ labelKey, value }: { labelKey: string; value: number | null }) {
  const t = useT();
  return (
    <div className="pipeline-economy__row">
      <dt>{t(labelKey)}</dt>
      <dd>
        {value === null
          ? <UnknownValue reason="not-reported" />
          : <span className="pipeline-economy__number">{value.toLocaleString()}</span>}
      </dd>
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
    <section className="pipeline-economy" aria-labelledby="pipeline-economy-title">
      <h3 id="pipeline-economy-title" className="pipeline-section__title">
        {t('pipeline.economy.title')}
      </h3>

      <dl className="pipeline-economy__tokens">
        <TokenRow labelKey="pipeline.economy.input" value={economy.tokens.input} />
        <TokenRow labelKey="pipeline.economy.output" value={economy.tokens.output} />
        <TokenRow labelKey="pipeline.economy.reasoning" value={economy.tokens.reasoning} />
        <TokenRow labelKey="pipeline.economy.cacheRead" value={economy.tokens.cacheRead} />
      </dl>

      <div className="pipeline-economy__cost" data-cost-basis={economy.costBasis} data-usable={costUsable}>
        <span className="pipeline-economy__cost-label">{t('pipeline.economy.cost')}</span>
        {economy.costUsd === null ? (
          <UnknownValue reason={economy.costBasis === 'local_unpriced' ? 'not-applicable' : 'not-reported'} />
        ) : (
          <span className="pipeline-economy__number">{`US$ ${economy.costUsd.toFixed(4)}`}</span>
        )}
        <span className="pipeline-economy__basis">{t(`pipeline.costBasis.${economy.costBasis}`)}</span>
      </div>

      {!costUsable && total > 0 && (
        <p className="pipeline-economy__coverage">
          {t('pipeline.economy.partialCoverage', { withCost, total })}
        </p>
      )}

      <dl className="pipeline-economy__context">
        <TokenRow labelKey="pipeline.economy.contextMax" value={economy.contextMaxTokens} />
        <TokenRow labelKey="pipeline.economy.contextCurrent" value={economy.contextCurrentTokens} />
        <TokenRow labelKey="pipeline.economy.compactions" value={economy.compactionCount} />
      </dl>
    </section>
  );
}
