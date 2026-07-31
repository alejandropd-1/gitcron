// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import type { PipelineSnapshot } from '../pipeline-view-state';

/**
 * El backend no selecciona un cambio cuando la rama no identifica ninguno y hay
 * varios activos: eso es correcto, no debe adivinar. Pero la vista igual muestra
 * uno, y si no lo informa se lee la evidencia de ninguno: el cambio en pantalla
 * queda con `validation: 'unknown'` y sin artefactos aunque valide.
 *
 * Caso real que lo destapó: rama `fix/openspec-artifacts-selection` con ese
 * cambio ya archivado, cuatro activos sin match, y el archivado deshabilitado
 * por una validación que nunca se corrió.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

function change(changeId: string) {
  return {
    changeId,
    intent: 'una intención',
    tasks: [{ id: `${changeId}-1`, text: '1.1 tarea', completed: true, line: 1, sourceRef: 'tasks.md:1' }],
    proposalExists: true,
    designExists: true,
    specsCount: 1,
    validation: 'unknown' as const,
    artifacts: null,
  };
}

function snapshot(selectedChangeId: string | null): PipelineSnapshot {
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
      selectedChangeId,
      activeChanges: [change('primero'), change('segundo')],
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  } as PipelineSnapshot;
}

function renderDashboard(selectedChangeId: string | null, onSelectChange: (id: string) => void) {
  return render(
    <OpenSpecDashboard
      snapshot={snapshot(selectedChangeId)}
      repoPath="C:/repo"
      currentBranch="fix/una-rama-que-no-matchea"
      workingTreeClean
      leftOpen
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
}

afterEach(cleanup);

describe('sincronización entre el cambio mostrado y el leído', () => {
  it('informa el cambio mostrado cuando la selección automática no resolvió ninguno', async () => {
    const onSelectChange = vi.fn();
    renderDashboard(null, onSelectChange);
    // La vista cae al primer activo para poder mostrar algo: eso deja de ser un
    // secreto, así se lee la evidencia del cambio que efectivamente se ve.
    await vi.waitFor(() => expect(onSelectChange).toHaveBeenCalledWith('primero'));
  });

  it('no informa nada cuando la selección automática ya resolvió', async () => {
    const onSelectChange = vi.fn();
    renderDashboard('primero', onSelectChange);
    await Promise.resolve();
    expect(onSelectChange).not.toHaveBeenCalled();
  });

  /**
   * Desplegado siguiendo a la selección: el detalle ocupa varias veces el alto
   * de un ítem plegado, así que al cambiar de cambio se plegaba el anterior, se
   * liberaba espacio y aparecía otro que estaba fuera de vista. Un elemento que
   * se descubre por rebote de otra acción no está realmente presentado.
   */
  it('seleccionar un cambio no lo despliega', async () => {
    const onSelectChange = vi.fn();
    renderDashboard(null, onSelectChange);
    await vi.waitFor(() => expect(onSelectChange).toHaveBeenCalledWith('primero'));

    for (const toggle of screen.getAllByLabelText(/openspec\.change\.(expand|collapse)/)) {
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    }

    screen.getByText('segundo').closest('button')!.click();
    for (const toggle of screen.getAllByLabelText(/openspec\.change\.(expand|collapse)/)) {
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('el control de desplegado sí lo despliega, sin depender de la selección', async () => {
    const onSelectChange = vi.fn();
    renderDashboard(null, onSelectChange);
    await vi.waitFor(() => expect(onSelectChange).toHaveBeenCalledWith('primero'));

    // Se despliega el que NO está seleccionado: desplegar y seleccionar son
    // acciones independientes.
    const toggles = screen.getAllByLabelText(/openspec\.change\.(expand|collapse)/);
    toggles[1].click();
    await vi.waitFor(() => expect(
      screen.getAllByLabelText(/openspec\.change\.(expand|collapse)/)[1].getAttribute('aria-expanded'),
    ).toBe('true'));
    expect(screen.getAllByLabelText(/openspec\.change\.(expand|collapse)/)[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('no pisa la selección manual del usuario', async () => {
    const onSelectChange = vi.fn();
    renderDashboard(null, onSelectChange);
    await vi.waitFor(() => expect(onSelectChange).toHaveBeenCalledWith('primero'));
    onSelectChange.mockClear();

    // El usuario elige explícitamente el otro cambio.
    screen.getByText('segundo').closest('button')!.click();
    await vi.waitFor(() => expect(onSelectChange).toHaveBeenCalledWith('segundo'));
    // Y el fallback no vuelve a imponer el primero.
    expect(onSelectChange).not.toHaveBeenCalledWith('primero');
  });
});
