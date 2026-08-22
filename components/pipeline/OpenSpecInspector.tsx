'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BrainCircuit, CheckCircle2, FileCode2, GitBranch, MessageSquareText, ShieldCheck, Wrench } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { useGitStore, type GitFile } from '@/lib/git-store';
import { usePipelineStore } from '@/lib/pipeline-store';
import type { OpenSpecEngineStatus, OpenSpecRegistryCheck, OpenSpecUpdatePlan, RuntimeProjection } from '@/types/pipeline';
import { CommitDraftLog } from './CommitDraftLog';
import { DecisionInbox } from './DecisionInbox';
import { OpenSpecEngineCard } from './OpenSpecEngineCard';
import { OpenSpecToolList } from './OpenSpecReadiness';
import { groupActivity, resolveSessionStatusI18nKey, runtimeDisplayName, type ActivityChannel } from './pipeline-domain';
import type { PipelineSnapshot } from './pipeline-view-state';
import styles from './OpenSpecDashboard.module.css';

const ACTIVITY_ICONS: Record<ActivityChannel, React.ComponentType<{ size?: number }>> = {
  narrative: MessageSquareText,
  reasoning: BrainCircuit,
  tool: Wrench,
  file: FileCode2,
  system: CheckCircle2,
};

function formatTime(value: string | null): string {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function formatSessionMoment(startedAt: string): string {
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return startedAt;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
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

function FileStatusBadge({ path, files }: { path: string; files: GitFile[] }) {
  const t = useT();
  const status = files.find((file) => file.path === path)?.status ?? 'modified';
  const label = t(`pipeline.openspec.prepare.state.${status}`);
  return (
    <span className={styles.fileStatus} data-status={status}>{label}</span>
  );
}

export type OpenSpecInspectorProps = {
  snapshot?: PipelineSnapshot | null;
  repoPath?: string | null;
  currentBranch?: string;
  workingTreeClean?: boolean;
  projection?: RuntimeProjection | null;
  runtimeHistory?: RuntimeProjection[];
  prepareOpen?: boolean;
  railTab?: 'activity' | 'tools';
  onSetRailTab?: (tab: 'activity' | 'tools') => void;
  onPauseAfterTask?: () => void;
  onRespondDecision?: (decisionId: string, optionId: string) => void;
  onOpenReview?: () => void;
  isReviewOpen?: boolean;
  aiNotice?: any;
};

export function OpenSpecInspector({
  snapshot: propSnapshot,
  repoPath: propRepoPath,
  currentBranch = '',
  workingTreeClean = true,
  projection: propProjection,
  runtimeHistory: propRuntimeHistory,
  prepareOpen: propPrepareOpen,
  railTab: propRailTab,
  onSetRailTab,
  onPauseAfterTask = () => undefined,
  onRespondDecision = () => undefined,
  onOpenReview,
  isReviewOpen = false,
  aiNotice: propAiNotice,
}: OpenSpecInspectorProps) {
  const t = useT();
  const storeSnapshot = usePipelineStore((s) => s.snapshot);
  const storeProjection = usePipelineStore((s) => s.projection);
  const storeHistory = usePipelineStore((s) => s.runtimeHistory);
  const storeSelectedId = usePipelineStore((s) => s.selectedChangeId);
  const storePrepareOpen = usePipelineStore((s) => s.prepareOpen);
  const storeRailTab = usePipelineStore((s) => s.railTab);
  const storeSetRailTab = usePipelineStore((s) => s.setRailTab);
  const storeAiNotice = usePipelineStore((s) => s.aiNotice);

  const gitStoreRepoPath = useGitStore((s) => s.repoPath);
  const modifiedFiles = useGitStore((s) => s.modifiedFiles);

  const snapshot = propSnapshot ?? storeSnapshot;
  const repoPath = propRepoPath ?? gitStoreRepoPath;
  const projection = propProjection !== undefined ? propProjection : storeProjection;
  const runtimeHistory = propRuntimeHistory !== undefined ? propRuntimeHistory : storeHistory;
  const prepareOpen = propPrepareOpen !== undefined ? propPrepareOpen : storePrepareOpen;
  const railTab = propRailTab ?? storeRailTab;
  const aiNotice = propAiNotice ?? storeAiNotice;

  const setRailTab = (tab: 'activity' | 'tools') => {
    if (onSetRailTab) onSetRailTab(tab);
    storeSetRailTab(tab);
  };

  const openSpec = snapshot?.openSpec;
  const openChangeId = storeSelectedId ?? openSpec?.selectedChangeId ?? null;
  const stagedFiles = useMemo(() => modifiedFiles.filter((f) => f.staged), [modifiedFiles]);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const attentionRef = useRef<HTMLElement | null>(null);

  // OpenSpec engine and tools state
  const [engineStatus, setEngineStatus] = useState<OpenSpecEngineStatus | null>(null);
  const [engineLoading, setEngineLoading] = useState(false);
  const [registryCheck, setRegistryCheck] = useState<OpenSpecRegistryCheck | null>(null);
  const [initBusy, setInitBusy] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initNeedsTool, setInitNeedsTool] = useState(false);

  useEffect(() => {
    if (!repoPath || typeof window === 'undefined' || !window.api?.pipelineOpenSpec?.getEngineStatus) {
      setEngineStatus(null);
      return;
    }
    let cancelled = false;
    setEngineLoading(true);
    window.api.pipelineOpenSpec.getEngineStatus(repoPath)
      .then((status) => {
        if (!cancelled) setEngineStatus(status);
      })
      .catch(() => {
        if (!cancelled) setEngineStatus(null);
      })
      .finally(() => {
        if (!cancelled) setEngineLoading(false);
      });
    return () => { cancelled = true; };
  }, [repoPath]);

  const effectiveEngineStatus = useMemo<OpenSpecEngineStatus | null>(() => {
    if (!engineStatus) return null;
    if (!registryCheck) return engineStatus;
    return {
      ...engineStatus,
      latestAvailable: registryCheck,
    };
  }, [engineStatus, registryCheck]);

  const openSpecTools = snapshot?.openSpec?.openSpecTools ?? [];
  const openSpecPresent = snapshot?.openSpec?.openSpecPresent ?? (engineStatus?.repoState === 'initialized');
  const pendingToolCount = (engineStatus?.cli.diagnostics.length ?? 0) + (engineStatus?.integrationState === 'outdated' ? 1 : 0);

  const runtimeSessions = useMemo(() => {
    const list: RuntimeProjection[] = [];
    if (projection) list.push(projection);
    for (const h of runtimeHistory) {
      if (!list.some((s) => s.sessionId === h.sessionId)) list.push(h);
    }
    return list;
  }, [projection, runtimeHistory]);

  const filteredSessions = useMemo(() => {
    if (openChangeId === null) return runtimeSessions;
    return runtimeSessions.filter((s) => s.changeId === openChangeId);
  }, [runtimeSessions, openChangeId]);

  const effectiveSessionId = selectedSessionId ?? filteredSessions[0]?.sessionId ?? null;
  const selectedSession = runtimeSessions.find((s) => s.sessionId === effectiveSessionId) ?? filteredSessions[0] ?? null;

  const runningName = selectedSession ? (runtimeDisplayName(selectedSession.runtime) ?? selectedSession.runtime) : null;
  const sessionStatusKey = selectedSession?.active ? 'running' : (selectedSession?.outcome ?? 'idle');
  const visibleActivity = useMemo(() => selectedSession?.activity ?? snapshot?.activity ?? [], [selectedSession, snapshot]);
  const activityGroups = useMemo(() => groupActivity(visibleActivity), [visibleActivity]);

  const totalRequirements = useMemo(() => {
    return (openSpec?.specifications ?? []).reduce((acc, s) => acc + (s.requirements ?? 0), 0);
  }, [openSpec]);

  const runOpenSpecInit = (selectedToolIds?: string[]) => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineInitOpenSpec || initBusy || !repoPath) return;
    setInitBusy(true);
    setInitError(null);
    void api.pipelineInitOpenSpec(repoPath, selectedToolIds)
      .then((result: any) => {
        if (result?.success) {
          setInitNeedsTool(false);
          return;
        }
        if (result?.needsTool) {
          setInitNeedsTool(true);
          return;
        }
        setInitError(result?.error || 'unknown');
      })
      .catch((error: unknown) => setInitError(error instanceof Error ? error.message : 'unknown'))
      .finally(() => setInitBusy(false));
  };

  if (prepareOpen) {
    return (
      <aside className={`${styles.activityRail} ${styles.openspecScope}`} aria-label={t('pipeline.openspec.prepare.stagedTitle')}>
        <h3><GitBranch size={14} /> {t('pipeline.openspec.prepare.stagedTitle')}</h3>
        {stagedFiles.length === 0 ? (
          <p className={styles.railEmpty}>{t('pipeline.openspec.prepare.stagedEmpty')}</p>
        ) : (
          <ul className={styles.stagedList}>
            {stagedFiles.map((file) => (
              <li key={file.path}>
                <FileStatusBadge path={file.path} files={modifiedFiles} />
                <span>{file.path}</span>
              </li>
            ))}
          </ul>
        )}
        <CommitDraftLog notice={aiNotice} />
      </aside>
    );
  }

  return (
    <aside className={`${styles.activityRail} ${styles.openspecScope}`} aria-label={t('pipeline.openspec.activity.title')}>
      <div className={styles.railTabs} role="tablist" aria-label={t('pipeline.openspec.rail.label')}>
        <button type="button" role="tab" aria-selected={railTab === 'activity'} onClick={() => setRailTab('activity')}>
          <Activity size={13} aria-hidden="true" /> {t('pipeline.openspec.activity.title')}
        </button>
        <button type="button" role="tab" aria-selected={railTab === 'tools'} onClick={() => setRailTab('tools')}>
          <Wrench size={13} aria-hidden="true" /> {t('pipeline.openspec.rail.tools')}
          {pendingToolCount > 0 && <em className={styles.railTabBadge}>{pendingToolCount}</em>}
        </button>
      </div>

      {railTab === 'tools' ? (
        <div className={styles.toolsRailContent}>
          <OpenSpecEngineCard
            status={effectiveEngineStatus}
            isLoading={engineLoading}
            onOpenToolsTab={() => setRailTab('tools')}
            onOpenReview={onOpenReview}
            isReviewOpen={isReviewOpen}
          />
          <OpenSpecToolList
            present={openSpecPresent}
            tools={openSpecTools}
            busy={initBusy}
            error={initError}
            needsTool={initNeedsTool}
            onInitialize={() => runOpenSpecInit()}
            onInitializeWith={(toolIds) => runOpenSpecInit(toolIds)}
          />
        </div>
      ) : (
        <>
          {openChangeId === null && (
            <p className={styles.railScope}>{t('pipeline.openspec.activity.repoScope')}</p>
          )}
          <section className={styles.liveActivity}>
            <header>
              <span className={styles.sessionIdentity}>
                <strong>{selectedSession || visibleActivity.length > 0 ? runningName : t('pipeline.openspec.activity.noSession')}</strong>
                <span className={styles.liveDot} data-active={selectedSession?.active || undefined} />
                <em>{t(resolveSessionStatusI18nKey(sessionStatusKey))}</em>
                {selectedSession && (
                  <em className={styles.sessionRanAt}>
                    {t('pipeline.openspec.activity.ranAt', { at: formatSessionMoment(selectedSession.startedAt) })}
                  </em>
                )}
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
              <p className={styles.railEmpty}>
                {selectedSession
                  ? t('pipeline.activity.empty')
                  : openChangeId !== null
                    ? t('pipeline.openspec.activity.noneForChange')
                    : t('pipeline.activity.noRuntime')}
              </p>
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
            data-needed={(snapshot?.decisions?.length ?? 0) > 0}
            ref={attentionRef}
            tabIndex={-1}
            aria-label={t('pipeline.openspec.attention.title')}
          >
            <h4>{t('pipeline.openspec.attention.title')}</h4>
            <DecisionInbox decisions={snapshot?.decisions ?? []} onRespondDecision={onRespondDecision} />
          </section>
        </>
      )}
      <footer className={styles.railMeta}>
        <span>{totalRequirements} {t('pipeline.openspec.summary.requirements')}</span>
        <span>{openSpec?.reports?.length ?? 0} {t('pipeline.openspec.summary.reports')}</span>
      </footer>
    </aside>
  );
}
