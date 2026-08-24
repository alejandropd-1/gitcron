// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PipelineSnapshot } from '../pipeline-view-state';
import { OpenSpecDashboard } from '../OpenSpecDashboard';

/**
 * Franja de identidad unificada en SDD y retiro del título de marca.
 *
 * El título «Spec-Driven Development» en dos líneas fue retirado de la vista:
 * la barra lateral ya nombra a SDD y el encabezado común ahora lleva la rama,
 * el estado del árbol y el control de preparar commit.
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
      specifications: [
        { specificationId: 'spec-1', sourceRef: 'openspec/specs/spec-1/spec.md', requirements: 2 },
      ],
      reports: [],
      diagnostics: [],
      observedAt: '2026-08-07T10:05:00.000Z',
      latestGate: null,
    },
  } as PipelineSnapshot;
}

describe('SDD adopta la franja de identidad unificada (ContentHeader)', () => {
  it('el título de marca «Spec-Driven / Development» ya NO está en el encabezado (3.4)', () => {
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

    expect(screen.queryByText(/Spec-Driven/i)).toBeNull();
    expect(screen.queryByText(/Development/i)).toBeNull();
  });

  it('monta la pieza común ContentHeader con data-testid="content-header" (3.1)', () => {
    render(
      <OpenSpecDashboard
        snapshot={snapshot()}
        repoPath="C:/repo"
        currentBranch="feature/sdd-identity"
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

    const header = screen.getByTestId('content-header');
    expect(header).toBeDefined();
    expect(header.classList.contains('h-11')).toBe(true);
  });

  it('muestra la rama actual y los indicadores de estado con los mismos rótulos que el grafo (3.2)', () => {
    render(
      <OpenSpecDashboard
        snapshot={snapshot()}
        repoPath="C:/repo"
        currentBranch="feature/sdd-identity"
        workingTreeClean={true}
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

    const header = screen.getByTestId('content-header');
    expect(header.textContent).toContain('feature/sdd-identity');
    expect(header.textContent).toContain('sidebar.workingTreeClean');
  });

  it('ubica Preparar commit a la derecha y opera el control de preparación respetando data-clean (3.3)', () => {
    render(
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
        projection={null}
        runtimeHistory={[]}
        onRefresh={() => undefined}
        onPauseAfterTask={() => undefined}
        onRespondDecision={() => undefined}
      />,
    );

    const prepareBtn = screen.getByRole('button', { name: /pipeline\.openspec\.prepare\.open/i });
    expect(prepareBtn).toBeDefined();
    expect(prepareBtn.getAttribute('data-clean')).toBe('false');
    expect(prepareBtn.getAttribute('aria-expanded')).toBe('false');

    // Al hacer clic, abre la sección de preparación
    fireEvent.click(prepareBtn);
    expect(prepareBtn.getAttribute('aria-expanded')).toBe('true');
  });

  it('la versión del motor está en la franja de identidad y los contadores ya no están en el cuerpo (3.5 actualizado en 8.3 y 8.5)', () => {
    // La versión del motor se mudó a la franja de identidad (8.5) y los contadores de especificaciones/tareas salieron del cuerpo (8.3).
    render(
      <OpenSpecDashboard
        snapshot={snapshot()}
        repoPath="C:/repo"
        currentBranch="main"
        workingTreeClean={true}
        leftOpen={true}
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

    const header = screen.getByTestId('content-header');
    expect(within(header).getByText('pipeline.openspec.engine.status.absent')).toBeDefined();
    expect(screen.queryByText('pipeline.openspec.summary.specifications')).toBeNull();
    expect(screen.queryByText('pipeline.openspec.summary.tasks')).toBeNull();
  });

  it('ninguna vista declara un encabezado propio fuera de la pieza común (3.6)', () => {
    const { container } = render(
      <OpenSpecDashboard
        snapshot={snapshot()}
        repoPath="C:/repo"
        currentBranch="main"
        workingTreeClean={true}
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

    // El encabezado de la vista es la pieza común ContentHeader
    const header = screen.getByTestId('content-header');
    expect(header).toBeDefined();
    // No hay summaryBar
    expect(container.querySelector('header[class*="summaryBar"]')).toBeNull();
  });

  it('la rama aparece una sola vez en la franja de identidad de SDD', () => {
    render(
      <OpenSpecDashboard
        snapshot={snapshot()}
        repoPath="C:/repo"
        currentBranch="feature/sdd-identity"
        workingTreeClean={true}
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

    const header = screen.getByTestId('content-header');
    const branchElements = Array.from(header.querySelectorAll('*')).filter(
      (el) => el.children.length === 0 && el.textContent === 'feature/sdd-identity',
    );
    expect(branchElements).toHaveLength(1);
  });
});
