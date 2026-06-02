'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Undo, Redo, Download, Upload, GitBranch, Archive, Terminal, Search,
  Settings, HelpCircle, Folder, Cloud, Tag, Layers,
  ChevronRight, FileText, Trash2, Zap, AlertCircle, FolderOpen, Plus, X,
  ArrowLeft, RotateCcw, Github, LogOut, Minus,
  Sparkles, Copy, Lock, Globe, Loader2, UserCircle2,
  GitMerge, TreePine, ArrowUp, ArrowDown, ChevronDown, Check,
  Type, Filter, Monitor, ExternalLink, FileDiff, Maximize2,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, WrapText, AlignLeft,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import pkg from '../package.json';
import {
  DEFAULT_SHORTCUTS,
  defaultShortcutsMap,
  eventToShortcut,
  formatShortcut,
} from '@/lib/shortcuts';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { CommitContextMenu, BranchContextMenu, FileContextMenu, RemoteBranchContextMenu } from '@/components/ContextMenus';
import { StatusBadge, FlowStep } from '@/components/HelpModal';
import { RepoStartPanel, type RepoStartMode } from '@/components/RepoModals';
import { ChangelogPreview } from '@/components/ChangelogPreview';
import { useGitStore, Commit, GitFile, type RepoState, type FontSize } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useRepoLoader } from '@/hooks/use-repo-loader';
import { useAutoFetch } from '@/hooks/use-auto-fetch';
import { DiffViewer } from '@/components/DiffViewer';
import { CommitGraph, colorForBranch } from '@/components/CommitGraph';
import { ChronometricGraph } from '@/components/ChronometricGraph';
import { TemporalAgentSettings } from '@/components/TemporalAgentSettings';
import type { SpeculativeBranch } from '@/lib/speculative-projection';

// Phase 5 test data — 3 mock speculative branches to validate the overlay
// without hitting the AI. The real flow swaps these for PredictionResult.branches.
const MOCK_SPECULATIVE: SpeculativeBranch[] = [
  {
    id: 'mock-1',
    message: 'Extract IPC layer into a typed contract module',
    rationale:
      'Los commits recientes tocan electron/main.ts una y otra vez para sumar handlers. Un contrato IPC tipado y compartido cortaría ese churn y reduciría el riesgo en el bridge del preload.',
    type: 'improvement',
    confidence: 0.82,
  },
  {
    id: 'mock-2',
    message: 'Add a streaming prediction mode for large repos',
    rationale:
      'El armado de contexto ya lee hasta 40 commits; transmitir la salida del modelo mantendría la UI fluida en historiales grandes.',
    type: 'breakthrough',
    confidence: 0.66,
  },
  {
    id: 'mock-3',
    message: 'Surface forecasting-doctrine confidence inline on the diagonal',
    rationale:
      'La doctrina ata la confianza a la entropía del repo. Mostrar el "por qué 0.7 y no 0.9" junto a cada rama refuerza la calibración honesta.',
    type: 'trend',
    confidence: 0.74,
  },
];

