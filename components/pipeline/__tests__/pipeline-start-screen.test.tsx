// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import { OpenSpecSidebarNav } from '../OpenSpecSidebarNav';
import { usePipelineStore } from '@/lib/pipeline-store';
import { useNewChangeDraftStore } from '@/lib/new-change-draft-store';
import type { PipelineSnapshot } from '../pipeline-view-state';

beforeEach(() => {
  usePipelineStore.setState({
    selectedChangeId: null,
    openSpecificationId: null,
    prepareOpen: false,
  });
  useNewChangeDraftStore.setState({ drafts: {} });
});

/**
 * La pantalla de entrada del repositorio.
 *
 * El caso que motivó el trabajo no es éste repositorio sino `C:\www\odontoPau`:
 * dos cambios activos, cero archivados, cero especificaciones y 83% de las
 * tareas hechas. El encabezado contaba tres ceros y un porcentaje, el panel
 * entraba al primer cambio, y todo eso junto se leía como un repositorio vacío
 * cuando en realidad estaba casi terminado. Un repositorio que todavía no
 * archivó nada es el estado normal de cualquier proyecto antes de su primer
 * archivado.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

function change(changeId: string, done: number, total: number) {
  return {
    changeId,
    intent: `intención de ${changeId}`,
    tasks: Array.from({ length: total }, (_unused, index) => ({
      id: `${changeId}-${index}`,
      text: `${index}.1 tarea`,
      completed: index < done,
      line: index + 1,
      sourceRef: `tasks.md:${index + 1}`,
    })),
    proposalExists: true,
    designExists: true,
    specsCount: 1,
    validation: 'unknown' as const,
    artifacts: null,
  };
}

function snapshot(overrides: {
  activeChanges?: ReturnType<typeof change>[];
  archivedCount?: number;
  specificationsCount?: number;
  selectedChangeId?: string | null;
} = {}): PipelineSnapshot {
  return {
    schemaVersion: '1.0',
    repoId: 'repo-1',
    availableSources: ['git'],
    hermesConnected: false,
    hasPipelineActivity: true,
    now: {
      headlineKey: 'x', runtime: null, role: null, taskLabel: null,
      tasksDone: null, tasksTotal: null, elapsedMs: null,
      costUsd: null, costBasis: 'unknown', needsHuman: false,
    },
    stations: [],
    decisions: [],
    agents: [],
    activity: [],
    economy: { reasoningAvailable: null } as PipelineSnapshot['economy'],
    diffs: [],
    openSpec: {
      selectedChangeId: overrides.selectedChangeId ?? null,
      activeChanges: overrides.activeChanges ?? [change('primero', 5, 6), change('segundo', 1, 6)],
      archivedChanges: Array.from({ length: overrides.archivedCount ?? 0 }, (_unused, index) => ({
        changeId: `viejo-${index}`,
        archivedAt: '2026-08-01',
        sourceRef: `openspec/changes/archive/viejo-${index}`,
        artifacts: null,
      })),
      specifications: Array.from({ length: overrides.specificationsCount ?? 0 }, (_unused, index) => ({
        specificationId: `capacidad-${index}`,
        requirements: 3,
        sourceRef: `openspec/specs/capacidad-${index}/spec.md`,
      })),
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  } as PipelineSnapshot;
}

function renderDashboard(state: PipelineSnapshot = snapshot(), onSelectChange = vi.fn()) {
  const result = render(
    <OpenSpecDashboard
      snapshot={state}
      repoPath="C:/repo"
      currentBranch="main"
      workingTreeClean
      leftOpen={false}
      rightOpen={false}
      leftWidth={320}
      rightWidth={320}
      onResizeLeft={() => undefined}
      onResizeRight={() => undefined}
      projection={null}
      runtimeHistory={[]}
      onRefresh={() => undefined}
      onSelectChange={onSelectChange}
      onPauseAfterTask={() => undefined}
      onRespondDecision={() => undefined}
    />,
  );
  return Object.assign(onSelectChange, result);
}

afterEach(cleanup);

describe('pantalla de entrada del repositorio', () => {
  it('con varios cambios activos y sin elección previa, no entra a ninguno', () => {
    renderDashboard();

    expect(screen.getByText('pipeline.openspec.start.title')).toBeTruthy();
    // Ningún encabezado de cambio activo: no se entró a nada.
    expect(screen.queryByText(/openspec\.change\.active/)).toBeNull();
    // Y los dos están listados, con su control para entrar.
    expect(screen.getAllByRole('button', { name: /openspec\.start\.enter/ })).toHaveLength(2);
  });

  it('el estado de odontoPau no se lee como vacío', () => {
    // Dos cambios activos, cero archivados, cero especificaciones, mayoría de
    // tareas hechas. Lo que corresponde decir es que todavía no se archivó nada.
    renderDashboard(snapshot({
      activeChanges: [change('uno', 5, 6), change('dos', 5, 6)],
      archivedCount: 0,
      specificationsCount: 0,
    }));

    expect(screen.getByText('pipeline.openspec.start.neverArchived')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.start.specsPending')).toBeTruthy();
    // El avance real de cada cambio se muestra, en vez de quedar detrás de una
    // cuenta en cero.
    expect(screen.getAllByText(/openspec\.start\.tasks.*"done":5.*"total":6/)).toHaveLength(2);
    // Y el cero de archivados no se presenta como una cifra más.
    expect(screen.queryByText(/openspec\.start\.archivedCount/)).toBeNull();
  });

  it('un repositorio sin ningún trabajo abierto se distingue del anterior', () => {
    renderDashboard(snapshot({ activeChanges: [], archivedCount: 3, specificationsCount: 2 }));

    expect(screen.getByText('pipeline.openspec.start.noActive')).toBeTruthy();
    expect(screen.getByText(/openspec\.start\.archivedCount.*"count":3/)).toBeTruthy();
    expect(screen.queryByText('pipeline.openspec.start.neverArchived')).toBeNull();
  });

  it('la correspondencia con la rama se señala sin entrar al cambio', () => {
    const onSelectChange = renderDashboard(snapshot({ selectedChangeId: 'segundo' }));

    expect(screen.getByText('pipeline.openspec.start.branchMatch')).toBeTruthy();
    expect(screen.queryByText(/openspec\.change\.active/)).toBeNull();
    expect(onSelectChange).not.toHaveBeenCalled();
  });

  it('los cambios se ordenan por avance descendente', () => {
    renderDashboard(snapshot({
      activeChanges: [change('atrasado', 1, 10), change('avanzado', 9, 10)],
    }));

    const ids = screen.getAllByRole('listitem').map((item) => item.querySelector('strong')?.textContent);
    expect(ids).toEqual(['avanzado', 'atrasado']);
  });

  it('el estado del repositorio con cambios activos muestra la lista en curso y no declara que esté vacío', () => {
    renderDashboard();

    expect(screen.getByText('pipeline.openspec.start.inProgress')).toBeTruthy();
    expect(screen.queryByText('pipeline.openspec.start.noActive')).toBeNull();
  });

  it('sin ningún cambio activo declara explícitamente que no hay cambios en curso', () => {
    renderDashboard(snapshot({ activeChanges: [] }));

    expect(screen.getByText('pipeline.openspec.start.noActive')).toBeTruthy();
  });

  it('las tareas pendientes se despliegan a pedido y no listan las hechas', () => {
    renderDashboard(snapshot({ activeChanges: [change('uno', 2, 4)] }));

    // Plegado por defecto: una pantalla de estado no es una lista de tareas.
    expect(screen.queryAllByText(/^2\.1 tarea$/)).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /openspec\.start\.pending/ }));

    // Sólo las pendientes: las dos primeras están hechas.
    expect(screen.getByText('2.1 tarea')).toBeTruthy();
    expect(screen.getByText('3.1 tarea')).toBeTruthy();
    expect(screen.queryByText('0.1 tarea')).toBeNull();
  });

  it('se puede abrir un archivado que no está entre los ocho recientes', () => {
    // La barra lateral corta en ocho; con más, el resto no era alcanzable.
    const onSelectChange = renderDashboard(snapshot({ archivedCount: 12 }));

    fireEvent.click(screen.getByRole('button', { name: /openspec\.start\.archivedCount/ }));
    fireEvent.click(screen.getByRole('button', { name: /viejo-11/ }));

    expect(onSelectChange).toHaveBeenCalledWith('viejo-11');
  });

  it('los conteos concuerdan en número', () => {
    // «Ver las 1 que faltan» delataba que nadie había mirado el caso de uno, y
    // el caso de uno es el más frecuente al final de cualquier trabajo.
    renderDashboard(snapshot({
      activeChanges: [change('casi', 3, 4)],
      archivedCount: 1,
    }));

    expect(screen.getByText(/openspec\.start\.pending\.one/)).toBeTruthy();
    expect(screen.queryByText(/openspec\.start\.pending:/)).toBeNull();
    expect(screen.getByText(/openspec\.start\.archivedCount\.one/)).toBeTruthy();
  });

  it('con varias unidades usa la variante plural', () => {
    renderDashboard(snapshot({
      activeChanges: [change('lejos', 1, 4)],
      archivedCount: 5,
    }));

    expect(screen.getByText(/openspec\.start\.pending:.*"count":3/)).toBeTruthy();
    expect(screen.getByText(/openspec\.start\.archivedCount:.*"count":5/)).toBeTruthy();
    expect(screen.queryByText(/openspec\.start\.pending\.one/)).toBeNull();
  });

  it('un cambio abierto no muestra la secuencia de etapas ni el contador de pasos', () => {
    // OpenSpec abandonó el modelo de fases: se puede trabajar cualquier
    // artefacto habilitado en cualquier momento. «Paso 3 de 5» enseñaba un orden
    // obligatorio que no existe, y la barra lo dibujaba con tildes y una etapa
    // «actual». El estado por artefacto lo da el grafo del CLI.
    renderDashboard();
    fireEvent.click(screen.getAllByRole('button', { name: /openspec\.start\.enter/ })[0]);

    expect(screen.queryByText(/openspec\.lifecycle\./)).toBeNull();
    expect(screen.queryByText(/pipeline\.next\.step/)).toBeNull();
    expect(document.querySelector('ol[aria-label*="lifecycle"]')).toBeNull();
  });

  it('el bloque de empezar un cambio no está dos veces', () => {
    const { container } = renderDashboard();

    // 1. En el cuerpo de la pantalla de inicio NO existe el bloque de empezar un cambio
    const startBody = container.querySelector('div[class*="startBody"]');
    expect(startBody).toBeTruthy();
    expect(startBody?.querySelector('section[class*="startNewChangeBlock"]')).toBeNull();

    // El cuerpo queda con los cambios en curso, que es lo que la persona vino a mirar
    expect(screen.getByText('pipeline.openspec.start.inProgress')).toBeTruthy();
    const bodyHeadings = Array.from(startBody!.querySelectorAll('h4')).map((h) => h.textContent);
    expect(bodyHeadings.some((txt) => txt?.includes('pipeline.openspec.start.newChange'))).toBe(false);

    // 2. En el panel intercambiador SÍ existe la opción de empezar un cambio
    const rail = container.querySelector('nav[class*="switcherRail"]');
    expect(rail).toBeTruthy();
    const newChangeBtn = rail?.querySelector('button[data-view-id="new-change"]');
    expect(newChangeBtn).toBeTruthy();

    // 3. En todo el DOM montado sólo existe un control para empezar un cambio (el del panel)
    const allButtons = screen.getAllByRole('button', { name: /openspec\.start\.newChange/ });
    expect(allButtons).toHaveLength(1);
    expect(allButtons[0]).toBe(newChangeBtn);
  });

  it('entrar a un cambio lo muestra, y se puede volver', () => {
    const onSelectChange = renderDashboard();

    fireEvent.click(screen.getAllByRole('button', { name: /openspec\.start\.enter/ })[0]);
    expect(screen.getByText(/openspec\.change\.active/)).toBeTruthy();
    expect(onSelectChange).toHaveBeenCalledWith('primero');

    fireEvent.click(screen.getByRole('button', { name: /openspec\.start\.back/ }));
    expect(screen.getByText('pipeline.openspec.start.title')).toBeTruthy();
  });

  it('los contadores se mudaron al lateral: ya no están en el cuerpo y se leen visibles en el navegador', () => {
    // La intención es la misma que la prueba original: el dato no se oculta sino que se mudó al lateral.
    const testSnapshot = snapshot({
      activeChanges: [change('uno', 2, 4)],
      specificationsCount: 3,
    });

    render(
      <div>
        <OpenSpecDashboard
          snapshot={testSnapshot}
          repoPath="C:/repo"
          currentBranch="main"
          workingTreeClean
          leftOpen={true}
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
        />
        <OpenSpecSidebarNav repoPath="C:/repo" snapshot={testSnapshot} />
      </div>,
    );

    // 1. Ya NO se montan en el cuerpo
    const factsDl = document.querySelector('dl[class*="summaryFacts"]');
    expect(factsDl).toBeNull();

    // 2. El porcentaje global SÍ se lee en el rótulo de columna del lateral, con su rótulo visible
    const sidebarNav = screen.getByTestId('openspec-sidebar-nav');
    expect(sidebarNav).toBeTruthy();
    expect(screen.getByText('sidebar.changeCycle')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();

    // 3. El contador de especificaciones se lee en su sección del lateral
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.specifications.title')).toBeTruthy();
  });

  it('el selector de modo en el formulario nuevo cambio presenta las dos intenciones sin redundancia', () => {
    const { container } = renderDashboard();

    // Abrimos el formulario desde el panel
    const rail = container.querySelector('nav[class*="switcherRail"]');
    fireEvent.click(rail!.querySelector('button[data-view-id="new-change"]')!);

    const proposeBtn = screen.getByRole('button', { name: /pipeline\.newChange\.intent\.propose/ });
    const exploreBtn = screen.getByRole('button', { name: /pipeline\.newChange\.intent\.explore/ });

    expect(proposeBtn).toBeTruthy();
    expect(exploreBtn).toBeTruthy();
    expect(proposeBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('el formulario de nuevo cambio se renderiza soberano en el cuerpo y no como modal o diálogo flotante', () => {
    const { container } = renderDashboard(snapshot({ activeChanges: [change('en-progreso', 3, 5)] }));

    // La lista está en pantalla
    expect(screen.getByText('en-progreso')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.start.inProgress')).toBeTruthy();

    // Abrimos el formulario desde el panel intercambiador
    fireEvent.click(screen.getByRole('button', { name: /openspec\.start\.newChange/ }));

    // El formulario NO se abre en un diálogo modal ni overlay flotante
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.querySelector('[class*="startNewChangeOverlay"]')).toBeNull();

    // El formulario ocupa el cuerpo de forma soberana
    expect(screen.getByRole('heading', { name: 'pipeline.newChange.title' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'pipeline.newChange.close' })).toBeTruthy();
  });

  it('el formulario se puede cerrar con «Cerrar sin empezar» sin haber creado nada', () => {
    renderDashboard(snapshot({ activeChanges: [change('en-progreso', 3, 5)] }));

    // Abrir formulario desde el panel
    fireEvent.click(screen.getByRole('button', { name: /openspec\.start\.newChange/ }));
    expect(screen.getByRole('heading', { name: 'pipeline.newChange.title' })).toBeTruthy();

    // Cerrar sin empezar
    const closeBtn = screen.getByRole('button', { name: 'pipeline.newChange.close' });
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);

    // El formulario se retira y vuelve la lista de cambios en curso
    expect(screen.queryByRole('heading', { name: 'pipeline.newChange.title' })).toBeNull();
    expect(screen.getByText('en-progreso')).toBeTruthy();
    // El borrador está limpio y cerrado
    expect(useNewChangeDraftStore.getState().drafts['C:/repo']?.open).toBeFalsy();
  });

  it('«CERRADOS» no ocupa franja al pie de la pantalla y vive en el intercambiador de vistas', () => {
    const { container } = render(
      <OpenSpecDashboard
        snapshot={snapshot({ archivedCount: 2 })}
        repoPath="C:/repo"
        currentBranch="main"
        workingTreeClean
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

    // El bloque de archivados ya no es una sección estática con título h4 al pie
    const startScreenEl = container.querySelector('section[class*="startScreen"]');
    expect(startScreenEl).toBeTruthy();

    // El bloque principal en inicio es CAMBIOS EN CURSO (startMainBlock)
    const mainBlock = container.querySelector('div[class*="startMainBlock"]');
    expect(mainBlock).toBeTruthy();

    // Los archivados ya no tienen un menú desplegable hacia abajo en el encabezado
    const headerEl = container.querySelector('header[class*="startHeader"]');
    expect(headerEl).toBeTruthy();
    expect(headerEl?.querySelector('div[class*="startArchivedAccess"]')).toBeNull();

    // Viven como entrada accesible en el riel intercambiador lateral
    const railEl = container.querySelector('nav[class*="switcherRail"]');
    expect(railEl).toBeTruthy();
    const archivedBtn = railEl?.querySelector('button[data-view-id="archived"]');
    expect(archivedBtn).toBeTruthy();
  });

  it('elegir una entrada del panel intercambiador traslada la vista elegida al cuerpo y la anterior al panel', () => {
    const { container } = renderDashboard(
      snapshot({
        activeChanges: [change('en-progreso', 3, 5)],
        archivedCount: 2,
      }),
    );

    // Estado inicial: cuerpo muestra «En curso», panel muestra «Archivados» y «Empezar un cambio»
    const railEl = container.querySelector('nav[class*="switcherRail"]');
    expect(railEl).toBeTruthy();

    expect(screen.getByText('en-progreso')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'pipeline.openspec.start.title' })).toBeTruthy();
    expect(railEl?.querySelector('button[data-view-id="archived"]')).toBeTruthy();
    expect(railEl?.querySelector('button[data-view-id="new-change"]')).toBeTruthy();
    expect(railEl?.querySelector('button[data-view-id="in-progress"]')).toBeNull();

    // Conmutamos a «Archivados» desde el riel
    const archivedRailBtn = railEl!.querySelector('button[data-view-id="archived"]') as HTMLButtonElement;
    fireEvent.click(archivedRailBtn);

    // Ahora el cuerpo muestra «Archivados»
    expect(screen.getByRole('heading', { name: 'pipeline.openspec.start.archived' })).toBeTruthy();
    expect(screen.queryByText('en-progreso')).toBeNull();

    // Y el panel ahora muestra «En curso» y ya no muestra «Archivados»
    expect(railEl?.querySelector('button[data-view-id="in-progress"]')).toBeTruthy();
    expect(railEl?.querySelector('button[data-view-id="archived"]')).toBeNull();

    // Conmutamos de regreso a «En curso» desde el riel
    const inProgressRailBtn = railEl!.querySelector('button[data-view-id="in-progress"]') as HTMLButtonElement;
    fireEvent.click(inProgressRailBtn);

    // El cuerpo vuelve a mostrar «En curso» con sus cambios
    expect(screen.getByText('en-progreso')).toBeTruthy();
    expect(railEl?.querySelector('button[data-view-id="archived"]')).toBeTruthy();
    expect(railEl?.querySelector('button[data-view-id="in-progress"]')).toBeNull();
  });

  it('la incorporación de una nueva entrada en el intercambiador no desplaza las ranuras previas', () => {
    const { container, rerender } = renderDashboard(
      snapshot({
        activeChanges: [change('en-progreso', 3, 5)],
        archivedCount: 2,
      }),
    );

    const railEl = container.querySelector('nav[class*="switcherRail"]');
    expect(railEl).toBeTruthy();

    // Comprobamos que la ranura 1 contiene «archived» y la ranura 2 contiene «new-change»
    const slot1Initial = railEl?.querySelector('div[data-slot="1"] button');
    const slot2Initial = railEl?.querySelector('div[data-slot="2"] button');

    expect(slot1Initial?.getAttribute('data-view-id')).toBe('archived');
    expect(slot2Initial?.getAttribute('data-view-id')).toBe('new-change');

    // Cambiamos el snapshot o añadimos datos: las ranuras estables preservan sus posiciones relativas
    rerender(
      <OpenSpecDashboard
        snapshot={snapshot({
          activeChanges: [change('en-progreso', 3, 5), change('otro-cambio', 1, 2)],
          archivedCount: 5,
        })}
        repoPath="C:/repo"
        currentBranch="main"
        workingTreeClean
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

    const slot1After = railEl?.querySelector('div[data-slot="1"] button');
    const slot2After = railEl?.querySelector('div[data-slot="2"] button');

    expect(slot1After?.getAttribute('data-view-id')).toBe('archived');
    expect(slot2After?.getAttribute('data-view-id')).toBe('new-change');
  });

  it('preserva el estado de tareas desplegadas y borrador al conmutar vistas en el cuerpo', () => {
    const { container } = renderDashboard(
      snapshot({
        activeChanges: [change('en-progreso', 1, 3)],
        archivedCount: 2,
      }),
    );

    // 1. En «in-progress», desplegamos las tareas pendientes del cambio
    const pendingToggle = screen.getByRole('button', { name: /pipeline\.openspec\.start\.pending/ });
    expect(pendingToggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(pendingToggle);
    expect(pendingToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('1.1 tarea')).toBeTruthy();

    // 2. Conmutamos a «new-change» mediante el botón de nuevo cambio
    const newChangeRailBtn = container.querySelector('button[data-view-id="new-change"]') as HTMLButtonElement;
    fireEvent.click(newChangeRailBtn);

    // Escribimos un objetivo en el borrador
    const objectiveInput = screen.getByRole('textbox', { name: /pipeline\.newChange\.propose\.objective/ });
    fireEvent.change(objectiveInput, { target: { value: 'Refactorizar vista con ViewSwitcherRail' } });
    expect(useNewChangeDraftStore.getState().drafts['C:/repo']?.objective).toBe('Refactorizar vista con ViewSwitcherRail');

    // 3. Conmutamos de regreso a «in-progress»
    const inProgressRailBtn = container.querySelector('button[data-view-id="in-progress"]') as HTMLButtonElement;
    fireEvent.click(inProgressRailBtn);

    // Comprobamos que el despliegue de tareas pendientes SE MANTIENE
    expect(screen.getByText('1.1 tarea')).toBeTruthy();

    // 4. Volvemos a «new-change»
    const newChangeAgain = container.querySelector('button[data-view-id="new-change"]') as HTMLButtonElement;
    fireEvent.click(newChangeAgain);

    // Comprobamos que el texto del objetivo SE MANTIENE
    const restoredObjective = screen.getByRole('textbox', { name: /pipeline\.newChange\.propose\.objective/ });
    expect((restoredObjective as HTMLTextAreaElement).value).toBe('Refactorizar vista con ViewSwitcherRail');
  });

  it('permite colapsar el contenido del panel mediante la sección desplegable y reabrirlo', () => {
    const { container } = renderDashboard(
      snapshot({
        activeChanges: [change('en-progreso', 3, 5)],
        archivedCount: 2,
      }),
    );

    const railEl = container.querySelector('nav[class*="switcherRail"]');
    expect(railEl).toBeTruthy();
    expect(railEl?.getAttribute('data-collapsed')).toBe('false');

    // Encabezado de la sección desplegable (SidebarSection)
    const sectionToggleBtn = screen.getByRole('button', { name: /pipeline\.switcher\.views/ });
    expect(sectionToggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(railEl?.querySelector('button[data-view-id="archived"]')).toBeTruthy();

    // Plegamos la sección interna
    fireEvent.click(sectionToggleBtn);
    expect(railEl?.getAttribute('data-collapsed')).toBe('true');
    expect(sectionToggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(railEl?.querySelector('button[data-view-id="archived"]')).toBeNull();

    // Desplegamos nuevamente
    fireEvent.click(sectionToggleBtn);
    expect(railEl?.getAttribute('data-collapsed')).toBe('false');
    expect(sectionToggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(railEl?.querySelector('button[data-view-id="archived"]')).toBeTruthy();
  });

  it('con el panel oculto, el contenido central ocupa el ancho liberado; con el panel visible, el contenido se corre y sigue centrado', () => {
    const { container } = renderDashboard();

    // 1. Estado inicial: panel visible (isSwitcherOpen === true)
    const toggleBtn = screen.getByRole('button', { name: 'pipeline.switcher.toggle' });
    expect(toggleBtn).toBeTruthy();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    const railVisible = container.querySelector('nav[class*="switcherRail"]');
    expect(railVisible).toBeTruthy();

    const startBody = container.querySelector('div[class*="startBody"]') as HTMLElement;
    expect(startBody).toBeTruthy();

    const startScreen = container.querySelector('section[class*="startScreen"]') as HTMLElement;
    expect(startScreen).toBeTruthy();

    // 2. Alternamos: ocultamos el panel
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    // El panel desaparece del DOM liberando su ancho
    expect(container.querySelector('nav[class*="switcherRail"]')).toBeNull();

    // El cuerpo central permanece montado y centrado
    expect(container.querySelector('div[class*="startBody"]')).toBeTruthy();
    expect(container.querySelector('section[class*="startScreen"]')).toBeTruthy();

    // 3. Volvemos a activar el panel: se monta y hace lugar al panel
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('nav[class*="switcherRail"]')).toBeTruthy();
  });

  it('el panel no impone una altura fija', () => {
    const { container } = renderDashboard();

    const railEl = container.querySelector('nav[class*="switcherRail"]') as HTMLElement;
    expect(railEl).toBeTruthy();

    // 1. En el DOM montado no tiene estilo de altura rígido inline
    expect(railEl.style.height).toBe('');

    // 2. Comprobamos que el módulo CSS declara height: auto y no impone height: 100%
    const cssPath = path.resolve(__dirname, '../OpenSpecDashboard.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    const switcherMatch = /\.switcherRail\s*\{([^}]+)\}/.exec(cssContent);
    expect(switcherMatch).not.toBeNull();
    const switcherRules = switcherMatch![1];

    expect(switcherRules).toContain('height: auto');
    expect(switcherRules).toContain('align-self: flex-start');
    expect(switcherRules).not.toContain('height: 100%');
  });
});
