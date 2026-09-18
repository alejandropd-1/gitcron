'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type {
  OpenSpecEngineStatus,
  OpenSpecInstallResult,
  OpenSpecRunUpdateResult,
  OpenSpecUpdatePlan,
} from '@/types/pipeline';
import { useGitStore } from '@/lib/git-store';
import { usePipelineStore } from '@/lib/pipeline-store';
import { assessOpenSpecEngineAfterInstall } from './pipeline-domain';
import styles from './OpenSpecDashboard.module.css';

export interface OpenSpecUpdateRunnerProps {
  repoPath: string;
  engine: { installed: string | null; latest: string } | null;
  integration: boolean;
  repoInitialized?: boolean;
  repoState?: OpenSpecEngineStatus['repoState'] | null;
  updatePlan?: OpenSpecUpdatePlan | null;
  force?: boolean;
  warnings?: { mainBranch?: string | null; dirtyCount?: number | null };
  disabledReason?: string | null;
  onEngineInstalled?: (result: OpenSpecInstallResult) => void;
  onIntegrationUpdated?: (result: OpenSpecRunUpdateResult) => void;
}

type StepStatus = 'pending' | 'running' | 'done' | 'failed';

interface EngineStepState {
  status: StepStatus;
  error?: string | null;
  reasons?: string[];
  installedVersion?: string;
  canRollback?: boolean;
}

interface IntegrationStepState {
  status: StepStatus;
  error?: string | null;
  filesCount?: number;
  stoppedAfterEngine?: boolean;
}

