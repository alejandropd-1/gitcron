// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PipelineDetails } from '../PipelineDetails';
import type { OpenSpecChangeStatus } from '@/types/pipeline';
import type { OpenSpecChangeSummary, PipelineSnapshot } from '../pipeline-view-state';

/**
 * El grafo de artefactos que `openspec status --json` devuelve se consume en
 * la pestaña Artefactos. La superficie declara el estado real del CLI para
 * cada artefacto; si el grafo no existe, no se dibuja ni se inventa nada.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
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
    economy: { reasoningAvailable: null } as PipelineSnapshot['economy'],
    diffs: [],
    openSpec: {
      selectedChangeId: 'mirado',
      activeChanges: [],
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  } as PipelineSnapshot;
}

function change(status: OpenSpecChangeStatus | null): OpenSpecChangeSummary {
  return {
    changeId: 'mirado',
    intent: null,
    tasks: [],
    proposalExists: true,
    designExists: true,
    specsCount: 0,
    validation: 'unknown',
    artifacts: null,
    status,
  };
}

function renderDetails(selectedChange: OpenSpecChangeSummary | null) {
  render(<PipelineDetails snapshot={snapshot()} selectedChange={selectedChange} />);
}

afterEach(cleanup);

describe('grafo de artefactos de OpenSpec', () => {
  it('muestra cada artefacto con su estado real cuando el grafo está', () => {
    renderDetails(change({
      available: true,
      artifacts: [
        { id: 'proposal', state: 'done', missingDeps: [] },
        { id: 'design', state: 'ready', missingDeps: [] },
      ],
      applyRequires: ['tasks'],
      isComplete: false,
    }));
    expect(screen.getByText('proposal')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.graph.state.done')).toBeTruthy();
    expect(screen.getByText('design')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.graph.state.ready')).toBeTruthy();
  });

  it('un artefacto bloqueado declara las dependencias que le faltan', () => {
    renderDetails(change({
      available: true,
      artifacts: [
        { id: 'tasks', state: 'blocked', missingDeps: ['design'] },
      ],
      applyRequires: ['tasks'],
      isComplete: false,
    }));
    expect(screen.getByText('tasks')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.graph.state.blocked')).toBeTruthy();
    expect(screen.getByText(/pipeline\.openspec\.graph\.missingDeps/).textContent).toMatch(/design/);
  });

  it('sin grafo (status null) no renderiza la superficie ni inventa estado', () => {
    renderDetails(change(null));
    expect(screen.queryByText('pipeline.openspec.graph.state.done')).toBeNull();
    expect(screen.queryByText('pipeline.openspec.graph.state.ready')).toBeNull();
    expect(screen.queryByText('pipeline.openspec.graph.state.blocked')).toBeNull();
    expect(screen.queryByLabelText('pipeline.openspec.graph.label')).toBeNull();
  });

  it('con available false (CLI que no pudo correr) tampoco se renderiza', () => {
    renderDetails(change({ available: false, artifacts: [], applyRequires: [], isComplete: false }));
    expect(screen.queryByLabelText('pipeline.openspec.graph.label')).toBeNull();
  });

  it('sin cambio seleccionado no renderiza la superficie', () => {
    renderDetails(null);
    expect(screen.queryByLabelText('pipeline.openspec.graph.label')).toBeNull();
  });
});
