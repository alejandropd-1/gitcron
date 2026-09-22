// @vitest-environment jsdom
import { useEffect, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_NEW_CHANGE_DRAFT,
  useNewChangeDraftStore,
} from '@/lib/new-change-draft-store';
import { usePipelineStore } from '@/lib/pipeline-store';
import { PipelineNewChangeFlow } from '../PipelineNewChangeFlow';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import type { PipelineSnapshot } from '../pipeline-view-state';

/**
 * Lo escrito sobrevive a salir del panel y volver.
 *
 * Las solapas de la aplicación no se ocultan: se desmontan. En `RepoMainView`
 * cada una es un `return` distinto, así que ir al grafo desmonta
 * `PipelineWorkspace` y React se lleva todo su `useState`. Ale lo encontró yendo
 * a mirar algo a Graph a mitad de empezar un cambio: al volver la pantalla no
 * estaba y tuvo que rehacerlo.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

vi.mock('../PipelineRuntimeLauncher', () => ({
  PipelineRuntimeLauncher: ({ onStarted }: { onStarted?: (sessionId: string) => void }) => (
    <button type="button" data-testid="launcher" onClick={() => onStarted?.('sess-test')}>arrancar</button>
  ),
}));

const gitCreateBranch = vi.fn();
const ORIGINAL_API = (globalThis as { window?: { api?: unknown } }).window?.api;

beforeEach(() => {
  usePipelineStore.setState({
    selectedChangeId: null,
    openSpecificationId: null,
    prepareOpen: false,
  });
  useNewChangeDraftStore.setState({ drafts: {} });
  gitCreateBranch.mockReset().mockResolvedValue({ success: true });
  Object.defineProperty(window, 'api', { configurable: true, value: { gitCreateBranch } });
});

afterEach(() => {
  cleanup();
  if (ORIGINAL_API === undefined) delete (window as { api?: unknown }).api;
  else Object.defineProperty(window, 'api', { configurable: true, value: ORIGINAL_API });
});

function change(changeId: string, done = 1, total = 2) {
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

function makeSnapshot(activeChanges: ReturnType<typeof change>[]): PipelineSnapshot {
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
      selectedChangeId: null,
      activeChanges,
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  } as PipelineSnapshot;
}

function renderDashboard(snap: PipelineSnapshot, repoPath = 'C:/repo') {
  return render(
    <OpenSpecDashboard
      snapshot={snap}
      repoPath={repoPath}
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
      onSelectChange={() => undefined}
      onPauseAfterTask={() => undefined}
      onRespondDecision={() => undefined}
    />,
  );
}

function renderFlow(repoPath = 'C:/repo') {
  return render(
    <PipelineNewChangeFlow repoPath={repoPath} projection={null} onStarted={() => undefined} />,
  );
}

/** Escribe en los tres campos del modo propuesta y desmarca la rama. */
function fillEverything() {
  const [objective, slugField] = screen.getAllByRole('textbox');
  fireEvent.change(objective, { target: { value: 'ordenar el rail de actividad' } });
  fireEvent.change(slugField, { target: { value: 'ordenar-rail' } });
  const constraints = screen.getAllByRole('textbox')[2];
  fireEvent.change(constraints, { target: { value: 'sin tocar el store de Git' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /propose\.branch/ }));
}

describe('el borrador en el store', () => {
  it('los borradores de dos repositorios no se pisan', () => {
    const { patchDraft } = useNewChangeDraftStore.getState();
    patchDraft('C:/uno', { objective: 'lo del primero' });
    patchDraft('C:/dos', { objective: 'lo del segundo' });

    expect(useNewChangeDraftStore.getState().drafts['C:/uno'].objective).toBe('lo del primero');
    expect(useNewChangeDraftStore.getState().drafts['C:/dos'].objective).toBe('lo del segundo');
  });

  it('descartar deja el estado inicial, y no un hueco', () => {
    // Los componentes leen campos: un `undefined` los obligaría a repetir el
    // mismo `??` en cada uno.
    const { patchDraft, clearDraft } = useNewChangeDraftStore.getState();
    patchDraft('C:/uno', { objective: 'algo', open: true });
    clearDraft('C:/uno');

    expect(useNewChangeDraftStore.getState().drafts['C:/uno']).toBeUndefined();
    renderFlow('C:/uno');
    expect((screen.getAllByRole('textbox')[0] as HTMLTextAreaElement).value)
      .toBe(EMPTY_NEW_CHANGE_DRAFT.objective);
  });
});

