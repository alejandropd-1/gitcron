'use client';

import React, { useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { PipelineSnapshot } from './pipeline-view-state';
import { SafeMarkdown } from './SafeMarkdown';
import { LazyDiffViewer } from './LazyDiffViewer';

export type PipelineDetailsProps = {
  snapshot: PipelineSnapshot;
};

export type DetailTab = 'proposal' | 'diffs';

export function PipelineDetails({ snapshot }: PipelineDetailsProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<DetailTab>('proposal');

  const diffCount = snapshot.diffs?.length ?? 0;

  const agentRuntimes = Object.fromEntries(
    snapshot.agents.map((agent) => [agent.agentId, agent.runtime])
  );

  return (
    <div className="pipeline-details">
      <div className="pipeline-details__header">
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

      </div>
    </div>
  );
}
