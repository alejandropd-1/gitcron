// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenSpecSidebarNav } from '../OpenSpecSidebarNav';
import { RepoSidebar } from '@/components/RepoSidebar';
import { useGitStore } from '@/lib/git-store';
import { usePipelineStore } from '@/lib/pipeline-store';
import type { PipelineSnapshot } from '../pipeline-view-state';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="mock-dynamic-component" />,
}));

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
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

const mockSnapshot: PipelineSnapshot = {
  schemaVersion: '1.0',
  repoId: 'repo-test',
  availableSources: ['git', 'runtime', 'openspec'],
  hasPipelineActivity: true,
  decisions: [],
  agents: [],
  activity: [],
  economy: {
    tokens: { input: 100, output: 50, reasoning: 20, cacheRead: 10 },
    costUsd: 0.05,
    costBasis: 'runtime_reported',
    costCoverage: { withCost: 1, total: 1 },
    contextMaxTokens: 200000,
    contextCurrentTokens: 5000,
    compactionCount: 0,
    reasoningAvailable: true,
  },
  diffs: [],
  openSpec: {
    selectedChangeId: null,
    activeChanges: [
      {
        changeId: 'mi-cambio-activo',
        intent: 'Intención de prueba',
        tasks: [
          { id: '1', text: 'Tarea 1', completed: true, line: 1, sourceRef: 'tasks.md:1' },
          { id: '2', text: 'Tarea 2', completed: false, line: 2, sourceRef: 'tasks.md:2' },
        ],
        proposalExists: true,
        designExists: true,
        specsCount: 1,
        validation: 'passed',
        artifacts: null,
      },
    ],
    archivedChanges: [
      {
        changeId: 'cambio-archivado-1',
        archivedAt: '2026-08-20',
        sourceRef: 'openspec/changes/archive/cambio-archivado-1',
        artifacts: null,
      },
    ],
    specifications: [
      {
        specificationId: 'especificacion-1',
        requirements: 5,
        sourceRef: 'openspec/specs/especificacion-1/spec.md',
      },
    ],
    reports: [],
    diagnostics: [],
    observedAt: '2026-08-22T10:00:00Z',
    latestGate: null,
  },
};

function renderSidebar(activeTab: string) {
  return render(
    <RepoSidebar
      graphMode="classic"
      sidebarW={300}
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
      activeTab={activeTab}
      onTabChange={vi.fn()}
    />,
  );
}

