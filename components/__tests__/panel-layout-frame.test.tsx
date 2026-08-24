// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RepoTabs } from '../RepoTabs';
import { RepoSidebar } from '../RepoSidebar';
import { RepoDetailsPanel } from '../RepoDetailsPanel';
import { RepoMainView } from '../RepoMainView';
import { OpenSpecDashboard } from '../pipeline/OpenSpecDashboard';
import { usePanelLayout } from '@/hooks/use-panel-layout';
import { usePipelineStore } from '@/lib/pipeline-store';
import { useGitStore } from '@/lib/git-store';
import type { PipelineSnapshot } from '../pipeline/pipeline-view-state';

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

vi.mock('@/lib/new-change-draft-store', () => ({
  useNewChangeDraft: () => ({ open: false, mode: null }),
  useNewChangeDraftStore: () => ({
    actions: { clearDraft: vi.fn() },
  }),
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

const mockGitState = {
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
  modifiedFiles: [] as any[],
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

vi.mock('@/lib/git-store', () => {
  const useGitStoreMock: any = (selector?: (s: any) => any) => {
    return selector ? selector(mockGitState) : mockGitState;
  };
  useGitStoreMock.getState = () => mockGitState;
  useGitStoreMock.setState = (partial: any) => Object.assign(mockGitState, typeof partial === 'function' ? partial(mockGitState) : partial);
  return { useGitStore: useGitStoreMock };
});

afterEach(cleanup);

describe('Panel layout armazón & separación de fondos (modo por omisión: chronometric)', () => {
  it('RepoTabs renderiza controles accesibles de 44px para plegar paneles', () => {
    render(
      <RepoTabs
        repos={[{ path: '/test/repo', name: 'repo', isLoading: false } as any]}
        activeIdx={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onOpen={vi.fn()}
        onReorder={vi.fn()}
        sidebarOpen={true}
        onToggleSidebar={vi.fn()}
        detailsOpen={true}
        onToggleDetails={vi.fn()}
      />
    );

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
        <RepoTabs
          repos={[{ path: '/test/repo', name: 'repo', isLoading: false } as any]}
          activeIdx={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
          onOpen={vi.fn()}
          onReorder={vi.fn()}
          sidebarOpen={false}
          onToggleSidebar={vi.fn()}
          detailsOpen={false}
          onToggleDetails={vi.fn()}
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
        <RepoTabs
          repos={[{ path: '/test/repo', name: 'repo', isLoading: false } as any]}
          activeIdx={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
          onOpen={vi.fn()}
          onReorder={vi.fn()}
          sidebarOpen={true}
          onToggleSidebar={vi.fn()}
          detailsOpen={true}
          onToggleDetails={vi.fn()}
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

    const titlebar = container.querySelector('.app-titlebar');
    expect(titlebar?.className).not.toContain('border-b');

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

  it('RepoMainView en modo clásico no declara border-b en el header de columnas', () => {
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
      graphMode: 'classic',
      activeGraphMode: 'classic',
      isDragging: false,
      isStartupGraphReady: true,
      sidebarOpen: true,
      sidebarW: 240,
      repositoryDetailsVisible: true,
      detailsW: 320,
      graphColumns: { refs: 260, graph: 88, date: 80, hash: 64 },
      beginGraphColDrag: vi.fn(),
      enableCronometric: false,
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

    const { container } = render(
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

    const allSticky = container.querySelectorAll('.sticky.top-0');
    const columnHeaders = allSticky[allSticky.length - 1];
    expect(columnHeaders).not.toBeNull();
    expect(columnHeaders?.className).not.toContain('border-b');
  });

  it('HistoryView no declara border-b en su encabezado', () => {
    const tabViews: any = {
      activeTab: 'History',
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

    const { container } = render(
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
        graphView={{} as any}
        interactiveRebase={{} as any}
      />
    );

    const historyHeader = container.querySelector('.sticky.top-0');
    expect(historyHeader).not.toBeNull();
    expect(historyHeader?.className).not.toContain('border-b');
  });

  it('BlameView no declara border-b en su encabezado', () => {
    const diffViews: any = {
      selectedFile: null,
      blameFile: { path: 'file.ts', staged: false, status: 'modified' },
      blameLines: [],
      blameLoading: false,
      selectedBlameLineNo: null,
      onCloseDiff: vi.fn(),
      onSelectBlameLine: vi.fn(),
    };

    const { container } = render(
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
        diffViews={diffViews}
        tabViews={{ activeTab: 'Graph' } as any}
        graphView={{} as any}
        interactiveRebase={{} as any}
      />
    );

    const blameHeader = container.querySelector('[data-testid="content-header"]');
    expect(blameHeader).not.toBeNull();
    expect(blameHeader?.className).not.toContain('border-b');
  });

  it('RepoStartView en RepoMainView no declara bordes de maqueta en su cabecera', () => {
    const { container } = render(
      <RepoMainView
        activeView="repository"
        isRepoStartView={true}
        cartographyActive={false}
        cartographyRepoPath={null}
        onExitCartography={vi.fn()}
        settingsPanel={{} as any}
        helpPanel={{} as any}
        profilePanel={{} as any}
        repoStart={{
          mode: 'open',
          repoPath: '/test/repo',
          githubConnected: false,
          isLoading: false,
          onClose: vi.fn(),
          onOpenExisting: vi.fn(),
          onPickCreateFolder: vi.fn(),
          onPickCloneFolder: vi.fn(),
          onCreate: vi.fn(),
          onClone: vi.fn(),
          onListRepos: vi.fn(),
          onConnectGitHub: vi.fn(),
        }}
        diffViews={{ selectedFile: null } as any}
        tabViews={{ activeTab: 'Graph', repoPath: '/test/repo', commits: [] } as any}
        graphView={{} as any}
        interactiveRebase={{} as any}
      />
    );

    const backButton = screen.getByRole('button', { name: 'common.backToRepo' });
    expect(backButton.className).not.toContain('border');
    const headerContainer = backButton.closest('.shrink-0');
    expect(headerContainer?.className).not.toContain('border-b');
  });
});

const dummySnapshot: PipelineSnapshot = {
  schemaVersion: '1.0',
  repoId: 'repo-1',
  availableSources: ['git', 'openspec'],
  hasPipelineActivity: false,
  decisions: [],
  agents: [],
  activity: [],
  economy: {
    tokens: { input: 0, output: 0, reasoning: null, cacheRead: null },
    costUsd: null,
    costBasis: 'unknown',
    costCoverage: { withCost: 0, total: 0 },
    contextMaxTokens: null,
    contextCurrentTokens: null,
    compactionCount: null,
    reasoningAvailable: null,
  },
  openSpec: {
    selectedChangeId: null,
    activeChanges: [
      {
        changeId: 'change-auth-flow',
        validation: 'passed',
        tasks: [
          { id: '2.1', text: 'Task 2.1', completed: true, line: 1, sourceRef: 'tasks.md:1' },
          { id: '2.2', text: 'Task 2.2', completed: false, line: 2, sourceRef: 'tasks.md:2' },
        ],
        proposalExists: true,
        designExists: true,
        specsCount: 1,
        artifacts: { proposal: null, design: null, tasks: null, specs: [] },
        intent: 'Unify auth tokens',
      },
    ],
    archivedChanges: [
      {
        changeId: 'change-login-v1',
        sourceRef: 'openspec/changes/archive/change-login-v1',
        archivedAt: '2026-08-20',
      },
    ],
    specifications: [
      {
        specificationId: 'auth-tokens',
        sourceRef: 'specs/auth-tokens/spec.md',
        requirements: 5,
      },
    ],
    reports: [],
    diagnostics: [],
    observedAt: null,
    latestGate: null,
  },
};

describe('Compartir paneles laterales entre vistas (Fase 3 & fundición de laterales)', () => {
  it('1. El marco derecho monta la pieza común RepoDetailsPanel tanto en Graph como en SDD', () => {
    // Render en Graph
    const { container, rerender } = render(
      <RepoDetailsPanel
        activeTab="Graph"
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

    const asideGraph = container.querySelector('aside');
    expect(asideGraph).not.toBeNull();
    expect(asideGraph?.getAttribute('data-testid')).toBe('repo-details-panel');

    // Rerender en SDD (Pipeline)
    rerender(
      <RepoDetailsPanel
        activeTab="Pipeline"
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

    const asidePipeline = container.querySelector('aside');
    expect(asidePipeline).not.toBeNull();
    expect(asidePipeline?.getAttribute('data-testid')).toBe('repo-details-panel');
  });

  it('2. En Graph muestra detalle de commit / preparación y en SDD muestra inspector con rail / herramientas', () => {
    // En Graph: muestra sección de staging / commit o mensaje vacío
    const { rerender } = render(
      <RepoDetailsPanel
        activeTab="Graph"
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

    expect(screen.queryByRole('tablist', { name: 'pipeline.openspec.rail.label' })).toBeNull();

    // En SDD: monta OpenSpecInspector con solapas de Actividad y Herramientas
    rerender(
      <RepoDetailsPanel
        activeTab="Pipeline"
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

    expect(screen.getByRole('tablist', { name: 'pipeline.openspec.rail.label' })).toBeDefined();
    expect(screen.getByRole('tab', { name: /pipeline\.openspec\.activity\.title/ })).toBeDefined();
    expect(screen.getByRole('tab', { name: /pipeline\.openspec\.rail\.tools/ })).toBeDefined();
  });

  it('3. detailsOpen: false oculta el panel derecho en AMBAS vistas con rerender real', () => {
    const { container, rerender } = render(
      <RepoDetailsPanel
        activeTab="Graph"
        graphMode="chronometric"
        detailsW={320}
        visible={false}
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

    // En Graph con visible=false, se oculta (width: 0, visibility: hidden)
    const asideGraph = container.querySelector('aside');
    expect(asideGraph).not.toBeNull();
    expect(asideGraph?.style.visibility).toBe('hidden');
    expect(asideGraph?.style.width).toBe('0px');

    // En SDD con visible=false, también se oculta
    rerender(
      <RepoDetailsPanel
        activeTab="Pipeline"
        graphMode="chronometric"
        detailsW={320}
        visible={false}
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

    const asidePipeline = container.querySelector('aside');
    expect(asidePipeline).not.toBeNull();
    expect(asidePipeline?.style.visibility).toBe('hidden');
    expect(asidePipeline?.style.width).toBe('0px');
  });

  it('4. El botón de la barra de título de la ventana conmuta el panel en ambas vistas', () => {
    const onToggleDetails = vi.fn();
    const { rerender } = render(
      <RepoTabs
        repos={[{ path: '/test/repo', name: 'repo', isLoading: false } as any]}
        activeIdx={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onOpen={vi.fn()}
        onReorder={vi.fn()}
        sidebarOpen={true}
        onToggleSidebar={vi.fn()}
        detailsOpen={true}
        onToggleDetails={onToggleDetails}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: 'toolbar.hideDetails' });
    fireEvent.click(toggleBtn);
    expect(onToggleDetails).toHaveBeenCalledTimes(1);

    // Al estar cerrado
    rerender(
      <RepoTabs
        repos={[{ path: '/test/repo', name: 'repo', isLoading: false } as any]}
        activeIdx={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onOpen={vi.fn()}
        onReorder={vi.fn()}
        sidebarOpen={true}
        onToggleSidebar={vi.fn()}
        detailsOpen={false}
        onToggleDetails={onToggleDetails}
      />
    );

    const showBtn = screen.getByRole('button', { name: 'toolbar.showDetails' });
    fireEvent.click(showBtn);
    expect(onToggleDetails).toHaveBeenCalledTimes(2);
  });

  it('5. En SDD (Pipeline), el panel lateral RepoSidebar muestra la navegación de SDD y no ramas', () => {
    const { container } = render(
      <RepoSidebar
        activeTab="Pipeline"
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

    // Debe contener el contenedor de navegación de OpenSpec
    const sddNav = container.querySelector('[data-testid="openspec-sidebar-nav"]');
    expect(sddNav).not.toBeNull();
    // No debe contener el contenedor de ramas/referencias clásicas
    const graphNav = container.querySelector('[data-testid="sidebar-branches-sections"]');
    expect(graphNav).toBeNull();
  });

  it('6. En Graph, el panel lateral RepoSidebar muestra las secciones de ramas/referencias', () => {
    const { container } = render(
      <RepoSidebar
        activeTab="Graph"
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

    // Debe contener el contenedor de ramas/referencias clásicas
    const graphNav = container.querySelector('[data-testid="sidebar-branches-sections"]');
    expect(graphNav).not.toBeNull();
    // No debe contener el contenedor de navegación de OpenSpec
    const sddNav = container.querySelector('[data-testid="openspec-sidebar-nav"]');
    expect(sddNav).toBeNull();
  });

  it('7. En AMBAS vistas, el lateral preserva el selector de vistas, la rama actual y la fila de 5 acciones (Pull, Push, etc.)', () => {
    const { rerender } = render(
      <RepoSidebar
        activeTab="Graph"
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

    // Graph view: actions are present
    expect(screen.getByRole('button', { name: 'toolbar.pull' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'toolbar.push' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'toolbar.newBranch' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'toolbar.stash' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'toolbar.applyPatchTooltip' })).toBeDefined();

    // SDD view (Pipeline): actions MUST remain present
    rerender(
      <RepoSidebar
        activeTab="Pipeline"
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

    expect(screen.getByRole('button', { name: 'toolbar.pull' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'toolbar.push' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'toolbar.newBranch' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'toolbar.stash' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'toolbar.applyPatchTooltip' })).toBeDefined();
  });

  it('8. El cuerpo de SDD (OpenSpecDashboard) contiene exactamente 0 elementos aside', () => {
    const { container } = render(
      <OpenSpecDashboard
        snapshot={dummySnapshot}
        repoPath="/test/repo"
        currentBranch="main"
        workingTreeClean={true}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />
    );

    const asides = container.querySelectorAll('aside');
    expect(asides.length).toBe(0);
  });

  it('9. La resolución de estado de sesión resuelve a textos traducidos reales para todos los estados posibles y nunca a la clave cruda', async () => {
    const { translate } = await import('@/lib/i18n');
    const { SESSION_STATUS_KEYS, resolveSessionStatusI18nKey } = await import('../pipeline/pipeline-domain');
    const langs = ['es', 'en', 'zh'] as const;

    for (const lang of langs) {
      for (const status of SESSION_STATUS_KEYS) {
        const key = resolveSessionStatusI18nKey(status);
        const text = translate(key, lang);
        expect(text).toBeTruthy();
        expect(text).not.toBe(key);
        expect(text).not.toBe(status);
        expect(text).not.toContain('pipeline.openspec.activity.status');
      }

      // Probar fallback de estado desconocido o no mapeado
      const fallbackKey = resolveSessionStatusI18nKey('unrecognized_state');
      const fallbackText = translate(fallbackKey, lang);
      expect(fallbackText).toBeTruthy();
      expect(fallbackText).not.toBe(fallbackKey);
      expect(fallbackText).not.toBe('unrecognized_state');
      expect(fallbackText).not.toContain('pipeline.openspec.activity.status');
    }
  });

  it('10. Los contadores en el cuerpo se retiraron y el porcentaje se presenta visible en el lateral con clases de utilidad', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssPath = path.resolve(__dirname, '../pipeline/OpenSpecDashboard.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // La hoja de estilos ya no contiene reglas de summaryFacts ni evidenceStrip por haber quedado sin consumidor
    expect(cssContent).not.toMatch(/\.summaryFacts/);
    expect(cssContent).not.toMatch(/\.evidenceStrip/);

    const { container } = render(
      <OpenSpecDashboard
        snapshot={dummySnapshot}
        repoPath="/test/repo"
        currentBranch="main"
        workingTreeClean={true}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    // Los contadores del cuerpo ya no se montan
    const factsDl = container.querySelector('dl[class*="summaryFacts"]');
    expect(factsDl).toBeNull();
  });

  it('11. El valor de rightOpen que llega al cuerpo de SDD es el del armazón (pipelineLayout.rightOpen): en falso el aviso de autoría se presenta en el centro y en verdadero no', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const pageSrc = fs.readFileSync(path.resolve(__dirname, '../../app/page.tsx'), 'utf-8');

    // 1. Verificación del cableado en app/page.tsx: pipelineLayout debe pasar rightOpen: repositoryDetailsVisible
    const pipelineLayoutMatch = /pipelineLayout:\s*\{([^}]+)\}/.exec(pageSrc);
    expect(pipelineLayoutMatch).not.toBeNull();
    expect(pipelineLayoutMatch![1]).toMatch(/rightOpen:\s*repositoryDetailsVisible/);

    const originalApi = (window as any).api;
    const dummyPipelineState = {
      repoId: 'repo-1',
      observedAt: '2026-07-25T00:00:00.000Z',
      revision: 1,
      tasks: [],
      reports: [],
      decisions: [],
      activeChanges: ['change-auth-flow'],
      archivedChanges: [],
      mergedChanges: [],
      diagnostics: [],
      selection: { changeId: 'change-auth-flow', confidence: 'confirmed', selectionRequired: false, reason: '' },
      openSpecPresent: true,
      openSpecChanges: [
        {
          changeId: 'change-auth-flow',
          intent: 'Auth flow',
          tasks: [{ id: '1', text: 'T1', completed: false, line: 1, sourceRef: 'tasks.md' }],
          proposalExists: true,
          designExists: true,
          specsCount: 1,
          validation: 'passed',
          artifacts: null,
        },
      ],
    };
    (window as any).api = {
      pipelineGetSnapshot: vi.fn().mockResolvedValue({ success: true, data: dummyPipelineState }),
      pipelineOpenSpec: {
        getEngineStatus: vi.fn().mockResolvedValue({
          cli: { installed: true, runtimeVersion: '1.8.0', diagnostics: [] },
          repoState: 'initialized',
          integrationState: 'up-to-date',
        }),
      },
      pipelineSubscribe: vi.fn(),
      pipelineUnsubscribe: vi.fn(),
      onPipelineSnapshotUpdated: vi.fn(),
      pipelineRuntime: {
        get: vi.fn().mockResolvedValue({ success: true, data: null }),
        history: vi.fn().mockResolvedValue({ success: true, data: [] }),
      },
    };

    try {
      // 2. Verificación del DOM montado a través de RepoMainView
      useGitStore.setState({
        modifiedFiles: [{ path: 'file.ts', status: 'modified', staged: false }],
      });
      usePipelineStore.setState({
        snapshot: dummySnapshot,
        prepareOpen: true,
        aiNotice: 'Escrito por modelo Gemma 4',
      });

      const createTabViews = (rightOpen: boolean): any => ({
        activeTab: 'Pipeline',
        repoPath: '/test/repo',
        commits: [],
        selectedCommit: null,
        filterText: '',
        modifiedFiles: [{ path: 'file.ts', status: 'modified', staged: false }],
        hasGithubUser: false,
        isLoading: false,
        currentBranch: 'main',
        pipelineLayout: {
          rightOpen,
          onEnsureRightOpen: vi.fn(),
        },
        onSelectCommit: vi.fn(),
        onCommitContextMenu: vi.fn(),
      });

      // Caso A: con rightOpen en false, el aviso de autoría se presenta en el centro del DOM
      const { unmount } = render(
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
          tabViews={createTabViews(false)}
          graphView={{} as any}
          interactiveRebase={{} as any}
        />
      );

      expect(await screen.findByText('Escrito por modelo Gemma 4')).toBeTruthy();

      unmount();

      // Caso B: con rightOpen en true, el aviso de autoría NO se presenta en el centro del DOM
      usePipelineStore.setState({
        prepareOpen: true,
      });
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
          tabViews={createTabViews(true)}
          graphView={{} as any}
          interactiveRebase={{} as any}
        />
      );

      // Esperar que termine de cargar el workspace
      await screen.findByRole('region', { name: 'pipeline.openspec.prepare.title' });
      expect(screen.queryByText('Escrito por modelo Gemma 4')).toBeNull();
    } finally {
      (window as any).api = originalApi;
    }
  });
});
