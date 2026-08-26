// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PipelineWorkspace } from '../PipelineWorkspace';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import { OpenSpecSidebarNav } from '../OpenSpecSidebarNav';
import { OpenSpecInspector } from '../OpenSpecInspector';
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
  useNewChangeDraftStore: ((selector?: any) => {
    const state = {
      drafts: {},
      patchDraft: vi.fn(),
      clearDraft: vi.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }) as any,
}));

describe('OpenSpecDashboard Integration (Ubicación, Jerarquía Visual y Cableado Productivo)', () => {
  afterEach(() => {
    cleanup();
    usePipelineStore.setState({ selectedChangeId: null, openSpecificationId: null });
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

    // Clic en insignia de motor en franja de identidad abre el panel derecho si está cerrado
    const compactBadge = await screen.findByTitle(/OpenSpec v1.8.0/i);
    fireEvent.click(compactBadge);
    expect(onEnsureRightOpenMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('con atención del motor y con herramientas sin configurar, el centro NO monta ningún aviso, en las dos situaciones por separado (7.13, 7.16)', async () => {
    // 1. Situación A: atención del motor (integración desactualizada)
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
      // El centro NO monta aviso de atención del motor ni encabezado «Avisos»
      expect(screen.queryByRole('heading', { name: /Avisos/i, level: 4 })).toBeNull();
      expect(screen.queryByText(/OpenSpec requiere atención/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /Abrir Herramientas/i })).toBeNull();
    });

    // 2. Situación B: herramientas sin configurar (motor limpio)
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

    const unconfiguredToolsSnapshot: PipelineSnapshot = {
      ...dummySnapshot,
      openSpec: {
        ...dummySnapshot.openSpec!,
        openSpecPresent: true,
        openSpecTools: [
          { toolId: 'custom-tool', label: 'Custom Tool', directory: '.custom', configured: false },
        ],
      },
    };

    getEngineStatusMock.mockResolvedValue(dummyStatusClean);

    rerender(
      <OpenSpecDashboard
        snapshot={unconfiguredToolsSnapshot}
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
      // El centro NO monta aviso de herramientas sin configurar ni encabezado «Avisos»
      expect(screen.queryByRole('heading', { name: /Avisos/i, level: 4 })).toBeNull();
      expect(screen.queryByText(/herramienta.*sin configurar/i)).toBeNull();
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

    const TestComponent = () => {
      const reviewOpen = usePipelineStore((s) => s.reviewOpen);
      const toggleReviewOpen = usePipelineStore((s) => s.toggleReviewOpen);
      return (
        <div className="flex">
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
          />
          <OpenSpecInspector
            repoPath="C:\\repo"
            snapshot={dummySnapshot}
            sectionState={{
              isOpen: (id) => id === 'details-tools',
              toggle: vi.fn(),
              open: vi.fn(),
              setOpen: vi.fn(),
            }}
            isReviewOpen={reviewOpen}
            onOpenReview={toggleReviewOpen}
          />
        </div>
      );
    };

    usePipelineStore.setState({ reviewOpen: false });

    const { container } = render(<TestComponent />);

    // Esperar a que cargue el estado y se muestre el botón en la tarjeta del motor en el inspector
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

    // 2. El botón de la tarjeta del motor ahora alterna a "Cerrar revisión"
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

  it('los cinco bloques del centro montan encabezado con la misma clase compartida (7.7, 7.9)', async () => {
    const getEngineStatusMock = vi.fn().mockResolvedValue(dummyStatusOutdated);
    const checkLatestVersionMock = vi.fn().mockResolvedValue(null);

    vi.stubGlobal('window', {
      api: {
        pipelineOpenSpec: {
          getEngineStatus: getEngineStatusMock,
          checkLatestVersion: checkLatestVersionMock,
          getUpdatePlan: vi.fn().mockResolvedValue(null),
        },
      },
    });

    const snapshotWithChange: PipelineSnapshot = {
      ...dummySnapshot,
      openSpec: {
        ...dummySnapshot.openSpec!,
        selectedChangeId: 'change-1',
        activeChanges: [
          {
            changeId: 'change-1',
            status: { schemaName: 'spec-driven', isComplete: false, isPlanningComplete: true, artifacts: [] },
            tasks: [
              { id: '1', line: 10, text: 'Tarea 1', completed: false },
              { id: '2', line: 11, text: 'Tarea 2', completed: true },
            ],
          } as any,
        ],
        specifications: [
          { specificationId: 'spec-1', name: 'Spec 1', requirements: 2 } as any,
        ],
      },
    };

    usePipelineStore.setState({ selectedChangeId: 'change-1' });

    render(
      <OpenSpecDashboard
        snapshot={snapshotWithChange}
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

    // Entrar al cambio
    const enterBtn = screen.getByRole('button', { name: /Entrar|Abrir/i });
    fireEvent.click(enterBtn);

    // 1. Siguiente paso
    const nextStepHeading = await screen.findByRole('heading', { name: /Siguiente paso/i, level: 4 });
    expect(nextStepHeading).toBeTruthy();

    // 2. Tareas del cambio
    const tasksHeading = await screen.findByRole('heading', { name: /Tareas del cambio/i, level: 4 });
    expect(tasksHeading).toBeTruthy();

    // 3. Lanzar agente (abrir lanzador haciendo clic en "Continuar con")
    const continueBtn = screen.getByRole('button', { name: /Continuar con/i });
    fireEvent.click(continueBtn);
    const launcherHeading = await screen.findByRole('heading', { name: /Lanzar agente/i, level: 4 });
    expect(launcherHeading).toBeTruthy();

    // 4. Evidencia (pestaña Artefactos)
    const artifactsTab = screen.getByRole('tab', { name: /Artefactos/i });
    fireEvent.click(artifactsTab);
    const evidenceHeading = await screen.findByRole('heading', { name: /Evidencia/i, level: 4 });
    expect(evidenceHeading).toBeTruthy();

    // 4b. Actividad (pestaña Actividad)
    const activityTab = screen.getByRole('tab', { name: /Actividad/i });
    fireEvent.click(activityTab);
    const activityHeading = await screen.findByRole('heading', { name: /Actividad/i, level: 4 });
    expect(activityHeading).toBeTruthy();

    // Leemos la clase compartida del primer encabezado y comparamos con los demás
    const sharedClass = Array.from(nextStepHeading.classList).find((cls) => cls.includes('blockHeader'));
    expect(sharedClass).toBeDefined();

    expect(Array.from(launcherHeading.classList)).toContain(sharedClass);
    expect(Array.from(tasksHeading.classList)).toContain(sharedClass);
    expect(Array.from(evidenceHeading.classList)).toContain(sharedClass);
    expect(Array.from(activityHeading.classList)).toContain(sharedClass);

    expect(nextStepHeading.className).toBe(sharedClass);
    expect(launcherHeading.className).toBe(sharedClass);
    expect(tasksHeading.className).toBe(sharedClass);
    expect(evidenceHeading.className).toBe(sharedClass);
    expect(activityHeading.className).toBe(sharedClass);

    // Leemos la clase de bloque compartida del primer bloque y comparamos con los demás
    const nextStepBlock = nextStepHeading.parentElement!;
    const launcherBlock = launcherHeading.parentElement!;
    const tasksBlock = tasksHeading.parentElement!;
    const evidenceBlock = evidenceHeading.parentElement!;
    const activityBlock = activityHeading.parentElement!;

    const sharedBlockClass = Array.from(nextStepBlock.classList).find((cls) => cls.includes('centerBlock'));
    expect(sharedBlockClass).toBeDefined();

    expect(Array.from(launcherBlock.classList)).toContain(sharedBlockClass);
    expect(Array.from(tasksBlock.classList)).toContain(sharedBlockClass);
    expect(Array.from(evidenceBlock.classList)).toContain(sharedBlockClass);
    expect(Array.from(activityBlock.classList)).toContain(sharedBlockClass);

    // Cada encabezado contiene su ícono SVG size={13} con aria-hidden="true"
    for (const heading of [nextStepHeading, launcherHeading, tasksHeading, evidenceHeading, activityHeading]) {
      const svg = heading.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    }

    vi.unstubAllGlobals();
  });

  it('los encabezados de bloque del centro declaran el escalón de título de sección y NO el tamaño de los botones (7.10)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssPath = path.resolve(__dirname, '../OpenSpecDashboard.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Extraemos las declaraciones de font-size de .blockHeader y de los botones (.backToStart, etc.)
    const blockHeaderMatch = cssContent.match(/\.blockHeader\s*\{[^}]*font-size:\s*var\((--font-size-[a-z0-9-]+)\)/);
    const buttonMatch = cssContent.match(/\.backToStart\s*\{[^}]*font-size:\s*var\((--font-size-[a-z0-9-]+)\)/);

    expect(blockHeaderMatch).not.toBeNull();
    expect(buttonMatch).not.toBeNull();

    const headerScaleStep = blockHeaderMatch![1];
    const buttonScaleStep = buttonMatch![1];

    // .blockHeader debe declarar el escalón de título de sección (--font-size-md)
    expect(headerScaleStep).toBe('--font-size-md');
    // Y NO debe compartir el mismo tamaño que los botones (--font-size-xs)
    expect(headerScaleStep).not.toBe(buttonScaleStep);
  });

  it('el bloque de avisos retira noticesGroup, noticesList y centerAttentionBanner de la hoja de estilos (7.11, 7.14)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssPath = path.resolve(__dirname, '../OpenSpecDashboard.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).not.toMatch(/\.noticesGroup/);
    expect(cssContent).not.toMatch(/\.noticesList/);
    expect(cssContent).not.toMatch(/\.centerAttentionBanner/);
  });

  it('el aviso de rama SÍ se monta cuando la rama no coincide, y no lleva el encabezado «Avisos» (7.14, 7.16)', async () => {
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

    const snapshotWithChange: PipelineSnapshot = {
      ...dummySnapshot,
      openSpec: {
        ...dummySnapshot.openSpec!,
        selectedChangeId: 'change-1',
        activeChanges: [
          {
            changeId: 'change-1',
            status: { schemaName: 'spec-driven', isComplete: false, isPlanningComplete: true, artifacts: [] },
            tasks: [{ id: '1', line: 10, text: 'Tarea 1', completed: false }],
          } as any,
        ],
      },
    };

    const { container } = render(
      <OpenSpecDashboard
        snapshot={snapshotWithChange}
        repoPath="C:\\repo"
        currentBranch="main"
        workingTreeClean={true}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    const enterBtn = screen.getByRole('button', { name: /Entrar|Abrir/i });
    fireEvent.click(enterBtn);

    // 1. ChangeBranchNotice se monta directamente en workArea arriba de «Siguiente paso»
    const branchNotice = container.querySelector('section[data-kind="branch"]');
    expect(branchNotice).not.toBeNull();

    const nextStepHeading = await screen.findByRole('heading', { name: /Siguiente paso/i, level: 4 });
    const nextStepBlock = nextStepHeading.parentElement!;

    // branchNotice precede a nextStepBlock
    expect(branchNotice!.compareDocumentPosition(nextStepBlock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // 2. NO existe ningún encabezado de «Avisos»
    expect(screen.queryByRole('heading', { name: /Avisos/i, level: 4 })).toBeNull();
    expect(screen.queryByText('Avisos')).toBeNull();

    vi.unstubAllGlobals();
  });

  it('sin cambio elegido el centro no monta nada arriba de la pantalla de inicio (7.14, 7.16)', async () => {
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

    const snapshotWithoutChange: PipelineSnapshot = {
      ...dummySnapshot,
      openSpec: {
        ...dummySnapshot.openSpec!,
        selectedChangeId: null,
      },
    };

    usePipelineStore.setState({ selectedChangeId: null });

    const { container } = render(
      <OpenSpecDashboard
        snapshot={snapshotWithoutChange}
        repoPath="C:\\repo"
        currentBranch="main"
        workingTreeClean={true}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    // 1. Sin cambio elegido no hay avisos en el centro
    expect(screen.queryByRole('heading', { name: /Avisos/i, level: 4 })).toBeNull();
    expect(screen.queryByText(/OpenSpec requiere atención/i)).toBeNull();

    // 2. El primer elemento de main es la pantalla de inicio
    const mainEl = container.querySelector('main');
    expect(mainEl).not.toBeNull();
    const firstSectionInMain = mainEl!.firstElementChild;
    expect(firstSectionInMain?.className).toContain('startScreen');

    vi.unstubAllGlobals();
  });

  it('la franja enciende con CADA UNA de las tres causas por separado: desactualizada, sin inicializar, divergente (7.15, 7.16)', async () => {
    // Causa 1: integración desactualizada
    const outdatedStatus: OpenSpecEngineStatus = {
      ...dummyStatusOutdated,
      integrationState: 'outdated',
      repoState: 'initialized',
      divergence: { isDivergent: false, reason: null, overallStatus: 'convergent', globalProfileClass: 'core', repoProfileClass: 'core' },
    };

    const getStatusMock = vi.fn().mockResolvedValue(outdatedStatus);
    vi.stubGlobal('window', {
      api: {
        pipelineOpenSpec: {
          getEngineStatus: getStatusMock,
          checkLatestVersion: vi.fn().mockResolvedValue(null),
        },
      },
    });

    const { unmount: unmount1 } = render(
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

    const chipOutdated = await screen.findByRole('status', { name: /OpenSpec v1\.8\.0/i });
    expect(chipOutdated.className).toMatch(/text-warning/);
    expect(chipOutdated.getAttribute('title')).toMatch(/desactualizada/i);
    unmount1();

    // Causa 2: repositorio sin inicializar
    const notInitStatus: OpenSpecEngineStatus = {
      ...dummyStatusOutdated,
      integrationState: 'up-to-date',
      repoState: 'not-initialized',
      divergence: { isDivergent: false, reason: null, overallStatus: 'convergent', globalProfileClass: 'core', repoProfileClass: 'core' },
    };
    getStatusMock.mockResolvedValue(notInitStatus);

    const { unmount: unmount2 } = render(
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

    const chipNotInit = await screen.findByRole('status', { name: /OpenSpec v1\.8\.0/i });
    expect(chipNotInit.className).toMatch(/text-warning/);
    expect(chipNotInit.getAttribute('title')).toMatch(/no está inicializado/i);
    unmount2();

    // Causa 3: divergente
    const divergentStatus: OpenSpecEngineStatus = {
      ...dummyStatusOutdated,
      integrationState: 'up-to-date',
      repoState: 'initialized',
      divergence: {
        isDivergent: true,
        reason: { kind: 'profile-mismatch', globalProfileClass: 'custom', repoProfileClass: 'core' },
        overallStatus: 'divergent',
        globalProfileClass: 'custom',
        repoProfileClass: 'core',
      },
    };
    getStatusMock.mockResolvedValue(divergentStatus);

    const { unmount: unmount3 } = render(
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

    const chipDivergent = await screen.findByRole('status', { name: /OpenSpec v1\.8\.0/i });
    expect(chipDivergent.className).toMatch(/text-warning/);
    expect(chipDivergent.getAttribute('title')).toMatch(/divergen/i);
    unmount3();

    // Caso limpio: convergente y al día
    const cleanStatus: OpenSpecEngineStatus = {
      ...dummyStatusOutdated,
      integrationState: 'up-to-date',
      repoState: 'initialized',
      divergence: { isDivergent: false, reason: null, overallStatus: 'convergent', globalProfileClass: 'core', repoProfileClass: 'core' },
    };
    getStatusMock.mockResolvedValue(cleanStatus);

    const { unmount: unmount4 } = render(
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

    const chipClean = await screen.findByRole('status', { name: /OpenSpec v1\.8\.0/i });
    expect(chipClean.className).not.toMatch(/text-warning/);
    unmount4();

    vi.unstubAllGlobals();
  });

  it('con divergencia y sin nada más, el centro NO avisa Y la sección enciende el triángulo (7.13, 7.16)', async () => {
    const divergenceStatus: OpenSpecEngineStatus = {
      ...dummyStatusOutdated,
      integrationState: 'up-to-date',
      divergence: {
        isDivergent: true,
        reason: {
          kind: 'profile-mismatch',
          globalProfileClass: 'custom',
          repoProfileClass: 'core',
        },
        overallStatus: 'divergent',
        globalProfileClass: 'custom',
        repoProfileClass: 'core',
      },
    };

    vi.stubGlobal('window', {
      api: {
        pipelineOpenSpec: {
          getEngineStatus: vi.fn().mockResolvedValue(divergenceStatus),
          checkLatestVersion: vi.fn().mockResolvedValue(null),
        },
      },
    });

    const snapshotDivergent: PipelineSnapshot = {
      ...dummySnapshot,
      openSpec: {
        ...dummySnapshot.openSpec!,
        selectedChangeId: null,
        openSpecTools: [{ toolId: 'git', label: 'Git', directory: '.git', configured: true }],
        openSpecPresent: true,
      },
    };

    // 1. Centro (OpenSpecDashboard) -> NO monta avisos
    const { unmount: unmountCenter } = render(
      <OpenSpecDashboard
        snapshot={snapshotDivergent}
        repoPath="C:\\repo"
        currentBranch="main"
        workingTreeClean={true}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    expect(screen.queryByRole('heading', { name: /Avisos/i, level: 4 })).toBeNull();
    expect(screen.queryByText(/OpenSpec requiere atención/i)).toBeNull();

    unmountCenter();

    // 2. Sección lateral (OpenSpecInspector) -> SÍ enciende el triángulo
    const { unmount: unmountSection } = render(
      <OpenSpecInspector repoPath="C:\\repo" snapshot={snapshotDivergent} />,
    );

    const toolsBtn = await screen.findByRole('button', { name: /Herramientas|tools/i });
    const toolsSectionHeader = toolsBtn.parentElement!;
    const warningIcon = await within(toolsSectionHeader).findByRole('img', {
      name: /Necesita atención|needsAttention/i,
    });
    expect(warningIcon).toBeTruthy();
    expect(warningIcon.getAttribute('aria-hidden')).toBeNull();

    unmountSection();
    vi.unstubAllGlobals();
  });

  it('con herramienta sin configurar y sin nada más, el centro NO avisa Y la sección enciende el triángulo (7.13, 7.16)', async () => {
    const cleanEngineStatus: OpenSpecEngineStatus = {
      ...dummyStatusOutdated,
      integrationState: 'up-to-date',
      divergence: {
        isDivergent: false,
        reason: null,
        overallStatus: 'convergent',
        globalProfileClass: 'core',
        repoProfileClass: 'core',
      },
    };

    vi.stubGlobal('window', {
      api: {
        pipelineOpenSpec: {
          getEngineStatus: vi.fn().mockResolvedValue(cleanEngineStatus),
          checkLatestVersion: vi.fn().mockResolvedValue(null),
        },
      },
    });

    const snapshotUnconfiguredTool: PipelineSnapshot = {
      ...dummySnapshot,
      openSpec: {
        ...dummySnapshot.openSpec!,
        selectedChangeId: null,
        openSpecTools: [{ toolId: 'custom-tool', label: 'Custom Tool', directory: '.custom', configured: false }],
        openSpecPresent: true,
      },
    };

    // 1. Centro (OpenSpecDashboard) -> NO monta avisos
    const { unmount: unmountCenter } = render(
      <OpenSpecDashboard
        snapshot={snapshotUnconfiguredTool}
        repoPath="C:\\repo"
        currentBranch="main"
        workingTreeClean={true}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    expect(screen.queryByRole('heading', { name: /Avisos/i, level: 4 })).toBeNull();
    expect(screen.queryByText(/herramienta.*sin configurar/i)).toBeNull();

    unmountCenter();

    // 2. Sección lateral (OpenSpecInspector) -> SÍ enciende el triángulo
    const { unmount: unmountSection } = render(
      <OpenSpecInspector repoPath="C:\\repo" snapshot={snapshotUnconfiguredTool} />,
    );

    const toolsBtn = await screen.findByRole('button', { name: /Herramientas|tools/i });
    const toolsSectionHeader = toolsBtn.parentElement!;
    const warningIcon = await within(toolsSectionHeader).findByRole('img', {
      name: /Necesita atención|needsAttention/i,
    });
    expect(warningIcon).toBeTruthy();
    expect(warningIcon.getAttribute('aria-hidden')).toBeNull();

    unmountSection();
    vi.unstubAllGlobals();
  });

  it('el centro y la sección comparten la misma condición de atención ante estado limpio (7.13, 7.15, 7.16)', async () => {
    const cleanEngineStatus: OpenSpecEngineStatus = {
      ...dummyStatusOutdated,
      integrationState: 'up-to-date',
      divergence: {
        isDivergent: false,
        reason: null,
        overallStatus: 'convergent',
        globalProfileClass: 'core',
        repoProfileClass: 'core',
      },
    };

    vi.stubGlobal('window', {
      api: {
        pipelineOpenSpec: {
          getEngineStatus: vi.fn().mockResolvedValue(cleanEngineStatus),
          checkLatestVersion: vi.fn().mockResolvedValue(null),
        },
      },
    });

    const snapshotClean: PipelineSnapshot = {
      ...dummySnapshot,
      openSpec: {
        ...dummySnapshot.openSpec!,
        selectedChangeId: null,
        openSpecTools: [{ toolId: 'git', label: 'Git', directory: '.git', configured: true }],
        openSpecPresent: true,
      },
    };

    // 1. Centro limpio -> NO muestra sección de avisos
    const { unmount: unmountCenter } = render(
      <OpenSpecDashboard
        snapshot={snapshotClean}
        repoPath="C:\\repo"
        currentBranch="main"
        workingTreeClean={true}
        projection={null}
        runtimeHistory={[]}
        onPauseAfterTask={vi.fn()}
        onRespondDecision={vi.fn()}
      />,
    );

    expect(screen.queryByRole('heading', { name: /Avisos/i, level: 4 })).toBeNull();
    unmountCenter();

    // 2. Sección limpia -> NO muestra ícono de advertencia
    const { unmount: unmountSection } = render(
      <OpenSpecInspector repoPath="C:\\repo" snapshot={snapshotClean} />,
    );

    const toolsBtn = await screen.findByRole('button', { name: /Herramientas|tools/i });
    const toolsSectionHeader = toolsBtn.parentElement!;
    const warningIcon = toolsSectionHeader.querySelector('svg[aria-label="Necesita atención"], svg[aria-label="pipeline.openspec.engine.generalStatus.needsAttention"]');
    expect(warningIcon).toBeNull();

    unmountSection();
    vi.unstubAllGlobals();
  });
});
