'use client';

import React from 'react';
import { useT } from '@/hooks/use-translation';

export type PartialWorkBannerProps = {
  interruptedAction?: string | null;
  onDismiss?: () => void;
};

export function PartialWorkBanner({ interruptedAction, onDismiss }: PartialWorkBannerProps) {
  const t = useT();

  if (!interruptedAction) return null;

  return (
    <div className="pipeline-partial-banner" role="status" aria-live="polite">
      <div className="pipeline-partial-banner__content">
        <span className="pipeline-partial-banner__badge">{t('pipeline.control.interruptedBadge')}</span>
        <span className="pipeline-partial-banner__text">
          {t('pipeline.control.partialWorkNotice')}
        </span>
      </div>

      {onDismiss && (
        <button
          type="button"
          className="pipeline-partial-banner__close"
          onClick={onDismiss}
          aria-label={t('pipeline.control.closeBanner')}
        >
          ×
        </button>
      )}
    </div>
  );
}
