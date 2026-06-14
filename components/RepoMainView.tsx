'use client';

import dynamic from 'next/dynamic';
import { FolderOpen, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { MouseEvent } from 'react';
import { CommitGraph, type CommitSelectOptions } from '@/components/CommitGraph';
import { GraphColumnHandle, DeferredPanelLoading } from '@/components/PageWidgets';
import {
  BlameView,
  CommitTabView,
  FileDiffView,
  FileHistoryView,
  HistoryView,
  PullRequestDiffView,
} from '@/components/RepoContentViews';
import type { HunkActionMode } from '@/components/DiffViewer';
import { RepoStartPanel, type RepoStartMode } from '@/components/RepoModals';
import { SettingsPanel, type SettingsPanelProps } from '@/components/SettingsPanel';
import { HelpPanel, type HelpPanelProps } from '@/components/HelpPanel';
import { ProfilePanel, type ProfilePanelProps } from '@/components/ProfilePanel';
import InteractiveRebasePanel from '@/components/InteractiveRebasePanel';
import { FLOATING_PANEL_INSET, GRAPH_SAFE_GAP, type GraphColumnKey } from '@/hooks/use-panel-layout';
import { useT } from '@/hooks/use-translation';
import type { Commit, GitFile } from '@/lib/git-store';
import { cn } from '@/lib/utils';
import type { SpeculativeBranch } from '@/types/temporal-agent';
import type { BlameLine, FileHistoryEntry, PullRequestDiffData, PullRequestEntry } from '@/types/electron';

const ChronometricGraph = dynamic(
  () => import('@/components/ChronometricGraph').then((mod) => mod.ChronometricGraph),
  {
    ssr: false,
    loading: () => <DeferredPanelLoading />,
  },
);

type AppView = 'repository' | 'settings' | 'help' | 'profile';
type GraphMode = 'classic' | 'chronometric';

type RepoStartViewProps = {
  mode: RepoStartMode;
  repoPath: string | null;
  githubConnected: boolean;
  isLoading: boolean;
  onClose: () => void;
  onOpenExisting: () => Promise<void>;
  onPickCreateFolder: () => Promise<string | null>;
  onPickCloneFolder: () => Promise<string | null>;
  onCreate: Parameters<typeof RepoStartPanel>[0]['onCreate'];
  onClone: Parameters<typeof RepoStartPanel>[0]['onClone'];
  onListRepos: Parameters<typeof RepoStartPanel>[0]['onListRepos'];
  onConnectGitHub: () => void;
};

type DiffViewsProps = {
  selectedPullRequest: PullRequestEntry | null;
  pullRequestDiff: PullRequestDiffData | null;
  pullRequestDiffLoading: boolean;
  selectedFile: GitFile | null;
  currentDiff: string;
  wordWrap: boolean;
  fileDiffMode: 'working-tree' | 'commit' | null;
  fileHistoryFile: GitFile | null;
  fileHistoryEntries: FileHistoryEntry[];
  fileHistoryLoading: boolean;
  blameFile: GitFile | null;
  blameLines: BlameLine[];
  blameLoading: boolean;
  selectedBlameLineNo: number | null;
  hunkActionLoading: number | null;
  onToggleWordWrap: () => void;
  onCloseDiff: () => void;
  onSelectFileHistoryEntry: (entry: FileHistoryEntry) => void;
  onFileHistoryContextMenu: (event: MouseEvent, entry: FileHistoryEntry) => void;
  onSelectBlameLine: (line: BlameLine) => void;
  onStageHunk: (hunkIndex: number, selectedLines?: number[]) => void;
  onUnstageHunk: (hunkIndex: number, selectedLines?: number[]) => void;
  onDiscardHunk: (hunkIndex: number, selectedLines?: number[]) => void;
  conflictFileLoading: boolean;
  conflictFileContent: string;
  isSaving: boolean;
  onSaveConflict: (file: GitFile, content: string) => Promise<void> | void;
};

type TabViewsProps = {
  activeTab: string;
  commits: Commit[];
  selectedCommit: Commit | null;
  currentBranch?: string;
  filterText: string;
  modifiedFiles: GitFile[];
  hasGithubUser: boolean;
  isLoading: boolean;
  onSelectCommit: (commit: Commit, options?: CommitSelectOptions) => void;
  onCommitContextMenu: (event: MouseEvent, commit: Commit) => void;
};

type GraphViewProps = {
  graphMode: GraphMode;
  activeGraphMode: GraphMode;
  isDragging: boolean;
  isStartupGraphReady: boolean;
  sidebarOpen: boolean;
  sidebarW: number;
  repositoryDetailsVisible: boolean;
  detailsW: number;
  graphColumns: Record<GraphColumnKey, number>;
  beginGraphColDrag: (col: GraphColumnKey, event: MouseEvent, direction?: 1 | -1) => void;
  enableCronometric: boolean;
  speculativeBranches: SpeculativeBranch[];
  selectedBranchName: string | null;
  selectedBranchFocusRequest: number;
  showSpeculative: boolean;
  leftGraphSafe: number;
  rightGraphSafe: number;
  branches: string[];
  isAnyContextMenuOpen: boolean;
  onChangeGraphMode: (mode: GraphMode) => void;
  onToggleSpeculative: () => void;
  onClearGraphSelection: () => void;
};

export type RepoMainViewProps = {
  activeView: AppView;
  isRepoStartView: boolean;
  settingsPanel: SettingsPanelProps;
  helpPanel: HelpPanelProps;
  profilePanel: ProfilePanelProps;
  repoStart: RepoStartViewProps;
  diffViews: DiffViewsProps;
  tabViews: TabViewsProps;
  graphView: GraphViewProps;
  interactiveRebase: {
    interactiveRebaseFrom: string | null;
    setInteractiveRebaseFrom: (hash: string | null) => void;
  };
};

export function RepoMainView({
  activeView,
  isRepoStartView,
  settingsPanel,
  helpPanel,
  profilePanel,
  repoStart,
  diffViews,
  tabViews,
  graphView,
  interactiveRebase,
}: RepoMainViewProps) {
  if (interactiveRebase.interactiveRebaseFrom) {
    return (
      <InteractiveRebasePanel
        baseCommitHash={interactiveRebase.interactiveRebaseFrom}
        onClose={() => interactiveRebase.setInteractiveRebaseFrom(null)}
        layoutProps={{
          sidebarOpen: graphView.sidebarOpen,
          sidebarW: graphView.sidebarW,
          repositoryDetailsVisible: graphView.repositoryDetailsVisible,
          detailsW: graphView.detailsW,
          isDragging: graphView.isDragging,
        }}
      />
    );
  }
  if (activeView === 'settings') return <SettingsPanel {...settingsPanel} />;
  if (activeView === 'help') return <HelpPanel {...helpPanel} />;
  if (activeView === 'profile') return <ProfilePanel {...profilePanel} />;
  if (isRepoStartView) return <RepoStartView {...repoStart} />;
  if (diffViews.selectedPullRequest) {
    return (
      <PullRequestDiffView
        pullRequest={diffViews.selectedPullRequest}
        pullRequestDiff={diffViews.pullRequestDiff}
        pullRequestDiffLoading={diffViews.pullRequestDiffLoading}
        wordWrap={diffViews.wordWrap}
        onBack={diffViews.onCloseDiff}
      />
    );
  }
  if (diffViews.fileHistoryFile) {
    return (
      <FileHistoryView
        file={diffViews.fileHistoryFile}
        entries={diffViews.fileHistoryEntries}
        selectedHash={tabViews.selectedCommit?.hash}
        isLoading={diffViews.fileHistoryLoading}
        onBack={diffViews.onCloseDiff}
        onSelect={diffViews.onSelectFileHistoryEntry}
        onContextMenu={diffViews.onFileHistoryContextMenu}
      />
    );
  }
  if (diffViews.blameFile) {
    return (
      <BlameView
        file={diffViews.blameFile}
        lines={diffViews.blameLines}
        selectedLineNo={diffViews.selectedBlameLineNo}
        isLoading={diffViews.blameLoading}
        onBack={diffViews.onCloseDiff}
        onSelectLine={diffViews.onSelectBlameLine}
      />
    );
  }
  if (diffViews.selectedFile) {
    const hunkActionMode: HunkActionMode | undefined =
      diffViews.fileDiffMode === 'working-tree'
        ? diffViews.selectedFile.staged ? 'unstage' : 'stage'
        : undefined;

    return (
      <FileDiffView
        file={diffViews.selectedFile}
        currentDiff={diffViews.currentDiff}
        wordWrap={diffViews.wordWrap}
        hunkActionMode={hunkActionMode}
        hunkActionLoading={diffViews.hunkActionLoading}
        onToggleWordWrap={diffViews.onToggleWordWrap}
        onBack={diffViews.onCloseDiff}
        onStageHunk={diffViews.onStageHunk}
        onUnstageHunk={diffViews.onUnstageHunk}
        onDiscardHunk={diffViews.onDiscardHunk}
        conflictFileLoading={diffViews.conflictFileLoading}
        conflictFileContent={diffViews.conflictFileContent}
        isSaving={diffViews.isSaving}
        onSaveConflict={(content) => diffViews.onSaveConflict(diffViews.selectedFile!, content)}
      />
    );
  }
  if (tabViews.activeTab === 'History') return <HistoryTabView {...tabViews} />;
  if (tabViews.activeTab === 'Commit') return <CommitWorkspaceView {...tabViews} />;
  return <GraphTabView tabViews={tabViews} graphView={graphView} />;
}

function RepoStartView({
  mode,
  repoPath,
  githubConnected,
  isLoading,
  onClose,
  onOpenExisting,
  onPickCreateFolder,
  onPickCloneFolder,
  onCreate,
  onClone,
  onListRepos,
  onConnectGitHub,
}: RepoStartViewProps) {
  const t = useT();

  return (
    <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-base/40">
      <div className="border-b border-border-subtle/15 shrink-0">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <FolderOpen size={18} className="text-secondary shrink-0" />
            <h2 className="truncate text-base font-bold text-text-primary">
              {mode === 'open' && 'Abrir repositorio existente'}
              {mode === 'create' && 'Crear repositorio nuevo'}
              {mode === 'clone' && 'Clonar repositorio'}
            </h2>
          </div>
          {repoPath && (
            <button
              onClick={onClose}
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
            mode={mode}
            githubConnected={githubConnected}
            isLoading={isLoading}
            onOpenExisting={onOpenExisting}
            onPickCreateFolder={onPickCreateFolder}
            onPickCloneFolder={onPickCloneFolder}
            onCreate={onCreate}
            onClone={onClone}
            onListRepos={onListRepos}
            onConnectGitHub={onConnectGitHub}
            onComplete={onClose}
          />
        </div>
      </div>
    </div>
  );
}

function HistoryTabView({
  commits,
  selectedCommit,
  currentBranch,
  filterText,
  isLoading,
  onSelectCommit,
  onCommitContextMenu,
}: TabViewsProps) {
  return (
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
        onSelect={onSelectCommit}
        onContextMenu={onCommitContextMenu}
        isLoading={isLoading}
      />
    </motion.div>
  );
}

function CommitWorkspaceView({ modifiedFiles, hasGithubUser }: TabViewsProps) {
  return (
    <motion.div
      key="commit-tab"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      <CommitTabView modifiedFiles={modifiedFiles} hasGithubUser={hasGithubUser} />
    </motion.div>
  );
}

function GraphTabView({ tabViews, graphView }: { tabViews: TabViewsProps; graphView: GraphViewProps }) {
  return (
    <div className={cn('flex-1 relative min-h-0', graphView.graphMode !== 'chronometric' && 'bg-bg-base')}>
      <AnimatePresence>
        {graphView.activeGraphMode === 'classic' && (
          <ClassicGraphView tabViews={tabViews} graphView={graphView} />
        )}
        {graphView.activeGraphMode === 'chronometric' && (
          <ChronometricGraphView tabViews={tabViews} graphView={graphView} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClassicGraphView({ tabViews, graphView }: { tabViews: TabViewsProps; graphView: GraphViewProps }) {
  return (
    <motion.div
      key="classic-graph"
      className={cn('absolute inset-0 flex flex-col', !graphView.isDragging && 'transition-[padding] duration-300')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{
        paddingTop: 96 + FLOATING_PANEL_INSET,
        paddingBottom: FLOATING_PANEL_INSET,
        paddingLeft: graphView.sidebarOpen ? graphView.sidebarW + FLOATING_PANEL_INSET + GRAPH_SAFE_GAP : FLOATING_PANEL_INSET,
        paddingRight: graphView.repositoryDetailsVisible ? graphView.detailsW + FLOATING_PANEL_INSET + GRAPH_SAFE_GAP : FLOATING_PANEL_INSET,
      }}
    >
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-overlay/60 backdrop-blur-md border border-text-primary/15 rounded-xl">
        <div className="sticky top-0 bg-bg-surface/75 border-b border-border-subtle/15 z-10 h-9 flex items-center text-[11px] text-text-secondary uppercase tracking-wider font-bold shrink-0">
          <div className="shrink-0 text-right pl-3 pr-3" style={{ width: graphView.graphColumns.refs }}>Branch / Tag</div>
          <GraphColumnHandle onMouseDown={(event) => graphView.beginGraphColDrag('refs', event)} />
          <div className="shrink-0 text-left px-2" style={{ width: graphView.graphColumns.graph }}>Graph</div>
          <GraphColumnHandle onMouseDown={(event) => graphView.beginGraphColDrag('graph', event)} />
          <div className="flex-1 flex items-center gap-2 pl-5">
            Commit message
            {graphView.enableCronometric && graphView.speculativeBranches.length > 0 && (
              <button
                onClick={() => {
                  graphView.onChangeGraphMode('chronometric');
                  if (!graphView.showSpeculative) graphView.onToggleSpeculative();
                }}
                className="text-[9px] normal-case px-2 py-0.5 rounded bg-[#5ed8ff]/10 text-[#5ed8ff] border border-[#5ed8ff]/30 hover:bg-[#5ed8ff]/20 transition-colors font-mono"
                title={`${graphView.speculativeBranches.length} ramas especulativas disponibles`}
              >
                {graphView.speculativeBranches.length} futuros →
              </button>
            )}
            {tabViews.filterText.trim() && (
              <span className="text-[10px] normal-case px-1.5 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30">
                filtro activo
              </span>
            )}
          </div>
          <GraphColumnHandle onMouseDown={(event) => graphView.beginGraphColDrag('date', event, -1)} />
          <div className="flex items-center pr-3 text-right shrink-0">
            <span className="pr-3" style={{ width: graphView.graphColumns.date }}>Date</span>
            <GraphColumnHandle onMouseDown={(event) => graphView.beginGraphColDrag('date', event)} />
            <span style={{ width: graphView.graphColumns.hash }}>Commit</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin relative">
          <AnimatePresence mode="wait">
            {!graphView.isStartupGraphReady ? (
              <GraphLoadingState keyName="classic-loading" label="Cargando graph..." />
            ) : tabViews.commits.length === 0 && tabViews.isLoading ? (
              <CommitsLoadingState keyName="classic-loading-commits" />
            ) : tabViews.commits.length > 0 ? (
              <motion.div
                key="classic-commits"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <CommitGraph
                  commits={tabViews.commits}
                  selectedHash={tabViews.selectedCommit?.hash}
                  selectedBranchName={graphView.selectedBranchName}
                  currentBranch={tabViews.currentBranch}
                  workingTreeFiles={tabViews.modifiedFiles}
                  filterText={tabViews.filterText}
                  columnWidths={graphView.graphColumns}
                  onSelect={tabViews.onSelectCommit}
                  onContextMenu={tabViews.onCommitContextMenu}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function ChronometricGraphView({ tabViews, graphView }: { tabViews: TabViewsProps; graphView: GraphViewProps }) {
  return (
    <motion.div
      key="chronometric-graph"
      className="absolute inset-0 flex flex-col overflow-visible"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <AnimatePresence mode="wait">
        {!graphView.isStartupGraphReady ? (
          <GraphLoadingState keyName="chrono-loading" label="Cargando graph..." />
        ) : tabViews.commits.length === 0 && tabViews.isLoading ? (
          <CommitsLoadingState keyName="chrono-loading-commits" />
        ) : tabViews.commits.length > 0 ? (
          <motion.div
            key="chrono-commits"
            className="absolute inset-0 flex flex-col overflow-visible"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <ChronometricGraph
              commits={tabViews.commits}
              selectedHash={tabViews.selectedCommit?.hash}
              selectedBranchName={graphView.selectedBranchName}
              selectedBranchFocusRequest={graphView.selectedBranchFocusRequest}
              currentBranch={tabViews.currentBranch}
              filterText={tabViews.filterText}
              onSelect={tabViews.onSelectCommit}
              onClearSelection={graphView.onClearGraphSelection}
              onContextMenu={tabViews.onCommitContextMenu}
              speculativeBranches={graphView.speculativeBranches}
              showSpeculative={graphView.showSpeculative}
              onToggleSpeculative={graphView.onToggleSpeculative}
              hudLeft={graphView.leftGraphSafe}
              hudRight={graphView.rightGraphSafe}
              localBranches={graphView.branches}
              isContextMenuOpen={graphView.isAnyContextMenuOpen}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function GraphLoadingState({ keyName, label }: { keyName: string; label: string }) {
  return (
    <motion.div
      key={keyName}
      className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary text-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Loader2 size={18} className="animate-spin mb-3 text-secondary" />
      <p>{label}</p>
    </motion.div>
  );
}

function CommitsLoadingState({ keyName }: { keyName: string }) {
  return (
    <motion.div
      key={keyName}
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-text-secondary text-sm">Cargando commits...</p>
    </motion.div>
  );
}
