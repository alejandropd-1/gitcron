'use client';

import { useT } from '@/hooks/use-translation';
import { ProvenanceBadge } from './primitives/ProvenanceBadge';
import { UnknownValue } from './primitives/UnknownValue';
import type { DecisionRequest } from './pipeline-domain';

export type DecisionCardProps = {
  decision: DecisionRequest;
};

/**
 * Una decisión, con la estructura que fija `docs/pipeline/UX-DECISIONES.md`:
 * qué te piden, por qué ahora, opciones y consecuencias, riesgo con
 * procedencia, evidencia, y contexto técnico expandible.
 *
 * En F04 ninguna opción ejecuta nada. Se muestran igual —con `aria-disabled` y
 * el motivo escrito— porque ocultarlas dejaría a la persona sin saber qué va a
 * poder hacer. La razón se explica, no se insinúa con un gris.
 */
export function DecisionCard({ decision }: DecisionCardProps) {
  const t = useT();

  return (
    <article className="pipeline-decision" data-kind={decision.kind} data-risk={decision.risk}>
      <h4 className="pipeline-decision__title">{decision.title}</h4>

      <p className="pipeline-decision__why">
        {decision.why ?? <UnknownValue reason="not-reported" />}
      </p>

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
          const disabled = option.availability !== 'informational';
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
              >
                {t(option.labelKey)}
              </button>
              <span className="pipeline-decision__consequence">
                {option.consequence ?? <UnknownValue reason="not-reported" />}
              </span>
              {disabled && (
                <span className="pipeline-decision__unavailable">
                  {t(`pipeline.availability.${option.availability}`)}
                </span>
              )}
            </li>
          );
        })}
      </ul>

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
