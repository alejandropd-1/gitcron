'use client';

import React from 'react';
import { useT } from '@/hooks/use-translation';
import type { OpenSpecArtifactState, OpenSpecChangeStatus } from '@/types/pipeline';

/**
 * Estado textual de un artefacto del grafo de OpenSpec.
 *
 * El grafo es el que devuelve `openspec status --json`, leído del campo
 * `status` del cambio seleccionado. Cada artefacto llega con su `state` y, si
 * está `blocked`, la lista de dependencias que le faltan. Acá sólo se declara
 * lo que el CLI sabe: no se inventa estado derivando de tareas o validación,
 * que es justo el modelo propio que este cambio deja de usar para esta
 * superficie.
 *
 * Cuando el grafo no existe —`status` ausente o `available: false` porque el
 * CLI no pudo correr— el componente no se renderiza. No hay grafo, no hay
 * superficie; no se muestra un sustituto.
 */
export function shouldShowArtifactGraph(status: OpenSpecChangeStatus | null | undefined): status is OpenSpecChangeStatus {
  return Boolean(status && status.available && status.artifacts.length > 0);
}

const STATE_LABEL_KEY: Record<OpenSpecArtifactState, string> = {
  done: 'pipeline.openspec.graph.state.done',
  ready: 'pipeline.openspec.graph.state.ready',
  blocked: 'pipeline.openspec.graph.state.blocked',
  skipped: 'pipeline.openspec.graph.state.skipped',
  unknown: 'pipeline.openspec.graph.state.unknown',
};

export function PipelineArtifactGraph({ status }: { status: OpenSpecChangeStatus }) {
  const t = useT();
  return (
    <ul className="pipeline-artifact-graph" aria-label={t('pipeline.openspec.graph.label')}>
      {status.artifacts.map((artifact) => (
        <li key={artifact.id} data-state={artifact.state}>
          <span className="pipeline-artifact-graph__id">{artifact.id}</span>
          <span className="pipeline-artifact-graph__state">
            {t(STATE_LABEL_KEY[artifact.state] ?? 'pipeline.openspec.graph.state.unknown')}
          </span>
          {artifact.state === 'blocked' && artifact.missingDeps.length > 0 && (
            <span className="pipeline-artifact-graph__deps">
              {t('pipeline.openspec.graph.missingDeps', { deps: artifact.missingDeps.join(', ') })}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