describe('salir del panel y volver', () => {
  it('conserva cada campo, uno por uno', () => {
    const { unmount } = renderFlow();
    fillEverything();

    // Irse a otra solapa es exactamente esto: el panel se desmonta.
    unmount();
    renderFlow();

    const [objective, slugField, constraints] = screen.getAllByRole('textbox');
    expect((objective as HTMLTextAreaElement).value).toBe('ordenar el rail de actividad');
    expect((slugField as HTMLInputElement).value).toBe('ordenar-rail');
    expect((constraints as HTMLTextAreaElement).value).toBe('sin tocar el store de Git');
    // También la casilla, que es una decisión tomada y no un texto.
    expect((screen.getByRole('checkbox', { name: /propose\.branch/ }) as HTMLInputElement).checked)
      .toBe(false);
  });

  it('el modo elegido también sobrevive', () => {
    const { unmount } = renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /journey\.step\.explore/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'una idea a medio pensar' } });

    unmount();
    renderFlow();

    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('una idea a medio pensar');
  });

  it('en otro repositorio no aparece lo del primero', () => {
    // El workspace ya se remonta a propósito al cambiar de repositorio para no
    // mostrar el snapshot del anterior: un borrador compartido reintroduciría
    // ese defecto, y peor, como si fuera del repositorio nuevo.
    const { unmount } = renderFlow('C:/uno');
    fillEverything();
    unmount();

    renderFlow('C:/dos');
    expect((screen.getAllByRole('textbox')[0] as HTMLTextAreaElement).value).toBe('');
  });
});

