// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopBar } from '../TopBar';
import { RepoSidebar } from '../RepoSidebar';
import { RepoDetailsPanel } from '../RepoDetailsPanel';
import { RepoMainView } from '../RepoMainView';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="mock-dynamic-component" />,
}));

vi.mock('@/components/ChronometricGraph', () => ({
  ChronometricGraph: () => <div data-testid="mock-chronometric-graph" />,
}));

vi.mock('@/components/CommitGraph', () => ({
  CommitGraph: () => <div data-testid="mock-commit-graph" />,
}));

vi.mock('@/components/pipeline/PipelineWorkspace', () => ({
  PipelineWorkspace: () => <div data-testid="mock-pipeline-workspace" />,
}));

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/hooks/use-git-actions', () => ({
  useGitActions: () => ({
    applyPatchFile: vi.fn(),
    openTerminal: vi.fn(),
    stashApply: vi.fn(),
    stashPop: vi.fn(),
    stashDrop: vi.fn(),
    stashClear: vi.fn(),
    pushTag: vi.fn(),
  }),
}));

vi.mock('@/lib/git-store', () => ({
  useGitStore: (selector?: (s: any) => any) => {
    const state = {
      repoPath: '/test/repo',
      isLoading: false,
      branches: [],
      remoteBranches: [],
      remotes: [],
      tags: [],
      stashes: [],
      pullRequests: [],
      worktrees: [],
      submodules: [],
      modifiedFiles: [],
      commitMessage: '',
      setCommitMessage: vi.fn(),
      isAIGeneratingMessage: false,
      generateAICommitMessage: vi.fn(),
      abortAIGeneration: vi.fn(),
      githubUser: null,
      enableCartography: false,
      getActiveRepo: () => null,
      openRepos: [],
      activeRepoIdx: 0,
      isFetchingRemote: false,
      lastFetchTime: null,
      autoFetchEnabled: false,
    };
    return selector ? selector(state) : state;
  },
}));

afterEach(cleanup);

