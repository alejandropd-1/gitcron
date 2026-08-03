// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGitStore } from '@/lib/git-store';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import type { PipelineSnapshot } from '../pipeline-view-state';

/**
 * El defecto: con un cambio validado y sin tareas pendientes, el panel mostraba
 * dos botones "Archivar cambio" — la acción primaria derivada (`ready-to-archive`)
 * y el botón siempre visible de la fila de acciones. Mismo texto, mismo efecto.
 *
 * El arreglo: el botón siempre visible no se renderiza cuando la primaria ya es
 * `start-archive`. Pero sí sobrevive cuando aporta algo que la primaria no cubre:
 * con tareas pendientes ofrece archivar declarando cuántas quedan.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

function task(id: string, completed: boolean) {
  return { id, text: `${id} tarea ${id}`, completed, line: 1, sourceRef: 'tasks.md:1' };
}

function snapshot(tasks: ReturnType<typeof task>[], validation: 'passed' | 'failed' | 'unknown'): PipelineSnapshot {
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
        tasks,
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

function renderDashboard(snapshot: PipelineSnapshot) {
  return render(
    <OpenSpecDashboard
      snapshot={snapshot}
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
      onPauseAfterTask={() => undefined}
      onRespondDecision={() => undefined}
    />,
  );
}

afterEach(() => {
  cleanup();
  useGitStore.getState().setSuccess(null);
});

describe('botón de archivar sin duplicación', () => {
  it('con validación aprobada y sin tareas pendientes, aparece un solo "Archivar cambio"', () => {
    // La acción primaria derivada ya es archivar (`ready-to-archive`): el botón
    // siempre visible no se renderiza, para no duplicar el control.
    renderDashboard(snapshot([task('6.5', true), task('6.6', true)], 'passed'));

    const buttons = screen.getAllByRole('button', { name: /Archivar cambio|^pipeline\.next\.readyToArchive\.action|pipeline\.openspec\.archive\.action\b/ });
    // La acción primaria usa `pipeline.next.readyToArchive.action`; el botón
    // siempre visible usaría `pipeline.openspec.archive.action`. Con el arreglo
    // sólo queda la primaria.
    const archivePrimaries = buttons.filter((button) => button.textContent?.includes('readyToArchive.action'));
    const archiveAlwaysVisible = buttons.filter((button) => button.textContent?.includes('openspec.archive.action'));

    expect(archivePrimaries).toHaveLength(1);
    expect(archiveAlwaysVisible).toHaveLength(0);
  });

  it('con tareas pendientes y validación aprobada, el botón siempre visible sigue presente declarando cuántas', () => {
    // La primaria es "Continuar tarea"; el botón siempre visible ofrece archivar
    // declarando las pendientes. No hay duplicación porque los textos difieren,
    // y el aporte del siempre visible no lo cubre la primaria.
    renderDashboard(snapshot([task('6.5', true), task('6.6', false)], 'passed'));

    const alwaysVisible = screen.queryByRole('button', { name: /openspec\.archive\.actionPending/ });
    expect(alwaysVisible).not.toBeNull();
    expect(alwaysVisible?.textContent).toContain('"count":1');
  });
});
