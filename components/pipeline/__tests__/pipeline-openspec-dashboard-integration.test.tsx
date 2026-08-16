// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PipelineWorkspace } from '../PipelineWorkspace';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
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

    render(
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
      expect(getEngineStatusMock).toHaveBeenCalledWith('C:\\\\repo');
    });

    // El sidebar izquierdo (navigator) contiene los títulos de navegación ("Cambio activo", "Completados recientes", "Especificaciones")
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

    // 2. Clic en insignia compacta
    const compactBadge = screen.getByTitle(/v1.8.0 · Desactualizado/i);
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

  it('la barra superior sólo renderiza especificaciones y progreso de tareas, sin duplicar cambios activos ni completados (Ajuste 2)', async () => {
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

    const summaryBar = container.querySelector('header');
    expect(summaryBar).not.toBeNull();

    // 1. Especificaciones y porcentaje de tareas sí están en la barra superior
    expect(summaryBar!.textContent).toContain('especificaciones');
    expect(summaryBar!.textContent).toContain('tareas');

    // 2. Contadores duplicados (cambios activos y completados) NO están en la barra superior
    expect(summaryBar!.textContent).not.toContain('cambios activos');
    expect(summaryBar!.textContent).not.toContain('completados');

    delete (window as any).api;
  });
});
