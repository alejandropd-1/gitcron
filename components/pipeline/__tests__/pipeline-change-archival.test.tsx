// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeProjection } from '@/types/pipeline';
import { useGitStore } from '@/lib/git-store';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import type { PipelineSnapshot } from '../pipeline-view-state';

/**
 * El caso que motivó el change: un cambio validado con su última tarea sin
 * tildar —la de handoff humano, que ningún runtime va a tildar— no se podía
 * archivar desde la aplicación. Y si además había una sesión persistida sobre
 * esa tarea, el estado quedaba clavado en "reintentar" para siempre.
 *
 * Lo que se comprueba montando, y no se puede comprobar sin DOM, es que el
 * arranque de archivado NO quede atado a la tarea pendiente: si quedara, la
 * sesión se registraría como un intento sobre ella y volvería a trabar el cambio.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

function task(id: string, completed: boolean) {
  return { id, text: `${id} tarea ${id}`, completed, line: 1, sourceRef: 'tasks.md:1' };
}

const RUNTIME = {
  runtime: 'claude',
  adapterId: 'a',
  installed: true,
  runtimeVersion: '1.0',
  launchable: true,
  startAvailability: 'available',
  startConstraints: ['edita archivos'],
  startModifiesRepo: true,
  diagnostics: [],
};

function snapshot(validation: 'passed' | 'failed' | 'unknown'): PipelineSnapshot {
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
        // 6.6 es la tarea de handoff: queda pendiente por diseño.
        tasks: [task('6.5', true), task('6.6', false)],
        proposalExists: true,
        designExists: true,
        specsCount: 1,
        validation,
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

/** Sesión cerrada "con éxito" sobre la tarea que sigue sin tildar. */
function stalledSession(): RuntimeProjection {
  return {
    schemaVersion: '1.0',
    repoId: 'repo-1',
    sessionId: 'session-1',
    runtime: 'claude',
    role: 'builder',
    changeId: 'demo-change',
    taskId: '6.6',
    active: false,
    outcome: 'completed',
    startedAt: '2026-07-30T23:10:10.000Z',
    endedAt: '2026-07-30T23:12:00.000Z',
    agents: [],
    activity: [],
    reasoningVisibility: 'unknown',
    telemetry: null,
    controlCapabilities: [],
    droppedActivity: 0,
    diagnostics: [],
  } as RuntimeProjection;
}

function renderDashboard(overrides: {
  validation?: 'passed' | 'failed' | 'unknown';
  projection?: RuntimeProjection | null;
  fixtureActive?: boolean;
  onRefresh?: () => void;
} = {}) {
  return render(
    <OpenSpecDashboard
      snapshot={snapshot(overrides.validation ?? 'passed')}
      repoPath="C:/repo"
      currentBranch="main"
      workingTreeClean
      leftOpen={false}
      rightOpen={false}
      leftWidth={320}
      rightWidth={320}
      onResizeLeft={() => undefined}
      onResizeRight={() => undefined}
      projection={overrides.projection ?? null}
      runtimeHistory={[]}
      fixtureActive={overrides.fixtureActive ?? false}
      onRefresh={overrides.onRefresh ?? (() => undefined)}
      onPauseAfterTask={() => undefined}
      onRespondDecision={() => undefined}
    />,
  );
}

afterEach(() => {
  cleanup();
  // El aviso vive en el store compartido: se limpia entre casos.
  useGitStore.getState().setSuccess(null);
});

