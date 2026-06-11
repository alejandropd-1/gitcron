'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Upload, GitBranch, Archive,
  Settings, Folder, Tag,
  FileText, Trash2, AlertCircle, FolderOpen, Plus, X,
  ArrowLeft, RotateCcw, LogOut,
  Copy, Loader2,
  GitMerge, Check,
  ExternalLink, FileDiff,
  WrapText, AlignLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { CommitContextMenu, BranchContextMenu, FileContextMenu, RemoteBranchContextMenu } from '@/components/ContextMenus';
import { StatusBadge } from '@/components/HelpModal';
import { RepoStartPanel, type RepoStartMode } from '@/components/RepoModals';
import { ChangelogPreview } from '@/components/ChangelogPreview';
import { useGitStore, Commit, GitFile, type FontSize, type RepoState } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useRepoLoader } from '@/hooks/use-repo-loader';
import { useAutoFetch } from '@/hooks/use-auto-fetch';
import { SettingsPanel } from '@/components/SettingsPanel';
import { HelpPanel } from '@/components/HelpPanel';
import { ProfilePanel } from '@/components/ProfilePanel';
import { DiffViewer } from '@/components/DiffViewer';
import { CommitGraph, commitHasBranchRef, normalizeBranchName, type CommitSelectOptions } from '@/components/CommitGraph';
import { ConflictResolver } from '@/components/ConflictResolver';
import { HistoryView, CommitTabView } from '@/components/RepoContentViews';
import { RepoTabs } from '@/components/RepoTabs';
import { DangerConfirmDialog } from '@/components/DangerConfirmDialog';
import {
  CheckoutConflictModal,
  ResetAllConfirmDialog,
  CleanUntrackedModal,
  AmendLastCommitModal,
  SquashCommitsModal,
} from '@/components/RepoActionModals';
import type { SpeculativeBranch } from '@/types/temporal-agent';
import { usePanelLayout, FLOATING_PANEL_INSET, GRAPH_SAFE_GAP } from '@/hooks/use-panel-layout';
import { DeferredPanelLoading, GraphColumnHandle } from '@/components/PageWidgets';
import { RepoSidebar } from '@/components/RepoSidebar';
import { RepoDetailsPanel } from '@/components/RepoDetailsPanel';
import { PageToasts, type PullDecisionToast } from '@/components/PageToasts';
import { TopBar } from '@/components/TopBar';
import {
  isSafeDirectoryError, safeDirectoryPathFromError,
  childPath, isPushRejected, cloneUrlFromGitHubCreateResult,
} from '@/lib/page-helpers';

const ChronometricGraph = dynamic(
  () => import('@/components/ChronometricGraph').then((mod) => mod.ChronometricGraph),
  {
    ssr: false,
    loading: () => <DeferredPanelLoading />,
  },
);

const TemporalAgentSettings = dynamic(
  () => import('@/components/TemporalAgentSettings').then((mod) => mod.TemporalAgentSettings),
  {
    ssr: false,
    loading: () => <DeferredPanelLoading />,
  },
);

// Phase 5 test data — 3 mock speculative branches to validate the overlay
// without hitting the AI. The real flow swaps these for PredictionResult.branches.
const MOCK_SPECULATIVE: SpeculativeBranch[] = [
  {
    id: 'mock-1',
    sourceId: null,
    message: 'Extract IPC layer into a typed contract module',
    description: null,
    rationale:
      'Los commits recientes tocan electron/main.ts una y otra vez para sumar handlers. Un contrato IPC tipado y compartido cortaría ese churn y reduciría el riesgo en el bridge del preload.',
    type: 'improvement',
    confidence: 0.82,
  },
  {
    id: 'mock-2',
    sourceId: null,
    message: 'Add a streaming prediction mode for large repos',
    description: null,
    rationale:
      'El armado de contexto ya lee hasta 40 commits; transmitir la salida del modelo mantendría la UI fluida en historiales grandes.',
    type: 'breakthrough',
    confidence: 0.66,
  },
  {
    id: 'mock-3',
    sourceId: null,
    message: 'Surface forecasting-doctrine confidence inline on the diagonal',
    description: null,
    rationale:
      'La doctrina ata la confianza a la entropía del repo. Mostrar el "por qué 0.7 y no 0.9" junto a cada rama refuerza la calibración honesta.',
    type: 'trend',
    confidence: 0.74,
  },
];

// Flip to true to debug with the hardcoded mock branches instead of the real,
// persisted prediction. false = use the real per-repo PredictionResult (Capa 1).
const USE_MOCK_SPECULATIVE = false;
import { useT } from '@/hooks/use-translation';
import { LANGS, type Lang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useAppUpdate } from '@/hooks/use-app-update';
import type { PullRequestDiffData, PullRequestEntry } from '@/types/electron';

type StashPreviewState = {
  index: number;
  message: string;
  files: string[];
  diff: string;
};

