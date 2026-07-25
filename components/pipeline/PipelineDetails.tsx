'use client';

import React, { useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { PipelineSnapshot } from './pipeline-view-state';
import { SafeMarkdown } from './SafeMarkdown';
import { LazyDiffViewer } from './LazyDiffViewer';
import { AuditorFindings } from './AuditorFindings';
import { GateHistory } from './GateHistory';

export type PipelineDetailsProps = {
  snapshot: PipelineSnapshot;
};

export type DetailTab = 'proposal' | 'diffs' | 'auditor' | 'gates';

export function PipelineDetails({ snapshot }: PipelineDetailsProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<DetailTab>('proposal');

  const diffCount = snapshot.diffs?.length ?? 0;
  const findingCount = snapshot.auditorFindings?.length ?? 0;
  const gateCount = snapshot.gateHistory?.length ?? 0;

  const agentRuntimes = Object.fromEntries(
    snapshot.agents.map((agent) => [agent.agentId, agent.runtime])
  );

  return (
    <section className="pipeline-details" aria-labelledby="pipeline-details-title">
      <div className="pipeline-details__header">
        <h3 id="pipeline-details-title" className="pipeline-details__title">
          {t('pipeline.details.title')}
        </h3>

        <div className="pipeline-details__tabs" role="tablist" aria-label={t('pipeline.details.title')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'proposal'}
            aria-controls="panel-proposal"
            id="tab-proposal"
            className={`pipeline-details__tab ${activeTab === 'proposal' ? 'pipeline-details__tab--active' : ''}`}
            onClick={() => setActiveTab('proposal')}
          >
            {t('pipeline.details.proposal')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'diffs'}
            aria-controls="panel-diffs"
            id="tab-diffs"
            className={`pipeline-details__tab ${activeTab === 'diffs' ? 'pipeline-details__tab--active' : ''}`}
            onClick={() => setActiveTab('diffs')}
          >
            {t('pipeline.details.diffs')} ({diffCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'auditor'}
            aria-controls="panel-auditor"
            id="tab-auditor"
            className={`pipeline-details__tab ${activeTab === 'auditor' ? 'pipeline-details__tab--active' : ''}`}
            onClick={() => setActiveTab('auditor')}
          >
            {t('pipeline.details.auditorFindings')} ({findingCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'gates'}
            aria-controls="panel-gates"
            id="tab-gates"
            className={`pipeline-details__tab ${activeTab === 'gates' ? 'pipeline-details__tab--active' : ''}`}
            onClick={() => setActiveTab('gates')}
          >
            {t('pipeline.details.gateHistory')} ({gateCount})
          </button>
        </div>
      </div>

      <div className="pipeline-details__body">
        {activeTab === 'proposal' && (
          <div role="tabpanel" id="panel-proposal" aria-labelledby="tab-proposal" className="pipeline-details__panel">
            {snapshot.proposal?.markdownContent ? (
              <SafeMarkdown content={snapshot.proposal.markdownContent} />
            ) : (
              <div className="pipeline-details__empty">{t('pipeline.details.noProposal')}</div>
            )}
          </div>
        )}

        {activeTab === 'diffs' && (
          <div role="tabpanel" id="panel-diffs" aria-labelledby="tab-diffs" className="pipeline-details__panel">
            <LazyDiffViewer diffs={snapshot.diffs ?? []} agentRuntimes={agentRuntimes} />
          </div>
        )}

        {activeTab === 'auditor' && (
          <div role="tabpanel" id="panel-auditor" aria-labelledby="tab-auditor" className="pipeline-details__panel">
            <AuditorFindings findings={snapshot.auditorFindings} />
          </div>
        )}

        {activeTab === 'gates' && (
          <div role="tabpanel" id="panel-gates" aria-labelledby="tab-gates" className="pipeline-details__panel">
            <GateHistory history={snapshot.gateHistory} />
          </div>
        )}
      </div>
    </section>
  );
}
