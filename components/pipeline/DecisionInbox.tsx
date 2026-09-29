'use client';

import { useMemo } from 'react';
import { useT } from '@/hooks/use-translation';
import { DecisionCard } from './DecisionCard';
import { sortDecisionsByHumanNeed, type DecisionRequest } from './pipeline-domain';

export type DecisionInboxProps = {
  decisions: DecisionRequest[];
  onRespondDecision?: (decisionId: string, optionId: string, availability?: string) => void;
  controlNotice?: string | null;
  sendingDecisions?: Record<string, boolean>;
  repoPath?: string | null;
};

/**
 * Zona prioritaria: va por encima del feed de actividad.
 *
 * No es un feed. Se ordena por necesidad humana —riesgo primero— y no por el
 * último delta recibido, que es la diferencia que pide el brief.
 */
export function DecisionInbox({
  decisions,
  onRespondDecision,
  controlNotice,
  sendingDecisions,
  repoPath,
}: DecisionInboxProps) {
  const t = useT();
  const ordered = useMemo(() => sortDecisionsByHumanNeed(decisions), [decisions]);

  return (
    <div className="pipeline-inbox" data-count={ordered.length}>
      <header className="pipeline-inbox__header">
        <h4 className="pipeline-inbox__title">{t('pipeline.inbox.title')}</h4>
      </header>
      {controlNotice && (
        <p className="pipeline-inbox__notice pipeline-inbox__notice--error" role="alert">
          {t(controlNotice)}
        </p>
      )}
      {ordered.length === 0 ? (
        <p className="pipeline-inbox__empty">{t('pipeline.inbox.empty')}</p>
      ) : (
        <>
          <p className="pipeline-inbox__note">{t('pipeline.inbox.readOnly')}</p>
          <ul className="pipeline-inbox__list">
            {ordered.map((decision) => (
              <li key={decision.decisionId}>
                <DecisionCard
                  decision={decision}
                  onRespondOption={onRespondDecision}
                  isSending={Boolean(sendingDecisions?.[decision.decisionId])}
                  repoPath={repoPath}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