export const OpenSpecUpdateRunner: React.FC<OpenSpecUpdateRunnerProps> = ({
  repoPath,
  engine,
  integration,
  repoInitialized,
  repoState,
  updatePlan,
  force,
  warnings,
  disabledReason,
  onEngineInstalled,
  onIntegrationUpdated,
}) => {
  const t = useT();
  const [isRunning, setIsRunning] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [ranEngine, setRanEngine] = useState<{ installed: string | null; latest: string } | null>(null);
  const [ranIntegration, setRanIntegration] = useState(false);

  const isRepoInitialized = typeof repoInitialized === 'boolean'
    ? repoInitialized
    : repoState
    ? repoState === 'initialized'
    : undefined;

  const plannedIntegration = isRepoInitialized === false
    ? false
    : (engine && isRepoInitialized === true)
    ? true
    : integration;

  const effectiveEngine = engine ?? ranEngine;
  const effectiveIntegration = plannedIntegration || ranIntegration;

  const [engineStep, setEngineStep] = useState<EngineStepState>({
    status: 'pending',
  });
  const [integrationStep, setIntegrationStep] = useState<IntegrationStepState>({
    status: 'pending',
  });

  const hasMainWarning = Boolean(warnings?.mainBranch);
  const hasDirtyWarning = typeof warnings?.dirtyCount === 'number' && warnings.dirtyCount > 0;
  const hasWarnings = plannedIntegration && (hasMainWarning || hasDirtyWarning);

  // a) Si !hasRun && !engine && !plannedIntegration && !disabledReason
  if (!hasRun && !engine && !plannedIntegration && !disabledReason) {
    return (
      <div className={styles.reviewActionWithReason}>
        <button
          type="button"
          className={styles.primaryAction}
          disabled
        >
          {t('pipeline.openspec.engine.summary.allUpToDate')}
        </button>
      </div>
    );
  }

  // Plan line text
  const stepDescriptions: string[] = [];
  if (engine) {
    stepDescriptions.push(
      t('pipeline.openspec.engine.summary.stepEngine', { latest: engine.latest })
    );
  }
  if (plannedIntegration) {
    stepDescriptions.push(
      t('pipeline.openspec.engine.summary.stepIntegration')
    );
  }
  const planLineText = stepDescriptions.length > 0
    ? t('pipeline.openspec.engine.summary.planLine', { steps: stepDescriptions.join(' · ') })
    : null;

  const executeSequentialUpdate = async () => {
    if (disabledReason) return;
    setIsRunning(true);
    setHasRun(true);
    setRanEngine(engine);
    setRanIntegration(plannedIntegration);

    let engineSuccess = true;
    let engineRanAndDone = false;
    let engineResVersion: string | null = null;
    let integrationRanAndDone = false;

    if (engine) {
      setEngineStep({ status: 'running' });
      if (plannedIntegration) {
        setIntegrationStep({ status: 'pending' });
      }

      try {
        const installResult = await window.api.pipelineOpenSpec.installGlobal({ repoPath });
        if (!installResult.success) {
          setEngineStep({
            status: 'failed',
            error: installResult.error || t('pipeline.openspec.engine.install.error.installFailed'),
            canRollback: false,
          });
          if (plannedIntegration) {
            setIntegrationStep({
              status: 'failed',
              stoppedAfterEngine: true,
            });
          }
          setIsRunning(false);
          // notifyEngineChanged() NO
          return;
        }

        onEngineInstalled?.(installResult);
        const assessment = assessOpenSpecEngineAfterInstall(installResult.engineStatus);
        const runtimeVer = installResult.engineStatus?.cli?.runtimeVersion ?? null;
        engineResVersion = runtimeVer ?? engine.latest;

        if (assessment.verdict === 'ok') {
          engineRanAndDone = true;
          setEngineStep({
            status: 'done',
            installedVersion: engineResVersion,
          });
        } else if (assessment.verdict === 'broken') {
          engineSuccess = false;
          const reasons = assessment.reasonKeys.map((k) => t(k));
          setEngineStep({
            status: 'failed',
            reasons,
            installedVersion: engineResVersion,
            canRollback: engine.installed !== null,
          });
          if (plannedIntegration) {
            setIntegrationStep({
              status: 'failed',
              stoppedAfterEngine: true,
            });
          }
          setIsRunning(false);
          usePipelineStore.getState().notifyEngineChanged();
          return;
        } else {
          engineSuccess = false;
          setEngineStep({
            status: 'failed',
            error: t('pipeline.openspec.engine.afterInstall.unverified'),
            installedVersion: engineResVersion,
            canRollback: engine.installed !== null,
          });
          if (plannedIntegration) {
            setIntegrationStep({
              status: 'failed',
              stoppedAfterEngine: true,
            });
          }
          setIsRunning(false);
          usePipelineStore.getState().notifyEngineChanged();
          return;
        }
      } catch (err: unknown) {
        setEngineStep({
          status: 'failed',
          error: (err as Error)?.message || t('pipeline.openspec.engine.install.error.installFailed'),
          canRollback: false,
        });
        if (plannedIntegration) {
          setIntegrationStep({
            status: 'failed',
            stoppedAfterEngine: true,
          });
        }
        setIsRunning(false);
        return;
      }
    }

    if (plannedIntegration && engineSuccess) {
      setIntegrationStep({ status: 'running' });
      try {
        const updateResult = await window.api.pipelineOpenSpec.runUpdate(
          repoPath,
          undefined,
          force ?? false
        );
        if (updateResult.success) {
          integrationRanAndDone = true;
          onIntegrationUpdated?.(updateResult);
          setIntegrationStep({
            status: 'done',
            filesCount: updateResult.filesUpdated?.length ?? 0,
          });
        } else {
          const staleCodes = updateResult.errors?.filter((e) => e.endsWith('-changed')) ?? [];
          const errMsg = staleCodes.length > 0
            ? `${t('pipeline.openspec.engine.summary.planStale')} (${staleCodes.join(', ')})`
            : updateResult.errors && updateResult.errors.length > 0
            ? updateResult.errors.join(' · ')
            : (updateResult.message || t('pipeline.openspec.engine.review.errorGeneric'));
          setIntegrationStep({
            status: 'failed',
            error: errMsg,
          });
        }
      } catch (err: unknown) {
        setIntegrationStep({
          status: 'failed',
          error: (err as Error)?.message || t('pipeline.openspec.engine.review.errorGeneric'),
        });
      }
    }

    setIsRunning(false);

    // Toast global si todos los pasos que corrieron terminaron 'done'
    const allDone =
      (!engine || engineRanAndDone) &&
      (!plannedIntegration || integrationRanAndDone);
    if (allDone && (engineRanAndDone || integrationRanAndDone)) {
      const doneParts: string[] = [];
      if (engine && engineRanAndDone) {
        doneParts.push(
          t('pipeline.openspec.engine.summary.doneEngine', {
            version: engineResVersion ?? engine.latest,
          })
        );
      }
      if (plannedIntegration && integrationRanAndDone) {
        doneParts.push(t('pipeline.openspec.engine.summary.doneIntegration'));
      }
      if (doneParts.length > 0) {
        const summary = doneParts.join(' · ');
        useGitStore.getState().setSuccess(
          t('pipeline.openspec.engine.summary.toastDone', { summary })
        );
      }
    }

    usePipelineStore.getState().notifyEngineChanged();
  };

  const handleStart = () => {
    if (disabledReason || isRunning || isRollingBack) return;
    if (hasWarnings && !showWarningConfirm) {
      setShowWarningConfirm(true);
      return;
    }
    void executeSequentialUpdate();
  };

  const handleConfirmWarningsAndRun = () => {
    setShowWarningConfirm(false);
    void executeSequentialUpdate();
  };

  const handleRollback = async () => {
    if (!effectiveEngine?.installed || isRollingBack) return;
    setIsRollingBack(true);
    try {
      const rollbackResult = await window.api.pipelineOpenSpec.installGlobal({
        repoPath,
        targetVersion: effectiveEngine.installed,
      });
      if (rollbackResult.success) {
        const rollbackVer = rollbackResult.engineStatus?.cli?.runtimeVersion ?? effectiveEngine.installed;
        setEngineStep({
          status: 'done',
          installedVersion: rollbackVer,
          canRollback: false,
        });
        usePipelineStore.getState().notifyEngineChanged();
      } else {
        setEngineStep((prev) => ({
          ...prev,
          error: rollbackResult.error || t('pipeline.openspec.engine.install.error.installFailed'),
        }));
      }
    } catch (err: unknown) {
      setEngineStep((prev) => ({
        ...prev,
        error: (err as Error)?.message || t('pipeline.openspec.engine.install.error.installFailed'),
      }));
    } finally {
      setIsRollingBack(false);
    }
  };

  const renderStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'running':
        return <Loader2 size={14} className={styles.spin} aria-hidden="true" />;
      case 'done':
        return <CheckCircle2 size={14} aria-hidden="true" />;
      case 'failed':
        return <AlertTriangle size={14} aria-hidden="true" />;
      case 'pending':
      default:
        return <Circle size={14} aria-hidden="true" />;
    }
  };

  const renderBanner = () => {
    if (!hasRun || isRunning) return null;

    const anyFailed =
      (effectiveEngine && engineStep.status === 'failed') ||
      (effectiveIntegration && integrationStep.status === 'failed');

    if (anyFailed) {
      return (
        <div className={styles.reviewSafetyBanner} role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{t('pipeline.openspec.engine.summary.resultFailed')}</span>
        </div>
      );
    }

    const allDone =
      (!effectiveEngine || engineStep.status === 'done') &&
      (!effectiveIntegration || integrationStep.status === 'done');

    if (allDone) {
      const doneParts: string[] = [];
      if (effectiveEngine && engineStep.status === 'done') {
        doneParts.push(
          t('pipeline.openspec.engine.summary.doneEngine', {
            version: engineStep.installedVersion ?? effectiveEngine.latest,
          })
        );
      }
      if (effectiveIntegration && integrationStep.status === 'done') {
        doneParts.push(t('pipeline.openspec.engine.summary.doneIntegration'));
      }
      return (
        <div className={styles.reviewSafetyBanner} role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>
            {t('pipeline.openspec.engine.summary.resultDone', {
              summary: doneParts.join(' · '),
            })}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {showWarningConfirm ? (
        <div
          className={styles.reviewWarningConfirmBox}
          role="region"
          aria-label={t('pipeline.openspec.engine.summary.updateAll')}
        >
          {hasMainWarning && (
            <p className={styles.reviewWarningConfirmText}>
              {t('pipeline.openspec.engine.review.confirmMain', {
                branch: warnings?.mainBranch ?? 'main',
              })}
            </p>
          )}
          {hasDirtyWarning && (
            <p className={styles.reviewWarningConfirmText}>
              {t('pipeline.openspec.engine.review.confirmDirty', {
                count: warnings?.dirtyCount ?? 1,
              })}
            </p>
          )}
          <div className={styles.reviewWarningConfirmActions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={handleConfirmWarningsAndRun}
              disabled={isRunning}
            >
              {t('pipeline.openspec.engine.review.updateAnyway')}
            </button>
            <button
              type="button"
              className={styles.reviewCopyBtn}
              onClick={() => setShowWarningConfirm(false)}
              disabled={isRunning}
            >
              {t('pipeline.openspec.engine.review.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.reviewActionWithReason}>
          <button
            type="button"
            className={styles.primaryAction}
            disabled={Boolean(disabledReason) || isRunning || isRollingBack}
            onClick={handleStart}
          >
            {isRunning ? (
              <>
                <Loader2 size={13} className={styles.spin} aria-hidden="true" />
                <span>{t('pipeline.openspec.engine.review.updating')}</span>
              </>
            ) : (
              t('pipeline.openspec.engine.summary.updateAll')
            )}
          </button>
          {disabledReason && (
            <span className={styles.blockedReasonInline} role="alert">
              {disabledReason}
            </span>
          )}
        </div>
      )}

      {planLineText && !hasRun && !showWarningConfirm && (
        <p className={styles.reviewWarningConfirmText}>
          {planLineText}
        </p>
      )}

      {hasRun && (
        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {effectiveEngine && (
            <li style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {renderStepIcon(engineStep.status)}
                <span className={styles.reviewFactValue}>
                  {t('pipeline.openspec.engine.summary.rowEngine', {
                    installed: effectiveEngine.installed ?? '?',
                    latest: effectiveEngine.latest,
                  })}
                </span>
              </div>
              {engineStep.status === 'done' && (
                <div
                  role="status"
                  className={`${styles.engineInstallFeedback} ${styles.engineInstallFeedbackSuccess}`}
                >
                  <CheckCircle2 size={14} aria-hidden="true" />
                  <span>
                    {t('pipeline.openspec.engine.afterInstall.ok', {
                      version: engineStep.installedVersion ?? effectiveEngine.latest,
                    })}
                  </span>
                </div>
              )}
              {engineStep.status === 'failed' && (
                <>
                  {engineStep.reasons && engineStep.reasons.length > 0 ? (
                    <div
                      role="alert"
                      className={`${styles.engineInstallFeedback} ${styles.engineInstallFeedbackError}`}
                    >
                      <AlertTriangle size={14} aria-hidden="true" />
                      <span>
                        {t('pipeline.openspec.engine.afterInstall.broken', {
                          version: engineStep.installedVersion ?? effectiveEngine.latest,
                          reasons: engineStep.reasons.join(' · '),
                        })}
                      </span>
                    </div>
                  ) : (
                    <div
                      role="alert"
                      className={`${styles.engineInstallFeedback} ${styles.engineInstallFeedbackError}`}
                    >
                      <AlertTriangle size={14} aria-hidden="true" />
                      <span>
                        {engineStep.error || t('pipeline.openspec.engine.install.error.installFailed')}
                      </span>
                    </div>
                  )}
                  {engineStep.canRollback && effectiveEngine.installed && (
                    <div className={styles.engineInstallConfirmActions}>
                      <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={handleRollback}
                        disabled={isRollingBack}
                      >
                        {isRollingBack ? (
                          <>
                            <Loader2 size={12} className={styles.spin} aria-hidden="true" />
                            <span>
                              {t('pipeline.openspec.engine.afterInstall.rollingBack', {
                                version: effectiveEngine.installed,
                              })}
                            </span>
                          </>
                        ) : (
                          t('pipeline.openspec.engine.afterInstall.rollback', {
                            version: effectiveEngine.installed,
                          })
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          )}

          {effectiveIntegration && (
            <li style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {renderStepIcon(integrationStep.status)}
                <span className={styles.reviewFactValue}>
                  {t('pipeline.openspec.engine.summary.stepIntegration')}
                </span>
              </div>
              {integrationStep.status === 'done' && (
                <div
                  role="status"
                  className={`${styles.engineInstallFeedback} ${styles.engineInstallFeedbackSuccess}`}
                >
                  <CheckCircle2 size={14} aria-hidden="true" />
                  <span>
                    {t('pipeline.openspec.engine.review.completedTitle')} ·{' '}
                    {t('pipeline.openspec.engine.review.filesUpdatedSummary', {
                      count: integrationStep.filesCount ?? 0,
                    })}
                  </span>
                </div>
              )}
              {integrationStep.stoppedAfterEngine && (
                <div
                  role="alert"
                  className={`${styles.engineInstallFeedback} ${styles.engineInstallFeedbackError}`}
                >
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span>{t('pipeline.openspec.engine.summary.stoppedAfterEngine')}</span>
                </div>
              )}
              {integrationStep.status === 'failed' && !integrationStep.stoppedAfterEngine && (
                <div
                  role="alert"
                  className={`${styles.engineInstallFeedback} ${styles.engineInstallFeedbackError}`}
                >
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span>{integrationStep.error}</span>
                </div>
              )}
            </li>
          )}
        </ol>
      )}

      {renderBanner()}
    </div>
  );
};
