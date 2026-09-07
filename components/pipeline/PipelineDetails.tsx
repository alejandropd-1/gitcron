'use client';

import React, { useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { OpenSpecChangeSummary, PipelineSnapshot } from './pipeline-view-state';
import { SafeMarkdown } from './SafeMarkdown';
import { PipelineArtifactGraph, type DetailTab } from './PipelineArtifactGraph';

export type { DetailTab };

export type PipelineDetailsProps = {
  snapshot: PipelineSnapshot;
  repoPath?: string;
  /** Cambio seleccionado. Es el único que transporta el markdown de sus artefactos. */
  selectedChange?: OpenSpecChangeSummary | null;
  /** Pestaña activa. Controlada desde afuera para poder abrir un archivo desde la navegación. */
  tab?: DetailTab;
  onTabChange?: (tab: DetailTab) => void;
};

/** Un artefacto ausente se declara como tal, no se muestra como cuerpo vacío. */
const EMPTY_KEYS: Record<'proposal' | 'design' | 'tasks', string> = {
  proposal: 'pipeline.details.noProposal',
  design: 'pipeline.details.noDesign',
  tasks: 'pipeline.details.noTasks',
};

/**
 * Vista de detalle de un cambio OpenSpec.
 *
 * Muestra el contenido de los artefactos del cambio (propuesta, especificaciones,
 * diseño y tareas).
 *
 * El markdown llega dentro de la evidencia, ya contenido al repositorio por el
 * proceso main: el renderer no lee archivos. Un artefacto ausente se declara
 * como tal en vez de mostrarse como un cuerpo vacío.
 */
export function PipelineDetails({
  snapshot: _snapshot,
  repoPath: _repoPath,
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

  if (!selectedChange) {
    return null;
  }

  const artifacts = selectedChange.artifacts ?? null;
  const deltaSpecs = artifacts?.specs ?? [];

  const markdownPanel = (id: 'proposal' | 'design' | 'tasks', content: string | null) => (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} className="pipeline-details__panel">
      {content
        ? <SafeMarkdown content={content} />
        : <div className="pipeline-details__empty">{t(EMPTY_KEYS[id])}</div>}
    </div>
  );

  return (
    <div className="pipeline-details">
      <div
        className="pipeline-details__header"
        data-slot="artifact-timeline"
        aria-label={t('pipeline.openspec.artifacts.timelineSlot')}
      >
        <PipelineArtifactGraph
          status={selectedChange.status}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
      </div>

      <div className="pipeline-details__body">
        {activeTab === 'proposal' && markdownPanel('proposal', artifacts?.proposal ?? (selectedChange?.intent ? `## ${t('pipeline.details.proposal')}\n\n${selectedChange.intent}` : null))}
        {activeTab === 'design' && markdownPanel('design', artifacts?.design ?? null)}
        {activeTab === 'tasks' && markdownPanel('tasks', artifacts?.tasks ?? null)}

        {activeTab === 'specs' && (
          <div role="tabpanel" id="panel-specs" aria-labelledby="tab-specs" className="pipeline-details__panel">
            {deltaSpecs.length === 0 ? (
              <div className="pipeline-details__empty">{t('pipeline.details.noSpecs')}</div>
            ) : (
              deltaSpecs.map((spec) => (
                <section key={spec.capability} className="pipeline-details__spec">
                  <h4 className="pipeline-details__spec-title">{spec.capability}</h4>
                  {spec.content
                    ? <SafeMarkdown content={spec.content} />
                    : <div className="pipeline-details__empty">{t('pipeline.details.noSpecFile', { file: spec.sourceRef })}</div>}
                </section>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
