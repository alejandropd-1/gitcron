// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeProjection } from '@/types/pipeline';
import { useGitStore } from '@/lib/git-store';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import type { PipelineSnapshot } from '../pipeline-view-state';

/**
 * La preparación del commit tiene pestaña propia.
 *
 * Vivía suelta arriba del panel de trabajo, lo que mezclaba dos dominios
 * distintos —confirmar en Git y archivar en OpenSpec— en la misma vista y hacía
 * que parecieran la misma operación.
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

/**
 * Dos cambios activos con artefactos tocados: así el código queda ambiguo y
 * cae en `foreign`, que es lo que necesita el control de sumar todos.
 */
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
    economy: { reasoningAvailable: null } as PipelineSnapshot['economy'],
    diffs: [],
    openSpec: {
      selectedChangeId: 'demo-change',
      activeChanges: [{
        changeId: 'demo-change',
        intent: 'una intención',
        tasks: [task('1.1', false)],
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

function renderDashboard() {
  return render(
    <OpenSpecDashboard
      snapshot={snapshot()}
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

const openCommitTab = () => fireEvent.click(screen.getByRole('tab', { name: /openspec\.tabs\.commit/ }));

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
    // De otro cambio en curso: vuelve ambiguo al código, que cae en `foreign`.
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

describe('pestaña Commit', () => {
  it('el panel de preparar vive en su pestaña, no en Trabajo', () => {
    renderDashboard();

    // En Trabajo, que es la pestaña inicial, no está.
    expect(screen.queryByRole('button', { name: /openspec\.prepare\.action/ })).toBeNull();

    openCommitTab();
    expect(screen.getByRole('button', { name: /openspec\.prepare\.action/ })).toBeTruthy();
  });

  it('el control de sumar todos selecciona y deselecciona la lista entera', () => {
    renderDashboard();
    openCommitTab();

    const foreignBoxes = () => screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(foreignBoxes().every((box) => !box.checked)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /openspec\.prepare\.selectAll/ }));
    expect(foreignBoxes().every((box) => box.checked)).toBe(true);

    // El mismo control, ahora con el texto inverso, los vacía.
    fireEvent.click(screen.getByRole('button', { name: /openspec\.prepare\.deselectAll/ }));
    expect(foreignBoxes().every((box) => !box.checked)).toBe(true);
  });

  it('sin archivos por preparar muestra el resumen en vez de la lista', async () => {
    renderDashboard();
    openCommitTab();
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
