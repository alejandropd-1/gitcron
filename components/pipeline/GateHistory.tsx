'use client';

import React from 'react';
import { useT } from '@/hooks/use-translation';
import type { GateHistoryEntry } from './pipeline-domain';

export type GateHistoryProps = {
  history?: GateHistoryEntry[];
};

export function GateHistory({ history }: GateHistoryProps) {
  const t = useT();

  if (!history || history.length === 0) {
    return (
      <div className="pipeline-gates__empty">
        {t('pipeline.details.noGateHistory')}
      </div>
    );
  }

  return (
    <div className="pipeline-gates">
      <ul className="pipeline-gates__list">
        {history.map((entry) => (
          <li key={entry.gateId} className="pipeline-gates__item" data-status={entry.status}>
            <div className="pipeline-gates__item-header">
              <span className="pipeline-gates__gate-id">{entry.gateId}</span>
              <span className="pipeline-gates__gate-name">{entry.name}</span>
              <span className={`pipeline-gates__status-badge pipeline-gates__status-badge--${entry.status.toLowerCase()}`}>
                {entry.status}
              </span>
            </div>

            {entry.details && (
              <p className="pipeline-gates__details">{entry.details}</p>
            )}

            {entry.checkedAt && (
              <span className="pipeline-gates__time">{entry.checkedAt}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
