'use client';

import { useMemo } from 'react';
import { useT } from '@/hooks/use-translation';
import { DecisionCard } from './DecisionCard';
import { sortDecisionsByHumanNeed, type DecisionRequest } from './pipeline-domain';

export type DecisionInboxProps = {
  decisions: DecisionRequest[];
  onRespondDecision?: (decisionId: string, optionId: string) => void;
};

/**
 * Zona prioritaria: va por encima del feed de actividad.
 *
 * No es un feed. Se ordena por necesidad humana —riesgo primero— y no por el
 * último delta recibido, que es la diferencia que pide el brief.
 */
export function DecisionInbox({ decisions, onRespondDecision }: DecisionInboxProps) {
  const t = useT();
  const ordered = useMemo(() => sortDecisionsByHumanNeed(decisions), [decisions]);

  return (
    <section
      className="pipeline-inbox"
      aria-labelledby="pipeline-inbox-title"
      data-count={ordered.length}
    >
      <h3 id="pipeline-inbox-title" className="pipeline-section__title">
        {t('pipeline.inbox.title')}
      </h3>

      {ordered.length === 0 ? (
        <p className="pipeline-inbox__empty">{t('pipeline.inbox.empty')}</p>
      ) : (
        <>
          <p className="pipeline-inbox__note">{t('pipeline.inbox.readOnly')}</p>
          <ul className="pipeline-inbox__list">
            {ordered.map((decision) => (
              <li key={decision.decisionId}>
                <DecisionCard decision={decision} onRespondOption={onRespondDecision} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
