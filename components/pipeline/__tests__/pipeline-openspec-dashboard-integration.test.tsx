// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PipelineWorkspace } from '../PipelineWorkspace';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import { OpenSpecSidebarNav } from '../OpenSpecSidebarNav';
import { usePipelineStore } from '@/lib/pipeline-store';
import type { OpenSpecEngineStatus } from '../../../types/pipeline';
import type { PipelineSnapshot } from '../pipeline-view-state';

vi.mock('@/lib/git-store', () => ({
  useGitStore: (selector: any) =>
    selector({
      modifiedFiles: [],
      currentBranch: 'main',
      stageFiles: vi.fn(),
    }),
}));

vi.mock('@/hooks/use-git-actions', () => ({
  useGitActions: () => ({
    stageFiles: vi.fn(),
  }),
}));

vi.mock('@/lib/new-change-draft-store', () => ({
  useNewChangeDraft: () => ({ open: false, mode: null }),
  useNewChangeDraftStore: () => ({
    actions: { clearDraft: vi.fn() },
  }),
}));

describe('OpenSpecDashboard Integration (Ubicación, Jerarquía Visual y Cableado Productivo)', () => {
  afterEach(() => {
    cleanup();
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
      activeChanges: [],
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  };

  const dummyStatusOutdated: OpenSpecEngineStatus = {
    cli: {
      installed: true,
      runtimeVersion: '1.8.0',
      provenance: 'global',
      displayPath: 'C:\\global\\openspec.cmd',
      supportedRange: { min: '1.5.0', max: '1.8.0' },
      versionClass: 'supported',
      evidenceStatus: 'confirmed',
      diagnostics: [],
    },
    latestAvailable: null,
    globalConfig: null,
    installedIntegration: null,
    repoState: 'initialized',
    integrationState: 'outdated',
  };

  it('reserva el sidebar izquierdo exclusivamente para navegación y no incluye la tarjeta de motor', async () => {
    const getEngineStatusMock = vi.fn().mockResolvedValue(dummyStatusOutdated);
    const checkLatestVersionMock = vi.fn().mockResolvedValue(null);

    vi.stubGlobal('window', {
      api: {
        pipelineOpenSpec: {
          getEngineStatus: getEngineStatusMock,
          checkLatestVersion: checkLatestVersionMock,
        },
      },
    });

    usePipelineStore.setState({
      snapshot: dummySnapshot,
      selectedChangeId: null,
    });

    render(<OpenSpecSidebarNav />);

    // El sidebar izquierdo contiene las secciones de navegación ("Cambios activos", "Completados", "Especificaciones")
    const nav = screen.getByLabelText(/Navegador de OpenSpec/i);
    expect(nav).toBeDefined();
    // No debe contener la tarjeta de motor en el sidebar izquierdo
    expect(nav.querySelector('._engineCardSection_e0f15a')).toBeNull();

    vi.unstubAllGlobals();
  });

  it('propaga onEnsureRightOpen a través de PipelineWorkspace cuando se interactúa con el botón central y la insignia compacta', async () => {
    const getEngineStatusMock = vi.fn().mockResolvedValue(dummyStatusOutdated);
    const checkLatestVersionMock = vi.fn().mockResolvedValue(null);
    const onEnsureRightOpenMock = vi.fn();

    vi.stubGlobal('window', {
      api: {
        pipelineOpenSpec: {
          getEngineStatus: getEngineStatusMock,
          checkLatestVersion: checkLatestVersionMock,
        },
      },
    });

    const mockLoader = vi.fn().mockResolvedValue(dummySnapshot);

    render(
      <PipelineWorkspace
        repoPath="C:\\repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={true}
        rightOpen={false}
        leftWidth={340}
        rightWidth={340}
        onEnsureRightOpen={onEnsureRightOpenMock}
        loadSnapshot={mockLoader}
      />,
    );

    await vi.waitFor(() => {
      expect(screen.getByText(/OpenSpec requiere atención/i)).toBeDefined();
    });

    // 1. Clic en botón central "Abrir Herramientas > OpenSpec"
    const openToolsBtn = screen.getByRole('button', { name: /Abrir Herramientas > OpenSpec/i });
    fireEvent.click(openToolsBtn);
    expect(onEnsureRightOpenMock).toHaveBeenCalledTimes(1);

    // 2. Clic en insignia de motor en franja de identidad
    const compactBadge = screen.getByTitle(/OpenSpec v1.8.0 · Desactualizado/i);
    fireEvent.click(compactBadge);
    expect(onEnsureRightOpenMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it('renderiza el contenedor y título de Avisos sólo cuando hay al menos un aviso, y no los renderiza sin avisos', async () => {
    // 1. Con aviso: integración desactualizada
    const getEngineStatusMock = vi.fn().mockResolvedValue(dummyStatusOutdated);
    const checkLatestVersionMock = vi.fn().mockResolvedValue(null);

    vi.stubGlobal('window', {
      api: {
        pipelineOpenSpec: {
          getEngineStatus: getEngineStatusMock,
          checkLatestVersion: checkLatestVersionMock,
        },
      },
    });

    const { rerender } = render(
      <OpenSpecDashboard
        snapshot={dummySnapshot}
        repoPath="C:\\repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={true}
        rightOpen={false}
        leftWidth={340}
        rightWidth={340}
        onResizeLeft={vi.fn()}
        onResizeRight={vi.fn()}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    await vi.waitFor(() => {
      // Con aviso: el contenedor de Avisos y su título existen
      expect(screen.getByRole('region', { name: 'Avisos' })).toBeDefined();
      expect(screen.getByText('Avisos')).toBeDefined();
      expect(screen.getByText(/OpenSpec requiere atención/i)).toBeDefined();
    });

    // 2. Sin avisos: motor al día, repo inicializado, herramientas configuradas, sin divergencia
    const dummyStatusClean: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.8.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.8.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: null,
      repoState: 'initialized',
      integrationState: 'up-to-date',
      divergence: {
        isDivergent: false,
        overallStatus: 'convergent',
        reason: null,
        globalProfileClass: 'core',
        repoProfileClass: 'core',
      },
    };

    const cleanSnapshot: PipelineSnapshot = {
      ...dummySnapshot,
      openSpec: {
        ...dummySnapshot.openSpec!,
        openSpecPresent: true,
        openSpecTools: [
          { toolId: 'codex', label: 'Codex', directory: '.codex', configured: true },
        ],
      },
    };

    getEngineStatusMock.mockResolvedValue(dummyStatusClean);

    rerender(
      <OpenSpecDashboard
        snapshot={cleanSnapshot}
        repoPath="C:\\clean-repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={true}
        rightOpen={false}
        leftWidth={340}
        rightWidth={340}
        onResizeLeft={vi.fn()}
        onResizeRight={vi.fn()}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    await vi.waitFor(() => {
      // Sin avisos: el contenedor de Avisos y su título no se renderizan
      expect(screen.queryByRole('region', { name: 'Avisos' })).toBeNull();
      expect(screen.queryByText('Avisos')).toBeNull();
      expect(screen.queryByText(/OpenSpec requiere atención/i)).toBeNull();
    });

    vi.unstubAllGlobals();
  });

  it('los contadores de especificaciones y tareas viven en el cuerpo y no en la franja de identidad, sin duplicar cambios activos ni completados (Ajuste 2)', async () => {
    const getEngineStatusMock = vi.fn().mockResolvedValue(dummyStatusOutdated);
    const checkLatestVersionMock = vi.fn().mockResolvedValue(null);

    (window as any).api = {
      pipelineOpenSpec: {
        getEngineStatus: getEngineStatusMock,
        checkLatestVersion: checkLatestVersionMock,
      },
    };

    const populatedSnapshot: PipelineSnapshot = {
      ...dummySnapshot,
      openSpec: {
        ...dummySnapshot.openSpec!,
        activeChanges: [
          {
            changeId: 'change-1',
            status: { schemaName: 'spec-driven', isComplete: false, isPlanningComplete: true, artifacts: [] },
            tasks: [{ id: '1', description: 'Task 1', completed: true }],
          } as any,
        ],
        archivedChanges: [
          { changeId: 'archived-1', completedAt: '2026-08-01' } as any,
        ],
        specifications: [
          { specificationId: 'spec-1', name: 'Spec 1', requirements: 2 } as any,
        ],
      },
    };

    const { container } = render(
      <OpenSpecDashboard
        snapshot={populatedSnapshot}
        repoPath="C:\\repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={true}
        rightOpen={false}
        leftWidth={340}
        rightWidth={340}
        onResizeLeft={vi.fn()}
        onResizeRight={vi.fn()}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    const identityHeader = screen.getByTestId('content-header');
    expect(identityHeader).toBeDefined();

    // 1. La franja de identidad NO contiene contadores de especificaciones ni tareas
    expect(identityHeader.textContent).not.toContain('especificaciones');
    expect(identityHeader.textContent).not.toContain('tareas');

    // 2. La franja de identidad NO duplica cambios activos ni completados
    expect(identityHeader.textContent).not.toContain('cambios activos');
    expect(identityHeader.textContent).not.toContain('completados');

    // 3. Los contadores de especificaciones y progreso de tareas están en el cuerpo (startScreen / center)
    const body = container.querySelector('main');
    expect(body).not.toBeNull();
    expect(body!.textContent).toContain('especificaciones');
    expect(body!.textContent).toContain('tareas');

    delete (window as any).api;
  });

  it('muestra la revisión en la columna central al presionar Revisar y restaura la vista al volver/cerrar', async () => {
    const getEngineStatusMock = vi.fn().mockResolvedValue(dummyStatusOutdated);
    const getUpdatePlanMock = vi.fn().mockResolvedValue({
      requiredAction: 'update',
      canExecute: false,
      reason: null,
      suggestedCommand: 'openspec update',
    });

    vi.stubGlobal('window', {
      api: {
        pipelineOpenSpec: {
          getEngineStatus: getEngineStatusMock,
          checkLatestVersion: vi.fn().mockResolvedValue(null),
          getUpdatePlan: getUpdatePlanMock,
        },
      },
    });

    const { container } = render(
      <OpenSpecDashboard
        snapshot={dummySnapshot}
        repoPath="C:\\repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={true}
        rightOpen={false}
        leftWidth={340}
        rightWidth={340}
        onResizeLeft={vi.fn()}
        onResizeRight={vi.fn()}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    // Esperar a que cargue el estado y se muestre el aviso
    const reviewBtn = await screen.findByRole('button', { name: /Revisar actualización/i });
    expect(reviewBtn).toBeTruthy();

    // 1. Al presionar "Revisar actualización", la columna central muestra la sección de revisión
    fireEvent.click(reviewBtn);

    const reviewHeading = await screen.findByRole('heading', { name: /Revisión de Actualización de OpenSpec/i });
    expect(reviewHeading).toBeTruthy();

    // La revisión está dentro de la columna central (main)
    const mainSection = container.querySelector('main');
    expect(mainSection).not.toBeNull();
    expect(mainSection!.textContent).toContain('Revisión de Actualización de OpenSpec');

    // 2. El botón del aviso ahora alterna a "Cerrar revisión"
    const toggleCloseBtn = screen.getByRole('button', { name: /Cerrar revisión/i });
    expect(toggleCloseBtn).toBeTruthy();

    // Al presionarlo, se cierra la revisión y se restaura la vista anterior
    fireEvent.click(toggleCloseBtn);
    expect(screen.queryByRole('heading', { name: /Revisión de Actualización de OpenSpec/i })).toBeNull();

    // 3. Al volver a entrar, el botón del pie "Cerrar" también la cierra y restaura la vista
    const reOpenBtn = screen.getByRole('button', { name: /Revisar actualización/i });
    fireEvent.click(reOpenBtn);
    expect(await screen.findByRole('heading', { name: /Revisión de Actualización de OpenSpec/i })).toBeTruthy();

    const footerCloseBtn = screen.getByRole('button', { name: /^Cerrar$/i });
    fireEvent.click(footerCloseBtn);
    expect(screen.queryByRole('heading', { name: /Revisión de Actualización de OpenSpec/i })).toBeNull();

    delete (window as any).api;
  });

  it('el cuerpo de SDD preserva la zona central y retira las columnas navigator e inspector (5.1)', () => {
    const { container } = render(
      <OpenSpecDashboard
        snapshot={dummySnapshot}
        repoPath="C:\\repo"
        currentBranch="main"
        workingTreeClean={true}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    // El cuerpo central permanece en el DOM
    const center = container.querySelector('main');
    expect(center).not.toBeNull();

    // Las columnas laterales navigator e inspector fueron retiradas del cuerpo (0 asides)
    const asides = container.querySelectorAll('aside');
    expect(asides.length).toBe(0);
  });
});