// Flip to true to debug with the hardcoded mock branches instead of the real,
// persisted prediction. false = use the real per-repo PredictionResult (Capa 1).
const USE_MOCK_SPECULATIVE = false;
import { useT, tNow } from '@/hooks/use-translation';
import { LANGS, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { parseChangelog } from '@/lib/changelog';
import type { PullRequestDiffData, PullRequestEntry } from '@/types/electron';

const GRAPH_COLUMN_DEFAULTS = {
  refs: 260,
  graph: 88,
  date: 80,
  hash: 64,
};

const GRAPH_COLUMN_LIMITS = {
  refs: { min: 160, max: 520 },
  graph: { min: 56, max: 260 },
  date: { min: 64, max: 150 },
  hash: { min: 56, max: 120 },
};

const FLOATING_PANEL_INSET = 12;
const GRAPH_SAFE_GAP = 12;

type GraphColumnKey = keyof typeof GRAPH_COLUMN_DEFAULTS;

type PullDecisionToast = {
  source: 'push' | 'pull';
  branch: string;
  ahead: number;
  behind: number;
  mode: 'behind' | 'diverged';
};

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

type UpdateInfo = {
  version: string;
  currentVersion: string;
  releaseDate?: string;
};

const MOCK_UPDATE_ENABLED = process.env.NEXT_PUBLIC_MOCK_UPDATE === '1';
const MOCK_UPDATE_VERSION = '1.3.1-dev';

const FONT_SIZE_OPTIONS: Array<{ key: FontSize; px: number }> = [
  { key: 'compact', px: 15 },
  { key: 'normal', px: 16 },
  { key: 'large', px: 17 },
];

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return tNow('graph.justNow');
  if (diffMin < 60) return tNow('graph.minutesAgo', { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return tNow('graph.hoursAgo', { n: diffH });
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return tNow('graph.daysAgo', { n: diffD });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
}

/**
 * Derive 2-letter initials from a GitHub user object, falling back through
 * name → login → email. Always returns at most 2 chars.
 */
function userInitials(user: { name?: string | null; login?: string; email?: string | null }): string {
  if (user.name && user.name.trim()) return initials(user.name.trim());
  if (user.login) return user.login.slice(0, 2).toUpperCase();
  if (user.email) return user.email.split('@')[0].slice(0, 2).toUpperCase();
  return '?';
}

function isSafeDirectoryError(message: string): boolean {
  return /detected dubious ownership|safe\.directory/i.test(message);
}

function safeDirectoryPathFromError(message: string): string | null {
  const repoMatch = message.match(/repository at ['"]([^'"]+)['"]/i);
  if (repoMatch?.[1]) return repoMatch[1].trim();

  const commandMatch = message.match(/safe\.directory\s+(.+?)(?:\r?\n|$)/i);
  if (!commandMatch?.[1]) return null;

  return commandMatch[1].trim().replace(/^['"`]+|['"`]+$/g, '').replace(/[.)]+$/, '');
}

function RepoTabs({
  repos,
  activeIdx,
  onSelect,
  onClose,
  onOpen,
  onReorder,
}: {
  repos: RepoState[];
  activeIdx: number;
  onSelect: (idx: number) => void | Promise<void>;
  onClose: (idx: number) => void | Promise<void>;
  onOpen: () => void | Promise<void>;
  onReorder: (newOrder: RepoState[]) => void;
}) {
  const t = useT();
  const isDraggingRef = useRef(false);
  if (repos.length === 0) return null;

  return (
    <div className="app-titlebar h-10 rounded-t-2xl bg-transparent border-b border-text-primary/10 flex items-stretch shrink-0 overflow-hidden gap-1">
      <div className="min-w-0 flex-1 flex items-end gap-1 pl-2 pt-1.5 pb-1 overflow-x-auto overflow-y-hidden">
        <div className="app-titlebar-control h-7 mb-0 mr-2 flex items-center gap-2 shrink-0 px-2 select-none">
          <img
            src="/gitcron-icon.png"
            alt="GitCron"
            data-keep-color
            className="w-4 h-4 rounded-sm"
          />
          <span className="text-sm font-bold text-primary tracking-tight">GitCron</span>
        </div>
        <Reorder.Group
          axis="x"
          values={repos}
          onReorder={onReorder}
          className="flex items-end gap-1 min-w-0"
        >
          {repos.map((repo, idx) => {
            const isActive = idx === activeIdx;
            return (
              <Reorder.Item
                key={repo.path}
                value={repo}
                onDragStart={() => { isDraggingRef.current = true; }}
                onDragEnd={() => {
                  setTimeout(() => {
                    isDraggingRef.current = false;
                  }, 50);
                }}
                className={cn(
                  'app-titlebar-control group h-7 min-w-0 max-w-52 rounded-md flex items-center border transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] cursor-grab active:cursor-grabbing',
                  isActive
                    ? 'bg-text-primary/10 border-secondary/25 text-text-primary shadow-[0_0_18px_rgba(163,241,133,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'bg-text-primary/[0.035] border-text-primary/10 text-text-secondary hover:text-text-primary hover:bg-text-primary/[0.07] hover:border-text-primary/20',
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!isDraggingRef.current) {
                      onSelect(idx);
                    }
                  }}
                  title={t('repoTabs.switchTo', { repo: repo.name })}
                  className="min-w-0 flex-1 h-full px-2.5 flex items-center gap-2 text-left"
                >
                  {repo.isLoading ? (
                     <Loader2 size={10} className="shrink-0 animate-spin text-secondary" />
                  ) : (
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        isActive ? 'bg-secondary shadow-[0_0_10px_rgba(var(--color-secondary-rgb),0.5)]' : 'bg-border-subtle',
                      )}
                    />
                  )}
                  <span className="truncate text-xs font-semibold">{repo.name}</span>
                  <span className="text-[10px] text-text-secondary/70 font-mono truncate max-w-20 hidden md:block">
                    {repo.currentBranch || '-'}
                  </span>
                </button>
                <button
                  type="button"
                  title={t('repoTabs.close', { repo: repo.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(idx);
                  }}
                  className="mr-1 p-0.5 rounded text-text-secondary/70 hover:text-error hover:bg-error/10 opacity-70 group-hover:opacity-100 transition"
                >
                  <X size={13} />
                </button>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
        <button
          type="button"
          onClick={onOpen}
          title={t('repoTabs.openAnother')}
          className="app-titlebar-control h-7 w-7 mb-0 rounded-md flex items-center justify-center text-text-secondary bg-text-primary/[0.025] hover:text-secondary hover:bg-text-primary/[0.07] border border-text-primary/15 hover:border-text-primary/25 transition-colors shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="app-titlebar-control h-10 self-stretch flex items-stretch shrink-0 pr-3 gap-1">
        <button
          type="button"
          aria-label="Minimizar"
          title="Minimizar"
          onClick={() => window.api?.windowMinimize()}
          className="h-7 w-10 my-1.5 rounded-md flex items-center justify-center text-text-secondary bg-text-primary/[0.035] hover:bg-text-primary/[0.09] hover:text-text-primary transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          aria-label="Maximizar o restaurar"
          title="Maximizar o restaurar"
          onClick={() => window.api?.windowToggleMaximize()}
          className="h-7 w-10 my-1.5 rounded-md flex items-center justify-center text-text-secondary bg-text-primary/[0.035] hover:bg-text-primary/[0.09] hover:text-text-primary transition-colors"
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          aria-label="Cerrar"
          title="Cerrar"
          onClick={() => window.api?.windowClose()}
          className="h-7 w-10 my-1.5 rounded-md flex items-center justify-center text-text-secondary bg-text-primary/[0.035] hover:bg-error/20 hover:text-[#ffdad6] transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

const AUTO_FETCH_INTERVALS = [5, 10, 30, 60] as const;

function AutoFetchSection({
  setAutoFetchPrefs,
}: {
  setAutoFetchPrefs: (enabled: boolean, intervalMinutes: number) => Promise<void> | void;
}) {
  const t = useT();
  const autoFetchEnabled = useGitStore((s) => s.autoFetchEnabled);
  const autoFetchIntervalMinutes = useGitStore((s) => s.autoFetchIntervalMinutes);
  const lastFetchTime = useGitStore((s) => s.lastFetchTime);

  const lastSyncLabel = lastFetchTime
    ? new Date(lastFetchTime).toLocaleTimeString()
    : t('settings.autoFetchNever');

  return (
    <section>
      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
        <RotateCcw size={12} /> {t('settings.autoFetch')}
      </h4>
      <p className="text-xs text-text-secondary mb-3">{t('settings.autoFetchDesc')}</p>
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setAutoFetchPrefs(!autoFetchEnabled, autoFetchIntervalMinutes)}
          className={cn(
            'px-3 py-2 rounded border text-sm flex items-center gap-2 transition-colors',
            autoFetchEnabled
              ? 'bg-secondary/15 border-secondary/50 text-secondary'
              : 'bg-bg-base/70 border-border-subtle/15 text-text-secondary hover:text-text-primary',
          )}
        >
          {autoFetchEnabled && <Check size={14} strokeWidth={3} />}
          <span className="font-medium">
            {autoFetchEnabled ? t('settings.autoFetchEnabled') : t('settings.autoFetchDisabled')}
          </span>
        </button>
        <span className="text-xs text-text-secondary/70 ml-2">
          {t('settings.autoFetchLastSync')}: {lastSyncLabel}
        </span>
      </div>
      <div className={cn('grid grid-cols-4 gap-2', !autoFetchEnabled && 'opacity-40 pointer-events-none')}>
        {AUTO_FETCH_INTERVALS.map((mins) => (
          <button
            key={mins}
            type="button"
            onClick={() => setAutoFetchPrefs(true, mins)}
            className={cn(
              'px-3 py-2 rounded border text-sm flex items-center justify-center gap-2 transition-colors',
              autoFetchIntervalMinutes === mins
                ? 'bg-secondary/15 border-secondary/50 text-secondary'
                : 'bg-bg-base/70 border-border-subtle/15 text-text-secondary hover:text-text-primary hover:border-border-subtle/30',
            )}
          >
            {mins} min
            {autoFetchIntervalMinutes === mins && <Check size={12} strokeWidth={3} />}
          </button>
        ))}
      </div>
    </section>
  );
}

function ShortcutsSection({
  rebindShortcut,
  resetShortcutsToDefaults,
}: {
  rebindShortcut: (id: string, keys: string) => Promise<void> | void;
  resetShortcutsToDefaults: () => Promise<void> | void;
}) {
  const t = useT();
  const shortcuts = useGitStore((s) => s.shortcuts);
  const [editingId, setEditingId] = useState<string | null>(null);

  const defaults = useMemo(() => defaultShortcutsMap(), []);
  const merged: Record<string, string> = { ...defaults, ...(shortcuts ?? {}) };

  // Listen for keys while capturing
  useEffect(() => {
    if (!editingId) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setEditingId(null);
        return;
      }
      const combo = eventToShortcut(e);
      if (!combo) return; // ignore modifier-only press
      rebindShortcut(editingId, combo);
      setEditingId(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [editingId, rebindShortcut]);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Type size={12} /> {t('settings.shortcuts')}
        </h4>
        <button
          type="button"
          onClick={() => resetShortcutsToDefaults()}
          className="text-[10px] uppercase tracking-wider font-bold text-text-secondary hover:text-secondary transition-colors"
        >
          {t('settings.shortcutsReset')}
        </button>
      </div>
      <p className="text-xs text-text-secondary mb-3">{t('settings.shortcutsDesc')}</p>
      <div className="bg-bg-base/70 border border-border-subtle/15 rounded divide-y divide-border-subtle/15 max-h-[280px] overflow-y-auto">
        {DEFAULT_SHORTCUTS.map((s) => {
          const current = merged[s.id];
          const isEditing = editingId === s.id;
          return (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="text-text-secondary">{t(s.descriptionKey)}</span>
              <button
                type="button"
                onClick={() => setEditingId(isEditing ? null : s.id)}
                className={cn(
                  'px-2 py-1 rounded font-mono text-[10px] border transition-colors min-w-[100px] text-center',
                  isEditing
                    ? 'bg-secondary/15 border-secondary/50 text-secondary animate-pulse'
                    : 'bg-bg-base border-border-subtle/30 text-text-primary hover:border-secondary/40',
                )}
              >
                {isEditing ? t('settings.shortcutsCapture') : formatShortcut(current)}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OsNotificationsSection({
  setOsNotifications,
}: {
  setOsNotifications: (enabled: boolean) => Promise<void> | void;
}) {
  const t = useT();
  const osNotificationsEnabled = useGitStore((s) => s.osNotificationsEnabled);

  return (
    <section>
      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
        <AlertCircle size={12} /> {t('settings.osNotifications')}
      </h4>
      <p className="text-xs text-text-secondary mb-3">{t('settings.osNotificationsDesc')}</p>
      <button
        type="button"
        onClick={() => setOsNotifications(!osNotificationsEnabled)}
        className={cn(
          'px-3 py-2 rounded border text-sm flex items-center gap-2 transition-colors',
          osNotificationsEnabled
            ? 'bg-secondary/15 border-secondary/50 text-secondary'
            : 'bg-bg-base/70 border-border-subtle/15 text-text-secondary hover:text-text-primary',
        )}
      >
        {osNotificationsEnabled && <Check size={14} strokeWidth={3} />}
        <span className="font-medium">
          {osNotificationsEnabled ? t('settings.osNotificationsEnabled') : t('settings.osNotificationsDisabled')}
        </span>
      </button>
    </section>
  );
}

function FetchIndicator({ onClick }: { onClick: () => void | Promise<void> }) {
  const t = useT();
  const isFetchingRemote = useGitStore((s) => s.isFetchingRemote);
  const lastFetchTime = useGitStore((s) => s.lastFetchTime);
  const autoFetchEnabled = useGitStore((s) => s.autoFetchEnabled);
  const tooltip = isFetchingRemote
    ? t('autoFetch.fetching')
    : lastFetchTime
      ? `${t('autoFetch.lastSync')}: ${new Date(lastFetchTime).toLocaleTimeString()}`
      : autoFetchEnabled
        ? t('autoFetch.idle')
        : t('autoFetch.disabled');
  return (
    <button
      type="button"
      onClick={() => onClick()}
      title={tooltip}
      className={cn(
        'flex flex-col items-center justify-center p-1.5 rounded transition-colors group shrink-0',
        'hover:bg-border-subtle',
      )}
    >
      <div className={cn(
        'w-5 h-5 flex items-center justify-center',
        isFetchingRemote ? 'text-secondary' : 'text-text-secondary group-hover:text-secondary',
      )}>
        <RotateCcw size={16} className={cn(isFetchingRemote && 'animate-spin')} />
      </div>
    </button>
  );
}

function GraphColumnHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group w-0 self-stretch -my-2 shrink-0 cursor-col-resize relative overflow-visible"
      title="Arrastrar para redimensionar columna"
    >
      <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-border-subtle/20 group-hover:bg-secondary/45 group-active:bg-secondary/70 transition-colors" />
      <div className="absolute inset-y-0 -left-1.5 -right-1.5 bg-transparent group-hover:bg-secondary/35 group-active:bg-secondary/60 transition-colors" />
    </div>
  );
}

export default function GitCronPage() {
  const {
    openRepos, activeRepoIdx, setActiveRepoIdx,
    repoPath,
    currentBranch, branches, remoteBranches,
    commits, modifiedFiles, commitMessage, setCommitMessage,
    selectedCommit, setSelectedCommit, isLoading, error, setError, success, setSuccess,
    selectedFile, setSelectedFile, currentDiff, setCurrentDiff,
    stashes, tags, submodules,
    githubToken, githubUser,
    branchTracking, worktrees, pullRequests,
    setOpenRepos,
  } = useGitStore();

  const {
    resolveConflict,
    commitChanges, mergeBranch, revertCommit, stashChanges,
    discardFileChanges, stageFile, stageFiles, removeIndexLock,
    checkoutBranch, checkoutBranchSmart, createBranch, pushChanges, pullChanges,
    openTerminal, stashApply, stashDrop, stashClear,
    connectGitHub, disconnectGitHub, loginWithGitHubDevice, bootstrapGitHub,
    bootstrapPreferences, changeLanguage, changeFontSize, changeDefaultFolder, pickDefaultFolder,
    setAutoFetchPrefs, setOsNotifications, rebindShortcut, resetShortcutsToDefaults, changeTheme, changeEnableCronometric,
    addToGitignore, resetAll, stashFile, showInFolder, openInDefault,
    deleteFile, copyFilePath,
    mergeIntoCurrent, rebaseOnto, fastForwardBranch, amendLastCommit, cherryPickCommit, squashCommits,
    renameBranch, deleteBranch, deleteTag, pullSpecificBranch, pushSpecificBranch,
    pullWithDecision,
  } = useGitActions();

  const t = useT();
  const language = useGitStore((s) => s.language);
  const fontSize = useGitStore((s) => s.fontSize);
  const defaultFolder = useGitStore((s) => s.defaultFolder);
  const theme = useGitStore((s) => s.theme);
  const enableCronometric = useGitStore((s) => s.enableCronometric);
  const centauroExpanded = useGitStore((s) => s.centauroExpanded);
  const setCentauroExpanded = useGitStore((s) => s.setCentauroExpanded);
  const appFontSizePx = FONT_SIZE_OPTIONS.find((option) => option.key === fontSize)?.px ?? 15;

  const {
    openRepo, trustSafeDirectory, restoreLastRepo, closeRepo, loadAll, loadDiff, refreshLog,
    pickFolder, initRepo, cloneRepo, createGitHubRepo, listUserGitHubRepos,
  } = useRepoLoader();

  const graphShowAllBranches = useGitStore((s) => s.getActiveRepo()?.graphShowAllBranches ?? true);
  const rawGraphMode = useGitStore((s) => s.getActiveRepo()?.graphMode ?? 'classic');
  const updateActiveRepo = useGitStore((s) => s.updateActiveRepo);

  const { runFetchCycle } = useAutoFetch();

  const [activeView, setActiveView] = useState<'repository' | 'settings' | 'help' | 'profile'>('repository');
  const [selectedSettingsSection, setSelectedSettingsSection] = useState<string>('language');
  const [selectedHelpSection, setSelectedHelpSection] = useState<string>('whatis');
  const [showRepoChooser, setShowRepoChooser] = useState(false);
  const [repoStartMode, setRepoStartMode] = useState<RepoStartMode>('create');

  const [activeTab, setActiveTab] = useState('Graph');
  const [selectedPullRequest, setSelectedPullRequest] = useState<PullRequestEntry | null>(null);
  const [wordWrap, setWordWrap] = useState(false);

  // Temporal Agent — speculative branch overlay. Source is the real, persisted
  // per-repo prediction (Capa 1); flip USE_MOCK_SPECULATIVE to debug with the mock.
  const [showSpeculative, setShowSpeculative] = useState(false);
  // Raw unfiltered branches from disk or fresh prediction. Filtered via threshold below.
  const [rawSpeculativeBranches, setRawSpeculativeBranches] = useState<SpeculativeBranch[]>(
    USE_MOCK_SPECULATIVE ? MOCK_SPECULATIVE : [],
  );
  // Timestamp of the loaded/fresh prediction, shown next to the FUTUROS toggle.
  const [speculativeAt, setSpeculativeAt] = useState<string | null>(null);

  // Confidence threshold applied reactively. Updated from config load + Settings save.
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);

  // Derived: filtered branches. Recomputes whenever raw data or threshold changes.
  const speculativeBranches = useMemo(() => {
    if (confidenceThreshold <= 0) return rawSpeculativeBranches;
    return rawSpeculativeBranches.filter((b) => b.confidence >= confidenceThreshold);
  }, [rawSpeculativeBranches, confidenceThreshold]);

  // Load the last persisted prediction when the repo changes (no auto-predict).
  // FUTUROS stays OFF: loading ≠ showing. Mock mode bypasses disk.
  useEffect(() => {
    if (USE_MOCK_SPECULATIVE) {
      setRawSpeculativeBranches(MOCK_SPECULATIVE);
      setSpeculativeAt(null);
      return;
    }
    if (!repoPath) {
      setRawSpeculativeBranches([]);
      setSpeculativeAt(null);
      return;
    }
    let alive = true;
    Promise.all([
      window.api.ai.loadPrediction(repoPath),
      window.api.temporalAgent.loadConfig(repoPath, openRepos[activeRepoIdx]?.name ?? 'repo'),
    ]).then(([r, cfg]) => {
      if (!alive) return;
      setConfidenceThreshold(cfg?.skillProfile?.confidenceThreshold ?? 0);
      if (r.success && r.data) {
        // Patch predictionIndex on old branches that don't have it yet.
        r.data.branches.forEach((b: SpeculativeBranch, i: number) => {
          if (b.predictionIndex == null) b.predictionIndex = i + 1;
        });
        setRawSpeculativeBranches(r.data.branches);
        setSpeculativeAt(r.data.generatedAt);
        // Auto-enable FUTUROS when a saved prediction exists for this repo.
        setShowSpeculative(true);
      } else {
        setRawSpeculativeBranches([]);
        setSpeculativeAt(null);
      }
    });
    return () => { alive = false; };
  }, [repoPath]);

  // Keyboard shortcut to toggle word wrap (Alt+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        setWordWrap((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [isTabChanging, setIsTabChanging] = useState(false);
  const [isViewChanging, setIsViewChanging] = useState(false);

  const handleTabChange = (tab: string) => {
    setIsTabChanging(true);
    setActiveView('repository');
    setActiveTab(tab);
    setTimeout(() => {
      setIsTabChanging(false);
    }, 150);
  };

  const handleViewChange = (view: 'repository' | 'settings' | 'help' | 'profile') => {
    setIsViewChanging(true);
    setActiveView(view);
    if (view !== 'repository') {
      setShowRepoChooser(false);
    }
    setTimeout(() => {
      setIsViewChanging(false);
    }, 150);
  };

  const handleCloseRepoChooser = () => {
    setIsViewChanging(true);
    setShowRepoChooser(false);
    setTimeout(() => {
      setIsViewChanging(false);
    }, 150);
  };

  const getGraphMode = (): 'chronometric' | 'classic' => 'chronometric';
  const graphMode = getGraphMode(); // Always use premium floating layout
  const activeGraphMode = enableCronometric ? rawGraphMode : 'classic';
  const isRepoStartView = activeView === 'repository' && (!repoPath || showRepoChooser);
  const isMainFullBleed = activeView === 'repository' && !isRepoStartView && activeTab === 'Graph' && !selectedFile && !selectedPullRequest;

  const handleChangeGraphMode = async (mode: 'classic' | 'chronometric') => {
    const activeRepo = useGitStore.getState().getActiveRepo();
    if (!activeRepo) return;

    updateActiveRepo({ graphMode: mode });

    if (window.api) {
      try {
        const saved = await window.api.storageGet('repoGraphModes').catch(() => null);
        let modes: Record<string, string> = {};
        if (saved?.success && typeof saved.data === 'string') {
          try { modes = JSON.parse(saved.data); } catch {}
        }
        modes[activeRepo.path] = mode;
        await window.api.storageSet('repoGraphModes', JSON.stringify(modes)).catch(() => {});
      } catch {}
    }
  };
  const [pullDecision, setPullDecision] = useState<PullDecisionToast | null>(null);

  const showPullDecisionIfNeeded = (source: 'push' | 'pull') => {
    const tracking = currentBranch ? branchTracking[currentBranch] : undefined;
    if (!currentBranch || !tracking?.upstream || tracking.gone || tracking.behind <= 0) return false;

    setError(null);
    setSuccess(null);
    setPullDecision({
      source,
      branch: currentBranch,
      ahead: tracking.ahead,
      behind: tracking.behind,
      mode: tracking.ahead > 0 ? 'diverged' : 'behind',
    });
    return true;
  };

  const safeDirectoryTrustPath = error ? safeDirectoryPathFromError(error) : null;
  const canTrustSafeDirectory = !!error && isSafeDirectoryError(error) && !!(safeDirectoryTrustPath || repoPath);

  const handleTrustSafeDirectory = async () => {
    const targetPath = safeDirectoryTrustPath ?? repoPath;
    if (!targetPath) return;
    await trustSafeDirectory(targetPath);
  };

  const handlePushIntent = () => {
    if (!repoPath) return;
    if (showPullDecisionIfNeeded('push')) return;
    void pushChanges();
  };

  const handlePullIntent = () => {
    if (!repoPath) return;
    if (showPullDecisionIfNeeded('pull')) return;
    void pullChanges();
  };

  // Global keyboard shortcuts. Handlers fire only if the user is NOT typing in
  // an input (except Ctrl+Enter for commit). The keys are user-configurable in
  // Settings → Keyboard shortcuts.
  useShortcuts({
    commit: () => { if (commitMessage.trim() && repoPath) void commitChanges(); },
    push: handlePushIntent,
    pull: handlePullIntent,
    newBranch: () => { if (repoPath) { setNewBranchFrom(undefined); setShowNewBranch(true); } },
    search: () => setShowSearchPopover(true),
    fetchNow: () => { if (repoPath) void runFetchCycle(); },
    settings: () => handleViewChange(activeView === 'settings' ? 'repository' : 'settings'),
    help: () => handleViewChange(activeView === 'help' ? 'repository' : 'help'),
    closeRepo: () => {
      const idx = useGitStore.getState().activeRepoIdx;
      if (idx >= 0) useGitStore.getState().closeRepo(idx);
    },
    nextRepo: () => {
      const s = useGitStore.getState();
      if (s.openRepos.length > 1) {
        s.setActiveRepoIdx((s.activeRepoIdx + 1) % s.openRepos.length);
      }
    },
    prevRepo: () => {
      const s = useGitStore.getState();
      if (s.openRepos.length > 1) {
        const idx = (s.activeRepoIdx - 1 + s.openRepos.length) % s.openRepos.length;
        s.setActiveRepoIdx(idx);
      }
    },
    graphTab: () => handleTabChange('Graph'),
    historyTab: () => handleTabChange('History'),
    commitTab: () => handleTabChange('Commit'),
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; hash?: string } | null>(null);
  const [fileContextMenu, setFileContextMenu] = useState<{ x: number; y: number; file: GitFile } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAmend, setShowAmend] = useState(false);
  const [amendNewMessage, setAmendNewMessage] = useState('');
  const [amendCurrentMessage, setAmendCurrentMessage] = useState('');
  const [showSquash, setShowSquash] = useState(false);
  const [squashN, setSquashN] = useState(2);
  const [squashMessage, setSquashMessage] = useState('');
  const [commitFiles, setCommitFiles] = useState<GitFile[]>([]);
  const [commitFilesLoading, setCommitFilesLoading] = useState(false);
  const [pullRequestDiff, setPullRequestDiff] = useState<PullRequestDiffData | null>(null);
  const [pullRequestDiffLoading, setPullRequestDiffLoading] = useState(false);
  const [showStashClearConfirm, setShowStashClearConfirm] = useState(false);
  const [checkoutConflict, setCheckoutConflict] = useState<{ branch: string; error: string } | null>(null);
  const [branchMenu, setBranchMenu] = useState<{ x: number; y: number; branch: string } | null>(null);
  const [remoteBranchMenu, setRemoteBranchMenu] = useState<{ x: number; y: number; branch: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ branch: string; notMerged?: boolean } | null>(null);
  const [deleteTagConfirm, setDeleteTagConfirm] = useState<string | null>(null);
  const [forcePushConfirm, setForcePushConfirm] = useState<{
    repoDir: string;
    githubToken: string;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [mergeNeedsCheckout, setMergeNeedsCheckout] = useState<{ sourceBranch: string; targetBranch: string } | null>(null);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchFrom, setNewBranchFrom] = useState<string | undefined>(undefined);

  const openContextMenu = (menu: { x: number; y: number; hash?: string } | null) => {
    setFileContextMenu(null);
    setBranchMenu(null);
    setRemoteBranchMenu(null);
    setContextMenu(menu);
  };

  const openFileContextMenu = (menu: { x: number; y: number; file: GitFile } | null) => {
    setContextMenu(null);
    setBranchMenu(null);
    setRemoteBranchMenu(null);
    setFileContextMenu(menu);
  };

  const openBranchMenu = (menu: { x: number; y: number; branch: string } | null) => {
    setContextMenu(null);
    setFileContextMenu(null);
    setRemoteBranchMenu(null);
    setBranchMenu(menu);
  };

  const openRemoteBranchMenu = (menu: { x: number; y: number; branch: string } | null) => {
    setContextMenu(null);
    setFileContextMenu(null);
    setBranchMenu(null);
    setRemoteBranchMenu(menu);
  };
  // ── Resizable column widths ──
  const [sidebarW, setSidebarW] = useState(240);
  const [detailsW, setDetailsW] = useState(320);
  // ── Floating panel open/closed state ──
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const repositoryDetailsVisible = detailsOpen && activeView === 'repository' && !!repoPath && !isRepoStartView;
  const leftGraphSafe = sidebarOpen ? sidebarW + FLOATING_PANEL_INSET + GRAPH_SAFE_GAP : 0;
  const rightGraphSafe = repositoryDetailsVisible ? detailsW + FLOATING_PANEL_INSET + GRAPH_SAFE_GAP : 0;
  const [isDragging, setIsDragging] = useState(false);
  const [graphColumns, setGraphColumns] = useState(GRAPH_COLUMN_DEFAULTS);
  const dragRef = useRef<{
    col: 'sidebar' | 'details';
    startX: number;
    startW: number;
  } | null>(null);
  const graphDragRef = useRef<{
    col: GraphColumnKey;
    startX: number;
    startW: number;
    direction: 1 | -1;
  } | null>(null);

  const startColDrag = (col: 'sidebar' | 'details') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      col,
      startX: e.clientX,
      startW: col === 'sidebar' ? sidebarW : detailsW,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.startX;
      if (dragRef.current.col === 'sidebar') {
        const w = Math.max(160, Math.min(400, dragRef.current.startW + delta));
        setSidebarW(w);
        localStorage.setItem('gitcron:sidebarW', String(w));
      } else {
        // details grows to the LEFT so delta is inverted
        const w = Math.max(240, Math.min(560, dragRef.current.startW - delta));
        setDetailsW(w);
        localStorage.setItem('gitcron:detailsW', String(w));
      }
    };
    const onUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startGraphColDrag = (col: GraphColumnKey, direction: 1 | -1 = 1) => (e: React.MouseEvent) => {
    e.preventDefault();
    graphDragRef.current = {
      col,
      startX: e.clientX,
      startW: graphColumns[col],
      direction,
    };
    const onMove = (ev: MouseEvent) => {
      if (!graphDragRef.current) return;
      const { col: activeCol, startX, startW, direction: dragDirection } = graphDragRef.current;
      const delta = (ev.clientX - startX) * dragDirection;
      const limits = GRAPH_COLUMN_LIMITS[activeCol];
      const width = Math.max(limits.min, Math.min(limits.max, startW + delta));

      setGraphColumns((prev) => {
        const next = { ...prev, [activeCol]: width };
        localStorage.setItem('gitcron:graphColumns', JSON.stringify(next));
        return next;
      });
    };
    const onUp = () => {
      graphDragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };


  const [filterText, setFilterText] = useState('');
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [showSearchPopover, setShowSearchPopover] = useState(false);
  const [showBranchFilterDropdown, setShowBranchFilterDropdown] = useState(false);
  const branchFilterRef = useRef<HTMLDivElement>(null);
  const [searchPopoverPos, setSearchPopoverPos] = useState<{ top: number; right: number } | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [authMode, setAuthMode] = useState<'oauth' | 'token'>('oauth');
  const [deviceCodeInfo, setDeviceCodeInfo] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [changelogRaw, setChangelogRaw] = useState<string | null>(null);
  const [changelogError, setChangelogError] = useState<string | null>(null);
  const [showUpdateMenu, setShowUpdateMenu] = useState(false);
  const newBranchInputRef = useRef<HTMLInputElement>(null);
  const searchPopoverRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLDivElement>(null);
  const updateMenuRef = useRef<HTMLDivElement>(null);
  const mockUpdateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isStartupHydrated, setIsStartupHydrated] = useState(false);
  const [isStartupGraphReady, setIsStartupGraphReady] = useState(false);
  const changelogEntries = useMemo(() => parseChangelog(changelogRaw ?? ''), [changelogRaw]);

  // Auto-load repo data
  useEffect(() => {
    if (!repoPath) {
      if (isStartupHydrated) setIsStartupGraphReady(true);
      return;
    }
    let cancelled = false;
    setIsStartupGraphReady(false);
    loadAll(repoPath).finally(() => {
      if (!cancelled) setIsStartupGraphReady(true);
    });
    return () => { cancelled = true; };
  }, [repoPath, isStartupHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load files changed in selected commit
  useEffect(() => {
    if (!selectedCommit || !repoPath || !window.api) {
      setCommitFiles([]);
      return;
    }
    setCommitFilesLoading(true);
    window.api.gitShowFiles(repoPath, selectedCommit.hash)
      .then((r) => {
        if (r.success && r.data) setCommitFiles(r.data as GitFile[]);
        else setCommitFiles([]);
      })
      .catch(() => setCommitFiles([]))
      .finally(() => setCommitFilesLoading(false));
  }, [selectedCommit?.hash, repoPath]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.style.fontSize = `${appFontSizePx}px`;
  }, [appFontSizePx]);

  // Read persisted split widths and panel open states on the client to avoid SSR hydration mismatches.
  useEffect(() => {
    const savedSidebarW = localStorage.getItem('gitcron:sidebarW');
    const savedDetailsW = localStorage.getItem('gitcron:detailsW');
    const savedGraphColumns = localStorage.getItem('gitcron:graphColumns');
    const savedSidebarOpen = localStorage.getItem('gitcron:sidebarOpen');
    const savedDetailsOpen = localStorage.getItem('gitcron:detailsOpen');
    const parsedSidebarW = savedSidebarW ? parseInt(savedSidebarW, 10) : NaN;
    const parsedDetailsW = savedDetailsW ? parseInt(savedDetailsW, 10) : NaN;

    if (!Number.isNaN(parsedSidebarW)) setSidebarW(parsedSidebarW);
    if (!Number.isNaN(parsedDetailsW)) setDetailsW(parsedDetailsW);
    if (savedSidebarOpen !== null) setSidebarOpen(savedSidebarOpen !== 'false');
    if (savedDetailsOpen !== null) setDetailsOpen(savedDetailsOpen !== 'false');
    if (savedGraphColumns) {
      try {
        const parsed = JSON.parse(savedGraphColumns) as Partial<typeof GRAPH_COLUMN_DEFAULTS>;
        setGraphColumns((prev) => {
          const next = { ...prev };
          (Object.keys(GRAPH_COLUMN_DEFAULTS) as GraphColumnKey[]).forEach((key) => {
            const value = parsed[key];
            if (typeof value !== 'number' || Number.isNaN(value)) return;
            const limits = GRAPH_COLUMN_LIMITS[key];
            next[key] = Math.max(limits.min, Math.min(limits.max, value));
          });
          return next;
        });
      } catch {
        localStorage.removeItem('gitcron:graphColumns');
      }
    }
  }, []);

  // Repo-scoped local UI should not survive tab switches or closing a repo.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setContextMenu(null);
    setFileContextMenu(null);
    setBranchMenu(null);
    setCheckoutConflict(null);
    setRenameModal(null);
    setDeleteConfirm(null);
    setMergeNeedsCheckout(null);
    setShowNewBranch(false);
    setNewBranchName('');
    setNewBranchFrom(undefined);
  }, [repoPath]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Hydrate preferences (language) + GitHub auth + last opened repo on startup.
  useEffect(() => {
    let cancelled = false;
    const hydrateStartup = async () => {
      bootstrapPreferences();
      bootstrapGitHub();
      await restoreLastRepo(); // silently tries to reopen the last repo; no-op if none saved
      if (cancelled) return;
      setIsStartupHydrated(true);
      if (!useGitStore.getState().repoPath) setIsStartupGraphReady(true);
    };
    void hydrateStartup();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Retry GitHub user info fetch if we have a token but no user, either on online events or when opening profile view.
  useEffect(() => {
    if (githubToken && !githubUser) {
      if (activeView === 'profile') {
        void bootstrapGitHub();
      }
      const handleOnline = () => {
        void bootstrapGitHub();
      };
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, [githubToken, githubUser, activeView, bootstrapGitHub]);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setFileContextMenu(null);
      setBranchMenu(null);
      setRemoteBranchMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Ctrl+Alt+F focuses the filter input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearchPopover(true);
      }
      // Escape clears filter first, then closes search when pressed again.
      if (e.key === 'Escape' && document.activeElement === filterInputRef.current) {
        if (filterText) {
          setFilterText('');
        } else {
          setShowSearchPopover(false);
          filterInputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [filterText]);

  useEffect(() => {
    if (!showSearchPopover) return;
    const buttonRect = searchButtonRef.current?.getBoundingClientRect();
    if (buttonRect) {
      setSearchPopoverPos({
        top: buttonRect.bottom + 8,
        right: Math.max(12, window.innerWidth - buttonRect.right),
      });
    }
    filterInputRef.current?.focus();
    filterInputRef.current?.select();
  }, [showSearchPopover]);

  useEffect(() => {
    if (!showSearchPopover) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (searchPopoverRef.current?.contains(e.target as Node)) return;
      if (searchButtonRef.current?.contains(e.target as Node)) return;
      setShowSearchPopover(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [showSearchPopover]);

  useEffect(() => {
    if (!showBranchFilterDropdown) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (branchFilterRef.current?.contains(e.target as Node)) return;
      setShowBranchFilterDropdown(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [showBranchFilterDropdown]);

  useEffect(() => {
    if (!showUpdateMenu) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (updateMenuRef.current?.contains(e.target as Node)) return;
      setShowUpdateMenu(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [showUpdateMenu]);

  useEffect(() => {
    if (!showSearchPopover) return;
    const updatePosition = () => {
      const buttonRect = searchButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;
      setSearchPopoverPos({
        top: buttonRect.bottom + 8,
        right: Math.max(12, window.innerWidth - buttonRect.right),
      });
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showSearchPopover]);

  useEffect(() => { if (showNewBranch) newBranchInputRef.current?.focus(); }, [showNewBranch]);

  // Auto-dismiss success toast after 3 seconds
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire up auto-update IPC events from the main process.
  useEffect(() => {
    if (MOCK_UPDATE_ENABLED) {
      const timer = setTimeout(() => {
        setUpdateInfo({
          version: MOCK_UPDATE_VERSION,
          currentVersion: pkg.version,
          releaseDate: new Date().toISOString(),
        });
        setUpdateStatus('available');
        setDownloadProgress(0);
      }, 1200);
      return () => clearTimeout(timer);
    }

    if (!window.api?.onUpdateNotAvailable) return;
    const unsubAvailable = window.api.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setUpdateStatus('available');
      setDownloadProgress(0);
    });
    const unsubNotAvailable = window.api.onUpdateNotAvailable(() => {
      setUpdateStatus('idle');
      setUpdateInfo(null);
      setDownloadProgress(0);
      setSuccess(t('update.toastNotAvailable'));
    });
    const unsubError = window.api.onUpdateError((msg: string) => {
      setUpdateStatus((status) => status === 'downloading' ? 'available' : 'error');
      setDownloadProgress(0);
      setError(t('update.toastError', { error: msg }));
    });
    const unsubProgress = window.api.onDownloadProgress(({ percent }) => {
      setUpdateStatus('downloading');
      setDownloadProgress(percent);
    });
    const unsubDownloaded = window.api.onUpdateDownloaded((info) => {
      setUpdateInfo(info);
      setUpdateStatus('downloaded');
      setDownloadProgress(100);
      setShowUpdateMenu(false);
    });
    return () => {
      unsubAvailable();
      unsubNotAvailable();
      unsubError();
      unsubProgress();
      unsubDownloaded();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    if (!window.api?.getChangelog) {
      setChangelogError('El changelog está disponible en la app de escritorio.');
      return () => { cancelled = true; };
    }

    window.api.getChangelog().then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setChangelogRaw(result.data);
        setChangelogError(null);
      } else {
        setChangelogError(result.error ?? 'No se pudo cargar el changelog');
      }
    }).catch((error) => {
      if (!cancelled) setChangelogError(error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; };
  }, []);

  const handleCheckForUpdate = async () => {
    if (updateStatus === 'checking' || updateStatus === 'downloading') return;
    if (MOCK_UPDATE_ENABLED) {
      setUpdateStatus('checking');
      setSuccess(t('update.toastChecking'));
      window.setTimeout(() => {
        setUpdateInfo({
          version: MOCK_UPDATE_VERSION,
          currentVersion: pkg.version,
          releaseDate: new Date().toISOString(),
        });
        setUpdateStatus('available');
        setDownloadProgress(0);
        setSuccess(null);
      }, 600);
      return;
    }

    setUpdateStatus('checking');
    setSuccess(t('update.toastChecking'));
    const result = await window.api.checkForUpdate();
    if (!result.success) {
      setUpdateStatus('error');
      setError(result.error ?? t('update.toastError', { error: 'unknown' }));
    }
    // On success the IPC listeners (onUpdateNotAvailable / onUpdateError) handle the rest.
  };

  const handleDownloadUpdate = async () => {
    if (updateStatus === 'downloading') return;
    if (MOCK_UPDATE_ENABLED) {
      if (mockUpdateTimerRef.current) clearInterval(mockUpdateTimerRef.current);
      setUpdateInfo((info) => info ?? {
        version: MOCK_UPDATE_VERSION,
        currentVersion: pkg.version,
        releaseDate: new Date().toISOString(),
      });
      setUpdateStatus('downloading');
      setDownloadProgress(0);
      mockUpdateTimerRef.current = setInterval(() => {
        setDownloadProgress((prev) => {
          const next = Math.min(prev + 12, 100);
          if (next >= 100) {
            if (mockUpdateTimerRef.current) {
              clearInterval(mockUpdateTimerRef.current);
              mockUpdateTimerRef.current = null;
            }
            setUpdateStatus('downloaded');
            setShowUpdateMenu(false);
          }
          return next;
        });
      }, 220);
      return;
    }

    setUpdateStatus('downloading');
    setDownloadProgress(0);
    const result = await window.api.downloadUpdate();
    if (!result.success) {
      setUpdateStatus(updateInfo ? 'available' : 'error');
      setError(result.error ?? t('update.toastError', { error: 'unknown' }));
    }
  };

  const handleInstallUpdate = async () => {
    if (MOCK_UPDATE_ENABLED) {
      setSuccess(t('update.mockInstall'));
      setShowUpdateMenu(false);
      return;
    }

    const result = await window.api.installUpdate();
    if (!result.success) {
      setError(result.error ?? t('update.toastError', { error: 'unknown' }));
    }
  };

  useEffect(() => {
    return () => {
      if (mockUpdateTimerRef.current) clearInterval(mockUpdateTimerRef.current);
    };
  }, []);

  const handleCreateBranch = async () => {
    const name = newBranchName.trim();
    if (!name) return;
    await createBranch(name, newBranchFrom);
    setShowNewBranch(false);
    setNewBranchName('');
    setNewBranchFrom(undefined);
  };

  const handleSelectFile = async (file: GitFile) => {
    setIsTabChanging(true);
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setSelectedFile(file);
    setTimeout(() => {
      setIsTabChanging(false);
    }, 150);
    await loadDiff(file.path, file.staged, repoPath ?? undefined);
  };

  const handleSelectPullRequest = async (pr: PullRequestEntry) => {
    if (!repoPath || !githubToken || !window.api) return;
    setIsTabChanging(true);
    setSelectedCommit(null);
    setSelectedFile(null);
    setCurrentDiff('');
    setSelectedPullRequest(pr);
    setPullRequestDiff(null);
    setPullRequestDiffLoading(true);
    setTimeout(() => {
      setIsTabChanging(false);
    }, 150);
    try {
      const result = await window.api.githubGetPRDiff(githubToken, repoPath, pr.number);
      if (result.success && result.data) {
        setPullRequestDiff(result.data as PullRequestDiffData);
      } else {
        setError(result.error ?? t('prDiff.loadError'));
      }
    } catch (err: any) {
      setError(err?.message ?? t('prDiff.loadError'));
    } finally {
      setPullRequestDiffLoading(false);
    }
  };

  const handleSelectCommit = (commit: Commit) => {
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setPullRequestDiffLoading(false);
    setSelectedCommit(commit);
  };

  /**
   * Merge a branch into the current one. Validates the user is on the right
   * branch first; if not, offers a checkout-then-merge flow.
   */
  const handleMergeBranchIntoCurrent = async (sourceBranch: string) => {
    if (sourceBranch === currentBranch) {
      setError('No podés mergear una branch en sí misma');
      return;
    }
    // Already on target branch — just merge
    const r = await mergeIntoCurrent(sourceBranch);
    if (r.success) {
      // Auto-confirm via the existing error toast pattern (use a positive message)
      // The error state is repurposed as a generic notification slot.
    }
  };

  /** Helper: merge `source` into `target`. Requires being on `target` first. */
  const performMerge = async (sourceBranch: string, targetBranch: string) => {
    // If we're not on the target branch, prompt user
    if (currentBranch !== targetBranch) {
      setMergeNeedsCheckout({ sourceBranch, targetBranch });
      return;
    }
    await mergeIntoCurrent(sourceBranch);
  };

  /**
   * Try to checkout a branch. If git complains about uncommitted changes,
   * open the conflict modal so the user can decide (stash + retry or cancel).
   */
  const handleCheckoutAttempt = async (branch: string) => {
    if (branch === currentBranch) return; // already on it
    const r = await checkoutBranch(branch);
    if (!r.success && r.conflict) {
      setCheckoutConflict({ branch, error: r.error ?? 'Conflicto al cambiar de branch' });
    }
  };

  const handleCloseDiff = () => {
    setIsTabChanging(true);
    setSelectedFile(null);
    setCurrentDiff('');
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setPullRequestDiffLoading(false);
    setTimeout(() => {
      setIsTabChanging(false);
    }, 150);
  };

  const handleConnectGitHub = async () => {
    const t = tokenInput.trim();
    if (!t) return;
    const r = await connectGitHub(t);
    if (r.success) {
      setTokenInput('');
    }
  };

  const handleLoginWithGitHub = async () => {
    setIsLoggingIn(true);
    setDeviceCodeInfo(null);
    try {
      await loginWithGitHubDevice((info) => {
        setDeviceCodeInfo(info);
      });
    } finally {
      setIsLoggingIn(false);
      setDeviceCodeInfo(null);
    }
  };

  const handleOpenRepoChooser = () => {
    setSelectedCommit(null);
    setSelectedFile(null);
    setCurrentDiff('');
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setRepoStartMode('create');
    handleViewChange('repository');
    setShowRepoChooser(true);
  };

  const handleOpenExistingFromChooser = async () => {
    await openRepo();
    if (useGitStore.getState().repoPath) {
      handleCloseRepoChooser();
    }
  };

  const handleCreateRepoFromChooser = async (parent: string, name: string, withGitHub: boolean) => {
    setError(null);
    const separator = parent.includes('\\') ? '\\' : '/';
    const repoDir = parent.endsWith('/') || parent.endsWith('\\')
      ? `${parent}${name}`
      : `${parent}${separator}${name}`;

    const existsResult = await window.api.fsExistsAndNotEmpty(parent, name);
    const existsAndNotEmpty = existsResult.success && existsResult.data;

    if (existsAndNotEmpty) {
      const r = await initRepo(parent, name, true);
      if (!r.success) return false;

      if (withGitHub && githubToken) {
        const gh = await createGitHubRepo(githubToken, name, true, '', false);
        let cloneUrl = '';

        if (!gh.success) {
          const isNameExistsError = gh.error && gh.error.includes('already exists');
          if (isNameExistsError && githubUser?.login) {
            cloneUrl = `https://github.com/${githubUser.login}/${name}.git`;
          } else {
            return false;
          }
        } else if (gh.data) {
          cloneUrl = gh.data.cloneUrl;
        }

        if (cloneUrl) {
          const remoteRes = await window.api.gitCommand(repoDir, ['remote', 'add', 'origin', cloneUrl]);
          if (!remoteRes.success && !remoteRes.error?.includes('already exists')) {
            setError(remoteRes.error ?? 'Error al asociar el repositorio remoto');
            return false;
          }

          const pushRes = await window.api.gitPushBranch(repoDir, 'main', githubToken);
          if (!pushRes.success) {
            const isRejected = pushRes.error && (
              pushRes.error.includes('[rejected]') ||
              pushRes.error.includes('fetch first') ||
              pushRes.error.includes('non-fast-forward') ||
              pushRes.error.includes('remote contains work')
            );
            if (isRejected) {
              const shouldForce = await new Promise<boolean>((resolve) => {
                setForcePushConfirm({
                  repoDir,
                  githubToken,
                  resolve,
                });
              });
              if (shouldForce) {
                const forcePushRes = await window.api.gitPushBranch(repoDir, 'main', githubToken, true);
                if (!forcePushRes.success) {
                  setError(forcePushRes.error ?? 'Error al forzar la subida a GitHub');
                  return false;
                }
              } else {
                return false;
              }
            } else {
              setError(pushRes.error ?? 'Error al subir los archivos a GitHub');
              return false;
            }
          }
        }
      }
      await loadAll(repoDir);
      return true;
    }

    if (withGitHub && githubToken) {
      const r = await createGitHubRepo(githubToken, name, true, '', true);
      let cloneUrl = '';

      if (!r.success) {
        const isNameExistsError = r.error && r.error.includes('already exists');
        if (isNameExistsError && githubUser?.login) {
          cloneUrl = `https://github.com/${githubUser.login}/${name}.git`;
        } else {
          return false;
        }
      } else if (r.data) {
        cloneUrl = r.data.cloneUrl;
      }

      if (cloneUrl) {
        const cl = await cloneRepo(cloneUrl, parent, name, githubToken);
        return cl.success;
      }
      return false;
    }

    const r = await initRepo(parent, name, true);
    return r.success;
  };

  const handleCloneRepoFromChooser = async (url: string, parent: string, name: string) => {
    const r = await cloneRepo(url, parent, name, githubToken ?? undefined);
    return r.success;
  };

  const handleSelectRepoTab = async (idx: number) => {
    const repo = openRepos[idx];
    if (!repo || idx === activeRepoIdx) return;
    handleViewChange('repository');
    handleCloseRepoChooser();
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setPullRequestDiffLoading(false);
    setActiveRepoIdx(idx);
    if (window.api) {
      await Promise.all([
        window.api.storageSet('activeRepoPath', repo.path).catch(() => {}),
        window.api.storageSet('lastRepoPath', repo.path).catch(() => {}),
      ]);
    }
  };

  const handleCloseRepoTab = async (idx: number) => {
    await closeRepo(idx);
    handleCloseRepoChooser();
  };

  const handlePullDecision = async (mode: 'ff-only' | 'rebase' | 'merge') => {
    setPullDecision(null);
    await pullWithDecision(mode);
  };

  if (!isStartupHydrated) {
    return (
      <div className="flex flex-col h-screen w-screen bg-bg-base items-center justify-center text-text-secondary text-sm select-none">
        <Loader2 size={24} className="animate-spin mb-3 text-secondary animate-pulse" />
        <p className="font-semibold text-text-primary tracking-wide">Iniciando GitCron...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg-base text-text-primary font-sans overflow-hidden select-none">
      <div
        className={cn(
          "shrink-0",
          graphMode === 'chronometric' ? "px-3 pt-2 absolute top-0 left-0 right-0 z-[80]" : "relative z-50"
        )}
      >
        <div
          className={cn(
            "flex flex-col",
            graphMode === 'chronometric' && "rounded-2xl border border-text-primary/15 bg-bg-overlay/60 backdrop-blur-md"
          )}
        >
          <RepoTabs
            repos={openRepos}
            activeIdx={activeRepoIdx}
            onSelect={handleSelectRepoTab}
            onClose={handleCloseRepoTab}
            onOpen={handleOpenRepoChooser}
            onReorder={setOpenRepos}
          />
          {/* ──────────── TOP NAV ──────────── */}
          <header
            className={cn(
              "grid items-center shrink-0 relative z-50 h-12",
              graphMode === 'chronometric'
                ? "rounded-b-2xl border-t border-text-primary/[0.06] bg-transparent grid-cols-[minmax(210px,0.8fr)_auto_minmax(360px,1.2fr)] px-3"
                : "glass-header grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] px-4"
            )}
          >
        <div className="flex items-center gap-4 h-full min-w-0">
          <button
            type="button"
            onClick={() => {
              const next = !sidebarOpen;
              setSidebarOpen(next);
              localStorage.setItem('gitcron:sidebarOpen', String(next));
            }}
            aria-label={sidebarOpen ? t('toolbar.hideSidebar') : t('toolbar.showSidebar')}
            aria-pressed={sidebarOpen}
            title={sidebarOpen ? t('toolbar.hideSidebar') : t('toolbar.showSidebar')}
            className={cn(
              'h-9 w-9 shrink-0 rounded-lg border border-text-primary/15 bg-text-primary/[0.035] text-text-secondary',
              'flex items-center justify-center transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
              'hover:border-secondary/35 hover:bg-text-primary/10 hover:text-secondary',
              sidebarOpen && 'text-secondary border-secondary/25 bg-secondary/10',
            )}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <nav className="flex h-full gap-1 shrink-0">
            {[
              { key: 'Commit', label: t('tab.commit') },
              { key: 'Graph', label: t('tab.graph') },
              { key: 'History', label: t('tab.history') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'px-3 h-full flex items-center text-sm transition-colors relative',
                  activeTab === tab.key ? 'text-secondary' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div layoutId="activeTab" className="absolute bottom-1.5 left-2 right-2 h-0.5 rounded-full bg-secondary" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-center gap-1 px-2">
          <ToolbarButton icon={<Undo />} onClick={() => {}} title={t('toolbar.undo')} />
          <ToolbarButton icon={<Redo />} onClick={() => {}} title={t('toolbar.redo')} />
          <div className="w-px h-4 bg-border-subtle mx-1" />
          <ToolbarButton icon={<Download />} onClick={handlePullIntent} title={t('toolbar.pull')} label={t('toolbar.pull')} disabled={!repoPath || isLoading} />
          <ToolbarButton icon={<Upload />} onClick={handlePushIntent} title={t('toolbar.push')} label={t('toolbar.push')} disabled={!repoPath || isLoading} />
          <div className="w-px h-4 bg-border-subtle mx-1" />
          <ToolbarButton
            icon={<GitBranch />}
            onClick={() => { setNewBranchFrom(undefined); setShowNewBranch(true); }}
            title={t('toolbar.newBranch')} label={t('toolbar.branch')} disabled={!repoPath}
          />
          <ToolbarButton icon={<Archive />} onClick={stashChanges} title={t('toolbar.stash')} label={t('toolbar.stash')} disabled={!repoPath || isLoading} />
          <FetchIndicator onClick={runFetchCycle} />
        </div>

        <div className="flex items-center justify-end gap-1 min-w-0">
          {/* Branch filter dropdown — only visible when Graph tab is active */}
          {activeView === 'repository' && !isRepoStartView && activeTab === 'Graph' && repoPath && enableCronometric && (
            <div className="bg-bg-overlay/90 border border-border-subtle/20 rounded-md flex items-center p-0.5 mr-1 shrink-0">
              <button
                type="button"
                onClick={() => handleChangeGraphMode('classic')}
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-all duration-150",
                  activeGraphMode === 'classic'
                    ? "bg-secondary/15 text-secondary border border-secondary/20 shadow-[0_0_8px_rgba(163,241,133,0.15)]"
                    : "text-text-secondary hover:text-text-primary border border-transparent"
                )}
                title={t('toolbar.viewClassicTooltip')}
              >
                {t('toolbar.viewClassicBtn')}
              </button>
              <button
                type="button"
                onClick={() => handleChangeGraphMode('chronometric')}
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-all duration-150",
                  activeGraphMode === 'chronometric'
                    ? "bg-secondary/15 text-secondary border border-secondary/20 shadow-[0_0_8px_rgba(163,241,133,0.15)]"
                    : "text-text-secondary hover:text-text-primary border border-transparent"
                )}
                title={t('toolbar.viewChronometricTooltip')}
              >
                {t('toolbar.viewChronometricBtn')}
              </button>
            </div>
          )}
          {/* Version tag + GitHub icon / update status */}
          <div className="flex items-center gap-1.5 mr-1 shrink-0">
            {updateStatus === 'downloaded' && (
              <button
                type="button"
                onClick={handleInstallUpdate}
                className="h-7 px-2.5 rounded border border-secondary/45 bg-secondary/18 text-[10px] font-bold text-secondary hover:bg-secondary/28 transition-colors"
                title={t('update.install')}
              >
                UPDATE
              </button>
            )}
            {updateStatus === 'downloading' && (
              <div className="w-28 flex items-center gap-1.5">
                <Download size={11} className="shrink-0 text-secondary" />
                <div className="flex-1 h-1 bg-border-subtle/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-secondary w-7 text-right shrink-0">
                  {downloadProgress}%
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => window.api.shellOpenExternal('https://github.com/alejandropd-1/gitcron/releases/')}
              title="GitHub Releases"
              className="w-8 h-8 shrink-0 flex items-center justify-center text-text-secondary hover:text-secondary hover:bg-bg-overlay/70 rounded transition-colors"
            >
              <Github size={16} />
            </button>
            <div className="relative" ref={updateMenuRef}>
              <button
                type="button"
                onClick={() => setShowUpdateMenu((v) => !v)}
                className="relative text-[10px] font-mono font-bold text-[#052900] bg-secondary border border-[#68b24f] rounded px-2 py-0.5 select-none hover:brightness-110 transition"
                title={updateInfo ? t('update.availableTitle', { version: updateInfo.version }) : t('settings.version')}
              >
                v{pkg.version}
                {(updateStatus === 'available' || updateStatus === 'downloaded') && (
                  <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-git-mod ring-2 ring-bg-base/70 shadow-[0_0_8px_rgba(var(--color-git-mod-rgb),0.9)]" />
                )}
              </button>
              <AnimatePresence>
                {showUpdateMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border-subtle/25 bg-bg-overlay/95 backdrop-blur-xl p-3 z-[220]"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        'mt-1 h-2 w-2 rounded-full shrink-0',
                        updateStatus === 'available' || updateStatus === 'downloaded'
                          ? 'bg-git-mod shadow-[0_0_8px_rgba(var(--color-git-mod-rgb),0.8)]'
                          : 'bg-border-subtle',
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-text-primary">
                          {updateInfo
                            ? t('update.availableTitle', { version: updateInfo.version })
                            : t('update.currentTitle')}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-secondary">
                          {updateInfo
                            ? t('update.currentVersion', { version: pkg.version })
                            : t('update.currentDesc')}
                        </p>
                      </div>
                    </div>
                    {updateStatus === 'downloading' && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-bg-base/70/90 rounded-full overflow-hidden">
                          <div className="h-full bg-secondary rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-secondary w-8 text-right">{downloadProgress}%</span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {updateStatus === 'available' && (
                        <button
                          type="button"
                          onClick={handleDownloadUpdate}
                          className="flex-1 px-3 py-2 rounded border border-secondary/40 bg-secondary/15 text-xs font-bold text-secondary hover:bg-secondary/25 transition-colors"
                        >
                          {t('update.download')}
                        </button>
                      )}
                      {updateStatus === 'downloaded' && (
                        <button
                          type="button"
                          onClick={handleInstallUpdate}
                          className="flex-1 px-3 py-2 rounded border border-secondary/45 bg-secondary/18 text-xs font-bold text-secondary hover:bg-secondary/28 transition-colors"
                        >
                          UPDATE
                        </button>
                      )}
                      {(updateStatus === 'idle' || updateStatus === 'error') && (
                        <button
                          type="button"
                          onClick={handleCheckForUpdate}
                          className="flex-1 px-3 py-2 rounded border border-border-subtle/25 bg-bg-base/70/70 text-xs font-semibold text-text-secondary hover:text-secondary hover:border-secondary/35 transition-colors"
                        >
                          {t('settings.checkUpdatesButton')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="w-px h-4 bg-border-subtle mx-1" />
          <ToolbarButton icon={<Terminal />} onClick={openTerminal} title={t('toolbar.terminal')} disabled={!repoPath} />

          {/* Branch filter dropdown — only visible when Graph tab is active */}
          {activeTab === 'Graph' && repoPath && (
            <>
              <div className="relative" ref={branchFilterRef}>
              <button
                type="button"
                onClick={() => setShowBranchFilterDropdown((v) => !v)}
                title={graphShowAllBranches ? t('graph.allBranches') : t('graph.currentBranch')}
                className={cn(
                  'flex flex-col items-center justify-center p-1.5 rounded transition-colors group shrink-0',
                  'hover:bg-bg-overlay/70',
                  !graphShowAllBranches && 'text-secondary',
                )}
              >
                <div className={cn(
                  'w-5 h-5 flex items-center justify-center',
                  !graphShowAllBranches ? 'text-secondary' : 'text-text-secondary group-hover:text-secondary',
                )}>
                  <Filter size={15} />
                </div>
                {!graphShowAllBranches && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_6px_rgba(163,241,133,0.7)]" />
                )}
              </button>

              <AnimatePresence>
                {showBranchFilterDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-1 glass-overlay rounded-lg  py-1 z-50 w-44"
                    onClick={() => setShowBranchFilterDropdown(false)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const path = useGitStore.getState().getActiveRepo()?.path;
                        if (!path) return;
                        updateActiveRepo({ graphShowAllBranches: true });
                        refreshLog(path, { allBranches: true });
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                        graphShowAllBranches
                          ? 'text-secondary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-border-subtle/30',
                      )}
                    >
                      {graphShowAllBranches && <Check size={12} strokeWidth={3} className="shrink-0" />}
                      {!graphShowAllBranches && <span className="w-3 shrink-0" />}
                      {t('graph.allBranches')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const path = useGitStore.getState().getActiveRepo()?.path;
                        if (!path) return;
                        updateActiveRepo({ graphShowAllBranches: false });
                        refreshLog(path, { allBranches: false });
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                        !graphShowAllBranches
                          ? 'text-secondary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-border-subtle/30',
                      )}
                    >
                      {!graphShowAllBranches && <Check size={12} strokeWidth={3} className="shrink-0" />}
                      {graphShowAllBranches && <span className="w-3 shrink-0" />}
                      {t('graph.currentBranch')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
          <div className="relative shrink-0" ref={searchButtonRef}>
            <ToolbarButton
              icon={<Search />}
              onClick={() => setShowSearchPopover((v) => !v)}
              title={t('toolbar.filter')}
              disabled={!repoPath}
            />
            {filterText && (
              <span className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(163,241,133,0.7)]" />
            )}
          </div>
          <div className="w-px h-4 bg-border-subtle mx-1 shrink-0" />
          <button
            type="button"
            onClick={() => {
              const next = !detailsOpen;
              setDetailsOpen(next);
              localStorage.setItem('gitcron:detailsOpen', String(next));
            }}
            aria-label={detailsOpen ? t('toolbar.hideDetails') : t('toolbar.showDetails')}
            aria-pressed={detailsOpen}
            title={detailsOpen ? t('toolbar.hideDetails') : t('toolbar.showDetails')}
            className={cn(
              'h-9 w-9 shrink-0 rounded-lg border border-text-primary/15 bg-text-primary/[0.035] text-text-secondary',
              'flex items-center justify-center transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
              'hover:border-secondary/35 hover:bg-text-primary/10 hover:text-secondary',
              detailsOpen && 'text-secondary border-secondary/25 bg-secondary/10',
            )}
          >
            {detailsOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
      </header>
        </div>
      </div>

      {/* ──────────── MAIN 3-COLUMN LAYOUT ──────────── */}
      {showSearchPopover && searchPopoverPos && (
        <div
          ref={searchPopoverRef}
          className="fixed w-[360px] rounded-lg border border-border-subtle/25 bg-bg-overlay/95 backdrop-blur-xl p-2 z-[200]"
          style={{ top: searchPopoverPos.top, right: searchPopoverPos.right }}
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              ref={filterInputRef}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-bg-base/70/70 border border-border-subtle/20 rounded px-8 py-2 text-sm text-text-primary focus:outline-none focus:border-secondary/55"
              placeholder={t('toolbar.filter')}
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                title={t('toolbar.clearFilterTooltip')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex-1 overflow-hidden relative",
          graphMode === 'classic' && "flex"
        )}
      >
        {/* LEFT PANEL: Sidebar — floats in chronometric view, inline in classic view */}
        <aside
          className={cn(
            "flex flex-col overflow-hidden z-30",
            !isDragging && "transition-all duration-300",
            graphMode === 'chronometric'
              ? "absolute bg-bg-overlay/60 backdrop-blur-md border border-text-primary/15 rounded-xl"
              : "relative bg-bg-base/70 border-r border-border-subtle/30 shrink-0"
          )}
          style={
            graphMode === 'chronometric'
              ? {
                  top: 96 + FLOATING_PANEL_INSET,
                  left: FLOATING_PANEL_INSET,
                  bottom: FLOATING_PANEL_INSET,
                  width: sidebarW,
                  transform: sidebarOpen ? 'translateX(0)' : `translateX(calc(-100% - ${FLOATING_PANEL_INSET * 2}px))`,
                }
              : {
                  width: sidebarOpen ? sidebarW : 0,
                  opacity: sidebarOpen ? 1 : 0,
                  visibility: sidebarOpen ? 'visible' : 'hidden',
                }
          }
        >
          {/* Right-edge resize handle */}
          <div
            onMouseDown={startColDrag('sidebar')}
            className="group absolute top-0 right-0 h-full w-2 cursor-col-resize z-40"
            title="Arrastrar para redimensionar"
          >
            <div className="absolute inset-y-3 right-0.5 w-px bg-transparent group-hover:bg-secondary/45 group-active:bg-secondary/70 transition-colors" />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin py-2">
            <AnimatePresence mode="wait">
              {activeView === 'repository' ? (
                isRepoStartView ? (
                  <motion.div
                    key="repo-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col h-full select-none"
                  >
                    <div className="px-4 py-2 border-b border-text-primary/10 flex items-center justify-between">
                      <span className="font-bold text-secondary flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <FolderOpen size={14} /> Repositorios
                      </span>
                      {repoPath && (
                        <button
                          onClick={handleCloseRepoChooser}
                          className="text-text-secondary hover:text-text-primary text-[10px] uppercase font-bold flex items-center gap-1"
                          title={t('common.backToRepo')}
                        >
                          <ArrowLeft size={12} />
                        </button>
                      )}
                    </div>
                    <div className="py-2 space-y-0.5">
                      {[
                        { id: 'open' as const, label: 'Abrir existente', icon: <FolderOpen size={14} /> },
                        { id: 'create' as const, label: 'Crear nuevo', icon: <Sparkles size={14} /> },
                        { id: 'clone' as const, label: 'Clonar de GitHub', icon: <Download size={14} /> },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setRepoStartMode(item.id)}
                          className={cn(
                            'w-full px-4 py-2 flex items-center gap-3 text-xs font-semibold tracking-wide transition-colors text-left relative',
                            repoStartMode === item.id
                              ? 'bg-secondary/10 text-secondary'
                              : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
                          )}
                        >
                          {repoStartMode === item.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />}
                          <span className={cn('shrink-0', repoStartMode === item.id ? 'text-secondary' : 'text-text-secondary/70')}>{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="repository"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col min-h-0"
                  >
                    {/* LOCAL — folder tree + ahead/behind chips */}
                    <SidebarSection title={t('sidebar.local')} count={branches.length || undefined} icon={<Monitor size={12} className="text-primary" />}>
                      {branches.length === 0 && !repoPath && (
                        <p className="px-4 py-2 text-xs text-text-secondary italic">{t('sidebar.noBranches')}</p>
                      )}
                      <BranchTree
                        branches={branches}
                        currentBranch={currentBranch}
                        tracking={branchTracking}
                        onCheckout={(b) => handleCheckoutAttempt(b)}
                        onContextMenu={(e, b) => {
                          e.preventDefault();
                          openBranchMenu({ x: e.clientX, y: e.clientY, branch: b });
                        }}
                        onDelete={(b) => setDeleteConfirm({ branch: b })}
                      />
                    </SidebarSection>

                    {/* REMOTE branches (also as tree, grouped by 'origin/...') */}
                    <SidebarSection title={t('sidebar.remote')} count={remoteBranches.length || undefined} icon={<Cloud size={12} className="text-primary" />}>
                      <RemoteBranchTree
                        branches={remoteBranches}
                        onCheckout={(b) => handleCheckoutAttempt(b)}
                        onContextMenu={(e, b) => {
                          e.preventDefault();
                          openRemoteBranchMenu({ x: e.clientX, y: e.clientY, branch: b });
                        }}
                      />
                    </SidebarSection>

                  {/* PULL REQUESTS — only when logged in to GitHub */}
                  {githubUser && (
                    <SidebarSection title={t('sidebar.pullRequests')} count={pullRequests.length || undefined}>
                      {pullRequests.length === 0 && (
                        <p className="px-4 py-1 text-[11px] text-text-secondary italic">{t('sidebar.noPRs')}</p>
                      )}
                      {pullRequests.map((pr) => (
                        <div
                          key={pr.number}
                          className={cn(
                            'group flex items-stretch text-sm transition-colors',
                            selectedPullRequest?.number === pr.number
                              ? 'bg-secondary/10 text-text-primary'
                              : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectPullRequest(pr)}
                            title={t('prDiff.view', { number: String(pr.number) })}
                            className="flex-1 min-w-0 text-left px-4 py-1.5 flex items-start gap-2"
                          >
                            <GitMerge size={14} className={cn('shrink-0 mt-0.5', pr.draft ? 'text-text-secondary' : 'text-secondary')} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-text-secondary/70">#{pr.number}</span>
                                {pr.draft && <span className="text-[9px] text-text-secondary/70 uppercase">{t('sidebar.draft')}</span>}
                              </div>
                              <p className="text-xs truncate">{pr.title}</p>
                              <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-text-secondary/70">
                                <span className="truncate">{pr.branch}</span>
                                <span className="text-secondary">+{pr.additions}</span>
                                <span className="text-error">-{pr.deletions}</span>
                              </div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => window.api?.shellOpenExternal(pr.url)}
                            title={t('sidebar.openInGitHub', { number: String(pr.number) })}
                            className="w-8 shrink-0 flex items-center justify-center text-text-secondary/70 hover:text-secondary opacity-0 group-hover:opacity-100 transition"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      ))}
                    </SidebarSection>
                  )}

                  {/* STASH */}
                  <SidebarSection
                    title={t('sidebar.stash')}
                    count={stashes.length || undefined}
                    extra={stashes.length > 1 ? (
                      showStashClearConfirm ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={async () => { await stashClear(); setShowStashClearConfirm(false); }}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-error text-white font-bold"
                          >
                            Sí, limpiar
                          </button>
                          <button
                            onClick={() => setShowStashClearConfirm(false)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-border-subtle text-text-secondary"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowStashClearConfirm(true)}
                          className="text-[9px] text-text-secondary hover:text-error transition-colors ml-1 font-medium"
                          title="Eliminar todos los stashes"
                        >
                          limpiar todo
                        </button>
                      )
                    ) : undefined}
                  >
                    {stashes.length === 0 && repoPath && (
                      <p className="px-4 py-1 text-[11px] text-text-secondary italic">{t('sidebar.noStashes')}</p>
                    )}
                    {stashes.map((s) => (
                      <StashItem key={s.index} stash={s} onApply={() => stashApply(s.index)} onDrop={() => stashDrop(s.index)} />
                    ))}
                  </SidebarSection>

                  {/* TAGS */}
                  <SidebarSection title={t('sidebar.tags')} count={tags.length || undefined}>
                    {tags.length === 0 && repoPath && (
                      <p className="px-4 py-1 text-[11px] text-text-secondary italic">{t('sidebar.noTags')}</p>
                    )}
                    {tags.map((t) => (
                      <TagItem key={t} name={t} onDelete={() => setDeleteTagConfirm(t)} />
                    ))}
                  </SidebarSection>

                  {/* WORKTREES — git's native feature for multiple checkouts of the same repo */}
                  {worktrees.length > 1 && (
                    <SidebarSection title={t('sidebar.worktrees')} count={worktrees.length}>
                      {worktrees.map((wt) => {
                        const name = wt.path.split(/[/\\]/).pop() || wt.path;
                        return (
                          <button
                            key={wt.path}
                            onClick={() => window.api?.shellOpenPath(wt.path)}
                            title={wt.path}
                            className="w-full text-left px-4 py-1.5 flex items-center gap-3 text-sm hover:bg-bg-surface/70 text-text-secondary hover:text-text-primary transition-colors"
                          >
                            <TreePine size={14} className="shrink-0 text-primary" />
                            <span className="truncate flex-1 text-left">{name}</span>
                            {wt.branch && (
                              <span className="text-[10px] font-mono text-text-secondary/70 shrink-0">{wt.branch}</span>
                            )}
                          </button>
                        );
                      })}
                    </SidebarSection>
                  )}

                    {/* SUBMODULES — only render section if there are any */}
                    {submodules.length > 0 && (
                      <SidebarSection title={t('sidebar.submodules')} count={submodules.length}>
                        {submodules.map((sm) => <SidebarItem key={sm.path} icon={<Layers size={16} />} text={sm.path} />)}
                      </SidebarSection>
                    )}
                  </motion.div>
                )
              ) : activeView === 'settings' ? (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col h-full select-none"
                >
                  <div className="px-4 py-2 border-b border-text-primary/10 flex items-center justify-between">
                    <span className="font-bold text-secondary flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <Settings size={14} /> {t('settings.title')}
                    </span>
                    <button
                      onClick={() => handleViewChange('repository')}
                      className="text-text-secondary hover:text-text-primary text-[10px] uppercase font-bold flex items-center gap-1"
                      title={t('common.backToRepo')}
                    >
                      <ArrowLeft size={12} />
                    </button>
                  </div>
                  <div className="py-2 space-y-0.5">
                    {[
                      { id: 'language', label: t('settings.language'), icon: <Globe size={14} /> },
                      { id: 'fontSize', label: t('settings.fontSize'), icon: <Type size={14} /> },
                      { id: 'defaultFolder', label: t('settings.defaultFolder'), icon: <Folder size={14} /> },
                      { id: 'theme', label: t('settings.theme'), icon: <Sparkles size={14} /> },
                      { id: 'cronometric', label: t('settings.timeline'), icon: <Sparkles size={14} /> },
                      { id: 'temporalAgent', label: t('settings.temporalAgent'), icon: <Layers size={14} /> },
                      { id: 'autoFetch', label: t('settings.autoFetch'), icon: <RotateCcw size={14} /> },
                      { id: 'osNotifications', label: t('settings.osNotifications'), icon: <AlertCircle size={14} /> },
                      { id: 'shortcuts', label: t('settings.shortcuts'), icon: <Type size={14} /> },
                      { id: 'security', label: t('settings.security'), icon: <Lock size={14} /> },
                      { id: 'updates', label: t('settings.checkUpdates'), icon: <Download size={14} /> },
                      { id: 'about', label: t('settings.about'), icon: <HelpCircle size={14} /> },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedSettingsSection(item.id)}
                        className={cn(
                          'w-full px-4 py-2 flex items-center gap-3 text-xs font-semibold tracking-wide transition-colors text-left relative',
                          selectedSettingsSection === item.id
                            ? 'bg-secondary/10 text-secondary'
                            : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
                        )}
                      >
                        {selectedSettingsSection === item.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />}
                        <span className={cn('shrink-0', selectedSettingsSection === item.id ? 'text-secondary' : 'text-text-secondary/70')}>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : activeView === 'help' ? (
                <motion.div
                  key="help"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col h-full select-none"
                >
                  <div className="px-4 py-2 border-b border-text-primary/10 flex items-center justify-between">
                    <span className="font-bold text-secondary flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <HelpCircle size={14} /> {t('toolbar.help')}
                    </span>
                    <button
                      onClick={() => handleViewChange('repository')}
                      className="text-text-secondary hover:text-text-primary text-[10px] uppercase font-bold flex items-center gap-1"
                      title={t('common.backToRepo')}
                    >
                      <ArrowLeft size={12} />
                    </button>
                  </div>
                  <div className="py-2 space-y-0.5">
                    {[
                      { id: 'whatis', label: t('page.help.whatis.title'), icon: <HelpCircle size={14} /> },
                      { id: 'columns', label: t('page.help.columns.title'), icon: <Layers size={14} /> },
                      { id: 'tabs', label: t('page.help.tabs.title'), icon: <FileText size={14} /> },
                      { id: 'states', label: t('page.help.states.title'), icon: <Sparkles size={14} /> },
                      { id: 'buttons', label: t('page.help.buttons.title'), icon: <Zap size={14} /> },
                      { id: 'flow', label: t('page.help.flow.title'), icon: <RotateCcw size={14} /> },
                      { id: 'security', label: t('page.help.security.title'), icon: <Lock size={14} /> },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedHelpSection(item.id)}
                        className={cn(
                          'w-full px-4 py-2 flex items-center gap-3 text-xs font-semibold tracking-wide transition-colors text-left relative',
                          selectedHelpSection === item.id
                            ? 'bg-secondary/10 text-secondary'
                            : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
                        )}
                      >
                        {selectedHelpSection === item.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />}
                        <span className={cn('shrink-0', selectedHelpSection === item.id ? 'text-secondary' : 'text-text-secondary/70')}>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col h-full select-none"
                >
                  <div className="px-4 py-2 border-b border-text-primary/10 flex items-center justify-between">
                    <span className="font-bold text-secondary flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <Github size={14} /> {t('toolbar.profile')}
                    </span>
                    <button
                      onClick={() => handleViewChange('repository')}
                      className="text-text-secondary hover:text-text-primary text-[10px] uppercase font-bold flex items-center gap-1"
                      title={t('common.backToRepo')}
                    >
                      <ArrowLeft size={12} />
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      className="w-full px-4 py-2 flex items-center gap-3 text-xs font-semibold tracking-wide bg-secondary/10 text-secondary text-left relative"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />
                      <span className="shrink-0 text-secondary"><Github size={14} /></span>
                      <span className="truncate">{t('profile.githubAccount')}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="shrink-0 border-t border-text-primary/10 bg-bg-base/70/35 px-3 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleViewChange(activeView === 'settings' ? 'repository' : 'settings')}
                title={t('toolbar.settings')}
                className={cn(
                  'h-9 w-9 rounded-lg border flex items-center justify-center transition-colors',
                  activeView === 'settings'
                    ? 'border-secondary/35 bg-secondary/10 text-secondary'
                    : 'border-text-primary/15 bg-text-primary/[0.035] text-text-secondary hover:border-secondary/35 hover:bg-text-primary/10 hover:text-secondary'
                )}
              >
                <Settings size={17} />
              </button>
              <button
                type="button"
                onClick={() => handleViewChange(activeView === 'help' ? 'repository' : 'help')}
                title={t('toolbar.help')}
                className={cn(
                  'h-9 w-9 rounded-lg border flex items-center justify-center transition-colors',
                  activeView === 'help'
                    ? 'border-secondary/35 bg-secondary/10 text-secondary'
                    : 'border-text-primary/15 bg-text-primary/[0.035] text-text-secondary hover:border-secondary/35 hover:bg-text-primary/10 hover:text-secondary'
                )}
              >
                <HelpCircle size={17} />
              </button>
              <div className="ml-auto">
                {githubUser ? (
                  <button
                    type="button"
                    onClick={() => handleViewChange(activeView === 'profile' ? 'repository' : 'profile')}
                    title={t('toolbar.connectedAs', { user: githubUser.login })}
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors',
                      activeView === 'profile'
                        ? 'border-secondary bg-secondary/20'
                        : 'border-secondary/35 bg-secondary/10 hover:border-secondary/60 hover:bg-secondary/15'
                    )}
                  >
                    {githubUser.avatarUrl ? (
                      <img
                        src={githubUser.avatarUrl}
                        alt={githubUser.login}
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[#a3f185] to-[#68b24f] flex items-center justify-center text-[10px] font-bold text-[#052900]">
                        {userInitials(githubUser)}
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleViewChange(activeView === 'profile' ? 'repository' : 'profile')}
                    title={t('toolbar.connectGitHub')}
                    className={cn(
                      'h-10 w-10 shrink-0 rounded-full border flex items-center justify-center transition-colors',
                      activeView === 'profile'
                        ? 'border-secondary bg-secondary/15 text-secondary'
                        : 'border-text-primary/15 bg-text-primary/[0.035] text-text-secondary hover:text-secondary hover:bg-text-primary/10 hover:border-secondary/35'
                    )}
                  >
                    <UserCircle2 size={24} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER CANVAS: Full-bleed graph in Graph tab, beautifully centered glass panel in other tabs / diffs */}
        <main
          className={cn(
            "overflow-hidden flex flex-col min-w-0",
            graphMode === 'chronometric'
              ? cn(
                  "absolute",
                  (!isTabChanging && !isViewChanging && activeView === 'repository' && !isRepoStartView) && "transition-[left,right,top,bottom] duration-300",
                  isRepoStartView
                    ? "z-40 bg-bg-overlay/60 backdrop-blur-md border border-text-primary/15 rounded-xl"
                    : !isMainFullBleed && "bg-bg-overlay/60 backdrop-blur-md border border-text-primary/15 rounded-xl"
                )
              : "relative flex-1 min-h-0 bg-bg-base"
          )}
          style={
            graphMode === 'chronometric'
              ? isMainFullBleed
                ? { top: 0, left: 0, right: 0, bottom: 0 }
                : {
                    top: 96 + FLOATING_PANEL_INSET,
                    bottom: FLOATING_PANEL_INSET,
                    left: sidebarOpen ? sidebarW + FLOATING_PANEL_INSET + GRAPH_SAFE_GAP : FLOATING_PANEL_INSET,
                    right: repositoryDetailsVisible ? detailsW + FLOATING_PANEL_INSET + GRAPH_SAFE_GAP : FLOATING_PANEL_INSET,
                  }
              : undefined
          }
        >
          {activeView === 'settings' ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-base/40">
              <div className="border-b border-border-subtle/15 shrink-0">
                <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <Settings size={18} className="text-secondary shrink-0" />
                    <h2 className="truncate text-base font-bold text-text-primary">
                      {selectedSettingsSection === 'language' && t('settings.language')}
                      {selectedSettingsSection === 'fontSize' && t('settings.fontSize')}
                      {selectedSettingsSection === 'defaultFolder' && t('settings.defaultFolder')}
                      {selectedSettingsSection === 'theme' && t('settings.theme')}
                      {selectedSettingsSection === 'cronometric' && 'Vista Cronométrica (Beta)'}
                      {selectedSettingsSection === 'temporalAgent' && 'Temporal Agent (Experimental)'}
                      {selectedSettingsSection === 'autoFetch' && t('settings.autoFetch')}
                      {selectedSettingsSection === 'osNotifications' && t('settings.osNotifications')}
                      {selectedSettingsSection === 'shortcuts' && t('settings.shortcuts')}
                      {selectedSettingsSection === 'security' && t('settings.security')}
                      {selectedSettingsSection === 'updates' && t('settings.checkUpdates')}
                      {selectedSettingsSection === 'about' && t('settings.about')}
                    </h2>
                  </div>
                  <button
                    onClick={() => handleViewChange('repository')}
                    className="shrink-0 text-text-secondary hover:text-text-primary px-3 py-1 border border-border-subtle/15 hover:border-secondary/20 rounded text-xs font-semibold tracking-wide transition-colors"
                  >
                    {t('common.backToRepo')}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto w-full select-text">
                <div className="mx-auto w-full max-w-4xl p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedSettingsSection}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-6"
                    >
                    {selectedSettingsSection === 'language' && (
                      <div className="space-y-4">
                        <p className="text-sm text-text-secondary">{t('settings.languageDesc')}</p>
                        <div className="flex gap-2">
                          {LANGS.map((l) => (
                            <button
                              key={l.code}
                              onClick={() => changeLanguage(l.code as Lang)}
                              className={cn(
                                'flex-1 px-4 py-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors',
                                language === l.code
                                  ? 'bg-secondary/15 border-secondary/50 text-secondary'
                                  : 'bg-bg-base/70 border-border-subtle/15 text-text-secondary hover:text-text-primary hover:border-border-subtle/30',
                              )}
                            >
                              <span className="text-lg">{l.flag}</span>
                              <span className="font-semibold">{l.label}</span>
                              {language === l.code && <Check size={14} strokeWidth={3} className="ml-1" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedSettingsSection === 'fontSize' && (
                      <div className="space-y-4">
                        <p className="text-sm text-text-secondary">{t('settings.fontSizeDesc')}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {FONT_SIZE_OPTIONS.map((option) => {
                            const labelKey = option.key === 'compact'
                              ? 'settings.fontCompact'
                              : option.key === 'normal'
                                ? 'settings.fontNormal'
                                : 'settings.fontLarge';
                            return (
                              <button
                                key={option.key}
                                onClick={() => changeFontSize(option.key)}
                                className={cn(
                                  'px-4 py-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors',
                                  fontSize === option.key
                                    ? 'bg-secondary/15 border-secondary/50 text-secondary'
                                    : 'bg-bg-base/70 border-border-subtle/15 text-text-secondary hover:text-text-primary hover:border-border-subtle/30',
                                )}
                              >
                                <span className="font-semibold">{t(labelKey)}</span>
                                {fontSize === option.key && <Check size={14} strokeWidth={3} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {selectedSettingsSection === 'defaultFolder' && (
                      <div className="space-y-4">
                        <p className="text-sm text-text-secondary">{t('settings.defaultFolderDesc')}</p>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 px-4 py-2.5 rounded-lg border bg-bg-base/70 border-border-subtle/15 text-sm font-mono truncate"
                            title={defaultFolder ?? ''}
                          >
                            <span className={defaultFolder ? 'text-text-primary' : 'text-text-secondary/70'}>
                              {defaultFolder ?? t('settings.defaultFolderNone')}
                            </span>
                          </div>
                          <button
                            onClick={() => pickDefaultFolder()}
                            className="px-4 py-2.5 rounded-lg border bg-bg-base/70 border-border-subtle/30 text-sm text-text-primary hover:bg-border-subtle/30 transition-colors"
                          >
                            {t('settings.defaultFolderChange')}
                          </button>
                          {defaultFolder && (
                            <button
                              onClick={() => changeDefaultFolder(null)}
                              className="px-4 py-2.5 rounded-lg border bg-bg-base/70 border-border-subtle/15 text-sm text-text-secondary hover:text-[#ffa8a3] hover:border-[#ffa8a3]/30 transition-colors"
                            >
                              {t('settings.defaultFolderClear')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedSettingsSection === 'theme' && (
                      <div className="space-y-4">
                        <p className="text-xs text-text-secondary/70 mb-2 italic">{t('settings.themeLightWarning')}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => changeTheme('dark')}
                            className={cn(
                              'flex-1 px-4 py-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors',
                              theme === 'dark'
                                ? 'bg-secondary/15 border-secondary/50 text-secondary'
                                : 'bg-bg-base/70 border-border-subtle/15 text-text-secondary hover:text-text-primary',
                            )}
                          >
                            {theme === 'dark' && <Check size={14} strokeWidth={3} />}
                            {t('settings.themeDark')}
                          </button>
                          <button
                            type="button"
                            onClick={() => changeTheme('light')}
                            className={cn(
                              'flex-1 px-4 py-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors',
                              theme === 'light'
                                ? 'bg-secondary/15 border-secondary/50 text-secondary'
                                : 'bg-bg-base/70 border-border-subtle/15 text-text-secondary hover:text-text-primary',
                            )}
                          >
                            {theme === 'light' && <Check size={14} strokeWidth={3} />}
                            {t('settings.themeLight')}
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedSettingsSection === 'cronometric' && (
                      <div className="space-y-4">
                        <p className="text-sm text-text-secondary leading-relaxed">
                          Habilita la nueva línea de tiempo interactiva avanzada basada en Canvas espacial y HUD dinámico.
                        </p>
                        <button
                          type="button"
                          onClick={() => changeEnableCronometric(!enableCronometric)}
                          className={cn(
                            'w-full px-4 py-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors font-semibold',
                            enableCronometric
                              ? 'bg-secondary/15 border-secondary/50 text-secondary'
                              : 'bg-bg-base/70 border-border-subtle/15 text-text-secondary hover:text-text-primary',
                          )}
                        >
                          {enableCronometric ? (
                            <>
                              <Check size={14} strokeWidth={3} />
                              Activa
                            </>
                          ) : (
                            'Inactiva (Usar vista clásica estable)'
                          )}
                        </button>
                      </div>
                    )}

                    {selectedSettingsSection === 'autoFetch' && (
                      <AutoFetchSection setAutoFetchPrefs={setAutoFetchPrefs} />
                    )}

                    {selectedSettingsSection === 'osNotifications' && (
                      <OsNotificationsSection setOsNotifications={setOsNotifications} />
                    )}

                    {selectedSettingsSection === 'shortcuts' && (
                      <ShortcutsSection
                        rebindShortcut={rebindShortcut}
                        resetShortcutsToDefaults={resetShortcutsToDefaults}
                      />
                    )}

                    {selectedSettingsSection === 'security' && (
                      <div className="space-y-4">
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {t('settings.dataLocation')}
                        </p>
                        <button
                          onClick={() => window.api?.shellOpenPath('https://github.com/alejandropd-1/gitcron/blob/main/SECURITY.md')}
                          className="w-full text-left px-4 py-3 bg-bg-base/70 border border-border-subtle/15 hover:border-border-subtle/30 rounded-lg text-sm text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
                        >
                          <FileText size={14} />
                          {t('settings.viewSecurity')}
                        </button>
                      </div>
                    )}

                    {selectedSettingsSection === 'updates' && (
                      <div className="space-y-4">
                        <p className="text-sm text-text-secondary">{t('settings.checkUpdatesDesc')}</p>
                        <div className="rounded-xl border border-border-subtle/15 bg-bg-base/70 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-text-primary">
                                {updateInfo
                                  ? t('update.availableTitle', { version: updateInfo.version })
                                  : t('update.currentTitle')}
                              </p>
                              <p className="mt-0.5 text-xs text-text-secondary">
                                {updateInfo
                                  ? t('update.currentVersion', { version: pkg.version })
                                  : t('update.currentDesc')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {updateStatus === 'available' && (
                                <button
                                  type="button"
                                  onClick={handleDownloadUpdate}
                                  className="px-4 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors bg-secondary/15 border-secondary/45 text-secondary hover:bg-secondary/25 font-bold"
                                >
                                  <Download size={14} />
                                  <span>{t('update.download')}</span>
                                </button>
                              )}
                              {updateStatus === 'downloaded' && (
                                <button
                                  type="button"
                                  onClick={handleInstallUpdate}
                                  className="px-4 py-2 rounded-lg border text-sm font-extrabold transition-colors bg-secondary/15 border-secondary/45 text-secondary hover:bg-secondary/25"
                                >
                                  UPDATE
                                </button>
                              )}
                              {(updateStatus === 'idle' || updateStatus === 'checking' || updateStatus === 'error') && (
                                <button
                                  type="button"
                                  onClick={handleCheckForUpdate}
                                  disabled={updateStatus === 'checking'}
                                  className="px-4 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors bg-bg-base border-border-subtle/15 text-text-secondary hover:border-secondary/40 hover:text-secondary disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                                >
                                  {updateStatus === 'checking'
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <RotateCcw size={14} />
                                  }
                                  <span>{t('settings.checkUpdatesButton')}</span>
                                </button>
                              )}
                            </div>
                          </div>
                          {updateStatus === 'downloading' && (
                            <div className="mt-3 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-bg-overlay rounded-full overflow-hidden">
                                <div className="h-full bg-secondary rounded-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-secondary w-8 text-right">{downloadProgress}%</span>
                            </div>
                          )}
                        </div>
                        <ChangelogPreview
                          entries={changelogEntries}
                          error={changelogError}
                          isLoading={changelogRaw === null && changelogError === null}
                        />
                      </div>
                    )}

                    {selectedSettingsSection === 'temporalAgent' && (
                      <div className="space-y-4">
                        {repoPath ? (
                          <TemporalAgentSettings
                            repoPath={repoPath}
                            repoName={openRepos[activeRepoIdx]?.name ?? 'repo'}
                            onPrediction={(r) => {
                              // Patch predictionIndex on all branches before storing.
                              r.branches.forEach((b, i) => {
                                if (b.predictionIndex == null) b.predictionIndex = i + 1;
                              });
                              setRawSpeculativeBranches(r.branches);
                              setSpeculativeAt(r.generatedAt);
                              setShowSpeculative(true);
                            }}
                            onConfigSaved={(cfg) => {
                              setConfidenceThreshold(cfg.skillProfile.confidenceThreshold);
                            }}
                          />
                        ) : (
                          <p className="text-sm text-text-secondary">
                            Abrí un repositorio para configurar el Temporal Agent.
                          </p>
                        )}
                      </div>
                    )}

                    {selectedSettingsSection === 'about' && (
                      <div className="space-y-4">
                        <div className="bg-bg-base/70 border border-border-subtle/15 rounded-xl p-4 text-sm space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-border-subtle/15">
                            <span className="text-text-secondary font-semibold">GitCron</span>
                            <span className="text-secondary font-mono font-bold">v{pkg.version}</span>
                          </div>
                          <div className="flex justify-between text-xs text-text-secondary/70">
                            <span>Electron + Next.js + simple-git</span>
                          </div>
                          <div className="pt-2 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => window.api.shellOpenExternal('https://github.com/alejandropd-1/gitcron/releases/')}
                              className="flex items-center gap-2 text-text-secondary hover:text-secondary transition-colors text-left font-semibold"
                            >
                              <Github size={14} />
                              <span>{t('settings.viewReleases')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => window.api.shellOpenExternal('https://aledesign.dev/')}
                              className="flex items-center gap-2 text-text-secondary/70 hover:text-secondary transition-colors text-left text-xs font-semibold"
                            >
                              <Sparkles size={13} />
                              <span>{t('settings.developedBy')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : activeView === 'help' ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-base/40">
              <div className="border-b border-border-subtle/15 shrink-0">
                <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <HelpCircle size={18} className="text-secondary shrink-0" />
                    <h2 className="truncate text-base font-bold text-text-primary">
                      {selectedHelpSection === 'whatis' && t('page.help.whatis.title')}
                      {selectedHelpSection === 'columns' && t('page.help.columns.title')}
                      {selectedHelpSection === 'tabs' && t('page.help.tabs.title')}
                      {selectedHelpSection === 'states' && t('page.help.states.title')}
                      {selectedHelpSection === 'buttons' && t('page.help.buttons.title')}
                      {selectedHelpSection === 'flow' && t('page.help.flow.title')}
                      {selectedHelpSection === 'security' && t('page.help.security.title')}
                    </h2>
                  </div>
                  <button
                    onClick={() => handleViewChange('repository')}
                    className="shrink-0 text-text-secondary hover:text-text-primary px-3 py-1 border border-border-subtle/15 hover:border-secondary/20 rounded text-xs font-semibold tracking-wide transition-colors"
                  >
                    {t('common.backToRepo')}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto w-full select-text leading-relaxed text-sm text-text-secondary">
                <div className="mx-auto w-full max-w-4xl p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedHelpSection}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                    {selectedHelpSection === 'whatis' && (
                      <p className="text-text-secondary">{t('page.help.whatis.desc')}</p>
                    )}

                    {selectedHelpSection === 'columns' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.columns.sidebarTitle')}</span>
                          <span>{t('page.help.columns.sidebarDesc')}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.columns.centerTitle')}</span>
                          <span>{t('page.help.columns.centerDesc')}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.columns.rightTitle')}</span>
                          <span>{t('page.help.columns.rightDesc')}</span>
                        </div>
                      </div>
                    )}

                    {selectedHelpSection === 'tabs' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.tabs.commitTitle')}</span>
                          <span>{t('page.help.tabs.commitDesc')}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.tabs.graphTitle')}</span>
                          <span>{t('page.help.tabs.graphDesc')}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.tabs.historyTitle')}</span>
                          <span>{t('page.help.tabs.historyDesc')}</span>
                        </div>
                      </div>
                    )}

                    {selectedHelpSection === 'states' && (
                      <div className="space-y-4">
                        <p className="text-xs text-text-secondary/70 mb-2">{t('page.help.states.intro')}</p>
                        <div className="grid grid-cols-2 gap-3 bg-bg-base/40 p-4 rounded-xl border border-border-subtle/15">
                          <StatusBadge label={t('page.help.states.modified')} count={0} color="var(--color-git-mod)" letter="M" />
                          <StatusBadge label={t('page.help.states.added')} count={0} color="var(--color-git-add)" letter="A" />
                          <StatusBadge label={t('page.help.states.deleted')} count={0} color="var(--color-git-delete)" letter="D" />
                          <StatusBadge label={t('page.help.states.untracked')} count={0} color="var(--color-text-secondary)" letter="U" />
                          <StatusBadge label={t('page.help.states.renamed')} count={0} color="var(--color-primary)" letter="R" />
                        </div>
                      </div>
                    )}

                    {selectedHelpSection === 'buttons' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.buttons.pullTitle')}</span>
                          <span>{t('page.help.buttons.pullDesc')}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.buttons.pushTitle')}</span>
                          <span>{t('page.help.buttons.pushDesc')}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.buttons.branchTitle')}</span>
                          <span>{t('page.help.buttons.branchDesc')}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.buttons.stashTitle')}</span>
                          <span>{t('page.help.buttons.stashDesc')}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-3">
                          <span className="font-semibold text-primary text-xs uppercase tracking-wider pt-0.5">{t('page.help.buttons.terminalTitle')}</span>
                          <span>{t('page.help.buttons.terminalDesc')}</span>
                        </div>
                      </div>
                    )}

                    {selectedHelpSection === 'flow' && (
                      <div className="space-y-2 bg-bg-base/40 p-4 rounded-xl border border-border-subtle/15">
                        <ol className="space-y-3 font-semibold text-text-primary text-xs">
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">1</span>
                            <span>{t('page.help.flow.step1')}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">2</span>
                            <span>{t('page.help.flow.step2')}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">3</span>
                            <span>{t('page.help.flow.step3')}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">4</span>
                            <span>{t('page.help.flow.step4')}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-border-subtle text-text-secondary flex items-center justify-center">5</span>
                            <span>{t('page.help.flow.step5')}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-secondary text-[#052900] flex items-center justify-center">✓</span>
                            <span>Click <strong className="text-secondary">{t('page.help.flow.step6')}</strong></span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-secondary text-[#052900] flex items-center justify-center">✓</span>
                            <span>Click <strong className="text-secondary">{t('page.help.flow.step7')}</strong></span>
                          </li>
                        </ol>
                      </div>
                    )}

                    {selectedHelpSection === 'security' && (
                      <p className="text-text-secondary leading-relaxed">{t('page.help.security.desc')}</p>
                    )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : activeView === 'profile' ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-base/40">
              <div className="border-b border-border-subtle/15 shrink-0">
                <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <Github size={18} className="text-secondary shrink-0" />
                    <h2 className="truncate text-base font-bold text-text-primary">
                      {t('toolbar.profile')}
                    </h2>
                  </div>
                  <button
                    onClick={() => handleViewChange('repository')}
                    className="shrink-0 text-text-secondary hover:text-text-primary px-3 py-1 border border-border-subtle/15 hover:border-secondary/20 rounded text-xs font-semibold tracking-wide transition-colors"
                  >
                    {t('common.backToRepo')}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center select-text">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="glass-overlay rounded-2xl border border-border-subtle/25 p-6 w-full max-w-4xl"
                >
                  {githubUser ? (
                    <div className="space-y-4">
                      <div className="bg-bg-base/60 border border-secondary/30 rounded-xl p-4 flex items-center gap-4">
                        {githubUser.avatarUrl ? (
                          <img src={githubUser.avatarUrl} alt={githubUser.login} className="w-16 h-16 rounded-full border border-secondary/30" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-[#68b24f] flex items-center justify-center text-base font-bold text-[#052900]">{userInitials(githubUser)}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-text-primary truncate">{githubUser.name ?? githubUser.login}</p>
                          <p className="text-xs text-secondary truncate">@{githubUser.login}</p>
                          {githubUser.email && <p className="text-[10px] text-text-secondary truncate mt-0.5">{githubUser.email}</p>}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <button onClick={() => window.api?.shellOpenPath(`https://github.com/${githubUser.login}`)} className="w-full text-left px-4 py-2.5 rounded-lg bg-bg-base/60 border border-border-subtle/15 hover:border-border-subtle/30 text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"><Github size={14} />{t('profile.viewOnGitHub')}</button>
                        <button onClick={() => navigator.clipboard.writeText(`@${githubUser.login}`)} className="w-full text-left px-4 py-2.5 rounded-lg bg-bg-base/60 border border-border-subtle/15 hover:border-border-subtle/30 text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"><Copy size={14} />{t('profile.copyUsername', { user: githubUser.login })}</button>
                      </div>
                      <button onClick={() => { disconnectGitHub(); handleViewChange('repository'); }} className="w-full px-4 py-3 rounded-lg border border-error/30 hover:border-error/60 bg-error/10 hover:bg-error/20 text-error text-xs font-bold flex items-center justify-center gap-2 transition-colors"><LogOut size={14} />{t('profile.signOut')}</button>
                    </div>
                  ) : deviceCodeInfo ? (
                    <div className="bg-bg-base/60 border border-secondary/40 rounded-xl p-5 text-center">
                      <p className="text-xs font-semibold text-[#ffd98a] mb-4">{t('profile.deviceCodeShown')}</p>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <code className="text-3xl font-mono font-bold text-secondary bg-bg-base px-4 py-2 rounded-lg border border-secondary/30 tracking-widest">{deviceCodeInfo.userCode}</code>
                        <button onClick={() => navigator.clipboard.writeText(deviceCodeInfo.userCode)} className="p-2 hover:bg-border-subtle rounded text-text-secondary hover:text-secondary" title="Copy"><Copy size={14} /></button>
                      </div>
                      <p className="text-[11px] text-text-secondary mb-3">{t('profile.browserNotOpened')}{' '}<button onClick={() => window.api?.shellOpenPath(deviceCodeInfo.verificationUri)} className="text-secondary underline">{deviceCodeInfo.verificationUri}</button></p>
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-text-secondary"><Loader2 size={14} className="animate-spin text-secondary" />{t('profile.waitingAuth')}</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-bg-base/60 border border-border-subtle/15 rounded-xl p-4">
                        <p className="font-bold text-sm text-text-primary mb-1">{t('profile.notConnected')}</p>
                        <p className="text-xs text-text-secondary leading-relaxed">{t('profile.notConnectedDesc')}</p>
                      </div>
                      <div className="flex gap-1 bg-bg-base rounded-xl p-1 border border-border-subtle/10">
                        <button onClick={() => setAuthMode('oauth')} className={cn('flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors', authMode === 'oauth' ? 'bg-secondary text-[#052900]' : 'text-text-secondary hover:text-text-primary')}>{t('profile.tabOAuth')}</button>
                        <button onClick={() => setAuthMode('token')} className={cn('flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors', authMode === 'token' ? 'bg-secondary text-[#052900]' : 'text-text-secondary hover:text-text-primary')}>{t('profile.tabToken')}</button>
                      </div>
                      {authMode === 'oauth' ? (
                        <>
                          <p className="text-xs text-text-secondary leading-relaxed">{t('profile.oauthDesc')}</p>
                          <button onClick={handleLoginWithGitHub} disabled={isLoggingIn} className="w-full py-3 bg-[#24292e] hover:bg-[#373e47] border border-[#444c56] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-black/20"><Github size={16} />{isLoggingIn ? t('profile.starting') : t('profile.continueWithGitHub')}</button>
                          <p className="text-[10px] text-text-secondary/70 text-center">{t('profile.oauthFooter')}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-text-secondary leading-relaxed">{t('profile.tokenInputDesc')}{' '}<button onClick={() => window.api?.shellOpenPath('https://github.com/settings/tokens/new?scopes=repo&description=GitCron')} className="text-secondary underline hover:opacity-80">{t('profile.tokenGenerate')}</button>{' '}{t('profile.tokenScope')} <code className="bg-bg-base px-1 rounded">repo</code>.</p>
                          <input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleConnectGitHub(); }} placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full bg-bg-base border border-border-subtle/15 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-secondary/50" />
                          <button onClick={handleConnectGitHub} disabled={!tokenInput.trim() || isLoading} className="w-full py-2.5 bg-gradient-to-br from-secondary to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-xs font-bold rounded-lg transition-colors">{isLoading ? t('profile.tokenVerifying') : t('profile.tokenConnect')}</button>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          ) : isRepoStartView ? (
            <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-base/40">
              <div className="border-b border-border-subtle/15 shrink-0">
                <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <FolderOpen size={18} className="text-secondary shrink-0" />
                    <h2 className="truncate text-base font-bold text-text-primary">
                      {repoStartMode === 'open' && 'Abrir repositorio existente'}
                      {repoStartMode === 'create' && 'Crear repositorio nuevo'}
                      {repoStartMode === 'clone' && 'Clonar repositorio'}
                    </h2>
                  </div>
                  {repoPath && (
                    <button
                      onClick={handleCloseRepoChooser}
                      className="shrink-0 text-text-secondary hover:text-text-primary px-3 py-1 border border-border-subtle/15 hover:border-secondary/20 rounded text-xs font-semibold tracking-wide transition-colors"
                    >
                      {t('common.backToRepo')}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto w-full select-text">
                <div className="mx-auto w-full max-w-4xl p-6">
                  <RepoStartPanel
                    mode={repoStartMode}
                    githubConnected={!!githubUser}
                    isLoading={isLoading}
                    onOpenExisting={handleOpenExistingFromChooser}
                    onPickCreateFolder={() => pickFolder('Elegir carpeta padre donde crear el repo')}
                    onPickCloneFolder={() => pickFolder('Elegir carpeta padre donde clonar')}
                    onCreate={handleCreateRepoFromChooser}
                    onClone={handleCloneRepoFromChooser}
                    onListRepos={() => githubToken ? listUserGitHubRepos(githubToken) : Promise.resolve([])}
                    onConnectGitHub={() => handleViewChange('profile')}
                    onComplete={handleCloseRepoChooser}
                  />
                </div>
              </div>
            </div>
          ) : selectedPullRequest ? (
            <motion.div
              key={`pr-diff-${selectedPullRequest.number}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border-subtle/15 bg-bg-base/70 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleCloseDiff}
                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-secondary transition-colors"
                  >
                    <ArrowLeft size={14} /> {t('prDiff.back')}
                  </button>
                  <span className="text-text-secondary/70">/</span>
                  <span className="text-xs font-mono text-secondary">PR #{selectedPullRequest.number}</span>
                  <div className="flex-1" />
                  {selectedPullRequest.draft && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#697789]/20 text-text-secondary uppercase">
                      {t('sidebar.draft')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => window.api?.shellOpenExternal(selectedPullRequest.url)}
                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-secondary transition-colors"
                  >
                    <ExternalLink size={13} /> {t('prDiff.open')}
                  </button>
                </div>
                <div className="flex items-start gap-3">
                  <FileDiff size={18} className="text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-text-primary truncate">{selectedPullRequest.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                      <span>@{selectedPullRequest.author}</span>
                      <span className="text-text-secondary/70">·</span>
                      <span className="font-mono text-primary">{selectedPullRequest.branch}</span>
                      <span className="text-text-secondary/70">→</span>
                      <span className="font-mono text-text-primary">{selectedPullRequest.baseBranch}</span>
                      <span className="text-text-secondary/70">·</span>
                      <span>{t('prDiff.changedFiles', { count: String(pullRequestDiff?.changedFiles ?? selectedPullRequest.changedFiles) })}</span>
                      <span className="font-mono text-secondary">+{pullRequestDiff?.additions ?? selectedPullRequest.additions}</span>
                      <span className="font-mono text-error">-{pullRequestDiff?.deletions ?? selectedPullRequest.deletions}</span>
                    </div>
                  </div>
                </div>
                {!!pullRequestDiff?.files.length && (
                  <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                    {pullRequestDiff.files.slice(0, 18).map((file) => (
                      <span
                        key={file.filename}
                        title={file.previousFilename ? `${file.previousFilename} → ${file.filename}` : file.filename}
                        className="shrink-0 max-w-[220px] truncate rounded border border-border-subtle/20 bg-bg-base px-2 py-1 text-[10px] font-mono text-text-secondary"
                      >
                        {file.filename}
                      </span>
                    ))}
                    {pullRequestDiff.files.length > 18 && (
                      <span className="shrink-0 rounded border border-border-subtle/20 bg-bg-base px-2 py-1 text-[10px] font-mono text-text-secondary/70">
                        +{pullRequestDiff.files.length - 18}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {pullRequestDiffLoading ? (
                <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
                  <Loader2 size={16} className="animate-spin mr-2 text-secondary" />
                  {t('prDiff.loading')}
                </div>
              ) : (
                <DiffViewer diff={pullRequestDiff?.diff ?? ''} filePath={t('prDiff.unifiedDiff', { number: String(selectedPullRequest.number) })} wordWrap={wordWrap} />
              )}
            </motion.div>
          ) : selectedFile ? (
            <motion.div
              key={`file-diff-${selectedFile.path}-${selectedFile.staged}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle/15 bg-bg-base/70 shrink-0">
                <button
                  onClick={handleCloseDiff}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-secondary transition-colors"
                >
                  <ArrowLeft size={14} /> Volver al graph
                </button>
                <span className="text-text-secondary/70">/</span>
                <span className="text-xs text-text-primary font-mono truncate">{selectedFile.path}</span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setWordWrap(!wordWrap)}
                  title={wordWrap ? "Ajuste de línea activo (Alt + Z) - Hacer clic para ver a lo largo" : "Ver a lo largo activo (Alt + Z) - Hacer clic para ajustar línea"}
                  className={cn(
                    "p-1 rounded border flex items-center justify-center transition-all cursor-pointer mr-1",
                    wordWrap
                      ? "border-secondary/40 bg-secondary/15 text-secondary hover:bg-secondary/25"
                      : "border-text-primary/10 bg-text-primary/[0.02] text-text-secondary hover:text-text-primary hover:border-text-primary/20"
                  )}
                >
                  {wordWrap ? <WrapText size={14} /> : <AlignLeft size={14} />}
                </button>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-bold',
                    selectedFile.status === 'modified' ? 'bg-git-mod/20 text-git-mod' :
                    selectedFile.status === 'added' ? 'bg-secondary/20 text-secondary' :
                    selectedFile.status === 'renamed' ? 'bg-primary/20 text-primary' :
                    selectedFile.status === 'untracked' ? 'bg-[#9eacc0]/20 text-text-secondary' :
                    'bg-error/20 text-error',
                  )}
                >
                  {selectedFile.status.toUpperCase()}
                </span>
              </div>
              {selectedFile.conflicted && (
                <div className="mx-4 mt-3 p-4 bg-bg-overlay/80 backdrop-blur-md border border-git-mod/30 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-git-mod shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-text-primary text-sm">Este archivo tiene conflictos de fusión</h4>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                        Elegí qué cambios conservar para resolver el conflicto al instante, o editalo manualmente en tu IDE y stagealo.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        await resolveConflict(selectedFile.path, 'ours');
                        handleCloseDiff();
                      }}
                      className="px-3 py-1.5 bg-secondary/20 hover:bg-secondary hover:text-[#052900] text-secondary text-xs font-bold rounded-lg border border-secondary/40 transition-all active:scale-[0.98]"
                    >
                      Aceptar Local (HEAD)
                    </button>
                    <button
                      onClick={async () => {
                        await resolveConflict(selectedFile.path, 'theirs');
                        handleCloseDiff();
                      }}
                      className="px-3 py-1.5 bg-primary/20 hover:bg-primary hover:text-[#020f1e] text-primary text-xs font-bold rounded-lg border border-[#5ed8ff]/40 transition-all active:scale-[0.98]"
                    >
                      Aceptar Entrante (Merge)
                    </button>
                  </div>
                </div>
              )}
              <DiffViewer diff={currentDiff} filePath={selectedFile.path} wordWrap={wordWrap} />
            </motion.div>
          ) : activeTab === 'History' ? (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <HistoryView
                commits={commits}
                selectedHash={selectedCommit?.hash}
                currentBranch={currentBranch}
                filterText={filterText}
                onSelect={handleSelectCommit}
                onContextMenu={(e, c) => openContextMenu({ x: e.clientX, y: e.clientY, hash: c.hash })}
                isLoading={isLoading}
              />
            </motion.div>
          ) : activeTab === 'Commit' ? (
            <motion.div
              key="commit-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <CommitTabView
                modifiedFiles={modifiedFiles}
                hasGithubUser={!!githubUser}
              />
            </motion.div>
          ) : (
            /* Graph tab — default */
            <div className={cn("flex-1 relative min-h-0", graphMode !== 'chronometric' && "bg-bg-base")}>
              <AnimatePresence>
                {activeGraphMode === 'classic' && (
                  <motion.div
                    key="classic-graph"
                    className={cn("absolute inset-0 flex flex-col", !isDragging && "transition-[padding] duration-300")}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    style={{
                      paddingTop: 96 + FLOATING_PANEL_INSET,
                      paddingBottom: FLOATING_PANEL_INSET,
                      paddingLeft: sidebarOpen ? sidebarW + FLOATING_PANEL_INSET + GRAPH_SAFE_GAP : FLOATING_PANEL_INSET,
                      paddingRight: repositoryDetailsVisible ? detailsW + FLOATING_PANEL_INSET + GRAPH_SAFE_GAP : FLOATING_PANEL_INSET,
                    }}
                  >
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-overlay/60 backdrop-blur-md border border-text-primary/15 rounded-xl">
                    <div className="sticky top-0 bg-bg-surface/75 border-b border-border-subtle/15 z-10 h-9 flex items-center text-[11px] text-text-secondary uppercase tracking-wider font-bold shrink-0">
                      <div className="shrink-0 text-right pl-3 pr-3" style={{ width: graphColumns.refs }}>Branch / Tag</div>
                      <GraphColumnHandle onMouseDown={startGraphColDrag('refs')} />
                      <div className="shrink-0 text-left px-2" style={{ width: graphColumns.graph }}>Graph</div>
                      <GraphColumnHandle onMouseDown={startGraphColDrag('graph')} />
                      <div className="flex-1 flex items-center gap-2 pl-5">
                        Commit message
                        {speculativeBranches.length > 0 && (
                          <button
                            onClick={() => {
                              handleChangeGraphMode('chronometric');
                              setShowSpeculative(true);
                            }}
                            className="text-[9px] normal-case px-2 py-0.5 rounded bg-[#5ed8ff]/10 text-[#5ed8ff] border border-[#5ed8ff]/30 hover:bg-[#5ed8ff]/20 transition-colors font-mono"
                            title={`${speculativeBranches.length} ramas especulativas disponibles`}
                          >
                            {speculativeBranches.length} futuros →
                          </button>
                        )}
                        {filterText.trim() && (
                          <span className="text-[10px] normal-case px-1.5 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30">
                            filtro activo
                          </span>
                        )}
                      </div>
                      <GraphColumnHandle onMouseDown={startGraphColDrag('date', -1)} />
                      <div className="flex items-center pr-3 text-right shrink-0">
                        <span className="pr-3" style={{ width: graphColumns.date }}>Date</span>
                        <GraphColumnHandle onMouseDown={startGraphColDrag('date')} />
                        <span style={{ width: graphColumns.hash }}>Commit</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin relative">
                      <AnimatePresence mode="wait">
                        {!isStartupGraphReady ? (
                          <motion.div
                            key="classic-loading"
                            className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary text-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Loader2 size={18} className="animate-spin mb-3 text-secondary" />
                            <p>Cargando graph...</p>
                          </motion.div>
                        ) : commits.length === 0 && isLoading ? (
                          <motion.div
                            key="classic-loading-commits"
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <p className="text-text-secondary text-sm">Cargando commits...</p>
                          </motion.div>
                        ) : commits.length > 0 ? (
                          <motion.div
                            key="classic-commits"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                          >
                            <CommitGraph
                              commits={commits}
                              selectedHash={selectedCommit?.hash}
                              currentBranch={currentBranch}
                              workingTreeFiles={modifiedFiles}
                              filterText={filterText}
                              columnWidths={graphColumns}
                              onSelect={handleSelectCommit}
                              onContextMenu={(e, c) => setContextMenu({ x: e.clientX, y: e.clientY, hash: c.hash })}
                            />
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                    </div>
                  </motion.div>
                )}

                {activeGraphMode === 'chronometric' && (
                  <motion.div
                    key="chronometric-graph"
                    className="absolute inset-0 flex flex-col overflow-visible"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <AnimatePresence mode="wait">
                      {!isStartupGraphReady ? (
                        <motion.div
                          key="chrono-loading"
                          className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary text-sm"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Loader2 size={18} className="animate-spin mb-3 text-secondary" />
                          <p>Cargando graph...</p>
                        </motion.div>
                      ) : commits.length === 0 && isLoading ? (
                        <motion.div
                          key="chrono-loading-commits"
                          className="absolute inset-0 flex items-center justify-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <p className="text-text-secondary text-sm">Cargando commits...</p>
                        </motion.div>
                      ) : commits.length > 0 ? (
                        <motion.div
                          key="chrono-commits"
                          className="absolute inset-0 flex flex-col overflow-visible"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                        >
                          {/* Temporal Agent overlay toggle + last-prediction date. */}
                          <div
                            className="absolute z-40 top-3 flex items-center gap-2"
                            style={{ left: leftGraphSafe + 16 }}
                          >
                            <button
                              onClick={() => setShowSpeculative((v) => !v)}
                              className={cn(
                                'px-3 py-1.5 rounded-md text-xs font-mono font-bold tracking-wide border transition-colors',
                                showSpeculative
                                  ? 'bg-[#5ed8ff]/15 text-[#5ed8ff] border-[#5ed8ff]/50'
                                  : 'bg-bg-overlay/60 text-text-secondary border-text-primary/15 hover:text-[#5ed8ff] hover:border-[#5ed8ff]/40',
                              )}
                              title={t('centauro.futurosTooltip')}
                            >
                              {showSpeculative ? t('centauro.futurosOn') : t('centauro.futurosOff')}
                            </button>
                            {speculativeAt && (
                              <span
                                className="px-2 py-1 rounded bg-bg-overlay/50 text-[10px] font-mono text-text-secondary/80 border border-text-primary/10"
                                title={new Date(speculativeAt).toLocaleString()}
                              >
                                {t('centauro.lastPrediction', { date: new Date(speculativeAt).toLocaleString() })}
                              </span>
                            )}
                          </div>
                          <ChronometricGraph
                            commits={commits}
                            selectedHash={selectedCommit?.hash}
                            currentBranch={currentBranch}
                            filterText={filterText}
                            onSelect={handleSelectCommit}
                            onContextMenu={(e, c) => openContextMenu({ x: e.clientX, y: e.clientY, hash: c.hash })}
                            speculativeBranches={speculativeBranches}
                            showSpeculative={showSpeculative}
                            onToggleSpeculative={() => setShowSpeculative((v) => !v)}
                            hudLeft={leftGraphSafe}
                            hudRight={rightGraphSafe}
                            localBranches={branches}
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </main>

        {/* RIGHT PANEL: Commit details + staging — floats in chronometric view, inline in classic view */}
        <aside
          className={cn(
            "flex flex-col overflow-hidden z-30",
            !isDragging && "transition-all duration-300",
            graphMode === 'chronometric'
              ? "absolute bg-bg-overlay/60 backdrop-blur-md border border-text-primary/15 rounded-xl"
              : "relative bg-bg-base/70 border-l border-border-subtle/30 shrink-0"
          )}
          style={
            graphMode === 'chronometric'
              ? {
                  top: 96 + FLOATING_PANEL_INSET,
                  right: FLOATING_PANEL_INSET,
                  bottom: FLOATING_PANEL_INSET,
                  width: detailsW,
                  transform: repositoryDetailsVisible ? 'translateX(0)' : `translateX(calc(100% + ${FLOATING_PANEL_INSET * 2}px))`,
                  opacity: repositoryDetailsVisible ? 1 : 0,
                  visibility: repositoryDetailsVisible ? 'visible' : 'hidden',
                }
              : {
                  width: repositoryDetailsVisible ? detailsW : 0,
                  opacity: repositoryDetailsVisible ? 1 : 0,
                  visibility: repositoryDetailsVisible ? 'visible' : 'hidden',
                }
          }
        >
          {/* Left-edge resize handle */}
          <div
            onMouseDown={startColDrag('details')}
            className="group absolute top-0 left-0 h-full w-2 cursor-col-resize z-40"
            title="Arrastrar para redimensionar"
          >
            <div className="absolute inset-y-3 left-0.5 w-px bg-transparent group-hover:bg-secondary/45 group-active:bg-secondary/70 transition-colors" />
          </div>
          {selectedCommit ? (
            <div className="flex flex-col h-full">
              {/* Header bar: matches Unstaged header exactly in size, padding and font */}
              <div className="px-4 py-2 border-b border-border-subtle/15 bg-bg-surface/75 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  {t('commit.detailsTitle')}
                </span>
                <button
                  onClick={() => setSelectedCommit(null)}
                  className="text-[10px] text-text-secondary hover:text-[#052900] px-2 py-0.5 rounded border border-border-subtle/15 hover:bg-secondary hover:border-secondary/40 transition-colors"
                  title={t('commit.goToStagingTooltip')}
                >
                  {t('commit.viewChangesBtn')}
                </button>
              </div>
              {/* WIP banner: visible when commit is selected but there are unsaved changes */}
              {modifiedFiles.length > 0 && (
                <div className="px-3 py-2 bg-git-mod/10 border-b border-git-mod/20 flex items-center gap-2 shrink-0">
                  <Archive size={13} className="text-git-mod shrink-0" />
                  <span className="text-[11px] text-text-primary flex-1">
                    {t('commit.unstagedChangesCount', { count: modifiedFiles.length })}
                  </span>
                  <button
                    onClick={stashChanges}
                    disabled={isLoading}
                    className="text-[10px] font-bold text-git-mod hover:text-[#052900] hover:bg-git-mod px-2 py-0.5 rounded border border-git-mod/40 transition-colors disabled:opacity-50"
                    title={t('commit.stashTooltip')}
                  >
                    Stash
                  </button>
                </div>
              )}
              <div className="p-4 border-b border-border-subtle/15 bg-bg-surface/75 shrink-0">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[12px] font-mono text-secondary select-text">commit: {selectedCommit.shortHash}</div>
                  <button className="flex items-center gap-1.5 px-2 py-1 rounded bg-border-subtle text-xs hover:bg-bg-surface/70 transition-colors">
                    <Zap size={12} className="text-git-mod" /> {t('commit.explainBtn')}
                  </button>
                </div>
                <h2 className="font-semibold mb-1 select-text">{selectedCommit.message}</h2>
                <div className="text-xs text-text-secondary mb-4 select-text">{formatDate(selectedCommit.date)}</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                    {initials(selectedCommit.authorName)}
                  </div>
                  <div>
                    <div className="text-sm font-medium select-text">{selectedCommit.authorName}</div>
                    <div className="text-[10px] text-text-secondary select-text">{selectedCommit.authorEmail}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-2 border-b border-border-subtle/15 flex justify-between items-center bg-bg-surface/75">
                  <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                    {commitFilesLoading
                      ? t('commit.loadingFiles')
                      : t('commit.changedFilesCount', { count: commitFiles.length })}
                  </span>
                </div>
                <div className="p-1">
                  {commitFiles.map((file) => (
                    <button
                      key={file.path}
                      onClick={async () => {
                        if (!repoPath || !window.api) return;
                        setIsTabChanging(true);
                        const r = await window.api.gitDiffAtCommit(repoPath, file.path, selectedCommit!.hash);
                        if (r.success && r.data) {
                          useGitStore.getState().setCurrentDiff(r.data);
                          useGitStore.getState().setSelectedFile(file);
                        }
                        setTimeout(() => {
                          setIsTabChanging(false);
                        }, 150);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                        selectedFile?.path === file.path
                          ? 'bg-secondary/10 text-secondary'
                          : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
                      )}
                    >
                      <span className={cn(
                        'text-[10px] font-bold w-4 shrink-0',
                        file.status === 'added' ? 'text-secondary' :
                        file.status === 'deleted' ? 'text-error' :
                        file.status === 'renamed' ? 'text-primary' :
                        'text-git-mod',
                      )}>
                        {file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : file.status === 'renamed' ? 'R' : 'M'}
                      </span>
                      <span className="truncate text-xs select-text">{file.path}</span>
                    </button>
                  ))}
                  {!commitFilesLoading && commitFiles.length === 0 && (
                    <p className="px-4 py-4 text-xs text-text-secondary/70 text-center">{t('commit.noFiles')}</p>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border-subtle/15 bg-bg-surface/75">
                <textarea
                  className="w-full bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-sm text-text-primary h-24 focus:outline-none focus:border-secondary/30 resize-none"
                  placeholder={t('staging.commitMsgPlaceholder')}
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                />
                <button
                  onClick={commitChanges}
                  disabled={isLoading || !commitMessage.trim() || !repoPath}
                  className="w-full mt-3 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold text-[#052900] rounded transition-colors shadow-lg shadow-secondary/20"
                >
                  {isLoading
                    ? t('staging.committingState')
                    : t('staging.commitWithCountBtn', { count: modifiedFiles.filter((f) => f.staged).length })}
                </button>
              </div>
            </div>
          ) : (
            /* Working tree: Unstaged ↑↓ Staged */
            <StagingPanel
              files={modifiedFiles}
              selectedFile={selectedFile}
              repoPath={repoPath}
              commitMessage={commitMessage}
              setCommitMessage={setCommitMessage}
              isLoading={isLoading}
              onSelectFile={handleSelectFile}
              onStage={(path, stage) => stageFile(path, stage)}
              onStageMany={(paths, stage) => stageFiles(paths, stage)}
              onDiscard={(path) => discardFileChanges(path)}
              onCommit={commitChanges}
              onRequestAmend={() => setShowAmend(true)}
              onRequestSquash={() => setShowSquash(true)}
              onFileContextMenu={(e, file) => {
                e.preventDefault();
                openFileContextMenu({ x: e.clientX, y: e.clientY, file });
              }}
              onRequestResetAll={() => setShowResetConfirm(true)}
            />
          )}
        </aside>

        {/* LCAR-29 right-side decorative panel — cronométrico only when Graph tab is active and no diff is open */}
        <AnimatePresence>
          {activeView === 'repository' && !isRepoStartView && activeGraphMode === 'chronometric' && activeTab === 'Graph' && !selectedFile && !selectedPullRequest && (
            <motion.div
              key="lcar-right-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="absolute pointer-events-none select-none"
              style={{
                top: 0,
                right: 0,
                bottom: 0,
                height: '100%',
                width: 'auto',
                aspectRatio: '513 / 600',
                zIndex: 2,
                overflow: 'hidden',
              }}
            >
              <svg
                viewBox="0 0 513 600"
                className="h-full w-auto"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block' }}
              >
                <defs>
                  <style>{`
                    .cls-1 { fill: #36a9d4; }
                    .cls-2 { fill: #8dd5e2; }
                  `}</style>
                </defs>

                {/* Solid curved mask backing - matches the precise circular sweep of the LCARS arc with smooth Bezier curves */}
                <path
                  d="M 144,0 C 260,30 380,100 371,200 C 360,300 220,400 140,470 C 80,520 20,560 0,600 L 513,600 L 513,0 Z"
                  fill="var(--color-bg-base)"
                />

                {/* SVG Decorative layers */}
                <g id="Layer_7" data-name="Layer 7" opacity="0.18">
                  <path className="cls-2" d="M337.63,396.05c-20.91,23.6-45.29,47.37-72.67,69.69l17.03,135.11h160.93l-105.3-204.8Z" />
                  <path className="cls-2" d="M263.86,457.16c24.11-19.84,48.1-42.77,70.19-68l-35.18-69.3c-14.59,17.32-30.74,35.23-45.65,51.47l10.64,85.84Z" />
                  <path className="cls-1" d="M334.63,276.08s-.04.05-.05.07c-10.08,13-20.39,25.78-30.86,38.32l36.84,69.4c16.31-19.1,31.48-39.46,44.78-60.76l-50.71-47.03Z" />
                  <path className="cls-1" d="M275.79,600.85l-15.95-130.99-11.48-92.72c-21.84,23.61-43.73,45.61-64.97,66.38l-12.36,75.43-13.17,81.9h117.93Z" />
                  <path className="cls-2" d="M44.66,566.01c3.99-.79,56.32-11.46,119.91-43.71l11.77-71.9c-51.81,50.17-99.19,89.04-131.68,115.61Z" />
                  <path className="cls-2" d="M415.87,264.27l-57.01-26.35c-7.69,15.82-16.13,27.52-20.81,33.68l50.31,46.65c10.59-17.44,19.89-35.49,27.51-53.97Z" />
                  <path className="cls-1" d="M418.34,258.1c.24-.61.5-1.22.73-1.83,6.9-18.01,12.78-40.03,15.59-62.99l-60.47-5.01c-2.21,16.43-7.05,31.24-12.62,43.82l56.77,26.02Z" />
                  <path className="cls-2" d="M162.86,532.72c-40.79,20.79-85.21,36.69-132.37,44.76-18.86,15.11-29.99,23.38-29.99,23.38h151.48l10.88-68.13Z" />
                  <path className="cls-2" d="M440.71,125.84c.75,3.4,5.5,26.77,2.11,62.17l70.58,5.9v-84.92l-72.68,16.84Z" />
                  <path className="cls-1" d="M390.91,328.26c-3.63,5.73-7.49,11.55-11.6,17.47-10.14,14.6-21.9,29.77-35.14,45.08l108.31,210.05h60.92v-159.16l-122.48-113.43Z" />
                  <path className="cls-2" d="M513.39,308.74l-90.58-41.36c-7.22,17.63-16.65,36.27-28.87,56.04l119.44,110.59v-125.27Z" />
                  <path className="cls-1" d="M442.19,193.92c-2.44,20.76-7.59,43.05-16.91,67.25l88.12,39.9v-101.24l-71.2-5.92Z" />
                  <path className="cls-2" d="M435.31,187.37c1.96-20.01,1.46-40.53-2.82-59.58l-59.87,13.81c.03.13.05.26.07.37,2.9,14.17,3.35,27.71,2.18,40.37l60.44,5.04Z" />
                </g>
                <g id="Layer_20" data-name="Layer 20" opacity="0.18">
                  <path className="cls-2" d="M268.76,39.18c68.95,13.6,97.25,74.72,102.42,95.82l142.22-33.6V-.51H172.23l-28.16,19.88,35.35,26.61c49.53-16.51,89.35-6.8,89.35-6.8Z" />
                </g>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ──────────── SUCCESS TOAST (auto-dismiss 3s) ──────────── */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 glass-alert-success rounded-lg shadow-2xl flex items-center gap-3 z-50 max-w-xl"
          >
            <Check size={18} className="shrink-0" />
            <span className="text-sm font-medium">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-3 hover:opacity-70 shrink-0 text-secondary">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── PULL DECISION TOAST ──────────── */}
      <AnimatePresence>
        {pullDecision && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 glass-alert-warning text-text-primary rounded-lg shadow-2xl flex items-center gap-3 z-50 w-[min(calc(100vw-2rem),760px)]"
          >
            <AlertCircle size={20} className="shrink-0 text-[#f4b942]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#ffd98a] leading-tight">
                {pullDecision.mode === 'diverged'
                  ? t('pullDecision.divergedTitle', { branch: pullDecision.branch })
                  : t('pullDecision.behindTitle', { branch: pullDecision.branch })}
              </p>
              <p className="text-xs text-text-secondary mt-0.5 leading-snug">
                {pullDecision.mode === 'diverged'
                  ? pullDecision.source === 'push'
                    ? t('pullDecision.divergedPushDesc', { behind: pullDecision.behind, ahead: pullDecision.ahead })
                    : t('pullDecision.divergedPullDesc', { behind: pullDecision.behind, ahead: pullDecision.ahead })
                  : t('pullDecision.behindDesc', { behind: pullDecision.behind })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pullDecision.mode === 'behind' && (
                <button
                  type="button"
                  onClick={() => void handlePullDecision('ff-only')}
                  className="px-3 py-1.5 text-xs font-bold bg-secondary/20 hover:bg-secondary/30 text-secondary rounded transition-colors whitespace-nowrap"
                  title={t('pullDecision.ffTooltip')}
                >
                  {t('pullDecision.ffBtn')}
                </button>
              )}
              {pullDecision.mode === 'diverged' && (
                <button
                  type="button"
                  onClick={() => void handlePullDecision('rebase')}
                  className="px-3 py-1.5 text-xs font-bold bg-secondary/20 hover:bg-secondary/30 text-secondary rounded transition-colors whitespace-nowrap"
                  title={t('pullDecision.rebaseTooltip')}
                >
                  {t('pullDecision.rebaseBtn')}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handlePullDecision('merge')}
                className="px-3 py-1.5 text-xs font-bold bg-[#f4b942]/15 hover:bg-[#f4b942]/25 text-[#ffd98a] rounded transition-colors whitespace-nowrap"
                title={t('pullDecision.mergeTooltip')}
              >
                {t('pullDecision.mergeBtn')}
              </button>
            </div>
            <button onClick={() => setPullDecision(null)} className="hover:opacity-70 shrink-0 text-[#ffd98a]">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── ERROR TOAST ──────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 p-3 bg-[#9f0519] text-[#ffdad6] rounded-lg shadow-2xl flex items-start gap-3 z-50 border border-[#ffa8a3]/20 max-w-xl"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <span className="text-sm font-medium flex-1 whitespace-pre-line">{error}</span>
            {/* Recovery action when git index is locked */}
            {error.toLowerCase().includes('index.lock') && (
              <button
                onClick={async () => {
                  const ok = await removeIndexLock();
                  if (ok) setError(null);
                }}
                className="shrink-0 px-3 py-1 text-xs font-bold bg-[#ffa8a3]/20 hover:bg-[#ffa8a3]/30 text-[#ffdad6] rounded transition-colors"
                title="Borra .git/index.lock y refresca el estado"
              >
                Eliminar lock
              </button>
            )}
            {canTrustSafeDirectory && (
              <button
                onClick={handleTrustSafeDirectory}
                disabled={isLoading}
                className="shrink-0 px-3 py-1 text-xs font-bold bg-[#ffa8a3]/20 hover:bg-[#ffa8a3]/30 text-[#ffdad6] rounded transition-colors disabled:opacity-50"
                title="Agrega esta carpeta a git config --global safe.directory y vuelve a abrirla"
              >
                Confiar carpeta
              </button>
            )}
            <button onClick={() => setError(null)} className="hover:opacity-70 shrink-0">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── NEW BRANCH MODAL ──────────── */}
      <AnimatePresence>
        {showNewBranch && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setShowNewBranch(false)}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[420px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-secondary flex items-center gap-2"><GitBranch size={16} /> {t('newBranch.title')}</h3>
                <button onClick={() => setShowNewBranch(false)} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
              </div>
              {newBranchFrom && (
                <p className="text-xs text-text-secondary mb-3">
                  {t('newBranch.fromCommit')} <span className="font-mono text-secondary">{newBranchFrom.slice(0, 7)}</span>
                </p>
              )}
              <input
                ref={newBranchInputRef}
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBranch(); if (e.key === 'Escape') setShowNewBranch(false); }}
                placeholder={t('newBranch.namePlaceholder')}
                className="w-full bg-bg-base/70 border border-border-subtle/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary/50 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNewBranch(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">{t('modal.cancel')}</button>
                <button
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim() || isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded"
                >
                  <Plus size={14} className="inline mr-1" /> {t('modal.create')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ──────────── BRANCH CONTEXT MENU ──────────── */}
      <AnimatePresence>
        {branchMenu && (
          <BranchContextMenu
            x={branchMenu.x}
            y={branchMenu.y}
            branch={branchMenu.branch}
            currentBranch={currentBranch}
            tracking={branchTracking[branchMenu.branch]}
            onMerge={() => { performMerge(branchMenu.branch, currentBranch); setBranchMenu(null); }}
            onRebase={() => { rebaseOnto(branchMenu.branch); setBranchMenu(null); }}
            onFastForward={() => { fastForwardBranch(branchMenu.branch, `origin/${branchMenu.branch}`); setBranchMenu(null); }}
            onPull={() => { pullSpecificBranch(branchMenu.branch); setBranchMenu(null); }}
            onPush={() => { pushSpecificBranch(branchMenu.branch); setBranchMenu(null); }}
            onCheckout={() => { handleCheckoutAttempt(branchMenu.branch); setBranchMenu(null); }}
            onRename={() => { setRenameModal({ oldName: branchMenu.branch, newName: branchMenu.branch }); setBranchMenu(null); }}
            onDelete={() => { setDeleteConfirm({ branch: branchMenu.branch }); setBranchMenu(null); }}
            onCopyName={() => { navigator.clipboard.writeText(branchMenu.branch); setBranchMenu(null); }}
            onCreateFrom={() => { setNewBranchFrom(branchMenu.branch); setShowNewBranch(true); setBranchMenu(null); }}
            onClose={() => setBranchMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* ──────────── REMOTE BRANCH CONTEXT MENU ──────────── */}
      <AnimatePresence>
        {remoteBranchMenu && (
          <RemoteBranchContextMenu
            x={remoteBranchMenu.x}
            y={remoteBranchMenu.y}
            branch={remoteBranchMenu.branch}
            onCheckout={() => { handleCheckoutAttempt(remoteBranchMenu.branch); setRemoteBranchMenu(null); }}
            onCopyName={() => { navigator.clipboard.writeText(remoteBranchMenu.branch); setRemoteBranchMenu(null); }}
            onCreateFrom={() => { setNewBranchFrom(remoteBranchMenu.branch); setShowNewBranch(true); setRemoteBranchMenu(null); }}
            onClose={() => setRemoteBranchMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* ──────────── MERGE: needs checkout to target branch first ──────────── */}
      <AnimatePresence>
        {mergeNeedsCheckout && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setMergeNeedsCheckout(null)}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[580px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <GitMerge size={22} className="text-secondary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary mb-1">{t('mergeCheckout.title', { branch: mergeNeedsCheckout.targetBranch })}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {t('mergeCheckout.desc', { src: mergeNeedsCheckout.sourceBranch, dst: mergeNeedsCheckout.targetBranch })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setMergeNeedsCheckout(null)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                >
                  {t('modal.cancel')}
                </button>
                <button
                  onClick={async () => {
                    const { sourceBranch, targetBranch } = mergeNeedsCheckout;
                    setMergeNeedsCheckout(null);
                    const co = await checkoutBranch(targetBranch);
                    if (co.success) {
                      await mergeIntoCurrent(sourceBranch);
                    } else if (co.conflict) {
                      setCheckoutConflict({ branch: targetBranch, error: co.error ?? '' });
                    }
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded flex items-center gap-2"
                >
                  <GitMerge size={14} />
                  {t('mergeCheckout.button', { branch: mergeNeedsCheckout.targetBranch })}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── RENAME BRANCH MODAL ──────────── */}
      <AnimatePresence>
        {renameModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setRenameModal(null)}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[420px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-secondary flex items-center gap-2"><GitBranch size={16} /> {t('rename.title')}</h3>
                <button onClick={() => setRenameModal(null)} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
              </div>
              <p className="text-xs text-text-secondary mb-2">{t('rename.renaming')}</p>
              <p className="text-sm text-text-primary font-mono bg-bg-base px-3 py-1.5 rounded mb-3">{renameModal.oldName}</p>
              <input
                autoFocus
                value={renameModal.newName}
                onChange={(e) => setRenameModal({ ...renameModal, newName: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Escape') setRenameModal(null); }}
                placeholder={t('rename.newName')}
                className="w-full bg-bg-base border border-border-subtle/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary/50 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setRenameModal(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">{t('modal.cancel')}</button>
                <button
                  onClick={async () => {
                    const newName = renameModal.newName.trim();
                    if (!newName || newName === renameModal.oldName) { setRenameModal(null); return; }
                    const ok = await renameBranch(renameModal.oldName, newName);
                    if (ok) setRenameModal(null);
                  }}
                  disabled={!renameModal.newName.trim() || renameModal.newName === renameModal.oldName || isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded"
                >
                  {t('rename.button')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── DELETE BRANCH CONFIRM ──────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[540px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <Trash2 size={20} className="text-error shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary mb-1">
                    {deleteConfirm.branch.startsWith('imagined/') ? 'Descartar futuro materializado' : t('deleteBranch.title')}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {deleteConfirm.branch.startsWith('imagined/')
                      ? `¿Estás seguro de que deseas descartar este futuro? Esto eliminará de forma permanente la branch real "${deleteConfirm.branch}" y su tag de flight level asociado.`
                      : t('deleteBranch.confirm', { branch: deleteConfirm.branch })}
                  </p>
                  {deleteConfirm.notMerged && (
                    <p className="text-xs text-git-mod mt-2 leading-relaxed">
                      {t('deleteBranch.notMergedWarning')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">{t('modal.cancel')}</button>
                <button
                  onClick={async () => {
                    const r = await deleteBranch(deleteConfirm.branch, deleteConfirm.notMerged === true);
                    if (r.success) {
                      setDeleteConfirm(null);
                    } else if (r.notMerged && !deleteConfirm.notMerged) {
                      // Re-show modal in "force" mode
                      setDeleteConfirm({ branch: deleteConfirm.branch, notMerged: true });
                    } else {
                      setDeleteConfirm(null);
                    }
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-error hover:bg-[#ffa8a3] disabled:opacity-50 text-[#490006] text-sm font-bold rounded"
                >
                  {deleteConfirm.notMerged ? t('deleteBranch.force') : t('deleteBranch.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── DELETE TAG CONFIRM ──────────── */}
      <AnimatePresence>
        {deleteTagConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setDeleteTagConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[540px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <Trash2 size={20} className="text-error shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary mb-1">Eliminar Tag</h3>
                  <p className="text-sm text-text-secondary">
                    ¿Estás seguro de que deseas eliminar el tag <span className="font-bold text-text-primary">{deleteTagConfirm}</span>?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteTagConfirm(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">{t('modal.cancel')}</button>
                <button
                  onClick={async () => {
                    const r = await deleteTag(deleteTagConfirm);
                    if (r.success) {
                      setDeleteTagConfirm(null);
                    } else {
                      setDeleteTagConfirm(null);
                    }
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-error hover:bg-[#ffa8a3] disabled:opacity-50 text-[#490006] text-sm font-bold rounded"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── FORCE PUSH CONFIRM MODAL ──────────── */}
      <AnimatePresence>
        {forcePushConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[300]"
            onClick={() => {
              forcePushConfirm.resolve(false);
              setForcePushConfirm(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-[#152335]/98 backdrop-blur-xl border border-[#ffa8a3]/20 rounded-2xl p-6 w-[480px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="p-3 bg-[#9f0519]/25 rounded-xl border border-[#9f0519]/40 text-[#ff8b87] shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-lg text-[#ffdad6] mb-2 tracking-tight">{t('page.modals.forcePush.title')}</h3>
                  <p className="text-sm text-[#ccdbe8] leading-relaxed mb-3">
                    {t('page.modals.forcePush.desc')}
                  </p>
                  <div className="bg-bg-base/80 border border-border-subtle/25 rounded-xl p-3 mb-1">
                    <p className="text-[11px] text-[#ff8b87] uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
                      {t('page.modals.forcePush.warningTitle')}
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {t('page.modals.forcePush.warningDesc')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    forcePushConfirm.resolve(false);
                    setForcePushConfirm(null);
                  }}
                  className="px-5 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-[#1a2e44]/50 rounded-xl transition duration-200"
                >
                  {t('modal.cancel')}
                </button>
                <button
                  onClick={() => {
                    forcePushConfirm.resolve(true);
                    setForcePushConfirm(null);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-br from-[#ff8b87] to-[#d63a35] hover:from-[#ff9f9c] hover:to-[#e64742] shadow-lg shadow-[#d63a35]/20 text-[#fff0ef] text-sm font-bold rounded-xl transition duration-200"
                >
                  {t('page.modals.forcePush.confirmBtn')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── CHECKOUT CONFLICT MODAL ──────────── */}
      <AnimatePresence>
        {checkoutConflict && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setCheckoutConflict(null)}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[580px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle size={22} className="text-git-mod shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary mb-1">{t('checkoutConflict.title')}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {t('checkoutConflict.desc', { branch: checkoutConflict.branch })}
                  </p>
                </div>
              </div>

              <div className="bg-bg-base border border-border-subtle/15 rounded p-3 mb-4 text-[11px] font-mono text-text-secondary/70 max-h-32 overflow-y-auto">
                {checkoutConflict.error}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setCheckoutConflict(null)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
                >
                  {t('modal.cancel')}
                </button>
                <button
                  onClick={async () => {
                    const branch = checkoutConflict.branch;
                    setCheckoutConflict(null);
                    await checkoutBranchSmart(branch, { stashFirst: true });
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded flex items-center gap-2"
                >
                  <Archive size={14} />
                  {t('checkoutConflict.stashAndSwitch')}
                </button>
              </div>
              <p className="text-[10px] text-text-secondary/70 mt-3 text-center">
                {t('checkoutConflict.stashAndSwitchDesc')}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── RESET ALL CONFIRMATION ──────────── */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 glass-alert-error rounded-lg shadow-2xl px-4 py-3 flex items-center gap-4 max-w-2xl"
          >
            <AlertCircle size={20} className="text-[#ffdad6] shrink-0" />
            <span className="text-sm text-[#ffdad6]">
              {t('resetAll.warning')}
            </span>
            <button
              onClick={async () => {
                const ok = await resetAll();
                if (ok) setShowResetConfirm(false);
              }}
              disabled={isLoading}
              className="shrink-0 px-3 py-1.5 text-xs font-bold bg-error hover:bg-[#ff8a86] text-white rounded transition-colors disabled:opacity-50"
            >
              {t('resetAll.button')}
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="shrink-0 px-3 py-1.5 text-xs font-medium text-[#ffdad6] hover:text-white"
            >
              {t('modal.cancel')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── AMEND LAST COMMIT ──────────── */}
      <AnimatePresence>
        {showAmend && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setShowAmend(false)}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[580px] max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-git-mod flex items-center gap-2 text-base">
                  <RotateCcw size={16} /> {t('amend.title')}
                </h3>
                <button onClick={() => setShowAmend(false)} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
              </div>
              <p className="text-xs text-text-secondary mb-3">{t('amend.desc')}</p>
              <div className="bg-git-mod/10 border border-git-mod/30 rounded p-2 text-xs text-[#ffd89e] mb-4">
                {t('amend.warning')}
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary block mb-1">
                    {t('amend.currentMessage')}
                  </label>
                  <div className="bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-sm text-text-secondary font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    {commits[0]?.message || t('graph.noCommits')}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary block mb-1">
                    {t('amend.newMessage')}
                  </label>
                  <textarea
                    autoFocus
                    value={amendNewMessage}
                    onChange={(e) => setAmendNewMessage(e.target.value)}
                    placeholder={commits[0]?.message || ''}
                    className="w-full bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-sm text-text-primary h-24 focus:outline-none focus:border-git-mod/40 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4 shrink-0">
                <button
                  onClick={async () => {
                    const r = await amendLastCommit(amendNewMessage.trim() || undefined);
                    if (r.success) {
                      setShowAmend(false);
                      setAmendNewMessage('');
                    }
                  }}
                  disabled={isLoading || !repoPath || commits.length === 0}
                  className="flex-1 py-2 bg-gradient-to-br from-[#fd9d1a] to-[#c87d10] hover:from-[#feab33] hover:to-[#d68f1f] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-[#2a1500] rounded transition-colors"
                >
                  {isLoading ? '...' : t('amend.button')}
                </button>
                <button
                  onClick={() => { setShowAmend(false); setAmendNewMessage(''); }}
                  className="px-4 py-2 bg-bg-base/70 border border-border-subtle/30 hover:text-text-primary text-sm text-text-secondary rounded transition-colors"
                >
                  {t('amend.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── SQUASH COMMITS ──────────── */}
      <AnimatePresence>
        {showSquash && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={() => setShowSquash(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-overlay rounded-xl shadow-2xl p-6 w-[580px]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-git-mod flex items-center gap-2 text-base">
                  <Layers size={16} /> {t('page.modals.squash.title')}
                </h3>
                <button onClick={() => setShowSquash(false)} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
              </div>
              <div className="bg-git-mod/10 border border-git-mod/30 rounded p-2 text-xs text-[#ffd89e] mb-4">
                {t('page.modals.squash.warning')}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary block mb-2">{t('page.modals.squash.lastCommits')}</label>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setSquashN(n)} className={cn('flex-1 py-2 rounded border text-sm font-bold transition-colors', squashN === n ? 'bg-git-mod/15 border-[#fd9d1a]/50 text-git-mod' : 'bg-bg-base/70 border-border-subtle/30 text-text-secondary hover:text-text-primary')}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 bg-bg-base/70 border border-border-subtle/15 rounded p-2 max-h-32 overflow-y-auto">
                    {commits.slice(0, squashN).map((c, i) => (
                      <div key={c.hash} className="flex items-center gap-2 py-0.5 text-xs">
                        <span className="font-mono text-text-secondary/70 shrink-0">{c.shortHash}</span>
                        <span className={cn('truncate', i === 0 ? 'text-text-primary' : 'text-text-secondary')}>{c.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary block mb-1">{t('page.modals.squash.newMessage')}</label>
                  <textarea
                    autoFocus
                    value={squashMessage}
                    onChange={(e) => setSquashMessage(e.target.value)}
                    placeholder={commits[0]?.message ?? ''}
                    className="w-full bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-sm text-text-primary h-20 focus:outline-none focus:border-git-mod/40 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={async () => {
                    const msg = squashMessage.trim() || commits[0]?.message || '';
                    const r = await squashCommits(squashN, msg);
                    if (r.success) { setShowSquash(false); setSquashMessage(''); setSquashN(2); }
                  }}
                  disabled={isLoading || !repoPath || commits.length < 2}
                  className="flex-1 py-2 bg-gradient-to-br from-[#fd9d1a] to-[#c87d10] hover:from-[#feab33] hover:to-[#d68f1f] disabled:opacity-40 text-sm font-bold text-[#2a1500] rounded transition-colors"
                >
                  {isLoading ? '...' : t('page.modals.squash.button', { n: squashN })}
                </button>
                <button onClick={() => { setShowSquash(false); setSquashMessage(''); setSquashN(2); }} className="px-4 py-2 bg-bg-base/70 border border-border-subtle/30 hover:text-text-primary text-sm text-text-secondary rounded transition-colors">
                  {t('modal.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── FILE CONTEXT MENU ──────────── */}
      <AnimatePresence>
        {fileContextMenu && (
          <FileContextMenu
            x={fileContextMenu.x}
            y={fileContextMenu.y}
            file={fileContextMenu.file}
            onStage={() => { stageFile(fileContextMenu.file.path, !fileContextMenu.file.staged); setFileContextMenu(null); }}
            onDiscard={() => { discardFileChanges(fileContextMenu.file.path); setFileContextMenu(null); }}
            onStashFile={() => { stashFile(fileContextMenu.file.path); setFileContextMenu(null); }}
            onIgnore={async () => {
              const r = await addToGitignore(fileContextMenu.file.path);
              if (r.success && r.alreadyIgnored) {
                setError(`"${fileContextMenu.file.path}" ya estaba en .gitignore`);
              }
              setFileContextMenu(null);
            }}
            onOpenInEditor={() => { openInDefault(fileContextMenu.file.path); setFileContextMenu(null); }}
            onShowInFolder={() => { showInFolder(fileContextMenu.file.path); setFileContextMenu(null); }}
            onCopyPath={() => { copyFilePath(fileContextMenu.file.path); setFileContextMenu(null); }}
            onDelete={async () => {
              const file = fileContextMenu.file;
              setFileContextMenu(null);
              if (confirm(`¿Eliminar "${file.path}" del disco?`)) {
                await deleteFile(file.path);
              }
            }}
            onClose={() => setFileContextMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* ──────────── CONTEXT MENU ──────────── */}
      <AnimatePresence>
        {contextMenu && (
          <CommitContextMenu
            x={contextMenu.x} y={contextMenu.y}
            onMerge={() => { contextMenu.hash && mergeBranch(contextMenu.hash); setContextMenu(null); }}
            onCherryPick={() => {
              if (contextMenu.hash) {
                void cherryPickCommit(contextMenu.hash, contextMenu.hash.slice(0, 7));
              }
              setContextMenu(null);
            }}
            onRevert={() => { contextMenu.hash && revertCommit(contextMenu.hash); setContextMenu(null); }}
            onCheckout={() => { contextMenu.hash && checkoutBranch(contextMenu.hash); setContextMenu(null); }}
            onCreateBranch={() => { setNewBranchFrom(contextMenu.hash); setShowNewBranch(true); setContextMenu(null); }}
            onCopySha={() => { contextMenu.hash && navigator.clipboard.writeText(contextMenu.hash); setContextMenu(null); }}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────── COMPONENTS ──────────── */

function ToolbarButton({
  icon, onClick, title, label, disabled,
}: { icon: React.ReactNode; onClick: () => void; title?: string; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      className={cn(
        'flex shrink-0 flex-col items-center justify-center self-center rounded-md border border-transparent bg-text-primary/[0.025] transition-colors group shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        label ? 'h-10 min-w-[54px] px-2.5 py-1 gap-0.5' : 'h-8 w-10 p-1.5',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#d9e7fc]/[0.075] hover:border-text-primary/15',
      )}
    >
      <div className="w-5 h-5 shrink-0 text-text-secondary group-hover:text-secondary flex items-center justify-center">{icon}</div>
      {label && <span className="text-[9px] leading-none font-bold uppercase tracking-tighter text-text-secondary">{label}</span>}
    </button>
  );
}

function SidebarSection({
  title, children, count, extra, icon,
}: {
  title: string; children: React.ReactNode; count?: number; extra?: React.ReactNode; icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="mt-2">
      <div className="w-full flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-text-secondary">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 flex-1 text-left hover:text-text-primary transition-colors"
        >
          <ChevronRight size={12} className={cn('transition-transform shrink-0', isOpen && 'rotate-90')} />
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="flex-1 text-left tracking-wider">{title}</span>
        </button>
        {count !== undefined && <span className="bg-border-subtle text-[9px] px-1.5 rounded-full">{count}</span>}
        {extra}
      </div>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

function SidebarItem({ icon, text, active, onClick }: { icon: React.ReactNode; text: string; active?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 flex items-center gap-3 text-sm transition-colors group relative',
        active ? 'text-secondary bg-secondary/10' : 'text-text-secondary hover:bg-border-subtle hover:text-text-primary',
        onClick && 'cursor-pointer',
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />}
      <span className={cn('shrink-0', active ? 'text-secondary' : 'text-text-secondary group-hover:text-text-primary')}>{icon}</span>
      <span className="truncate select-text">{text}</span>
    </div>
  );
}

/* ──────────── BRANCH TREE (folder grouping) ──────────── */

interface BranchNode {
  name: string;           // leaf name (last segment)
  fullPath: string;       // full branch name
}

interface BranchFolder {
  prefix: string;
  branches: BranchNode[];
}

function buildBranchTree(branches: string[]): { root: BranchNode[]; folders: BranchFolder[] } {
  const root: BranchNode[] = [];
  const folderMap = new Map<string, BranchNode[]>();

  for (const fullPath of branches) {
    const slash = fullPath.indexOf('/');
    if (slash === -1) {
      root.push({ name: fullPath, fullPath });
    } else {
      const prefix = fullPath.slice(0, slash);
      const leaf = fullPath.slice(slash + 1);
      if (!folderMap.has(prefix)) folderMap.set(prefix, []);
      folderMap.get(prefix)!.push({ name: leaf, fullPath });
    }
  }

  // Sort root: main/master first, then alphabetic
  root.sort((a, b) => {
    const priority = (n: string) => (n === 'main' ? 0 : n === 'master' ? 1 : 2);
    return priority(a.name) - priority(b.name) || a.name.localeCompare(b.name);
  });

  const folders: BranchFolder[] = Array.from(folderMap.entries())
    .map(([prefix, branches]) => ({ prefix, branches: branches.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix));

  return { root, folders };
}

function BranchTree({
  branches, currentBranch, tracking, onCheckout, onContextMenu, onDelete,
}: {
  branches: string[];
  currentBranch: string;
  tracking: Record<string, { ahead: number; behind: number; gone: boolean; upstream: string | null }>;
  onCheckout: (b: string) => void;
  onContextMenu: (e: React.MouseEvent, branch: string) => void;
  onDelete?: (branch: string) => void;
}) {
  const { root, folders } = useMemo(() => buildBranchTree(branches), [branches]);

  return (
    <div>
      {root.map((b) => (
        <BranchRow
          key={b.fullPath}
          name={b.name}
          fullPath={b.fullPath}
          tracking={tracking[b.fullPath]}
          isActive={b.fullPath === currentBranch}
          onCheckout={onCheckout}
          onContextMenu={onContextMenu}
          indent={false}
          onDelete={onDelete}
        />
      ))}
      {folders.map((f) => (
        <BranchFolderView
          key={f.prefix}
          folder={f}
          currentBranch={currentBranch}
          tracking={tracking}
          onCheckout={onCheckout}
          onContextMenu={onContextMenu}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function BranchFolderView({
  folder, currentBranch, tracking, onCheckout, onContextMenu, onDelete,
}: {
  folder: BranchFolder;
  currentBranch: string;
  tracking: Record<string, { ahead: number; behind: number; gone: boolean; upstream: string | null }>;
  onCheckout: (b: string) => void;
  onContextMenu: (e: React.MouseEvent, branch: string) => void;
  onDelete?: (branch: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-[26px] pr-3 py-1 flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface/70 transition-colors"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={14} className="text-text-secondary shrink-0" />
        <span className="truncate flex-1 text-left select-text">{folder.prefix}</span>
        <span className="text-[10px] text-text-secondary/70">{folder.branches.length}</span>
      </button>
      {isOpen && (
        <div>
          {folder.branches.map((b) => (
            <BranchRow
              key={b.fullPath}
              name={b.name}
              fullPath={b.fullPath}
              tracking={tracking[b.fullPath]}
              isActive={b.fullPath === currentBranch}
              onCheckout={onCheckout}
              onContextMenu={onContextMenu}
              indent={true}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BranchRow({
  name, fullPath, tracking, isActive, onCheckout, onContextMenu, indent, onDelete,
}: {
  name: string;
  fullPath: string;
  tracking?: { ahead: number; behind: number; gone: boolean; upstream: string | null };
  isActive: boolean;
  onCheckout: (b: string) => void;
  onContextMenu: (e: React.MouseEvent, branch: string) => void;
  indent: boolean;
  onDelete?: (branch: string) => void;
}) {
  const currentBranch = useGitStore((s) => s.currentBranch);
  const branchColor = colorForBranch(fullPath, currentBranch || undefined);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => onCheckout(fullPath)}
      onContextMenu={(e) => onContextMenu(e, fullPath)}
      title={`Doble click: checkout · Click derecho: opciones`}
      className={cn(
        'flex items-center gap-2 py-1 pr-3 group cursor-pointer transition-colors relative',
        indent ? 'pl-[46px]' : 'pl-[26px]',
        isActive ? 'bg-secondary/10 text-secondary' : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
      )}
    >
      {isActive ? (
        <Check size={13} strokeWidth={3} className="text-secondary shrink-0" />
      ) : (
        <GitBranch size={13} className="shrink-0" style={{ color: branchColor }} />
      )}
      <span className="truncate flex-1 text-sm select-text">{name}</span>

      {/* Ahead / behind chips */}
      {tracking && !tracking.gone && (tracking.ahead > 0 || tracking.behind > 0) && (
        <span className="flex items-center gap-1 text-[10px] font-mono shrink-0">
          {tracking.ahead > 0 && (
            <span className="flex items-center text-secondary" title={`${tracking.ahead} commit${tracking.ahead === 1 ? '' : 's'} local${tracking.ahead === 1 ? '' : 'es'} pendiente${tracking.ahead === 1 ? '' : 's'} de push`}>
              {tracking.ahead}
              <ArrowUp size={10} strokeWidth={3} />
            </span>
          )}
          {tracking.behind > 0 && (
            <span className="flex items-center text-git-mod" title={`${tracking.behind} commit${tracking.behind === 1 ? '' : 's'} remoto${tracking.behind === 1 ? '' : 's'} pendiente${tracking.behind === 1 ? '' : 's'} de pull`}>
              {tracking.behind}
              <ArrowDown size={10} strokeWidth={3} />
            </span>
          )}
        </span>
      )}
      {tracking?.gone && (
        <span className="text-[9px] text-error uppercase shrink-0" title="Upstream eliminado">gone</span>
      )}

      {/* Branch color dot or Trash icon if imagined and hovered */}
      {fullPath.startsWith('imagined/') && isHovered ? (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.(fullPath); }}
          className="p-1 hover:text-error text-text-secondary transition-colors shrink-0 z-10"
          title="Descartar futuro"
        >
          <Trash2 size={12} />
        </button>
      ) : (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 ml-1 shadow-[0_0_4px_rgba(0,0,0,0.25)]"
          style={{ backgroundColor: branchColor }}
          title={`Color en el grafo: ${branchColor}`}
        />
      )}
    </div>
  );
}

/* Remote branches: similar tree grouped by 'origin/...' */
function RemoteBranchTree({
  branches, onCheckout, onContextMenu,
}: {
  branches: string[];
  onCheckout: (b: string) => void;
  onContextMenu: (e: React.MouseEvent, branch: string) => void;
}) {
  const currentBranch = useGitStore((s) => s.currentBranch);
  const { root, folders } = useMemo(() => buildBranchTree(branches), [branches]);
  return (
    <div>
      {root.map((b) => {
        const branchColor = colorForBranch(b.fullPath, currentBranch || undefined);
        return (
          <div
            key={b.fullPath}
            onDoubleClick={() => onCheckout(b.fullPath)}
            onContextMenu={(e) => onContextMenu(e, b.fullPath)}
            title="Doble click: checkout · Click derecho: opciones"
            className="pl-[26px] pr-3 py-1.5 flex items-center gap-2 text-sm text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary cursor-pointer transition-colors group relative"
          >
            <Cloud size={13} className="shrink-0" style={{ color: branchColor }} />
            <span className="truncate text-xs flex-1 select-text">{b.name}</span>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 ml-1 shadow-[0_0_4px_rgba(0,0,0,0.25)]"
              style={{ backgroundColor: branchColor }}
              title={`Color en el grafo: ${branchColor}`}
            />
          </div>
        );
      })}
      {folders.map((f) => (
        <RemoteFolderView
          key={f.prefix}
          folder={f}
          onCheckout={onCheckout}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}

function RemoteFolderView({
  folder, onCheckout, onContextMenu,
}: {
  folder: BranchFolder;
  onCheckout: (b: string) => void;
  onContextMenu: (e: React.MouseEvent, branch: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const currentBranch = useGitStore((s) => s.currentBranch);
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-[26px] pr-3 py-1 flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface/70 transition-colors"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={13} className="text-text-secondary shrink-0" />
        <span className="truncate flex-1 text-left select-text">{folder.prefix}</span>
        <span className="text-[10px] text-text-secondary/70">{folder.branches.length}</span>
      </button>
      {isOpen && (
        <div>
          {folder.branches.map((b) => {
            const branchColor = colorForBranch(b.fullPath, currentBranch || undefined);
            return (
              <div
                key={b.fullPath}
                onDoubleClick={() => onCheckout(b.fullPath)}
                onContextMenu={(e) => onContextMenu(e, b.fullPath)}
                className="pl-[46px] pr-3 py-1.5 flex items-center gap-2 text-sm text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary transition-colors cursor-pointer group relative"
                title={`Doble click: checkout · Click derecho: opciones\n${b.fullPath}`}
              >
                <GitBranch size={13} className="shrink-0" style={{ color: branchColor }} />
                <span className="truncate text-xs flex-1 select-text">{b.name}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 ml-1 shadow-[0_0_4px_rgba(0,0,0,0.25)]"
                  style={{ backgroundColor: branchColor }}
                  title={`Color en el grafo: ${branchColor}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StashItem({
  stash, onApply, onDrop,
}: { stash: { index: number; message: string; hash: string }; onApply: () => void; onDrop: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      className="px-4 py-1.5 flex items-center gap-3 text-sm text-text-secondary hover:bg-border-subtle hover:text-text-primary transition-colors"
      title={stash.message}
    >
      <Archive size={16} className="shrink-0" />
      <span className="truncate flex-1 text-xs select-text">{stash.message}</span>
      {isHovered && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onApply(); }} className="p-1 hover:text-secondary transition-colors" title="Apply">
            <RotateCcw size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDrop(); }} className="p-1 hover:text-error transition-colors" title="Drop">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function TagItem({
  name, onDelete,
}: { name: string; onDelete: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      className="px-4 py-1.5 flex items-center gap-3 text-sm text-text-secondary hover:bg-border-subtle hover:text-text-primary transition-colors group relative"
      title={name}
    >
      <Tag size={16} className="shrink-0" />
      <span className="truncate flex-1 text-xs select-text">{name}</span>
      {isHovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 hover:text-error transition-colors shrink-0 z-10"
          title="Eliminar Tag"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

function FileRow({
  file, selected, onClick, onDiscard, onStage,
}: {
  file: GitFile; selected?: boolean; onClick?: () => void; onDiscard: () => void; onStage: (stage: boolean) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-1.5 rounded group transition-colors',
        selected ? 'bg-secondary/15' : 'hover:bg-border-subtle/50',
        onClick && 'cursor-pointer',
      )}
    >
      <input
        type="checkbox" checked={file.staged}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStage(e.target.checked)}
        className="w-3.5 h-3.5 rounded bg-bg-base/70 border-border-subtle/15 text-secondary focus:ring-0"
      />
      <FileText
        size={16}
        className={cn(
          file.status === 'modified' ? 'text-git-mod' :
          file.status === 'added' ? 'text-secondary' :
          file.status === 'renamed' ? 'text-primary' :
          file.status === 'untracked' ? 'text-text-secondary' :
          'text-error',
        )}
      />
      <span className="text-sm truncate flex-1 text-text-primary group-hover:text-text-primary">{file.path}</span>
      <div className="flex items-center gap-2">
        {isHovered && (
          <button onClick={(e) => { e.stopPropagation(); onDiscard(); }} className="p-1 hover:text-error text-text-secondary">
            <Trash2 size={14} />
          </button>
        )}
        <div
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold',
            file.status === 'modified' ? 'bg-git-mod/20 text-git-mod' :
            file.status === 'added' ? 'bg-secondary/20 text-secondary' :
            file.status === 'renamed' ? 'bg-primary/20 text-primary' :
            file.status === 'untracked' ? 'bg-[#9eacc0]/20 text-text-secondary' :
            'bg-error/20 text-error',
          )}
        >
          {file.status[0].toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function StagingPanel({
  files, selectedFile, repoPath, commitMessage, setCommitMessage, isLoading,
  onSelectFile, onStage, onStageMany, onDiscard, onCommit, onRequestAmend, onRequestSquash,
  onFileContextMenu, onRequestResetAll,
}: {
  files: GitFile[];
  selectedFile: GitFile | null;
  repoPath: string | null;
  commitMessage: string;
  setCommitMessage: (m: string) => void;
  isLoading: boolean;
  onSelectFile: (f: GitFile) => void;
  onStage: (path: string, stage: boolean) => void;
  onStageMany: (paths: string[], stage: boolean) => void;
  onDiscard: (path: string) => void;
  onCommit: () => void;
  onRequestAmend: () => void;
  onRequestSquash: () => void;
  onFileContextMenu: (e: React.MouseEvent, file: GitFile) => void;
  onRequestResetAll: () => void;
}) {
  const t = useT();
  const unstaged = files.filter((f) => !f.staged);
  const staged = files.filter((f) => f.staged);

  // CRITICAL: batch stage/unstage to avoid parallel writes to .git/index
  // which cause "index.lock: File exists" errors.
  const stageAll = () => onStageMany(unstaged.map((f) => f.path), true);
  const unstageAll = () => onStageMany(staged.map((f) => f.path), false);

  if (!repoPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-text-secondary text-sm">
        <GitBranch size={32} className="mx-auto mb-3 opacity-30" />
        {t('staging.openRepoPrompt')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Unstaged Files ── */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="px-4 py-2 border-b border-border-subtle/15 bg-bg-surface/75 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
            {t('staging.unstagedTitle')} ({unstaged.length})
          </span>
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <button
                onClick={onRequestResetAll}
                className="p-1 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                title={t('staging.discardAllTooltip')}
              >
                <Trash2 size={12} />
              </button>
            )}
            {unstaged.length > 0 && (
              <button
                onClick={stageAll}
                className="text-[10px] text-secondary hover:text-[#052900] px-2 py-0.5 rounded border border-secondary/40 hover:bg-secondary transition-colors"
              >
                {t('staging.stageAllBtn')}
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {unstaged.length === 0 ? (
            <p className="px-4 py-3 text-xs text-text-secondary/70 italic">{t('staging.noUnstagedChanges')}</p>
          ) : (
            <div className="p-1">
              {unstaged.map((file) => (
                <StagingFileRow
                  key={file.path}
                  file={file}
                  selected={selectedFile?.path === file.path}
                  direction="stage"
                  onClick={() => onSelectFile(file)}
                  onAction={() => onStage(file.path, true)}
                  onDiscard={() => onDiscard(file.path)}
                  onContextMenu={(e) => onFileContextMenu(e, file)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Staged Files ── */}
      <div className="flex flex-col min-h-0 flex-1 border-t-2 border-secondary/30">
        <div className="px-4 py-2 border-b border-border-subtle/15 bg-[#052900] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
            {t('staging.stagedTitle')} ({staged.length})
          </span>
          {staged.length > 0 && (
            <button
              onClick={unstageAll}
              className="text-[10px] text-text-secondary hover:text-[#020f1e] px-2 py-0.5 rounded border border-[#9eacc0]/40 hover:bg-[#9eacc0] transition-colors"
            >
              {t('staging.unstageAllBtn')}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {staged.length === 0 ? (
            <p className="px-4 py-3 text-xs text-text-secondary/70 italic">{t('staging.noStagedChanges')}</p>
          ) : (
            <div className="p-1">
              {staged.map((file) => (
                <StagingFileRow
                  key={file.path}
                  file={file}
                  selected={selectedFile?.path === file.path}
                  direction="unstage"
                  onClick={() => onSelectFile(file)}
                  onAction={() => onStage(file.path, false)}
                  onDiscard={() => onDiscard(file.path)}
                  onContextMenu={(e) => onFileContextMenu(e, file)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Commit Box ── */}
      <div className="p-3 border-t border-border-subtle/15 bg-bg-surface/75 shrink-0">
        <textarea
          className="w-full bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-sm text-text-primary h-16 focus:outline-none focus:border-secondary/30 resize-none"
          placeholder={t('staging.commitMsgPlaceholder')}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={onCommit}
            disabled={isLoading || !commitMessage.trim() || staged.length === 0}
            className="flex-1 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-[#052900] rounded transition-colors"
          >
            {isLoading
              ? t('staging.committingState')
              : staged.length > 0
                ? t('staging.commitWithCountBtn', { count: staged.length })
                : t('staging.commitBtn')}
          </button>
          <button
            onClick={onRequestAmend}
            disabled={isLoading || !repoPath}
            title={t('staging.amendTooltip')}
            className="px-3 py-2 bg-bg-base/70 border border-border-subtle/30 hover:border-[#fd9d1a]/50 hover:text-git-mod disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-secondary rounded transition-colors flex items-center gap-1"
          >
            <RotateCcw size={12} />
            {t('staging.amendBtn')}
          </button>
          <button
            onClick={onRequestSquash}
            disabled={isLoading || !repoPath}
            title={t('staging.squashTooltip')}
            className="px-3 py-2 bg-bg-base/70 border border-border-subtle/30 hover:border-[#fd9d1a]/50 hover:text-git-mod disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-secondary rounded transition-colors flex items-center gap-1"
          >
            <Layers size={12} />
            {t('staging.squashBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

function StagingFileRow({
  file, selected, direction, onClick, onAction, onDiscard, onContextMenu,
}: {
  file: GitFile;
  selected: boolean;
  direction: 'stage' | 'unstage';
  onClick: () => void;
  onAction: () => void;
  onDiscard: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const t = useT();
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded group transition-colors cursor-pointer',
        selected ? 'bg-secondary/15' : 'hover:bg-border-subtle/50',
      )}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onAction(); }}
        title={direction === 'stage' ? t('staging.stageFileTooltip') : t('staging.unstageFileTooltip')}
        className={cn(
          'p-1 rounded shrink-0 transition-colors',
          direction === 'stage'
            ? 'text-text-secondary hover:text-secondary hover:bg-secondary/10'
            : 'text-text-secondary hover:text-git-mod hover:bg-git-mod/10',
        )}
      >
        {direction === 'stage' ? <Plus size={14} /> : <Minus size={14} />}
      </button>
      <FileText
        size={14}
        className={cn(
          'shrink-0',
          file.conflicted ? 'text-error' :
          file.status === 'modified' ? 'text-git-mod' :
          file.status === 'added' ? 'text-secondary' :
          file.status === 'renamed' ? 'text-primary' :
          file.status === 'untracked' ? 'text-text-secondary' :
          'text-error',
        )}
      />
      <span className="text-xs truncate flex-1 text-text-primary group-hover:text-text-primary">{file.path}</span>
      {isHovered && direction === 'stage' && (
        <button
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          className="p-1 hover:text-error text-text-secondary shrink-0"
          title={t('staging.discardFileTooltip')}
        >
          <Trash2 size={12} />
        </button>
      )}
      <div
        className={cn(
          'w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0',
          file.conflicted ? 'bg-error/20 text-error border border-[#ff716c]/40 animate-pulse' :
          file.status === 'modified' ? 'bg-git-mod/20 text-git-mod' :
          file.status === 'added' ? 'bg-secondary/20 text-secondary' :
          file.status === 'renamed' ? 'bg-primary/20 text-primary' :
          file.status === 'untracked' ? 'bg-[#9eacc0]/20 text-text-secondary' :
          'bg-error/20 text-error',
        )}
      >
        {file.conflicted ? '!' : file.status[0].toUpperCase()}
      </div>
    </div>
  );
}

/**
 * Linear chronological history list — no SVG, more detail per row.
 * Useful for skimming the full commit log of the current branch.
 */
function HistoryView({
  commits, selectedHash, currentBranch, filterText, onSelect, onContextMenu, isLoading,
}: {
  commits: Commit[];
  selectedHash?: string;
  currentBranch?: string;
  filterText?: string;
  onSelect: (c: Commit) => void;
  onContextMenu: (e: React.MouseEvent, c: Commit) => void;
  isLoading: boolean;
}) {
  const filter = filterText?.trim().toLowerCase() ?? '';
  const filtered = filter
    ? commits.filter(
        (c) =>
          c.message.toLowerCase().includes(filter) ||
          c.shortHash.startsWith(filter) ||
          c.authorName.toLowerCase().includes(filter),
      )
    : commits;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="sticky top-0 bg-bg-surface/75 border-b border-border-subtle/15 z-10 py-2 px-4 text-[11px] text-text-secondary uppercase tracking-wider font-bold shrink-0">
        {filter
          ? `${filtered.length} de ${commits.length} commits`
          : `Historial · ${commits.length} commits`}
      </div>
      <div className="flex-1 overflow-y-auto">
        {commits.length === 0 && isLoading && (
          <p className="px-4 py-8 text-center text-text-secondary text-sm">Cargando commits...</p>
        )}
        {filter && filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-text-secondary text-sm">
            Sin resultados para &quot;{filter}&quot;
          </p>
        )}
        {filtered.map((commit) => {
          const isSelected = selectedHash === commit.hash;
          return (
            <div
              key={commit.hash}
              onClick={() => onSelect(commit)}
              onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, commit); }}
              className={cn(
                'px-4 py-3 border-b border-border-subtle/15 cursor-pointer transition-colors select-text',
                isSelected ? 'bg-secondary/10' : 'hover:bg-bg-surface/75',
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <code className="text-[11px] font-mono text-secondary shrink-0 select-text">{commit.shortHash}</code>
                  {commit.refs && commit.refs.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {commit.refs.slice(0, 3).map((ref) => {
                        const isTag = ref.startsWith('tag: ');
                        const isRemote = ref.includes('/');
                        const text = isTag ? ref.replace('tag: ', '') : ref;
                        const isCurrent = !isTag && !isRemote && text === currentBranch;
                        return (
                          <span
                            key={ref}
                            className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap font-medium',
                              isTag ? 'bg-git-mod/15 text-git-mod border-git-mod/30'
                                : isCurrent ? 'bg-secondary/20 text-secondary border-secondary/40'
                                : isRemote ? 'bg-primary/10 text-primary border-[#5ed8ff]/30'
                                : 'bg-secondary/15 text-secondary border-secondary/30',
                            )}
                          >
                            {text}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-text-secondary/70 shrink-0 font-mono select-text">{formatDate(commit.date)}</span>
              </div>
              <p className={cn('text-sm font-medium mb-1.5 select-text', isSelected ? 'text-text-primary' : 'text-text-primary')}>
                {commit.message}
              </p>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#a3f185] to-[#68b24f] flex items-center justify-center text-[8px] font-bold text-[#052900]">
                  {initials(commit.authorName)}
                </div>
                <span className="select-text">{commit.authorName}</span>
                <span className="text-text-secondary/70">·</span>
                <span className="text-text-secondary/70 font-mono text-[10px] select-text">{commit.authorEmail}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "Commit" tab — focused workspace for preparing changes.
 * Shows a summary of the working tree and prompts the user to click a file
 * (in the right panel) to review the diff.
 */
function CommitTabView({
  modifiedFiles, hasGithubUser,
}: { modifiedFiles: GitFile[]; hasGithubUser: boolean }) {
  const t = useT();
  const unstaged = modifiedFiles.filter((f) => !f.staged);
  const staged = modifiedFiles.filter((f) => f.staged);

  const statusCount = (status: GitFile['status']) =>
    modifiedFiles.filter((f) => f.status === status).length;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-2">{t('commitTab.pageTitle')}</h2>
          <p className="text-sm text-text-secondary">
            {t('commitTab.introText')}
          </p>
        </div>

        {modifiedFiles.length === 0 ? (
          <div className="bg-bg-surface/75 border border-border-subtle/15 rounded-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-secondary" />
            </div>
            <p className="text-base font-semibold text-text-primary mb-1">{t('commitTab.cleanWorkspace')}</p>
            <p className="text-sm text-text-secondary">{t('commitTab.cleanWorkspaceDesc')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard label={t('staging.unstagedTitle')} value={unstaged.length} accent="muted" />
              <StatCard label={t('staging.stagedTitle')} value={staged.length} accent="primary" />
            </div>

            <div className="bg-bg-surface/75 border border-border-subtle/15 rounded-lg p-5 mb-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                {t('commitTab.changesByTypeLabel')}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {statusCount('modified') > 0 && <StatusBadge label={t('status.modified')} count={statusCount('modified')} color="#fd9d1a" letter="M" />}
                {statusCount('added') > 0 && <StatusBadge label={t('status.added')} count={statusCount('added')} color="#a3f185" letter="A" />}
                {statusCount('deleted') > 0 && <StatusBadge label={t('status.deleted')} count={statusCount('deleted')} color="#ff716c" letter="D" />}
                {statusCount('untracked') > 0 && <StatusBadge label={t('status.untracked')} count={statusCount('untracked')} color="#9eacc0" letter="U" />}
                {statusCount('renamed') > 0 && <StatusBadge label={t('status.renamed')} count={statusCount('renamed')} color="#5ed8ff" letter="R" />}
              </div>
            </div>

            <div className="bg-bg-surface/75 border border-border-subtle/15 rounded-lg p-5">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">{t('commitTab.stepByStepLabel')}</h3>
              <ol className="space-y-2 text-sm text-text-primary">
                <FlowStep n={1} done={true}>{t('commitTab.step1Text')}</FlowStep>
                <FlowStep n={2} done={staged.length > 0}>{t('commitTab.step2Text')}</FlowStep>
                <FlowStep n={3} done={false}>{t('commitTab.step3Text')}</FlowStep>
                <FlowStep n={4} done={false}>{t('commitTab.step4Text')}</FlowStep>
                {hasGithubUser && <FlowStep n={5} done={false}>{t('commitTab.step5Text')}</FlowStep>}
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'primary' | 'muted' }) {
  return (
    <div
      className={cn(
        'bg-bg-surface/75 border rounded-lg p-4',
        accent === 'primary' ? 'border-secondary/40' : 'border-border-subtle/15',
      )}
    >
      <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', accent === 'primary' ? 'text-secondary' : 'text-text-primary')}>
        {value}
      </p>
    </div>
  );
}
