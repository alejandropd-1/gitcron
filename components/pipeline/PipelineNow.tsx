'use client';

import { useT } from '@/hooks/use-translation';
import { UnknownValue } from './primitives/UnknownValue';
import { formatElapsed, runtimeDisplayName, type NowState } from './pipeline-domain';
import { PipelineControlBar } from './PipelineControlBar';
import type { PipelineControlAction } from '../../electron/pipeline/control/control-bus-types';

export type PipelineNowProps = {
  now: NowState;
  repoPath?: string | null;
  sessionId?: string | null;
  capabilities?: PipelineControlAction[];
};

/**
 * "¿Qué está pasando, cuánto está costando y necesita algo de mí?"
 *
 * Responde en ese orden y en lenguaje humano: la frase primero, los datos
 * técnicos después. Un costo ausente se renderiza con `UnknownValue`, nunca
 * como `0`.
 */
export function PipelineNow({ now, repoPath, sessionId, capabilities }: PipelineNowProps) {
  const t = useT();
  const elapsed = formatElapsed(now.elapsedMs);
  // Se muestra el nombre comercial; la identidad cruda sigue en data-runtime.
  const runtime = runtimeDisplayName(now.runtime);
  const hasTaskProgress = now.tasksDone !== null && now.tasksTotal !== null;

  return (
    <div className="pipeline-now" data-needs-human={now.needsHuman || undefined}>
      <p className="pipeline-now__headline">
        {t(now.headlineKey, runtime ? { runtime } : undefined)}
      </p>

      <dl className="pipeline-now__facts">
        <div className="pipeline-now__fact" data-runtime={now.runtime ?? undefined}>
          <dt>{t('pipeline.now.agent')}</dt>
          <dd>{runtime ?? <UnknownValue reason="not-reported" />}</dd>
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

      {repoPath && (
        <PipelineControlBar
          repoPath={repoPath}
          sessionId={sessionId}
          runtime={runtime}
          capabilities={capabilities}
        />
      )}
    </div>
  );
}
