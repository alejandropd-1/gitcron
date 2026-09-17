'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { summarizeReleaseNotes } from '@/lib/release-notes-summary';
import type { OpenSpecVersionAnalysisResult } from '@/types/pipeline';
import { MarkdownViewer } from './MarkdownViewer';
import styles from './OpenSpecDashboard.module.css';

export interface OpenSpecReleaseNotesProps {
  latest: string;
  analysis: OpenSpecVersionAnalysisResult | null;
  loading: boolean;
  error: string | null;
}

export function OpenSpecReleaseNotes({
  latest,
  analysis,
  loading,
  error,
}: OpenSpecReleaseNotesProps) {
  const t = useT();

  const handleOpenUrl = (url: string) => {
    if (typeof window !== 'undefined' && window.api?.shellOpenExternal) {
      void window.api.shellOpenExternal(url);
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  const titleText = t('pipeline.openspec.releaseNotes.title', { version: latest });

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

          {analysis.redaction.status === 'generated' && analysis.redaction.text?.trim() ? (
            <div className={styles.releaseNotesReport}>
              <MarkdownViewer content={analysis.redaction.text} />
              <div className={styles.axisMeta}>
                {t('pipeline.openspec.releaseNotes.redactedBy', {
                  provider: analysis.redaction.provider,
                })}
              </div>
            </div>
          ) : null}

          {(analysis.redaction.status === 'offline' || analysis.redaction.status === 'error') ? (
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
