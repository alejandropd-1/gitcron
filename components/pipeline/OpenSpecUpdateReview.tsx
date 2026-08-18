'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type {
  OpenSpecEngineStatus,
  OpenSpecUpdatePlan,
} from '@/types/pipeline';
import {
  classifyCoexistenceSkills,
  deriveOfficialCommand,
} from '@/lib/openspec-update-guide';
import styles from './OpenSpecDashboard.module.css';

export interface OpenSpecUpdateReviewProps {
  repoPath: string;
  status: OpenSpecEngineStatus | null;
  updatePlan?: OpenSpecUpdatePlan | null;
  onBack: () => void;
}

export const OpenSpecUpdateReview: React.FC<OpenSpecUpdateReviewProps> = ({
  repoPath,
  status,
  updatePlan,
  onBack,
}) => {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const cli = status?.cli;
  const latest = status?.latestAvailable;
  const installed = status?.installedIntegration;

  // Derivar operación oficial y comando literal (6.2)
  const action = updatePlan?.requiredAction ?? (
    !cli?.installed
      ? (status?.repoState === 'not-initialized' ? 'init' : 'blocked')
      : status?.repoState === 'not-initialized'
      ? 'init'
      : status?.integrationState === 'outdated'
      ? 'update'
      : status?.integrationState === 'up-to-date'
      ? 'none'
      : 'blocked'
  );

  const officialCommand = deriveOfficialCommand(action, status);

  const actionKey = action === 'upgrade-init'
    ? 'upgradeInit'
    : action === 'upgrade-update'
    ? 'upgradeUpdate'
    : action;
  const actionLabel = t(`pipeline.openspec.engine.matrix.${actionKey}`);

  // Diagnóstico de convivencia de skills .codex ↔ .agents (6.4)
  const coexistence = classifyCoexistenceSkills(installed);

  const handleCopyCommand = async () => {
    if (!officialCommand) return;
    try {
      await navigator.clipboard.writeText(officialCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignorar fallo de clipboard
    }
  };

  const presentOutputs = (installed?.outputInventory ?? []).filter(
    (o) => o.presenceState !== 'absent',
  );

  return (
    <section className={styles.reviewView} aria-label={t('pipeline.openspec.engine.review.title')}>
      <header className={styles.reviewHead}>
        <div className={styles.reviewTitleRow}>
          <ShieldCheck size={20} color="var(--os-cyan, #38bdf8)" aria-hidden="true" />
          <h3>{t('pipeline.openspec.engine.review.title')}</h3>
        </div>
        <p>{t('pipeline.openspec.engine.review.safetyHelp')}</p>
      </header>

      <div className={styles.reviewBody}>
        {/* AVISO DE SÓLO LECTURA Y SEGURIDAD (6.1) */}
        <div className={styles.reviewSafetyBanner}>
          <Info size={16} aria-hidden="true" />
          <div className={styles.reviewSafetyText}>
            <strong>{t('pipeline.openspec.engine.review.safetyTitle')}</strong>
            <p>{t('pipeline.openspec.engine.review.safetyHelp')}</p>
          </div>
        </div>

        {/* DATOS DEL MOTOR Y PROCEDENCIA (6.1) */}
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
              <code style={{ fontSize: '0.66rem', color: '#93c5fd' }}>{cli.displayPath}</code>
            </div>
          )}
        </section>

        {/* MATRIZ DECLARADA Y COMANDO OFICIAL SUGERIDO (6.2) */}
        <section className={styles.reviewSection} aria-label={t('pipeline.openspec.engine.matrix.title')}>
          <h3 className={styles.reviewSectionTitle}>{t('pipeline.openspec.engine.matrix.title')}</h3>
          <div className={styles.reviewFactItem}>
            <span className={styles.reviewFactLabel}>{t('pipeline.openspec.engine.matrix.actionLabel')}:</span>
            <strong style={{ color: action === 'none' ? '#86efac' : action === 'blocked' ? '#fca5a5' : '#fcd34d' }}>
              {actionLabel}
            </strong>
          </div>

          {action === 'blocked' && (
            <p style={{ margin: '0.4rem 0 0', color: '#fca5a5', fontSize: '0.66rem' }}>
              {t('pipeline.openspec.engine.matrix.blockedReason', {
                reason: updatePlan?.reason ?? t('pipeline.openspec.engine.preview.blockedReason'),
              })}
            </p>
          )}

          {officialCommand && (
            <div className={styles.reviewCommandBox}>
              <p style={{ margin: 0, color: 'var(--os-muted)', fontSize: '0.66rem' }}>
                {t('pipeline.openspec.engine.matrix.commandHelp')}
              </p>
              <div className={styles.reviewCommandPre}>
                <code>{officialCommand}</code>
                <button
                  type="button"
                  className={styles.reviewCopyBtn}
                  onClick={handleCopyCommand}
                  aria-label={copied ? t('pipeline.openspec.engine.matrix.commandCopied') : t('pipeline.openspec.engine.matrix.copyCommand')}
                >
                  {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                  <span>{copied ? t('pipeline.openspec.engine.matrix.commandCopied') : t('pipeline.openspec.engine.matrix.copyCommand')}</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* GUÍA NO INTERACTIVA PARA INIT (6.3) */}
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

        {/* DIAGNÓSTICO DE CONVIVENCIA .codex ↔ .agents (6.4) */}
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
              <span style={{ color: '#86efac', fontSize: '0.66rem' }}>{t('pipeline.openspec.engine.coexistence.noCollisions')}</span>
            ) : (
              <div style={{ marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {coexistence.nameCollisions.map((col) => (
                  <span key={col} style={{ color: '#fcd34d', fontSize: '0.64rem' }}>
                    ⚠️ Colisión de nombre: <code>{col}</code> existe en configuración legacy y nueva.
                  </span>
                ))}
                {coexistence.conflicts.map((conf, idx) => (
                  <span key={idx} style={{ color: '#fca5a5', fontSize: '0.64rem' }}>
                    ⚠️ Conflicto: {conf}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* INVENTARIO DIAGNÓSTICO DE OUTPUTS (6.1) */}
        {presentOutputs.length > 0 && (
          <section className={styles.reviewSection} aria-label={t('pipeline.openspec.engine.outputsTitle')}>
            <h3 className={styles.reviewSectionTitle}>
              {t('pipeline.openspec.engine.outputsTitle')} ({presentOutputs.length})
            </h3>
            <p style={{ margin: '0 0 0.4rem', color: 'var(--os-muted)', fontSize: '0.64rem' }}>
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

        {/* FOOTER ACCIÓN DE SALIDA */}
        <div className={styles.reviewFooterRow}>
          <button
            type="button"
            className={styles.reviewPrimaryActionBtn}
            onClick={onBack}
          >
            {t('pipeline.openspec.engine.review.close')}
          </button>
        </div>
      </div>
    </section>
  );
};
