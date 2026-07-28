'use client';

import { useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Code2,
  FileCode2,
  FileText,
  FolderOpen,
  GitBranch,
  ShieldCheck,
  Wrench,
  MessageSquareText,
  BrainCircuit,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type { RuntimeProjection } from '@/types/pipeline';
import { ActivityFeed } from './ActivityFeed';
import { DecisionInbox } from './DecisionInbox';
import { PipelineDetails } from './PipelineDetails';
import { PipelineRuntimeLauncher } from './PipelineRuntimeLauncher';
import { PipelineNextStepGuide } from './PipelineNextStepGuide';
import { PipelineNewChangeFlow, type PipelineNewChangeMode } from './PipelineNewChangeFlow';
import {
  composeApplyInstruction,
  composeArchiveInstruction,
  derivePipelineNextAction,
  type PipelineActionIntent,
} from './pipeline-next-action';
import { groupActivity, runtimeDisplayName, type ActivityChannel } from './pipeline-domain';
import type { OpenSpecChangeSummary, PipelineSnapshot } from './pipeline-view-state';
import styles from './OpenSpecDashboard.module.css';

type OpenSpecDashboardProps = {
  snapshot: PipelineSnapshot;
  repoPath: string;
  currentBranch: string;
  workingTreeClean: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  onResizeLeft: (event: React.MouseEvent) => void;
  onResizeRight: (event: React.MouseEvent) => void;
  projection: RuntimeProjection | null;
  runtimeHistory: RuntimeProjection[];
  /** Hay datos de vista previa en pantalla: nada ejecutable puede habilitarse. */
  fixtureActive?: boolean;
  /** Relee la evidencia del repo. Es el fallback explícito del watcher. */
  onRefresh?: () => void;
  onPauseAfterTask: () => void;
  onRespondDecision: (decisionId: string, optionId: string) => void;
};

type CenterTab = 'work' | 'activity';

const ACTIVITY_ICONS: Record<ActivityChannel, React.ComponentType<{ size?: number }>> = {
  narrative: MessageSquareText,
  reasoning: BrainCircuit,
  tool: Wrench,
  file: FileCode2,
  system: CheckCircle2,
};

function taskProgress(change: OpenSpecChangeSummary): { completed: number; total: number; percent: number } {
  const total = change.tasks.length;
  const completed = change.tasks.filter((task) => task.completed).length;
  return { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

function lifecycle(change: OpenSpecChangeSummary | null, archived: boolean) {
  const progress = change ? taskProgress(change) : { completed: 0, total: 0, percent: 0 };
  const applyDone = archived || (progress.total > 0 && progress.completed === progress.total);
  const validationDone = archived || change?.validation === 'passed';
  return [
    { key: 'explore', done: Boolean(change) || archived, current: false },
    { key: 'propose', done: archived || change?.proposalExists === true, current: false },
    { key: 'apply', done: applyDone, current: Boolean(change) && !applyDone },
    { key: 'validate', done: validationDone, current: applyDone && !validationDone },
    { key: 'archive', done: archived, current: validationDone && !archived },
  ];
}

function formatTime(value: string | null): string {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function formatSessionOption(session: RuntimeProjection): string {
  const runtime = runtimeDisplayName(session.runtime) ?? session.runtime;
  const context = [session.changeId, session.taskId].filter(Boolean).join(' · ');
  const date = new Date(session.startedAt);
  const started = Number.isNaN(date.getTime())
    ? session.startedAt
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  return [runtime, context, started].filter(Boolean).join(' · ');
}

export function OpenSpecDashboard({
  snapshot,
  repoPath,
  currentBranch,
  workingTreeClean,
  leftOpen,
  rightOpen,
  leftWidth,
  rightWidth,
  onResizeLeft,
  onResizeRight,
  projection,
  runtimeHistory,
  fixtureActive = false,
  onRefresh,
  onPauseAfterTask,
  onRespondDecision,
}: OpenSpecDashboardProps) {
  const t = useT();
  const openSpec = snapshot.openSpec;
  const [selection, setSelection] = useState<string | null>(null);
  const [centerTab, setCenterTab] = useState<CenterTab>('work');
  const [showEvidence, setShowEvidence] = useState(false);
  const [launchInstruction, setLaunchInstruction] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [flowMode, setFlowMode] = useState<PipelineNewChangeMode | null>(null);
  const attentionRef = useRef<HTMLElement>(null);

  const activeChanges = openSpec?.activeChanges ?? [];
  const archivedChanges = openSpec?.archivedChanges ?? [];
  const specifications = openSpec?.specifications ?? [];
  const selectableIds = new Set([
    ...activeChanges.map((change) => change.changeId),
    ...archivedChanges.map((change) => change.changeId),
  ]);
  const selectedId = selection && selectableIds.has(selection)
    ? selection
    : openSpec?.selectedChangeId ?? activeChanges[0]?.changeId ?? archivedChanges[0]?.changeId ?? null;
  const selectedChange = activeChanges.find((change) => change.changeId === selectedId) ?? null;
  const selectedArchive = archivedChanges.find((change) => change.changeId === selectedId) ?? null;
  const progress = selectedChange ? taskProgress(selectedChange) : { completed: 0, total: 0, percent: 0 };
  const nextTask = selectedChange?.tasks.find((task) => !task.completed) ?? null;
  const stages = lifecycle(selectedChange, selectedArchive !== null);
  const runtimeActive = projection?.active === true;
  const runtimeSessions = [projection, ...runtimeHistory]
    .filter((entry): entry is RuntimeProjection => entry !== null)
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.sessionId === entry.sessionId) === index)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  const effectiveSessionId = selectedSessionId && runtimeSessions.some((entry) => entry.sessionId === selectedSessionId)
    ? selectedSessionId
    : projection?.sessionId ?? runtimeSessions[0]?.sessionId ?? null;
  const selectedSession = runtimeSessions.find((entry) => entry.sessionId === effectiveSessionId) ?? null;
  const visibleActivity = selectedSession?.activity ?? snapshot.activity;
  const activityGroups = groupActivity(visibleActivity);
  const selectedReasoningAvailable = selectedSession
    ? selectedSession.reasoningVisibility === 'emitted' || selectedSession.reasoningVisibility === 'summary'
      ? true
      : selectedSession.reasoningVisibility === 'unavailable'
        ? false
        : null
    : snapshot.economy.reasoningAvailable;
  const sessionStatusKey = selectedSession?.outcome
    ?? (visibleActivity.length > 0 ? 'latest' : 'none');
  const runningAgent = snapshot.agents.find((agent) => agent.state === 'running') ?? snapshot.agents[0] ?? null;
  const runningName = runtimeDisplayName(selectedSession?.runtime ?? runningAgent?.runtime ?? null) ?? t('pipeline.openspec.activity.agentUnknown');
  const totalRequirements = specifications.reduce((total, item) => total + (item.requirements ?? 0), 0);
  const totalTasks = activeChanges.reduce((total, change) => total + change.tasks.length, 0);
  const completedTasks = activeChanges.reduce((total, change) => total + change.tasks.filter((task) => task.completed).length, 0);
  const taskPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const nextAction = derivePipelineNextAction({
    fixtureActive,
    selectedChange,
    selectedArchivedChangeId: selectedArchive?.changeId ?? null,
    decisions: snapshot.decisions,
    projection,
  });

  const selectChange = (changeId: string) => {
    setSelection(changeId);
    setCenterTab('work');
    setShowEvidence(false);
    setLaunchInstruction(null);
    setFlowMode(null);
  };

  /**
   * Traduce el intent ya resuelto por la derivación a un efecto de UI.
   *
   * No decide nada por su cuenta: si un intent llegó hasta acá, la función pura
   * ya determinó que corresponde en este estado.
   */
  const handleIntent = (intent: PipelineActionIntent) => {
    switch (intent.kind) {
      case 'open-propose-flow':
      case 'open-explore-flow':
        setFlowMode(intent.kind === 'open-propose-flow' ? 'propose' : 'explore');
        setLaunchInstruction(null);
        setCenterTab('work');
        break;
      case 'start-apply': {
        const task = selectedChange?.tasks.find((item) => item.id === intent.taskId);
        if (!task) break;
        setFlowMode(null);
        setLaunchInstruction(composeApplyInstruction(intent.changeId, task.id, task.text));
        setCenterTab('work');
        break;
      }
      case 'start-archive':
        setFlowMode(null);
        setLaunchInstruction(composeArchiveInstruction(intent.changeId));
        setCenterTab('work');
        break;
      case 'focus-decision':
        // El centro no duplica la decisión: lleva el foco al control real, que
        // vive en el panel de actividad.
        attentionRef.current?.focus();
        break;
      case 'view-activity':
        setCenterTab('activity');
        break;
      case 'view-evidence':
      case 'view-diff':
        setShowEvidence(true);
        break;
      case 'refresh-validation':
        onRefresh?.();
        break;
      case 'pause-after-task':
        onPauseAfterTask();
        break;
    }
  };

  // Una sesión nueva pasa a estar seleccionada mientras corre: si la persona
  // estaba mirando una sesión vieja, quedarse ahí escondería la que arranca.
  const liveSessionId = projection?.active === true ? projection.sessionId : null;
  const [lastLiveSessionId, setLastLiveSessionId] = useState<string | null>(null);
  if (liveSessionId !== lastLiveSessionId) {
    setLastLiveSessionId(liveSessionId);
    if (liveSessionId) setSelectedSessionId(liveSessionId);
  }

  // Selección del change recién creado, sólo cuando puede identificarse de forma
  // verificable: exactamente un identificador nuevo respecto de la lectura
  // anterior. Con cero o con varios no se adivina.
  const [previousChangeIds, setPreviousChangeIds] = useState<string[] | null>(null);
  const activeChangeIds = activeChanges.map((change) => change.changeId);
  const changeIdsDiffer = previousChangeIds === null
    || previousChangeIds.length !== activeChangeIds.length
    || activeChangeIds.some((id, index) => previousChangeIds[index] !== id);
  if (changeIdsDiffer) {
    setPreviousChangeIds(activeChangeIds);
    if (previousChangeIds !== null) {
      const added = activeChangeIds.filter((id) => !previousChangeIds.includes(id));
      // Exactamente uno: con cero o con varios no hay forma verificable de saber
      // cual corresponde a la sesion que acaba de cerrar, y se deja la seleccion
      // como estaba en vez de adivinar.
      if (added.length === 1) {
        setSelection(added[0]);
        setFlowMode(null);
        setLaunchInstruction(null);
      }
    }
  }

  return (
    <div
      className={styles.dashboard}
      data-left-open={leftOpen}
      data-right-open={rightOpen}
      style={{
        '--openspec-left-width': `${Math.max(320, Math.min(leftWidth, 400))}px`,
        '--openspec-right-width': `${Math.max(300, Math.min(rightWidth, 460))}px`,
      } as React.CSSProperties}
    >
      <header className={styles.summaryBar}>
        <h2 className={styles.brand}>OpenSpec</h2>
        <dl className={styles.summaryFacts}>
          <div><dd>{specifications.length}</dd><dt>{t('pipeline.openspec.summary.specifications')}</dt></div>
          <div><dd>{activeChanges.length}</dd><dt>{t('pipeline.openspec.summary.active')}</dt></div>
          <div><dd>{archivedChanges.length}</dd><dt>{t('pipeline.openspec.summary.completed')}</dt></div>
          <div><dd>{taskPercent}%</dd><dt>{t('pipeline.openspec.summary.tasks')}</dt></div>
        </dl>
        <div className={styles.repoHealth} data-clean={workingTreeClean}>
          <span className={styles.healthDot} aria-hidden="true" />
          <div>
            <strong>{workingTreeClean ? t('pipeline.openspec.repo.clean') : t('pipeline.openspec.repo.changed')}</strong>
            <span>{currentBranch || t('pipeline.openspec.repo.branchUnknown')}</span>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        {leftOpen && (
          <aside className={styles.navigator} aria-label={t('pipeline.openspec.navigator.label')}>
            <div className={styles.resizeHandleLeft} role="separator" aria-orientation="vertical" title={t('pipeline.openspec.resize.left')} onMouseDown={onResizeLeft} />
            <section className={styles.navSection} data-tone="active">
              <h3>{t('pipeline.openspec.active.title')} <span>{activeChanges.length}</span></h3>
              {activeChanges.length === 0 ? (
                <p className={styles.navEmpty}>{t('pipeline.openspec.active.empty')}</p>
              ) : activeChanges.map((change) => {
                const itemProgress = taskProgress(change);
                const isSelected = change.changeId === selectedId;
                return (
                  <button
                    type="button"
                    key={change.changeId}
                    className={styles.activeChange}
                    data-selected={isSelected}
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
                    <span className={styles.changeIntent}>{change.intent ?? t('pipeline.openspec.intentUnknown')}</span>
                    <span className={styles.artifactList}>
                      <span><FileText size={13} /> proposal.md <em data-done={change.proposalExists}>{change.proposalExists ? t('pipeline.openspec.complete') : t('pipeline.openspec.pending')}</em></span>
                      <span><FileText size={13} /> design.md <em data-done={change.designExists}>{change.designExists ? t('pipeline.openspec.complete') : t('pipeline.openspec.pending')}</em></span>
                      <span><FolderOpen size={13} /> specs/ <em data-done={change.specsCount > 0}>{change.specsCount > 0 ? t('pipeline.openspec.complete') : t('pipeline.openspec.pending')}</em></span>
                      <span><FileText size={13} /> tasks.md <em data-done={itemProgress.completed === itemProgress.total && itemProgress.total > 0}>{itemProgress.completed === itemProgress.total && itemProgress.total > 0 ? t('pipeline.openspec.complete') : t('pipeline.openspec.inProgress')}</em></span>
                    </span>
                  </button>
                );
              })}
            </section>

            <section className={styles.navSection} data-tone="completed">
              <h3>{t('pipeline.openspec.completed.title')} <span>{archivedChanges.length}</span></h3>
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
            </section>

            <section className={styles.navSection} data-tone="specifications">
              <h3>{t('pipeline.openspec.specifications.title')} <span>{specifications.length}</span></h3>
              <div className={styles.specList}>
                {specifications.map((specification) => (
                  <div key={specification.specificationId} title={specification.sourceRef}>
                    <BookOpen size={11} />
                    <strong>{specification.specificationId}</strong>
                    <span>{specification.requirements === null ? '—' : t('pipeline.openspec.requirements', { count: specification.requirements })}</span>
                  </div>
                ))}
                {specifications.length === 0 && <p className={styles.navEmpty}>{t('pipeline.openspec.specifications.empty')}</p>}
              </div>
            </section>
          </aside>
        )}

        <main className={styles.center}>
          {selectedChange ? (
            <>
              <header className={styles.changeHeader}>
                <div className={styles.changeTitle}>
                  <h3>{t('pipeline.openspec.change.active')}: <strong>{selectedChange.changeId}</strong></h3>
                  <p><span>{t('pipeline.openspec.intent')}:</span> {selectedChange.intent ?? t('pipeline.openspec.intentUnknown')}</p>
                </div>
                <ol className={styles.lifecycle} aria-label={t('pipeline.openspec.lifecycle.label')}>
                  {stages.map((stage, index) => (
                    <li key={stage.key} data-done={stage.done} data-current={stage.current}>
                      <span>{stage.done ? <Check size={14} /> : index + 1}</span>
                      <em>{t(`pipeline.openspec.lifecycle.${stage.key}`)}</em>
                    </li>
                  ))}
                </ol>
              </header>

              <PipelineNextStepGuide action={nextAction} onAct={handleIntent} executionBlocked={fixtureActive} />

              <div className={styles.tabs} role="tablist" aria-label={t('pipeline.openspec.tabs.label')}>
                <button type="button" role="tab" aria-selected={centerTab === 'work'} onClick={() => setCenterTab('work')}>{t('pipeline.openspec.tabs.work')}</button>
                <button type="button" role="tab" aria-selected={centerTab === 'activity'} onClick={() => setCenterTab('activity')}>{t('pipeline.openspec.tabs.activity')}</button>
              </div>

              {centerTab === 'work' ? (
                <div className={styles.workArea}>
                  <h4>{t('pipeline.openspec.tasks.title')}</h4>
                  <ol className={styles.taskList}>
                    {selectedChange.tasks.map((task) => {
                      const current = task.id === nextTask?.id;
                      return (
                        <li key={task.id} data-completed={task.completed} data-current={current}>
                          <span className={styles.taskStatus}>{task.completed ? <Check size={14} /> : <Circle size={14} />}</span>
                          <strong>{task.id}</strong>
                          <span>{task.text}</span>
                          {current && runtimeActive && <em>{t('pipeline.openspec.task.running')}</em>}
                          {current && (
                            <div className={styles.taskDetail}>
                              <dl>
                                <div><dt>{t('pipeline.openspec.task.agent')}</dt><dd>{runningName}</dd></div>
                                <div><dt>{t('pipeline.openspec.task.source')}</dt><dd>{task.sourceRef}</dd></div>
                                <div><dt>{t('pipeline.openspec.task.progress')}</dt><dd>{t('pipeline.openspec.progress', { completed: progress.completed, total: progress.total })}</dd></div>
                                <div><dt>{t('pipeline.openspec.task.validation')}</dt><dd>{t(`pipeline.openspec.validation.${selectedChange.validation}`)}</dd></div>
                              </dl>
                            </div>
                          )}
                        </li>
                      );
                    })}
                    {selectedChange.tasks.length === 0 && <li className={styles.taskEmpty}>{t('pipeline.openspec.tasks.empty')}</li>}
                  </ol>

                  {/* La guía es dueña del CTA del momento. Acá sólo queda la
                      evidencia, que es consulta permanente y no un paso. */}
                  <div className={styles.actions}>
                    <button type="button" className={styles.secondaryAction} disabled={(snapshot.diffs?.length ?? 0) === 0} onClick={() => setShowEvidence((value) => !value)}>
                      <Code2 size={14} /> {t('pipeline.openspec.actions.diff')}
                    </button>
                  </div>

                  {launchInstruction && (
                    <div className={styles.launcherPanel}>
                      <PipelineRuntimeLauncher
                        key={`${selectedChange.changeId}:${nextTask?.id ?? 'archive'}`}
                        repoPath={repoPath}
                        projection={projection}
                        initialInstruction={launchInstruction}
                        changeId={selectedChange.changeId}
                        taskId={nextTask?.id ?? null}
                        blockedByFixture={fixtureActive}
                        startLabelKey={nextTask ? 'pipeline.launcher.startApply' : 'pipeline.launcher.startArchive'}
                        onStarted={() => setCenterTab('activity')}
                      />
                    </div>
                  )}
                  {showEvidence && <div className={styles.evidencePanel}><PipelineDetails snapshot={snapshot} /></div>}
                </div>
              ) : (
                <div className={styles.fullActivity}>
                  <ActivityFeed
                    entries={visibleActivity}
                    reasoningAvailable={selectedReasoningAvailable}
                    runtimeAttached={selectedSession !== null || projection !== null}
                    agentRuntimes={Object.fromEntries(snapshot.agents.map((agent) => [agent.agentId, agent.runtime]))}
                  />
                </div>
              )}
            </>
          ) : selectedArchive ? (
            <section className={styles.completedSummary}>
              <CheckCircle2 size={38} />
              <p>{t('pipeline.openspec.change.completed')}</p>
              <h3>{selectedArchive.changeId}</h3>
              <span>{selectedArchive.archivedAt ?? t('pipeline.openspec.dateUnknown')}</span>
              <dl>
                <div><dt>{t('pipeline.openspec.completed.location')}</dt><dd>{selectedArchive.sourceRef}</dd></div>
                <div><dt>{t('pipeline.openspec.completed.specsUpdated')}</dt><dd>{t('pipeline.openspec.completed.preserved')}</dd></div>
                <div><dt>{t('pipeline.openspec.completed.activity')}</dt><dd>{t('pipeline.openspec.completed.preserved')}</dd></div>
              </dl>
              <PipelineNextStepGuide action={nextAction} onAct={handleIntent} executionBlocked={fixtureActive} />
              {flowMode && (
                <PipelineNewChangeFlow
                  repoPath={repoPath}
                  projection={projection}
                  initialMode={flowMode}
                  blockedByFixture={fixtureActive}
                  onStarted={() => setCenterTab('activity')}
                />
              )}
            </section>
          ) : (
            <section className={styles.noActiveChange}>
              <BookOpen size={34} />
              <h3>{t('pipeline.openspec.noActive.title')}</h3>
              <PipelineNextStepGuide action={nextAction} onAct={handleIntent} executionBlocked={fixtureActive} />
              {flowMode && (
                <PipelineNewChangeFlow
                  repoPath={repoPath}
                  projection={projection}
                  initialMode={flowMode}
                  blockedByFixture={fixtureActive}
                  onStarted={() => setCenterTab('activity')}
                />
              )}
            </section>
          )}

          <footer className={styles.evidenceStrip}>
            <div data-status={selectedChange?.validation ?? 'unknown'}><ShieldCheck size={18} /><span><strong>{t('pipeline.openspec.evidence.validation')}</strong><em>{selectedChange ? t(`pipeline.openspec.validation.${selectedChange.validation}`) : t('pipeline.openspec.notApplicable')}</em></span></div>
            <div><GitBranch size={18} /><span><strong>{t('pipeline.openspec.evidence.branch')}</strong><em>{currentBranch || t('pipeline.openspec.repo.branchUnknown')}</em></span></div>
            <div data-status={workingTreeClean ? 'passed' : 'failed'}><CheckCircle2 size={18} /><span><strong>{t('pipeline.openspec.evidence.workingTree')}</strong><em>{workingTreeClean ? t('pipeline.openspec.repo.cleanShort') : t('pipeline.openspec.repo.changedShort')}</em></span></div>
          </footer>
        </main>

        {rightOpen && (
          <aside className={styles.activityRail} aria-label={t('pipeline.openspec.activity.title')}>
            <div className={styles.resizeHandleRight} role="separator" aria-orientation="vertical" title={t('pipeline.openspec.resize.right')} onMouseDown={onResizeRight} />
            <h3><Activity size={14} /> {t('pipeline.openspec.activity.title')}</h3>
            <section className={styles.liveActivity}>
              <header>
                <span className={styles.sessionIdentity}>
                  <strong>{selectedSession || visibleActivity.length > 0 ? runningName : t('pipeline.openspec.activity.noSession')}</strong>
                  <span className={styles.liveDot} data-active={selectedSession?.active || undefined} />
                  <em>{t(`pipeline.openspec.activity.status.${sessionStatusKey}`)}</em>
                </span>
                {runtimeSessions.length > 1 && (
                  <select
                    className={styles.sessionSelect}
                    aria-label={t('pipeline.openspec.activity.sessionPicker')}
                    value={effectiveSessionId ?? ''}
                    onChange={(event) => setSelectedSessionId(event.target.value)}
                  >
                    {runtimeSessions.map((session) => (
                      <option key={session.sessionId} value={session.sessionId}>{formatSessionOption(session)}</option>
                    ))}
                  </select>
                )}
              </header>
              {selectedSession && (
                <p className={styles.sessionContext}>
                  {[selectedSession.changeId, selectedSession.taskId].filter(Boolean).join(' · ') || t('pipeline.openspec.activity.noChange')}
                </p>
              )}
              {activityGroups.length === 0 ? (
                <p className={styles.railEmpty}>{selectedSession ? t('pipeline.activity.empty') : t('pipeline.activity.noRuntime')}</p>
              ) : (
                <ol>
                  {activityGroups.slice(-12).map((entry) => {
                    const Icon = ACTIVITY_ICONS[entry.channel];
                    const localized = ['session.started', 'session.completed', 'session.failed', 'session.interrupted'].includes(entry.text);
                    const gitEvidence = /^git\.changed files=(\d+) additions=(\d+|unknown) deletions=(\d+|unknown)$/.exec(entry.text);
                    const validationEvidence = /^openspec\.validation\.(passed|failed|unknown)$/.exec(entry.text);
                    const displayText = gitEvidence
                      ? t('pipeline.openspec.activity.event.gitChanged', {
                        files: gitEvidence[1],
                        additions: gitEvidence[2] === 'unknown' ? '—' : gitEvidence[2],
                        deletions: gitEvidence[3] === 'unknown' ? '—' : gitEvidence[3],
                      })
                      : validationEvidence
                        ? t(`pipeline.openspec.activity.event.validation.${validationEvidence[1]}`)
                        : localized
                          ? t(`pipeline.openspec.activity.event.${entry.text}`)
                          : entry.text;
                    return (
                      <li key={entry.key} data-channel={entry.channel}>
                        <time>{formatTime(entry.at)}</time>
                        <span className={styles.activityIcon}><Icon size={12} /></span>
                        <div><strong>{t(`pipeline.channel.${entry.channel}`)}</strong><p>{displayText}</p></div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
            <section
              className={styles.attention}
              data-needed={snapshot.decisions.length > 0}
              ref={attentionRef}
              tabIndex={-1}
              aria-label={t('pipeline.openspec.attention.title')}
            >
              <h4>{t('pipeline.openspec.attention.title')}</h4>
              <DecisionInbox decisions={snapshot.decisions} onRespondDecision={onRespondDecision} />
            </section>
            <footer className={styles.railMeta}>
              <span>{totalRequirements} {t('pipeline.openspec.summary.requirements')}</span>
              <span>{openSpec?.reports.length ?? 0} {t('pipeline.openspec.summary.reports')}</span>
            </footer>
          </aside>
        )}
      </div>
    </div>
  );
}
