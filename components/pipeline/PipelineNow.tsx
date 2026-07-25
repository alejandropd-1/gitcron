'use client';

import { useT } from '@/hooks/use-translation';
import { UnknownValue } from './primitives/UnknownValue';
import { formatElapsed, type NowState } from './pipeline-domain';

export type PipelineNowProps = {
  now: NowState;
};

/**
 * "¿Qué está pasando, cuánto está costando y necesita algo de mí?"
 *
 * Responde en ese orden y en lenguaje humano: la frase primero, los datos
 * técnicos después. Un costo ausente se renderiza con `UnknownValue`, nunca
 * como `0`.
 */
export function PipelineNow({ now }: PipelineNowProps) {
  const t = useT();
  const elapsed = formatElapsed(now.elapsedMs);
  const hasTaskProgress = now.tasksDone !== null && now.tasksTotal !== null;

  return (
    <section
      className="pipeline-now"
      aria-labelledby="pipeline-now-title"
      data-needs-human={now.needsHuman || undefined}
    >
      <h3 id="pipeline-now-title" className="pipeline-section__title">
        {t('pipeline.now.title')}
      </h3>

      <p className="pipeline-now__headline">
        {t(now.headlineKey, now.runtime ? { runtime: now.runtime } : undefined)}
      </p>

      <dl className="pipeline-now__facts">
        <div className="pipeline-now__fact" data-runtime={now.runtime ?? undefined}>
          <dt>{t('pipeline.now.agent')}</dt>
          <dd>{now.runtime ?? <UnknownValue reason="not-reported" />}</dd>
        </div>

        <div className="pipeline-now__fact">
          <dt>{t('pipeline.now.task')}</dt>
          <dd>
            {now.taskLabel ?? <UnknownValue reason="not-reported" />}
            {hasTaskProgress && (
              <span className="pipeline-now__progress">
                {t('pipeline.now.taskProgress', { done: now.tasksDone!, total: now.tasksTotal! })}
              </span>
            )}
          </dd>
        </div>

        <div className="pipeline-now__fact">
          <dt>{t('pipeline.now.elapsed')}</dt>
          <dd>{elapsed ?? <UnknownValue reason="not-reported" />}</dd>
        </div>

        <div className="pipeline-now__fact" data-cost-basis={now.costBasis}>
          <dt>{t('pipeline.now.cost')}</dt>
          <dd>
            {now.costUsd === null
              ? <UnknownValue reason={now.costBasis === 'local_unpriced' ? 'not-applicable' : 'not-reported'} />
              : <span className="pipeline-now__cost">{`US$ ${now.costUsd.toFixed(4)}`}</span>}
            <span className="pipeline-now__cost-basis">
              {t(`pipeline.costBasis.${now.costBasis}`)}
            </span>
          </dd>
        </div>
      </dl>

      <p className="pipeline-now__human" data-needs-human={now.needsHuman}>
        {now.needsHuman ? t('pipeline.now.needsHuman') : t('pipeline.now.noHumanNeeded')}
      </p>
    </section>
  );
}
