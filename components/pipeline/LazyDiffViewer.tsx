'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { PipelineDiffItem } from './pipeline-domain';
import { UnknownValue } from './primitives/UnknownValue';

// Dynamic lazy import of DiffViewer
const DynamicDiffViewer = dynamic(
  () => import('../DiffViewer').then((mod) => mod.DiffViewer),
  {
    loading: () => (
      <div className="pipeline-diffs__loading" role="status">
        Loading Diff...
      </div>
    ),
    ssr: false,
  }
);

export type LazyDiffViewerProps = {
  diffs: PipelineDiffItem[];
  agentRuntimes?: Record<string, string | null>;
};

export function LazyDiffViewer({ diffs, agentRuntimes }: LazyDiffViewerProps) {
  const t = useT();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  if (!diffs || diffs.length === 0) {
    return (
      <div className="pipeline-diffs__empty">
        {t('pipeline.details.noDiffs')}
      </div>
    );
  }

  const activeDiff = diffs[selectedIndex] ?? diffs[0];
  const runtime = activeDiff.agentId && agentRuntimes ? agentRuntimes[activeDiff.agentId] : null;

  return (
    <div className="pipeline-diffs">
      <div className="pipeline-diffs__sidebar">
        <h4 className="pipeline-diffs__sidebar-title">
          {t('pipeline.details.touchedFiles')} ({diffs.length})
        </h4>
        <ul className="pipeline-diffs__file-list" role="listbox" aria-label={t('pipeline.details.touchedFiles')}>
          {diffs.map((item, idx) => (
            <li key={item.filePath}>
              <button
                type="button"
                role="option"
                aria-selected={idx === selectedIndex}
                className={`pipeline-diffs__file-btn ${
                  idx === selectedIndex ? 'pipeline-diffs__file-btn--active' : ''
                }`}
                onClick={() => setSelectedIndex(idx)}
              >
                <span className="pipeline-diffs__file-name">{item.filePath}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="pipeline-diffs__content">
        <div className="pipeline-diffs__meta" data-provenance={activeDiff.agentId ? 'runtime' : 'unknown'}>
          <span className="pipeline-diffs__meta-label">{t('pipeline.details.provenance')}:</span>
          <span className="pipeline-diffs__meta-value">
            {activeDiff.agentId ? (
              <>
                <strong>{activeDiff.agentId}</strong>
                {runtime && <span className="pipeline-diffs__runtime">({runtime})</span>}
              </>
            ) : (
              <UnknownValue reason="not-reported" />
            )}
          </span>
          <span className="pipeline-diffs__meta-separator">•</span>
          <span className="pipeline-diffs__meta-label">{t('pipeline.now.task')}:</span>
          <span className="pipeline-diffs__meta-value">
            {activeDiff.taskId ? (
              <code>{activeDiff.taskId}</code>
            ) : (
              <UnknownValue reason="not-reported" />
            )}
          </span>
        </div>

        <div className="pipeline-diffs__viewer-wrapper">
          <DynamicDiffViewer diff={activeDiff.diffContent} filePath={activeDiff.filePath} />
        </div>
      </div>
    </div>
  );
}