describe('Panel layout armazón & separación de fondos (modo por omisión: chronometric)', () => {
  it('TopBar renderiza como barra continua con fondo bg-bg-surface y controles accesibles de 44px', () => {
    render(
      <TopBar
        graphMode="chronometric"
        sidebarOpen={true}
        onToggleSidebar={vi.fn()}
        detailsOpen={true}
        onToggleDetails={vi.fn()}
        activeTab="Graph"
        onTabChange={vi.fn()}
        onPullIntent={vi.fn()}
        onPushIntent={vi.fn()}
        onNewBranchRequest={vi.fn()}
        onOpenStashModal={vi.fn()}
        onFetchNow={vi.fn()}
        showGraphModeSwitch={false}
        activeGraphMode="chronometric"
        onChangeGraphMode={vi.fn()}
        updateStatus="idle"
        updateInfo={null}
        downloadProgress={0}
        showUpdateMenu={false}
        setShowUpdateMenu={vi.fn()}
        updateMenuRef={{ current: null }}
        onCheckForUpdate={vi.fn()}
        onDownloadUpdate={vi.fn()}
        onInstallUpdate={vi.fn()}
        filterText=""
        onFilterTextChange={vi.fn()}
        searchOpen={false}
        onSearchOpenChange={vi.fn()}
      />
    );

    const header = screen.getByRole('banner');
    expect(header.className).toContain('bg-bg-surface');
    expect(header.className).not.toContain('backdrop-blur');
    expect(header.className).not.toContain('rounded-b-2xl');

    const sidebarToggle = screen.getByRole('button', { name: 'toolbar.hideSidebar' });
    expect(sidebarToggle.className).toContain('min-h-[44px]');
    expect(sidebarToggle.className).toContain('min-w-[44px]');

    const detailsToggle = screen.getByRole('button', { name: 'toolbar.hideDetails' });
    expect(detailsToggle.className).toContain('min-h-[44px]');
    expect(detailsToggle.className).toContain('min-w-[44px]');
  });

  it('RepoSidebar utiliza bg-bg-surface continuo en modo cronométrico sin flotar ni radio propio', () => {
    const { container } = render(
      <RepoSidebar
        graphMode="chronometric"
        sidebarW={280}
        sidebarOpen={true}
        isDragging={false}
        onResizeStart={vi.fn()}
        activeView="repository"
        onViewChange={vi.fn()}
        isRepoStartView={false}
        repoStartMode="open"
        onRepoStartModeChange={vi.fn()}
        onCloseRepoChooser={vi.fn()}
        selectedBranchName="main"
        onCheckoutAttempt={vi.fn()}
        onSelectBranchInGraph={vi.fn()}
        onBranchContextMenu={vi.fn()}
        onRemoteBranchContextMenu={vi.fn()}
        onDeleteBranchRequest={vi.fn()}
        selectedPullRequest={null}
        onSelectPullRequest={vi.fn()}
        onPreviewStash={vi.fn()}
        onCreateTagRequest={vi.fn()}
        onDeleteTagRequest={vi.fn()}
        selectedSettingsSection="general"
        onSettingsSectionChange={vi.fn()}
        selectedHelpSection="general"
        onHelpSectionChange={vi.fn()}
        onToggleCartography={vi.fn()}
        onAddRemoteRequest={vi.fn()}
        onRenameRemoteRequest={vi.fn()}
        onSetRemoteUrlRequest={vi.fn()}
        onDeleteRemoteRequest={vi.fn()}
        onAddWorktreeRequest={vi.fn()}
        onDeleteWorktreeRequest={vi.fn()}
        onAddSubmoduleRequest={vi.fn()}
        onUpdateSubmodule={vi.fn()}
        onSyncSubmodules={vi.fn()}
      />
    );

    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.className).toContain('bg-bg-surface');
    expect(aside?.className).toContain('relative');
    expect(aside?.className).not.toContain('absolute');
    expect(aside?.className).not.toContain('backdrop-blur');
    expect(aside?.className).not.toContain('rounded-xl');
  });

  it('RepoDetailsPanel utiliza bg-bg-surface continuo en modo cronométrico sin flotar ni radio propio', () => {
    const { container } = render(
      <RepoDetailsPanel
        graphMode="chronometric"
        detailsW={320}
        visible={true}
        isDragging={false}
        onResizeStart={vi.fn()}
        onOpenStashModal={vi.fn()}
        onOpenCommitFile={vi.fn()}
        onSelectFile={vi.fn()}
        onDiscardRequest={vi.fn()}
        onRequestAmend={vi.fn()}
        onRequestSquash={vi.fn()}
        onFileContextMenu={vi.fn()}
        onRequestResetAll={vi.fn()}
        onRequestCleanUntracked={vi.fn()}
      />
    );

    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.className).toContain('bg-bg-surface');
    expect(aside?.className).toContain('relative');
    expect(aside?.className).not.toContain('absolute');
    expect(aside?.className).not.toContain('backdrop-blur');
    expect(aside?.className).not.toContain('rounded-xl');
  });

  it('ocultar el panel lateral conserva la composición de armazón y esquina redondeada en modo cronométrico', () => {
    const { container } = render(
      <div className="flex flex-col h-screen bg-bg-surface">
        <TopBar
          graphMode="chronometric"
          sidebarOpen={false}
          onToggleSidebar={vi.fn()}
          detailsOpen={false}
          onToggleDetails={vi.fn()}
          activeTab="Commit"
          onTabChange={vi.fn()}
          onPullIntent={vi.fn()}
          onPushIntent={vi.fn()}
          onNewBranchRequest={vi.fn()}
          onOpenStashModal={vi.fn()}
          onFetchNow={vi.fn()}
          showGraphModeSwitch={false}
          activeGraphMode="chronometric"
          onChangeGraphMode={vi.fn()}
          updateStatus="idle"
          updateInfo={null}
          downloadProgress={0}
          showUpdateMenu={false}
          setShowUpdateMenu={vi.fn()}
          updateMenuRef={{ current: null }}
          onCheckForUpdate={vi.fn()}
          onDownloadUpdate={vi.fn()}
          onInstallUpdate={vi.fn()}
          filterText=""
          onFilterTextChange={vi.fn()}
          searchOpen={false}
          onSearchOpenChange={vi.fn()}
        />
        <div className="flex-1 flex overflow-hidden relative">
          <main className="relative flex-1 min-h-0 bg-bg-base rounded-tl-xl rounded-tr-xl">
            <div data-testid="content">Contenido</div>
          </main>
        </div>
      </div>
    );

    const sidebarToggle = screen.getByRole('button', { name: 'toolbar.showSidebar' });
    expect(sidebarToggle.getAttribute('aria-pressed')).toBe('false');

    const main = container.querySelector('main');
    expect(main?.className).toContain('bg-bg-base');
    expect(main?.className).toContain('rounded-tl-xl');
    expect(main?.className).toContain('rounded-tr-xl');
    expect(main?.className).not.toContain('border-t');
  });

  it('los componentes del armazón no declaran líneas de borde de maqueta', () => {
    const { container } = render(
      <div className="flex flex-col h-screen bg-bg-surface">
        <TopBar
          graphMode="chronometric"
          sidebarOpen={true}
          onToggleSidebar={vi.fn()}
          detailsOpen={true}
          onToggleDetails={vi.fn()}
          activeTab="Graph"
          onTabChange={vi.fn()}
          onPullIntent={vi.fn()}
          onPushIntent={vi.fn()}
          onNewBranchRequest={vi.fn()}
          onOpenStashModal={vi.fn()}
          onFetchNow={vi.fn()}
          showGraphModeSwitch={true}
          activeGraphMode="chronometric"
          onChangeGraphMode={vi.fn()}
          updateStatus="idle"
          updateInfo={null}
          downloadProgress={0}
          showUpdateMenu={false}
          setShowUpdateMenu={vi.fn()}
          updateMenuRef={{ current: null }}
          onCheckForUpdate={vi.fn()}
          onDownloadUpdate={vi.fn()}
          onInstallUpdate={vi.fn()}
          filterText=""
          onFilterTextChange={vi.fn()}
          searchOpen={false}
          onSearchOpenChange={vi.fn()}
        />
        <div className="flex-1 flex overflow-hidden relative">
          <RepoSidebar
            graphMode="chronometric"
            sidebarW={280}
            sidebarOpen={true}
            isDragging={false}
            onResizeStart={vi.fn()}
            activeView="repository"
            onViewChange={vi.fn()}
            isRepoStartView={false}
            repoStartMode="open"
            onRepoStartModeChange={vi.fn()}
            onCloseRepoChooser={vi.fn()}
            selectedBranchName="main"
            onCheckoutAttempt={vi.fn()}
            onSelectBranchInGraph={vi.fn()}
            onBranchContextMenu={vi.fn()}
            onRemoteBranchContextMenu={vi.fn()}
            onDeleteBranchRequest={vi.fn()}
            selectedPullRequest={null}
            onSelectPullRequest={vi.fn()}
            onPreviewStash={vi.fn()}
            onCreateTagRequest={vi.fn()}
            onDeleteTagRequest={vi.fn()}
            selectedSettingsSection="general"
            onSettingsSectionChange={vi.fn()}
            selectedHelpSection="general"
            onHelpSectionChange={vi.fn()}
            onToggleCartography={vi.fn()}
            onAddRemoteRequest={vi.fn()}
            onRenameRemoteRequest={vi.fn()}
            onSetRemoteUrlRequest={vi.fn()}
            onDeleteRemoteRequest={vi.fn()}
            onAddWorktreeRequest={vi.fn()}
            onDeleteWorktreeRequest={vi.fn()}
            onAddSubmoduleRequest={vi.fn()}
            onUpdateSubmodule={vi.fn()}
            onSyncSubmodules={vi.fn()}
          />
          <main className="relative flex-1 min-h-0 bg-bg-base rounded-tl-xl rounded-tr-xl">
            <div data-testid="content">Contenido</div>
          </main>
          <RepoDetailsPanel
            graphMode="chronometric"
            detailsW={320}
            visible={true}
            isDragging={false}
            onResizeStart={vi.fn()}
            onOpenStashModal={vi.fn()}
            onOpenCommitFile={vi.fn()}
            onSelectFile={vi.fn()}
            onDiscardRequest={vi.fn()}
            onRequestAmend={vi.fn()}
            onRequestSquash={vi.fn()}
            onFileContextMenu={vi.fn()}
            onRequestResetAll={vi.fn()}
            onRequestCleanUntracked={vi.fn()}
          />
        </div>
      </div>
    );

    const header = container.querySelector('header');
    expect(header?.className).not.toContain('border-b');

    const asides = container.querySelectorAll('aside');
    expect(asides.length).toBe(2);
    expect(asides[0].className).not.toContain('border-r');
    expect(asides[1].className).not.toContain('border-l');

    const main = container.querySelector('main');
    expect(main?.className).not.toContain('border-t');
  });

  it('el contenedor del grafo en RepoMainView lleva bg-bg-base en modo cronométrico', () => {
    const tabViews: any = {
      activeTab: 'Graph',
      repoPath: '/test/repo',
      commits: [],
      selectedCommit: null,
      filterText: '',
      modifiedFiles: [],
      hasGithubUser: false,
      isLoading: false,
      pipelineLayout: {
        leftOpen: true,
        rightOpen: true,
        leftWidth: 240,
        rightWidth: 320,
        onResizeLeft: vi.fn(),
        onResizeRight: vi.fn(),
      },
      onSelectCommit: vi.fn(),
      onCommitContextMenu: vi.fn(),
    };

    const graphView: any = {
      graphMode: 'chronometric',
      activeGraphMode: 'chronometric',
      isDragging: false,
      isStartupGraphReady: true,
      sidebarOpen: true,
      sidebarW: 240,
      repositoryDetailsVisible: true,
      detailsW: 320,
      graphColumns: { refs: 260, graph: 88, date: 80, hash: 64 },
      beginGraphColDrag: vi.fn(),
      enableCronometric: true,
      speculativeBranches: [],
      selectedBranchName: null,
      selectedBranchFocusRequest: 0,
      showSpeculative: false,
      leftGraphSafe: 0,
      rightGraphSafe: 0,
      branches: [],
      isAnyContextMenuOpen: false,
      onChangeGraphMode: vi.fn(),
      onToggleSpeculative: vi.fn(),
      onClearGraphSelection: vi.fn(),
    };

    render(
      <RepoMainView
        activeView="repository"
        isRepoStartView={false}
        cartographyActive={false}
        cartographyRepoPath={null}
        onExitCartography={vi.fn()}
        settingsPanel={{} as any}
        helpPanel={{} as any}
        profilePanel={{} as any}
        repoStart={{} as any}
        diffViews={{ selectedFile: null } as any}
        tabViews={tabViews}
        graphView={graphView}
        interactiveRebase={{} as any}
      />
    );

    const graphContainer = screen.getByTestId('graph-tab-container');
    expect(graphContainer).not.toBeNull();
    expect(graphContainer.className).toContain('bg-bg-base');
  });
});
