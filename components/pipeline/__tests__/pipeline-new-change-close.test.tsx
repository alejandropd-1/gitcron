// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNewChangeDraftStore } from '@/lib/new-change-draft-store';
import type { PipelineSnapshot } from '../pipeline-view-state';
import { OpenSpecDashboard } from '../OpenSpecDashboard';

/**
 * Salida del flujo de cambio nuevo.
 *
 * Abrirlo era un viaje de ida: el estado que lo muestra sólo se limpiaba al
 * elegir un cambio, lanzar una tarea o archivar, y desde la pantalla de inicio
 * no hay ninguna de esas tres. Quien lo abría para mirar se quedaba con el
 * formulario puesto.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

// El flujo abierto es parte del borrador, que vive en un store global.
beforeEach(() => useNewChangeDraftStore.setState({ drafts: {} }));
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

function renderDashboard() {
  return render(
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
}

describe('cerrar el flujo de cambio nuevo', () => {
  it('el flujo se puede cerrar sin empezar nada', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /openspec\.start\.newChange/ }));
    expect(screen.getByRole('button', { name: /newChange\.close/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /newChange\.close/ }));

    // Vuelve la pantalla de inicio, sin el formulario.
    expect(screen.queryByRole('button', { name: /newChange\.close/ })).toBeNull();
    expect(screen.getByRole('button', { name: /openspec\.start\.newChange/ })).toBeTruthy();
  });

  it('cerrar sin empezar descarta lo escrito', () => {
    // El borrador sobrevive a cambiar de solapa, pero no a que la persona diga
    // que no lo quiere: son los dos momentos en que deja de ser un borrador.
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /openspec\.start\.newChange/ }));
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'algo a medio escribir' } });

    fireEvent.click(screen.getByRole('button', { name: /newChange\.close/ }));
    fireEvent.click(screen.getByRole('button', { name: /openspec\.start\.newChange/ }));

    expect((screen.getAllByRole('textbox')[0] as HTMLTextAreaElement).value).toBe('');
  });

  it('el flujo de explorar también se puede cerrar', () => {
    // Las dos entradas al flujo tenían el mismo problema.
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /openspec\.start\.newChange/ }));
    fireEvent.click(screen.getByRole('button', { name: /newChange\.intent\.explore/ }));
    fireEvent.click(screen.getByRole('button', { name: /newChange\.close/ }));

    expect(screen.queryByRole('button', { name: /newChange\.close/ })).toBeNull();
  });
});
