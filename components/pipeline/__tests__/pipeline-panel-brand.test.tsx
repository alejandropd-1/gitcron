// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PipelineSnapshot } from '../pipeline-view-state';
import { OpenSpecDashboard } from '../OpenSpecDashboard';

/**
 * Rótulo del panel.
 *
 * Nombra el método —desarrollo guiado por especificación— y no la herramienta
 * que lo implementa. Va en dos líneas explícitas: el salto es parte del rótulo,
 * así que no puede quedar librado al ancho de la ventana.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

afterEach(cleanup);

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
      activeChanges: [],
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: '2026-08-07T10:05:00.000Z',
      latestGate: null,
    },
  } as PipelineSnapshot;
}

describe('rótulo del panel', () => {
  it('nombra el método en dos líneas, no la herramienta', () => {
    render(
      <OpenSpecDashboard
        snapshot={snapshot()}
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

    const brand = screen.getByRole('heading', { level: 2 });
    // Dos elementos, no una cadena con un salto: el corte es estructural.
    expect(brand.children).toHaveLength(2);
    expect(brand.children[0]?.textContent).toBe('Spec-Driven');
    expect(brand.children[1]?.textContent).toBe('Development');
  });
});
