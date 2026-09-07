'use client';

import React from 'react';
import { Check, Circle, Lock, Play } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type { OpenSpecArtifactState, OpenSpecChangeStatus } from '@/types/pipeline';

export type DetailTab = 'proposal' | 'design' | 'specs' | 'tasks';

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

const ARTIFACT_LABEL_KEY: Record<string, string> = {
  proposal: 'pipeline.openspec.graph.artifact.proposal',
  design: 'pipeline.openspec.graph.artifact.design',
  specs: 'pipeline.openspec.graph.artifact.specs',
  tasks: 'pipeline.openspec.graph.artifact.tasks',
};

const CANONICAL_ARTIFACTS: DetailTab[] = ['proposal', 'design', 'specs', 'tasks'];

export interface PipelineArtifactGraphProps {
  status?: OpenSpecChangeStatus | null;
  activeTab?: DetailTab;
  onSelectTab?: (tab: DetailTab) => void;
}

export function PipelineArtifactGraph({
  status,
  activeTab,
  onSelectTab,
}: PipelineArtifactGraphProps) {
  const t = useT();
  const hasCliState = shouldShowArtifactGraph(status);

  if (!hasCliState && !onSelectTab) {
    return null;
  }

  const artifacts: Array<{ id: string; state: OpenSpecArtifactState; missingDeps: string[] }> = hasCliState
    ? status.artifacts
    : CANONICAL_ARTIFACTS.map((id) => ({ id, state: 'unknown' as OpenSpecArtifactState, missingDeps: [] }));

  if (onSelectTab) {
    return (
      <div className="pipeline-details__tabs" role="tablist" aria-label={t('pipeline.details.title')}>
        <ul className="pipeline-artifact-graph" aria-label={hasCliState ? t('pipeline.openspec.graph.label') : undefined}>
          {artifacts.map((artifact) => {
            const labelKey = ARTIFACT_LABEL_KEY[artifact.id];
            const artifactLabel = labelKey ? t(labelKey) : artifact.id;
            const stateText = hasCliState
              ? t(STATE_LABEL_KEY[artifact.state] ?? 'pipeline.openspec.graph.state.unknown')
              : null;
            const isSelected = activeTab === artifact.id;
            return (
              <li key={artifact.id} data-state={hasCliState ? artifact.state : undefined}>
                <button
                  type="button"
                  role="tab"
                  id={`tab-${artifact.id}`}
                  aria-controls={`panel-${artifact.id}`}
                  aria-selected={isSelected}
                  className={`pipeline-details__tab ${isSelected ? 'pipeline-details__tab--active' : ''}`}
                  onClick={() => onSelectTab(artifact.id as DetailTab)}
                >
                  <span className="pipeline-artifact-graph__id">{artifactLabel}</span>
                  {hasCliState && stateText && (
                    <span className="pipeline-artifact-graph__state" title={stateText}>
                      <span className="pipeline-artifact-graph__sr-text">{stateText}</span>
                      {artifact.state === 'done' ? (
                        <Check size={13} aria-hidden="true" />
                      ) : artifact.state === 'ready' ? (
                        <Play size={11} aria-hidden="true" />
                      ) : artifact.state === 'blocked' ? (
                        <Lock size={12} aria-hidden="true" />
                      ) : (
                        <Circle size={10} aria-hidden="true" />
                      )}
                    </span>
                  )}
                  {hasCliState && artifact.state === 'blocked' && artifact.missingDeps.length > 0 && (
                    <span className="pipeline-artifact-graph__deps">
                      {t('pipeline.openspec.graph.missingDeps', { deps: artifact.missingDeps.join(', ') })}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <ul className="pipeline-artifact-graph" aria-label={t('pipeline.openspec.graph.label')}>
      {status!.artifacts.map((artifact) => {
        const labelKey = ARTIFACT_LABEL_KEY[artifact.id];
        const artifactLabel = labelKey ? t(labelKey) : artifact.id;
        const stateText = t(STATE_LABEL_KEY[artifact.state] ?? 'pipeline.openspec.graph.state.unknown');
        return (
          <li key={artifact.id} data-state={artifact.state}>
            <span className="pipeline-artifact-graph__id">{artifactLabel}</span>
            <span className="pipeline-artifact-graph__state" title={stateText}>
              <span className="pipeline-artifact-graph__sr-text">{stateText}</span>
              {artifact.state === 'done' ? (
                <Check size={13} aria-hidden="true" />
              ) : artifact.state === 'ready' ? (
                <Play size={11} aria-hidden="true" />
              ) : artifact.state === 'blocked' ? (
                <Lock size={12} aria-hidden="true" />
              ) : (
                <Circle size={10} aria-hidden="true" />
              )}
            </span>
            {artifact.state === 'blocked' && artifact.missingDeps.length > 0 && (
              <span className="pipeline-artifact-graph__deps">
                {t('pipeline.openspec.graph.missingDeps', { deps: artifact.missingDeps.join(', ') })}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