const FONT_SIZE_OPTIONS: Array<{ key: FontSize; px: number }> = [
  { key: 'compact', px: 15 },
  { key: 'normal', px: 16 },
  { key: 'large', px: 17 },
];


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
    loadConflictFile, resolveConflictContent,
    commitChanges, mergeBranch, revertCommit, resetToCommit, stashChanges,
    discardFileChanges, stageFile, stageFiles, removeIndexLock,
    checkoutBranch, checkoutBranchSmart, createBranch, pushChanges, pullChanges,
    openTerminal, stashApply, stashPop, stashPreview, stashDrop, stashClear,
    connectGitHub, disconnectGitHub, loginWithGitHubDevice, bootstrapGitHub,
    bootstrapPreferences, changeLanguage, changeFontSize, changeDefaultFolder, pickDefaultFolder,
    setAutoFetchPrefs, setOsNotifications, rebindShortcut, resetShortcutsToDefaults, changeTheme, changeEnableCronometric,
    addToGitignore, resetAll, stashFile, showInFolder, openInDefault,
    deleteFile, cleanUntracked, copyFilePath,
    mergeIntoCurrent, rebaseOnto, fastForwardBranch, amendLastCommit, cherryPickCommit, squashCommits,
    renameBranch, deleteBranch, deleteTag, createTag, pushTag, pullSpecificBranch, pushSpecificBranch,
    pullWithDecision,
  } = useGitActions();

  const t = useT();
  const language = useGitStore((s) => s.language);
  const fontSize = useGitStore((s) => s.fontSize);
  const defaultFolder = useGitStore((s) => s.defaultFolder);
  const theme = useGitStore((s) => s.theme);
  const enableCronometric = useGitStore((s) => s.enableCronometric);
  const appFontSizePx = FONT_SIZE_OPTIONS.find((option) => option.key === fontSize)?.px ?? 15;

  const {
    openRepo, trustSafeDirectory, restoreLastRepo, closeRepo, persistOpenRepos, loadAll, loadDiff, refreshLog,
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
  const [conflictFileContent, setConflictFileContent] = useState('');
  const [conflictFileLoading, setConflictFileLoading] = useState(false);

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
          if (b.sourceId === undefined) b.sourceId = null;
          if (b.description === undefined) b.description = null;
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
  const [pullRequestDiff, setPullRequestDiff] = useState<PullRequestDiffData | null>(null);
  const [pullRequestDiffLoading, setPullRequestDiffLoading] = useState(false);
  const [showStashClearConfirm, setShowStashClearConfirm] = useState(false);
  const [showStashModal, setShowStashModal] = useState(false);
  const [stashMessage, setStashMessage] = useState('');
  const [stashPreviewState, setStashPreviewState] = useState<StashPreviewState | null>(null);
  const [checkoutConflict, setCheckoutConflict] = useState<{ branch: string; error: string } | null>(null);
  const [branchMenu, setBranchMenu] = useState<{ x: number; y: number; branch: string } | null>(null);
  const [remoteBranchMenu, setRemoteBranchMenu] = useState<{ x: number; y: number; branch: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ branch: string; notMerged?: boolean } | null>(null);
  const [deleteTagConfirm, setDeleteTagConfirm] = useState<string | null>(null);
  const [discardConfirmFile, setDiscardConfirmFile] = useState<GitFile | null>(null);
  const [forcePushConfirm, setForcePushConfirm] = useState<{
    repoDir: string;
    githubToken: string;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [mergeNeedsCheckout, setMergeNeedsCheckout] = useState<{ sourceBranch: string; targetBranch: string } | null>(null);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchFrom, setNewBranchFrom] = useState<string | undefined>(undefined);
  const [createTagFrom, setCreateTagFrom] = useState<string | undefined>(undefined);
  const [newTagName, setNewTagName] = useState('');
  const [newTagMessage, setNewTagMessage] = useState('');
  const [resetCommitFrom, setResetCommitFrom] = useState<string | undefined>(undefined);
  const [resetMode, setResetMode] = useState<'soft' | 'mixed' | 'hard'>('mixed');
  const [hardResetConfirmed, setHardResetConfirmed] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanableFiles, setCleanableFiles] = useState<string[]>([]);
  const [selectedCleanFiles, setSelectedCleanFiles] = useState<Set<string>>(() => new Set());
  const [cleanModalLoading, setCleanModalLoading] = useState(false);

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
  // ── Panel layout (resizable widths + open/closed state, persisted) ──
  const {
    sidebarW, detailsW, sidebarOpen, detailsOpen, isDragging, graphColumns,
    beginColDrag, beginGraphColDrag, toggleSidebar, toggleDetails,
  } = usePanelLayout();
  const repositoryDetailsVisible = detailsOpen && activeView === 'repository' && !!repoPath && !isRepoStartView;
  const leftGraphSafe = sidebarOpen ? sidebarW + FLOATING_PANEL_INSET + GRAPH_SAFE_GAP : 0;
  const rightGraphSafe = repositoryDetailsVisible ? detailsW + FLOATING_PANEL_INSET + GRAPH_SAFE_GAP : 0;

  const [filterText, setFilterText] = useState('');
  const [showSearchPopover, setShowSearchPopover] = useState(false);
  const [selectedBranchName, setSelectedBranchName] = useState<string | null>(null);
  const [selectedBranchFocusRequest, setSelectedBranchFocusRequest] = useState(0);
  const [tokenInput, setTokenInput] = useState('');
  const [authMode, setAuthMode] = useState<'oauth' | 'token'>('oauth');
  const [deviceCodeInfo, setDeviceCodeInfo] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // ── App auto-update flow (estado, listeners IPC, changelog) ──
  const {
    updateStatus, updateInfo, downloadProgress,
    changelogRaw, changelogError, changelogEntries,
    showUpdateMenu, setShowUpdateMenu, updateMenuRef,
    handleCheckForUpdate, handleDownloadUpdate, handleInstallUpdate,
  } = useAppUpdate();
  const newBranchInputRef = useRef<HTMLInputElement>(null);
  const newTagInputRef = useRef<HTMLInputElement>(null);
  const [isStartupHydrated, setIsStartupHydrated] = useState(false);
  const [isStartupGraphReady, setIsStartupGraphReady] = useState(false);

  useEffect(() => {
    setSelectedBranchName(null);
  }, [repoPath]);

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

  useEffect(() => {
    document.documentElement.style.fontSize = `${appFontSizePx}px`;
  }, [appFontSizePx]);

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
    setShowStashModal(false);
    setStashMessage('');
    setStashPreviewState(null);
    setShowCleanModal(false);
    setCleanableFiles([]);
    setSelectedCleanFiles(new Set());
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

  // Cargar el contenido del archivo conflictuado seleccionado (async; el
  // reset sincrónico inicial es intencional al cambiar de selección).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let alive = true;
    if (!selectedFile?.conflicted) {
      setConflictFileContent('');
      setConflictFileLoading(false);
      return () => { alive = false; };
    }

    setConflictFileLoading(true);
    void loadConflictFile(selectedFile.path).then((result) => {
      if (!alive) return;
      setConflictFileContent(result.success ? result.content : '');
      setConflictFileLoading(false);
    });

    return () => { alive = false; };
  }, [selectedFile?.path, selectedFile?.conflicted]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { if (showNewBranch) newBranchInputRef.current?.focus(); }, [showNewBranch]);
  useEffect(() => { if (createTagFrom) newTagInputRef.current?.focus(); }, [createTagFrom]);

  // Auto-dismiss success toast after 3 seconds
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateBranch = async () => {
    const name = newBranchName.trim();
    if (!name) return;
    await createBranch(name, newBranchFrom);
    setShowNewBranch(false);
    setNewBranchName('');
    setNewBranchFrom(undefined);
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name || !createTagFrom) return;
    const msg = newTagMessage.trim();
    await createTag(name, createTagFrom, msg !== '' ? msg : undefined);
    setCreateTagFrom(undefined);
    setNewTagName('');
    setNewTagMessage('');
  };

  const handleOpenStashModal = () => {
    setStashMessage('');
    setShowStashModal(true);
  };

  const handleCreateStash = async () => {
    const message = stashMessage.trim();
    const result = await stashChanges(message !== '' ? message : undefined);
    if (result?.success) {
      setShowStashModal(false);
      setStashMessage('');
    }
  };

  const handlePreviewStash = async (stash: { index: number; message: string }) => {
    const result = await stashPreview(stash.index);
    if (result.success) {
      setStashPreviewState({
        index: stash.index,
        message: stash.message,
        files: result.files,
        diff: result.diff,
      });
    }
  };

  const handleResetCommit = async () => {
    if (!resetCommitFrom) return;
    await resetToCommit(resetCommitFrom, resetMode);
    setResetCommitFrom(undefined);
    setResetMode('mixed');
    setHardResetConfirmed(false);
  };

  const handleOpenCleanModal = async () => {
    setShowCleanModal(true);
    setCleanModalLoading(true);
    const result = await cleanUntracked();
    if (result.success) {
      setCleanableFiles(result.files);
      setSelectedCleanFiles(new Set());
    }
    setCleanModalLoading(false);
  };

  const handleCleanSelected = async () => {
    const files = Array.from(selectedCleanFiles);
    if (files.length === 0) return;
    setCleanModalLoading(true);
    const result = await cleanUntracked(files);
    if (result.success) {
      setShowCleanModal(false);
      setCleanableFiles([]);
      setSelectedCleanFiles(new Set());
    }
    setCleanModalLoading(false);
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

  // Open a file's diff AT the selected commit (from the details panel list).
  const handleOpenCommitFile = async (file: GitFile) => {
    if (!repoPath || !window.api || !selectedCommit) return;
    setIsTabChanging(true);
    const r = await window.api.gitDiffAtCommit(repoPath, file.path, selectedCommit.hash);
    if (r.success && r.data) {
      useGitStore.getState().setCurrentDiff(r.data);
      useGitStore.getState().setSelectedFile(file);
    }
    setTimeout(() => {
      setIsTabChanging(false);
    }, 150);
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

  const resolveLocalBranchSelection = (commit: Commit, requestedBranchName?: string | null) => {
    const candidates = [
      requestedBranchName,
      ...(commit.refs ?? []).map(normalizeBranchName),
    ].filter((branch): branch is string => Boolean(branch));

    for (const candidate of candidates) {
      if (branches.includes(candidate)) return candidate;

      const withoutRemotePrefix = candidate.replace(/^[^/]+\//, '');
      if (withoutRemotePrefix !== candidate && branches.includes(withoutRemotePrefix)) {
        return withoutRemotePrefix;
      }
    }

    return null;
  };

  const handleSelectCommit = (commit: Commit, options?: CommitSelectOptions) => {
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setPullRequestDiffLoading(false);
    const localBranchName = resolveLocalBranchSelection(commit, options?.branchName);
    if (localBranchName) {
      setSelectedBranchName(localBranchName);
    } else if (!options?.preserveBranchSelection) {
      setSelectedBranchName(null);
    }
    setSelectedCommit(commit);
  };

  const handleClearGraphSelection = () => {
    setSelectedCommit(null);
    setSelectedBranchName(null);
  };

  const handleSelectBranchInGraph = (branch: string) => {
    setSelectedBranchName(branch);
    setSelectedBranchFocusRequest((request) => request + 1);
    const targetCommit = commits.find((commit) => commitHasBranchRef(commit, branch));
    if (targetCommit) {
      handleSelectCommit(targetCommit, { preserveBranchSelection: true });
    }
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
    const repoDir = childPath(parent, name);

    const existsResult = await window.api.fsExistsAndNotEmpty(parent, name);
    const existsAndNotEmpty = existsResult.success && existsResult.data;

    if (existsAndNotEmpty) {
      const r = await initRepo(parent, name, true);
      if (!r.success) return false;

      if (withGitHub && githubToken) {
        const gh = await createGitHubRepo(githubToken, name, true, '', false);
        const cloneUrl = cloneUrlFromGitHubCreateResult(gh, githubUser?.login, name);
        if (cloneUrl === null) return false;

        if (cloneUrl) {
          const remoteRes = await window.api.gitCommand(repoDir, ['remote', 'add', 'origin', cloneUrl]);
          if (!remoteRes.success && !remoteRes.error?.includes('already exists')) {
            setError(remoteRes.error ?? 'Error al asociar el repositorio remoto');
            return false;
          }

          const pushRes = await window.api.gitPushBranch(repoDir, 'main', githubToken);
          if (!pushRes.success) {
            if (isPushRejected(pushRes.error)) {
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
      const cloneUrl = cloneUrlFromGitHubCreateResult(r, githubUser?.login, name);
      if (cloneUrl === null) return false;

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

  // Persist the tab order chosen via drag & drop so it survives app restarts.
  // setOpenRepos already remaps activeRepoIdx; persistOpenRepos reads the
  // fresh state synchronously after the store update.
  const handleReorderRepoTabs = (newOrder: RepoState[]) => {
    setOpenRepos(newOrder);
    void persistOpenRepos();
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
            onReorder={handleReorderRepoTabs}
          />
          {/* ──────────── TOP NAV ──────────── */}
          <TopBar
            graphMode={graphMode}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            detailsOpen={detailsOpen}
            onToggleDetails={toggleDetails}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onPullIntent={handlePullIntent}
            onPushIntent={handlePushIntent}
            onNewBranchRequest={() => { setNewBranchFrom(undefined); setShowNewBranch(true); }}
            onOpenStashModal={handleOpenStashModal}
            onFetchNow={runFetchCycle}
            showGraphModeSwitch={activeView === 'repository' && !isRepoStartView && activeTab === 'Graph' && !!repoPath && enableCronometric}
            activeGraphMode={activeGraphMode}
            onChangeGraphMode={handleChangeGraphMode}
            updateStatus={updateStatus}
            updateInfo={updateInfo}
            downloadProgress={downloadProgress}
            showUpdateMenu={showUpdateMenu}
            setShowUpdateMenu={setShowUpdateMenu}
            updateMenuRef={updateMenuRef}
            onCheckForUpdate={handleCheckForUpdate}
            onDownloadUpdate={handleDownloadUpdate}
            onInstallUpdate={handleInstallUpdate}
            filterText={filterText}
            onFilterTextChange={setFilterText}
            searchOpen={showSearchPopover}
            onSearchOpenChange={setShowSearchPopover}
          />
        </div>
      </div>

      {/* ──────────── MAIN 3-COLUMN LAYOUT ──────────── */}
      <div
        className={cn(
          "flex-1 overflow-hidden relative",
          graphMode === 'classic' && "flex"
        )}
      >
        {/* LEFT PANEL: Sidebar — floats in chronometric view, inline in classic view */}
        <RepoSidebar
          graphMode={graphMode}
          sidebarW={sidebarW}
          sidebarOpen={sidebarOpen}
          isDragging={isDragging}
          onResizeStart={(e) => beginColDrag('sidebar', e)}
          activeView={activeView}
          onViewChange={handleViewChange}
          isRepoStartView={isRepoStartView}
          repoStartMode={repoStartMode}
          onRepoStartModeChange={setRepoStartMode}
          onCloseRepoChooser={handleCloseRepoChooser}
          selectedBranchName={selectedBranchName}
          onCheckoutAttempt={handleCheckoutAttempt}
          onSelectBranchInGraph={handleSelectBranchInGraph}
          onBranchContextMenu={openBranchMenu}
          onRemoteBranchContextMenu={openRemoteBranchMenu}
          onDeleteBranchRequest={(b) => setDeleteConfirm({ branch: b })}
          selectedPullRequest={selectedPullRequest}
          onSelectPullRequest={handleSelectPullRequest}
          onPreviewStash={handlePreviewStash}
          onCreateTagRequest={() => {
            setCreateTagFrom(selectedCommit?.hash ?? 'HEAD');
            setNewTagName('');
            setNewTagMessage('');
          }}
          onDeleteTagRequest={setDeleteTagConfirm}
          selectedSettingsSection={selectedSettingsSection}
          onSettingsSectionChange={setSelectedSettingsSection}
          selectedHelpSection={selectedHelpSection}
          onHelpSectionChange={setSelectedHelpSection}
        />

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
            <SettingsPanel
              selectedSettingsSection={selectedSettingsSection}
              setSelectedSettingsSection={setSelectedSettingsSection}
              handleViewChange={handleViewChange}
              language={language}
              changeLanguage={changeLanguage}
              fontSize={fontSize}
              changeFontSize={changeFontSize}
              defaultFolder={defaultFolder}
              changeDefaultFolder={changeDefaultFolder}
              pickDefaultFolder={pickDefaultFolder}
              theme={theme}
              changeTheme={changeTheme}
              enableCronometric={enableCronometric}
              changeEnableCronometric={changeEnableCronometric}
              setAutoFetchPrefs={setAutoFetchPrefs}
              setOsNotifications={setOsNotifications}
              rebindShortcut={rebindShortcut}
              resetShortcutsToDefaults={resetShortcutsToDefaults}
              repoPath={repoPath}
              repoName={openRepos[activeRepoIdx]?.name ?? 'repo'}
              onTemporalPrediction={(r) => {
                r.branches.forEach((b: any, i: number) => {
                  if (b.sourceId === undefined) b.sourceId = null;
                  if (b.description === undefined) b.description = null;
                  if (b.predictionIndex == null) b.predictionIndex = i + 1;
                });
                setRawSpeculativeBranches(r.branches);
                setSpeculativeAt(r.generatedAt);
                setShowSpeculative(true);
              }}
              onTemporalConfigSaved={(cfg) => {
                setConfidenceThreshold(cfg.skillProfile.confidenceThreshold);
              }}
              updateStatus={updateStatus}
              updateInfo={updateInfo}
              downloadProgress={downloadProgress}
              changelogEntries={changelogEntries}
              changelogError={changelogError}
              changelogRaw={changelogRaw}
              handleDownloadUpdate={handleDownloadUpdate}
              handleInstallUpdate={handleInstallUpdate}
              handleCheckForUpdate={handleCheckForUpdate}
            />
          ) : activeView === 'help' ? (
            <HelpPanel
              selectedHelpSection={selectedHelpSection}
              handleViewChange={handleViewChange}
            />
          ) : activeView === 'profile' ? (
            <ProfilePanel
              githubUser={githubUser}
              deviceCodeInfo={deviceCodeInfo}
              authMode={authMode}
              setAuthMode={setAuthMode}
              tokenInput={tokenInput}
              setTokenInput={setTokenInput}
              isLoggingIn={isLoggingIn}
              isLoading={isLoading}
              handleLoginWithGitHub={handleLoginWithGitHub}
              handleConnectGitHub={handleConnectGitHub}
              disconnectGitHub={disconnectGitHub}
              handleViewChange={handleViewChange}
            />
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
                conflictFileLoading ? (
                  <div className="px-4 py-3 border-b border-border-subtle/15 bg-bg-base/45 flex items-center gap-2 text-text-secondary text-sm shrink-0">
                    <Loader2 size={16} className="animate-spin text-git-mod" />
                    {t('conflictResolver.loading')}
                  </div>
                ) : (
                  <ConflictResolver
                    filePath={selectedFile.path}
                    content={conflictFileContent}
                    isSaving={isLoading}
                    onSave={async (content) => {
                      const result = await resolveConflictContent(selectedFile.path, content);
                      if (result.success) handleCloseDiff();
                    }}
                  />
                )
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
                      <GraphColumnHandle onMouseDown={(e) => beginGraphColDrag('refs', e)} />
                      <div className="shrink-0 text-left px-2" style={{ width: graphColumns.graph }}>Graph</div>
                      <GraphColumnHandle onMouseDown={(e) => beginGraphColDrag('graph', e)} />
                      <div className="flex-1 flex items-center gap-2 pl-5">
                        Commit message
                        {enableCronometric && speculativeBranches.length > 0 && (
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
                      <GraphColumnHandle onMouseDown={(e) => beginGraphColDrag('date', e, -1)} />
                      <div className="flex items-center pr-3 text-right shrink-0">
                        <span className="pr-3" style={{ width: graphColumns.date }}>Date</span>
                        <GraphColumnHandle onMouseDown={(e) => beginGraphColDrag('date', e)} />
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
                              selectedBranchName={selectedBranchName}
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
                          <ChronometricGraph
                            commits={commits}
                            selectedHash={selectedCommit?.hash}
                            selectedBranchName={selectedBranchName}
                            selectedBranchFocusRequest={selectedBranchFocusRequest}
                            currentBranch={currentBranch}
                            filterText={filterText}
                            onSelect={handleSelectCommit}
                            onClearSelection={handleClearGraphSelection}
                            onContextMenu={(e, c) => openContextMenu({ x: e.clientX, y: e.clientY, hash: c.hash })}
                            speculativeBranches={speculativeBranches}
                            showSpeculative={showSpeculative}
                            onToggleSpeculative={() => setShowSpeculative((v) => !v)}
                            hudLeft={leftGraphSafe}
                            hudRight={rightGraphSafe}
                            localBranches={branches}
                            isContextMenuOpen={!!contextMenu || !!branchMenu || !!remoteBranchMenu || !!fileContextMenu}
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
        <RepoDetailsPanel
          graphMode={graphMode}
          detailsW={detailsW}
          visible={repositoryDetailsVisible}
          isDragging={isDragging}
          onResizeStart={(e) => beginColDrag('details', e)}
          onOpenStashModal={handleOpenStashModal}
          onOpenCommitFile={handleOpenCommitFile}
          onSelectFile={handleSelectFile}
          onDiscardRequest={setDiscardConfirmFile}
          onRequestAmend={() => setShowAmend(true)}
          onRequestSquash={() => setShowSquash(true)}
          onFileContextMenu={openFileContextMenu}
          onRequestResetAll={() => setShowResetConfirm(true)}
          onRequestCleanUntracked={handleOpenCleanModal}
        />

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

      {/* ──────────── TOASTS: success / pull-decision / error ──────────── */}
      <PageToasts
        pullDecision={pullDecision}
        onPullDecision={handlePullDecision}
        onDismissPullDecision={() => setPullDecision(null)}
        canTrustSafeDirectory={canTrustSafeDirectory}
        onTrustSafeDirectory={handleTrustSafeDirectory}
      />

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

      {/* ──────────── STASH WITH MESSAGE MODAL ──────────── */}
      <AnimatePresence>
        {showStashModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setShowStashModal(false)}
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[min(calc(100vw-2rem),480px)]"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreateStash();
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-git-mod flex items-center gap-2">
                  <Archive size={16} /> {t('stashModal.title')}
                </h3>
                <button type="button" onClick={() => setShowStashModal(false)} className="text-text-secondary hover:text-text-primary">
                  <X size={16} />
                </button>
              </div>
              <label htmlFor="stash-message" className="text-xs text-text-secondary block mb-1">
                {t('stashModal.messageLabel')}
              </label>
              <input
                id="stash-message"
                name="stashMessage"
                value={stashMessage}
                onChange={(e) => setStashMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowStashModal(false); }}
                placeholder={t('stashModal.messagePlaceholder')}
                className="w-full bg-bg-base/70 border border-border-subtle/15 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-git-mod/50 mb-2"
              />
              <p className="text-[11px] text-text-secondary leading-relaxed mb-5">
                {t('stashModal.desc')}
              </p>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowStashModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                  {t('modal.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#fd9d1a] to-[#c96c00] hover:from-[#ffb247] hover:to-[#b75f00] shadow-lg shadow-git-mod/10 disabled:opacity-40 disabled:cursor-not-allowed text-[#201100] text-sm font-bold rounded flex items-center gap-2"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                  {isLoading ? t('stashModal.saving') : t('stashModal.save')}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── STASH PREVIEW MODAL ──────────── */}
      <AnimatePresence>
        {stashPreviewState && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setStashPreviewState(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[min(calc(100vw-2rem),880px)] max-h-[82vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-secondary flex items-center gap-2">
                    <FileDiff size={16} /> {t('stashPreview.title', { index: stashPreviewState.index })}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 truncate">{stashPreviewState.message}</p>
                </div>
                <button onClick={() => setStashPreviewState(null)} className="text-text-secondary hover:text-text-primary">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-3 min-h-0 flex-1">
                <div className="rounded border border-border-subtle/15 bg-bg-base/70 overflow-hidden min-h-0">
                  <div className="px-3 py-2 border-b border-border-subtle/15 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    {t('stashPreview.files', { count: stashPreviewState.files.length })}
                  </div>
                  <div className="max-h-[52vh] overflow-y-auto p-1">
                    {stashPreviewState.files.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-text-secondary italic">{t('stashPreview.noFiles')}</p>
                    ) : stashPreviewState.files.map((filePath) => (
                      <div key={filePath} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-primary">
                        <FileText size={13} className="text-text-secondary shrink-0" />
                        <span className="truncate font-mono select-text">{filePath}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <pre
                  tabIndex={0}
                  className="rounded border border-border-subtle/15 bg-[#06111f] p-3 overflow-auto max-h-[52vh] text-[11px] leading-relaxed text-text-primary font-mono whitespace-pre"
                >
                  <code>{stashPreviewState.diff || t('stashPreview.noDiff')}</code>
                </pre>
              </div>

              <div className="flex gap-2 justify-end mt-5">
                <button onClick={() => setStashPreviewState(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                  {t('modal.close')}
                </button>
                <button
                  onClick={async () => {
                    const index = stashPreviewState.index;
                    setStashPreviewState(null);
                    await stashApply(index);
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-bg-base/70 border border-secondary/30 hover:border-secondary/60 hover:text-secondary disabled:opacity-40 text-sm font-bold rounded flex items-center gap-2"
                >
                  <RotateCcw size={14} /> {t('stashPreview.apply')}
                </button>
                <button
                  onClick={async () => {
                    const index = stashPreviewState.index;
                    setStashPreviewState(null);
                    await stashPop(index);
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-40 text-[#052900] text-sm font-bold rounded flex items-center gap-2"
                >
                  <Upload size={14} /> {t('stashPreview.pop')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── CREATE TAG MODAL ──────────── */}
      <AnimatePresence>
        {createTagFrom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setCreateTagFrom(undefined)}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[420px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-secondary flex items-center gap-2"><Tag size={16} /> {t('createTag.title')}</h3>
                <button onClick={() => setCreateTagFrom(undefined)} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                {t('newBranch.fromCommit')} <span className="font-mono text-secondary">{createTagFrom.slice(0, 7)}</span>
              </p>
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">{t('createTag.nameLabel')}</label>
                  <input
                    ref={newTagInputRef}
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); if (e.key === 'Escape') setCreateTagFrom(undefined); }}
                    placeholder="v1.0.0"
                    className="w-full bg-bg-base/70 border border-border-subtle/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">{t('createTag.msgLabel')}</label>
                  <input
                    value={newTagMessage}
                    onChange={(e) => setNewTagMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); if (e.key === 'Escape') setCreateTagFrom(undefined); }}
                    placeholder="Release v1.0.0"
                    className="w-full bg-bg-base/70 border border-border-subtle/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary/50"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCreateTagFrom(undefined)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">{t('modal.cancel')}</button>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded"
                >
                  <Plus size={14} className="inline mr-1" /> {t('createTag.button')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── RESET COMMIT MODAL ──────────── */}
      <AnimatePresence>
        {resetCommitFrom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
            onClick={() => setResetCommitFrom(undefined)}
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-overlay rounded-xl shadow-2xl p-6 w-[440px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-secondary flex items-center gap-2">
                  <RotateCcw size={16} /> {t('resetModal.title')}
                </h3>
                <button onClick={() => setResetCommitFrom(undefined)} className="text-text-secondary hover:text-text-primary">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                {t('resetModal.fromCommit')} <span className="font-mono text-secondary">{resetCommitFrom.slice(0, 7)}</span>
              </p>

              <div className="flex flex-col gap-3 mb-5">
                <span className="text-xs text-text-secondary font-bold block mb-1">
                  {t('resetModal.modeLabel')}
                </span>

                {/* Soft Mode Option */}
                <label className="flex items-start gap-3 p-2.5 rounded border border-border-subtle/10 hover:bg-bg-overlay/20 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="resetMode"
                    value="soft"
                    checked={resetMode === 'soft'}
                    onChange={() => setResetMode('soft')}
                    className="mt-1 accent-secondary"
                  />
                  <div>
                    <span className="text-xs font-bold text-text-primary block">Soft (--soft)</span>
                    <span className="text-[11px] text-text-secondary leading-relaxed block mt-0.5">
                      {t('resetModal.soft')}
                    </span>
                  </div>
                </label>

                {/* Mixed Mode Option */}
                <label className="flex items-start gap-3 p-2.5 rounded border border-border-subtle/10 hover:bg-bg-overlay/20 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="resetMode"
                    value="mixed"
                    checked={resetMode === 'mixed'}
                    onChange={() => setResetMode('mixed')}
                    className="mt-1 accent-secondary"
                  />
                  <div>
                    <span className="text-xs font-bold text-text-primary block">Mixed (--mixed)</span>
                    <span className="text-[11px] text-text-secondary leading-relaxed block mt-0.5">
                      {t('resetModal.mixed')}
                    </span>
                  </div>
                </label>

                {/* Hard Mode Option */}
                <label className="flex items-start gap-3 p-2.5 rounded border border-border-subtle/10 hover:bg-bg-overlay/20 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="resetMode"
                    value="hard"
                    checked={resetMode === 'hard'}
                    onChange={() => setResetMode('hard')}
                    className="mt-1 accent-[#dc6a6a]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#dc6a6a] block">Hard (--hard)</span>
                    <span className="text-[11px] text-text-secondary leading-relaxed block mt-0.5">
                      {t('resetModal.hard')}
                    </span>
                  </div>
                </label>
              </div>

              {/* Hard Reset Warnings & Confirmation Checkbox */}
              {resetMode === 'hard' && (
                <div className="flex flex-col gap-3 p-3 rounded bg-red-500/10 border border-red-500/30 mb-5 animate-pulse-slow">
                  <div className="flex gap-2 text-[#dc6a6a]">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-relaxed font-semibold">
                      {t('resetModal.warning')}
                    </span>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={hardResetConfirmed}
                      onChange={(e) => setHardResetConfirmed(e.target.checked)}
                      className="mt-0.5 accent-[#dc6a6a]"
                    />
                    <span className="text-[10px] text-text-primary leading-normal">
                      {t('resetModal.confirmCheckbox')}
                    </span>
                  </label>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => setResetCommitFrom(undefined)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                  {t('modal.cancel')}
                </button>
                <button
                  onClick={handleResetCommit}
                  disabled={isLoading || (resetMode === 'hard' && !hardResetConfirmed)}
                  className={`px-4 py-2 text-sm font-bold rounded shadow-lg transition-all ${
                    resetMode === 'hard'
                      ? 'bg-gradient-to-br from-[#dc6a6a] to-[#b34f4f] hover:from-[#e57979] hover:to-[#9f3e3e] shadow-red-500/10 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                      : 'bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-secondary/20 disabled:opacity-50 text-[#052900]'
                  }`}
                >
                  <RotateCcw size={14} className="inline mr-1" /> {t('resetModal.button')}
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

      <DangerConfirmDialog
        open={deleteConfirm !== null}
        title={deleteConfirm?.branch.startsWith('imagined/') ? 'Descartar futuro materializado' : t('deleteBranch.title')}
        message={
          deleteConfirm?.branch.startsWith('imagined/')
            ? `¿Estás seguro de que deseas descartar este futuro? Esto eliminará de forma permanente la branch real "${deleteConfirm.branch}" y su tag de flight level asociado.`
            : deleteConfirm
              ? t('deleteBranch.confirm', { branch: deleteConfirm.branch })
              : ''
        }
        warning={deleteConfirm?.notMerged ? t('deleteBranch.notMergedWarning') : undefined}
        cancelLabel={t('modal.cancel')}
        confirmLabel={deleteConfirm?.notMerged ? t('deleteBranch.force') : t('deleteBranch.delete')}
        disabled={isLoading}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          const r = await deleteBranch(deleteConfirm.branch, deleteConfirm.notMerged === true);
          if (r.success) {
            setDeleteConfirm(null);
          } else if (r.notMerged && !deleteConfirm.notMerged) {
            setDeleteConfirm({ branch: deleteConfirm.branch, notMerged: true });
          } else {
            setDeleteConfirm(null);
          }
        }}
      />

      <DangerConfirmDialog
        open={deleteTagConfirm !== null}
        title="Eliminar Tag"
        message={
          <>
            ¿Estás seguro de que deseas eliminar el tag{' '}
            <span className="font-bold text-text-primary">{deleteTagConfirm}</span>?
          </>
        }
        cancelLabel={t('modal.cancel')}
        confirmLabel="Eliminar"
        disabled={isLoading}
        onCancel={() => setDeleteTagConfirm(null)}
        onConfirm={async () => {
          if (!deleteTagConfirm) return;
          await deleteTag(deleteTagConfirm);
          setDeleteTagConfirm(null);
        }}
      />

      <DangerConfirmDialog
        open={discardConfirmFile !== null}
        title={t('discardConfirm.title')}
        message={discardConfirmFile ? t('discardConfirm.warning', { file: discardConfirmFile.path }) : ''}
        cancelLabel={t('modal.cancel')}
        confirmLabel={t('discardConfirm.button')}
        disabled={isLoading}
        onCancel={() => setDiscardConfirmFile(null)}
        onConfirm={async () => {
          if (!discardConfirmFile) return;
          const file = discardConfirmFile;
          setDiscardConfirmFile(null);
          if (file.status === 'untracked') {
            await deleteFile(file.path);
          } else {
            await discardFileChanges(file.path);
          }
        }}
      />

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
      <CheckoutConflictModal
        checkoutConflict={checkoutConflict}
        onClose={() => setCheckoutConflict(null)}
        onStashAndSwitch={async (branch) => {
          setCheckoutConflict(null);
          await checkoutBranchSmart(branch, { stashFirst: true });
        }}
        isLoading={isLoading}
      />

      {/* ──────────── RESET ALL CONFIRMATION ──────────── */}
      <ResetAllConfirmDialog
        show={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={async () => {
          const ok = await resetAll();
          if (ok) setShowResetConfirm(false);
        }}
        isLoading={isLoading}
      />

      {/* ──────────── CLEAN UNTRACKED MODAL ──────────── */}
      <CleanUntrackedModal
        show={showCleanModal}
        onClose={() => setShowCleanModal(false)}
        cleanableFiles={cleanableFiles}
        selectedCleanFiles={selectedCleanFiles}
        setSelectedCleanFiles={setSelectedCleanFiles}
        onClean={handleCleanSelected}
        cleanModalLoading={cleanModalLoading}
      />

      {/* ──────────── AMEND LAST COMMIT ──────────── */}
      <AmendLastCommitModal
        show={showAmend}
        onClose={() => { setShowAmend(false); setAmendNewMessage(''); }}
        lastCommitMessage={commits[0]?.message || t('graph.noCommits')}
        newMessage={amendNewMessage}
        setNewMessage={setAmendNewMessage}
        onConfirm={async () => {
          const r = await amendLastCommit(amendNewMessage.trim() || undefined);
          if (r.success) {
            setShowAmend(false);
            setAmendNewMessage('');
          }
        }}
        isLoading={isLoading}
        hasCommits={commits.length > 0 && !!repoPath}
      />

      {/* ──────────── SQUASH COMMITS ──────────── */}
      <SquashCommitsModal
        show={showSquash}
        onClose={() => { setShowSquash(false); setSquashMessage(''); setSquashN(2); }}
        commits={commits}
        squashN={squashN}
        setSquashN={setSquashN}
        squashMessage={squashMessage}
        setSquashMessage={setSquashMessage}
        onConfirm={async () => {
          const msg = squashMessage.trim() || commits[0]?.message || '';
          const r = await squashCommits(squashN, msg);
          if (r.success) {
            setShowSquash(false);
            setSquashMessage('');
            setSquashN(2);
          }
        }}
        isLoading={isLoading}
      />

      {/* ──────────── FILE CONTEXT MENU ──────────── */}
      <AnimatePresence>
        {fileContextMenu && (
          <FileContextMenu
            x={fileContextMenu.x}
            y={fileContextMenu.y}
            file={fileContextMenu.file}
            onStage={() => { stageFile(fileContextMenu.file.path, !fileContextMenu.file.staged); setFileContextMenu(null); }}
            onDiscard={() => { setDiscardConfirmFile(fileContextMenu.file); setFileContextMenu(null); }}
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
            onCreateTag={() => { setCreateTagFrom(contextMenu.hash); setNewTagName(''); setNewTagMessage(''); setContextMenu(null); }}
            onReset={() => { setResetCommitFrom(contextMenu.hash); setResetMode('mixed'); setHardResetConfirmed(false); setContextMenu(null); }}
            onCopySha={() => { contextMenu.hash && navigator.clipboard.writeText(contextMenu.hash); setContextMenu(null); }}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────── COMPONENTS ──────────── */