describe('cuándo se descarta', () => {
  it('arrancar la sesión registra la sesión y el cambio en el borrador', async () => {
    renderFlow();
    const [objective, slugField] = screen.getAllByRole('textbox');
    fireEvent.change(objective, { target: { value: 'un objetivo suficientemente claro' } });
    fireEvent.change(slugField, { target: { value: 'mi-cambio' } });
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.(createBranchAndReview|review)/ }));

    fireEvent.click(await screen.findByTestId('launcher'));

    const saved = useNewChangeDraftStore.getState().drafts['C:/repo'];
    expect(saved.sessions.propose).toBe('sess-test');
    expect(saved.proposedChangeId).toBe('mi-cambio');
  });

  it('con el flujo abierto y sessions.propose guardada, al releerse el snapshot con el cambio propuesto el borrador NO se descarta y el cambio NO se selecciona solo', () => {
    const repoPath = 'C:/repo';
    const proposedChangeId = 'mi-nuevo-cambio';

    useNewChangeDraftStore.getState().patchDraft(repoPath, {
      open: true,
      step: 'propose',
      proposedChangeId,
      sessions: { explore: null, propose: 'sess-test' },
    });

    const initialSnapshot = makeSnapshot([change('otro-cambio')]);
    const { rerender } = renderDashboard(initialSnapshot, repoPath);

    expect(useNewChangeDraftStore.getState().drafts[repoPath]).toBeDefined();
    expect(usePipelineStore.getState().selectedChangeId).toBeNull();

    const updatedSnapshot = makeSnapshot([change('otro-cambio'), change(proposedChangeId)]);
    rerender(
      <OpenSpecDashboard
        snapshot={updatedSnapshot}
        repoPath={repoPath}
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
        onSelectChange={() => undefined}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />,
    );

    // Con la regla nueva (4.9c / delta spec), el dashboard NO auto-selecciona ni descarta el borrador
    expect(useNewChangeDraftStore.getState().drafts[repoPath]).toBeDefined();
    expect(usePipelineStore.getState().selectedChangeId).toBeNull();
  });

  it('no escribe en stores externos durante el render al aparecer el cambio', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const repoPath = 'C:/repo';
    const proposedChangeId = 'mi-nuevo-cambio';

    useNewChangeDraftStore.getState().patchDraft(repoPath, {
      open: true,
      step: 'propose',
      proposedChangeId,
      sessions: { explore: null, propose: 'sess-test' },
    });

    function TestHost({ snap }: { snap: PipelineSnapshot }) {
      const [, setTick] = useState(0);
      useEffect(() => {
        return usePipelineStore.subscribe(() => {
          setTick((t) => t + 1);
        });
      }, []);
      return (
        <OpenSpecDashboard
          snapshot={snap}
          repoPath={repoPath}
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
          onSelectChange={() => undefined}
          onPauseAfterTask={() => undefined}
          onRespondDecision={() => undefined}
        />
      );
    }

    const initialSnapshot = makeSnapshot([change('otro-cambio')]);
    const { rerender } = render(<TestHost snap={initialSnapshot} />);

    const setSelectedChangeIdSpy = vi.spyOn(usePipelineStore.getState(), 'setSelectedChangeId');

    const updatedSnapshot = makeSnapshot([change('otro-cambio'), change(proposedChangeId)]);
    rerender(<TestHost snap={updatedSnapshot} />);

    // Con la regla nueva, no se autoselecciona el cambio al aparecer en el snapshot
    expect(setSelectedChangeIdSpy).not.toHaveBeenCalled();

    const crossComponentWarnings = consoleError.mock.calls
      .map((call) => call.join(' '))
      .filter((msg) => msg.includes('while rendering a different component'));
    expect(crossComponentWarnings).toHaveLength(0);

    setSelectedChangeIdSpy.mockRestore();
    consoleError.mockRestore();
  });

  it('la persona pasa al cambio creado manualmente pulsando Ver el cambio: se selecciona, el borrador se descarta y el flujo se cierra', async () => {
    const repoPath = 'C:/repo';
    const proposedChangeId = 'mi-nuevo-cambio';

    useNewChangeDraftStore.getState().patchDraft(repoPath, {
      open: true,
      step: 'propose',
      proposedChangeId,
      sessions: { explore: null, propose: 'sess-test' },
    });

    const getArtifactGraph = vi.fn().mockResolvedValue({
      ok: true,
      artifacts: [{ id: 'proposal', exists: true }],
    });
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        gitCreateBranch,
        pipelineOpenSpec: { getArtifactGraph },
      },
    });

    const snap = makeSnapshot([change('otro-cambio'), change(proposedChangeId)]);
    const completedProjection = {
      schemaVersion: '1.0',
      repoId: 'repo-1',
      sessionId: 'sess-test',
      runtime: 'claude',
      changeId: proposedChangeId,
      taskId: null,
      role: 'builder',
      active: false,
      outcome: 'completed',
      startedAt: '2026-09-22T10:00:00Z',
      endedAt: '2026-09-22T10:05:00Z',
      agents: [],
      activity: [],
      reasoningVisibility: 'emitted',
      telemetry: null,
      controlCapabilities: [],
      droppedActivity: 0,
      diagnostics: [],
    };

    render(
      <OpenSpecDashboard
        snapshot={snap}
        repoPath={repoPath}
        currentBranch="main"
        workingTreeClean
        leftOpen={false}
        rightOpen={false}
        leftWidth={320}
        rightWidth={320}
        onResizeLeft={() => undefined}
        onResizeRight={() => undefined}
        projection={completedProjection as any}
        runtimeHistory={[completedProjection as any]}
        onRefresh={() => undefined}
        onSelectChange={(id) => usePipelineStore.getState().setSelectedChangeId(id)}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />,
    );

    const viewChangeBtn = await screen.findByRole('button', { name: 'pipeline.journey.viewChange' });
    expect(viewChangeBtn).toBeTruthy();

    fireEvent.click(viewChangeBtn);

    expect(usePipelineStore.getState().selectedChangeId).toBe(proposedChangeId);
    expect(useNewChangeDraftStore.getState().drafts[repoPath]).toBeUndefined();
  });
});
