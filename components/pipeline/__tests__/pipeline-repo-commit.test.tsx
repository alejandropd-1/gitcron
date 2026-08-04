// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeProjection } from '@/types/pipeline';
import { useGitStore } from '@/lib/git-store';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import type { PipelineSnapshot } from '../pipeline-view-state';

/**
 * La preparación del commit vive a nivel del repositorio.
 *
 * Reemplaza al test de la pestaña Commit, que cubría una superficie encerrada
 * dentro del cambio seleccionado. El defecto que ese nivel producía era
 * concreto: después de archivar quedan `openspec/changes/archive/…` y
 * `openspec/specs/…` sin confirmar, el cambio ya no está activo, y para
 * prepararlos había que entrar a un cambio ajeno —o no había ninguno al que
 * entrar—. El caso de cero cambios activos es el que guarda esa regresión.
 */

const stageFiles = vi.fn().mockResolvedValue(true);
const setCommitMessage = vi.fn();

vi.mock('@/hooks/use-git-actions', () => ({
  useGitActions: () => ({ stageFiles, commitChanges: vi.fn() }),
}));

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

function task(id: string, completed: boolean) {
  return { id, text: `${id} tarea ${id}`, completed, line: 1, sourceRef: 'tasks.md:1' };
}

/** Snapshot con los cambios activos que se le pasen. Sin ninguno, es válido. */
function snapshot(changeIds: string[]): PipelineSnapshot {
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
      selectedChangeId: changeIds[0] ?? null,
      activeChanges: changeIds.map((changeId) => ({
        changeId,
        intent: 'una intención',
        tasks: [task('1.1', false)],
        proposalExists: true,
        designExists: true,
        specsCount: 1,
        validation: 'unknown',
        artifacts: null,
      })),
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  } as PipelineSnapshot;
}

function renderDashboard(changeIds: string[] = ['demo-change']) {
  return render(
    <OpenSpecDashboard
      snapshot={snapshot(changeIds)}
      repoPath="C:/repo"
      currentBranch="main"
      workingTreeClean={false}
      leftOpen={false}
      rightOpen={false}
      leftWidth={320}
      rightWidth={320}
      onResizeLeft={() => undefined}
      onResizeRight={() => undefined}
      projection={null as RuntimeProjection | null}
      runtimeHistory={[]}
      onRefresh={() => undefined}
      onPauseAfterTask={() => undefined}
      onRespondDecision={() => undefined}
    />,
  );
}

/** El panel se abre desde el estado del árbol, que es lo único del encabezado
 *  que ya habla del repositorio entero. */
const openPrepare = () => fireEvent.click(screen.getByRole('button', { name: /openspec\.prepare\.open/ }));

const ORIGINAL_API = (globalThis as { window?: { api?: unknown } }).window?.api;

function setModified(files: Array<{ path: string; staged: boolean }>) {
  useGitStore.setState({
    modifiedFiles: files.map((file) => ({ ...file, status: 'modified' })),
    commitMessage: '',
    setCommitMessage,
  } as Partial<ReturnType<typeof useGitStore.getState>>);
}

beforeEach(() => {
  stageFiles.mockClear();
  setCommitMessage.mockClear();
  setModified([
    { path: 'openspec/changes/demo-change/tasks.md', staged: false },
    { path: 'openspec/changes/otro-cambio/proposal.md', staged: false },
    { path: 'components/algo.tsx', staged: false },
  ]);
  Object.defineProperty(window, 'api', { configurable: true, value: {} });
});

afterEach(() => {
  cleanup();
  useGitStore.setState({ modifiedFiles: [], commitMessage: '' });
  if (ORIGINAL_API === undefined) delete (window as { api?: unknown }).api;
  else Object.defineProperty(window, 'api', { configurable: true, value: ORIGINAL_API });
});

