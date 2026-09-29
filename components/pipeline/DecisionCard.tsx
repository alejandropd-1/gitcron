'use client';

import React, { useState } from 'react';
import { useT } from '@/hooks/use-translation';
import { useGitStore } from '@/lib/git-store';
import { ProvenanceBadge } from './primitives/ProvenanceBadge';
import { UnknownValue } from './primitives/UnknownValue';
import type { DecisionOption, DecisionRequest } from './pipeline-domain';

export type DecisionCardProps = {
  decision: DecisionRequest;
  onRespondOption?: (decisionId: string, optionId: string, availability?: string) => void;
  isSending?: boolean;
  repoPath?: string | null;
};

/**
 * Una decisión, con la estructura que fija `docs/pipeline/UX-DECISIONES.md`:
 * qué te piden, por qué ahora, opciones y consecuencias, riesgo con
 * procedencia, evidencia, y contexto técnico expandible.
 *
 * En F05 las opciones con `pending-f05` pasan a estar conectadas mediante
 * respond-decision sobre el command bus de Main.
 */
export function DecisionCard({
  decision,
  onRespondOption,
  isSending = false,
  repoPath,
}: DecisionCardProps) {
  const t = useT();
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const gitStoreRepoPath = useGitStore((s) => s.repoPath);
  const effectiveRepoPath = repoPath !== undefined ? repoPath : gitStoreRepoPath;

  const isNotice =
    decision.options.length > 0 &&
    decision.options.every((option) => option.availability === 'informational');

  const handleOptionClick = async (option: DecisionOption) => {
    if (option.availability === 'informational') {
      setEvidenceError(null);
      const targetFile = decision.evidenceRefs[0];
      if (!targetFile || !effectiveRepoPath || typeof window === 'undefined' || !window.api?.shellOpenItem) {
        setEvidenceError('pipeline.decision.evidenceNotFound');
        return;
      }
      try {
        const result = await window.api.shellOpenItem(effectiveRepoPath, targetFile);
        if (!result || !result.success) {
          setEvidenceError('pipeline.decision.evidenceNotFound');
        }
      } catch {
        setEvidenceError('pipeline.decision.evidenceNotFound');
      }
      return;
    }

    if (onRespondOption) {
      onRespondOption(decision.decisionId, option.id, option.availability);
    }
  };

  return (
    <article
      className="pipeline-decision"
      data-kind={decision.kind}
      data-risk={decision.risk}
      data-notice={isNotice || undefined}
      data-sending={isSending || undefined}
    >
      {isNotice && (
        <span className="pipeline-decision__badge">{t('pipeline.decision.notice')}</span>
      )}
      <h4 className="pipeline-decision__title">{decision.title}</h4>

      <p className="pipeline-decision__why">
        {decision.why ?? <UnknownValue reason="not-reported" />}
      </p>

      {isSending && (
        <p className="pipeline-decision__sending" role="status" aria-live="polite">
          {t('pipeline.decision.sending')}
        </p>
      )}

      <div className="pipeline-decision__risk" data-risk={decision.risk}>
        <span className="pipeline-decision__risk-label">{t('pipeline.decision.risk')}</span>
        <span className="pipeline-decision__risk-value">
          {t(`pipeline.risk.${decision.risk}`)}
        </span>
        {decision.riskProvenance ? (
          <ProvenanceBadge
            provenance={decision.riskProvenance}
            evidenceStatus={decision.evidenceStatus}
          />
        ) : (
          <UnknownValue reason="unknown" />
        )}
      </div>

      <ul className="pipeline-decision__options">
        {decision.options.map((option) => {
          const isEnabled =
            option.availability === 'informational' ||
            (option.availability === 'pending-f05' && Boolean(onRespondOption));
          const disabled = !isEnabled || isSending;

          return (
            <li
              key={option.id}
              className="pipeline-decision__option"
              data-availability={option.availability}
            >
              <button
                type="button"
                className="pipeline-decision__option-button"
                aria-disabled={disabled || undefined}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    void handleOptionClick(option);
                  }
                }}
              >
                {t(option.labelKey)}
              </button>
              <span className="pipeline-decision__consequence">
                {option.consequence ?? <UnknownValue reason="not-reported" />}
              </span>
              {!isSending && disabled && (
                <span className="pipeline-decision__unavailable">
                  {t(`pipeline.availability.${option.availability}`)}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {evidenceError && (
        <p className="pipeline-decision__evidence-error" role="alert">
          {t(evidenceError)}
        </p>
      )}

      {decision.evidenceRefs.length > 0 && (
        <ul className="pipeline-decision__evidence">
          {decision.evidenceRefs.map((ref) => (
            <li key={ref}><code>{ref}</code></li>
          ))}
        </ul>
      )}

      {/* <details> nativo: accesible sin JS de toggle y cerrado por defecto,
          que es la regla del brief para el payload técnico. */}
      {decision.technicalContext && (
        <details className="pipeline-decision__technical">
          <summary>{t('pipeline.decision.technical')}</summary>
          <pre>{decision.technicalContext}</pre>
        </details>
      )}
    </article>
  );
}