describe('OpenSpecSidebarNav con SidebarSection (5ter)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePipelineStore.setState({
      snapshot: mockSnapshot,
      selectedChangeId: null,
      openSpecificationId: null,
      expandedChanges: {},
    });
    useGitStore.setState({
      repoPath: 'C:/test-repo',
      branches: ['main'],
      currentBranch: 'main',
      remoteBranches: [],
      branchTracking: {},
      stashes: [],
      tags: [],
      submodules: [],
      remotes: [],
      worktrees: [],
      pullRequests: [],
      githubUser: null,
      selectedCommit: null,
      modifiedFiles: [],
      isLoading: false,
    });
  });

  afterEach(cleanup);

  it('las 3 secciones montan el componente SidebarSection con botón aria-expanded y arrancan contraídas por omisión', () => {
    render(<OpenSpecSidebarNav repoPath="C:/test-repo" snapshot={mockSnapshot} />);

    const buttons = screen.getAllByRole('button');
    const sectionToggles = buttons.filter((b) => b.hasAttribute('aria-expanded'));

    expect(sectionToggles).toHaveLength(3);

    // Los 3 títulos correspondientes
    expect(screen.getByText('pipeline.openspec.active.title')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.completed.title')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.specifications.title')).toBeTruthy();

    // Las 3 secciones arrancan con aria-expanded="false"
    sectionToggles.forEach((toggle) => {
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    });

    // Como arrancan contraídas, sus contenidos hijos no están en el DOM
    expect(screen.queryByText('mi-cambio-activo')).toBeNull();
    expect(screen.queryByText('cambio-archivado-1')).toBeNull();
    expect(screen.queryByText('especificacion-1')).toBeNull();
  });

  it('accionar el control pliega y despliega la sección montando y desmontando los elementos del DOM', () => {
    render(<OpenSpecSidebarNav repoPath="C:/test-repo" snapshot={mockSnapshot} />);

    const activeToggle = screen.getByRole('button', { name: /pipeline\.openspec\.active\.title/ });
    expect(activeToggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('mi-cambio-activo')).toBeNull();

    // 1. Desplegar
    fireEvent.click(activeToggle);
    expect(activeToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('mi-cambio-activo')).toBeTruthy();
    const changeCard = screen.getByText('mi-cambio-activo').closest('button')!;
    expect(within(changeCard).getByText('50%')).toBeTruthy();
    const columnHeader = screen.getByTestId('sidebar-change-cycle-header');
    expect(within(columnHeader).getByText('50%')).toBeTruthy();

    // 2. Plegar
    fireEvent.click(activeToggle);
    expect(activeToggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('mi-cambio-activo')).toBeNull();
  });

  it('el contenido de cada sección conserva todos los datos cuando se despliega', () => {
    render(<OpenSpecSidebarNav repoPath="C:/test-repo" snapshot={mockSnapshot} />);

    // Abrir las 3 secciones
    fireEvent.click(screen.getByRole('button', { name: /pipeline\.openspec\.active\.title/ }));
    fireEvent.click(screen.getByRole('button', { name: /pipeline\.openspec\.completed\.title/ }));
    fireEvent.click(screen.getByRole('button', { name: /pipeline\.openspec\.specifications\.title/ }));

    // Sección Activos: ID de cambio y porcentaje de tareas
    expect(screen.getByText('mi-cambio-activo')).toBeTruthy();
    const changeCard = screen.getByText('mi-cambio-activo').closest('button')!;
    expect(within(changeCard).getByText('50%')).toBeTruthy();
    const columnHeader = screen.getByTestId('sidebar-change-cycle-header');
    expect(within(columnHeader).getByText('50%')).toBeTruthy();

    // Sección Completados: ID y fecha de archivado
    expect(screen.getByText('cambio-archivado-1')).toBeTruthy();
    expect(screen.getByText('2026-08-20')).toBeTruthy();

    // Sección Especificaciones: ID y conteo de requisitos
    expect(screen.getByText('especificacion-1')).toBeTruthy();
    expect(screen.getByText(/pipeline\.openspec\.requirements.*"count":5/)).toBeTruthy();
  });

  it('el estado de plegado se persiste por repositorio en localStorage y se conserva al cambiar de vista con rerender real', () => {
    // 1. Render en vista SDD (Pipeline)
    const { unmount } = renderSidebar('Pipeline');

    // Desplegar la sección de especificaciones
    const specToggle = screen.getByRole('button', { name: /pipeline\.openspec\.specifications\.title/ });
    expect(specToggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(specToggle);
    expect(specToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('especificacion-1')).toBeTruthy();

    // Comprobar persistencia en localStorage con clave openspec-specifications
    const stored = window.localStorage.getItem('gitcron:sidebarSections:C:/test-repo');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toContain('openspec-specifications');

    unmount();

    // 2. Cambiar a vista Graph (renderiza ramas)
    const { unmount: unmountGraph } = renderSidebar('Graph');

    expect(screen.getByTestId('sidebar-branches-sections')).toBeTruthy();
    expect(screen.queryByTestId('openspec-sidebar-nav')).toBeNull();

    unmountGraph();

    // 3. Volver a la vista SDD (Pipeline) con rerender real
    renderSidebar('Pipeline');

    // La sección de especificaciones se conserva abierta, y activos sigue cerrada
    const restoredSpecToggle = screen.getByRole('button', { name: /pipeline\.openspec\.specifications\.title/ });
    expect(restoredSpecToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('especificacion-1')).toBeTruthy();

    const restoredActiveToggle = screen.getByRole('button', { name: /pipeline\.openspec\.active\.title/ });
    expect(restoredActiveToggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('mi-cambio-activo')).toBeNull();
  });

  it('la lista de cambios activos no declara tope de alto ni desplazamiento propio en su CSS', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssPath = path.resolve(__dirname, '../OpenSpecDashboard.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // La regla .activeList no debe declarar max-height ni overflow-y
    expect(cssContent).not.toMatch(/\.activeList\s*\{[^}]*max-height/);
    expect(cssContent).not.toMatch(/\.activeList\s*\{[^}]*overflow-y/);
    expect(cssContent).not.toMatch(/\.activeList\s*\{[^}]*scrollbar-width/);
  });

  it('el título de sección resuelve el mismo peso y espaciado que las acciones del lateral', () => {
    renderSidebar('Pipeline');

    // 1. Tomar una acción del lateral (p. ej. toolbar.pull)
    const quickActionButton = screen.getByRole('button', { name: 'toolbar.pull' });
    const actionClasses = quickActionButton.className.split(/\s+/);
    const actionWeight = actionClasses.find((c) => c.startsWith('font-'));
    const actionTracking = actionClasses.find((c) => c.startsWith('tracking-'));

    // 2. Tomar el título de sección de SidebarSection (el contenedor del título y el span de texto)
    const sectionToggle = screen.getByRole('button', { name: /pipeline\.openspec\.active\.title/ });
    const sectionHeaderDiv = sectionToggle.parentElement;
    const sectionTitleSpan = sectionToggle.querySelector('span:not(.shrink-0)');

    const headerClasses = (sectionHeaderDiv?.className ?? '').split(/\s+/);
    const titleClasses = (sectionTitleSpan?.className ?? '').split(/\s+/);

    const sectionWeight = headerClasses.find((c) => c.startsWith('font-')) ?? titleClasses.find((c) => c.startsWith('font-'));
    const sectionTracking = headerClasses.find((c) => c.startsWith('tracking-')) ?? titleClasses.find((c) => c.startsWith('tracking-'));

    // Afirmar comparando las clases resueltas de ambos (dinámicamente)
    expect(sectionWeight).toBeDefined();
    expect(actionWeight).toBeDefined();
    expect(sectionWeight).toBe(actionWeight);

    expect(sectionTracking).toBeDefined();
    expect(actionTracking).toBeDefined();
    expect(sectionTracking).toBe(actionTracking);
  });
});