describe('preparación a nivel del repositorio', () => {
  it('se alcanza sin ningún cambio activo', async () => {
    // El caso que motivó subir el commit de nivel: sólo quedan los restos de un
    // archivado y no hay ningún cambio desde el cual mirar.
    setModified([
      { path: 'openspec/changes/archive/2026-08-01-viejo/tasks.md', staged: false },
      { path: 'openspec/specs/una-capacidad/spec.md', staged: false },
    ]);
    renderDashboard([]);

    openPrepare();

    expect(screen.getByText(/openspec\.prepare\.groupArchived/)).toBeTruthy();
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(2);

    for (const box of boxes) fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: /openspec\.prepare\.action/ }));

    await vi.waitFor(() => expect(stageFiles).toHaveBeenCalledWith([
      'openspec/changes/archive/2026-08-01-viejo/tasks.md',
      'openspec/specs/una-capacidad/spec.md',
    ], true));
  });

  it('no está abierta hasta que se pide, y no ocupa una pestaña', () => {
    renderDashboard();

    expect(screen.queryByRole('button', { name: /openspec\.prepare\.action/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /openspec\.tabs\.commit/ })).toBeNull();

    openPrepare();
    expect(screen.getByRole('button', { name: /openspec\.prepare\.action/ })).toBeTruthy();
  });

  it('ningún grupo entra preseleccionado', () => {
    // Sin un cambio de referencia no hay criterio para privilegiar uno, y
    // hacerlo produciría un commit distinto según dónde estuviera el foco.
    renderDashboard();
    openPrepare();

    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(3);
    expect(boxes.every((box) => !box.checked)).toBe(true);
    // Sin nada elegido, preparar no se puede disparar.
    expect((screen.getByRole('button', { name: /openspec\.prepare\.action/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('el control de sumar todos alcanza al total y el de cada grupo sólo al suyo', () => {
    renderDashboard();
    openPrepare();

    const boxes = () => screen.getAllByRole('checkbox') as HTMLInputElement[];
    // El primero de la lista es el del encabezado, que opera sobre el total; los
    // que siguen pertenecen a cada grupo.
    fireEvent.click(screen.getAllByRole('button', { name: /openspec\.prepare\.selectAll/ })[0]);
    expect(boxes().every((box) => box.checked)).toBe(true);

    fireEvent.click(screen.getAllByRole('button', { name: /openspec\.prepare\.deselectAll/ })[0]);
    expect(boxes().every((box) => !box.checked)).toBe(true);

    // El control del primer grupo suma sólo su archivo.
    fireEvent.click(screen.getAllByRole('button', { name: /openspec\.prepare\.selectAll/ })[1]);
    expect(boxes().filter((box) => box.checked)).toHaveLength(1);
  });

  it('agrupa por procedencia, nombra el cambio y muestra el estado de cada archivo', () => {
    setModified([
      { path: 'openspec/changes/demo-change/tasks.md', staged: false },
      { path: 'openspec/changes/otro-cambio/proposal.md', staged: false },
      { path: 'openspec/changes/archive/2026-08-01-viejo/tasks.md', staged: false },
      { path: 'components/algo.tsx', staged: false },
    ]);
    renderDashboard();
    openPrepare();

    // Cada cambio tiene su propio grupo, rotulado con su identificador: no hay
    // uno propio y una bolsa ajena.
    expect(screen.getByText(/groupChange.*demo-change/)).toBeTruthy();
    expect(screen.getByText(/groupChange.*otro-cambio/)).toBeTruthy();
    expect(screen.getByText(/openspec\.prepare\.groupArchived/)).toBeTruthy();
    expect(screen.getByText(/openspec\.prepare\.groupUnattributed/)).toBeTruthy();
    // Y cada archivo muestra su estado con la inicial, como el panel de staging.
    expect(screen.getAllByLabelText('modified').length).toBe(4);
  });

  it('el mensaje sugerido deja de nombrar un cambio cuando la elección mezcla dos', () => {
    renderDashboard();
    openPrepare();

    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    // Sólo el artefacto del primer cambio: la sugerencia lo nombra.
    fireEvent.click(boxes[0]);
    expect(screen.getByText('chore: demo-change')).toBeTruthy();

    // Al sumar el artefacto del otro cambio, la descripción se vacía. Es la
    // señal de que el commit está mezclando trabajos, y llega antes de confirmar.
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(screen.queryByText('chore: demo-change')).toBeNull();
  });

  it('sin archivos por preparar muestra el resumen en vez de la lista', async () => {
    renderDashboard();
    openPrepare();
    // Todo preparado: el watcher los reporta ya en staged, así que la
    // derivación los saca del cálculo y no queda nada pendiente.
    setModified([
      { path: 'openspec/changes/demo-change/tasks.md', staged: true },
      { path: 'components/algo.tsx', staged: true },
    ]);

    await vi.waitFor(() => {
      expect(screen.queryByRole('button', { name: /openspec\.prepare\.action/ })).toBeNull();
    });
    expect(screen.getByText(/openspec\.prepare\.empty/)).toBeTruthy();
  });
});
