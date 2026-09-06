// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PipelineSnapshot } from '../pipeline-view-state';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import { usePipelineStore } from '@/lib/pipeline-store';

/**
 * Abrir una especificación consolidada desde el panel.
 *
 * Antes se listaban como texto muerto —`div`, no botón— porque el snapshot no
 * traía contenido que mostrar. Ahora se piden bajo demanda: transportarlas en
 * cada refresco costaba 145 KB por algo que casi nunca cambia.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const ORIGINAL_API = (window as { api?: unknown }).api;

afterEach(() => {
  cleanup();
  if (ORIGINAL_API === undefined) delete (window as { api?: unknown }).api;
  else Object.defineProperty(window, 'api', { configurable: true, value: ORIGINAL_API });
});

function snapshot(openSpec: Partial<PipelineSnapshot['openSpec']> = {}): PipelineSnapshot {
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
      specifications: [{
        specificationId: 'pipeline-guided-workflow',
        requirements: 12,
        sourceRef: 'openspec/specs/pipeline-guided-workflow/spec.md',
      }],
      reports: [],
      diagnostics: [],
      observedAt: '2026-08-07T10:05:00.000Z',
      latestGate: null,
      ...openSpec,
    },
  } as PipelineSnapshot;
}

function renderDashboard(
  pipelineReadSpecification: unknown,
  openSpec: Partial<PipelineSnapshot['openSpec']> = {},
) {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { pipelineReadSpecification, pipelineRuntime: { discover: vi.fn(), start: vi.fn(), stop: vi.fn() } },
  });
  const snap = snapshot(openSpec);
  usePipelineStore.setState({
    snapshot: snap,
    selectedChangeId: null,
    openSpecificationId: null,
  });
  return render(
    <OpenSpecDashboard
      snapshot={snap}
      repoPath="C:/repo"
      currentBranch="main"
      workingTreeClean
      projection={null}
      runtimeHistory={[]}
      onRefresh={() => undefined}
      onPauseAfterTask={() => undefined}
      onRespondDecision={() => undefined}
    />,
  );
}

describe('abrir una especificación consolidada', () => {
  it('la especificación abierta muestra el contenido pedido', async () => {
    const read = vi.fn().mockResolvedValue({ success: true, content: '## Requisito: algo\n\ntexto' });
    renderDashboard(read);

    usePipelineStore.setState({ openSpecificationId: 'pipeline-guided-workflow' });

    expect(await screen.findByText(/Requisito: algo/)).toBeTruthy();
    // Se manda el identificador, no la ruta: el proceso principal la compone.
    expect(read).toHaveBeenCalledWith('C:/repo', 'pipeline-guided-workflow');
  });

  it('un archivo vacío se declara, no deja el visor en blanco', async () => {
    renderDashboard(vi.fn().mockResolvedValue({ success: true, content: '' }));

    usePipelineStore.setState({ openSpecificationId: 'pipeline-guided-workflow' });

    expect(await screen.findByText(/specifications\.emptyFile/)).toBeTruthy();
  });

  it('un fallo muestra el motivo real que informó el proceso principal', async () => {
    renderDashboard(vi.fn().mockResolvedValue({ success: false, error: 'too-large' }));

    usePipelineStore.setState({ openSpecificationId: 'pipeline-guided-workflow' });

    expect(await screen.findByText(/specifications\.unreadable.*too-large/)).toBeTruthy();
  });

  it('elegir un cambio cierra la especificación abierta', async () => {
    renderDashboard(vi.fn().mockResolvedValue({ success: true, content: '## Requisito: algo' }), {
      selectedChangeId: 'demo-change',
      activeChanges: [{
        changeId: 'demo-change',
        intent: 'una intención',
        tasks: [],
        proposalExists: true,
        designExists: true,
        specsCount: 1,
        validation: 'unknown' as const,
        artifacts: null,
      }],
    });

    usePipelineStore.setState({ openSpecificationId: 'pipeline-guided-workflow' });
    expect(await screen.findByText(/Requisito: algo/)).toBeTruthy();

    usePipelineStore.setState({ selectedChangeId: 'demo-change', openSpecificationId: null });

    await vi.waitFor(() => {
      expect(screen.queryByText(/Requisito: algo/)).toBeNull();
    });
  });

  it('el snapshot no transporta el contenido de las especificaciones', () => {
    // La razón de todo este camino: si el contenido volviera al snapshot, el
    // refresco pagaría cientos de kilobytes en cada guardado de archivo.
    const specification = snapshot().openSpec?.specifications?.[0];
    expect(specification).toBeDefined();
    expect(Object.keys(specification ?? {}).sort()).toEqual(['requirements', 'sourceRef', 'specificationId']);
  });
});
