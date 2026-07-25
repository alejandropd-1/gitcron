'use client';

import React, { useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { PipelineControlAction } from '../../electron/pipeline/control/control-bus-types';

export type PipelineControlBarProps = {
  repoPath: string | null;
  sessionId?: string | null;
  runtime?: string | null;
  /** Capacidades soportadas explícitamente por el runtime activo. */
  capabilities?: PipelineControlAction[];
  onCommandDispatched?: (action: PipelineControlAction, status: 'ack' | 'error', message?: string) => void;
};

export function PipelineControlBar({
  repoPath,
  sessionId = 'session-active',
  runtime,
  capabilities = ['pause-delegations', 'pause-after-task', 'steer', 'queue'],
  onCommandDispatched,
}: PipelineControlBarProps) {
  const t = useT();
  const [steerText, setSteerText] = useState('');
  const [queueText, setQueueText] = useState('');
  const [activeAck, setActiveAck] = useState<string | null>(null);
  const [isSteerOpen, setIsSteerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const canPauseDelegations = capabilities.includes('pause-delegations');
  const canPauseAfterTask = capabilities.includes('pause-after-task');
  const canSteer = capabilities.includes('steer');
  const canQueue = capabilities.includes('queue');

  const dispatchControl = async (
    action: PipelineControlAction,
    payloadBuilder: (nonce: string) => unknown,
    ipcCallName: 'pause' | 'steer' | 'queue'
  ) => {
    if (!repoPath || !sessionId) return;
    const nonce = `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = payloadBuilder(nonce);

    setActiveAck(t('pipeline.control.ackPending'));

    try {
      const win = typeof window !== 'undefined'
        ? (window as unknown as {
            electronAPI?: {
              pipelineControl?: Record<string, (payload: unknown) => Promise<{ success: boolean; error?: { message: string } }>>;
            };
          })
        : null;

      if (win?.electronAPI?.pipelineControl) {
        const res = await win.electronAPI.pipelineControl[ipcCallName](payload);
        if (res.success) {
          setActiveAck(t('pipeline.control.ackSuccess'));
          onCommandDispatched?.(action, 'ack');
        } else {
          setActiveAck(res.error?.message ?? t('pipeline.control.ackError'));
          onCommandDispatched?.(action, 'error', res.error?.message);
        }
      } else {
        // Modo desarrollo / Fixture sin Electron IPC
        setActiveAck(t('pipeline.control.ackSuccess'));
        onCommandDispatched?.(action, 'ack');
      }
    } catch {
      setActiveAck(t('pipeline.control.ackError'));
      onCommandDispatched?.(action, 'error');
    }

    setTimeout(() => {
      setActiveAck(null);
    }, 3500);
  };

  const handlePauseDelegations = () => {
    if (!canPauseDelegations) return;
    void dispatchControl(
      'pause-delegations',
      (nonce) => ({ repoPath, sessionId, mode: 'delegations', nonce }),
      'pause'
    );
  };

  const handlePauseAfterTask = () => {
    if (!canPauseAfterTask) return;
    void dispatchControl(
      'pause-after-task',
      (nonce) => ({ repoPath, sessionId, mode: 'after-task', nonce }),
      'pause'
    );
  };

  const handleSteerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSteer || !steerText.trim()) return;
    const text = steerText.trim();
    setSteerText('');
    setIsSteerOpen(false);
    void dispatchControl(
      'steer',
      (nonce) => ({ repoPath, sessionId, instruction: text, nonce }),
      'steer'
    );
  };

  const handleQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canQueue || !queueText.trim()) return;
    const text = queueText.trim();
    setQueueText('');
    setIsQueueOpen(false);
    void dispatchControl(
      'queue',
      (nonce) => ({ repoPath, sessionId, instruction: text, nonce }),
      'queue'
    );
  };

  return (
    <div className="pipeline-control-bar" role="region" aria-label={t('pipeline.control.title')}>
      <div className="pipeline-control-bar__actions">
        <button
          type="button"
          disabled={!canPauseDelegations}
          aria-disabled={!canPauseDelegations}
          title={
            !canPauseDelegations
              ? t('pipeline.control.unsupportedReason', { runtime: runtime ?? 'este runtime' })
              : t('pipeline.control.pauseDelegationsHelp')
          }
          className="pipeline-control-bar__btn"
          onClick={handlePauseDelegations}
        >
          {t('pipeline.control.pauseDelegations')}
        </button>

        <button
          type="button"
          disabled={!canPauseAfterTask}
          aria-disabled={!canPauseAfterTask}
          title={
            !canPauseAfterTask
              ? t('pipeline.control.unsupportedReason', { runtime: runtime ?? 'este runtime' })
              : t('pipeline.control.pauseAfterTaskHelp')
          }
          className="pipeline-control-bar__btn"
          onClick={handlePauseAfterTask}
        >
          {t('pipeline.control.pauseAfterTask')}
        </button>

        <button
          type="button"
          disabled={!canSteer}
          aria-disabled={!canSteer}
          title={
            !canSteer
              ? t('pipeline.control.unsupportedReason', { runtime: runtime ?? 'este runtime' })
              : t('pipeline.control.steerHelp')
          }
          className={`pipeline-control-bar__btn ${isSteerOpen ? 'pipeline-control-bar__btn--active' : ''}`}
          onClick={() => {
            setIsSteerOpen(!isSteerOpen);
            setIsQueueOpen(false);
          }}
        >
          {t('pipeline.control.steer')}
        </button>

        <button
          type="button"
          disabled={!canQueue}
          aria-disabled={!canQueue}
          title={
            !canQueue
              ? t('pipeline.control.unsupportedReason', { runtime: runtime ?? 'este runtime' })
              : t('pipeline.control.queueHelp')
          }
          className={`pipeline-control-bar__btn ${isQueueOpen ? 'pipeline-control-bar__btn--active' : ''}`}
          onClick={() => {
            setIsQueueOpen(!isQueueOpen);
            setIsSteerOpen(false);
          }}
        >
          {t('pipeline.control.queue')}
        </button>
      </div>

      {isSteerOpen && (
        <form onSubmit={handleSteerSubmit} className="pipeline-control-bar__form">
          <input
            type="text"
            value={steerText}
            onChange={(e) => setSteerText(e.target.value)}
            placeholder={t('pipeline.control.steerPlaceholder')}
            className="pipeline-control-bar__input"
            autoFocus
          />
          <button type="submit" disabled={!steerText.trim()} className="pipeline-control-bar__submit">
            {t('pipeline.control.send')}
          </button>
        </form>
      )}

      {isQueueOpen && (
        <form onSubmit={handleQueueSubmit} className="pipeline-control-bar__form">
          <input
            type="text"
            value={queueText}
            onChange={(e) => setQueueText(e.target.value)}
            placeholder={t('pipeline.control.queuePlaceholder')}
            className="pipeline-control-bar__input"
            autoFocus
          />
          <button type="submit" disabled={!queueText.trim()} className="pipeline-control-bar__submit">
            {t('pipeline.control.send')}
          </button>
        </form>
      )}

      {activeAck && (
        <div className="pipeline-control-bar__ack" role="status" aria-live="polite">
          {activeAck}
        </div>
      )}
    </div>
  );
}
