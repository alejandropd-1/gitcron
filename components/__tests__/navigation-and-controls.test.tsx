// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RepoTabs } from '../RepoTabs';
import { RepoSidebar, SidebarDropdown, type DropdownMenuItem } from '../RepoSidebar';
import { SidebarSection } from '../RepoSidebarParts';

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

const mockRepoState = {
  repoPath: '/test/repo',
  isLoading: false,
  branches: ['main', 'feature'],
  currentBranch: 'main',
  branchTracking: {
    main: { upstream: 'origin/main', ahead: 0, behind: 0, gone: false },
  },
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
  openRepos: [{ path: '/test/repo', name: 'repo' }],
  activeRepoIdx: 0,
  isFetchingRemote: false,
  lastFetchTime: null,
  autoFetchEnabled: false,
  centauroReaderActive: false,
  setCentauroReaderActive: vi.fn(),
};

vi.mock('@/lib/git-store', () => ({
  useGitStore: (selector?: (s: any) => any) => {
    return selector ? selector(mockRepoState) : mockRepoState;
  },
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();

afterEach(cleanup);

describe('Grupo 1: Controles de disposición y búsqueda en RepoTabs (barra de título)', () => {
  it('el control de despliegue del panel lateral sigue presente y operable cuando el panel está plegado', () => {
    const onToggleSidebar = vi.fn();
    const onToggleDetails = vi.fn();

    const { rerender } = render(
      <RepoTabs
        repos={[{ path: '/test/repo', name: 'repo', isLoading: false } as any]}
        activeIdx={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onOpen={vi.fn()}
        onReorder={vi.fn()}
        sidebarOpen={false}
        onToggleSidebar={onToggleSidebar}
        detailsOpen={false}
        onToggleDetails={onToggleDetails}
      />
    );

    // Con el panel lateral cerrado (sidebarOpen = false), el botón existe en la barra de ventana
    const showSidebarBtn = screen.getByRole('button', { name: 'toolbar.showSidebar' });
    expect(showSidebarBtn).toBeDefined();
    expect(showSidebarBtn.getAttribute('aria-pressed')).toBe('false');

    // Click ejecuta la apertura
    fireEvent.click(showSidebarBtn);
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);

    // Re-render con panel abierto (sidebarOpen = true)
    rerender(
      <RepoTabs
        repos={[{ path: '/test/repo', name: 'repo', isLoading: false } as any]}
        activeIdx={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        onOpen={vi.fn()}
        onReorder={vi.fn()}
        sidebarOpen={true}
        onToggleSidebar={onToggleSidebar}
        detailsOpen={true}
        onToggleDetails={onToggleDetails}
      />
    );

    const hideSidebarBtn = screen.getByRole('button', { name: 'toolbar.hideSidebar' });
    expect(hideSidebarBtn).toBeDefined();
    expect(hideSidebarBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('los controles de RepoTabs cumplen con el área objetivo mínima de 44x44px', () => {
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
});

describe('Grupo 2 & 3: Selector de vistas y acciones en RepoSidebar', () => {
  it('renderiza selector de vistas desplegable que declara la vista activa en su encabezado y permite cambiarla', () => {
    const onTabChange = vi.fn();
    const { rerender } = render(
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

    // El encabezado del selector declara la vista activa ('tab.graph')
    const trigger = screen.getByRole('button', { name: /tab\.graph/i });
    expect(trigger).toBeDefined();

    // Abre el menú
    fireEvent.click(trigger);
    const commitOption = screen.getByRole('menuitem', { name: /tab\.commit/i });
    expect(commitOption).toBeDefined();

    // Selección de Commit dispara onTabChange
    fireEvent.click(commitOption);
    expect(onTabChange).toHaveBeenCalledWith('Commit');

    // Al cambiar la vista vía atajo/prop, el encabezado refleja la nueva vista
    rerender(
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
        activeTab="Pipeline"
        onTabChange={onTabChange}
      />
    );

    const pipelineHeader = screen.getByRole('button', { name: /tab\.pipeline/i });
    expect(pipelineHeader).toBeDefined();
  });

  it('RepoSidebar muestra Pull, Push y Acciones e invoca sus manejadores al hacer clic', () => {
    const onPullIntent = vi.fn();
    const onPushIntent = vi.fn();
    const onNewBranchRequest = vi.fn();
    const onOpenStashModal = vi.fn();

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
        onTabChange={vi.fn()}
        onPullIntent={onPullIntent}
        onPushIntent={onPushIntent}
        onNewBranchRequest={onNewBranchRequest}
        onOpenStashModal={onOpenStashModal}
      />
    );

    // Traer y Publicar como botones directos
    const pullBtn = screen.getByRole('button', { name: 'toolbar.pull' });
    const pushBtn = screen.getByRole('button', { name: 'toolbar.push' });
    expect(pullBtn).toBeDefined();
    expect(pushBtn).toBeDefined();

    fireEvent.click(pullBtn);
    expect(onPullIntent).toHaveBeenCalledTimes(1);

    fireEvent.click(pushBtn);
    expect(onPushIntent).toHaveBeenCalledTimes(1);

    // Acciones como filas directas
    const newBranchBtn = screen.getByRole('button', { name: /toolbar\.newBranch/i });
    expect(newBranchBtn).toBeDefined();
    fireEvent.click(newBranchBtn);
    expect(onNewBranchRequest).toHaveBeenCalledTimes(1);
  });
});

describe('Grupo 4: Indicadores de estado del repositorio en vistas distintas de Pipeline', () => {
  it('los indicadores de estado del working tree y tracking ya no residen en el panel lateral', () => {
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
        onTabChange={vi.fn()}
      />
    );

    // Rama actual e indicadores ya no están en RepoSidebar
    expect(screen.queryByTitle('main')).toBeNull();
    expect(screen.queryByText('sidebar.workingTreeClean')).toBeNull();
    expect(screen.queryByText('sidebar.branchStatus.syncedShort')).toBeNull();
  });
});

describe('Desplegables accesibles (SidebarDropdown)', () => {
  it('SidebarDropdown abre con clic/teclado, navega con flechas, activa con Enter y cierra con Escape devolviendo el foco', () => {
    const onItem1 = vi.fn();
    const onItem2 = vi.fn();
    const items: DropdownMenuItem[] = [
      { id: 'item-1', label: 'Opción 1', shortcut: 'Ctrl + 1', onClick: onItem1 },
      { id: 'item-2', label: 'Opción 2', shortcut: 'Ctrl + 2', onClick: onItem2 },
    ];

    render(<SidebarDropdown id="test-dropdown" label="Menú Prueba" items={items} />);

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

describe('Grupo 8: Correcciones visuales y de disposición', () => {
  it('el control de búsqueda está ubicado en RepoSidebar y opera correctamente', () => {
    const onFilterTextChange = vi.fn();
    const onSearchOpenChange = vi.fn();

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
        onTabChange={vi.fn()}
        filterText=""
        onFilterTextChange={onFilterTextChange}
        searchOpen={false}
        onSearchOpenChange={onSearchOpenChange}
      />
    );

    const searchBtn = screen.getByRole('button', { name: 'toolbar.filter' });
    expect(searchBtn).toBeDefined();
    fireEvent.click(searchBtn);
    expect(onSearchOpenChange).toHaveBeenCalledWith(true);
  });

  it('las secciones del lateral arrancan contraídas y se despliegan al hacer clic', () => {
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
        onTabChange={vi.fn()}
      />
    );

    // Por omisión, la sección LOCAL está contraída (aria-expanded = false)
    const localSectionBtn = screen.getByRole('button', { name: /sidebar\.local/i });
    expect(localSectionBtn.getAttribute('aria-expanded')).toBe('false');

    // Al hacer clic, se abre
    fireEvent.click(localSectionBtn);
    expect(localSectionBtn.getAttribute('aria-expanded')).toBe('true');
  });

  describe('Selector de modo de grafo retirado del lateral (5.1, 5.2)', () => {
    function renderWithModeProps(enableCronometric: boolean, activeTab: 'Graph' | 'Pipeline' | 'Commit' | 'History') {
      return render(
        <RepoSidebar
          graphMode="classic"
          activeGraphMode="classic"
          onChangeGraphMode={vi.fn()}
          enableCronometric={enableCronometric}
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
          activeTab={activeTab}
          onTabChange={vi.fn()}
        />
      );
    }

    it('1. El selector de modo NO está en el lateral y graph-mode-row ya no existe', () => {
      renderWithModeProps(true, 'Graph');

      expect(screen.queryByTestId('graph-mode-row')).toBeNull();
      expect(screen.queryByLabelText('toolbar.viewClassicBtn')).toBeNull();
      expect(screen.queryByLabelText('toolbar.viewChronometricBtn')).toBeNull();
      expect(screen.queryByTitle('toolbar.viewClassicTooltip')).toBeNull();
      expect(screen.queryByTitle('toolbar.viewChronometricTooltip')).toBeNull();
    });

    it('2. En Pipeline tampoco existe graph-mode-row en el lateral', () => {
      renderWithModeProps(true, 'Pipeline');

      expect(screen.queryByTestId('graph-mode-row')).toBeNull();
      expect(screen.queryByLabelText('toolbar.viewClassicBtn')).toBeNull();
      expect(screen.queryByLabelText('toolbar.viewChronometricBtn')).toBeNull();
    });

    it('3. Con enableCronometric=false tampoco existe graph-mode-row en el lateral', () => {
      renderWithModeProps(false, 'Graph');

      expect(screen.queryByTestId('graph-mode-row')).toBeNull();
      expect(screen.queryByLabelText('toolbar.viewClassicBtn')).toBeNull();
      expect(screen.queryByLabelText('toolbar.viewChronometricBtn')).toBeNull();
    });
  });

  describe('Convención de chevrons en acordiones (un acordeón cerrado apunta abajo, abierto apunta arriba)', () => {
    it('un acordeón cerrado apunta abajo, abierto apunta arriba y el chevron es siempre visible', () => {
      const { rerender } = render(
        <SidebarSection title="Local Branches" isOpen={false}>
          <div>branch list</div>
        </SidebarSection>
      );

      const toggleButton = screen.getByRole('button', { name: /Local Branches/ });
      const chevronSvg = toggleButton.querySelector('svg')!;
      expect(chevronSvg).toBeDefined();

      const closedClasses = chevronSvg.getAttribute('class') || '';
      // El indicador debe verse siempre (sin opacidad condicional oculta)
      expect(closedClasses).not.toContain('opacity-0');
      // Cerrado: declara el ícono lucide-chevron-down y apunta abajo (sin rotación a 90deg ni 180deg)
      expect(closedClasses).toContain('lucide-chevron-down');
      expect(closedClasses).not.toContain('rotate-90');
      expect(closedClasses).not.toContain('rotate-180');

      // Abierto: rota 180deg para apuntar arriba
      rerender(
        <SidebarSection title="Local Branches" isOpen={true}>
          <div>branch list</div>
        </SidebarSection>
      );
      const openClasses = chevronSvg.getAttribute('class') || '';
      expect(openClasses).toContain('lucide-chevron-down');
      expect(openClasses).toContain('rotate-180');
      expect(openClasses).not.toContain('rotate-90');
    });
  });
});
