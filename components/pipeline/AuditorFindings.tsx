'use client';

import React from 'react';
import { useT } from '@/hooks/use-translation';
import type { AuditorFinding } from './pipeline-domain';
import { ProvenanceBadge } from './primitives/ProvenanceBadge';

export type AuditorFindingsProps = {
  findings?: AuditorFinding[];
};

export function AuditorFindings({ findings }: AuditorFindingsProps) {
  const t = useT();

  if (!findings || findings.length === 0) {
    return (
      <div className="pipeline-auditor__empty">
        {t('pipeline.details.noFindings')}
      </div>
    );
  }

  return (
    <div className="pipeline-auditor">
      <ul className="pipeline-auditor__list">
        {findings.map((item) => (
          <li key={item.id} className="pipeline-auditor__card" data-risk={item.risk}>
            <div className="pipeline-auditor__card-header">
              <div className="pipeline-auditor__tags">
                <span className={`pipeline-auditor__risk-badge pipeline-auditor__risk-badge--${item.risk}`}>
                  {t(`pipeline.risk.${item.risk}`)}
                </span>
                <span className="pipeline-auditor__category">{item.category}</span>
              </div>
              <ProvenanceBadge provenance="runtime" evidenceStatus="verified" />
            </div>

            <p className="pipeline-auditor__description">{item.description}</p>

            {item.file && (
              <div className="pipeline-auditor__location">
                <span className="pipeline-auditor__location-label">{t('pipeline.details.location')}:</span>
                <code className="pipeline-auditor__location-code">
                  {item.file}
                  {item.line != null ? `:${item.line}` : ''}
                </code>
              </div>
            )}

            <div className="pipeline-auditor__recommendation">
              <strong>{t('pipeline.details.recommendation')}:</strong> {item.recommendation}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
