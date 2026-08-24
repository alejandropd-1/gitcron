// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNewChangeDraftStore } from '@/lib/new-change-draft-store';
import type { PipelineSnapshot } from '../pipeline-view-state';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import { OpenSpecInspector } from '../OpenSpecInspector';

/**
 * Empezar un cambio en un repositorio al que le falta inicializar OpenSpec.
 *
 * El panel lo declara antes y ofrece resolverlo, pero no lo impide: `openspec
 * new change` funciona sin inicializar, así que bloquear no evitaría el trabajo
 * mal empezado, sólo lo demoraría. Y lo que se escribió en el formulario tiene
 * que sobrevivir a inicializar: si atender el aviso cuesta el objetivo y el
 * slug, se aprende a ignorarlo.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete (window as any).api;
});

function snapshot(openSpecPresent: boolean): PipelineSnapshot {
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
      activeChanges: [],
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: '2026-08-07T10:05:00.000Z',
      latestGate: null,
      openSpecPresent,
      openSpecTools: [],
    },
  } as PipelineSnapshot;
}

function renderDashboard(present = false) {
  const snap = snapshot(present);
  const view = render(
    <div>
      <OpenSpecDashboard
        snapshot={snap}
        repoPath="C:/repo"
        currentBranch="main"
        workingTreeClean
        projection={null}
        runtimeHistory={[]}
        onRefresh={() => undefined}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />
      <OpenSpecInspector
        snapshot={snap}
        repoPath="C:/repo"
        projection={null}
        runtimeHistory={[]}
        onRespondDecision={() => undefined}
      />
    </div>,
  );
  return {
    ...view,
    /* Lo que hace `onRefresh`: el panel vuelve a leer el disco y llega un
       snapshot nuevo. Se simula acá para poder mirar qué sobrevive. */
    refreshWith: (next: boolean) => {
      const nextSnap = snapshot(next);
      view.rerender(
        <div>
          <OpenSpecDashboard
            snapshot={nextSnap}
            repoPath="C:/repo"
            currentBranch="main"
            workingTreeClean
            projection={null}
            runtimeHistory={[]}
            onRefresh={() => undefined}
            onPauseAfterTask={() => undefined}
            onRespondDecision={() => undefined}
          />
          <OpenSpecInspector
            snapshot={nextSnap}
            repoPath="C:/repo"
            projection={null}
            runtimeHistory={[]}
            onRespondDecision={() => undefined}
          />
        </div>,
      );
    },
  };
}

let initOpenSpec: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // El borrador del flujo vive en un store global desde que sobrevive al
  // desmontaje: sin resetearlo, lo escrito en una prueba aparece en la siguiente.
  useNewChangeDraftStore.setState({ drafts: {} });
  initOpenSpec = vi.fn().mockResolvedValue({ success: true, needsTool: false });
  (window as unknown as { api: unknown }).api = { pipelineInitOpenSpec: initOpenSpec };
});

describe('empezar un cambio sin OpenSpec inicializado', () => {
  it('lo declara y ofrece resolverlo, sin impedir empezar', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /next\.noActive\.propose/ }));

    expect(screen.getAllByText(/readiness\.missingTitle/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /readiness\.resolve/ })).toBeTruthy();
    // No bloquea: el formulario está y se puede llegar a lanzarlo.
    expect(screen.getByRole('button', { name: /newChange\.propose\.review/ })).toBeTruthy();
  });

  it('inicializar desde el aviso conserva el objetivo y el slug', async () => {
    const { refreshWith } = renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /next\.noActive\.propose/ }));

    fireEvent.change(screen.getByLabelText(/newChange\.propose\.objective/), {
      target: { value: 'ordenar el rail de actividad' },
    });
    fireEvent.change(screen.getByLabelText(/newChange\.propose\.slug/), {
      target: { value: 'ordenar-rail' },
    });

    // El aviso lleva al detalle, y ahí vive la única acción que inicializa.
    fireEvent.click(screen.getByRole('button', { name: /readiness\.resolve/ }));
    fireEvent.click(screen.getByRole('button', { name: /rail\.init$/ }));
    await waitFor(() => expect(initOpenSpec).toHaveBeenCalledWith('C:/repo', undefined));

    // Llega el snapshot nuevo: ya hay OpenSpec, y el formulario sigue como estaba.
    refreshWith(true);
    expect((screen.getByLabelText(/newChange\.propose\.objective/) as HTMLTextAreaElement).value)
      .toBe('ordenar el rail de actividad');
    expect((screen.getByLabelText(/newChange\.propose\.slug/) as HTMLInputElement).value)
      .toBe('ordenar-rail');
  });

  it('nada se escribe sin la acción humana', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /next\.noActive\.propose/ }));
    fireEvent.click(screen.getByRole('button', { name: /readiness\.resolve/ }));

    // Ver el estado no escribe: hasta acá sólo se leyó y se navegó.
    expect(initOpenSpec).not.toHaveBeenCalled();
  });
});

describe('resultado de inicializar', () => {
  it('informa el motivo real de un fallo, sin normalizarlo', async () => {
    initOpenSpec.mockResolvedValue({ success: false, error: 'EACCES: permission denied', needsTool: false });
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /rail\.tools/ }));
    fireEvent.click(screen.getByRole('button', { name: /rail\.init$/ }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('EACCES: permission denied');
  });

  it('cuando el CLI no detecta ninguna herramienta, pide elegir', async () => {
    initOpenSpec.mockResolvedValue({ success: false, error: 'No tools detected', needsTool: true });
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /rail\.tools/ }));
    fireEvent.click(screen.getByRole('button', { name: /rail\.init$/ }));

    const claude = await screen.findByRole('checkbox', { name: /Claude Code/ });
    // Es una pregunta, no un fallo: el mensaje crudo del CLI no se muestra como error.
    expect(screen.queryByRole('alert')).toBeNull();

    // Sin elegir no se puede confirmar: esto escribe en el repositorio.
    const confirm = screen.getByRole('button', { name: /rail\.chooseToolConfirm/ }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    // Varias a la vez: el CLI las configura juntas en una sola corrida.
    fireEvent.click(claude);
    fireEvent.click(screen.getByRole('checkbox', { name: /Codex/ }));
    fireEvent.click(screen.getByRole('button', { name: /rail\.chooseToolConfirm/ }));

    await waitFor(() => expect(initOpenSpec).toHaveBeenLastCalledWith('C:/repo', ['claude', 'codex']));
  });
});
