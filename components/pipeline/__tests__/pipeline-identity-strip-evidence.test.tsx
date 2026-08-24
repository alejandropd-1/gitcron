// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import { OpenSpecSidebarNav } from '../OpenSpecSidebarNav';
import { RepoSidebar } from '@/components/RepoSidebar';
import { useGitStore } from '@/lib/git-store';
import { usePipelineStore } from '@/lib/pipeline-store';
import type { PipelineSnapshot, OpenSpecChangeSummary } from '../pipeline-view-state';
import type { OpenSpecEngineStatus } from '@/types/pipeline';

import { translate } from '@/lib/i18n';

vi.mock('@/hooks/use-git-actions', () => ({
  useGitActions: () => ({ stageFiles: vi.fn(), commitChanges: vi.fn() }),
}));

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    translate(key as Parameters<typeof translate>[0], 'es', params),
}));

function makeChange(
  changeId: string,
  validation: 'passed' | 'failed' | 'unknown',
  doneTasks = 2,
  totalTasks = 4,
): OpenSpecChangeSummary {
  return {
    changeId,
    intent: `Intención ${changeId}`,
    tasks: Array.from({ length: totalTasks }, (_, index) => ({
      id: `${changeId}-${index}`,
      text: `Tarea ${index + 1}`,
      completed: index < doneTasks,
      line: index + 1,
      sourceRef: `tasks.md:${index + 1}`,
    })),
    proposalExists: true,
    designExists: true,
    specsCount: 2,
    validation,
    artifacts: null,
  };
}

const mockEngineStatus: OpenSpecEngineStatus = {
  cli: {
    installed: true,
    runtimeVersion: '1.8.0',
    provenance: 'global',
    displayPath: 'C:\\bin\\openspec.exe',
    supportedRange: { min: '1.5.0', max: '1.9.0' },
    versionClass: 'supported',
    evidenceStatus: 'confirmed',
    diagnostics: [],
  },
  latestAvailable: null,
  globalConfig: null,
  installedIntegration: null,
  repoState: 'initialized',
  integrationState: 'up-to-date',
};

