'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { BranchContextMenuLayer, CommitContextMenu, FileContextMenu } from '@/components/ContextMenus';
import { type RepoStartMode } from '@/components/RepoModals';
import { useGitStore, Commit, GitFile, type FontSize, type RepoState } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useRepoLoader } from '@/hooks/use-repo-loader';
import { useAutoFetch } from '@/hooks/use-auto-fetch';
import { commitHasBranchRef, normalizeBranchName, type CommitSelectOptions } from '@/components/CommitGraph';
import { RepoMainView } from '@/components/RepoMainView';
import { RepoOverlayLayer } from '@/components/RepoOverlayLayer';
import { RepoTabs } from '@/components/RepoTabs';
import { DangerConfirmDialog } from '@/components/DangerConfirmDialog';
import {
  CheckoutConflictModal,
  ResetAllConfirmDialog,
  CleanUntrackedModal,
  AmendLastCommitModal,
  SquashCommitsModal,
  NewBranchModal,
  CreateTagModal,
  MergeNeedsCheckoutModal,
  RenameBranchModal,
  ForcePushConfirmModal,
} from '@/components/RepoActionModals';
import type { SpeculativeBranch } from '@/types/temporal-agent';
import { usePanelLayout, FLOATING_PANEL_INSET, GRAPH_SAFE_GAP } from '@/hooks/use-panel-layout';
import { LcarsDecorPanel } from '@/components/PageWidgets';
import { RepoSidebar } from '@/components/RepoSidebar';
import { RepoDetailsPanel } from '@/components/RepoDetailsPanel';
import { PageToasts, type PullDecisionToast } from '@/components/PageToasts';
import { TopBar } from '@/components/TopBar';
import { StashCreateModal, StashPreviewModal, type StashPreviewState } from '@/components/StashModals';
import { ResetCommitModal } from '@/components/ResetCommitModal';
import { useRepoChooser } from '@/hooks/use-repo-chooser';
import {
  isSafeDirectoryError, safeDirectoryPathFromError,
} from '@/lib/page-helpers';

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
import type { BlameLine, FileHistoryEntry, PullRequestDiffData, PullRequestEntry, RemoteEntry, WorktreeEntry, SubmoduleEntry } from '@/types/electron';
import { buildHunkPatch, parseUnifiedDiff } from '@/lib/hunk-patch';

const FONT_SIZE_OPTIONS: Array<{ key: FontSize; px: number }> = [
  { key: 'compact', px: 15 },
  { key: 'normal', px: 16 },
  { key: 'large', px: 17 },
];

type HunkApplyIntent = 'stage' | 'unstage' | 'discard';


