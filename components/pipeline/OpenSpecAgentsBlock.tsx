'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type { OpenSpecOutputItem } from '@/types/pipeline';
import { OpenSpecOutputsList } from './OpenSpecOutputsList';
import styles from './OpenSpecDashboard.module.css';

export interface OpenSpecAgentsBlockProps {
  configuredCount?: number;
  totalCount?: number;
  outputInventory?: OpenSpecOutputItem[];
  children?: React.ReactNode;
}

export const OpenSpecAgentsBlock: React.FC<OpenSpecAgentsBlockProps> = ({
  configuredCount = 0,
  totalCount = 0,
  outputInventory = [],
  children,
}) => {
  const t = useT();
  const [showAbsentOutputs, setShowAbsentOutputs] = useState(false);

  const agentsText = totalCount > 0 && totalCount !== configuredCount
    ? t('pipeline.openspec.engine.agentsConfiguredRatio', { configured: configuredCount, total: totalCount })
    : t('pipeline.openspec.engine.agentsConfigured', { count: configuredCount });

  const presentOutputs = outputInventory.filter((o) => o.presenceState !== 'absent');
  const absentOutputs = outputInventory.filter((o) => o.presenceState === 'absent');

  return (
    <section className={styles.reviewBlock} aria-label={t('pipeline.openspec.config.agentsBlock')}>
      <h3 className={styles.reviewBlockTitle}>{t('pipeline.openspec.config.agentsBlock')}</h3>
      <div className={styles.summaryFactRow}>
        <span>{agentsText}</span>
      </div>
      {children}
      {presentOutputs.length > 0 && (
        <OpenSpecOutputsList
          items={presentOutputs}
          titleKey="pipeline.openspec.engine.outputsTitle"
          helpKey="pipeline.openspec.engine.outputsHelp"
          count={presentOutputs.length}
        />
      )}
      {absentOutputs.length > 0 && (
        <div className={styles.absentOutputsSection}>
          <button
            type="button"
            className={styles.toggleAbsentBtn}
            onClick={() => setShowAbsentOutputs((prev) => !prev)}
            aria-expanded={showAbsentOutputs}
          >
            <span>
              {showAbsentOutputs
                ? t('pipeline.openspec.engine.advanced.hideAbsentOutputs')
                : t('pipeline.openspec.engine.advanced.showAbsentOutputs', { count: absentOutputs.length })}
            </span>
            {showAbsentOutputs ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
          </button>

          {showAbsentOutputs && (
            <OpenSpecOutputsList
              items={absentOutputs}
              helpKey="pipeline.openspec.engine.absentOutputsHelp"
              isAbsent={true}
            />
          )}
        </div>
      )}
    </section>
  );
};
