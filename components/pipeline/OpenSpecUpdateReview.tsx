'use client';

import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type {
  OpenSpecEngineStatus,
  OpenSpecInstallPlan,
  OpenSpecRunUpdateResult,
  OpenSpecUpdatePlan,
} from '@/types/pipeline';
import {
  classifyCoexistenceSkills,
  deriveOfficialCommand,
  deriveUpdateBlockReason,
  deriveUpdateMatrixAction,
} from '@/lib/openspec-update-guide';
import { OpenSpecEngineCard } from './OpenSpecEngineCard';
import { OpenSpecToolList } from './OpenSpecReadiness';
import { OpenSpecUpdateRunner } from './OpenSpecUpdateRunner';
import { OpenSpecReleaseNotes } from './OpenSpecReleaseNotes';
import { getOpenSpecEngineUpgrade } from './pipeline-domain';
import type { PipelineSnapshot } from './pipeline-view-state';
import { useOpenSpecInit } from '@/hooks/use-openspec-init';
import { useOpenSpecVersionAnalysis } from '@/hooks/use-openspec-version-analysis';
import { usePipelineStore } from '@/lib/pipeline-store';
import styles from './OpenSpecDashboard.module.css';

export interface OpenSpecUpdateReviewProps {
  repoPath: string;
  status: OpenSpecEngineStatus | null;
  updatePlan?: OpenSpecUpdatePlan | null;
  installPlan?: OpenSpecInstallPlan | null;
  snapshot?: PipelineSnapshot | null;
  openRepoPaths?: string[];
  currentBranch?: string | null;
  isClean?: boolean;
  uncommittedCount?: number;
  onBack: () => void;
  onPrepareCommit?: () => void;
  onUpdateCompleted?: (result: OpenSpecRunUpdateResult) => void;
}