export default function GitCronPage() {
  const {
    openRepos, activeRepoIdx, setActiveRepoIdx,
    repoPath,
    currentBranch, branches, remoteBranches,
    commits, modifiedFiles, commitMessage, setCommitMessage,
    selectedCommit, setSelectedCommit, isLoading, setLoading, error, setError, success, setSuccess,
    selectedFile, setSelectedFile, currentDiff, setCurrentDiff,
    stashes, tags, submodules, remotes,
    githubToken, githubUser,
    branchTracking, worktrees, pullRequests,
    setOpenRepos,
  } = useGitStore();

  const {
    loadConflictFile, resolveConflictContent,
    commitChanges, mergeBranch, revertCommit, resetToCommit, stashChanges,
    discardFileChanges, stageFile, stageFiles, removeIndexLock,
    checkoutBranch, checkoutBranchSmart, createBranch, pushChanges, pullChanges,
    openTerminal, stashPreview,
    connectGitHub, disconnectGitHub, loginWithGitHubDevice, bootstrapGitHub,
    bootstrapPreferences, changeLanguage, changeFontSize, changeDefaultFolder, pickDefaultFolder,
    setAutoFetchPrefs, setOsNotifications, rebindShortcut, resetShortcutsToDefaults, changeTheme, changeEnableCronometric,
    changeEnableCartography,
    addToGitignore, resetAll, stashFile, showInFolder, openInDefault,
    deleteFile, cleanUntracked, copyFilePath,
    mergeIntoCurrent, rebaseOnto, fastForwardBranch, amendLastCommit, cherryPickCommit, squashCommits,
    renameBranch, deleteBranch, deleteRemoteBranch, deleteTag, createTag, pushTag, pullSpecificBranch, pushSpecificBranch,
    pullWithDecision,
  } = useGitActions();

  const t = useT();
  const language = useGitStore((s) => s.language);
  const fontSize = useGitStore((s) => s.fontSize);
  const defaultFolder = useGitStore((s) => s.defaultFolder);
  const theme = useGitStore((s) => s.theme);
  const enableCronometric = useGitStore((s) => s.enableCronometric);
  const enableCartography = useGitStore((s) => s.enableCartography);
  const inCartography = useGitStore((s) => s.getActiveRepo()?.inCartography ?? false);
  const appFontSizePx = FONT_SIZE_OPTIONS.find((option) => option.key === fontSize)?.px ?? 15;

  const {
    openRepo, pendingInitRepo, cancelPendingInitRepo, initializePendingRepo,
    initializePendingRepoWithRemote,
    trustSafeDirectory, restoreLastRepo, closeRepo, persistOpenRepos, loadAll, loadDiff, refreshLog,
    refreshStatus, pickFolder, initRepo, cloneRepo, createGitHubRepo, listUserGitHubRepos,
    refreshRemotes, refreshWorktrees, refreshSubmodules, refreshBranches,
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
    void Promise.allSettled([
      window.api.ai.loadPrediction(repoPath),
      window.api.temporalAgent.loadConfig(repoPath, openRepos[activeRepoIdx]?.name ?? 'repo'),
    ]).then(([predictionResult, configResult]) => {
      if (!alive) return;
      const r = predictionResult.status === 'fulfilled' ? predictionResult.value : null;
      const cfg = configResult.status === 'fulfilled' ? configResult.value : null;
      setConfidenceThreshold(cfg?.skillProfile?.confidenceThreshold ?? 0);
      if (r?.success && r.data) {
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
  // Cartografía: vista top-level per-repo, hermana del grafo. Sólo "activa"
  // dentro de la vista 'repository' con un repo abierto, el flag on y el
  // sub-estado per-repo encendido. Replaza al grafo/diffs y oculta el switch/LCAR.
  const cartographyActive =
    enableCartography && activeView === 'repository' && !isRepoStartView && !!repoPath && inCartography;

  // Entrar/volver de Cartografía. Vive en RepoState (per-repo), así sobrevive el
  // cambio de tab de repo. Al entrar nos aseguramos de estar en la vista repo.
  // Levantamos isViewChanging por 150ms (mismo patrón que handleViewChange/
  // handleTabChange) para SUPRIMIR la transición de geometría del panel central:
  // el contenedor cambia de full-bleed↔centrado de golpe y solo se ve el fade
  // del contenido (técnica de hidratación), sin el deslizamiento/encogimiento.
  const handleToggleCartography = () => {
    if (!repoPath) return;
    const active = useGitStore.getState().getActiveRepo();
    if (!active) return;
    const next = !active.inCartography;
    setIsViewChanging(true);
    if (next && activeView !== 'repository') setActiveView('repository');
    updateActiveRepo({ inCartography: next });
    setTimeout(() => setIsViewChanging(false), 150);
  };
  const handleExitCartography = () => {
    setIsViewChanging(true);
    updateActiveRepo({ inCartography: false });
    setTimeout(() => setIsViewChanging(false), 150);
  };

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
    if (!remotes.some((remote) => remote.name === 'origin')) {
      setError(null);
      setSuccess(null);
      setPullDecision(null);
      setShowPublishRemote(true);
      return;
    }
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
  const [showSquash, setShowSquash] = useState(false);
  const [squashN, setSquashN] = useState(2);
  const [squashMessage, setSquashMessage] = useState('');
  const [pullRequestDiff, setPullRequestDiff] = useState<PullRequestDiffData | null>(null);
  const [pullRequestDiffLoading, setPullRequestDiffLoading] = useState(false);
  const [fileDiffMode, setFileDiffMode] = useState<'working-tree' | 'commit' | null>(null);
  const [fileHistoryFile, setFileHistoryFile] = useState<GitFile | null>(null);
  const [fileHistoryEntries, setFileHistoryEntries] = useState<FileHistoryEntry[]>([]);
  const [fileHistoryLoading, setFileHistoryLoading] = useState(false);
  const [blameFile, setBlameFile] = useState<GitFile | null>(null);
  const [blameLines, setBlameLines] = useState<BlameLine[]>([]);
  const [blameLoading, setBlameLoading] = useState(false);
  const [selectedBlameLineNo, setSelectedBlameLineNo] = useState<number | null>(null);
  const [hunkActionLoading, setHunkActionLoading] = useState<number | null>(null);
  const [showStashModal, setShowStashModal] = useState(false);
  const [stashMessage, setStashMessage] = useState('');
  const [stashPreviewState, setStashPreviewState] = useState<StashPreviewState | null>(null);
  const [checkoutConflict, setCheckoutConflict] = useState<{ branch: string; error: string } | null>(null);
  const [interactiveRebaseFrom, setInteractiveRebaseFrom] = useState<string | null>(null);
  const [branchMenu, setBranchMenu] = useState<{ x: number; y: number; branch: string } | null>(null);
  const [remoteBranchMenu, setRemoteBranchMenu] = useState<{ x: number; y: number; branch: string } | null>(null);
  const [renameModal, setRenameModal] = useState<{ oldName: string; newName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    branch: string;
    scope: 'local' | 'remote' | 'both';
    notMerged?: boolean;
    remote?: string;
    remoteBranch?: string;
  } | null>(null);
  const [deleteTagConfirm, setDeleteTagConfirm] = useState<string | null>(null);
  const [discardConfirmFile, setDiscardConfirmFile] = useState<GitFile | null>(null);
  const [mergeNeedsCheckout, setMergeNeedsCheckout] = useState<{ sourceBranch: string; targetBranch: string } | null>(null);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchFrom, setNewBranchFrom] = useState<string | undefined>(undefined);
  const [createTagFrom, setCreateTagFrom] = useState<string | undefined>(undefined);
  const [newTagName, setNewTagName] = useState('');
  const [newTagMessage, setNewTagMessage] = useState('');
  const [resetCommitFrom, setResetCommitFrom] = useState<string | undefined>(undefined);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanableFiles, setCleanableFiles] = useState<string[]>([]);
  const [selectedCleanFiles, setSelectedCleanFiles] = useState<Set<string>>(() => new Set());
  const [cleanModalLoading, setCleanModalLoading] = useState(false);

  // F5 (Remotes, Worktrees, Submodules) states
  const [showPublishRemote, setShowPublishRemote] = useState(false);
  const [showAddRemote, setShowAddRemote] = useState(false);
  const [remoteToRename, setRemoteToRename] = useState<RemoteEntry | null>(null);
  const [remoteToSetUrl, setRemoteToSetUrl] = useState<RemoteEntry | null>(null);
  const [remoteToDelete, setRemoteToDelete] = useState<RemoteEntry | null>(null);
  const [showAddWorktree, setShowAddWorktree] = useState(false);
  const [worktreeToDelete, setWorktreeToDelete] = useState<WorktreeEntry | null>(null);
  const [showAddSubmodule, setShowAddSubmodule] = useState(false);

  // F5 handlers
  // Remotes
  const handleAddRemote = async (name: string, url: string) => {
    if (!repoPath || !window.api) return;
    setLoading(true);
    try {
      const result = await window.api.gitRemoteAdd(repoPath, name, url);
      if (result.success) {
        setSuccess('Remoto agregado con éxito');
        setShowAddRemote(false);
        await refreshRemotes(repoPath);
        await refreshBranches(repoPath);
      } else {
        setError(result.error || 'Error al agregar el remoto');
      }
    } catch (err: any) {
      setError(err.message || 'Error al agregar el remoto');
    } finally {
      setLoading(false);
    }
  };

  const attachOriginAndPush = async (url: string): Promise<{ success: boolean; error?: string }> => {
    if (!repoPath || !window.api) return { success: false, error: t('publishRemote.errorNoRepo') };
    setLoading(true);
    setError(null);
    try {
      const add = await window.api.gitRemoteAdd(repoPath, 'origin', url);
      if (!add.success) {
        const message = add.error ?? t('publishRemote.errorAddRemote');
        setError(message);
        return { success: false, error: message };
      }
      await refreshRemotes(repoPath);
      await refreshBranches(repoPath);
      // `pushChanges` configures the upstream automatically on the first push.
      // If GitHub rejects it, origin stays configured so the next Push can retry.
      await pushChanges();
      return { success: true };
    } catch (error: any) {
      const message = error?.message ?? t('publishRemote.errorGeneric');
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGitHubRemote = async (): Promise<{ success: boolean; error?: string }> => {
    if (!githubToken) return { success: false, error: t('publishRemote.errorAuth') };
    const name = openRepos[activeRepoIdx]?.name ?? 'repo';
    const created = await createGitHubRepo(githubToken, name, true, '', false);
    if (!created.success) return { success: false, error: created.error ?? t('publishRemote.errorCreate') };
    const cloneUrl = created.data?.cloneUrl;
    if (!cloneUrl) return { success: false, error: t('publishRemote.errorCreate') };
    return attachOriginAndPush(cloneUrl);
  };

  const handleRenameRemote = async (oldName: string, newName: string) => {
    if (!repoPath || !window.api) return;
    setLoading(true);
    try {
      const result = await window.api.gitRemoteRename(repoPath, oldName, newName);
      if (result.success) {
        setSuccess('Remoto renombrado con éxito');
        setRemoteToRename(null);
        await refreshRemotes(repoPath);
        await refreshBranches(repoPath);
      } else {
        setError(result.error || 'Error al renombrar el remoto');
      }
    } catch (err: any) {
      setError(err.message || 'Error al renombrar el remoto');
    } finally {
      setLoading(false);
    }
  };

  const handleSetRemoteUrl = async (name: string, url: string) => {
    if (!repoPath || !window.api) return;
    setLoading(true);
    try {
      const result = await window.api.gitRemoteSetUrl(repoPath, name, url);
      if (result.success) {
        setSuccess('URL del remoto cambiada con éxito');
        setRemoteToSetUrl(null);
        await refreshRemotes(repoPath);
      } else {
        setError(result.error || 'Error al cambiar la URL del remoto');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la URL del remoto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRemote = async (name: string) => {
    if (!repoPath || !window.api) return;
    setLoading(true);
    try {
      const result = await window.api.gitRemoteRemove(repoPath, name);
      if (result.success) {
        setSuccess('Remoto eliminado con éxito');
        setRemoteToDelete(null);
        await refreshRemotes(repoPath);
        await refreshBranches(repoPath);
      } else {
        setError(result.error || 'Error al eliminar el remoto');
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el remoto');
    } finally {
      setLoading(false);
    }
  };

  // Worktrees
  const handleAddWorktree = async (path: string, branch: string) => {
    if (!repoPath || !window.api) return;
    setLoading(true);
    try {
      const result = await window.api.gitWorktreeAdd(repoPath, path, branch);
      if (result.success) {
        setSuccess('Worktree creado con éxito');
        setShowAddWorktree(false);
        await refreshWorktrees(repoPath);
      } else {
        setError(result.error || 'Error al crear el worktree');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear el worktree');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorktree = async (path: string, force: boolean = false) => {
    if (!repoPath || !window.api) return;
    setLoading(true);
    try {
      const result = await window.api.gitWorktreeRemove(repoPath, path, force);
      if (result.success) {
        setSuccess('Worktree eliminado con éxito');
        setWorktreeToDelete(null);
        await refreshWorktrees(repoPath);
      } else if (result.error === 'HAS_CHANGES') {
        // Confirm force delete
        if (confirm('Este worktree tiene cambios sin commitear. Si lo eliminás ahora, podrías perder cambios. ¿Querés forzar la eliminación?')) {
          await handleDeleteWorktree(path, true);
        } else {
          setWorktreeToDelete(null);
        }
      } else {
        setError(result.error || 'Error al eliminar el worktree');
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el worktree');
    } finally {
      setLoading(false);
    }
  };

  // Submodules
  const handleAddSubmodule = async (url: string, path: string) => {
    if (!repoPath || !window.api) return;
    setLoading(true);
    try {
      const result = await window.api.gitSubmoduleAdd(repoPath, url, path);
      if (result.success) {
        setSuccess('Submódulo agregado con éxito');
        setShowAddSubmodule(false);
        await refreshSubmodules(repoPath);
      } else {
        setError(result.error || 'Error al agregar el submódulo');
      }
    } catch (err: any) {
      setError(err.message || 'Error al agregar el submódulo');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmodule = async (path?: string) => {
    if (!repoPath || !window.api) return;
    setLoading(true);
    try {
      const result = await window.api.gitSubmoduleUpdate(repoPath, path, true);
      if (result.success) {
        setSuccess('Submódulo actualizado con éxito');
        await refreshSubmodules(repoPath);
      } else {
        setError(result.error || 'Error al actualizar el submódulo');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el submódulo');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSubmodules = async () => {
    if (!repoPath || !window.api) return;
    setLoading(true);
    try {
      const result = await window.api.gitSubmoduleSync(repoPath);
      if (result.success) {
        setSuccess('Submódulo sincronizado con éxito');
        await refreshSubmodules(repoPath);
      } else {
        setError(result.error || 'Error al sincronizar submódulos');
      }
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar submódulos');
    } finally {
      setLoading(false);
    }
  };

  // Cartografía NO es full-bleed: tiene chrome propio (header + volver al grafo),
  // así que vive en el contenedor centrado entre los sidebars y bajo el nav,
  // igual que Commit/History/Settings. Solo el grafo (canvas/HUD) es full-bleed.
  const isMainFullBleed =
    !cartographyActive
    && activeView === 'repository'
    && !isRepoStartView
    && activeTab === 'Graph'
    && !selectedFile
    && !selectedPullRequest
    && !fileHistoryFile
    && !blameFile;

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
  const repositoryDetailsVisible = detailsOpen && activeView === 'repository' && !!repoPath && !isRepoStartView && !cartographyActive;
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
    setFileDiffMode(null);
    setFileHistoryFile(null);
    setFileHistoryEntries([]);
    setFileHistoryLoading(false);
    setBlameFile(null);
    setBlameLines([]);
    setBlameLoading(false);
    setSelectedBlameLineNo(null);
    setHunkActionLoading(null);
  }, [repoPath]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Hydrate preferences (language) + GitHub auth + last opened repo on startup.
  useEffect(() => {
    let cancelled = false;
    const hydrateStartup = async () => {
      void bootstrapPreferences().catch(() => {});
      void bootstrapGitHub().catch(() => {});
      await restoreLastRepo().catch(() => {}); // silently tries to reopen the last repo; no-op if none saved
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

  // Auto-dismiss success toast has been moved to components/PageToasts.tsx
  // to support hover pausing and custom timer durations.
  /*
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]); // eslint-disable-line react-hooks/exhaustive-deps
  */

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

  const handleResetCommit = async (mode: 'soft' | 'mixed' | 'hard') => {
    if (!resetCommitFrom) return;
    await resetToCommit(resetCommitFrom, mode);
    setResetCommitFrom(undefined);
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
    setFileHistoryFile(null);
    setFileHistoryEntries([]);
    setBlameFile(null);
    setBlameLines([]);
    setSelectedBlameLineNo(null);
    setFileDiffMode('working-tree');
    setHunkActionLoading(null);
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
    setFileHistoryFile(null);
    setFileHistoryEntries([]);
    setBlameFile(null);
    setBlameLines([]);
    setSelectedBlameLineNo(null);
    setFileDiffMode('commit');
    setHunkActionLoading(null);
    const r = await window.api.gitDiffAtCommit(repoPath, file.path, selectedCommit.hash);
    if (r.success && r.data) {
      useGitStore.getState().setCurrentDiff(r.data);
      useGitStore.getState().setSelectedFile(file);
    }
    setTimeout(() => {
      setIsTabChanging(false);
    }, 150);
  };

  const handleOpenFileHistory = async (file: GitFile) => {
    if (!repoPath || !window.api) return;
    setIsTabChanging(true);
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setSelectedFile(null);
    setCurrentDiff('');
    setFileDiffMode(null);
    setHunkActionLoading(null);
    setBlameFile(null);
    setBlameLines([]);
    setSelectedBlameLineNo(null);
    setFileHistoryFile(file);
    setFileHistoryEntries([]);
    setFileHistoryLoading(true);
    setTimeout(() => {
      setIsTabChanging(false);
    }, 150);

    try {
      const result = await window.api.gitFileHistory(repoPath, file.path, 100);
      if (result.success) {
        setFileHistoryEntries(result.data ?? []);
      } else {
        setError(result.error ?? t('fileHistory.loadError'));
      }
    } catch (err: any) {
      setError(err?.message ?? t('fileHistory.loadError'));
    } finally {
      setFileHistoryLoading(false);
    }
  };

  const handleSelectFileHistoryEntry = async (entry: FileHistoryEntry) => {
    if (!repoPath || !window.api || !fileHistoryFile) return;
    setIsTabChanging(true);
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setPullRequestDiffLoading(false);
    setFileDiffMode('commit');
    setHunkActionLoading(null);
    setBlameFile(null);
    setBlameLines([]);
    setSelectedBlameLineNo(null);
    setSelectedCommit(entry);
    setFileHistoryFile(null);
    setFileHistoryEntries([]);

    const result = await window.api.gitDiffAtCommit(repoPath, entry.filePath, entry.hash);
    if (result.success && result.data != null) {
      setCurrentDiff(result.data);
      setSelectedFile(fileHistoryFile);
    } else if (!result.success) {
      setError(result.error ?? t('diff.noChanges'));
    }

    setTimeout(() => {
      setIsTabChanging(false);
    }, 150);
  };

  const handleOpenFileBlame = async (file: GitFile) => {
    if (!repoPath || !window.api) return;
    setIsTabChanging(true);
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setSelectedFile(null);
    setCurrentDiff('');
    setFileDiffMode(null);
    setFileHistoryFile(null);
    setFileHistoryEntries([]);
    setHunkActionLoading(null);
    setBlameFile(file);
    setBlameLines([]);
    setSelectedBlameLineNo(null);
    setBlameLoading(true);
    setTimeout(() => {
      setIsTabChanging(false);
    }, 150);

    try {
      const result = await window.api.gitBlame(repoPath, file.path);
      if (result.success) {
        setBlameLines(result.data ?? []);
      } else {
        setError(result.error ?? t('blame.loadError'));
      }
    } catch (err: any) {
      setError(err?.message ?? t('blame.loadError'));
    } finally {
      setBlameLoading(false);
    }
  };

  const handleSelectBlameLine = (line: BlameLine) => {
    setSelectedBlameLineNo(line.lineNo);
    if (line.isUncommitted) return;

    const existingCommit = commits.find((commit) => commit.hash === line.commitHash);
    setSelectedCommit(existingCommit ?? {
      hash: line.commitHash,
      shortHash: line.shortHash,
      message: line.summary,
      authorName: line.author,
      authorEmail: line.authorEmail ?? '',
      date: line.authorTime,
      parents: [],
    });
  };

  const handleSelectPullRequest = async (pr: PullRequestEntry) => {
    if (!repoPath || !githubToken || !window.api) return;
    setIsTabChanging(true);
    setSelectedCommit(null);
    setSelectedFile(null);
    setCurrentDiff('');
    setFileHistoryFile(null);
    setFileHistoryEntries([]);
    setBlameFile(null);
    setBlameLines([]);
    setSelectedBlameLineNo(null);
    setFileDiffMode(null);
    setHunkActionLoading(null);
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

  const handleApplyHunk = async (hunkIndex: number, intent: HunkApplyIntent, selectedLines?: number[]) => {
    if (!repoPath || !window.api || !selectedFile || !currentDiff) return;

    setHunkActionLoading(hunkIndex);
    setError(null);
    try {
      const fileDiff = parseUnifiedDiff(currentDiff);
      const hunkPatch = buildHunkPatch(fileDiff, hunkIndex, { selectedLines });
      const result = await window.api.gitApplyHunk(repoPath, selectedFile.path, hunkPatch, {
        cached: intent === 'stage' || intent === 'unstage',
        reverse: intent === 'unstage' || intent === 'discard',
      });

      if (!result.success) {
        setError(result.error ?? t('diff.hunkApplyError'));
        return;
      }

      await refreshStatus(repoPath);
      await loadDiff(selectedFile.path, selectedFile.staged, repoPath);
    } catch (err: any) {
      setError(err?.message ?? t('diff.hunkApplyError'));
    } finally {
      setHunkActionLoading(null);
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
    setFileDiffMode(null);
    setFileHistoryFile(null);
    setFileHistoryEntries([]);
    setFileHistoryLoading(false);
    setBlameFile(null);
    setBlameLines([]);
    setBlameLoading(false);
    setSelectedBlameLineNo(null);
    setHunkActionLoading(null);
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
    setFileHistoryFile(null);
    setFileHistoryEntries([]);
    setBlameFile(null);
    setBlameLines([]);
    setSelectedBlameLineNo(null);
    setFileDiffMode(null);
    setHunkActionLoading(null);
    setRepoStartMode('create');
    handleViewChange('repository');
    setShowRepoChooser(true);
  };

  const {
    openExisting: handleOpenExistingFromChooser,
    createRepo: handleCreateRepoFromChooser,
    cloneRepoFromChooser: handleCloneRepoFromChooser,
    forcePushConfirmOpen,
    cancelForcePush,
    confirmForcePush,
  } = useRepoChooser({
    openRepo,
    initRepo,
    cloneRepo,
    createGitHubRepo,
    loadAll,
    onCloseChooser: handleCloseRepoChooser,
  });

  const handleSelectRepoTab = async (idx: number) => {
    const repo = openRepos[idx];
    if (!repo || idx === activeRepoIdx) return;
    handleViewChange('repository');
    handleCloseRepoChooser();
    setSelectedPullRequest(null);
    setPullRequestDiff(null);
    setPullRequestDiffLoading(false);
    setFileHistoryFile(null);
    setFileHistoryEntries([]);
    setFileHistoryLoading(false);
    setBlameFile(null);
    setBlameLines([]);
    setBlameLoading(false);
    setSelectedBlameLineNo(null);
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
            showGraphModeSwitch={activeView === 'repository' && !isRepoStartView && !cartographyActive && activeTab === 'Graph' && !!repoPath && enableCronometric}
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
          onDeleteBranchRequest={(b) => setDeleteConfirm({ branch: b, scope: 'local' })}
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
          onToggleCartography={handleToggleCartography}
          onAddRemoteRequest={() => setShowAddRemote(true)}
          onRenameRemoteRequest={setRemoteToRename}
          onSetRemoteUrlRequest={setRemoteToSetUrl}
          onDeleteRemoteRequest={setRemoteToDelete}
          onAddWorktreeRequest={() => setShowAddWorktree(true)}
          onDeleteWorktreeRequest={setWorktreeToDelete}
          onAddSubmoduleRequest={() => setShowAddSubmodule(true)}
          onUpdateSubmodule={handleUpdateSubmodule}
          onSyncSubmodules={handleSyncSubmodules}
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
          <RepoMainView
            activeView={activeView}
            isRepoStartView={isRepoStartView}
            cartographyActive={cartographyActive}
            cartographyRepoPath={repoPath ?? null}
            onExitCartography={handleExitCartography}
            settingsPanel={{
              selectedSettingsSection,
              setSelectedSettingsSection,
              handleViewChange,
              language,
              changeLanguage,
              fontSize,
              changeFontSize,
              defaultFolder,
              changeDefaultFolder,
              pickDefaultFolder,
              theme,
              changeTheme,
              enableCronometric,
              changeEnableCronometric,
              enableCartography,
              changeEnableCartography,
              setAutoFetchPrefs,
              setOsNotifications,
              rebindShortcut,
              resetShortcutsToDefaults,
              repoPath,
              repoName: openRepos[activeRepoIdx]?.name ?? 'repo',
              onTemporalPrediction: (r) => {
                r.branches.forEach((b: any, i: number) => {
                  if (b.sourceId === undefined) b.sourceId = null;
                  if (b.description === undefined) b.description = null;
                  if (b.predictionIndex == null) b.predictionIndex = i + 1;
                });
                setRawSpeculativeBranches(r.branches);
                setSpeculativeAt(r.generatedAt);
                setShowSpeculative(true);
              },
              onTemporalConfigSaved: (cfg) => {
                setConfidenceThreshold(cfg.skillProfile.confidenceThreshold);
              },
              updateStatus,
              updateInfo,
              downloadProgress,
              changelogEntries,
              changelogError,
              changelogRaw,
              handleDownloadUpdate,
              handleInstallUpdate,
              handleCheckForUpdate,
            }}
            helpPanel={{
              selectedHelpSection,
              handleViewChange,
            }}
            profilePanel={{
              githubUser,
              deviceCodeInfo,
              authMode,
              setAuthMode,
              tokenInput,
              setTokenInput,
              isLoggingIn,
              isLoading,
              handleLoginWithGitHub,
              handleConnectGitHub,
              disconnectGitHub,
              handleViewChange,
            }}
            repoStart={{
              mode: repoStartMode,
              repoPath,
              githubConnected: !!githubUser,
              isLoading,
              onClose: handleCloseRepoChooser,
              onOpenExisting: handleOpenExistingFromChooser,
              onPickCreateFolder: () => pickFolder('Elegir carpeta padre donde crear el repo'),
              onPickCloneFolder: () => pickFolder('Elegir carpeta padre donde clonar'),
              onCreate: handleCreateRepoFromChooser,
              onClone: handleCloneRepoFromChooser,
              onListRepos: () => githubToken ? listUserGitHubRepos(githubToken) : Promise.resolve([]),
              onConnectGitHub: () => handleViewChange('profile'),
            }}
            diffViews={{
              selectedPullRequest,
              pullRequestDiff,
              pullRequestDiffLoading,
              selectedFile,
              currentDiff,
              wordWrap,
              fileDiffMode,
              fileHistoryFile,
              fileHistoryEntries,
              fileHistoryLoading,
              blameFile,
              blameLines,
              blameLoading,
              selectedBlameLineNo,
              hunkActionLoading,
              onToggleWordWrap: () => setWordWrap(!wordWrap),
              onCloseDiff: handleCloseDiff,
              onSelectFileHistoryEntry: handleSelectFileHistoryEntry,
              onFileHistoryContextMenu: (event, entry) => openContextMenu({ x: event.clientX, y: event.clientY, hash: entry.hash }),
              onSelectBlameLine: handleSelectBlameLine,
              onStageHunk: (hunkIndex, selectedLines) => void handleApplyHunk(hunkIndex, 'stage', selectedLines),
              onUnstageHunk: (hunkIndex, selectedLines) => void handleApplyHunk(hunkIndex, 'unstage', selectedLines),
              onDiscardHunk: (hunkIndex, selectedLines) => void handleApplyHunk(hunkIndex, 'discard', selectedLines),
              conflictFileLoading,
              conflictFileContent,
              isSaving: isLoading,
              onSaveConflict: async (file, content) => {
                const result = await resolveConflictContent(file.path, content);
                if (result.success) handleCloseDiff();
              },
            }}
            tabViews={{
              activeTab,
              commits,
              selectedCommit,
              currentBranch,
              filterText,
              modifiedFiles,
              hasGithubUser: !!githubUser,
              isLoading,
              onSelectCommit: handleSelectCommit,
              onCommitContextMenu: (event, commit) => openContextMenu({ x: event.clientX, y: event.clientY, hash: commit.hash }),
            }}
            graphView={{
              graphMode,
              activeGraphMode,
              isDragging,
              isStartupGraphReady,
              sidebarOpen,
              sidebarW,
              repositoryDetailsVisible,
              detailsW,
              graphColumns,
              beginGraphColDrag,
              enableCronometric,
              speculativeBranches,
              selectedBranchName,
              selectedBranchFocusRequest,
              showSpeculative,
              leftGraphSafe,
              rightGraphSafe,
              branches,
              isAnyContextMenuOpen: !!contextMenu || !!branchMenu || !!remoteBranchMenu || !!fileContextMenu,
              onChangeGraphMode: handleChangeGraphMode,
              onToggleSpeculative: () => setShowSpeculative((v) => !v),
              onClearGraphSelection: handleClearGraphSelection,
            }}
            interactiveRebase={{
              interactiveRebaseFrom,
              setInteractiveRebaseFrom,
            }}
          />
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
          onRequestResetAll={() => {
            setSuccess(null);
            setError(null);
            setPullDecision(null);
            setShowResetConfirm(true);
          }}
          onRequestCleanUntracked={handleOpenCleanModal}
        />

        {/* LCAR-29 right-side decorative panel — cronométrico only when Graph tab is active and no diff is open */}
        <LcarsDecorPanel
          show={activeView === 'repository' && !isRepoStartView && !cartographyActive && activeGraphMode === 'chronometric' && activeTab === 'Graph' && !selectedFile && !selectedPullRequest && !fileHistoryFile && !blameFile && !interactiveRebaseFrom}
        />
      </div>

      {/* ──────────── TOASTS: success / pull-decision / error ──────────── */}
      <PageToasts
        pullDecision={pullDecision}
        onPullDecision={handlePullDecision}
        onDismissPullDecision={() => setPullDecision(null)}
        canTrustSafeDirectory={canTrustSafeDirectory}
        onTrustSafeDirectory={handleTrustSafeDirectory}
      />

      <RepoOverlayLayer
        setInteractiveRebaseFrom={setInteractiveRebaseFrom}
        isLoading={isLoading}
        currentBranch={currentBranch}
        repoPath={repoPath}
        commits={commits}
        branchTracking={branchTracking}
        showNewBranch={showNewBranch}
        setShowNewBranch={setShowNewBranch}
        newBranchName={newBranchName}
        setNewBranchName={setNewBranchName}
        newBranchFrom={newBranchFrom}
        setNewBranchFrom={setNewBranchFrom}
        newBranchInputRef={newBranchInputRef}
        onCreateBranch={handleCreateBranch}
        showStashModal={showStashModal}
        setShowStashModal={setShowStashModal}
        stashMessage={stashMessage}
        setStashMessage={setStashMessage}
        onCreateStash={handleCreateStash}
        stashPreviewState={stashPreviewState}
        setStashPreviewState={setStashPreviewState}
        createTagFrom={createTagFrom}
        setCreateTagFrom={setCreateTagFrom}
        newTagName={newTagName}
        setNewTagName={setNewTagName}
        newTagMessage={newTagMessage}
        setNewTagMessage={setNewTagMessage}
        newTagInputRef={newTagInputRef}
        onCreateTag={handleCreateTag}
        resetCommitFrom={resetCommitFrom}
        setResetCommitFrom={setResetCommitFrom}
        onResetCommit={handleResetCommit}
        branchMenu={branchMenu}
        setBranchMenu={setBranchMenu}
        remoteBranchMenu={remoteBranchMenu}
        setRemoteBranchMenu={setRemoteBranchMenu}
        performMerge={performMerge}
        rebaseOnto={rebaseOnto}
        fastForwardBranch={fastForwardBranch}
        pullSpecificBranch={pullSpecificBranch}
        pushSpecificBranch={pushSpecificBranch}
        onCheckoutAttempt={handleCheckoutAttempt}
        mergeNeedsCheckout={mergeNeedsCheckout}
        setMergeNeedsCheckout={setMergeNeedsCheckout}
        checkoutBranch={checkoutBranch}
        mergeIntoCurrent={mergeIntoCurrent}
        setCheckoutConflict={setCheckoutConflict}
        renameModal={renameModal}
        setRenameModal={setRenameModal}
        renameBranch={renameBranch}

        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        deleteBranch={deleteBranch}
        deleteRemoteBranch={deleteRemoteBranch}
        checkBranchMerged={async (branch) => {
          if (!window.api || !repoPath) return true;
          const r = await window.api.gitIsBranchMerged(repoPath, branch);
          // Si el chequeo falla, asumí mergeada: no fuerza -D y el flujo reactivo cubre.
          return r.success ? (r.data?.merged ?? true) : true;
        }}
        deleteTagConfirm={deleteTagConfirm}
        setDeleteTagConfirm={setDeleteTagConfirm}
        deleteTag={deleteTag}
        discardConfirmFile={discardConfirmFile}
        setDiscardConfirmFile={setDiscardConfirmFile}
        deleteFile={deleteFile}
        discardFileChanges={discardFileChanges}

        forcePushConfirmOpen={forcePushConfirmOpen}
        cancelForcePush={cancelForcePush}
        confirmForcePush={confirmForcePush}
        pendingInitRepo={pendingInitRepo}
        cancelPendingInitRepo={cancelPendingInitRepo}
        initializePendingRepo={async () => {
          const r = await initializePendingRepo();
          if (r.success) handleCloseRepoChooser();
          return r;
        }}
        initializePendingRepoWithRemote={async (remoteUrl, onProgress) => {
          const r = await initializePendingRepoWithRemote(remoteUrl, onProgress);
          if (r.success) handleCloseRepoChooser();
          return r;
        }}
        checkoutConflict={checkoutConflict}
        setCheckoutConflictModal={setCheckoutConflict}
        checkoutBranchSmart={checkoutBranchSmart}
        showResetConfirm={showResetConfirm}
        setShowResetConfirm={setShowResetConfirm}
        resetAll={resetAll}
        showCleanModal={showCleanModal}
        setShowCleanModal={setShowCleanModal}
        cleanableFiles={cleanableFiles}
        selectedCleanFiles={selectedCleanFiles}
        setSelectedCleanFiles={setSelectedCleanFiles}
        onCleanSelected={handleCleanSelected}
        cleanModalLoading={cleanModalLoading}
        showAmend={showAmend}
        setShowAmend={setShowAmend}
        amendNewMessage={amendNewMessage}
        setAmendNewMessage={setAmendNewMessage}
        amendLastCommit={amendLastCommit}
        showSquash={showSquash}
        setShowSquash={setShowSquash}
        squashN={squashN}
        setSquashN={setSquashN}
        squashMessage={squashMessage}
        setSquashMessage={setSquashMessage}
        squashCommits={squashCommits}
        fileContextMenu={fileContextMenu}
        setFileContextMenu={setFileContextMenu}
        onOpenFileHistory={handleOpenFileHistory}
        onOpenFileBlame={handleOpenFileBlame}
        stageFile={stageFile}
        stashFile={stashFile}
        addToGitignore={addToGitignore}
        setError={setError}
        setSuccess={setSuccess}
        openInDefault={openInDefault}
        showInFolder={showInFolder}
        copyFilePath={copyFilePath}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        mergeBranch={mergeBranch}
        cherryPickCommit={cherryPickCommit}
        revertCommit={revertCommit}
        showAddRemote={showAddRemote}
        showPublishRemote={showPublishRemote}
        repoName={openRepos[activeRepoIdx]?.name ?? 'repo'}
        githubConnected={!!githubUser}
        setShowPublishRemote={setShowPublishRemote}
        onCreateGitHubRemote={handleCreateGitHubRemote}
        onLinkExistingRemote={attachOriginAndPush}
        onConnectGitHub={() => { setShowPublishRemote(false); handleViewChange('profile'); }}
        setShowAddRemote={setShowAddRemote}
        onAddRemote={handleAddRemote}
        remoteToRename={remoteToRename}
        setRemoteToRename={setRemoteToRename}
        onRenameRemote={handleRenameRemote}
        remoteToSetUrl={remoteToSetUrl}
        setRemoteToSetUrl={setRemoteToSetUrl}
        onSetRemoteUrl={handleSetRemoteUrl}
        remoteToDelete={remoteToDelete}
        setRemoteToDelete={setRemoteToDelete}
        onDeleteRemote={handleDeleteRemote}
        showAddWorktree={showAddWorktree}
        setShowAddWorktree={setShowAddWorktree}
        onAddWorktree={handleAddWorktree}
        onPickWorktreeFolder={pickFolder}
        worktreeToDelete={worktreeToDelete}
        setWorktreeToDelete={setWorktreeToDelete}
        onDeleteWorktree={handleDeleteWorktree}
        branches={branches}
        showAddSubmodule={showAddSubmodule}
        setShowAddSubmodule={setShowAddSubmodule}
        onAddSubmodule={handleAddSubmodule}
      />
    </div>
  );
}

/* ──────────── COMPONENTS ──────────── */