function makeSnapshot(
  activeChanges: OpenSpecChangeSummary[] = [],
  selectedChangeId: string | null = null,
): PipelineSnapshot {
  return {
    schemaVersion: '1.0',
    repoId: 'repo-1',
    availableSources: ['git'],
    hasPipelineActivity: true,
    decisions: [],
    agents: [],
    activity: [],
    economy: { reasoningAvailable: null } as PipelineSnapshot['economy'],
    diffs: [],
    openSpec: {
      selectedChangeId,
      activeChanges,
      archivedChanges: [],
      specifications: [
        { specificationId: 'spec-1', requirements: 3, sourceRef: 'openspec/specs/spec-1/spec.md' },
      ],
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  };
}

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

describe('Fase 8: La franja recibe lo que el cuerpo duplicaba', () => {
  beforeEach(() => {
    (window as unknown as { api?: unknown }).api = {
      pipelineOpenSpec: {
        getEngineStatus: vi.fn().mockResolvedValue(mockEngineStatus),
        checkLatestVersion: vi.fn().mockResolvedValue(null),
        getUpdatePlan: vi.fn().mockResolvedValue(null),
      },
    };
    usePipelineStore.setState({
      prepareOpen: false,
      selectedChangeId: null,
      snapshot: makeSnapshot(),
    });
    useGitStore.setState({
      repoPath: 'C:/repo',
      currentBranch: 'change/test-branch',
      branches: ['main', 'change/test-branch'],
      modifiedFiles: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('8.1 El pie de evidencia ya no se monta en el cuerpo de SDD', () => {
    const changeItem = makeChange('demo-change', 'passed');
    const snap = makeSnapshot([changeItem], 'demo-change');

    const { container } = render(
      <OpenSpecDashboard
        snapshot={snap}
        repoPath="C:/repo"
        currentBranch="change/test-branch"
        workingTreeClean={true}
        leftOpen={false}
        rightOpen={false}
        leftWidth={320}
        rightWidth={320}
        onResizeLeft={() => undefined}
        onResizeRight={() => undefined}
        projection={null}
        runtimeHistory={[]}
        onRefresh={() => undefined}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />,
    );

    // No existe footer ni elemento con clase evidenceStrip en el cuerpo
    expect(container.querySelector('footer')).toBeNull();
    expect(container.querySelector('footer[class*="evidenceStrip"]')).toBeNull();
    expect(screen.queryByText('pipeline.openspec.evidence.branch')).toBeNull();
    expect(screen.queryByText('pipeline.openspec.evidence.workingTree')).toBeNull();
  });

  it('8.2 y 8.5 La validación de OpenSpec y la versión del motor están en la franja de identidad (content-header)', async () => {
    const changeItem = makeChange('demo-change', 'passed');
    const snap = makeSnapshot([changeItem], 'demo-change');

    render(
      <OpenSpecDashboard
        snapshot={snap}
        repoPath="C:/repo"
        currentBranch="change/test-branch"
        workingTreeClean={true}
        leftOpen={false}
        rightOpen={false}
        leftWidth={320}
        rightWidth={320}
        onResizeLeft={() => undefined}
        onResizeRight={() => undefined}
        projection={null}
        runtimeHistory={[]}
        onRefresh={() => undefined}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />,
    );

    act(() => {
      usePipelineStore.getState().setSelectedChangeId('demo-change');
    });

    const header = screen.getByTestId('content-header');
    expect(header).toBeDefined();

    // Versión del motor en la franja de identidad
    expect(await within(header).findByText('OpenSpec v1.8.0')).toBeDefined();

    // Validación de OpenSpec en la franja de identidad
    expect(within(header).getByText('Todas las verificaciones pasan')).toBeDefined();
  });

  it('8.2 La validación conserva sus cuatro estados en la franja: passed, failed, unknown y no aplica', () => {
    // 1. passed
    const snapPassed = makeSnapshot([makeChange('c1', 'passed')], 'c1');
    const { unmount: unmount1 } = render(
      <OpenSpecDashboard
        snapshot={snapPassed}
        repoPath="C:/repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={false}
        rightOpen={false}
        leftWidth={320}
        rightWidth={320}
        onResizeLeft={() => undefined}
        onResizeRight={() => undefined}
        projection={null}
        runtimeHistory={[]}
        onRefresh={() => undefined}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />,
    );
    act(() => {
      usePipelineStore.getState().setSelectedChangeId('c1');
    });
    let header = screen.getByTestId('content-header');
    expect(within(header).getByText('Todas las verificaciones pasan')).toBeDefined();
    unmount1();

    // 2. failed
    const snapFailed = makeSnapshot([makeChange('c2', 'failed')], 'c2');
    const { unmount: unmount2 } = render(
      <OpenSpecDashboard
        snapshot={snapFailed}
        repoPath="C:/repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={false}
        rightOpen={false}
        leftWidth={320}
        rightWidth={320}
        onResizeLeft={() => undefined}
        onResizeRight={() => undefined}
        projection={null}
        runtimeHistory={[]}
        onRefresh={() => undefined}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />,
    );
    act(() => {
      usePipelineStore.getState().setSelectedChangeId('c2');
    });
    header = screen.getByTestId('content-header');
    expect(within(header).getByText('La validación necesita correcciones')).toBeDefined();
    unmount2();

    // 3. unknown
    const snapUnknown = makeSnapshot([makeChange('c3', 'unknown')], 'c3');
    const { unmount: unmount3 } = render(
      <OpenSpecDashboard
        snapshot={snapUnknown}
        repoPath="C:/repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={false}
        rightOpen={false}
        leftWidth={320}
        rightWidth={320}
        onResizeLeft={() => undefined}
        onResizeRight={() => undefined}
        projection={null}
        runtimeHistory={[]}
        onRefresh={() => undefined}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />,
    );
    act(() => {
      usePipelineStore.getState().setSelectedChangeId('c3');
    });
    header = screen.getByTestId('content-header');
    expect(within(header).getByText('Todavía no se validó')).toBeDefined();
    unmount3();

    // 4. No aplica (sin cambio seleccionado)
    const snapNoChange = makeSnapshot([makeChange('c4', 'passed')], null);
    usePipelineStore.setState({ selectedChangeId: null });
    render(
      <OpenSpecDashboard
        snapshot={snapNoChange}
        repoPath="C:/repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={false}
        rightOpen={false}
        leftWidth={320}
        rightWidth={320}
        onResizeLeft={() => undefined}
        onResizeRight={() => undefined}
        projection={null}
        runtimeHistory={[]}
        onRefresh={() => undefined}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />,
    );
    header = screen.getByTestId('content-header');
    expect(within(header).getByText('No aplica')).toBeDefined();
  });

  it('8.3 Los contadores de especificaciones y tareas ya no están en el cuerpo', () => {
    const snap = makeSnapshot([makeChange('uno', 'passed', 2, 4)], null);

    const { container } = render(
      <OpenSpecDashboard
        snapshot={snap}
        repoPath="C:/repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={false}
        rightOpen={false}
        leftWidth={320}
        rightWidth={320}
        onResizeLeft={() => undefined}
        onResizeRight={() => undefined}
        projection={null}
        runtimeHistory={[]}
        onRefresh={() => undefined}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />,
    );

    expect(container.querySelector('dl[class*="summaryFacts"]')).toBeNull();
    expect(screen.queryByText('especificaciones')).toBeNull();
    expect(screen.queryByText('tareas')).toBeNull();
  });

  it('8.4 El porcentaje global de tareas está en el lateral en la vista del ciclo, y NO en la del grafo', () => {
    // 2 cambios: 'uno' al 50% (1/2) y 'dos' al 0% (0/2) -> global 25% (1/4)
    const snap = makeSnapshot([
      makeChange('uno', 'passed', 1, 2),
      makeChange('dos', 'passed', 0, 2),
    ]);
    usePipelineStore.setState({ snapshot: snap });

    // 1. En la vista del ciclo (activeTab="Pipeline"), el lateral muestra el rótulo y el porcentaje global
    const { unmount } = renderSidebar('Pipeline');

    const sidebarNav = screen.getByTestId('openspec-sidebar-nav');
    expect(sidebarNav).toBeDefined();
    const columnHeader = screen.getByTestId('sidebar-change-cycle-header');
    expect(within(columnHeader).getByText('Ciclo de cambios')).toBeDefined();
    expect(within(columnHeader).getByText('25%')).toBeDefined();

    unmount();

    // 2. En la vista del grafo (activeTab="Graph"), el lateral muestra Ramas y referencias y NO el porcentaje
    renderSidebar('Graph');

    const graphBranchesSection = screen.getByTestId('sidebar-branches-sections');
    expect(graphBranchesSection).toBeDefined();
    expect(within(graphBranchesSection).getByText('Ramas y referencias')).toBeDefined();
    expect(within(graphBranchesSection).queryByText('25%')).toBeNull();
    expect(within(graphBranchesSection).queryByText('50%')).toBeNull();
    expect(within(graphBranchesSection).queryByText('Ciclo de cambios')).toBeNull();
  });

  it('8.4 El rótulo de columna del lateral resuelve el mismo tratamiento en las dos vistas', () => {
    const snap = makeSnapshot([makeChange('uno', 'passed', 2, 4)]);

    // Rótulo en vista Graph
    const { unmount } = renderSidebar('Graph');
    const graphLabel = screen.getByText('Ramas y referencias');
    const graphClasses = new Set(graphLabel.className.split(' ').filter(Boolean));

    unmount();

    // Rótulo en vista Pipeline (contenedor del rótulo de columna)
    render(
      <OpenSpecSidebarNav snapshot={snap} repoPath="C:/repo" />,
    );
    const cycleLabelContainer = screen.getByText('Ciclo de cambios').parentElement;
    expect(cycleLabelContainer).not.toBeNull();
    const cycleClasses = new Set(cycleLabelContainer!.className.split(' ').filter(Boolean));

    // Comparar que todas las clases de tratamiento visual de Graph estén en Pipeline
    for (const cls of graphClasses) {
      expect(cycleClasses.has(cls)).toBe(true);
    }
  });
});
