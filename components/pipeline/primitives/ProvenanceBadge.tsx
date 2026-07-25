'use client';

import type { PipelineDataProvenance, PipelineEvidenceStatus } from '@/types/pipeline';
import { useT } from '@/hooks/use-translation';

export type ProvenanceBadgeProps = {
  provenance: PipelineDataProvenance;
  evidenceStatus: PipelineEvidenceStatus;
};

/**
 * Marca de dónde salió un dato y con qué respaldo.
 *
 * La regla del brief es que hecho confirmado, inferencia y derivación se
 * distingan semánticamente, no solo por color: por eso el estado viaja en
 * `data-provenance` / `data-evidence` y además se escribe en palabras.
 */
export function ProvenanceBadge({ provenance, evidenceStatus }: ProvenanceBadgeProps) {
  const t = useT();
  const provenanceLabel = t(`pipeline.provenance.${provenance}`);
  const evidenceLabel = t(`pipeline.evidence.${evidenceStatus}`);
  return (
    <span
      className="pipeline-provenance"
      data-provenance={provenance}
      data-evidence={evidenceStatus}
    >
      <span className="pipeline-provenance__source">{provenanceLabel}</span>
      <span className="pipeline-provenance__evidence">{evidenceLabel}</span>
    </span>
  );
}
