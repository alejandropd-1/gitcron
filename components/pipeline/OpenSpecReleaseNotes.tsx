'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { summarizeReleaseNotes } from '@/lib/release-notes-summary';
import type { OpenSpecVersionAnalysisResult } from '@/types/pipeline';
import { filterDraftableModels, type LocalModel } from '@/types/commit-message-ai';
import { useRememberedAiModel, rememberAiModel, getRememberedAiModel, formatAiDeviceLabel } from '@/lib/ai-model-memory';
import { MarkdownViewer } from './MarkdownViewer';
import { AiElapsed } from './AiElapsed';
import styles from './OpenSpecDashboard.module.css';

export interface OpenSpecReleaseNotesProps {
  latest: string;
  analysis: OpenSpecVersionAnalysisResult | null;
  loading: boolean;
  error: string | null;
  repoPath?: string | null;
  redacting?: boolean;
  startedAt?: number | null;
  partialText?: string;
  onRedact?: (model: string) => Promise<void>;
  onCancelRedact?: () => Promise<void> | void;
}

export function OpenSpecReleaseNotes({
  latest,
  analysis,
  loading,
  error,
  repoPath,
  redacting = false,
  startedAt = null,
  partialText,
  onRedact,
  onCancelRedact,
}: OpenSpecReleaseNotesProps) {
  const t = useT();

  const aiModel = useRememberedAiModel(repoPath);
  const [aiModels, setAiModels] = useState<LocalModel[]>([]);
  const [aiDeviceNames, setAiDeviceNames] = useState<Record<string, string>>({});
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [localStartedAt, setLocalStartedAt] = useState<number | null>(null);

  const effectiveStartedAt = startedAt ?? localStartedAt;

  useEffect(() => {
    let alive = true;
    if (typeof window !== 'undefined' && window.api?.commitAi?.catalog) {
      window.api.commitAi
        .catalog()
        .then((result) => {
          if (!alive) return;
          const disponibles = filterDraftableModels(result?.data ?? []);
          setAiModels(disponibles);
          const currentModel = getRememberedAiModel(repoPath);
          if (currentModel && !disponibles.some((m) => m.id === currentModel)) {
            rememberAiModel(repoPath, '');
          }
        })
        .catch(() => {
          if (alive) setAiModels([]);
        });
    }
    if (typeof window !== 'undefined' && window.api?.commitAi?.deviceNames) {
      window.api.commitAi
        .deviceNames()
        .then((result) => {
          if (alive && result?.data) setAiDeviceNames(result.data);
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [repoPath]);

  const chosenModel = aiModels.find((m) => m.id === aiModel);
  const isLoaded = Boolean(chosenModel?.loaded);
  const isBusy = Boolean(redacting || loadingModel);

  const handleDraftClick = async () => {
    if (redacting) {
      await onCancelRedact?.();
      return;
    }
    if (!aiModel || isBusy) return;
    setLoadError(null);
    setLocalStartedAt(Date.now());
    if (isLoaded) {
      try {
        await onRedact?.(aiModel);
      } finally {
        setLocalStartedAt(null);
      }
    } else {
      setLoadingModel(true);
      try {
        if (typeof window !== 'undefined' && window.api?.commitAi?.load) {
          const loadRes = await window.api.commitAi.load(aiModel, undefined, 65_536, 1800);
          if (loadRes && !loadRes.success) {
            setLoadError(loadRes.error || 'Error al cargar el modelo');
            return;
          }
          const catalog = await window.api?.commitAi?.catalog?.();
          if (catalog?.data) {
            setAiModels(filterDraftableModels(catalog.data));
          }
        }
        await onRedact?.(aiModel);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoadingModel(false);
        setLocalStartedAt(null);
      }
    }
  };

  const handleOpenUrl = (url: string) => {
    if (typeof window !== 'undefined' && window.api?.shellOpenExternal) {
      void window.api.shellOpenExternal(url);
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  const titleText = t('pipeline.openspec.releaseNotes.title', { version: latest });

  let buttonLabel = t('pipeline.openspec.releaseNotes.draftReport');
  if (isBusy) {
    buttonLabel = loadingModel
      ? t('pipeline.openspec.releaseNotes.loadingAndRedactingWith', { model: aiModel })
      : t('pipeline.openspec.releaseNotes.redactingWith', { model: aiModel });
  } else if (!isLoaded && aiModel) {
    buttonLabel = t('pipeline.openspec.releaseNotes.loadAndDraft');
  }

  const buttonTitle = !aiModel ? t('pipeline.openspec.releaseNotes.chooseModelReason') : undefined;

  return (
    <section className={styles.reviewSection} aria-label={titleText}>
      <h3 className={styles.reviewSectionTitle}>{titleText}</h3>

      {loading && <p>{t('pipeline.openspec.releaseNotes.loading')}</p>}

      {!loading && error && (
        <div role="alert" className={styles.blockedReasonInline}>
          {t('pipeline.openspec.releaseNotes.error', { error })}
        </div>
      )}

      {!loading && analysis && (
        <>
          {analysis.measured.changelog.fetched ? (
            (() => {
              const summaryData = summarizeReleaseNotes(analysis.measured.changelog.rawText);
              return (
                <>
                  {summaryData.summary && <p>{summaryData.summary}</p>}
                  {summaryData.bullets.length > 0 && (
                    <ul className={styles.releaseNotesList}>
                      {summaryData.bullets.map((bullet, idx) => (
                        <li key={`${idx}-${bullet.slice(0, 10)}`}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                  {analysis.measured.changelog.sourceUrl && (
                    <div className={styles.releaseNotesActions}>
                      <button
                        type="button"
                        className={styles.reviewCopyBtn}
                        onClick={() => handleOpenUrl(analysis.measured.changelog.sourceUrl!)}
                      >
                        <ExternalLink size={13} aria-hidden="true" />
                        {t('pipeline.openspec.releaseNotes.viewFull')}
                      </button>
                    </div>
                  )}
                  {analysis.measured.changelog.source && (
                    <div className={styles.axisMeta}>
                      {t('pipeline.openspec.releaseNotes.source', {
                        source: analysis.measured.changelog.source,
                      })}
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            <>
              <div className={styles.blockedReasonInline}>
                {t('pipeline.openspec.releaseNotes.unavailable', {
                  reason: analysis.measured.changelog.error ?? '',
                })}
              </div>
              {analysis.measured.changelog.sourceUrl && (
                <div className={styles.releaseNotesActions}>
                  <button
                    type="button"
                    className={styles.reviewCopyBtn}
                    onClick={() => handleOpenUrl(analysis.measured.changelog.sourceUrl!)}
                  >
                    <ExternalLink size={13} aria-hidden="true" />
                    {t('pipeline.openspec.releaseNotes.viewFull')}
                  </button>
                </div>
              )}
            </>
          )}

          {analysis.measured.breakingChangesDetected ? (
            <div role="alert" className={styles.blockedReasonInline}>
              {t('pipeline.openspec.releaseNotes.mayAffect', {
                surfaces: analysis.measured.consumedSurfaces
                  .filter((s) => s.verdict === 'breaking' || s.verdict === 'potential-break')
                  .map((s) => s.surface)
                  .join(', '),
              })}
            </div>
          ) : (
            <p>{t('pipeline.openspec.releaseNotes.compatible')}</p>
          )}

          <div className={styles.releaseNotesAiRow}>
            <select
              value={aiModel}
              disabled={isBusy || aiModels.length === 0}
              aria-label={t('pipeline.openspec.prepare.aiModel')}
              onChange={(e) => rememberAiModel(repoPath, e.target.value)}
            >
              <option value="">
                {aiModels.length === 0
                  ? t('pipeline.openspec.prepare.aiNoModels')
                  : t('pipeline.openspec.prepare.aiChoose')}
              </option>
              {aiModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.loaded
                    ? `${model.id} · ${model.loadedContextLength ?? '?'}`
                    : `${model.id} · ${t('pipeline.openspec.prepare.aiNotLoaded')}`}
                  {formatAiDeviceLabel(model.devices, aiDeviceNames, t) &&
                    ` · ${formatAiDeviceLabel(model.devices, aiDeviceNames, t)}`}
                </option>
              ))}
            </select>

            <button
              type="button"
              className={styles.reviewCopyBtn}
              disabled={redacting ? false : (!aiModel || isBusy)}
              title={redacting ? undefined : buttonTitle}
              onClick={handleDraftClick}
            >
              {redacting ? t('pipeline.openspec.releaseNotes.cancelDraft') : buttonLabel}
            </button>

            {redacting && (
              <AiElapsed key={effectiveStartedAt ?? 'drafting'} phase="drafting" startedAt={effectiveStartedAt} />
            )}
          </div>

          {loadError && (
            <div role="alert" className={styles.blockedReasonInline}>
              {loadError}
            </div>
          )}

          {redacting && partialText?.trim() ? (
            <div className={styles.releaseNotesReport}>
              <MarkdownViewer content={partialText} />
            </div>
          ) : null}

          {!redacting && analysis.redaction.status === 'generated' && analysis.redaction.text?.trim() ? (
            <div className={styles.releaseNotesReport}>
              <MarkdownViewer content={analysis.redaction.text} />
              <div className={styles.axisMeta}>
                {t('pipeline.openspec.releaseNotes.redactedBy', {
                  provider: analysis.redaction.provider,
                })}
              </div>
            </div>
          ) : null}

          {!redacting && analysis.redaction.status === 'error' && analysis.redaction.error ? (
            <div className={styles.axisMeta} role="alert">
              {analysis.redaction.error}
            </div>
          ) : null}

          {!redacting && analysis.redaction.status === 'offline' ? (
            <div className={styles.axisMeta}>
              {t('pipeline.openspec.releaseNotes.reportUnavailable')}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default OpenSpecReleaseNotes;
