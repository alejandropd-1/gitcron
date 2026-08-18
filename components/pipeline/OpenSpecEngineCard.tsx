import React, { useState } from 'react';
import { useT } from '@/hooks/use-translation';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import type { OpenSpecDivergenceReason, OpenSpecEngineStatus } from '../../types/pipeline';
import styles from './OpenSpecDashboard.module.css';

export interface OpenSpecEngineCardProps {
  status: OpenSpecEngineStatus | null;
  isLoading?: boolean;
  compact?: boolean;
  onOpenToolsTab?: () => void;
  onOpenReview?: () => void;
  isReviewOpen?: boolean;
}

export function formatDivergenceReason(
  reason: OpenSpecDivergenceReason | string | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!reason) return '';
  if (typeof reason === 'string') return reason;
  if (reason.kind === 'profile-mismatch') {
    return t('pipeline.openspec.engine.divergence.profileMismatch', {
      global: reason.globalProfileClass,
      repo: reason.repoProfileClass,
    });
  }
  if (reason.kind === 'target-workflows-mismatch') {
    const noneText = t('pipeline.openspec.engine.divergence.none');
    const targetWf = reason.targetWorkflows.length > 0
      ? reason.targetWorkflows.join(', ')
      : noneText;
    const globalWf = reason.globalWorkflows.length > 0
      ? reason.globalWorkflows.join(', ')
      : noneText;
    return t('pipeline.openspec.engine.divergence.targetWorkflows', {
      target: reason.label,
      targetCount: reason.targetCount,
      targetWorkflows: targetWf,
      globalCount: reason.globalCount,
      globalWorkflows: globalWf,
    });
  }
  if (reason.kind === 'multiple-target-divergences') {
    const noneText = t('pipeline.openspec.engine.divergence.none');
    return reason.targets
      .map((target) => {
        const targetWf = target.targetWorkflows.length > 0
          ? target.targetWorkflows.join(', ')
          : noneText;
        const globalWf = target.globalWorkflows.length > 0
          ? target.globalWorkflows.join(', ')
          : noneText;
        return t('pipeline.openspec.engine.divergence.targetWorkflows', {
          target: target.label,
          targetCount: target.targetCount,
          targetWorkflows: targetWf,
          globalCount: target.globalCount,
          globalWorkflows: globalWf,
        });
      })
      .join('; ');
  }
  return '';
}

