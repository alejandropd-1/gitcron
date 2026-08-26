'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type {
  OpenSpecEngineStatus,
  OpenSpecRunUpdateResult,
  OpenSpecUpdatePlan,
} from '@/types/pipeline';
import {
  classifyCoexistenceSkills,
  deriveOfficialCommand,
  deriveUpdateMatrixAction,
} from '@/lib/openspec-update-guide';
import styles from './OpenSpecDashboard.module.css';

export interface OpenSpecUpdateReviewProps {
  repoPath: string;
  status: OpenSpecEngineStatus | null;
  updatePlan?: OpenSpecUpdatePlan | null;
  currentBranch?: string | null;
  isClean?: boolean;
  onBack: () => void;
  onPrepareCommit?: () => void;
  onUpdateCompleted?: (result: OpenSpecRunUpdateResult) => void;
}

export const OpenSpecUpdateReview: React.FC<OpenSpecUpdateReviewProps> = ({
  repoPath,
  status,
  updatePlan,
  currentBranch,
  isClean = true,
  onBack,
  onPrepareCommit,
  onUpdateCompleted,
}) => {
  const t = useT();
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedHostCmd, setCopiedHostCmd] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<OpenSpecRunUpdateResult | null>(null);
  const [forceConfirmed, setForceConfirmed] = useState(false);

  const cli = status?.cli;
  const latest = status?.latestAvailable;
  const installed = status?.installedIntegration;

  // Derivar operación oficial y comando literal
  const action = updatePlan?.requiredAction ?? deriveUpdateMatrixAction(status);

  const officialCommand = deriveOfficialCommand(action, status);

  const actionKey = action === 'upgrade-init'
    ? 'upgradeInit'
    : action === 'upgrade-update'
    ? 'upgradeUpdate'
    : action;
  const actionLabel = t(`pipeline.openspec.engine.matrix.${actionKey}`);

  // Diagnóstico de convivencia de skills .codex ↔ .agents
  const coexistence = classifyCoexistenceSkills(installed);
  const hasLegacyResidue = coexistence.legacySkills.length > 0;

  // Salvaguardas de Git
  const isMainOrMaster = currentBranch === 'main' || currentBranch === 'master';
  const isDirty = isClean === false;
  const canExecute = !isMainOrMaster && !isDirty && !isExecuting && action !== 'blocked' && !executionResult?.success;

  const handleCopyCommand = async () => {
    if (!officialCommand) return;
    try {
      await navigator.clipboard.writeText(officialCommand);
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch {
      // Ignorar fallo de clipboard
    }
  };

  const handleCopyHostCommand = async () => {
    try {
      await navigator.clipboard.writeText('npm i -g @fission-ai/openspec@latest');
      setCopiedHostCmd(true);
      setTimeout(() => setCopiedHostCmd(false), 2000);
    } catch {
      // Ignorar fallo de clipboard
    }
  };

  const handleExecuteUpdate = async () => {
    if (!canExecute) return;
    setIsExecuting(true);
    try {
      const result = await window.api?.pipelineOpenSpec?.runUpdate?.(
        repoPath,
        updatePlan ?? undefined,
        forceConfirmed,
      );
      if (result) {
        setExecutionResult(result);
        if (result.success) {
          onUpdateCompleted?.(result);
        }
      }
    } catch (err) {
      setExecutionResult({
        success: false,
        status: 'error',
        filesUpdated: [],
        errors: [(err as Error).message],
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const presentOutputs = (installed?.outputInventory ?? []).filter(
    (o) => o.presenceState !== 'absent',
  );

  return (
    <section className={styles.reviewView} aria-label={t('pipeline.openspec.engine.review.title')}>
      <header className={styles.reviewHead}>
        <div className={styles.reviewTitleRow}>
          <ShieldCheck size={20} color="var(--color-primary)" aria-hidden="true" />
          <h3>{t('pipeline.openspec.engine.review.title')}</h3>
        </div>
      </header>

      <div className={styles.reviewBody}>
        {/* AVISO DE SÓLO LECTURA Y SEGURIDAD */}
        <div className={styles.reviewSafetyBanner}>
          <Info size={16} aria-hidden="true" />
          <div className={styles.reviewSafetyText}>
            <strong>{t('pipeline.openspec.engine.review.safetyTitle')}</strong>
            <p>{t('pipeline.openspec.engine.review.safetyHelp')}</p>
          </div>
        </div>

        {/* REPORTE DE RESULTADO DE EJECUCIÓN (Si ya se ejecutó) */}
        {executionResult && (
          <div
            className={styles.reviewSafetyBanner}
            style={{
              borderColor: executionResult.success ? 'color-mix(in srgb, var(--color-git-add) 40%, transparent)' : 'color-mix(in srgb, var(--color-error) 40%, transparent)',
              background: executionResult.success ? 'color-mix(in srgb, var(--color-git-add) 8%, transparent)' : 'color-mix(in srgb, var(--color-error) 8%, transparent)',
            }}
          >
            {executionResult.success ? (
              <CheckCircle2 size={18} color="var(--color-git-add)" aria-hidden="true" />
            ) : (
              <AlertTriangle size={18} color="var(--color-error)" aria-hidden="true" />
            )}
            <div className={styles.reviewSafetyText}>
              <strong>
                {executionResult.success
                  ? t('pipeline.openspec.engine.review.completedTitle')
                  : executionResult.status === 'update-incomplete'
                  ? t('pipeline.openspec.engine.review.incompleteTitle')
                  : t('pipeline.openspec.engine.review.errorTitle')}
              </strong>
              <p>
                {executionResult.success
                  ? t('pipeline.openspec.engine.review.filesUpdatedSummary', {
                      count: executionResult.filesUpdated.length,
                    })
                  : executionResult.status === 'update-incomplete'
                  ? t('pipeline.openspec.engine.review.incompleteHelp')
                  : (() => {
                      const errorKeyMap: Record<string, string> = {
                        'branch-protected-main': 'pipeline.openspec.engine.review.blockedBranchMain',
                        'branch-detached': 'pipeline.openspec.engine.review.errorBranchDetached',
                        'working-tree-dirty': 'pipeline.openspec.engine.review.blockedDirty',
                        'openspec-cli-not-found': 'pipeline.openspec.engine.review.errorCliNotFound',
                      };
                      const firstError = executionResult.errors[0];
                      if (firstError && errorKeyMap[firstError]) {
                        return t(errorKeyMap[firstError], { branch: currentBranch ?? '' });
                      }
                      if (firstError) {
                        return `${t('pipeline.openspec.engine.review.errorGeneric')}: ${firstError}`;
                      }
                      return t('pipeline.openspec.engine.review.errorGeneric');
                    })()}
              </p>
              {executionResult.filesUpdated.length > 0 && (
                <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', fontSize: '0.64rem', color: 'var(--color-primary)' }}>
                  {executionResult.filesUpdated.map((f) => (
                    <li key={f}><code>{f}</code></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* DATOS DEL MOTOR Y PROCEDENCIA */}
        <section className={styles.reviewSection} aria-label={t('pipeline.openspec.engine.cardTitle')}>
          <div className={styles.reviewFactsGrid}>
            <div className={styles.reviewFactItem}>
              <span className={styles.reviewFactLabel}>
                {t('pipeline.openspec.engine.axis.engine')}
              </span>
              <span className={styles.reviewFactValue}>
                {cli?.installed ? `v${cli.runtimeVersion ?? '?'}` : t('pipeline.openspec.engine.status.absent')}
              </span>
            </div>

            <div className={styles.reviewFactItem}>
              <span className={styles.reviewFactLabel}>
                {t('pipeline.openspec.engine.latestAvailable', { version: '' }).replace(/:\s*$/, '')}
              </span>
              <span className={styles.reviewFactValue}>
                {latest?.latestVersion ? `v${latest.latestVersion}` : '—'}
              </span>
            </div>

            <div className={styles.reviewFactItem}>
              <span className={styles.reviewFactLabel}>
                {t('pipeline.openspec.engine.advanced.routeAndProvenance')}
              </span>
              <span className={styles.reviewFactValue}>
                {cli ? t(`pipeline.openspec.engine.provenance.${cli.provenance}`) : '—'}
              </span>
            </div>

            <div className={styles.reviewFactItem}>
              <span className={styles.reviewFactLabel}>
                {t('pipeline.openspec.engine.axis.repo')}
              </span>
              <span className={styles.reviewFactValue}>
                {status?.repoState ? t(`pipeline.openspec.engine.repoState.${status.repoState}`) : '—'}
              </span>
            </div>
          </div>

          {cli?.displayPath && (
            <div style={{ marginTop: '0.4rem' }}>
              <span className={styles.reviewFactLabel}>{t('pipeline.openspec.engine.advanced.routeAndProvenance')}: </span>
              <code style={{ fontSize: '0.66rem', color: 'var(--color-primary)' }}>{cli.displayPath}</code>
            </div>
          )}
        </section>

        {/* GUÍA DE ACTUALIZACIÓN DEL MOTOR HOST (DECISIÓN 2: Sólo Guía / Copiado) */}
        {latest?.latestVersion && cli?.runtimeVersion && latest.latestVersion !== cli.runtimeVersion && (
          <section className={styles.reviewSection} aria-label={t('pipeline.openspec.engine.hostUpgrade.title')}>
            <h3 className={styles.reviewSectionTitle}>{t('pipeline.openspec.engine.hostUpgrade.title')}</h3>
            <p style={{ margin: '0 0 0.4rem', color: 'var(--color-text-secondary)', fontSize: '0.66rem' }}>
              {t('pipeline.openspec.engine.hostUpgrade.help')}
            </p>
            <div className={styles.reviewCommandPre}>
              <code>npm i -g @fission-ai/openspec@latest</code>
              <button
                type="button"
                className={styles.reviewCopyBtn}
                onClick={handleCopyHostCommand}
                aria-label={copiedHostCmd ? t('pipeline.openspec.engine.hostUpgrade.copied') : t('pipeline.openspec.engine.hostUpgrade.copy')}
              >
                {copiedHostCmd ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                <span>{copiedHostCmd ? t('pipeline.openspec.engine.hostUpgrade.copied') : t('pipeline.openspec.engine.hostUpgrade.copy')}</span>
              </button>
            </div>
          </section>
        )}

        {/* MATRIZ DECLARADA Y COMANDO OFICIAL SUGERIDO */}
        <section className={styles.reviewSection} aria-label={t('pipeline.openspec.engine.matrix.title')}>
          <h3 className={styles.reviewSectionTitle}>{t('pipeline.openspec.engine.matrix.title')}</h3>
          <div className={styles.reviewFactItem}>
            <span className={styles.reviewFactLabel}>{t('pipeline.openspec.engine.matrix.actionLabel')}:</span>
            <strong style={{ color: action === 'none' ? 'var(--color-git-add)' : action === 'blocked' ? 'var(--color-error)' : 'var(--color-warning)' }}>
              {actionLabel}
            </strong>
          </div>

          {action === 'blocked' && (
            <p style={{ margin: '0.4rem 0 0', color: 'var(--color-error)', fontSize: '0.66rem' }}>
              {t('pipeline.openspec.engine.matrix.blockedReason', {
                reason: updatePlan?.reason ?? t('pipeline.openspec.engine.preview.blockedReason'),
              })}
            </p>
          )}

          {officialCommand && (
            <div className={styles.reviewCommandBox}>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.66rem' }}>
                {t('pipeline.openspec.engine.matrix.commandHelp')}
              </p>
              <div className={styles.reviewCommandPre}>
                <code>{officialCommand}</code>
                <button
                  type="button"
                  className={styles.reviewCopyBtn}
                  onClick={handleCopyCommand}
                  aria-label={copiedCommand ? t('pipeline.openspec.engine.matrix.commandCopied') : t('pipeline.openspec.engine.matrix.copyCommand')}
                >
                  {copiedCommand ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                  <span>{copiedCommand ? t('pipeline.openspec.engine.matrix.commandCopied') : t('pipeline.openspec.engine.matrix.copyCommand')}</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* GUÍA NO INTERACTIVA PARA INIT */}
        {(action === 'init' || action === 'upgrade-init' || !status?.repoState || status.repoState === 'not-initialized') && (
          <section className={styles.reviewSection} aria-label={t('pipeline.openspec.engine.guide.title')}>
            <h3 className={styles.reviewSectionTitle}>{t('pipeline.openspec.engine.guide.title')}</h3>
            <ul className={styles.reviewGuideList}>
              <li className={styles.reviewGuideItem}>
                <code>--tools &lt;lista&gt;</code>: {t('pipeline.openspec.engine.guide.toolsArg').replace(/^--tools <lista>:\s*/, '')}
              </li>
              <li className={styles.reviewGuideItem}>
                <code>--profile core|custom</code>: {t('pipeline.openspec.engine.guide.profileArg').replace(/^--profile core\|custom:\s*/, '')}
              </li>
              <li className={styles.reviewGuideItem}>
                <code>--no-animation</code>: {t('pipeline.openspec.engine.guide.noAnimationArg').replace(/^--no-animation:\s*/, '')}
              </li>
              <li className={styles.reviewGuideItem}>
                <code>--copilot-cloud / --no-copilot-cloud</code>: {t('pipeline.openspec.engine.guide.copilotArg').replace(/^--copilot-cloud \/ --no-copilot-cloud:\s*/, '')}
              </li>
            </ul>

            <div className={styles.reviewWarningAlert}>
              <AlertTriangle size={15} aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 1 }} />
              <span>{t('pipeline.openspec.engine.guide.forceWarning')}</span>
            </div>
          </section>
        )}

        {/* DIAGNÓSTICO DE CONVIVENCIA .codex ↔ .agents */}
        <section className={styles.reviewSection} aria-label={t('pipeline.openspec.engine.coexistence.title')}>
          <h3 className={styles.reviewSectionTitle}>{t('pipeline.openspec.engine.coexistence.title')}</h3>

          <div className={styles.reviewCoexistenceGrid}>
            {/* Skills legacy */}
            <div className={styles.reviewCoexistenceCol}>
              <span className={styles.reviewCoexistenceColTitle}>
                {t('pipeline.openspec.engine.coexistence.legacyTitle')} ({coexistence.legacySkills.length})
              </span>
              {coexistence.legacySkills.length === 0 ? (
                <span className={styles.reviewEmptyNotice}>{t('pipeline.openspec.engine.coexistence.noLegacy')}</span>
              ) : (
                <ul className={styles.reviewSkillsList}>
                  {coexistence.legacySkills.map((s) => (
                    <li key={s.path}>
                      <span className={styles.reviewSkillTag} data-kind="legacy">{s.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Skills oficiales en .agents */}
            <div className={styles.reviewCoexistenceCol}>
              <span className={styles.reviewCoexistenceColTitle}>
                {t('pipeline.openspec.engine.coexistence.newTitle')} ({coexistence.newAgentsSkills.length})
              </span>
              {coexistence.newAgentsSkills.length === 0 ? (
                <span className={styles.reviewEmptyNotice}>{t('pipeline.openspec.engine.coexistence.noNew')}</span>
              ) : (
                <ul className={styles.reviewSkillsList}>
                  {coexistence.newAgentsSkills.map((s) => (
                    <li key={s.path}>
                      <span className={styles.reviewSkillTag} data-kind="official">{s.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Skills oficiales en otras herramientas (.claude, .opencode, etc.) */}
            <div className={styles.reviewCoexistenceCol}>
              <span className={styles.reviewCoexistenceColTitle}>
                {t('pipeline.openspec.engine.coexistence.officialOtherTitle')} ({coexistence.officialOtherSkills.length})
              </span>
              {coexistence.officialOtherSkills.length === 0 ? (
                <span className={styles.reviewEmptyNotice}>{t('pipeline.openspec.engine.coexistence.noOfficialOther')}</span>
              ) : (
                <ul className={styles.reviewSkillsList}>
                  {coexistence.officialOtherSkills.map((s) => (
                    <li key={s.path}>
                      <span className={styles.reviewSkillTag} data-kind="official">{s.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Personalizados preexistentes en .agents (A CONSERVAR) */}
            <div className={styles.reviewCoexistenceCol}>
              <span className={styles.reviewCoexistenceColTitle}>
                {t('pipeline.openspec.engine.coexistence.customTitle')} ({coexistence.customPreexistingSkills.length})
              </span>
              {coexistence.customPreexistingSkills.length === 0 ? (
                <span className={styles.reviewEmptyNotice}>{t('pipeline.openspec.engine.coexistence.noCustom')}</span>
              ) : (
                <ul className={styles.reviewSkillsList}>
                  {coexistence.customPreexistingSkills.map((s) => (
                    <li key={s.path}>
                      <span className={styles.reviewSkillTag} data-kind="custom" title={t('pipeline.openspec.engine.coexistence.customHelp')}>
                        {s.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Colisiones o conflictos */}
          <div style={{ marginTop: '0.5rem' }}>
            <span className={styles.reviewFactLabel}>{t('pipeline.openspec.engine.coexistence.collisionsTitle')}: </span>
            {coexistence.nameCollisions.length === 0 && coexistence.conflicts.length === 0 ? (
              <span style={{ color: 'var(--color-git-add)', fontSize: '0.66rem' }}>{t('pipeline.openspec.engine.coexistence.noCollisions')}</span>
            ) : (
              <div style={{ marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {coexistence.nameCollisions.map((col) => (
                  <span key={col} style={{ color: 'var(--color-warning)', fontSize: '0.64rem' }}>
                    ⚠️ Colisión de nombre: <code>{col}</code> existe en configuración legacy y nueva.
                  </span>
                ))}
                {coexistence.conflicts.map((conf, idx) => (
                  <span key={idx} style={{ color: 'var(--color-error)', fontSize: '0.64rem' }}>
                    ⚠️ Conflicto: {conf}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* OFRECIMIENTO CONDICIONAL DE --force (DECISIÓN 3: Sólo si hay residuo legacy concreto) */}
        {hasLegacyResidue && (
          <section
            className={styles.reviewSection}
            aria-label={t('pipeline.openspec.engine.review.forceOptionTitle')}
            style={{ borderColor: 'color-mix(in srgb, var(--color-git-mod) 40%, transparent)', background: 'color-mix(in srgb, var(--color-git-mod) 5%, transparent)' }}
          >
            <h3 className={styles.reviewSectionTitle} style={{ color: 'var(--color-git-mod)' }}>
              {t('pipeline.openspec.engine.review.forceOptionTitle')}
            </h3>
            <p style={{ margin: '0 0 0.4rem', color: 'var(--color-text-secondary)', fontSize: '0.66rem' }}>
              {t('pipeline.openspec.engine.review.forceWarning')}
            </p>
            <div style={{ margin: '0.2rem 0', fontSize: '0.66rem', color: 'var(--color-text-primary)' }}>
              <span>{t('pipeline.openspec.engine.review.forceFilesToClean')}</span>
            </div>
            <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.2rem', fontSize: '0.64rem', color: 'var(--color-git-mod)' }}>
              {coexistence.legacySkills.map((s) => (
                <li key={s.path}><code>{s.path}</code></li>
              ))}
            </ul>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.68rem', color: 'var(--color-text-primary)' }}>
              <input
                type="checkbox"
                checked={forceConfirmed}
                onChange={(e) => setForceConfirmed(e.target.checked)}
              />
              <span>{t('pipeline.openspec.engine.review.forceConfirmLabel')}</span>
            </label>
          </section>
        )}

        {/* INVENTARIO DIAGNÓSTICO DE OUTPUTS */}
        {presentOutputs.length > 0 && (
          <section className={styles.reviewSection} aria-label={t('pipeline.openspec.engine.outputsTitle')}>
            <h3 className={styles.reviewSectionTitle}>
              {t('pipeline.openspec.engine.outputsTitle')} ({presentOutputs.length})
            </h3>
            <p style={{ margin: '0 0 0.4rem', color: 'var(--color-text-secondary)', fontSize: '0.64rem' }}>
              {t('pipeline.openspec.engine.outputsHelp')}
            </p>
            <div className={styles.outputListScrollContainer}>
              <ul className={styles.outputList}>
                {presentOutputs.map((out) => (
                  <li key={out.id} className={styles.outputListItem} data-kind={out.kind}>
                    <span className={styles.outputKindBadge} data-kind={out.kind}>
                      {out.kind === 'repo-local'
                        ? t('pipeline.openspec.engine.output.repoLocal')
                        : t('pipeline.openspec.engine.output.externalGlobal')}
                    </span>
                    <code className={styles.outputPath}>{out.displayPath}</code>
                    {out.presenceState && (
                      <span className={styles.presenceBadge} data-presence={out.presenceState}>
                        {t(`pipeline.openspec.engine.presence.${out.presenceState}`)}
                      </span>
                    )}
                    {out.blocked && (
                      <span className={styles.blockedTag} aria-label={t('pipeline.openspec.engine.output.blockedBadge')}>
                        {t('pipeline.openspec.engine.output.blockedBadge')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* SALVAGUARDAS DE GIT Y ACCIONES EN EL PIE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
          {isMainOrMaster && (
            <div className={styles.reviewWarningAlert}>
              <AlertTriangle size={14} color="var(--color-error)" aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 1 }} />
              <span style={{ color: 'var(--color-error)' }}>
                {t('pipeline.openspec.engine.review.blockedBranchMain', { branch: currentBranch ?? 'main' })}
              </span>
            </div>
          )}

          {isDirty && (
            <div className={styles.reviewWarningAlert}>
              <AlertTriangle size={14} color="var(--color-error)" aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 1 }} />
              <span style={{ color: 'var(--color-error)' }}>
                {t('pipeline.openspec.engine.review.blockedDirty')}
              </span>
            </div>
          )}

          <div className={styles.reviewFooterRow}>
            {/* Si ya concluyó con éxito, ofrecemos preparar commit */}
            {executionResult?.success && onPrepareCommit && (
              <button
                type="button"
                className={styles.centerAttentionBtn}
                onClick={onPrepareCommit}
                style={{ marginRight: 'auto' }}
              >
                {t('pipeline.openspec.engine.review.prepareCommit')}
              </button>
            )}

            {/* Botón principal de ejecución de actualización (Paso 2) */}
            {!executionResult?.success && (
              <button
                type="button"
                className={styles.centerAttentionBtn}
                onClick={handleExecuteUpdate}
                disabled={!canExecute}
                title={
                  isMainOrMaster
                    ? t('pipeline.openspec.engine.review.blockedBranchMain', { branch: currentBranch ?? 'main' })
                    : isDirty
                    ? t('pipeline.openspec.engine.review.blockedDirty')
                    : undefined
                }
              >
                {isExecuting ? (
                  <>
                    <Loader2 size={13} className={styles.spin} aria-hidden="true" />
                    <span>{t('pipeline.openspec.engine.review.updating')}</span>
                  </>
                ) : forceConfirmed ? (
                  t('pipeline.openspec.engine.review.forceButton')
                ) : (
                  t('pipeline.openspec.engine.review.executeUpdate')
                )}
              </button>
            )}

            <button
              type="button"
              className={styles.reviewPrimaryActionBtn}
              onClick={onBack}
            >
              {t('pipeline.openspec.engine.review.close')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
