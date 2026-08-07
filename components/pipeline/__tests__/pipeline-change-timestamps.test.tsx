// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PipelineSnapshot } from '../pipeline-view-state';
import { OpenSpecDashboard } from '../OpenSpecDashboard';

/**
 * Cuándo empezó un cambio y cuándo terminó.
 *
 * Antes el activo no mostraba ninguna fecha y el archivado mostraba una sola,
 * sin hora, así que no se podía saber cuánto duró. En el mismo bloque había tres
 * filas que no informaban nada: dos rendían texto constante y la tercera repetía
 * una fecha ya impresa.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

afterEach(cleanup);

function snapshot(openSpec: Partial<PipelineSnapshot['openSpec']>): PipelineSnapshot {
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
      observedAt: '2026-08-06T10:05:00.000Z',
      latestGate: null,
      ...openSpec,
    },
  } as PipelineSnapshot;
}

function renderDashboard(snap: PipelineSnapshot, leftOpen = false) {
  return render(
    <OpenSpecDashboard
      snapshot={snap}
      repoPath="C:/repo"
      currentBranch="main"
      workingTreeClean
      leftOpen={leftOpen}
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

/**
 * El panel abre en su pantalla de entrada y no entra a un cambio por descarte,
 * así que hay que entrar explícitamente igual que lo haría una persona.
 */
function enterChange() {
  const [enter] = screen.getAllByRole('button', { name: /openspec\.start\.enter/ });
  fireEvent.click(enter);
}

function activeChange(createdAt: { at: string; source: 'commit' | 'disk' } | null) {
  return {
    changeId: 'demo-change',
    intent: 'una intención',
    tasks: [],
    proposalExists: true,
    designExists: true,
    specsCount: 1,
    validation: 'unknown' as const,
    artifacts: null,
    createdAt,
  };
}

describe('marcas de tiempo en el panel', () => {
  it('el cambio activo muestra su creación junto al título', () => {
    renderDashboard(snapshot({
      selectedChangeId: 'demo-change',
      activeChanges: [activeChange({ at: '2026-08-01T10:30:00-03:00', source: 'commit' })],
    }));
    enterChange();

    expect(screen.getByText('pipeline.openspec.stamp.created')).toBeTruthy();
  });

  it('una marca sin confirmar se distingue de una confirmada', () => {
    // La del disco se pierde al archivar y al clonar: leerla como una fecha de
    // Git sería creerle una permanencia que no tiene.
    renderDashboard(snapshot({
      selectedChangeId: 'demo-change',
      activeChanges: [activeChange({ at: '2026-08-06T14:51:34.000Z', source: 'disk' })],
    }));
    enterChange();

    // El rótulo va junto a la marca, así que se ancla por su clave y no por
    // igualdad exacta del nodo.
    expect(screen.getByText(/stamp\.uncommitted/)).toBeTruthy();
  });

  it('sin marca no queda una etiqueta con el hueco vacío', () => {
    renderDashboard(snapshot({
      selectedChangeId: 'demo-change',
      activeChanges: [activeChange(null)],
    }));
    enterChange();

    // El encabezado está —el cambio se abrió— y aun así no hay etiqueta: un
    // hueco con la etiqueta puesta se leería como un dato que se perdió.
    expect(screen.getByText(/openspec\.change\.active/)).toBeTruthy();
    expect(screen.queryByText('pipeline.openspec.stamp.created')).toBeNull();
  });

  it('el archivado muestra creación y archivado, y ya no las tres filas constantes', () => {
    renderDashboard(snapshot({
      selectedChangeId: null,
      archivedChanges: [{
        changeId: 'old-change',
        archivedAt: '2026-07-23',
        sourceRef: 'openspec/changes/archive/2026-07-23-old-change',
        createdAt: { at: '2026-07-20T09:00:00-03:00', source: 'commit' as const },
        archivedOn: { at: '2026-07-23T18:30:00-03:00', source: 'commit' as const },
      }],
    }), true);
    // Se entra al archivado desde la lista de completados de la barra lateral,
    // como lo haría una persona.
    fireEvent.click(screen.getByRole('button', { name: /old-change/ }));

    expect(screen.getByText('pipeline.openspec.stamp.created')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.stamp.archived')).toBeTruthy();
    // Las dos filas de texto constante y la de la ruta duplicada.
    expect(screen.queryByText('pipeline.openspec.completed.specsUpdated')).toBeNull();
    expect(screen.queryByText('pipeline.openspec.completed.activity')).toBeNull();
    expect(screen.queryByText('pipeline.openspec.completed.location')).toBeNull();
  });
});
