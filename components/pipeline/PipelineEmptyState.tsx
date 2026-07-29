'use client';

import { useT } from '@/hooks/use-translation';
import type { PipelineViewState } from './pipeline-view-state';

export type PipelineEmptyStateProps = {
  state: Exclude<PipelineViewState, { kind: 'ready' }>;
  onRetry: () => void;
};

/**
 * Estados no-`ready` del workspace.
 *
 * Ninguno de estos es un error de la app salvo `error`: un repositorio sin
 * actividad de OpenSpec o con una versión de snapshot desconocida son
 * situaciones normales, y se explican como tales en vez de mostrarse como falla.
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
  }[state.kind];

  return (
    <div className="pipeline-empty" data-estado={state.kind}>
      <h3 className="pipeline-empty__title">{t(copy.title)}</h3>
      <p className="pipeline-empty__body">{t(copy.body)}</p>
    </div>
  );
}