export const OpenSpecUpdateReview: React.FC<OpenSpecUpdateReviewProps> = ({
  repoPath,
  status,
  updatePlan,
  installPlan,
  snapshot,
  openRepoPaths,
  currentBranch,
  isClean = true,
  uncommittedCount,
  onBack,
  onPrepareCommit,
  onUpdateCompleted,
}) => {
  const t = useT();
  const updateBlockRef = useRef<HTMLDivElement | null>(null);
  const { runOpenSpecInit, initBusy, initError, initNeedsTool } = useOpenSpecInit(repoPath);
  const openSpecTools = snapshot?.openSpec?.openSpecTools ?? [];
  const openSpecPresent = snapshot?.openSpec?.openSpecPresent ?? (status?.repoState === 'initialized');
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedHostCmd, setCopiedHostCmd] = useState(false);
  const [forceConfirmed, setForceConfirmed] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [lastIntegration, setLastIntegration] = useState<OpenSpecRunUpdateResult | null>(null);

  const cli = status?.cli;
  const latest = status?.latestAvailable;
  const installed = status?.installedIntegration;
  const upgrade = getOpenSpecEngineUpgrade(status);
  const {
    analysis,
    loading: notesLoading,
    error: notesError,
    redacting: notesRedacting,
    startedAt: notesStartedAt,
    partialText: notesPartialText,
    cancelRedaction: handleCancelRedactNotes,
    redact: handleRedactNotes,
  } = useOpenSpecVersionAnalysis(
    repoPath,
    upgrade !== null,
  );

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

  const hostCommand = installPlan?.globalCommand ?? null;

  const handleCopyHostCommand = async () => {
    if (!hostCommand) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(hostCommand);
        setCopiedHostCmd(true);
        setTimeout(() => setCopiedHostCmd(false), 2000);
      }
    } catch {
      // Ignorar fallo de clipboard
    }
  };

  const resolveBlockReasonText = (): string => {
    if (updatePlan?.reason) {
      return updatePlan.reason;
    }
    const blockReason = deriveUpdateBlockReason(status);
    if (blockReason === 'cli-not-installed') {
      return t('pipeline.openspec.engine.matrix.blockedCliNotInstalled');
    }
    if (blockReason === 'version-unknown') {
      return t('pipeline.openspec.engine.matrix.blockedVersionUnknown');
    }
    return t('pipeline.openspec.engine.matrix.blocked');
  };

  const engineStep = upgrade ? { installed: cli?.runtimeVersion ?? null, latest: upgrade.latest } : null;
  const integrationStep = action !== 'none' && action !== 'blocked';
  const runnerDisabledReason = action === 'blocked' ? t('pipeline.openspec.engine.matrix.blockedReason', { reason: resolveBlockReasonText() }) : null;

  const presentOutputs = (installed?.outputInventory ?? []).filter(
    (o) => o.presenceState !== 'absent',
  );

  return (
    <section className={styles.reviewView} aria-label={t('pipeline.openspec.engine.review.title')}>
      <header className={styles.reviewHead}>
        <div className={styles.reviewHeadTopRow}>
          <div className={styles.reviewTitleRow}>
            <ShieldCheck size={20} color="var(--color-primary)" aria-hidden="true" />
            <h3>{t('pipeline.openspec.engine.review.title')}</h3>
          </div>
          <button
            type="button"
            className={styles.reviewPrimaryActionBtn}
            onClick={onBack}
          >
            {t('pipeline.openspec.engine.review.close')}
          </button>
        </div>
      </header>

      <div className={styles.reviewBody}>
        {/* RESUMEN DE HECHOS Y ACCIONES AL FRENTE (Decisión 8.22) */}
        <div ref={updateBlockRef} className={styles.reviewUpfrontHeader}>
          <div className={styles.reviewUpfrontSummary}>
            <div className={styles.reviewFactLine}>
              <span className={styles.reviewFactLabel}>{t('pipeline.openspec.engine.summary.engineLabel')}</span>
              <span className={styles.reviewFactValue}>
                {!cli?.installed
                  ? t('pipeline.openspec.engine.status.absent')
                  : upgrade !== null
                  ? t('pipeline.openspec.engine.hostUpgrade.offer', { installed: upgrade.installed, latest: upgrade.latest })
                  : t('pipeline.openspec.engine.summary.engineUpToDate', { version: cli?.runtimeVersion ?? '?' })}
              </span>
            </div>
            <div className={styles.reviewFactLine}>
              <span className={styles.reviewFactLabel}>{t('pipeline.openspec.engine.summary.integrationLabel')}</span>
              <span className={styles.reviewFactValue}>
                <strong style={{ color: action === 'none' ? 'var(--color-git-add)' : action === 'blocked' ? 'var(--color-error)' : 'var(--color-warning)' }}>
                  {actionLabel}
                </strong>
              </span>
            </div>
          </div>

          <div className={styles.reviewUpfrontActions}>
            <OpenSpecUpdateRunner
              repoPath={repoPath}
              engine={engineStep}
              integration={integrationStep}
              updatePlan={updatePlan}
              force={forceConfirmed}
              warnings={{
                mainBranch: isMainOrMaster ? (currentBranch ?? 'main') : null,
                dirtyCount: isDirty ? (uncommittedCount ?? 1) : null,
              }}
              disabledReason={runnerDisabledReason}
              onIntegrationUpdated={(result) => {
                setLastIntegration(result);
                onUpdateCompleted?.(result);
              }}
            />

            {/* Si ya concluyó con éxito, ofrecemos preparar commit */}
            {lastIntegration?.success && onPrepareCommit && (
              <button
                type="button"
                className={styles.primaryAction}
                onClick={onPrepareCommit}
              >
                {t('pipeline.openspec.engine.review.prepareCommit')}
              </button>
            )}
          </div>

          {upgrade && (
            <OpenSpecReleaseNotes
              latest={upgrade.latest}
              analysis={analysis}
              loading={notesLoading}
              error={notesError}
              repoPath={repoPath}
              redacting={notesRedacting}
              startedAt={notesStartedAt}
              partialText={notesPartialText}
              onCancelRedact={handleCancelRedactNotes}
              onRedact={handleRedactNotes}
            />
          )}
        </div>

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
            <p style={{ margin: '0 0 var(--space-1)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
              {t('pipeline.openspec.engine.review.forceWarning')}
            </p>
            <div style={{ margin: 'var(--space-1) 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-primary)' }}>
              <span>{t('pipeline.openspec.engine.review.forceFilesToClean')}</span>
            </div>
            <ul style={{ margin: '0 0 var(--space-2)', paddingLeft: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-git-mod)' }}>
              {coexistence.legacySkills.map((s) => (
                <li key={s.path}><code>{s.path}</code></li>
              ))}
            </ul>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', cursor: 'pointer', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-primary)' }}>
              <input
                type="checkbox"
                checked={forceConfirmed}
                onChange={(e) => setForceConfirmed(e.target.checked)}
              />
              <span>{t('pipeline.openspec.engine.review.forceConfirmLabel')}</span>
            </label>
          </section>
        )}

        {/* DESDE LA TERMINAL (Plegado por omisión) */}
        <div className={styles.reviewSection}>
          <button
            type="button"
            className={styles.toggleAbsentBtn}
            onClick={() => setShowTerminal((prev) => !prev)}
            aria-expanded={showTerminal}
          >
            <span>{t('pipeline.openspec.engine.summary.terminalToggle')}</span>
            {showTerminal ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
          </button>

          {showTerminal && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {hostCommand && (
                <div className={styles.reviewCommandBox}>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                    {t('pipeline.openspec.engine.hostUpgrade.help')}
                  </p>
                  <div className={styles.reviewCommandPre}>
                    <code>{hostCommand}</code>
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
                </div>
              )}

              {officialCommand && (
                <div className={styles.reviewCommandBox}>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
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
            </div>
          )}
        </div>

        {/* SECCIÓN 2: MOTOR Y AGENTES */}
        <section className={styles.reviewSection} aria-label={t('pipeline.openspec.config.engineSection')}>
          <h3 className={styles.reviewSectionTitle}>{t('pipeline.openspec.config.engineSection')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <OpenSpecEngineCard
              status={status}
              isLoading={false}
              compact={false}
              defaultAdvancedOpen={true}
              isReviewOpen={true}
              repoPath={repoPath}
              openRepoPaths={openRepoPaths}
              commandExecuted={installPlan?.globalCommand ?? undefined}
              packageManagerPath={installPlan?.packageManagerPath ?? undefined}
              packageManagerName={installPlan?.detectedManager ?? undefined}
              nodePath={installPlan?.nodePath ?? undefined}
              hasPackageJson={installPlan?.hasManifest}
              onRequestUpdate={() => updateBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              onChanged={() => usePipelineStore.getState().notifyEngineChanged()}
            />
            <OpenSpecToolList
              present={openSpecPresent}
              tools={openSpecTools}
              busy={initBusy}
              error={initError}
              needsTool={initNeedsTool}
              onInitialize={() => runOpenSpecInit()}
              onInitializeWith={(ids) => runOpenSpecInit(ids)}
            />
          </div>
        </section>

        {/* DETALLE TÉCNICO (Plegado por omisión) */}
        <div className={styles.reviewSection}>
          <button
            type="button"
            className={styles.toggleAbsentBtn}
            onClick={() => setShowTechnicalDetails((prev) => !prev)}
            aria-expanded={showTechnicalDetails}
          >
            <span>{t('pipeline.openspec.engine.summary.technicalToggle')}</span>
            {showTechnicalDetails ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
          </button>

          {showTechnicalDetails && (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* 2. MATRIZ DECLARADA */}
              <section className={styles.reviewSection} aria-label={t('pipeline.openspec.engine.matrix.title')}>
                <h3 className={styles.reviewSectionTitle}>{t('pipeline.openspec.engine.matrix.title')}</h3>
                <div className={styles.reviewFactItem}>
                  <span className={styles.reviewFactLabel}>{t('pipeline.openspec.engine.matrix.actionLabel')}:</span>
                  <strong style={{ color: action === 'none' ? 'var(--color-git-add)' : action === 'blocked' ? 'var(--color-error)' : 'var(--color-warning)' }}>
                    {actionLabel}
                  </strong>
                </div>

                {action === 'blocked' && (
                  <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>
                    {t('pipeline.openspec.engine.matrix.blockedReason', {
                      reason: resolveBlockReasonText(),
                    })}
                  </p>
                )}
              </section>

              {/* 3. GUÍA NO INTERACTIVA PARA INIT */}
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

              {/* 4. DIAGNÓSTICO DE CONVIVENCIA .codex ↔ .agents */}
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
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <span className={styles.reviewFactLabel}>{t('pipeline.openspec.engine.coexistence.collisionsTitle')}: </span>
                  {coexistence.nameCollisions.length === 0 && coexistence.conflicts.length === 0 ? (
                    <span style={{ color: 'var(--color-git-add)', fontSize: 'var(--font-size-xs)' }}>{t('pipeline.openspec.engine.coexistence.noCollisions')}</span>
                  ) : (
                    <div style={{ marginTop: 'var(--space-1)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                      {coexistence.nameCollisions.map((col) => (
                        <span key={col} style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-xs)' }}>
                          ⚠️ Colisión de nombre: <code>{col}</code> existe en configuración legacy y nueva.
                        </span>
                      ))}
                      {coexistence.conflicts.map((conf, idx) => (
                        <span key={idx} style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>
                          ⚠️ Conflicto: {conf}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* 5. INVENTARIO DIAGNÓSTICO DE OUTPUTS */}
              {presentOutputs.length > 0 && (
                <section className={styles.reviewSection} aria-label={t('pipeline.openspec.engine.outputsTitle')}>
                  <h3 className={styles.reviewSectionTitle}>
                    {t('pipeline.openspec.engine.outputsTitle')} ({presentOutputs.length})
                  </h3>
                  <p style={{ margin: '0 0 var(--space-1)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
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

              {/* 6. ARCHIVOS TOCADOS POR LA ÚLTIMA ACTUALIZACIÓN */}
              {lastIntegration && lastIntegration.filesUpdated && lastIntegration.filesUpdated.length > 0 && (
                <section
                  className={styles.reviewSection}
                  aria-label={t('pipeline.openspec.engine.summary.filesTouched')}
                >
                  <h3 className={styles.reviewSectionTitle}>
                    {t('pipeline.openspec.engine.summary.filesTouched')}
                  </h3>
                  <ul style={{ margin: 'var(--space-1) 0 0', paddingLeft: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)' }}>
                    {lastIntegration.filesUpdated.map((f) => (
                      <li key={f}><code>{f}</code></li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
