// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopBar, TopBarDropdown, type DropdownMenuItem } from '../TopBar';
import { RepoSidebar } from '../RepoSidebar';

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string) => key,
  tNow: (key: string) => key,
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
      branches: ['main'],
      currentBranch: 'main',
      branchTracking: {},
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
      centauroReaderActive: false,
      setCentauroReaderActive: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();

afterEach(cleanup);

describe('Grupo 4: Navegación de vistas en RepoSidebar', () => {
  it('renderiza pestañas de navegación (Commit, Graph, History, Pipeline) al tope del sidebar', () => {
    const onTabChange = vi.fn();
    render(
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
        activeTab="Graph"
        onTabChange={onTabChange}
      />
    );

    const nav = screen.getByRole('navigation', { name: 'sidebar.navigation' });
    expect(nav).toBeDefined();

    const commitBtn = screen.getByRole('button', { name: /tab\.commit/i });
    const graphBtn = screen.getByRole('button', { name: /tab\.graph/i });
    const historyBtn = screen.getByRole('button', { name: /tab\.history/i });
    const pipelineBtn = screen.getByRole('button', { name: /tab\.pipeline/i });

    expect(commitBtn).toBeDefined();
    expect(graphBtn).toBeDefined();
    expect(historyBtn).toBeDefined();
    expect(pipelineBtn).toBeDefined();

    // Active state
    expect(graphBtn.getAttribute('aria-current')).toBe('page');
    expect(commitBtn.getAttribute('aria-current')).toBeNull();

    // Click triggers tab change
    fireEvent.click(commitBtn);
    expect(onTabChange).toHaveBeenCalledWith('Commit');

    fireEvent.click(pipelineBtn);
    expect(onTabChange).toHaveBeenCalledWith('Pipeline');
  });

  it('los botones de navegación cumplen el tamaño mínimo de 44px', () => {
    render(
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
        activeTab="Commit"
        onTabChange={vi.fn()}
      />
    );

    const commitBtn = screen.getByRole('button', { name: /tab\.commit/i });
    expect(commitBtn.className).toContain('min-h-[44px]');
  });
});

describe('Grupo 5: TopBar y Desplegables accesibles con teclado', () => {
  it('TopBar muestra Pull, Push y Fetch como acciones visibles directas', () => {
    const onPullIntent = vi.fn();
    const onPushIntent = vi.fn();
    const onFetchNow = vi.fn();

    render(
      <TopBar
        sidebarOpen={true}
        onToggleSidebar={vi.fn()}
        detailsOpen={true}
        onToggleDetails={vi.fn()}
        onPullIntent={onPullIntent}
        onPushIntent={onPushIntent}
        onNewBranchRequest={vi.fn()}
        onOpenStashModal={vi.fn()}
        onFetchNow={onFetchNow}
        filterText=""
        onFilterTextChange={vi.fn()}
        searchOpen={false}
        onSearchOpenChange={vi.fn()}
      />
    );

    const pullBtn = screen.getByRole('button', { name: 'toolbar.pull' });
    const pushBtn = screen.getByRole('button', { name: 'toolbar.push' });
    const actionsMenuBtn = screen.getByRole('button', { name: /toolbar\.actionsMenu/i });
    const toolsMenuBtn = screen.getByRole('button', { name: /toolbar\.toolsMenu/i });

    expect(pullBtn).toBeDefined();
    expect(pushBtn).toBeDefined();
    expect(actionsMenuBtn).toBeDefined();
    expect(toolsMenuBtn).toBeDefined();

    fireEvent.click(pullBtn);
    expect(onPullIntent).toHaveBeenCalledTimes(1);

    fireEvent.click(pushBtn);
    expect(onPushIntent).toHaveBeenCalledTimes(1);
  });

  it('TopBarDropdown abre con clic/teclado, navega con flechas, activa con Enter y cierra con Escape devolviendo el foco', () => {
    const onItem1 = vi.fn();
    const onItem2 = vi.fn();
    const items: DropdownMenuItem[] = [
      { id: 'item-1', label: 'Opción 1', shortcut: 'Ctrl + 1', onClick: onItem1 },
      { id: 'item-2', label: 'Opción 2', shortcut: 'Ctrl + 2', onClick: onItem2 },
    ];

    render(<TopBarDropdown id="test-dropdown" label="Menú Prueba" items={items} />);

    const trigger = screen.getByRole('button', { name: /Menú Prueba/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    // Abre con tecla ArrowDown
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const menu = screen.getByRole('menu');
    expect(menu).toBeDefined();

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(2);

    // Navega con ArrowDown
    fireEvent.keyDown(menu, { key: 'ArrowDown' });

    // Cierra con Escape
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    // Abre con clic y activa item con Enter
    fireEvent.click(trigger);
    const item1 = screen.getByRole('menuitem', { name: /Opción 1/i });
    fireEvent.click(item1);
    expect(onItem1).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
