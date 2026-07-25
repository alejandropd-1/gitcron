'use client';

import React from 'react';
import { useT } from '@/hooks/use-translation';
import type { PipelineControlAction } from '../../electron/pipeline/control/control-bus-types';

export type ConfirmControlModalProps = {
  isOpen: boolean;
  action: PipelineControlAction;
  targetName?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmControlModal({
  isOpen,
  action,
  targetName,
  onConfirm,
  onCancel,
}: ConfirmControlModalProps) {
  const t = useT();

  if (!isOpen) return null;

  return (
    <div className="pipeline-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="pipeline-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pipeline-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="pipeline-modal-title" className="pipeline-modal__title">
          {t(`pipeline.control.modalTitle.${action}`)}
        </h4>

        <p className="pipeline-modal__body">
          {t(`pipeline.control.modalBody.${action}`, { target: targetName ?? 'el agente activo' })}
        </p>

        <div className="pipeline-modal__warning">
          <strong>{t('pipeline.control.noRollbackNote')}:</strong>{' '}
          {t('pipeline.control.noRollbackExplanation')}
        </div>

        <div className="pipeline-modal__actions">
          <button
            type="button"
            className="pipeline-modal__btn pipeline-modal__btn--cancel"
            onClick={onCancel}
          >
            {t('pipeline.control.cancelModal')}
          </button>
          <button
            type="button"
            className="pipeline-modal__btn pipeline-modal__btn--confirm"
            onClick={onConfirm}
            autoFocus
          >
            {t('pipeline.control.confirmModal')}
          </button>
        </div>
      </div>
    </div>
  );
}
