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

    // 2. Avisos
    const noticesHeading = await screen.findByRole('heading', { name: /Avisos/i, level: 4 });
    expect(noticesHeading).toBeTruthy();

    // 3. Tareas del cambio
    const tasksHeading = await screen.findByRole('heading', { name: /Tareas del cambio/i, level: 4 });
    expect(tasksHeading).toBeTruthy();

    // 4. Lanzar agente (abrir lanzador haciendo clic en "Continuar con")
    const continueBtn = screen.getByRole('button', { name: /Continuar con/i });
    fireEvent.click(continueBtn);
    const launcherHeading = await screen.findByRole('heading', { name: /Lanzar agente/i, level: 4 });
    expect(launcherHeading).toBeTruthy();

    // 5. Evidencia (pestaña Artefactos)
    const artifactsTab = screen.getByRole('tab', { name: /Artefactos/i });
    fireEvent.click(artifactsTab);
    const evidenceHeading = await screen.findByRole('heading', { name: /Evidencia/i, level: 4 });
    expect(evidenceHeading).toBeTruthy();

    // 5b. Actividad (pestaña Actividad)
    const activityTab = screen.getByRole('tab', { name: /Actividad/i });
    fireEvent.click(activityTab);
    const activityHeading = await screen.findByRole('heading', { name: /Actividad/i, level: 4 });
    expect(activityHeading).toBeTruthy();

    // Leemos la clase compartida del primer encabezado y comparamos con los demás
    const sharedClass = Array.from(nextStepHeading.classList).find((cls) => cls.includes('blockHeader'));
    expect(sharedClass).toBeDefined();

    expect(Array.from(noticesHeading.classList)).toContain(sharedClass);
    expect(Array.from(launcherHeading.classList)).toContain(sharedClass);
    expect(Array.from(tasksHeading.classList)).toContain(sharedClass);
    expect(Array.from(evidenceHeading.classList)).toContain(sharedClass);
    expect(Array.from(activityHeading.classList)).toContain(sharedClass);

    // Leemos la clase de bloque compartida del primer bloque y comparamos con los demás
    const nextStepBlock = nextStepHeading.parentElement!;
    const noticesBlock = noticesHeading.parentElement!;
    const launcherBlock = launcherHeading.parentElement!;
    const tasksBlock = tasksHeading.parentElement!;
    const evidenceBlock = evidenceHeading.parentElement!;
    const activityBlock = activityHeading.parentElement!;

    const sharedBlockClass = Array.from(nextStepBlock.classList).find((cls) => cls.includes('centerBlock'));
    expect(sharedBlockClass).toBeDefined();

    expect(Array.from(noticesBlock.classList)).toContain(sharedBlockClass);
    expect(Array.from(launcherBlock.classList)).toContain(sharedBlockClass);
    expect(Array.from(tasksBlock.classList)).toContain(sharedBlockClass);
    expect(Array.from(evidenceBlock.classList)).toContain(sharedBlockClass);
    expect(Array.from(activityBlock.classList)).toContain(sharedBlockClass);

    // Cada encabezado contiene su ícono SVG size={13} con aria-hidden="true"
    for (const heading of [nextStepHeading, noticesHeading, launcherHeading, tasksHeading, evidenceHeading, activityHeading]) {
      const svg = heading.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    }

    vi.unstubAllGlobals();
  });

  it('«Avisos» se monta después de «Siguiente paso» con un cambio elegido y antes cuando no hay ninguno (7.8, 7.9)', async () => {
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

    // Caso 1: CON cambio elegido -> «Avisos» va DESPUÉS de «Siguiente paso»
    const { unmount: unmount1 } = render(
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

    const nextStepHeading = await screen.findByRole('heading', { name: /Siguiente paso/i, level: 4 });
    const noticesHeadingWithChange = await screen.findByRole('heading', { name: /Avisos/i, level: 4 });

    // En el DOM montado, noticesHeading sigue a nextStepHeading
    expect(nextStepHeading.compareDocumentPosition(noticesHeadingWithChange) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    unmount1();

    // Caso 2: SIN cambio elegido -> «Avisos» se monta arriba (antes del contenido de bienvenida/inicio)
    const snapshotWithoutChange: PipelineSnapshot = {
      ...dummySnapshot,
      openSpec: {
        ...dummySnapshot.openSpec!,
        selectedChangeId: null,
      },
    };

    usePipelineStore.setState({ selectedChangeId: null });

    const { container: container2 } = render(
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

    const noticesHeadingWithoutChange = await screen.findByRole('heading', { name: /Avisos/i, level: 4 });
    expect(noticesHeadingWithoutChange).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /Siguiente paso/i, level: 4 })).toBeNull();

    // Avisos está en la parte superior de main
    const mainEl = container2.querySelector('main');
    expect(mainEl).not.toBeNull();
    const firstSectionInMain = mainEl!.firstElementChild;
    expect(firstSectionInMain?.getAttribute('aria-label')).toBe('Avisos');

    vi.unstubAllGlobals();
  });

  it('el bloque de avisos anula su margen horizontal dentro de workArea para alinear con el resto de los bloques', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssPath = path.resolve(__dirname, '../OpenSpecDashboard.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Afirmación sobre la regla de estilo: dentro de .workArea, .noticesGroup anula el margen horizontal
    // (el padding horizontal ya lo aporta el contenedor .workArea)
    expect(cssContent).toMatch(/\.workArea\s+\.noticesGroup\s*\{[^}]*margin-inline:\s*0/);

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

    // En el DOM montado con cambio elegido y solapa Trabajo activa:
    const workArea = container.querySelector('div[class*="workArea"]');
    expect(workArea).not.toBeNull();

    const noticesSection = workArea!.querySelector('section[class*="noticesGroup"]');
    const tasksBlock = workArea!.querySelectorAll('div[class*="centerBlock"]')[1]; // Segundo centerBlock = tasks

    expect(noticesSection).not.toBeNull();
    expect(tasksBlock).not.toBeNull();
    // Ambos bloques son hijos directos del mismo contenedor de trabajo
    expect(noticesSection!.parentElement).toBe(workArea);
    expect(tasksBlock!.parentElement).toBe(workArea);

    vi.unstubAllGlobals();
  });
});
