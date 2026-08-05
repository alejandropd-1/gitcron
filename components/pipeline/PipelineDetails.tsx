'use client';

import React, { useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { OpenSpecChangeSummary, PipelineSnapshot } from './pipeline-view-state';
import { SafeMarkdown } from './SafeMarkdown';
import { LazyDiffViewer } from './LazyDiffViewer';
import { PipelineArtifactGraph, shouldShowArtifactGraph } from './PipelineArtifactGraph';

export type PipelineDetailsProps = {
  snapshot: PipelineSnapshot;
  /** Cambio seleccionado. Es el único que transporta el markdown de sus artefactos. */
  selectedChange?: OpenSpecChangeSummary | null;
  /** Pestaña activa. Controlada desde afuera para poder abrir un archivo desde la navegación. */
  tab?: DetailTab;
  onTabChange?: (tab: DetailTab) => void;
};

export type DetailTab = 'proposal' | 'design' | 'specs' | 'tasks' | 'diffs';

/** Un artefacto ausente se declara como tal, no se muestra como cuerpo vacío. */
const EMPTY_KEYS: Record<'proposal' | 'design' | 'tasks', string> = {
  proposal: 'pipeline.details.noProposal',
  design: 'pipeline.details.noDesign',
  tasks: 'pipeline.details.noTasks',
};

/**
 * Lector de los artefactos del cambio y de los diffs observados.
 *
 * El markdown llega dentro de la evidencia, ya contenido al repositorio por el
 * proceso main: el renderer no lee archivos. Un artefacto ausente se declara
 * como tal en vez de mostrarse como un cuerpo vacío.
 */
export function PipelineDetails({
  snapshot,
  selectedChange = null,
  tab,
  onTabChange,
}: PipelineDetailsProps) {
  const t = useT();
  // Controlado si el contenedor pasa `tab`; si no, se gobierna solo.
  const [ownTab, setOwnTab] = useState<DetailTab>('proposal');
  const activeTab = tab ?? ownTab;
  const setActiveTab = (next: DetailTab) => {
    setOwnTab(next);
    onTabChange?.(next);
  };

  const diffCount = snapshot.diffs?.length ?? 0;
  const artifacts = selectedChange?.artifacts ?? null;
  const deltaSpecs = artifacts?.specs ?? [];

  const agentRuntimes = Object.fromEntries(
    snapshot.agents.map((agent) => [agent.agentId, agent.runtime])
  );

  const tabButton = (id: DetailTab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === id}
      aria-controls={`panel-${id}`}
      id={`tab-${id}`}
      className={`pipeline-details__tab ${activeTab === id ? 'pipeline-details__tab--active' : ''}`}
      onClick={() => setActiveTab(id)}
    >
      {label}
    </button>
  );

  const markdownPanel = (id: 'proposal' | 'design' | 'tasks', content: string | null) => (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} className="pipeline-details__panel">
      {content
        ? <SafeMarkdown content={content} />
        : <div className="pipeline-details__empty">{t(EMPTY_KEYS[id])}</div>}
    </div>
  );

  return (
    <div className="pipeline-details">
      <div className="pipeline-details__header">
        <div className="pipeline-details__tabs" role="tablist" aria-label={t('pipeline.details.title')}>
          {tabButton('proposal', t('pipeline.details.proposal'))}
          {tabButton('design', t('pipeline.details.design'))}
          {tabButton('specs', `${t('pipeline.details.specs')} (${deltaSpecs.length})`)}
          {tabButton('tasks', t('pipeline.details.tasks'))}
          {tabButton('diffs', `${t('pipeline.details.diffs')} (${diffCount})`)}
        </div>
      </div>

      <div className="pipeline-details__body">
        {/* El grafo del CLI declara el estado real de cada artefacto antes de
            su contenido. Es el dato que consume-openspec-status cableó hasta
            acá: si no hay grafo, no se dibuja ni se inventa un sustituto. */}
        {shouldShowArtifactGraph(selectedChange?.status)
          ? <PipelineArtifactGraph status={selectedChange.status} />
          : null}

        {activeTab === 'proposal' && markdownPanel('proposal', artifacts?.proposal ?? null)}
        {activeTab === 'design' && markdownPanel('design', artifacts?.design ?? null)}
        {activeTab === 'tasks' && markdownPanel('tasks', artifacts?.tasks ?? null)}

        {activeTab === 'specs' && (
          <div role="tabpanel" id="panel-specs" aria-labelledby="tab-specs" className="pipeline-details__panel">
            {deltaSpecs.length === 0
              ? <div className="pipeline-details__empty">{t('pipeline.details.noSpecs')}</div>
              : deltaSpecs.map((spec) => (
                <section key={spec.capability} className="pipeline-details__spec">
                  <h4 className="pipeline-details__spec-title">{spec.capability}</h4>
                  {spec.content
                    ? <SafeMarkdown content={spec.content} />
                    : <div className="pipeline-details__empty">{t('pipeline.details.noSpecFile', { file: spec.sourceRef })}</div>}
                </section>
              ))}
          </div>
        )}

        {activeTab === 'diffs' && (
          <div role="tabpanel" id="panel-diffs" aria-labelledby="tab-diffs" className="pipeline-details__panel">
            <LazyDiffViewer diffs={snapshot.diffs ?? []} agentRuntimes={agentRuntimes} />
          </div>
        )}
      </div>
    </div>
  );
}
