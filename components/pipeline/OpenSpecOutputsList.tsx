'use client';

import React from 'react';
import { useT } from '@/hooks/use-translation';
import type { OpenSpecOutputItem } from '@/types/pipeline';
import styles from './OpenSpecDashboard.module.css';

const PRESENCE_KEY_MAP: Record<string, string> = {
  present: 'pipeline.openspec.engine.presence.present',
  stale: 'pipeline.openspec.engine.presence.stale',
  absent: 'pipeline.openspec.engine.presence.absent',
  invalid: 'pipeline.openspec.engine.presence.invalid',
};

export interface OpenSpecOutputsListProps {
  items: OpenSpecOutputItem[];
  titleKey?: string;
  helpKey?: string;
  count?: number;
  isAbsent?: boolean;
}

export function OpenSpecOutputsList({
  items,
  titleKey,
  helpKey,
  count,
  isAbsent = false,
}: OpenSpecOutputsListProps) {
  const t = useT();

  if (items.length === 0) return null;

  return (
    <div className={isAbsent ? undefined : styles.outputInventorySection}>
      {titleKey && (
        <h3 className={styles.reviewSectionTitle}>
          {t(titleKey)}{typeof count === 'number' ? ` (${count})` : ''}
        </h3>
      )}
      {helpKey && (
        <p className={styles.inventoryHelp}>
          {t(helpKey)}
        </p>
      )}
      <div className={styles.outputListScrollContainer}>
        <ul className={styles.outputList}>
          {items.map((out) => {
            const presence = isAbsent ? 'absent' : (out.presenceState ?? 'present');
            const presenceKey = PRESENCE_KEY_MAP[presence] ?? 'pipeline.openspec.engine.presence.present';
            return (
              <li
                key={out.id}
                className={styles.outputListItem}
                data-kind={out.kind}
                data-absent={isAbsent ? 'true' : undefined}
              >
                <span className={styles.outputKindBadge} data-kind={out.kind}>
                  {out.kind === 'repo-local'
                    ? t('pipeline.openspec.engine.output.repoLocal')
                    : t('pipeline.openspec.engine.output.externalGlobal')}
                </span>
                <code className={styles.outputPath}>{out.displayPath}</code>
                <span className={styles.presenceBadge} data-presence={presence}>
                  {t(presenceKey)}
                </span>
                {out.blocked && (
                  <span
                    className={styles.blockedTag}
                    title={out.descriptionKey ? t(out.descriptionKey) : undefined}
                    aria-label={t('pipeline.openspec.engine.output.blockedBadge')}
                  >
                    {t('pipeline.openspec.engine.output.blockedBadge')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default OpenSpecOutputsList;
