// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import type { PipelineSnapshot } from '../pipeline-view-state';

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
  render(
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
  return onSelectChange;
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

  it('la guía no afirma que no haya cambios cuando los hay', () => {
    // Contradicción que introdujo esta misma pantalla: al no seleccionar ninguno
    // por descarte, la guía leía el estado como un repositorio vacío y lo decía
    // debajo de una lista con cuatro cambios en curso.
    renderDashboard();

    expect(screen.getByText('pipeline.next.noSelection.help')).toBeTruthy();
    expect(screen.queryByText('pipeline.next.noActive.help')).toBeNull();
  });

  it('sin ningún cambio activo la guía sí lo declara', () => {
    renderDashboard(snapshot({ activeChanges: [] }));

    expect(screen.getByText('pipeline.next.noActive.help')).toBeTruthy();
    expect(screen.queryByText('pipeline.next.noSelection.help')).toBeNull();
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

  it('la guía conserva su acción sin el contador', () => {
    // La guía completa vive en la pantalla de entrada; dentro de un cambio
    // abierto queda su ayuda en línea. Retirar el contador no retira ninguna
    // de las dos: siguen diciendo qué conviene hacer.
    renderDashboard();

    expect(screen.getAllByText('pipeline.next.label').length).toBeGreaterThan(0);
    expect(screen.getByText('pipeline.next.noSelection.help')).toBeTruthy();
    expect(screen.queryByText(/pipeline\.next\.step/)).toBeNull();
  });

  it('entrar a un cambio lo muestra, y se puede volver', () => {
    const onSelectChange = renderDashboard();

    fireEvent.click(screen.getAllByRole('button', { name: /openspec\.start\.enter/ })[0]);
    expect(screen.getByText(/openspec\.change\.active/)).toBeTruthy();
    expect(onSelectChange).toHaveBeenCalledWith('primero');

    fireEvent.click(screen.getByRole('button', { name: /openspec\.start\.back/ }));
    expect(screen.getByText('pipeline.openspec.start.title')).toBeTruthy();
  });
});
