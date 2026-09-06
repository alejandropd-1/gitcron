// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import { usePipelineStore } from '@/lib/pipeline-store';
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
  const snap = snapshot(selectedChangeId);
  usePipelineStore.setState({
    snapshot: snap,
    selectedChangeId: null,
  });
  return render(
    <OpenSpecDashboard
      snapshot={snap}
      repoPath="C:/repo"
      currentBranch="fix/una-rama-que-no-matchea"
      workingTreeClean
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
  it('sin elección explícita no muestra ningún cambio ni informa ninguno', async () => {
    // Lo contrario de lo que este archivo verificaba antes: la vista caía al
    // primer activo para tener algo que mostrar, y avisaba de esa caída. Un
    // cambio elegido por orden de lista no es información, así que ya no se
    // elige y no hay nada que avisar.
    const onSelectChange = vi.fn();
    renderDashboard(null, onSelectChange);

    await Promise.resolve();
    expect(onSelectChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/openspec\.change\.active/)).toBeNull();
    expect(screen.getByText('pipeline.openspec.start.title')).toBeTruthy();
  });

  it('tampoco entra al cambio que el estado del repositorio derivó de la rama', async () => {
    // Se señala en la pantalla de entrada en vez de abrirse: gastarla en saltar
    // adentro volvía invisible la correspondencia.
    const onSelectChange = vi.fn();
    renderDashboard('primero', onSelectChange);

    await Promise.resolve();
    expect(onSelectChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/openspec\.change\.active/)).toBeNull();
    expect(screen.getByText('pipeline.openspec.start.branchMatch')).toBeTruthy();
  });

  it('entrar a un cambio informa esa elección', async () => {
    const onSelectChange = vi.fn();
    renderDashboard(null, onSelectChange);

    screen.getAllByRole('button', { name: /openspec\.start\.enter/ })[0].click();
    await vi.waitFor(() => expect(onSelectChange).toHaveBeenCalledWith('primero'));
  });

  it('se puede volver al estado del repositorio después de entrar', async () => {
    const onSelectChange = vi.fn();
    renderDashboard(null, onSelectChange);

    screen.getAllByRole('button', { name: /openspec\.start\.enter/ })[0].click();
    await vi.waitFor(() => expect(screen.queryByText(/openspec\.change\.active/)).toBeTruthy());

    screen.getByRole('button', { name: /pipeline\.switcher\.start|openspec\.start\.back/ }).click();
    await vi.waitFor(() => expect(screen.getByText('pipeline.openspec.start.title')).toBeTruthy());
  });
});
