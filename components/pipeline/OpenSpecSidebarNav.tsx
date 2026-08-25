'use client';

import React from 'react';
import { BookOpen, CheckCircle2, ChevronDown, CircleDot, FileText, FolderOpen } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { useReducedMotion, motion } from 'motion/react';
import type { DetailTab } from './PipelineDetails';
import { sortActiveChangesByProgress, type OpenSpecChangeSummary, type PipelineSnapshot } from './pipeline-view-state';
import { usePipelineStore } from '@/lib/pipeline-store';
import { SidebarSection } from '@/components/RepoSidebarParts';
import { useSidebarSectionState } from '@/hooks/use-sidebar-section-state';
import { useGitStore } from '@/lib/git-store';
import styles from './OpenSpecDashboard.module.css';

export type OpenSpecSidebarNavProps = {
  repoPath?: string | null;
  snapshot?: PipelineSnapshot | null;
  selectedChangeId?: string | null;
  onSelectChange?: (changeId: string) => void;
  openSpecificationId?: string | null;
  onSelectSpecification?: (specId: string | null) => void;
  onOpenArtifact?: (changeId: string, tab: DetailTab) => void;
  expandedChanges?: Record<string, boolean>;
  onToggleExpandChange?: (changeId: string) => void;
};

function taskProgress(change: OpenSpecChangeSummary): { completed: number; total: number; percent: number } {
  const tasks = Array.isArray(change.tasks) ? change.tasks : [];
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  return { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

export function OpenSpecSidebarNav({
  repoPath: propRepoPath,
  snapshot: propSnapshot,
  selectedChangeId: propSelectedId,
  onSelectChange: propOnSelectChange,
  openSpecificationId: propOpenSpecId,
  onSelectSpecification: propOnSelectSpec,
  onOpenArtifact: propOnOpenArtifact,
  expandedChanges: propExpandedChanges,
  onToggleExpandChange: propOnToggleExpand,
}: OpenSpecSidebarNavProps) {
  const t = useT();
  const reducedMotion = useReducedMotion();
  const gitRepoPath = useGitStore((s) => s.repoPath);
  const effectiveRepoPath = propRepoPath !== undefined ? propRepoPath : gitRepoPath;
  const sectionState = useSidebarSectionState(effectiveRepoPath);

  const storeSnapshot = usePipelineStore((s) => s.snapshot);
  const storeSelectedId = usePipelineStore((s) => s.selectedChangeId);
  const storeSetSelectedId = usePipelineStore((s) => s.setSelectedChangeId);
  const storeOpenSpecId = usePipelineStore((s) => s.openSpecificationId);
  const storeSetOpenSpecId = usePipelineStore((s) => s.setOpenSpecificationId);
  const storeExpanded = usePipelineStore((s) => s.expandedChanges);
  const storeToggleExpand = usePipelineStore((s) => s.toggleExpandedChange);

  const snapshot = propSnapshot ?? storeSnapshot;
  const openSpec = snapshot?.openSpec;
  const activeChanges = openSpec?.activeChanges ?? [];
  const archivedChanges = openSpec?.archivedChanges ?? [];
  const specifications = openSpec?.specifications ?? [];

  const selectedId = propSelectedId !== undefined ? propSelectedId : (storeSelectedId ?? openSpec?.selectedChangeId ?? null);
  const openSpecificationId = propOpenSpecId !== undefined ? propOpenSpecId : storeOpenSpecId;
  const expandedChanges = propExpandedChanges ?? storeExpanded;

  const selectChange = (changeId: string) => {
    if (propOnSelectChange) propOnSelectChange(changeId);
    storeSetSelectedId(changeId);
    if (openSpecificationId) {
      if (propOnSelectSpec) propOnSelectSpec(null);
      storeSetOpenSpecId(null);
    }
  };

  const selectSpecification = (specId: string) => {
    const next = openSpecificationId === specId ? null : specId;
    if (propOnSelectSpec) propOnSelectSpec(next);
    storeSetOpenSpecId(next);
  };

  const toggleExpand = (changeId: string) => {
    if (propOnToggleExpand) propOnToggleExpand(changeId);
    else storeToggleExpand(changeId);
  };

  const openArtifact = (changeId: string, tab: DetailTab) => {
    selectChange(changeId);
    if (propOnOpenArtifact) propOnOpenArtifact(changeId, tab);
  };

  const totalTasks = activeChanges.reduce(
    (total, change) => total + (Array.isArray(change.tasks) ? change.tasks.length : 0),
    0,
  );
  const completedTasks = activeChanges.reduce(
    (total, change) =>
      total +
      (Array.isArray(change.tasks)
        ? change.tasks.filter((task) => task.completed).length
        : 0),
    0,
  );
  const taskPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <nav data-testid="openspec-sidebar-nav" className={`${styles.navigator} ${styles.openspecScope}`} aria-label={t('pipeline.openspec.navigator.label')}>
      <div data-testid="sidebar-change-cycle-header" className="px-3 pt-1 pb-1 text-xs font-bold uppercase tracking-wider text-text-secondary/70 select-none flex items-center justify-between">
        <span>{t('sidebar.changeCycle')}</span>
        <span>{taskPercent}%</span>
      </div>
      <SidebarSection
        title={t('pipeline.openspec.active.title')}
        count={activeChanges.length}
        icon={<CircleDot size={13} aria-hidden="true" />}
        isOpen={sectionState.isOpen('openspec-active')}
        onToggle={() => sectionState.toggle('openspec-active')}
      >
        <div className={styles.activeList}>
          {activeChanges.length === 0 ? (
            <p className={styles.navEmpty}>{t('pipeline.openspec.active.empty')}</p>
          ) : sortActiveChangesByProgress(activeChanges).map((change) => {
            const itemProgress = taskProgress(change);
            const isSelected = change.changeId === selectedId;
            const isExpanded = expandedChanges[change.changeId] ?? false;
            const tasksDone = itemProgress.completed === itemProgress.total && itemProgress.total > 0;
            const readable = change.artifacts;

            const artifactRow = (
              label: string,
              exists: boolean,
              stateLabel: string,
              tab: DetailTab | null,
              icon: React.ReactNode,
            ) => (
              <button
                type="button"
                className={styles.artifactRow}
                disabled={!exists || tab === null || readable === null}
                onClick={() => { if (tab) openArtifact(change.changeId, tab); }}
                title={exists ? t('pipeline.openspec.artifact.open', { file: label }) : undefined}
              >
                {icon} {label} <em data-done={exists}>{stateLabel}</em>
              </button>
            );

            return (
              <motion.div
                key={change.changeId}
                layout={reducedMotion ? false : 'position'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
                className={styles.activeChange}
                data-selected={isSelected}
              >
                <div className={styles.changeHeadingRow}>
                  <button
                    type="button"
                    className={styles.changeSelect}
                    onClick={() => selectChange(change.changeId)}
                  >
                    <span className={styles.changeHeading}>
                      <span className={styles.changeDot} aria-hidden="true" />
                      <strong>{change.changeId}</strong>
                      <span>{itemProgress.percent}%</span>
                    </span>
                    <span className={styles.progressTrack} aria-label={t('pipeline.openspec.progress', { completed: itemProgress.completed, total: itemProgress.total })}>
                      <span style={{ width: `${itemProgress.percent}%` }} />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.changeToggle}
                    aria-expanded={isExpanded}
                    aria-label={t(isExpanded ? 'pipeline.openspec.change.collapse' : 'pipeline.openspec.change.expand', { change: change.changeId })}
                    onClick={() => toggleExpand(change.changeId)}
                  >
                    <ChevronDown size={14} data-expanded={isExpanded} />
                  </button>
                </div>

                {isExpanded && (
                  <>
                    <p className={styles.changeIntent}>{change.intent ?? t('pipeline.openspec.intentUnknown')}</p>
                    <div className={styles.artifactList}>
                      {artifactRow('proposal.md', change.proposalExists, change.proposalExists ? t('pipeline.openspec.complete') : t('pipeline.openspec.pending'), 'proposal', <FileText size={13} />)}
                      {artifactRow('design.md', change.designExists, change.designExists ? t('pipeline.openspec.complete') : t('pipeline.openspec.pending'), 'design', <FileText size={13} />)}
                      {artifactRow('specs/', change.specsCount > 0, change.specsCount > 0 ? t('pipeline.openspec.complete') : t('pipeline.openspec.pending'), 'specs', <FolderOpen size={13} />)}
                      {artifactRow('tasks.md', itemProgress.total > 0, tasksDone ? t('pipeline.openspec.complete') : t('pipeline.openspec.inProgress'), 'tasks', <FileText size={13} />)}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </SidebarSection>

      <SidebarSection
        title={t('pipeline.openspec.completed.title')}
        count={archivedChanges.length}
        icon={<CheckCircle2 size={13} aria-hidden="true" />}
        isOpen={sectionState.isOpen('openspec-completed')}
        onToggle={() => sectionState.toggle('openspec-completed')}
      >
        <div className={styles.compactList}>
          {archivedChanges.slice(0, 8).map((change) => (
            <button type="button" key={`${change.archivedAt}-${change.changeId}`} data-selected={selectedId === change.changeId} onClick={() => selectChange(change.changeId)}>
              <CheckCircle2 size={13} />
              <strong>{change.changeId}</strong>
              <span>{change.archivedAt ?? t('pipeline.openspec.dateUnknown')}</span>
            </button>
          ))}
          {archivedChanges.length === 0 && <p className={styles.navEmpty}>{t('pipeline.openspec.completed.empty')}</p>}
        </div>
      </SidebarSection>

      <SidebarSection
        title={t('pipeline.openspec.specifications.title')}
        count={specifications.length}
        icon={<FileText size={13} aria-hidden="true" />}
        isOpen={sectionState.isOpen('openspec-specifications')}
        onToggle={() => sectionState.toggle('openspec-specifications')}
      >
        <div className={styles.specList}>
          {specifications.map((specification) => (
            <button
              type="button"
              key={specification.specificationId}
              title={specification.sourceRef}
              data-selected={openSpecificationId === specification.specificationId}
              onClick={() => selectSpecification(specification.specificationId)}
            >
              <BookOpen size={11} />
              <strong>{specification.specificationId}</strong>
              <span>{specification.requirements === null ? '—' : t('pipeline.openspec.requirements', { count: specification.requirements })}</span>
            </button>
          ))}
          {specifications.length === 0 && <p className={styles.navEmpty}>{t('pipeline.openspec.specifications.empty')}</p>}
        </div>
      </SidebarSection>
    </nav>
  );
}
