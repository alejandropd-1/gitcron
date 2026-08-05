// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeProjection } from '@/types/pipeline';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import type { PipelineSnapshot } from '../pipeline-view-state';

/**
 * La columna ACTIVIDAD corresponde al cambio abierto.
 *
 * Antes caía a la sesión más reciente del repositorio, sin mirar a qué cambio
 * pertenecía. Como el resto del panel central sí es del cambio abierto, una
 * columna al lado con otro criterio se leía como si fuera de él, y nada
 * declaraba la discrepancia.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

function change(changeId: string) {
  return {
    changeId,
    intent: `intención de ${changeId}`,
    tasks: [{ id: `${changeId}-1`, text: '1.1 tarea', completed: false, line: 1, sourceRef: 'tasks.md:1' }],
    proposalExists: true,
    designExists: true,
    specsCount: 1,
    validation: 'unknown' as const,
    artifacts: null,
  };
}

function session(sessionId: string, changeId: string | null, startedAt: string, active = false): RuntimeProjection {
  return {
    schemaVersion: '1.0',
    repoId: 'repo-1',
    sessionId,
    runtime: 'claude',
    changeId,
    taskId: null,
    role: 'builder',
    active,
    outcome: active ? null : 'completed',
    startedAt,
    endedAt: active ? null : startedAt,
    agents: [],
    activity: [{
      key: `${sessionId}-a`,
      at: startedAt,
      channel: 'narrative',
      text: `actividad de ${sessionId}`,
      allowsReasoning: true,
    }],
    reasoningVisibility: 'emitted',
    telemetry: null,
    controlCapabilities: [],
    droppedActivity: 0,
    diagnostics: [],
  } as unknown as RuntimeProjection;
}

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
      selectedChangeId: null,
      activeChanges: [change('mirado'), change('otro')],
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  } as PipelineSnapshot;
}

function renderDashboard(projection: RuntimeProjection | null, history: RuntimeProjection[]) {
  render(
    <OpenSpecDashboard
      snapshot={snapshot()}
      repoPath="C:/repo"
      currentBranch="main"
      workingTreeClean
      leftOpen={false}
      rightOpen
      leftWidth={320}
      rightWidth={320}
      onResizeLeft={() => undefined}
      onResizeRight={() => undefined}
      projection={projection}
      runtimeHistory={history}
      onRefresh={() => undefined}
      onSelectChange={() => undefined}
      onPauseAfterTask={() => undefined}
      onRespondDecision={() => undefined}
    />,
  );
}

/** Entra al primer cambio de la pantalla de entrada, que es `mirado`. */
function enterFirstChange() {
  fireEvent.click(screen.getAllByRole('button', { name: /openspec\.start\.enter/ })[0]);
}

afterEach(cleanup);

describe('alcance de la columna de actividad', () => {
  it('con un cambio abierto no muestra la sesión más reciente de otro', () => {
    // El defecto exacto: la más reciente es de `otro`, y era la que se mostraba.
    renderDashboard(null, [
      session('s-otro', 'otro', '2026-08-04T12:00:00Z'),
      session('s-mirado', 'mirado', '2026-08-04T09:00:00Z'),
    ]);
    enterFirstChange();

    expect(screen.getByText('actividad de s-mirado')).toBeTruthy();
    expect(screen.queryByText('actividad de s-otro')).toBeNull();
  });

  it('una corrida activa en otro cambio no pisa la lectura del abierto', () => {
    // `projection` era el primer candidato de la selección por estar corriendo.
    renderDashboard(
      session('s-corriendo', 'otro', '2026-08-04T13:00:00Z', true),
      [session('s-mirado', 'mirado', '2026-08-04T09:00:00Z')],
    );
    enterFirstChange();

    expect(screen.getByText('actividad de s-mirado')).toBeTruthy();
    expect(screen.queryByText('actividad de s-corriendo')).toBeNull();
  });

  it('un cambio sin sesiones lo declara en vez de mostrar la de otro', () => {
    renderDashboard(null, [session('s-otro', 'otro', '2026-08-04T12:00:00Z')]);
    enterFirstChange();

    expect(screen.getByText('pipeline.openspec.activity.noneForChange')).toBeTruthy();
    expect(screen.queryByText('actividad de s-otro')).toBeNull();
  });

  it('una sesión sin cambio atribuido no entra en la de un cambio abierto', () => {
    // `changeId` nulo significa que no se pudo atribuir, no que sea de todos.
    renderDashboard(null, [session('s-suelta', null, '2026-08-04T12:00:00Z')]);
    enterFirstChange();

    expect(screen.getByText('pipeline.openspec.activity.noneForChange')).toBeTruthy();
    expect(screen.queryByText('actividad de s-suelta')).toBeNull();
  });

  it('sin ningún cambio abierto se muestran todas las sesiones', () => {
    // En la pantalla de entrada el contexto es el repositorio: no hay contra qué
    // restringir, y la actividad reciente sirve para decidir por dónde seguir.
    renderDashboard(null, [
      session('s-otro', 'otro', '2026-08-04T12:00:00Z'),
      session('s-mirado', 'mirado', '2026-08-04T09:00:00Z'),
    ]);

    expect(screen.getByLabelText(/openspec\.activity\.sessionPicker/)).toBeTruthy();
    expect(screen.getByText('actividad de s-otro')).toBeTruthy();
  });
});
