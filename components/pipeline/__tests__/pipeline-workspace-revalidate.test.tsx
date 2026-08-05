// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PipelineWorkspace, type PipelineSnapshotLoader } from '../PipelineWorkspace';
import type { PipelineSnapshot } from '../pipeline-view-state';

/**
 * Refrescar la evidencia caía al estado de carga y desmontaba el dashboard
 * entero. Se percibía como una recarga de la página, y se llevaba puesto todo
 * estado efímero: el aviso de un archivado recién hecho moría antes de poder
 * leerse.
 *
 * El estado de carga es para cuando no hay nada que mostrar; con un snapshot
 * vigente lo que corresponde es revalidar sin blanquear.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string) => key,
}));

function snapshot(): PipelineSnapshot {
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
    economy: {
      reasoningAvailable: null,
      tokens: { input: null, output: null, reasoning: null, cacheRead: null },
      costUsd: null,
      costBasis: 'unknown',
      contextMaxTokens: null,
    } as unknown as PipelineSnapshot['economy'],
    diffs: [],
    openSpec: {
      selectedChangeId: 'demo-change',
      activeChanges: [{
        changeId: 'demo-change',
        intent: 'una intención',
        tasks: [{ id: '1.1', text: '1.1 tarea', completed: true, line: 1, sourceRef: 'tasks.md:1' }],
        proposalExists: true,
        designExists: true,
        specsCount: 1,
        validation: 'unknown',
        artifacts: null,
      }],
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  } as PipelineSnapshot;
}

afterEach(cleanup);

describe('revalidación del workspace', () => {
  it('muestra el estado de carga sólo mientras no hay ningún snapshot', async () => {
    let resolveLoad: ((value: PipelineSnapshot) => void) | undefined;
    const loadSnapshot: PipelineSnapshotLoader = () => new Promise((resolve) => { resolveLoad = resolve; });

    render(<PipelineWorkspace repoPath="C:/repo" loadSnapshot={loadSnapshot} />);

    // Primera carga: no hay nada vigente que conservar, así que sí corresponde.
    expect(document.querySelector('[data-estado="loading"]')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();

    resolveLoad?.(snapshot());
    await vi.waitFor(() => expect(screen.getAllByText('demo-change').length).toBeGreaterThan(0));
    expect(document.querySelector('[data-estado="loading"]')).toBeNull();
  });

  it('conserva el contenido vigente mientras revalida, en vez de blanquear', async () => {
    let pending: ((value: PipelineSnapshot) => void) | undefined;
    let calls = 0;
    const loadSnapshot: PipelineSnapshotLoader = () => {
      calls += 1;
      if (calls === 1) return Promise.resolve(snapshot());
      return new Promise((resolve) => { pending = resolve; });
    };

    render(<PipelineWorkspace repoPath="C:/repo" loadSnapshot={loadSnapshot} />);
    await vi.waitFor(() => expect(screen.getAllByText('demo-change').length).toBeGreaterThan(0));

    // El panel abre en el estado del repositorio: entrar al cambio es una
    // elección, y la acción de validar vive adentro.
    fireEvent.click(screen.getAllByRole('button', { name: /openspec\.start\.enter/ })[0]);
    await vi.waitFor(() => expect(
      screen.getByRole('button', { name: /pipeline\.next\.validationUnknown\.action/ }),
    ).toBeTruthy());

    // `refresh-validation` es el camino real por el que el dashboard pide una
    // relectura: con tareas completas y validación sin comprobar, es la acción
    // primaria que se ofrece.
    screen.getByRole('button', { name: /pipeline\.next\.validationUnknown\.action/ }).click();
    await vi.waitFor(() => expect(calls).toBe(2));

    // El defecto: acá el workspace caía al estado de carga y desmontaba todo.
    expect(document.querySelector('[data-estado="loading"]')).toBeNull();
    expect(screen.getAllByText('demo-change').length).toBeGreaterThan(0);
    // Y se declara que hay una relectura en curso.
    expect(screen.getByRole('progressbar')).toBeTruthy();
    // También donde va a ocurrir el cambio: un indicador sólo global queda lejos
    // de la acción y la espera se lee como que la app no respondió.
    expect(document.querySelector('[data-revalidating]')).toBeTruthy();

    pending?.(snapshot());
    await vi.waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());
    expect(screen.getAllByText('demo-change').length).toBeGreaterThan(0);
    // En reposo no queda ninguna señal de actividad.
    expect(document.querySelector('[data-revalidating]')).toBeNull();
  });
});
