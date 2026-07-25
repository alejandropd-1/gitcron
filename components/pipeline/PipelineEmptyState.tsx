'use client';

import { useT } from '@/hooks/use-translation';
import type { PipelineSource, PipelineViewState } from './pipeline-view-state';

export type PipelineEmptyStateProps = {
  state: Exclude<PipelineViewState, { kind: 'ready' }>;
  onRetry: () => void;
};

function SourceList({ sources }: { sources: PipelineSource[] }) {
  const t = useT();
  if (sources.length === 0) return null;
  return (
    <>
      <p className="pipeline-empty__sources-label">{t('pipeline.noKit.sources')}</p>
      <ul className="pipeline-empty__sources">
        {sources.map((source) => (
          <li key={source} data-source={source}>{t(`pipeline.source.${source}`)}</li>
        ))}
      </ul>
    </>
  );
}

/**
 * Estados no-`ready` del workspace.
 *
 * Ninguno de estos es un error de la app salvo `error`: un repo sin kit, Hermes
 * desconectado o un runtime degradado son situaciones normales, y se explican
 * como tales en vez de mostrarse como falla.
 */
export function PipelineEmptyState({ state, onRetry }: PipelineEmptyStateProps) {
  const t = useT();

  if (state.kind === 'loading') {
    return (
      <div className="pipeline-empty" data-estado="loading" aria-busy="true">
        <p>{t('pipeline.loading')}</p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="pipeline-empty" data-estado="error" role="alert">
        <h3 className="pipeline-empty__title">{t('pipeline.error.title')}</h3>
        <p className="pipeline-empty__body">{t(state.messageKey)}</p>
        {state.canRetry && (
          <button type="button" className="pipeline-empty__retry" onClick={onRetry}>
            {t('pipeline.error.retry')}
          </button>
        )}
      </div>
    );
  }

  if (state.kind === 'incompatible') {
    return (
      <div className="pipeline-empty" data-estado="incompatible">
        <h3 className="pipeline-empty__title">{t('pipeline.incompatible.title')}</h3>
        <p className="pipeline-empty__body">
          {t('pipeline.incompatible.body', {
            version: state.foundVersion ?? t('pipeline.incompatible.unknownVersion'),
          })}
        </p>
      </div>
    );
  }

  const copy = {
    'no-repo': { title: 'pipeline.noRepo.title', body: 'pipeline.noRepo.body' },
    'no-pipeline': { title: 'pipeline.noPipeline.title', body: 'pipeline.noPipeline.body' },
    'no-kit': { title: 'pipeline.noKit.title', body: 'pipeline.noKit.body' },
    'hermes-offline': { title: 'pipeline.hermesOffline.title', body: 'pipeline.hermesOffline.body' },
  }[state.kind];

  return (
    <div className="pipeline-empty" data-estado={state.kind}>
      <h3 className="pipeline-empty__title">{t(copy.title)}</h3>
      <p className="pipeline-empty__body">{t(copy.body)}</p>
      {state.kind === 'no-kit' && <SourceList sources={state.availableSources} />}
    </div>
  );
}