export const OpenSpecEngineCard: React.FC<OpenSpecEngineCardProps> = ({
  status,
  isLoading = false,
  compact = false,
  onOpenToolsTab,
  onOpenReview,
  isReviewOpen = false,
}) => {
  const t = useT();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAbsentOutputs, setShowAbsentOutputs] = useState(false);

  // 1. Modo compacto (Insignia para header / summaryBar)
  if (compact) {
    if (isLoading && !status) {
      return (
        <div className={styles.compactEngineBadge} data-state="loading" title={t('pipeline.launcher.discovering')}>
          <span className={styles.healthDot} data-state="loading" aria-hidden="true" />
          <span>{t('pipeline.openspec.engine.axis.engine')}: {t('pipeline.launcher.discovering')}</span>
        </div>
      );
    }
    if (!status || !status.cli.installed) {
      return (
        <div
          className={styles.compactEngineBadge}
          data-state="absent"
          title={t('pipeline.openspec.engine.status.absent')}
          onClick={onOpenToolsTab}
          style={{ cursor: onOpenToolsTab ? 'pointer' : 'default' }}
        >
          <span className={styles.healthDot} data-state="absent" aria-hidden="true" />
          <span>{t('pipeline.openspec.engine.axis.engine')}: {t('pipeline.openspec.engine.status.absent')}</span>
        </div>
      );
    }
    const versionStr = `v${status.cli.runtimeVersion ?? '?'}`;
    const stateStr = t(`pipeline.openspec.engine.integrationState.${status.integrationState}`);
    return (
      <div
        className={styles.compactEngineBadge}
        data-state={status.integrationState}
        title={`${versionStr} · ${stateStr}`}
        onClick={onOpenToolsTab}
        style={{ cursor: onOpenToolsTab ? 'pointer' : 'default' }}
      >
        <span className={styles.healthDot} data-state={status.integrationState} aria-hidden="true" />
        <strong>{t('pipeline.openspec.engine.axis.engine')} {versionStr}</strong>
        <em className={styles.compactMeta}>({stateStr})</em>
      </div>
    );
  }

  // 2. Estado de Carga
  if (isLoading && !status) {
    return (
      <section className={styles.engineCardSection} aria-label={t('pipeline.openspec.engine.cardTitle')}>
        <header className={styles.engineCardHeader}>
          <h3>{t('pipeline.openspec.engine.cardTitle')}</h3>
        </header>
        <p className={styles.engineLoading}>{t('pipeline.launcher.discovering')}</p>
      </section>
    );
  }

  // 3. Estado Desconocido / Ausente
  if (!status) {
    return (
      <section className={styles.engineCardSection} aria-label={t('pipeline.openspec.engine.cardTitle')}>
        <header className={styles.engineCardHeader}>
          <h3>{t('pipeline.openspec.engine.cardTitle')}</h3>
          <span className={styles.generalStatusBadge} data-status="unknown">
            <HelpCircle size={12} aria-hidden="true" />
            {t('pipeline.openspec.engine.generalStatus.unknown')}
          </span>
        </header>
        <p className={styles.engineError}>{t('pipeline.openspec.engine.repoState.unknown')}</p>
      </section>
    );
  }

  const cli = status.cli;
  const provenanceKey = `pipeline.openspec.engine.provenance.${cli.provenance}`;
  const provenanceLabel = t(provenanceKey);

  const latest = status.latestAvailable;
  let latestStatusText = '';
  if (latest?.latestVersion) {
    const freshnessKey = latest.freshness === 'stale'
      ? 'pipeline.openspec.engine.cacheStatus.cachedStale'
      : latest.fromCache
      ? 'pipeline.openspec.engine.cacheStatus.cached'
      : 'pipeline.openspec.engine.cacheStatus.online';
    latestStatusText = `${t('pipeline.openspec.engine.latestAvailable', { version: latest.latestVersion })} (${t(freshnessKey, { age: latest.cacheAgeSeconds ?? 0 })})`;
  } else if (latest?.status === 'offline') {
    latestStatusText = t('pipeline.openspec.engine.cacheStatus.offline');
  }

  // Determinar estado general: ready | needs-attention | unknown
  let generalStatus: 'ready' | 'needs-attention' | 'unknown' = 'ready';
  if (status.integrationState === 'unknown' || status.repoState === 'unknown') {
    generalStatus = 'unknown';
  } else if (
    !cli.installed ||
    status.integrationState === 'outdated' ||
    status.integrationState === 'conflicted' ||
    status.repoState === 'not-initialized' ||
    status.divergence?.isDivergent
  ) {
    generalStatus = 'needs-attention';
  }

  const generalStatusKey = `pipeline.openspec.engine.generalStatus.${
    generalStatus === 'needs-attention'
      ? 'needsAttention'
      : generalStatus === 'ready'
      ? 'ready'
      : 'unknown'
  }`;

  const installed = status.installedIntegration;
  const configuredCount = installed?.configuredAgentsCount ?? installed?.configuredCount ?? (installed?.tools?.length ?? 0);
  const totalCount = installed?.totalPresentAgentsCount ?? installed?.totalPresentCount ?? configuredCount;

  const agentsText = totalCount > 0 && totalCount !== configuredCount
    ? t('pipeline.openspec.engine.agentsConfiguredRatio', { configured: configuredCount, total: totalCount })
    : t('pipeline.openspec.engine.agentsConfigured', { count: configuredCount });

  const divergence = status.divergence;
  const allOutputs = installed?.outputInventory ?? [];
  const presentOutputs = allOutputs.filter((o) => o.presenceState !== 'absent');
  const absentOutputs = allOutputs.filter((o) => o.presenceState === 'absent');

  return (
    <section className={styles.engineCardSection} aria-label={t('pipeline.openspec.engine.cardTitle')}>
      {/* VISTA PRIMARIA: Información comprensible y accionable */}
      <header className={styles.engineCardHeader}>
        <div className={styles.engineTitleRow}>
          <h3>{t('pipeline.openspec.engine.cardTitle')}</h3>
          <span className={styles.generalStatusBadge} data-status={generalStatus}>
            {generalStatus === 'ready' && <CheckCircle2 size={13} aria-hidden="true" />}
            {generalStatus === 'needs-attention' && <AlertTriangle size={13} aria-hidden="true" />}
            {generalStatus === 'unknown' && <HelpCircle size={13} aria-hidden="true" />}
            {t(generalStatusKey)}
          </span>
        </div>
      </header>

      <div className={styles.primarySummaryBox}>
        <div className={styles.summaryFactRow}>
          <span>{t('pipeline.openspec.engine.axis.engine')}:</span>
          <strong>
            {cli.installed ? `v${cli.runtimeVersion ?? '?'}` : t('pipeline.openspec.engine.status.absent')}
          </strong>
          {latestStatusText && <small className={styles.axisMeta}>· {latestStatusText}</small>}
        </div>

        <div className={styles.summaryFactRow}>
          <span>{t('pipeline.openspec.engine.axis.repo')}:</span>
          <strong data-state={status.repoState}>
            {t(`pipeline.openspec.engine.repoState.${status.repoState}`)}
          </strong>
        </div>

        <div className={styles.summaryFactRow}>
          <span>{t('pipeline.openspec.engine.axis.integration')}:</span>
          <strong data-state={status.integrationState}>
            {t(`pipeline.openspec.engine.integrationState.${status.integrationState}`)}
          </strong>
        </div>

        <div className={styles.summaryFactRow}>
          <span>{agentsText}</span>
        </div>

        {onOpenReview && (
          <div style={{ marginTop: '0.4rem' }}>
            <button
              type="button"
              className={styles.centerAttentionBtn}
              onClick={onOpenReview}
            >
              {isReviewOpen
                ? t('pipeline.openspec.engine.closeReviewAction')
                : t('pipeline.openspec.engine.reviewAction')}
            </button>
          </div>
        )}
      </div>

      {/* Botón de Diagnóstico Avanzado */}
      <button
        type="button"
        className={styles.toggleAdvancedBtn}
        onClick={() => setShowAdvanced((prev) => !prev)}
        aria-expanded={showAdvanced}
      >
        <span>
          {showAdvanced
            ? t('pipeline.openspec.engine.hideAdvanced')
            : t('pipeline.openspec.engine.showAdvanced')}
        </span>
        {showAdvanced ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>

      {/* VISTA AVANZADA DESPLEGABLE (Accordion con Scroll Interno Propio) */}
      {showAdvanced && (
        <div className={styles.advancedDiagnosticsContainer}>
          <div className={styles.engineAxesGrid}>
            {/* Ruta y Procedencia del Ejecutable */}
            <div className={styles.engineAxisItem} tabIndex={0}>
              <span className={styles.axisLabel}>{t('pipeline.openspec.engine.advanced.routeAndProvenance')}</span>
              <strong className={styles.axisValue}>
                <span className={styles.provenanceBadge} data-provenance={cli.provenance}>
                  {provenanceLabel}
                </span>
              </strong>
              {cli.displayPath && (
                <code className={styles.displayPathCode} title={cli.displayPath}>
                  {cli.displayPath}
                </code>
              )}
            </div>

            {/* Perfil y Workflows */}
            <div className={styles.engineAxisItem} tabIndex={0}>
              <span className={styles.axisLabel}>{t('pipeline.openspec.engine.advanced.profileAndWorkflows')}</span>
              <strong className={styles.axisValue}>
                {t('pipeline.openspec.engine.advanced.globalLabel')}: {divergence?.globalProfileClass ?? 'unknown'} | {t('pipeline.openspec.engine.advanced.repoLabel')}: {divergence?.repoProfileClass ?? 'unknown'}
              </strong>
            </div>

            {/* Evidencia del Repositorio */}
            <div className={styles.engineAxisItem} tabIndex={0}>
              <span className={styles.axisLabel}>{t('pipeline.openspec.engine.advanced.repoEvidence')}</span>
              <strong className={styles.axisValue} data-state={status.repoState}>
                {t(`pipeline.openspec.engine.repoState.${status.repoState}`)}
              </strong>
              {installed?.generatedBy && (
                <small className={styles.axisMeta}>
                  {t('pipeline.openspec.engine.generatedByLabel', { version: installed.generatedBy })}
                </small>
              )}
            </div>
          </div>

          {/* Declaración de divergencia o convergencia. La convergencia va en
              tono neutro a propósito: es un hecho sobre UN eje, no un «está
              todo bien» — el veredicto lo da la insignia general de la
              tarjeta, y un tilde verde tranquilizador dentro de una tarjeta
              que declara «necesita atención» se leía como contradicción. */}
          {divergence && (
            <div
              className={styles.divergenceNotice}
              data-status={divergence.isDivergent
                ? 'divergent'
                : divergence.overallStatus === 'convergent' ? 'convergent' : 'unknown'}
            >
              {divergence.isDivergent ? (
                <span className={styles.divergentText}>
                  {t('pipeline.openspec.engine.advanced.divergentNotice', {
                    reason: formatDivergenceReason(divergence.reason, t),
                  })}
                </span>
              ) : divergence.overallStatus === 'convergent' ? (
                <span className={styles.convergentText}>
                  {t('pipeline.openspec.engine.advanced.convergentNotice', { profile: divergence.repoProfileClass })}
                </span>
              ) : (
                <span className={styles.axisMeta}>
                  {t('pipeline.openspec.engine.advanced.undeterminedNotice')}
                </span>
              )}
            </div>
          )}

          {/* Lista de Outputs Presentes / Relevantes con Scroll Interno Propio */}
          {presentOutputs.length > 0 && (
            <div className={styles.outputInventorySection}>
              <span className={styles.inventoryTitle}>
                {t('pipeline.openspec.engine.outputsTitle')} ({presentOutputs.length})
              </span>
              <p className={styles.inventoryHelp}>
                {t('pipeline.openspec.engine.outputsHelp')}
              </p>
              <div className={styles.outputListScrollContainer}>
                <ul className={styles.outputList}>
                  {presentOutputs.map((out) => {
                    const presenceKey = out.presenceState
                      ? `pipeline.openspec.engine.presence.${out.presenceState}`
                      : 'pipeline.openspec.engine.presence.present';
                    return (
                      <li key={out.id} className={styles.outputListItem} data-kind={out.kind}>
                        <span className={styles.outputKindBadge} data-kind={out.kind}>
                          {out.kind === 'repo-local'
                            ? t('pipeline.openspec.engine.output.repoLocal')
                            : t('pipeline.openspec.engine.output.externalGlobal')}
                        </span>
                        <code className={styles.outputPath}>{out.displayPath}</code>
                        {out.presenceState && (
                          <span className={styles.presenceBadge} data-presence={out.presenceState}>
                            {t(presenceKey)}
                          </span>
                        )}
                        {out.blocked && (
                          <span
                            className={styles.blockedTag}
                            title={t(out.descriptionKey)}
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
          )}

          {/* Outputs Ausentes Colapsables */}
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
                <div className={styles.outputListScrollContainer}>
                  <p className={styles.inventoryHelp}>
                    {t('pipeline.openspec.engine.absentOutputsHelp')}
                  </p>
                  <ul className={styles.outputList}>
                    {absentOutputs.map((out) => (
                      <li key={out.id} className={styles.outputListItem} data-kind={out.kind} data-absent="true">
                        <span className={styles.outputKindBadge} data-kind={out.kind}>
                          {out.kind === 'repo-local'
                            ? t('pipeline.openspec.engine.output.repoLocal')
                            : t('pipeline.openspec.engine.output.externalGlobal')}
                        </span>
                        <code className={styles.outputPath}>{out.displayPath}</code>
                        <span className={styles.presenceBadge} data-presence="absent">
                          {t('pipeline.openspec.engine.presence.absent')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
