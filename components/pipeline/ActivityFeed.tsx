'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/hooks/use-translation';
import {
  groupActivity,
  runtimeDisplayName,
  type ActivityChannel,
  type ActivityEntry,
} from './pipeline-domain';

const CHANNELS: ActivityChannel[] = ['narrative', 'reasoning', 'tool', 'file', 'system'];

export type ActivityFeedProps = {
  entries: ActivityEntry[];
  /** `false` cuando el runtime no emite reasoning. */
  reasoningAvailable: boolean;
  agentRuntimes?: Record<string, string | null>;
};

/**
 * Bitácora combinada con filtros por canal.
 *
 * Los deltas consecutivos se agrupan antes de renderizar: un stream de
 * reasoning produciría un nodo por token y volvería la vista inservible.
 */
export function ActivityFeed({ entries, reasoningAvailable, agentRuntimes = {} }: ActivityFeedProps) {
  const t = useT();
  const [active, setActive] = useState<Set<ActivityChannel>>(() => new Set(CHANNELS));

  const toggle = (channel: ActivityChannel) => {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });
  };

  const groups = useMemo(
    () => groupActivity(entries.filter((entry) => active.has(entry.channel))),
    [entries, active],
  );

  return (
    <section className="pipeline-activity" aria-labelledby="pipeline-activity-title">
      <h3 id="pipeline-activity-title" className="pipeline-section__title">
        {t('pipeline.activity.title')}
      </h3>

      <div className="pipeline-activity__filters" role="group" aria-label={t('pipeline.activity.filters')}>
        {CHANNELS.map((channel) => {
          const disabled = channel === 'reasoning' && !reasoningAvailable;
          const pressed = active.has(channel) && !disabled;
          return (
            <button
              key={channel}
              type="button"
              className="pipeline-activity__filter"
              data-channel={channel}
              aria-pressed={pressed}
              disabled={disabled}
              onClick={() => toggle(channel)}
            >
              {t(`pipeline.channel.${channel}`)}
            </button>
          );
        })}
      </div>

      {/* El brief es explícito: un runtime sin reasoning lo dice, no muestra un
          panel vacío que se lea como "no pensó nada". */}
      {!reasoningAvailable && (
        <p className="pipeline-activity__no-reasoning">{t('pipeline.activity.noReasoning')}</p>
      )}

      {groups.length === 0 ? (
        <p className="pipeline-activity__empty">{t('pipeline.activity.empty')}</p>
      ) : (
        <ol className="pipeline-activity__list">
          {groups.map((group) => (
            <li key={group.key} className="pipeline-activity__entry" data-channel={group.channel}>
              {/* Nodo sobre el riel temporal: mismo vocabulario que la vía y el
                  árbol de agentes. El canal se lee por forma y color. */}
              <span className="pipeline-activity__dot" aria-hidden="true" />
              <span className="pipeline-activity__channel">{t(`pipeline.channel.${group.channel}`)}</span>
              {group.agentId && agentRuntimes[group.agentId] && (
                <span className="pipeline-activity__agent">
                  {runtimeDisplayName(agentRuntimes[group.agentId])}
                </span>
              )}
              <span className="pipeline-activity__text">{group.text}</span>
              {group.count > 1 && (
                <span className="pipeline-activity__count">
                  {t('pipeline.activity.grouped', { count: group.count })}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
