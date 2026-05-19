'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Undo, Redo, Download, Upload, GitBranch, Archive, Terminal, Search,
  Settings, HelpCircle, Folder, Cloud, Tag, Layers,
  ChevronRight, FileText, Trash2, Zap, AlertCircle, FolderOpen, Plus, X,
  ArrowLeft, RotateCcw, Github, LogOut, Minus,
  Sparkles, Copy, Lock, Globe, Loader2, UserCircle2,
  GitMerge, TreePine, ArrowUp, ArrowDown, ChevronDown, Check,
  Type, Filter, Monitor, ExternalLink, FileDiff, Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import pkg from '../package.json';
import {
  DEFAULT_SHORTCUTS,
  defaultShortcutsMap,
  eventToShortcut,
  formatShortcut,
} from '@/lib/shortcuts';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { CommitContextMenu, BranchContextMenu, FileContextMenu } from '@/components/ContextMenus';
import { HelpModal, StatusBadge, FlowStep } from '@/components/HelpModal';
import { EmptyStateCard, InitRepoModal, CloneRepoModal, ProfileMenu } from '@/components/RepoModals';
import { useGitStore, Commit, GitFile, type RepoState, type FontSize } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useRepoLoader } from '@/hooks/use-repo-loader';
import { useAutoFetch } from '@/hooks/use-auto-fetch';
import { DiffViewer } from '@/components/DiffViewer';
import { CommitGraph } from '@/components/CommitGraph';
import { useT } from '@/hooks/use-translation';
import { LANGS, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
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

type GraphColumnKey = keyof typeof GRAPH_COLUMN_DEFAULTS;

type PullDecisionToast = {
  source: 'push' | 'pull';
  branch: string;
  ahead: number;
  behind: number;
  mode: 'behind' | 'diverged';
};

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
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
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

function RepoTabs({
  repos,
  activeIdx,
  onSelect,
  onClose,
  onOpen,
}: {
  repos: RepoState[];
  activeIdx: number;
  onSelect: (idx: number) => void | Promise<void>;
  onClose: (idx: number) => void | Promise<void>;
  onOpen: () => void | Promise<void>;
}) {
  const t = useT();
  if (repos.length === 0) return null;

  return (
    <div className="app-titlebar h-10 bg-[#020f1e] border-b border-[#3c495a]/15 flex items-stretch shrink-0 overflow-hidden">
      <div className="min-w-0 flex-1 flex items-end gap-1 pl-2 pt-1 overflow-x-auto overflow-y-hidden">
        <div className="app-titlebar-control h-8 mb-0 mr-2 flex items-center gap-2 shrink-0 px-2">
        <img
          src="/gitcron-icon.png"
          alt="GitCron"
          data-keep-color
          className="w-4 h-4 rounded-sm"
        />
        <span className="text-sm font-bold text-[#5ed8ff] tracking-tight">GitCron</span>
        </div>
        {repos.map((repo, idx) => {
          const isActive = idx === activeIdx;
          return (
            <div
              key={repo.path}
              className={cn(
                'app-titlebar-control group h-8 min-w-0 max-w-56 rounded-t-md flex items-center border transition-colors',
                isActive
                  ? 'bg-[#041425] border-[#3c495a]/20 border-b-[#041425] text-[#d9e7fc]'
                  : 'bg-[#06182a] border-[#3c495a]/10 text-[#9eacc0] hover:text-[#d9e7fc] hover:bg-[#0b2035]',
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(idx)}
                title={t('repoTabs.switchTo', { repo: repo.name })}
                className="min-w-0 flex-1 h-full px-3 flex items-center gap-2 text-left"
              >
                {repo.isLoading ? (
                  <Loader2 size={10} className="shrink-0 animate-spin text-[#a3f185]" />
                ) : (
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      isActive ? 'bg-[#a3f185] shadow-[0_0_10px_rgba(163,241,133,0.5)]' : 'bg-[#3c495a]',
                    )}
                  />
                )}
                <span className="truncate text-xs font-semibold">{repo.name}</span>
                <span className="text-[10px] text-[#697789] font-mono truncate max-w-20 hidden md:block">
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
                className="mr-1 p-0.5 rounded text-[#697789] hover:text-[#ff716c] hover:bg-[#ff716c]/10 opacity-70 group-hover:opacity-100 transition"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onOpen}
          title={t('repoTabs.openAnother')}
          className="app-titlebar-control h-8 w-8 mb-0 rounded-t-md flex items-center justify-center text-[#9eacc0] hover:text-[#a3f185] hover:bg-[#06182a] border border-transparent hover:border-[#3c495a]/15 transition-colors shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="app-titlebar-control h-10 self-stretch flex items-stretch shrink-0">
        <button
          type="button"
          aria-label="Minimizar"
          title="Minimizar"
          onClick={() => window.api?.windowMinimize()}
          className="h-full w-11 flex items-center justify-center text-[#9eacc0] bg-[#020f1e] hover:bg-[#0b2035] hover:text-[#d9e7fc] transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          aria-label="Maximizar o restaurar"
          title="Maximizar o restaurar"
          onClick={() => window.api?.windowToggleMaximize()}
          className="h-full w-11 flex items-center justify-center text-[#9eacc0] bg-[#020f1e] hover:bg-[#0b2035] hover:text-[#d9e7fc] transition-colors"
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          aria-label="Cerrar"
          title="Cerrar"
          onClick={() => window.api?.windowClose()}
          className="h-full w-11 flex items-center justify-center text-[#9eacc0] bg-[#020f1e] hover:bg-[#0b2035] hover:text-[#d9e7fc] transition-colors"
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
      <h4 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-2 flex items-center gap-2">
        <RotateCcw size={12} /> {t('settings.autoFetch')}
      </h4>
      <p className="text-xs text-[#9eacc0] mb-3">{t('settings.autoFetchDesc')}</p>
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setAutoFetchPrefs(!autoFetchEnabled, autoFetchIntervalMinutes)}
          className={cn(
            'px-3 py-2 rounded border text-sm flex items-center gap-2 transition-colors',
            autoFetchEnabled
              ? 'bg-[#a3f185]/15 border-[#a3f185]/50 text-[#a3f185]'
              : 'bg-[#041425] border-[#3c495a]/15 text-[#9eacc0] hover:text-[#d9e7fc]',
          )}
        >
          {autoFetchEnabled && <Check size={14} strokeWidth={3} />}
          <span className="font-medium">
            {autoFetchEnabled ? t('settings.autoFetchEnabled') : t('settings.autoFetchDisabled')}
          </span>
        </button>
        <span className="text-xs text-[#697789] ml-2">
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
                ? 'bg-[#a3f185]/15 border-[#a3f185]/50 text-[#a3f185]'
                : 'bg-[#041425] border-[#3c495a]/15 text-[#9eacc0] hover:text-[#d9e7fc] hover:border-[#3c495a]/30',
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
        <h4 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider flex items-center gap-2">
          <Type size={12} /> {t('settings.shortcuts')}
        </h4>
        <button
          type="button"
          onClick={() => resetShortcutsToDefaults()}
          className="text-[10px] uppercase tracking-wider font-bold text-[#9eacc0] hover:text-[#a3f185] transition-colors"
        >
          {t('settings.shortcutsReset')}
        </button>
      </div>
      <p className="text-xs text-[#9eacc0] mb-3">{t('settings.shortcutsDesc')}</p>
      <div className="bg-[#041425] border border-[#3c495a]/15 rounded divide-y divide-[#3c495a]/15 max-h-[280px] overflow-y-auto">
        {DEFAULT_SHORTCUTS.map((s) => {
          const current = merged[s.id];
          const isEditing = editingId === s.id;
          return (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="text-[#9eacc0]">{t(s.descriptionKey)}</span>
              <button
                type="button"
                onClick={() => setEditingId(isEditing ? null : s.id)}
                className={cn(
                  'px-2 py-1 rounded font-mono text-[10px] border transition-colors min-w-[100px] text-center',
                  isEditing
                    ? 'bg-[#a3f185]/15 border-[#a3f185]/50 text-[#a3f185] animate-pulse'
                    : 'bg-[#020f1e] border-[#3c495a]/30 text-[#d9e7fc] hover:border-[#a3f185]/40',
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
      <h4 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-2 flex items-center gap-2">
        <AlertCircle size={12} /> {t('settings.osNotifications')}
      </h4>
      <p className="text-xs text-[#9eacc0] mb-3">{t('settings.osNotificationsDesc')}</p>
      <button
        type="button"
        onClick={() => setOsNotifications(!osNotificationsEnabled)}
        className={cn(
          'px-3 py-2 rounded border text-sm flex items-center gap-2 transition-colors',
          osNotificationsEnabled
            ? 'bg-[#a3f185]/15 border-[#a3f185]/50 text-[#a3f185]'
            : 'bg-[#041425] border-[#3c495a]/15 text-[#9eacc0] hover:text-[#d9e7fc]',
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
        'flex flex-col items-center justify-center p-1.5 rounded transition-colors group',
        'hover:bg-[#3c495a]',
      )}
    >
      <div className={cn(
        'w-5 h-5 flex items-center justify-center',
        isFetchingRemote ? 'text-[#a3f185]' : 'text-[#9eacc0] group-hover:text-[#a3f185]',
      )}>
        <RotateCcw size={16} className={cn(isFetchingRemote && 'animate-spin')} />
      </div>
    </button>
  );
}

function RepoStartChooser({
  githubUser,
  onOpenExisting,
  onCreateNew,
  onCloneRepo,
  onConnectGitHub,
}: {
  githubUser: { login: string } | null;
  onOpenExisting: () => void | Promise<void>;
  onCreateNew: () => void;
  onCloneRepo: () => void;
  onConnectGitHub: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 text-[#9eacc0] p-8">
      <div className="text-center">
        <FolderOpen size={56} className="mx-auto opacity-20 mb-4" />
        <p className="text-lg font-bold text-[#d9e7fc] mb-1">Bienvenido a GitCron</p>
        <p className="text-sm">Elegi como empezar:</p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-3xl">
        <EmptyStateCard
          icon={<FolderOpen size={28} />}
          title="Abrir existente"
          desc="Selecciona una carpeta que ya sea un repo git"
          onClick={onOpenExisting}
        />
        <EmptyStateCard
          icon={<Sparkles size={28} />}
          title="Crear nuevo"
          desc="Inicializar un repo nuevo en tu maquina"
          onClick={onCreateNew}
          highlighted
        />
        <EmptyStateCard
          icon={<Download size={28} />}
          title="Clonar de GitHub"
          desc="Bajar un repo existente desde una URL"
          onClick={onCloneRepo}
        />
      </div>

      {!githubUser && (
        <button
          onClick={onConnectGitHub}
          className="text-xs text-[#9eacc0] hover:text-[#a3f185] underline transition-colors flex items-center gap-1.5"
        >
          <Github size={12} />
          Conecta tu cuenta de GitHub para clonar repos privados
        </button>
      )}
    </div>
  );
}

function GraphColumnHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group w-0 self-stretch -my-2 shrink-0 cursor-col-resize relative overflow-visible"
      title="Arrastrar para redimensionar columna"
    >
      <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-[#3c495a]/20 group-hover:bg-[#a3f185]/45 group-active:bg-[#a3f185]/70 transition-colors" />
      <div className="absolute inset-y-0 -left-1.5 -right-1.5 bg-transparent group-hover:bg-[#a3f185]/35 group-active:bg-[#a3f185]/60 transition-colors" />
    </div>
  );
}

export default function GitCronPage() {
  const {
    openRepos, activeRepoIdx, setActiveRepoIdx,
    repoPath, repoName,
    currentBranch, branches, remoteBranches,
    commits, modifiedFiles, commitMessage, setCommitMessage,
    selectedCommit, setSelectedCommit, isLoading, error, setError, success, setSuccess,
    selectedFile, setSelectedFile, currentDiff, setCurrentDiff,
    stashes, tags, submodules,
    githubToken, githubUser,
    branchTracking, worktrees, pullRequests,
  } = useGitStore();

  const {
    commitChanges, mergeBranch, revertCommit, stashChanges,
    discardFileChanges, stageFile, stageFiles, removeIndexLock,
    checkoutBranch, checkoutBranchSmart, createBranch, pushChanges, pullChanges,
    openTerminal, stashApply, stashDrop, stashClear,
    connectGitHub, disconnectGitHub, loginWithGitHubDevice, bootstrapGitHub,
    bootstrapPreferences, changeLanguage, changeFontSize, changeDefaultFolder, pickDefaultFolder,
    setAutoFetchPrefs, setOsNotifications, rebindShortcut, resetShortcutsToDefaults, changeTheme,
    addToGitignore, resetAll, stashFile, showInFolder, openInDefault,
    deleteFile, copyFilePath,
    mergeIntoCurrent, rebaseOnto, fastForwardBranch, amendLastCommit, cherryPickCommit, squashCommits,
    renameBranch, deleteBranch, pullSpecificBranch, pushSpecificBranch,
    pullWithDecision,
  } = useGitActions();

  const t = useT();
  const language = useGitStore((s) => s.language);
  const fontSize = useGitStore((s) => s.fontSize);
  const defaultFolder = useGitStore((s) => s.defaultFolder);
  const theme = useGitStore((s) => s.theme);
  const appFontSizePx = FONT_SIZE_OPTIONS.find((option) => option.key === fontSize)?.px ?? 15;

  const {
    openRepo, restoreLastRepo, closeRepo, loadAll, loadDiff, refreshLog,
    pickFolder, initRepo, cloneRepo, createGitHubRepo, listUserGitHubRepos,
  } = useRepoLoader();

  const graphShowAllBranches = useGitStore((s) => s.getActiveRepo()?.graphShowAllBranches ?? true);
  const updateActiveRepo = useGitStore((s) => s.updateActiveRepo);

  const { runFetchCycle } = useAutoFetch();

  const [activeTab, setActiveTab] = useState('Graph');
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
    settings: () => setShowSettings(true),
    help: () => setShowHelp(true),
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
    graphTab: () => setActiveTab('Graph'),
    historyTab: () => setActiveTab('History'),
    commitTab: () => setActiveTab('Commit'),
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
  const [selectedPullRequest, setSelectedPullRequest] = useState<PullRequestEntry | null>(null);
  const [pullRequestDiff, setPullRequestDiff] = useState<PullRequestDiffData | null>(null);
  const [pullRequestDiffLoading, setPullRequestDiffLoading] = useState(false);
  const [showStashClearConfirm, setShowStashClearConfirm] = useState(false);
  const [checkoutConflict, setCheckoutConflict] = useState<{ branch: string; error: string } | null>(null);
  const [branchMenu, setBranchMenu] = useState<{ x: number; y: number; branch: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ branch: string; notMerged?: boolean } | null>(null);
  const [mergeNeedsCheckout, setMergeNeedsCheckout] = useState<{ sourceBranch: string; targetBranch: string } | null>(null);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchFrom, setNewBranchFrom] = useState<string | undefined>(undefined);
  // ── Resizable column widths ──
  const [sidebarW, setSidebarW] = useState(240);
  const [detailsW, setDetailsW] = useState(320);
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

  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [filterText, setFilterText] = useState('');
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [showInitRepo, setShowInitRepo] = useState(false);
  const [showCloneRepo, setShowCloneRepo] = useState(false);
  const [showRepoChooser, setShowRepoChooser] = useState(false);
  const [showSearchPopover, setShowSearchPopover] = useState(false);
  const [showBranchFilterDropdown, setShowBranchFilterDropdown] = useState(false);
  const branchFilterRef = useRef<HTMLDivElement>(null);
  const [searchPopoverPos, setSearchPopoverPos] = useState<{ top: number; right: number } | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [authMode, setAuthMode] = useState<'oauth' | 'token'>('oauth');
  const [deviceCodeInfo, setDeviceCodeInfo] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const newBranchInputRef = useRef<HTMLInputElement>(null);
  const searchPopoverRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLDivElement>(null);

  // Auto-load repo data
  useEffect(() => {
    if (repoPath) loadAll(repoPath);
  }, [repoPath]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Read persisted split widths only on the client to avoid SSR hydration mismatches.
  useEffect(() => {
    const savedSidebarW = localStorage.getItem('gitcron:sidebarW');
    const savedDetailsW = localStorage.getItem('gitcron:detailsW');
    const savedGraphColumns = localStorage.getItem('gitcron:graphColumns');
    const parsedSidebarW = savedSidebarW ? parseInt(savedSidebarW, 10) : NaN;
    const parsedDetailsW = savedDetailsW ? parseInt(savedDetailsW, 10) : NaN;

    if (!Number.isNaN(parsedSidebarW)) setSidebarW(parsedSidebarW);
    if (!Number.isNaN(parsedDetailsW)) setDetailsW(parsedDetailsW);
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

  // Hydrate preferences (language) + GitHub auth + last opened repo on startup.
  useEffect(() => {
    bootstrapPreferences();
    bootstrapGitHub();
    restoreLastRepo(); // silently tries to reopen the last repo; no-op if none saved
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setFileContextMenu(null);
      setBranchMenu(null);
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
    if (!window.api?.onUpdateNotAvailable) return;
    const unsubNotAvailable = window.api.onUpdateNotAvailable(() => {
      setIsCheckingUpdate(false);
      setDownloadProgress(null);
      setSuccess(t('update.toastNotAvailable'));
    });
    const unsubError = window.api.onUpdateError((msg: string) => {
      setIsCheckingUpdate(false);
      setDownloadProgress(null);
      setError(t('update.toastError', { error: msg }));
    });
    const unsubProgress = window.api.onDownloadProgress(({ percent }) => {
      setIsCheckingUpdate(false);
      setDownloadProgress(percent);
    });
    return () => {
      unsubNotAvailable();
      unsubError();
      unsubProgress();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckForUpdate = async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    setSuccess(t('update.toastChecking'));
    const result = await window.api.checkForUpdate();
    if (!result.success) {
      setIsCheckingUpdate(false);
      setError(result.error ?? t('update.toastError', { error: 'unknown' }));
    }
    // On success the IPC listeners (onUpdateNotAvailable / onUpdateError) handle the rest.
  };

  const handleCreateBranch = async () => {
    const name = newBranchName.trim();
    if (!name) return;
    await createBranch(name, newBranchFrom);
    setShowNewBranch(false);
    setNewBranchName('');
    setNewBranchFrom(undefined);
  };

  const handleSelectFile = async (file: GitFile) => {
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setSelectedFile(file);
    await loadDiff(file.path, file.staged, repoPath ?? undefined);
  };

  const handleSelectPullRequest = async (pr: PullRequestEntry) => {
    if (!repoPath || !githubToken || !window.api) return;
    setSelectedCommit(null);
    setSelectedFile(null);
    setCurrentDiff('');
    setSelectedPullRequest(pr);
    setPullRequestDiff(null);
    setPullRequestDiffLoading(true);
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
    setSelectedFile(null);
    setCurrentDiff('');
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setPullRequestDiffLoading(false);
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
    setShowRepoChooser(true);
  };

  const handleOpenExistingFromChooser = async () => {
    await openRepo();
    if (useGitStore.getState().repoPath) {
      setShowRepoChooser(false);
    }
  };

  const handleCreateRepoFromChooser = () => {
    setShowRepoChooser(false);
    setShowInitRepo(true);
  };

  const handleCloneRepoFromChooser = () => {
    setShowRepoChooser(false);
    setShowCloneRepo(true);
  };

  const handleSelectRepoTab = async (idx: number) => {
    const repo = openRepos[idx];
    if (!repo || idx === activeRepoIdx) return;
    setShowRepoChooser(false);
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
    setShowRepoChooser(false);
  };

  const handlePullDecision = async (mode: 'ff-only' | 'rebase' | 'merge') => {
    setPullDecision(null);
    await pullWithDecision(mode);
  };

  return (
    <div className="flex flex-col h-screen bg-[#020f1e] text-[#d9e7fc] font-sans overflow-hidden select-none">
      <RepoTabs
        repos={openRepos}
        activeIdx={activeRepoIdx}
        onSelect={handleSelectRepoTab}
        onClose={handleCloseRepoTab}
        onOpen={handleOpenRepoChooser}
      />
      {/* ──────────── TOP NAV ──────────── */}
      <header className="h-12 border-b border-[#3c495a]/15 bg-[#041425]/85 backdrop-blur-xl grid grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] items-center px-4 shrink-0 relative z-50">
        <div className="flex items-center gap-6 h-full min-w-0">
          <button
            onClick={openRepo}
            title={t('toolbar.openRepo')}
            className="flex items-center gap-1.5 font-bold text-[#a3f185] text-base hover:opacity-75 transition-opacity min-w-0"
          >
            {/* App icon — shown when no repo is open, replaced by folder icon when a repo is active */}
            {repoName ? (
              <FolderOpen size={16} />
            ) : (
              <img
                src="/gitcron-icon.png"
                alt="GitCron"
                className="w-5 h-5 rounded object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span className="truncate">{repoName ?? 'GitCron'}</span>
          </button>
          <nav className="flex h-full gap-1 shrink-0">
            {[
              { key: 'Commit', label: t('tab.commit') },
              { key: 'Graph', label: t('tab.graph') },
              { key: 'History', label: t('tab.history') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-3 h-full flex items-center text-sm transition-colors relative',
                  activeTab === tab.key ? 'text-[#a3f185]' : 'text-[#9eacc0] hover:text-[#d9e7fc]',
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a3f185]" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-center gap-1 px-3">
          <ToolbarButton icon={<Undo />} onClick={() => {}} title={t('toolbar.undo')} />
          <ToolbarButton icon={<Redo />} onClick={() => {}} title={t('toolbar.redo')} />
          <div className="w-px h-4 bg-[#3c495a] mx-1" />
          <ToolbarButton icon={<Download />} onClick={handlePullIntent} title={t('toolbar.pull')} label={t('toolbar.pull')} disabled={!repoPath || isLoading} />
          <ToolbarButton icon={<Upload />} onClick={handlePushIntent} title={t('toolbar.push')} label={t('toolbar.push')} disabled={!repoPath || isLoading} />
          <div className="w-px h-4 bg-[#3c495a] mx-1" />
          <ToolbarButton
            icon={<GitBranch />}
            onClick={() => { setNewBranchFrom(undefined); setShowNewBranch(true); }}
            title={t('toolbar.newBranch')} label={t('toolbar.branch')} disabled={!repoPath}
          />
          <ToolbarButton icon={<Archive />} onClick={stashChanges} title={t('toolbar.stash')} label={t('toolbar.stash')} disabled={!repoPath || isLoading} />
          <FetchIndicator onClick={runFetchCycle} />
        </div>

        <div className="flex items-center justify-end gap-1 min-w-0">
          {/* Version tag + GitHub icon / download progress */}
          <div className="flex items-center gap-1.5 mr-1">
            {downloadProgress !== null ? (
              <div className="w-32 flex items-center gap-1.5">
                <Download size={11} className="shrink-0 text-[#a3f185]" />
                <div className="flex-1 h-1 bg-[#3c495a]/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#a3f185] rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#a3f185] w-7 text-right shrink-0">
                  {downloadProgress}%
                </span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => window.api.shellOpenExternal('https://github.com/alejandropd-1/gitcron/releases/')}
                  title="GitHub Releases"
                  className="w-8 h-8 flex items-center justify-center text-[#9eacc0] hover:text-[#a3f185] hover:bg-[#172d45] rounded transition-colors"
                >
                  <Github size={16} />
                </button>
                <span className="text-[10px] font-mono font-bold text-[#052900] bg-[#a3f185] border border-[#68b24f] rounded px-2 py-0.5 select-none">
                  v{pkg.version}
                </span>
              </>
            )}
          </div>
          <div className="w-px h-4 bg-[#3c495a] mx-1" />
          <ToolbarButton icon={<Terminal />} onClick={openTerminal} title={t('toolbar.terminal')} disabled={!repoPath} />

          {/* Branch filter dropdown — only visible when Graph tab is active */}
          {activeTab === 'Graph' && repoPath && (
            <div className="relative" ref={branchFilterRef}>
              <button
                type="button"
                onClick={() => setShowBranchFilterDropdown((v) => !v)}
                title={graphShowAllBranches ? t('graph.allBranches') : t('graph.currentBranch')}
                className={cn(
                  'flex flex-col items-center justify-center p-1.5 rounded transition-colors group',
                  'hover:bg-[#3c495a]',
                  !graphShowAllBranches && 'text-[#a3f185]',
                )}
              >
                <div className={cn(
                  'w-5 h-5 flex items-center justify-center',
                  !graphShowAllBranches ? 'text-[#a3f185]' : 'text-[#9eacc0] group-hover:text-[#a3f185]',
                )}>
                  <Filter size={15} />
                </div>
                {!graphShowAllBranches && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#a3f185] shadow-[0_0_6px_rgba(163,241,133,0.7)]" />
                )}
              </button>

              <AnimatePresence>
                {showBranchFilterDropdown && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-full mt-1 bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/30 rounded-lg shadow-2xl py-1 z-50 w-44"
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
                          ? 'text-[#a3f185]'
                          : 'text-[#9eacc0] hover:text-[#d9e7fc] hover:bg-[#3c495a]/30',
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
                          ? 'text-[#a3f185]'
                          : 'text-[#9eacc0] hover:text-[#d9e7fc] hover:bg-[#3c495a]/30',
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
          )}
          <div className="relative" ref={searchButtonRef}>
            <ToolbarButton
              icon={<Search />}
              onClick={() => setShowSearchPopover((v) => !v)}
              title={t('toolbar.filter')}
              disabled={!repoPath}
            />
            {filterText && (
              <span className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-[#a3f185] shadow-[0_0_8px_rgba(163,241,133,0.7)]" />
            )}
          </div>
          <div className="w-px h-4 bg-[#3c495a] mx-1" />
          <ToolbarButton icon={<Settings />} onClick={() => setShowSettings(true)} title={t('toolbar.settings')} />
          <ToolbarButton icon={<HelpCircle />} onClick={() => setShowHelp(true)} title={t('toolbar.help')} />
          <div className="flex items-center gap-2 ml-2 pl-2">
            {githubUser ? (
              <button
                onClick={() => setShowProfile(true)}
                title={t('toolbar.connectedAs', { user: githubUser.login })}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {githubUser.avatarUrl ? (
                  <img
                    src={githubUser.avatarUrl}
                    alt={githubUser.login}
                    className="w-7 h-7 rounded-full border border-[#a3f185]/50"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-[#a3f185] to-[#68b24f] flex items-center justify-center text-[10px] font-bold text-[#052900] border border-[#a3f185]/50"
                  >
                    {userInitials(githubUser)}
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowProfile(true)}
                title={t('toolbar.connectGitHub')}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#9eacc0] hover:text-[#a3f185] hover:bg-[#172d45] transition-colors"
              >
                <UserCircle2 size={22} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ──────────── MAIN 3-COLUMN LAYOUT ──────────── */}
      {showSearchPopover && searchPopoverPos && (
        <div
          ref={searchPopoverRef}
          className="fixed w-[360px] rounded-md border border-[#3c495a]/25 bg-[#081a2d]/98 backdrop-blur-xl shadow-2xl shadow-black/40 p-2 z-[200]"
          style={{ top: searchPopoverPos.top, right: searchPopoverPos.right }}
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9eacc0]" />
            <input
              ref={filterInputRef}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-[#12273c]/95 border border-[#3c495a]/20 rounded px-8 py-2 text-sm text-[#d9e7fc] focus:outline-none focus:border-[#a3f185]/55"
              placeholder={t('toolbar.filter')}
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9eacc0] hover:text-[#d9e7fc] transition-colors"
                title="Limpiar filtro (Esc)"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* COLUMN 1: SIDEBAR */}
        <aside
          className="bg-[#041425] flex flex-col shrink-0 overflow-y-auto"
          style={{ width: sidebarW }}
        >
          {/* LOCAL — folder tree + ahead/behind chips */}
          <SidebarSection title={t('sidebar.local')} count={branches.length || undefined} icon={<Monitor size={12} className="text-[#5ed8ff]" />}>
            {branches.length === 0 && !repoPath && (
              <p className="px-4 py-2 text-xs text-[#9eacc0] italic">{t('sidebar.noBranches')}</p>
            )}
            <BranchTree
              branches={branches}
              currentBranch={currentBranch}
              tracking={branchTracking}
              onCheckout={(b) => handleCheckoutAttempt(b)}
              onContextMenu={(e, b) => {
                e.preventDefault();
                setBranchMenu({ x: e.clientX, y: e.clientY, branch: b });
              }}
            />
          </SidebarSection>

          {/* REMOTE branches (also as tree, grouped by 'origin/...') */}
          <SidebarSection title={t('sidebar.remote')} count={remoteBranches.length || undefined} icon={<Cloud size={12} className="text-[#5ed8ff]" />}>
            <RemoteBranchTree branches={remoteBranches} />
          </SidebarSection>

          {/* PULL REQUESTS — only when logged in to GitHub */}
          {githubUser && (
            <SidebarSection title={t('sidebar.pullRequests')} count={pullRequests.length || undefined}>
              {pullRequests.length === 0 && (
                <p className="px-4 py-1 text-[11px] text-[#9eacc0] italic">{t('sidebar.noPRs')}</p>
              )}
              {pullRequests.map((pr) => (
                <div
                  key={pr.number}
                  className={cn(
                    'group flex items-stretch text-sm transition-colors',
                    selectedPullRequest?.number === pr.number
                      ? 'bg-[#a3f185]/10 text-[#d9e7fc]'
                      : 'text-[#9eacc0] hover:bg-[#172d45] hover:text-[#d9e7fc]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPullRequest(pr)}
                    title={t('prDiff.view', { number: String(pr.number) })}
                    className="flex-1 min-w-0 text-left px-4 py-1.5 flex items-start gap-2"
                  >
                    <GitMerge size={14} className={cn('shrink-0 mt-0.5', pr.draft ? 'text-[#9eacc0]' : 'text-[#a3f185]')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-[#697789]">#{pr.number}</span>
                        {pr.draft && <span className="text-[9px] text-[#697789] uppercase">{t('sidebar.draft')}</span>}
                      </div>
                      <p className="text-xs truncate">{pr.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-[#697789]">
                        <span className="truncate">{pr.branch}</span>
                        <span className="text-[#a3f185]">+{pr.additions}</span>
                        <span className="text-[#ff716c]">-{pr.deletions}</span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.api?.shellOpenExternal(pr.url)}
                    title={t('sidebar.openInGitHub', { number: String(pr.number) })}
                    className="w-8 shrink-0 flex items-center justify-center text-[#697789] hover:text-[#a3f185] opacity-0 group-hover:opacity-100 transition"
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
                    className="text-[9px] px-1.5 py-0.5 rounded bg-[#ff716c] text-white font-bold"
                  >
                    Sí, limpiar
                  </button>
                  <button
                    onClick={() => setShowStashClearConfirm(false)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-[#3c495a] text-[#9eacc0]"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowStashClearConfirm(true)}
                  className="text-[9px] text-[#9eacc0] hover:text-[#ff716c] transition-colors ml-1 font-medium"
                  title="Eliminar todos los stashes"
                >
                  limpiar todo
                </button>
              )
            ) : undefined}
          >
            {stashes.length === 0 && repoPath && (
              <p className="px-4 py-1 text-[11px] text-[#9eacc0] italic">{t('sidebar.noStashes')}</p>
            )}
            {stashes.map((s) => (
              <StashItem key={s.index} stash={s} onApply={() => stashApply(s.index)} onDrop={() => stashDrop(s.index)} />
            ))}
          </SidebarSection>

          {/* TAGS */}
          <SidebarSection title={t('sidebar.tags')} count={tags.length || undefined}>
            {tags.length === 0 && repoPath && (
              <p className="px-4 py-1 text-[11px] text-[#9eacc0] italic">{t('sidebar.noTags')}</p>
            )}
            {tags.map((t) => <SidebarItem key={t} icon={<Tag size={16} />} text={t} />)}
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
                    className="w-full text-left px-4 py-1.5 flex items-center gap-3 text-sm hover:bg-[#172d45] text-[#9eacc0] hover:text-[#d9e7fc] transition-colors"
                  >
                    <TreePine size={14} className="shrink-0 text-[#5ed8ff]" />
                    <span className="truncate flex-1">{name}</span>
                    {wt.branch && (
                      <span className="text-[10px] font-mono text-[#697789] shrink-0">{wt.branch}</span>
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
        </aside>

        {/* ── Drag handle: sidebar ↔ center ── */}
        <div
          onMouseDown={startColDrag('sidebar')}
          className="w-1 shrink-0 cursor-col-resize hover:bg-[#a3f185]/40 active:bg-[#a3f185]/60 transition-colors bg-transparent group relative"
          title="Arrastrar para redimensionar"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" /> {/* wider hit area */}
        </div>

        {/* COLUMN 2: CENTER (Commit graph OR diff viewer) */}
        <main className="flex-1 bg-[#020f1e] overflow-hidden relative flex flex-col">
          {!repoPath || showRepoChooser ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 text-[#9eacc0] p-8">
              <div className="text-center">
                <FolderOpen size={56} className="mx-auto opacity-20 mb-4" />
                <p className="text-lg font-bold text-[#d9e7fc] mb-1">Bienvenido a GitCron</p>
                <p className="text-sm">Elegí cómo empezar:</p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-3xl">
                <EmptyStateCard
                  icon={<FolderOpen size={28} />}
                  title="Abrir existente"
                  desc="Seleccioná una carpeta que ya sea un repo git"
                  onClick={handleOpenExistingFromChooser}
                />
                <EmptyStateCard
                  icon={<Sparkles size={28} />}
                  title="Crear nuevo"
                  desc="Inicializar un repo nuevo en tu máquina"
                  onClick={handleCreateRepoFromChooser}
                  highlighted
                />
                <EmptyStateCard
                  icon={<Download size={28} />}
                  title="Clonar de GitHub"
                  desc="Bajar un repo existente desde una URL"
                  onClick={handleCloneRepoFromChooser}
                />
              </div>

              {!githubUser && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-xs text-[#9eacc0] hover:text-[#a3f185] underline transition-colors flex items-center gap-1.5"
                >
                  <Github size={12} />
                  Conectá tu cuenta de GitHub para clonar repos privados
                </button>
              )}
            </div>
          ) : selectedPullRequest ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-[#3c495a]/15 bg-[#041425] shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleCloseDiff}
                    className="flex items-center gap-1.5 text-xs text-[#9eacc0] hover:text-[#a3f185] transition-colors"
                  >
                    <ArrowLeft size={14} /> {t('prDiff.back')}
                  </button>
                  <span className="text-[#697789]">/</span>
                  <span className="text-xs font-mono text-[#a3f185]">PR #{selectedPullRequest.number}</span>
                  <div className="flex-1" />
                  {selectedPullRequest.draft && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#697789]/20 text-[#9eacc0] uppercase">
                      {t('sidebar.draft')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => window.api?.shellOpenExternal(selectedPullRequest.url)}
                    className="flex items-center gap-1.5 text-xs text-[#9eacc0] hover:text-[#a3f185] transition-colors"
                  >
                    <ExternalLink size={13} /> {t('prDiff.open')}
                  </button>
                </div>
                <div className="flex items-start gap-3">
                  <FileDiff size={18} className="text-[#5ed8ff] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-[#d9e7fc] truncate">{selectedPullRequest.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#9eacc0]">
                      <span>@{selectedPullRequest.author}</span>
                      <span className="text-[#697789]">·</span>
                      <span className="font-mono text-[#5ed8ff]">{selectedPullRequest.branch}</span>
                      <span className="text-[#697789]">→</span>
                      <span className="font-mono text-[#d9e7fc]">{selectedPullRequest.baseBranch}</span>
                      <span className="text-[#697789]">·</span>
                      <span>{t('prDiff.changedFiles', { count: String(pullRequestDiff?.changedFiles ?? selectedPullRequest.changedFiles) })}</span>
                      <span className="font-mono text-[#a3f185]">+{pullRequestDiff?.additions ?? selectedPullRequest.additions}</span>
                      <span className="font-mono text-[#ff716c]">-{pullRequestDiff?.deletions ?? selectedPullRequest.deletions}</span>
                    </div>
                  </div>
                </div>
                {!!pullRequestDiff?.files.length && (
                  <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                    {pullRequestDiff.files.slice(0, 18).map((file) => (
                      <span
                        key={file.filename}
                        title={file.previousFilename ? `${file.previousFilename} → ${file.filename}` : file.filename}
                        className="shrink-0 max-w-[220px] truncate rounded border border-[#3c495a]/20 bg-[#020f1e] px-2 py-1 text-[10px] font-mono text-[#9eacc0]"
                      >
                        {file.filename}
                      </span>
                    ))}
                    {pullRequestDiff.files.length > 18 && (
                      <span className="shrink-0 rounded border border-[#3c495a]/20 bg-[#020f1e] px-2 py-1 text-[10px] font-mono text-[#697789]">
                        +{pullRequestDiff.files.length - 18}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {pullRequestDiffLoading ? (
                <div className="flex-1 flex items-center justify-center text-[#9eacc0] text-sm">
                  <Loader2 size={16} className="animate-spin mr-2 text-[#a3f185]" />
                  {t('prDiff.loading')}
                </div>
              ) : (
                <DiffViewer diff={pullRequestDiff?.diff ?? ''} filePath={t('prDiff.unifiedDiff', { number: String(selectedPullRequest.number) })} />
              )}
            </div>
          ) : selectedFile ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[#3c495a]/15 bg-[#041425] shrink-0">
                <button
                  onClick={handleCloseDiff}
                  className="flex items-center gap-1.5 text-xs text-[#9eacc0] hover:text-[#a3f185] transition-colors"
                >
                  <ArrowLeft size={14} /> Volver al graph
                </button>
                <span className="text-[#697789]">/</span>
                <span className="text-xs text-[#d9e7fc] font-mono truncate">{selectedFile.path}</span>
                <div className="flex-1" />
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-bold',
                    selectedFile.status === 'modified' ? 'bg-[#fd9d1a]/20 text-[#fd9d1a]' :
                    selectedFile.status === 'added' ? 'bg-[#a3f185]/20 text-[#a3f185]' :
                    selectedFile.status === 'renamed' ? 'bg-[#5ed8ff]/20 text-[#5ed8ff]' :
                    selectedFile.status === 'untracked' ? 'bg-[#9eacc0]/20 text-[#9eacc0]' :
                    'bg-[#ff716c]/20 text-[#ff716c]',
                  )}
                >
                  {selectedFile.status.toUpperCase()}
                </span>
              </div>
              <DiffViewer diff={currentDiff} filePath={selectedFile.path} />
            </div>
          ) : activeTab === 'History' ? (
            <HistoryView
              commits={commits}
              selectedHash={selectedCommit?.hash}
              currentBranch={currentBranch}
              filterText={filterText}
              onSelect={handleSelectCommit}
              onContextMenu={(e, c) => setContextMenu({ x: e.clientX, y: e.clientY, hash: c.hash })}
              isLoading={isLoading}
            />
          ) : activeTab === 'Commit' ? (
            <CommitTabView
              modifiedFiles={modifiedFiles}
              hasGithubUser={!!githubUser}
            />
          ) : (
            /* Graph tab — default */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="sticky top-0 bg-[#020f1e]/75 backdrop-blur-xl z-10 border-b border-[#3c495a]/15 py-2 flex items-center text-[10px] text-[#9eacc0] uppercase tracking-wider font-bold shrink-0">
                <div className="shrink-0 text-right pl-3 pr-3" style={{ width: graphColumns.refs }}>Branch / Tag</div>
                <GraphColumnHandle onMouseDown={startGraphColDrag('refs')} />
                <div className="shrink-0 text-left px-2" style={{ width: graphColumns.graph }}>Graph</div>
                <GraphColumnHandle onMouseDown={startGraphColDrag('graph')} />
                <div className="flex-1 flex items-center gap-2 pl-5">
                  Commit message
                  {filterText.trim() && (
                    <span className="text-[10px] normal-case px-1.5 py-0.5 rounded bg-[#a3f185]/15 text-[#a3f185] border border-[#a3f185]/30">
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

              <div className="flex-1 overflow-y-auto">
                {commits.length === 0 && isLoading && (
                  <p className="px-4 py-8 text-center text-[#9eacc0] text-sm">Cargando commits...</p>
                )}
                {commits.length > 0 && (
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
                )}
              </div>
            </div>
          )}
        </main>

        {/* ── Drag handle: center ↔ details ── */}
        <div
          onMouseDown={startColDrag('details')}
          className="w-1 shrink-0 cursor-col-resize hover:bg-[#a3f185]/40 active:bg-[#a3f185]/60 transition-colors bg-transparent relative"
          title="Arrastrar para redimensionar"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* COLUMN 3: COMMIT DETAILS + FILE CHANGES + COMMIT BOX */}
        <aside
          className="bg-[#041425] flex flex-col shrink-0 overflow-hidden"
          style={{ width: detailsW }}
        >
          {selectedCommit ? (
            <div className="flex flex-col h-full">
              {/* WIP banner: visible when commit is selected but there are unsaved changes */}
              {modifiedFiles.length > 0 && (
                <div className="px-3 py-2 bg-[#fd9d1a]/10 border-b border-[#fd9d1a]/20 flex items-center gap-2 shrink-0">
                  <Archive size={13} className="text-[#fd9d1a] shrink-0" />
                  <span className="text-[11px] text-[#d9e7fc] flex-1">
                    {modifiedFiles.length} cambio{modifiedFiles.length !== 1 ? 's' : ''} sin commitear
                  </span>
                  <button
                    onClick={stashChanges}
                    disabled={isLoading}
                    className="text-[10px] font-bold text-[#fd9d1a] hover:text-[#052900] hover:bg-[#fd9d1a] px-2 py-0.5 rounded border border-[#fd9d1a]/40 transition-colors disabled:opacity-50"
                    title="Guardar los cambios actuales en el stash"
                  >
                    Stash
                  </button>
                  <button
                    onClick={() => setSelectedCommit(null)}
                    className="text-[10px] text-[#9eacc0] hover:text-[#d9e7fc] px-2 py-0.5 rounded border border-[#3c495a]/15 transition-colors"
                    title="Ir al staging area"
                  >
                    Ver cambios →
                  </button>
                </div>
              )}
              <div className="p-4 border-b border-[#3c495a]/15">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[12px] font-mono text-[#a3f185]">commit: {selectedCommit.shortHash}</div>
                  <button className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#3c495a] text-xs hover:bg-[#172d45] transition-colors">
                    <Zap size={12} className="text-[#fd9d1a]" /> Explain
                  </button>
                </div>
                <h2 className="font-semibold mb-1">{selectedCommit.message}</h2>
                <div className="text-xs text-[#9eacc0] mb-4">{formatDate(selectedCommit.date)}</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#a3f185] flex items-center justify-center text-xs font-bold">
                    {initials(selectedCommit.authorName)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{selectedCommit.authorName}</div>
                    <div className="text-[10px] text-[#9eacc0]">{selectedCommit.authorEmail}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-2 border-b border-[#3c495a]/15 flex justify-between items-center bg-[#0d2134]">
                  <span className="text-[11px] font-bold text-[#9eacc0] uppercase tracking-wider">
                    {commitFilesLoading
                      ? 'Cargando archivos...'
                      : `Changed files (${commitFiles.length})`}
                  </span>
                </div>
                <div className="p-1">
                  {commitFiles.map((file) => (
                    <button
                      key={file.path}
                      onClick={async () => {
                        if (!repoPath || !window.api) return;
                        const r = await window.api.gitDiffAtCommit(repoPath, file.path, selectedCommit!.hash);
                        if (r.success && r.data) {
                          useGitStore.getState().setCurrentDiff(r.data);
                          useGitStore.getState().setSelectedFile(file);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                        selectedFile?.path === file.path
                          ? 'bg-[#a3f185]/10 text-[#a3f185]'
                          : 'text-[#9eacc0] hover:bg-[#172d45] hover:text-[#d9e7fc]',
                      )}
                    >
                      <span className={cn(
                        'text-[10px] font-bold w-4 shrink-0',
                        file.status === 'added' ? 'text-[#a3f185]' :
                        file.status === 'deleted' ? 'text-[#ff716c]' :
                        file.status === 'renamed' ? 'text-[#5ed8ff]' :
                        'text-[#fd9d1a]',
                      )}>
                        {file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : file.status === 'renamed' ? 'R' : 'M'}
                      </span>
                      <span className="truncate text-xs">{file.path}</span>
                    </button>
                  ))}
                  {!commitFilesLoading && commitFiles.length === 0 && (
                    <p className="px-4 py-4 text-xs text-[#697789] text-center">Sin archivos en este commit</p>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-[#3c495a]/15 bg-[#0d2134]">
                <textarea
                  className="w-full bg-[#041425] border border-[#3c495a]/15 rounded p-2 text-sm text-[#d9e7fc] h-24 focus:outline-none focus:border-[#a3f185]/30 resize-none"
                  placeholder="Mensaje del commit (requerido)"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                />
                <button
                  onClick={commitChanges}
                  disabled={isLoading || !commitMessage.trim() || !repoPath}
                  className="w-full mt-3 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold text-[#052900] rounded transition-colors shadow-lg shadow-[#a3f185]/20"
                >
                  {isLoading
                    ? 'Commiteando...'
                    : `Commit (${modifiedFiles.filter((f) => f.staged).length} staged)`}
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
                setFileContextMenu({ x: e.clientX, y: e.clientY, file });
              }}
              onRequestResetAll={() => setShowResetConfirm(true)}
            />
          )}
        </aside>
      </div>

      {/* ──────────── SUCCESS TOAST (auto-dismiss 3s) ──────────── */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 bg-[#a3f185]/20 backdrop-blur-md text-[#a3f185] rounded-lg shadow-2xl flex items-center gap-3 z-50 border border-[#a3f185]/40 max-w-xl"
          >
            <Check size={18} className="shrink-0" />
            <span className="text-sm font-medium">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-3 hover:opacity-70 shrink-0 text-[#a3f185]">
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
            className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 bg-[#12273c]/98 backdrop-blur-md text-[#d9e7fc] rounded-lg shadow-2xl flex items-center gap-3 z-50 border border-[#f4b942]/30 w-[min(calc(100vw-2rem),760px)]"
          >
            <AlertCircle size={20} className="shrink-0 text-[#f4b942]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#ffd98a] leading-tight">
                {pullDecision.mode === 'diverged'
                  ? `"${pullDecision.branch}" tiene cambios locales y remotos`
                  : `"${pullDecision.branch}" tiene cambios remotos pendientes`}
              </p>
              <p className="text-xs text-[#9eacc0] mt-0.5 leading-snug">
                {pullDecision.mode === 'diverged'
                  ? pullDecision.source === 'push'
                    ? `Push pausado: primero integrá ${pullDecision.behind} remoto${pullDecision.behind === 1 ? '' : 's'} con tus ${pullDecision.ahead} local${pullDecision.ahead === 1 ? '' : 'es'}.`
                    : `Hay ${pullDecision.behind} remoto${pullDecision.behind === 1 ? '' : 's'} y ${pullDecision.ahead} local${pullDecision.ahead === 1 ? '' : 'es'} por combinar.`
                  : `Traé ${pullDecision.behind} commit${pullDecision.behind === 1 ? '' : 's'} sin crear un commit extra.`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pullDecision.mode === 'behind' && (
                <button
                  type="button"
                  onClick={() => void handlePullDecision('ff-only')}
                  className="px-3 py-1.5 text-xs font-bold bg-[#a3f185]/20 hover:bg-[#a3f185]/30 text-[#a3f185] rounded transition-colors whitespace-nowrap"
                  title="Trae los commits remotos sin crear un commit de merge"
                >
                  Fast-forward
                </button>
              )}
              {pullDecision.mode === 'diverged' && (
                <button
                  type="button"
                  onClick={() => void handlePullDecision('rebase')}
                  className="px-3 py-1.5 text-xs font-bold bg-[#a3f185]/20 hover:bg-[#a3f185]/30 text-[#a3f185] rounded transition-colors whitespace-nowrap"
                  title="Recomendado: trae lo remoto y reaplica tus commits locales arriba"
                >
                  Pull con rebase
                </button>
              )}
              <button
                type="button"
                onClick={() => void handlePullDecision('merge')}
                className="px-3 py-1.5 text-xs font-bold bg-[#f4b942]/15 hover:bg-[#f4b942]/25 text-[#ffd98a] rounded transition-colors whitespace-nowrap"
                title="Trae lo remoto creando un commit de merge si hace falta"
              >
                Pull con merge
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
            <span className="text-sm font-medium flex-1">{error}</span>
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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowNewBranch(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#a3f185] flex items-center gap-2"><GitBranch size={16} /> Nueva Branch</h3>
                <button onClick={() => setShowNewBranch(false)} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={16} /></button>
              </div>
              {newBranchFrom && (
                <p className="text-xs text-[#9eacc0] mb-3">
                  Desde commit: <span className="font-mono text-[#a3f185]">{newBranchFrom.slice(0, 7)}</span>
                </p>
              )}
              <input
                ref={newBranchInputRef}
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBranch(); if (e.key === 'Escape') setShowNewBranch(false); }}
                placeholder="feature/mi-nueva-feature"
                className="w-full bg-[#041425] border border-[#3c495a]/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#a3f185]/50 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNewBranch(false)} className="px-4 py-2 text-sm text-[#9eacc0] hover:text-[#d9e7fc]">{t('modal.cancel')}</button>
                <button
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim() || isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded"
                >
                  <Plus size={14} className="inline mr-1" /> Crear
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── PROFILE DROPDOWN ──────────── */}
      <AnimatePresence>
        {showProfile && (
          <ProfileMenu
            user={githubUser}
            isLoading={isLoading}
            tokenInput={tokenInput}
            setTokenInput={setTokenInput}
            authMode={authMode}
            setAuthMode={setAuthMode}
            deviceCodeInfo={deviceCodeInfo}
            isLoggingIn={isLoggingIn}
            onClose={() => setShowProfile(false)}
            onLogin={handleLoginWithGitHub}
            onConnectToken={handleConnectGitHub}
            onLogout={() => { disconnectGitHub(); setShowProfile(false); }}
          />
        )}
      </AnimatePresence>

      {/* ──────────── SETTINGS (preferencias) ──────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl w-[560px] max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#3c495a]/15 shrink-0">
                <h3 className="font-bold text-[#a3f185] flex items-center gap-2 text-base">
                  <Settings size={16} /> {t('settings.title')}
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={16} /></button>
              </div>

              <div className="space-y-5 px-6 py-5 overflow-y-auto scrollbar-thin flex-1">
                {/* ── Language ── */}
                <section>
                  <h4 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Globe size={12} /> {t('settings.language')}
                  </h4>
                  <p className="text-xs text-[#9eacc0] mb-3">{t('settings.languageDesc')}</p>
                  <div className="flex gap-2">
                    {LANGS.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => changeLanguage(l.code as Lang)}
                        className={cn(
                          'flex-1 px-3 py-2 rounded border text-sm flex items-center justify-center gap-2 transition-colors',
                          language === l.code
                            ? 'bg-[#a3f185]/15 border-[#a3f185]/50 text-[#a3f185]'
                            : 'bg-[#041425] border-[#3c495a]/15 text-[#9eacc0] hover:text-[#d9e7fc] hover:border-[#3c495a]/30',
                        )}
                      >
                        <span className="text-base">{l.flag}</span>
                        <span className="font-medium">{l.label}</span>
                        {language === l.code && <Check size={14} strokeWidth={3} className="ml-1" />}
                      </button>
                    ))}
                  </div>
                </section>

                {/* ── Theme ── */}
                <section>
                  <h4 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Type size={12} /> {t('settings.fontSize')}
                  </h4>
                  <p className="text-xs text-[#9eacc0] mb-3">{t('settings.fontSizeDesc')}</p>
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
                            'px-3 py-2 rounded border text-sm flex items-center justify-center gap-2 transition-colors',
                            fontSize === option.key
                              ? 'bg-[#a3f185]/15 border-[#a3f185]/50 text-[#a3f185]'
                              : 'bg-[#041425] border-[#3c495a]/15 text-[#9eacc0] hover:text-[#d9e7fc] hover:border-[#3c495a]/30',
                          )}
                        >
                          <span className="font-medium">{t(labelKey)}</span>
                          {fontSize === option.key && <Check size={14} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* ── Default folder ── */}
                <section>
                  <h4 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Folder size={12} /> {t('settings.defaultFolder')}
                  </h4>
                  <p className="text-xs text-[#9eacc0] mb-3">{t('settings.defaultFolderDesc')}</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 px-3 py-2 rounded border bg-[#041425] border-[#3c495a]/15 text-sm font-mono truncate"
                      title={defaultFolder ?? ''}
                    >
                      <span className={defaultFolder ? 'text-[#d9e7fc]' : 'text-[#697789]'}>
                        {defaultFolder ?? t('settings.defaultFolderNone')}
                      </span>
                    </div>
                    <button
                      onClick={() => pickDefaultFolder()}
                      className="px-3 py-2 rounded border bg-[#041425] border-[#3c495a]/30 text-sm text-[#d9e7fc] hover:bg-[#3c495a]/30 transition-colors"
                    >
                      {t('settings.defaultFolderChange')}
                    </button>
                    {defaultFolder && (
                      <button
                        onClick={() => changeDefaultFolder(null)}
                        className="px-3 py-2 rounded border bg-[#041425] border-[#3c495a]/15 text-sm text-[#9eacc0] hover:text-[#ffa8a3] hover:border-[#ffa8a3]/30 transition-colors"
                      >
                        {t('settings.defaultFolderClear')}
                      </button>
                    )}
                  </div>
                </section>

                {/* ── Auto-fetch ── */}
                <AutoFetchSection setAutoFetchPrefs={setAutoFetchPrefs} />
                <OsNotificationsSection setOsNotifications={setOsNotifications} />
                <ShortcutsSection
                  rebindShortcut={rebindShortcut}
                  resetShortcutsToDefaults={resetShortcutsToDefaults}
                />

                <section>
                  <h4 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Sparkles size={12} /> {t('settings.theme')}
                  </h4>
                  <p className="text-xs text-[#697789] mb-2 italic">{t('settings.themeLightWarning')}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => changeTheme('dark')}
                      className={cn(
                        'flex-1 px-3 py-2 rounded border text-sm flex items-center gap-2 transition-colors',
                        theme === 'dark'
                          ? 'bg-[#a3f185]/15 border-[#a3f185]/50 text-[#a3f185]'
                          : 'bg-[#041425] border-[#3c495a]/15 text-[#9eacc0] hover:text-[#d9e7fc]',
                      )}
                    >
                      {theme === 'dark' && <Check size={14} strokeWidth={3} />}
                      {t('settings.themeDark')}
                    </button>
                    <button
                      type="button"
                      onClick={() => changeTheme('light')}
                      className={cn(
                        'flex-1 px-3 py-2 rounded border text-sm flex items-center gap-2 transition-colors',
                        theme === 'light'
                          ? 'bg-[#a3f185]/15 border-[#a3f185]/50 text-[#a3f185]'
                          : 'bg-[#041425] border-[#3c495a]/15 text-[#9eacc0] hover:text-[#d9e7fc]',
                      )}
                    >
                      {theme === 'light' && <Check size={14} strokeWidth={3} />}
                      {t('settings.themeLight')}
                    </button>
                  </div>
                </section>

                {/* ── Security ── */}
                <section>
                  <h4 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Lock size={12} /> {t('settings.security')}
                  </h4>
                  <p className="text-[11px] text-[#9eacc0] mb-2 leading-relaxed">
                    {t('settings.dataLocation')}
                  </p>
                  <button
                    onClick={() => window.api?.shellOpenPath('https://github.com/alejandropd-1/gitcron/blob/main/SECURITY.md')}
                    className="w-full text-left px-3 py-2 bg-[#041425] border border-[#3c495a]/15 hover:border-[#3c495a]/30 rounded text-sm text-[#9eacc0] hover:text-[#d9e7fc] flex items-center gap-2 transition-colors"
                  >
                    <FileText size={14} />
                    {t('settings.viewSecurity')}
                  </button>
                </section>

                {/* ── About ── */}
                <section>
                  <h4 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <HelpCircle size={12} /> {t('settings.about')}
                  </h4>
                  <div className="bg-[#041425] border border-[#3c495a]/15 rounded p-3 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[#9eacc0]">GitCron</span>
                      <span className="text-[#a3f185] font-mono">v{pkg.version}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#697789]">
                      <span>Electron + Next.js + simple-git</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#3c495a]/15 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => window.api.shellOpenExternal('https://github.com/alejandropd-1/gitcron/releases/')}
                        className="flex items-center gap-2 text-[#9eacc0] hover:text-[#a3f185] transition-colors text-left"
                      >
                        <Github size={12} />
                        <span>{t('settings.viewReleases')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.api.shellOpenExternal('https://aledesign.dev/')}
                        className="flex items-center gap-2 text-[#697789] hover:text-[#a3f185] transition-colors text-left text-[10px]"
                      >
                        <Sparkles size={11} />
                        <span>{t('settings.developedBy')}</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* ── Updates ── */}
                <section>
                  <h4 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <RotateCcw size={12} /> {t('settings.checkUpdates')}
                  </h4>
                  <p className="text-xs text-[#9eacc0] mb-3">{t('settings.checkUpdatesDesc')}</p>
                  <button
                    type="button"
                    onClick={handleCheckForUpdate}
                    disabled={isCheckingUpdate}
                    className="px-3 py-2 rounded border text-sm flex items-center gap-2 transition-colors bg-[#041425] border-[#3c495a]/15 text-[#9eacc0] hover:border-[#a3f185]/40 hover:text-[#a3f185] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCheckingUpdate
                      ? <Loader2 size={14} className="animate-spin" />
                      : <RotateCcw size={14} />
                    }
                    <span className="font-medium">{t('settings.checkUpdatesButton')}</span>
                  </button>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── HELP MODAL ──────────── */}
      <AnimatePresence>
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </AnimatePresence>

      {/* ──────────── INIT REPO MODAL ──────────── */}
      <AnimatePresence>
        {showInitRepo && (
          <InitRepoModal
            onClose={() => setShowInitRepo(false)}
            onPickFolder={() => pickFolder('Elegir carpeta padre donde crear el repo')}
            onCreate={async (parent, name, withGitHub) => {
              if (withGitHub && githubToken) {
                // Create on GitHub first, then clone
                const r = await createGitHubRepo(githubToken, name, true, '');
                if (!r.success || !r.data) return false;
                const cl = await cloneRepo(r.data.cloneUrl, parent, name, githubToken);
                return cl.success;
              }
              const r = await initRepo(parent, name, true);
              return r.success;
            }}
            isLoading={isLoading}
            githubConnected={!!githubUser}
          />
        )}
      </AnimatePresence>

      {/* ──────────── CLONE REPO MODAL ──────────── */}
      <AnimatePresence>
        {showCloneRepo && (
          <CloneRepoModal
            onClose={() => setShowCloneRepo(false)}
            onPickFolder={() => pickFolder('Elegir carpeta padre donde clonar')}
            onClone={async (url, parent, name) => {
              const r = await cloneRepo(url, parent, name, githubToken ?? undefined);
              return r.success;
            }}
            onListRepos={() => githubToken ? listUserGitHubRepos(githubToken) : Promise.resolve([])}
            isLoading={isLoading}
            githubConnected={!!githubUser}
          />
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

      {/* ──────────── MERGE: needs checkout to target branch first ──────────── */}
      <AnimatePresence>
        {mergeNeedsCheckout && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setMergeNeedsCheckout(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-[520px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <GitMerge size={22} className="text-[#a3f185] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-[#d9e7fc] mb-1">Cambiar a {mergeNeedsCheckout.targetBranch} para mergear</h3>
                  <p className="text-sm text-[#9eacc0] leading-relaxed">
                    Para mergear <code className="text-[#a3f185] bg-[#020f1e] px-1 rounded">{mergeNeedsCheckout.sourceBranch}</code> en{' '}
                    <code className="text-[#a3f185] bg-[#020f1e] px-1 rounded">{mergeNeedsCheckout.targetBranch}</code>,
                    primero hay que estar en esa branch.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setMergeNeedsCheckout(null)}
                  className="px-4 py-2 text-sm text-[#9eacc0] hover:text-[#d9e7fc]"
                >
                  Cancelar
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
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded flex items-center gap-2"
                >
                  <GitMerge size={14} />
                  Checkout {mergeNeedsCheckout.targetBranch} y mergear
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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setRenameModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#a3f185] flex items-center gap-2"><GitBranch size={16} /> Renombrar branch</h3>
                <button onClick={() => setRenameModal(null)} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={16} /></button>
              </div>
              <p className="text-xs text-[#9eacc0] mb-2">Renombrando:</p>
              <p className="text-sm text-[#d9e7fc] font-mono bg-[#020f1e] px-3 py-1.5 rounded mb-3">{renameModal.oldName}</p>
              <input
                autoFocus
                value={renameModal.newName}
                onChange={(e) => setRenameModal({ ...renameModal, newName: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Escape') setRenameModal(null); }}
                placeholder="nuevo-nombre"
                className="w-full bg-[#020f1e] border border-[#3c495a]/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#a3f185]/50 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setRenameModal(null)} className="px-4 py-2 text-sm text-[#9eacc0] hover:text-[#d9e7fc]">{t('modal.cancel')}</button>
                <button
                  onClick={async () => {
                    const newName = renameModal.newName.trim();
                    if (!newName || newName === renameModal.oldName) { setRenameModal(null); return; }
                    const ok = await renameBranch(renameModal.oldName, newName);
                    if (ok) setRenameModal(null);
                  }}
                  disabled={!renameModal.newName.trim() || renameModal.newName === renameModal.oldName || isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded"
                >
                  Renombrar
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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-[480px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <Trash2 size={20} className="text-[#ff716c] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-[#d9e7fc] mb-1">Eliminar branch</h3>
                  <p className="text-sm text-[#9eacc0]">
                    ¿Eliminar <code className="text-[#a3f185] bg-[#020f1e] px-1 rounded">{deleteConfirm.branch}</code>?
                  </p>
                  {deleteConfirm.notMerged && (
                    <p className="text-xs text-[#fd9d1a] mt-2 leading-relaxed">
                      ⚠ Esta branch tiene commits que no fueron mergeados a ninguna otra branch.
                      Si la borrás, esos commits se pierden (a menos que recuperes via reflog).
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-[#9eacc0] hover:text-[#d9e7fc]">{t('modal.cancel')}</button>
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
                  className="px-4 py-2 bg-[#ff716c] hover:bg-[#ffa8a3] disabled:opacity-50 text-[#490006] text-sm font-bold rounded"
                >
                  {deleteConfirm.notMerged ? 'Forzar eliminación' : 'Eliminar'}
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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setCheckoutConflict(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-[520px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle size={22} className="text-[#fd9d1a] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-[#d9e7fc] mb-1">Cambios sin commitear</h3>
                  <p className="text-sm text-[#9eacc0] leading-relaxed">
                    No se puede pasar a <code className="text-[#a3f185] bg-[#020f1e] px-1 rounded">{checkoutConflict.branch}</code>{' '}
                    porque tenés cambios que serían sobrescritos. ¿Qué hacés?
                  </p>
                </div>
              </div>

              <div className="bg-[#020f1e] border border-[#3c495a]/15 rounded p-3 mb-4 text-[11px] font-mono text-[#697789] max-h-32 overflow-y-auto">
                {checkoutConflict.error}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setCheckoutConflict(null)}
                  className="px-4 py-2 text-sm text-[#9eacc0] hover:text-[#d9e7fc]"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const branch = checkoutConflict.branch;
                    setCheckoutConflict(null);
                    await checkoutBranchSmart(branch, { stashFirst: true });
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded flex items-center gap-2"
                >
                  <Archive size={14} />
                  Stash y cambiar
                </button>
              </div>
              <p className="text-[10px] text-[#697789] mt-3 text-center">
                "Stash y cambiar" guarda tus cambios actuales en la pila de stash y hace el checkout.
                Después podés recuperarlos desde la sección STASH.
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
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#9f0519]/95 backdrop-blur-md border border-[#ffa8a3]/30 rounded-lg shadow-2xl px-4 py-3 flex items-center gap-4 max-w-2xl"
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
              className="shrink-0 px-3 py-1.5 text-xs font-bold bg-[#ff716c] hover:bg-[#ff8a86] text-white rounded transition-colors disabled:opacity-50"
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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowAmend(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-[520px] max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#fd9d1a] flex items-center gap-2 text-base">
                  <RotateCcw size={16} /> {t('amend.title')}
                </h3>
                <button onClick={() => setShowAmend(false)} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={16} /></button>
              </div>
              <p className="text-xs text-[#9eacc0] mb-3">{t('amend.desc')}</p>
              <div className="bg-[#fd9d1a]/10 border border-[#fd9d1a]/30 rounded p-2 text-xs text-[#ffd89e] mb-4">
                {t('amend.warning')}
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#9eacc0] block mb-1">
                    {t('amend.currentMessage')}
                  </label>
                  <div className="bg-[#041425] border border-[#3c495a]/15 rounded p-2 text-sm text-[#9eacc0] font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    {commits[0]?.message || '(sin commits)'}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#9eacc0] block mb-1">
                    {t('amend.newMessage')}
                  </label>
                  <textarea
                    autoFocus
                    value={amendNewMessage}
                    onChange={(e) => setAmendNewMessage(e.target.value)}
                    placeholder={commits[0]?.message || ''}
                    className="w-full bg-[#041425] border border-[#3c495a]/15 rounded p-2 text-sm text-[#d9e7fc] h-24 focus:outline-none focus:border-[#fd9d1a]/40 resize-none"
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
                  className="px-4 py-2 bg-[#041425] border border-[#3c495a]/30 hover:text-[#d9e7fc] text-sm text-[#9eacc0] rounded transition-colors"
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSquash(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-[520px]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#fd9d1a] flex items-center gap-2 text-base">
                  <Layers size={16} /> Combinar últimos commits (Squash)
                </h3>
                <button onClick={() => setShowSquash(false)} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={16} /></button>
              </div>
              <div className="bg-[#fd9d1a]/10 border border-[#fd9d1a]/30 rounded p-2 text-xs text-[#ffd89e] mb-4">
                ⚠ Si ya pusheaste alguno de estos commits al remoto, vas a necesitar un force-push después. No hagas squash de commits compartidos con otros.
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#9eacc0] block mb-2">Combinar los últimos</label>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setSquashN(n)} className={cn('flex-1 py-2 rounded border text-sm font-bold transition-colors', squashN === n ? 'bg-[#fd9d1a]/15 border-[#fd9d1a]/50 text-[#fd9d1a]' : 'bg-[#041425] border-[#3c495a]/30 text-[#9eacc0] hover:text-[#d9e7fc]')}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 bg-[#041425] border border-[#3c495a]/15 rounded p-2 max-h-32 overflow-y-auto">
                    {commits.slice(0, squashN).map((c, i) => (
                      <div key={c.hash} className="flex items-center gap-2 py-0.5 text-xs">
                        <span className="font-mono text-[#697789] shrink-0">{c.shortHash}</span>
                        <span className={cn('truncate', i === 0 ? 'text-[#d9e7fc]' : 'text-[#9eacc0]')}>{c.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#9eacc0] block mb-1">Nuevo mensaje del commit</label>
                  <textarea
                    autoFocus
                    value={squashMessage}
                    onChange={(e) => setSquashMessage(e.target.value)}
                    placeholder={commits[0]?.message ?? ''}
                    className="w-full bg-[#041425] border border-[#3c495a]/15 rounded p-2 text-sm text-[#d9e7fc] h-20 focus:outline-none focus:border-[#fd9d1a]/40 resize-none"
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
                  {isLoading ? '...' : `Combinar ${squashN} commits`}
                </button>
                <button onClick={() => { setShowSquash(false); setSquashMessage(''); setSquashN(2); }} className="px-4 py-2 bg-[#041425] border border-[#3c495a]/30 hover:text-[#d9e7fc] text-sm text-[#9eacc0] rounded transition-colors">
                  Cancelar
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
        'flex flex-col items-center justify-center p-1.5 rounded transition-colors group',
        label && 'px-3',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#3c495a]',
      )}
    >
      <div className="w-5 h-5 text-[#9eacc0] group-hover:text-[#a3f185] flex items-center justify-center">{icon}</div>
      {label && <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter text-[#9eacc0]">{label}</span>}
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
      <div className="w-full flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#9eacc0]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 flex-1 text-left hover:text-[#d9e7fc] transition-colors"
        >
          <ChevronRight size={12} className={cn('transition-transform shrink-0', isOpen && 'rotate-90')} />
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="flex-1 text-left tracking-wider">{title}</span>
        </button>
        {count !== undefined && <span className="bg-[#3c495a] text-[9px] px-1.5 rounded-full">{count}</span>}
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
        active ? 'text-[#a3f185] bg-[#a3f185]/10' : 'text-[#9eacc0] hover:bg-[#3c495a] hover:text-[#d9e7fc]',
        onClick && 'cursor-pointer',
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#a3f185]" />}
      <span className={cn('shrink-0', active ? 'text-[#a3f185]' : 'text-[#9eacc0] group-hover:text-[#d9e7fc]')}>{icon}</span>
      <span className="truncate">{text}</span>
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
  branches, currentBranch, tracking, onCheckout, onContextMenu,
}: {
  branches: string[];
  currentBranch: string;
  tracking: Record<string, { ahead: number; behind: number; gone: boolean; upstream: string | null }>;
  onCheckout: (b: string) => void;
  onContextMenu: (e: React.MouseEvent, branch: string) => void;
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
        />
      ))}
    </div>
  );
}

function BranchFolderView({
  folder, currentBranch, tracking, onCheckout, onContextMenu,
}: {
  folder: BranchFolder;
  currentBranch: string;
  tracking: Record<string, { ahead: number; behind: number; gone: boolean; upstream: string | null }>;
  onCheckout: (b: string) => void;
  onContextMenu: (e: React.MouseEvent, branch: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-[26px] pr-3 py-1 flex items-center gap-2 text-sm text-[#9eacc0] hover:text-[#d9e7fc] hover:bg-[#172d45] transition-colors"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={14} className="text-[#9eacc0] shrink-0" />
        <span className="truncate flex-1 text-left">{folder.prefix}</span>
        <span className="text-[10px] text-[#697789]">{folder.branches.length}</span>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BranchRow({
  name, fullPath, tracking, isActive, onCheckout, onContextMenu, indent,
}: {
  name: string;
  fullPath: string;
  tracking?: { ahead: number; behind: number; gone: boolean; upstream: string | null };
  isActive: boolean;
  onCheckout: (b: string) => void;
  onContextMenu: (e: React.MouseEvent, branch: string) => void;
  indent: boolean;
}) {
  return (
    <div
      onDoubleClick={() => onCheckout(fullPath)}
      onContextMenu={(e) => onContextMenu(e, fullPath)}
      title={`Doble click: checkout · Click derecho: opciones`}
      className={cn(
        'flex items-center gap-2 py-1 pr-3 group cursor-pointer transition-colors',
        indent ? 'pl-[46px]' : 'pl-[26px]',
        isActive ? 'bg-[#a3f185]/10 text-[#a3f185]' : 'text-[#9eacc0] hover:bg-[#172d45] hover:text-[#d9e7fc]',
      )}
    >
      {isActive ? (
        <Check size={13} strokeWidth={3} className="text-[#a3f185] shrink-0" />
      ) : (
        <GitBranch size={13} className="shrink-0 text-[#697789]" />
      )}
      <span className="truncate flex-1 text-sm">{name}</span>

      {/* Ahead / behind chips */}
      {tracking && !tracking.gone && (tracking.ahead > 0 || tracking.behind > 0) && (
        <span className="flex items-center gap-1 text-[10px] font-mono shrink-0">
          {tracking.ahead > 0 && (
            <span className="flex items-center text-[#a3f185]" title={`${tracking.ahead} commit${tracking.ahead === 1 ? '' : 's'} local${tracking.ahead === 1 ? '' : 'es'} pendiente${tracking.ahead === 1 ? '' : 's'} de push`}>
              {tracking.ahead}
              <ArrowUp size={10} strokeWidth={3} />
            </span>
          )}
          {tracking.behind > 0 && (
            <span className="flex items-center text-[#fd9d1a]" title={`${tracking.behind} commit${tracking.behind === 1 ? '' : 's'} remoto${tracking.behind === 1 ? '' : 's'} pendiente${tracking.behind === 1 ? '' : 's'} de pull`}>
              {tracking.behind}
              <ArrowDown size={10} strokeWidth={3} />
            </span>
          )}
        </span>
      )}
      {tracking?.gone && (
        <span className="text-[9px] text-[#ff716c] uppercase shrink-0" title="Upstream eliminado">gone</span>
      )}
    </div>
  );
}

/* Remote branches: similar tree grouped by 'origin/...' */
function RemoteBranchTree({ branches }: { branches: string[] }) {
  const { root, folders } = useMemo(() => buildBranchTree(branches), [branches]);
  return (
    <div>
      {root.map((b) => (
        <div key={b.fullPath} className="pl-[26px] pr-3 py-1 flex items-center gap-2 text-sm text-[#9eacc0]">
          <Cloud size={13} className="shrink-0 text-[#5ed8ff]" />
          <span className="truncate text-xs">{b.name}</span>
        </div>
      ))}
      {folders.map((f) => (
        <RemoteFolderView key={f.prefix} folder={f} />
      ))}
    </div>
  );
}

function RemoteFolderView({ folder }: { folder: BranchFolder }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-[26px] pr-3 py-1 flex items-center gap-2 text-sm text-[#9eacc0] hover:text-[#d9e7fc] hover:bg-[#172d45] transition-colors"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={13} className="text-[#9eacc0] shrink-0" />
        <span className="truncate flex-1 text-left">{folder.prefix}</span>
        <span className="text-[10px] text-[#697789]">{folder.branches.length}</span>
      </button>
      {isOpen && (
        <div>
          {folder.branches.map((b) => (
            <div
              key={b.fullPath}
              className="pl-[46px] pr-3 py-1 flex items-center gap-2 text-sm text-[#9eacc0] hover:bg-[#172d45] hover:text-[#d9e7fc] transition-colors"
              title={b.fullPath}
            >
              <GitBranch size={13} className="shrink-0 text-[#697789]" />
              <span className="truncate text-xs">{b.name}</span>
            </div>
          ))}
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
      className="px-4 py-1.5 flex items-center gap-3 text-sm text-[#9eacc0] hover:bg-[#3c495a] hover:text-[#d9e7fc] transition-colors"
      title={stash.message}
    >
      <Archive size={16} className="shrink-0" />
      <span className="truncate flex-1 text-xs">{stash.message}</span>
      {isHovered && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onApply(); }} className="p-1 hover:text-[#a3f185] transition-colors" title="Apply">
            <RotateCcw size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDrop(); }} className="p-1 hover:text-[#ff716c] transition-colors" title="Drop">
            <Trash2 size={12} />
          </button>
        </div>
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
        selected ? 'bg-[#a3f185]/15' : 'hover:bg-[#3c495a]/50',
        onClick && 'cursor-pointer',
      )}
    >
      <input
        type="checkbox" checked={file.staged}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStage(e.target.checked)}
        className="w-3.5 h-3.5 rounded bg-[#041425] border-[#3c495a]/15 text-[#a3f185] focus:ring-0"
      />
      <FileText
        size={16}
        className={cn(
          file.status === 'modified' ? 'text-[#fd9d1a]' :
          file.status === 'added' ? 'text-[#a3f185]' :
          file.status === 'renamed' ? 'text-[#5ed8ff]' :
          file.status === 'untracked' ? 'text-[#9eacc0]' :
          'text-[#ff716c]',
        )}
      />
      <span className="text-sm truncate flex-1 text-[#d9e7fc] group-hover:text-[#d9e7fc]">{file.path}</span>
      <div className="flex items-center gap-2">
        {isHovered && (
          <button onClick={(e) => { e.stopPropagation(); onDiscard(); }} className="p-1 hover:text-[#ff716c] text-[#9eacc0]">
            <Trash2 size={14} />
          </button>
        )}
        <div
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold',
            file.status === 'modified' ? 'bg-[#fd9d1a]/20 text-[#fd9d1a]' :
            file.status === 'added' ? 'bg-[#a3f185]/20 text-[#a3f185]' :
            file.status === 'renamed' ? 'bg-[#5ed8ff]/20 text-[#5ed8ff]' :
            file.status === 'untracked' ? 'bg-[#9eacc0]/20 text-[#9eacc0]' :
            'bg-[#ff716c]/20 text-[#ff716c]',
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
  const unstaged = files.filter((f) => !f.staged);
  const staged = files.filter((f) => f.staged);

  // CRITICAL: batch stage/unstage to avoid parallel writes to .git/index
  // which cause "index.lock: File exists" errors.
  const stageAll = () => onStageMany(unstaged.map((f) => f.path), true);
  const unstageAll = () => onStageMany(staged.map((f) => f.path), false);

  if (!repoPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#9eacc0] text-sm">
        <GitBranch size={32} className="mx-auto mb-3 opacity-30" />
        Abrí un repo para ver los cambios
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Unstaged Files ── */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="px-4 py-2 border-b border-[#3c495a]/15 bg-[#0d2134] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-bold text-[#9eacc0] uppercase tracking-wider">
            Unstaged ({unstaged.length})
          </span>
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <button
                onClick={onRequestResetAll}
                className="p-1 text-[#9eacc0] hover:text-[#ff716c] hover:bg-[#ff716c]/10 rounded transition-colors"
                title="Descartar TODOS los cambios (reset --hard)"
              >
                <Trash2 size={12} />
              </button>
            )}
            {unstaged.length > 0 && (
              <button
                onClick={stageAll}
                className="text-[10px] text-[#a3f185] hover:text-[#052900] px-2 py-0.5 rounded border border-[#a3f185]/40 hover:bg-[#a3f185] transition-colors"
              >
                Stage all
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {unstaged.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#697789] italic">No hay cambios sin stagear</p>
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
      <div className="flex flex-col min-h-0 flex-1 border-t-2 border-[#a3f185]/30">
        <div className="px-4 py-2 border-b border-[#3c495a]/15 bg-[#052900] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-bold text-[#a3f185] uppercase tracking-wider">
            Staged ({staged.length})
          </span>
          {staged.length > 0 && (
            <button
              onClick={unstageAll}
              className="text-[10px] text-[#9eacc0] hover:text-[#020f1e] px-2 py-0.5 rounded border border-[#9eacc0]/40 hover:bg-[#9eacc0] transition-colors"
            >
              Unstage all
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {staged.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#697789] italic">Stagea archivos para incluir en el commit</p>
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
      <div className="p-3 border-t border-[#3c495a]/15 bg-[#0d2134] shrink-0">
        <textarea
          className="w-full bg-[#041425] border border-[#3c495a]/15 rounded p-2 text-sm text-[#d9e7fc] h-16 focus:outline-none focus:border-[#a3f185]/30 resize-none"
          placeholder="Mensaje del commit (requerido)"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={onCommit}
            disabled={isLoading || !commitMessage.trim() || staged.length === 0}
            className="flex-1 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-[#052900] rounded transition-colors"
          >
            {isLoading ? 'Commiteando...' : `Commit ${staged.length > 0 ? ` (${staged.length})` : ''}`}
          </button>
          <button
            onClick={onRequestAmend}
            disabled={isLoading || !repoPath}
            title="Enmendar el último commit"
            className="px-3 py-2 bg-[#041425] border border-[#3c495a]/30 hover:border-[#fd9d1a]/50 hover:text-[#fd9d1a] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-[#9eacc0] rounded transition-colors flex items-center gap-1"
          >
            <RotateCcw size={12} />
            Amend
          </button>
          <button
            onClick={onRequestSquash}
            disabled={isLoading || !repoPath}
            title="Combinar los últimos N commits en uno (Squash)"
            className="px-3 py-2 bg-[#041425] border border-[#3c495a]/30 hover:border-[#fd9d1a]/50 hover:text-[#fd9d1a] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-[#9eacc0] rounded transition-colors flex items-center gap-1"
          >
            <Layers size={12} />
            Squash
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
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded group transition-colors cursor-pointer',
        selected ? 'bg-[#a3f185]/15' : 'hover:bg-[#3c495a]/50',
      )}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onAction(); }}
        title={direction === 'stage' ? 'Stage este archivo' : 'Unstage este archivo'}
        className={cn(
          'p-1 rounded shrink-0 transition-colors',
          direction === 'stage'
            ? 'text-[#9eacc0] hover:text-[#a3f185] hover:bg-[#a3f185]/10'
            : 'text-[#9eacc0] hover:text-[#fd9d1a] hover:bg-[#fd9d1a]/10',
        )}
      >
        {direction === 'stage' ? <Plus size={14} /> : <Minus size={14} />}
      </button>
      <FileText
        size={14}
        className={cn(
          'shrink-0',
          file.status === 'modified' ? 'text-[#fd9d1a]' :
          file.status === 'added' ? 'text-[#a3f185]' :
          file.status === 'renamed' ? 'text-[#5ed8ff]' :
          file.status === 'untracked' ? 'text-[#9eacc0]' :
          'text-[#ff716c]',
        )}
      />
      <span className="text-xs truncate flex-1 text-[#d9e7fc] group-hover:text-[#d9e7fc]">{file.path}</span>
      {isHovered && direction === 'stage' && (
        <button
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          className="p-1 hover:text-[#ff716c] text-[#9eacc0] shrink-0"
          title="Descartar cambios"
        >
          <Trash2 size={12} />
        </button>
      )}
      <div
        className={cn(
          'w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0',
          file.status === 'modified' ? 'bg-[#fd9d1a]/20 text-[#fd9d1a]' :
          file.status === 'added' ? 'bg-[#a3f185]/20 text-[#a3f185]' :
          file.status === 'renamed' ? 'bg-[#5ed8ff]/20 text-[#5ed8ff]' :
          file.status === 'untracked' ? 'bg-[#9eacc0]/20 text-[#9eacc0]' :
          'bg-[#ff716c]/20 text-[#ff716c]',
        )}
      >
        {file.status[0].toUpperCase()}
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
      <div className="sticky top-0 bg-[#020f1e]/75 backdrop-blur-xl z-10 border-b border-[#3c495a]/15 py-2 px-4 text-[11px] text-[#9eacc0] uppercase tracking-wider font-bold shrink-0">
        {filter
          ? `${filtered.length} de ${commits.length} commits`
          : `Historial · ${commits.length} commits`}
      </div>
      <div className="flex-1 overflow-y-auto">
        {commits.length === 0 && isLoading && (
          <p className="px-4 py-8 text-center text-[#9eacc0] text-sm">Cargando commits...</p>
        )}
        {filter && filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-[#9eacc0] text-sm">
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
                'px-4 py-3 border-b border-[#3c495a]/15 cursor-pointer transition-colors',
                isSelected ? 'bg-[#a3f185]/10' : 'hover:bg-[#0d2134]',
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <code className="text-[11px] font-mono text-[#a3f185] shrink-0">{commit.shortHash}</code>
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
                              isTag ? 'bg-[#fd9d1a]/15 text-[#fd9d1a] border-[#fd9d1a]/30'
                                : isCurrent ? 'bg-[#a3f185]/20 text-[#a3f185] border-[#a3f185]/40'
                                : isRemote ? 'bg-[#5ed8ff]/10 text-[#5ed8ff] border-[#5ed8ff]/30'
                                : 'bg-[#a3f185]/15 text-[#a3f185] border-[#a3f185]/30',
                            )}
                          >
                            {text}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-[#697789] shrink-0 font-mono">{formatDate(commit.date)}</span>
              </div>
              <p className={cn('text-sm font-medium mb-1.5', isSelected ? 'text-[#d9e7fc]' : 'text-[#d9e7fc]')}>
                {commit.message}
              </p>
              <div className="flex items-center gap-2 text-xs text-[#9eacc0]">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#a3f185] to-[#68b24f] flex items-center justify-center text-[8px] font-bold text-[#052900]">
                  {initials(commit.authorName)}
                </div>
                <span>{commit.authorName}</span>
                <span className="text-[#697789]">·</span>
                <span className="text-[#697789] font-mono text-[10px]">{commit.authorEmail}</span>
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
  const unstaged = modifiedFiles.filter((f) => !f.staged);
  const staged = modifiedFiles.filter((f) => f.staged);

  const statusCount = (status: GitFile['status']) =>
    modifiedFiles.filter((f) => f.status === status).length;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#d9e7fc] mb-2">Workspace</h2>
          <p className="text-sm text-[#9eacc0]">
            Resumen de lo que tenés sin commitear. Hacé clic en cualquier archivo de la columna derecha
            para ver su diff con colores acá en el centro.
          </p>
        </div>

        {modifiedFiles.length === 0 ? (
          <div className="bg-[#0d2134] border border-[#3c495a]/15 rounded-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#a3f185]/10 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-[#a3f185]" />
            </div>
            <p className="text-base font-semibold text-[#d9e7fc] mb-1">Working tree limpio</p>
            <p className="text-sm text-[#9eacc0]">No hay cambios sin commitear.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard label="Unstaged" value={unstaged.length} accent="muted" />
              <StatCard label="Staged" value={staged.length} accent="primary" />
            </div>

            <div className="bg-[#0d2134] border border-[#3c495a]/15 rounded-lg p-5 mb-4">
              <h3 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-3">
                Cambios por tipo
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {statusCount('modified') > 0 && <StatusBadge label="Modificados" count={statusCount('modified')} color="#fd9d1a" letter="M" />}
                {statusCount('added') > 0 && <StatusBadge label="Nuevos (staged)" count={statusCount('added')} color="#a3f185" letter="A" />}
                {statusCount('deleted') > 0 && <StatusBadge label="Borrados" count={statusCount('deleted')} color="#ff716c" letter="D" />}
                {statusCount('untracked') > 0 && <StatusBadge label="Untracked" count={statusCount('untracked')} color="#9eacc0" letter="U" />}
                {statusCount('renamed') > 0 && <StatusBadge label="Renombrados" count={statusCount('renamed')} color="#5ed8ff" letter="R" />}
              </div>
            </div>

            <div className="bg-[#0d2134] border border-[#3c495a]/15 rounded-lg p-5">
              <h3 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-3">Flujo</h3>
              <ol className="space-y-2 text-sm text-[#d9e7fc]">
                <FlowStep n={1} done={true}>Modificá archivos en tu editor</FlowStep>
                <FlowStep n={2} done={staged.length > 0}>
                  Clic en el <code className="bg-[#020f1e] px-1 rounded text-[#a3f185] text-xs">+</code> de cada archivo en la columna derecha para stagearlo
                </FlowStep>
                <FlowStep n={3} done={false}>Escribí un mensaje en la caja de abajo a la derecha</FlowStep>
                <FlowStep n={4} done={false}>Clic en <span className="text-[#a3f185] font-semibold">Commit Changes</span></FlowStep>
                {hasGithubUser && <FlowStep n={5} done={false}>Clic en <span className="text-[#a3f185] font-semibold">Push</span> para subirlo a GitHub</FlowStep>}
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
        'bg-[#0d2134] border rounded-lg p-4',
        accent === 'primary' ? 'border-[#a3f185]/40' : 'border-[#3c495a]/15',
      )}
    >
      <p className="text-xs text-[#9eacc0] uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', accent === 'primary' ? 'text-[#a3f185]' : 'text-[#d9e7fc]')}>
        {value}
      </p>
    </div>
  );
}
