import React, { useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { PipelineControlAction } from '../../electron/pipeline/control/control-bus-types';
import { ConfirmControlModal } from './ConfirmControlModal';
import { PartialWorkBanner } from './PartialWorkBanner';

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
  capabilities = ['pause-delegations', 'pause-after-task', 'steer', 'queue', 'interrupt-turn'],
  onCommandDispatched,
}: PipelineControlBarProps) {
  const t = useT();
  const [steerText, setSteerText] = useState('');
  const [queueText, setQueueText] = useState('');
  const [activeAck, setActiveAck] = useState<string | null>(null);
  const [isSteerOpen, setIsSteerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [pendingModalAction, setPendingModalAction] = useState<PipelineControlAction | null>(null);
  const [interruptedNotice, setInterruptedNotice] = useState<string | null>(null);

  const canPauseDelegations = capabilities.includes('pause-delegations');
  const canPauseAfterTask = capabilities.includes('pause-after-task');
  const canSteer = capabilities.includes('steer');
  const canQueue = capabilities.includes('queue');
  const canInterruptTurn = capabilities.includes('interrupt-turn');

  const dispatchControl = async (
    action: PipelineControlAction,
    payloadBuilder: (nonce: string) => unknown,
    ipcCallName: 'pause' | 'steer' | 'queue' | 'interrupt'
  ) => {
    if (!repoPath || !sessionId) return;
    const nonce = `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = payloadBuilder(nonce);

    setActiveAck(t('pipeline.control.ackPending'));

    try {
      // El preload expone `window.api`, no `window.electronAPI`: con el nombre
      // viejo esta rama nunca se tomaba y el comando no salía jamás.
      const control = typeof window !== 'undefined'
        ? (window.api as unknown as {
            pipelineControl?: Record<string, (payload: unknown) => Promise<{ success: boolean; error?: { message: string } }>>;
          } | undefined)?.pipelineControl
        : undefined;

      if (control) {
        const res = await control[ipcCallName](payload);
        if (res.success) {
          setActiveAck(t('pipeline.control.ackSuccess'));
          if (action === 'interrupt-turn' || action === 'interrupt-subagent') {
            setInterruptedNotice(action);
          }
          onCommandDispatched?.(action, 'ack');
        } else {
          setActiveAck(res.error?.message ?? t('pipeline.control.ackError'));
          onCommandDispatched?.(action, 'error', res.error?.message);
        }
      } else {
        // Sin canal IPC (build web o preview sin Electron) el comando no se
        // mandó. Reportarlo como ACK exitoso afirmaba un acuse que nadie dio:
        // es la misma mentira que `unknown` valiendo 0, en otra superficie.
        setActiveAck(t('pipeline.control.ackUnavailable'));
        onCommandDispatched?.(action, 'error', 'ipc_unavailable');
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

  const handleConfirmModalAction = () => {
    const actionToConfirm = pendingModalAction;
    setPendingModalAction(null);
    if (!actionToConfirm) return;

    if (actionToConfirm === 'cancel-run') {
      void dispatchControl(
        'cancel-run',
        (nonce) => ({ repoPath, sessionId, nonce }),
        'interrupt'
      );
    } else {
      void dispatchControl(
        'interrupt-turn',
        (nonce) => ({ repoPath, sessionId, target: 'turn', nonce }),
        'interrupt'
      );
    }
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

        <button
          type="button"
          disabled={!canInterruptTurn}
          aria-disabled={!canInterruptTurn}
          title={
            !canInterruptTurn
              ? t('pipeline.control.unsupportedReason', { runtime: runtime ?? 'este runtime' })
              : t('pipeline.control.interruptTurnHelp')
          }
          className="pipeline-control-bar__btn pipeline-control-bar__btn--danger"
          onClick={() => setPendingModalAction('interrupt-turn')}
        >
          {t('pipeline.control.interruptTurn')}
        </button>

        <button
          type="button"
          disabled={!capabilities.includes('cancel-run')}
          aria-disabled={!capabilities.includes('cancel-run')}
          title={
            !capabilities.includes('cancel-run')
              ? t('pipeline.control.unsupportedReason', { runtime: runtime ?? 'este runtime' })
              : t('pipeline.control.cancelRunHelp')
          }
          className="pipeline-control-bar__btn pipeline-control-bar__btn--danger-heavy"
          onClick={() => setPendingModalAction('cancel-run')}
        >
          {t('pipeline.control.cancelRun')}
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

      <PartialWorkBanner
        interruptedAction={interruptedNotice}
        onDismiss={() => setInterruptedNotice(null)}
      />

      {pendingModalAction && (
        <ConfirmControlModal
          isOpen={true}
          action={pendingModalAction}
          targetName={runtime ?? undefined}
          onConfirm={handleConfirmModalAction}
          onCancel={() => setPendingModalAction(null)}
        />
      )}
    </div>
  );
}