describe('archivado explícito de un cambio', () => {
  it('ofrece archivar con validación aprobada aunque queden tareas, y declara cuántas', () => {
    renderDashboard({ validation: 'passed' });
    const button = screen.getByRole('button', { name: /openspec\.archive\.actionPending/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('"count":1');
  });

  it('sigue ofreciendo archivar aunque una sesión persistida apunte a la tarea pendiente', () => {
    renderDashboard({ validation: 'passed', projection: stalledSession() });
    // La derivación puede seguir sugiriendo reintentar: eso es honesto. Lo que
    // no puede es dejar al cambio sin ninguna salida hacia el archivo.
    const button = screen.getByRole('button', { name: /openspec\.archive\.actionPending/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('deshabilita el archivo y declara el motivo cuando la validación no pasó', () => {
    renderDashboard({ validation: 'failed' });
    const button = screen.getByRole('button', { name: /openspec\.archive\.actionPending/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.title).toBe('pipeline.openspec.archive.blockedFailed');
  });

  it('bloquea el archivo con datos de vista previa', () => {
    renderDashboard({ validation: 'passed', fixtureActive: true });
    const button = screen.getByRole('button', { name: /openspec\.archive\.actionPending/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('pide confirmación mostrando el comando exacto, y no archiva sin ella', async () => {
    const pipelineArchiveChange = vi.fn().mockResolvedValue({ success: true });
    const start = vi.fn();
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { pipelineArchiveChange, pipelineRuntime: { discover: vi.fn(), start, stop: vi.fn() } },
    });

    renderDashboard({ validation: 'passed' });
    screen.getByRole('button', { name: /openspec\.archive\.actionPending/ }).click();

    // Lo mostrado es literalmente lo que se ejecuta.
    await vi.waitFor(() => expect(screen.getByText('openspec archive demo-change --yes')).toBeTruthy());
    // Nada ocurrió todavía: hace falta confirmar.
    expect(pipelineArchiveChange).not.toHaveBeenCalled();
    // Y archivar no abre un runtime: lo corre el proceso principal.
    expect(start).not.toHaveBeenCalled();
  });

  it('archiva por el CLI al confirmar, y relee la evidencia', async () => {
    const pipelineArchiveChange = vi.fn().mockResolvedValue({ success: true });
    const onRefresh = vi.fn();
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { pipelineArchiveChange, pipelineRuntime: { discover: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    });

    renderDashboard({ validation: 'passed', onRefresh });
    screen.getByRole('button', { name: /openspec\.archive\.actionPending/ }).click();
    const confirm = await screen.findByRole('button', { name: /openspec\.archive\.confirmAction/ });
    confirm.click();

    await vi.waitFor(() => expect(pipelineArchiveChange).toHaveBeenCalledWith('C:/repo', 'demo-change'));
    // El cambio figura archivado porque se relee el disco, no porque la llamada
    // haya vuelto sin error.
    await vi.waitFor(() => expect(onRefresh).toHaveBeenCalled());
    // Y se declara por la superficie de notificaciones de la aplicación,
    // nombrando el cambio: Pipeline no construye una propia para lo mismo.
    await vi.waitFor(() => {
      const message = useGitStore.getState().success;
      expect(message).toContain('pipeline.openspec.archive.done');
      expect(message).toContain('demo-change');
    });
  });

  it('muestra qué va a ejecutar antes de hacerlo, y no toca nada por mostrarlo', async () => {
    // El panel mostraba además los dos mensajes de commit, los archivos que
    // entraban y los que quedaban fuera. Eso se retiró al desacoplar el
    // archivado del commit: archivar hace lo que OpenSpec define y nada más,
    // así que el único alcance que hay para declarar es el comando.
    const pipelineArchiveChange = vi.fn().mockResolvedValue({ success: true });
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { pipelineArchiveChange, pipelineRuntime: { discover: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    });

    renderDashboard({ validation: 'passed' });
    screen.getByRole('button', { name: /openspec\.archive\.actionPending/ }).click();

    const confirm = await screen.findByRole('button', { name: /openspec\.archive\.confirmAction/ });
    // Nada se ejecutó por pedirlo: primero se muestra, después se confirma.
    expect(pipelineArchiveChange).not.toHaveBeenCalled();

    confirm.click();
    await vi.waitFor(() => expect(pipelineArchiveChange).toHaveBeenCalledWith('C:/repo', 'demo-change'));
  });

  it('no declara archivado cuando el CLI falló', async () => {
    const pipelineArchiveChange = vi.fn().mockResolvedValue({ success: false, error: 'boom' });
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { pipelineArchiveChange, pipelineRuntime: { discover: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    });

    renderDashboard({ validation: 'passed' });
    screen.getByRole('button', { name: /openspec\.archive\.actionPending/ }).click();
    const confirm = await screen.findByRole('button', { name: /openspec\.archive\.confirmAction/ });
    confirm.click();

    await screen.findByRole('alert');
    expect(useGitStore.getState().success).toBeNull();
  });

  it('muestra el motivo real del CLI cuando el archivado falla', async () => {
    const pipelineArchiveChange = vi.fn().mockResolvedValue({
      success: false,
      error: "Requirement 'X' not found in spec pipeline-guided-workflow",
    });
    const onRefresh = vi.fn();
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { pipelineArchiveChange, pipelineRuntime: { discover: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    });

    renderDashboard({ validation: 'passed', onRefresh });
    screen.getByRole('button', { name: /openspec\.archive\.actionPending/ }).click();
    const confirm = await screen.findByRole('button', { name: /openspec\.archive\.confirmAction/ });
    confirm.click();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Requirement 'X' not found");
    // No se declara éxito ni se relee como si hubiera archivado.
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('no archiva con datos de vista previa aunque se confirme', () => {
    const pipelineArchiveChange = vi.fn();
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { pipelineArchiveChange, pipelineRuntime: { discover: vi.fn(), start: vi.fn(), stop: vi.fn() } },
    });

    renderDashboard({ validation: 'passed', fixtureActive: true });
    // Con fixture el control ya está deshabilitado; se comprueba además que el
    // camino de ejecución no exista aunque se llegara a él.
    const button = screen.getByRole('button', { name: /openspec\.archive\.actionPending/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(pipelineArchiveChange).not.toHaveBeenCalled();
  });
});
