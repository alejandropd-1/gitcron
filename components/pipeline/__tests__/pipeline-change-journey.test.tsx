// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNewChangeDraftStore } from '@/lib/new-change-draft-store';
import type { RuntimeProjection } from '@/types/pipeline';
import { PipelineNewChangeFlow } from '../PipelineNewChangeFlow';

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

vi.mock('../PipelineRuntimeLauncher', () => ({
  PipelineRuntimeLauncher: ({ onStarted }: { onStarted?: (sessionId: string) => void }) => (
    <button
      type="button"
      data-testid="launcher-start-btn"
      onClick={async () => {
        const api = (window as unknown as { api?: { pipelineRuntime?: { start?: (opts: unknown) => Promise<{ success: boolean; data: { sessionId: string } }> } } }).api;
        if (!api?.pipelineRuntime?.start) return;
        const res = await api.pipelineRuntime.start({ repoPath: 'C:/repo' });
        if (res?.success) onStarted?.(res.data.sessionId);
      }}
    >
      Iniciar
    </button>
  ),
}));

const mockStart = vi.fn();
const mockHistory = vi.fn();
const mockGetArtifactGraph = vi.fn();
const mockGitCreateBranch = vi.fn();
const ORIGINAL_API = (globalThis as { window?: { api?: unknown } }).window?.api;

beforeEach(() => {
  useNewChangeDraftStore.setState({ drafts: {} });
  mockStart.mockReset().mockResolvedValue({ success: true, data: { sessionId: 'sess-auto-1' } });
  mockHistory.mockReset().mockResolvedValue({ success: true, data: [] });
  mockGetArtifactGraph.mockReset().mockResolvedValue({ ok: true, artifacts: [] });
  mockGitCreateBranch.mockReset().mockResolvedValue({ success: true });

  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      pipelineRuntime: {
        start: mockStart,
        history: mockHistory,
      },
      pipelineOpenSpec: {
        getArtifactGraph: mockGetArtifactGraph,
      },
      gitCreateBranch: mockGitCreateBranch,
    },
  });
});

afterEach(() => {
  cleanup();
  if (ORIGINAL_API === undefined) delete (window as { api?: unknown }).api;
  else Object.defineProperty(window, 'api', { configurable: true, value: ORIGINAL_API });
});

function renderFlow(projection: RuntimeProjection | null = null, repoPath = 'C:/repo') {
  return render(
    <PipelineNewChangeFlow
      repoPath={repoPath}
      projection={projection}
      onStarted={() => undefined}
    />,
  );
}

describe('PipelineNewChangeFlow · Recorrido de apertura (Tanda 4a)', () => {
  it('(a) el riel tiene cuatro pasos y el actual lleva aria-current', () => {
    const { container } = renderFlow();
    const listItems = container.querySelectorAll('ol > li');
    expect(listItems.length).toBe(4);

    // Por defecto el paso es propose
    expect(listItems[1].getAttribute('aria-current')).toBe('step');
    expect(listItems[1].getAttribute('data-state')).toBe('current');
    expect(listItems[0].getAttribute('aria-current')).toBeNull();

    // Cambiar al paso explore desde el riel
    fireEvent.click(screen.getByRole('button', { name: /journey\.step\.explore/ }));
    expect(listItems[0].getAttribute('aria-current')).toBe('step');
    expect(listItems[0].getAttribute('data-state')).toBe('current');
    expect(listItems[1].getAttribute('aria-current')).toBeNull();
  });

  it('(b) explorar declara que el motor no expone la operación y ofrece saltar', () => {
    useNewChangeDraftStore.getState().patchDraft('C:/repo', { step: 'explore' });
    const { container } = renderFlow();

    expect(screen.getByText('pipeline.journey.explore.notExposed')).toBeTruthy();
    const skipBtn = screen.getByRole('button', { name: 'pipeline.journey.explore.skip' });
    expect(skipBtn).toBeTruthy();

    fireEvent.click(skipBtn);

    // Salta a propose y deja explore en pending
    expect(useNewChangeDraftStore.getState().drafts['C:/repo'].step).toBe('propose');
    const listItems = container.querySelectorAll('ol > li');
    expect(listItems[0].getAttribute('data-state')).toBe('pending');
    expect(listItems[1].getAttribute('data-state')).toBe('current');
  });

  it('(c) con una sesión de explorar con outcome completed y activity muestra la actividad, queda done y presenta proponer; con failed muestra outcome y no avanza', () => {
    // 1. Caso completed con actividad
    useNewChangeDraftStore.getState().patchDraft('C:/repo', {
      step: 'explore',
      sessions: { explore: 'sess-exp-done', propose: null },
    });

    const completedProjection: RuntimeProjection = {
      schemaVersion: '1.0',
      repoId: 'repo-1',
      sessionId: 'sess-exp-done',
      runtime: 'claude',
      changeId: null,
      taskId: null,
      role: 'builder',
      active: false,
      outcome: 'completed',
      startedAt: '2026-09-21T10:00:00Z',
      endedAt: '2026-09-21T10:05:00Z',
      agents: [],
      activity: [
        {
          entryId: 'act-1',
          channel: 'narrative',
          text: 'Actividad de exploración completada',
          at: '2026-09-21T10:01:00Z',
          agentId: null,
        },
      ],
      reasoningVisibility: 'emitted',
      telemetry: null,
      controlCapabilities: [],
      droppedActivity: 0,
      diagnostics: [],
    };

    const { unmount, container } = renderFlow(completedProjection);

    expect(screen.getByText('Actividad de exploración completada')).toBeTruthy();
    const reasoningBtn = container.querySelector('button[data-channel="reasoning"]') as HTMLButtonElement;
    expect(reasoningBtn?.disabled).toBe(false);
    expect(reasoningBtn?.getAttribute('role')).toBe('switch');
    expect(reasoningBtn?.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(reasoningBtn);
    expect(reasoningBtn?.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(reasoningBtn);
    expect(reasoningBtn?.getAttribute('aria-checked')).toBe('true');
    const listItems = container.querySelectorAll('ol > li');
    expect(listItems[0].getAttribute('data-state')).toBe('done');

    // Presenta el botón para avanzar a proponer
    const nextBtn = screen.getByRole('button', { name: 'pipeline.journey.explore.next' });
    expect(nextBtn).toBeTruthy();

    fireEvent.click(nextBtn);
    expect(useNewChangeDraftStore.getState().drafts['C:/repo'].step).toBe('propose');

    unmount();

    // 2. Caso failed: muestra el outcome y no presenta el botón de avance
    useNewChangeDraftStore.getState().patchDraft('C:/repo', {
      step: 'explore',
      sessions: { explore: 'sess-exp-fail', propose: null },
    });

    const failedProjection: RuntimeProjection = {
      ...completedProjection,
      sessionId: 'sess-exp-fail',
      outcome: 'failed',
      activity: [],
    };

    const { container: failContainer } = renderFlow(failedProjection);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('failed');
    expect(failContainer.querySelectorAll('ol > li')[0].getAttribute('data-state')).toBe('current');
    expect(screen.queryByRole('button', { name: 'pipeline.journey.explore.next' })).toBeNull();
  });

  it('(d) proponer queda done sólo cuando getArtifactGraph devuelve el cambio con artefactos; con ok: false muestra el error', async () => {
    // 1. Caso ok: true con artefactos
    mockGetArtifactGraph.mockResolvedValueOnce({
      ok: true,
      artifacts: [{ id: 'proposal', status: 'done' }],
    });

    useNewChangeDraftStore.getState().patchDraft('C:/repo', {
      step: 'propose',
      proposedChangeId: 'mi-cambio',
      sessions: { explore: null, propose: 'sess-prop-done' },
    });

    const { unmount, container } = renderFlow();

    await waitFor(() => {
      const listItems = container.querySelectorAll('ol > li');
      expect(listItems[1].getAttribute('data-state')).toBe('done');
    });

    unmount();

    // 2. Caso ok: false con error
    mockGetArtifactGraph.mockResolvedValueOnce({
      ok: false,
      error: 'Error de prueba del motor OpenSpec',
    });

    useNewChangeDraftStore.getState().patchDraft('C:/repo', {
      step: 'propose',
      proposedChangeId: 'mi-cambio-error',
      sessions: { explore: null, propose: 'sess-prop-err' },
    });

    const { container: errContainer } = renderFlow();

    await waitFor(() => {
      expect(screen.getByText('Error de prueba del motor OpenSpec')).toBeTruthy();
      const listItems = errContainer.querySelectorAll('ol > li');
      expect(listItems[1].getAttribute('data-state')).toBe('current');
    });
  });

  it('(e) ninguna operación corre sin confirmar: pipelineRuntime.start no se llama al montar ni al cambiar de paso, sólo desde el botón del lanzador', async () => {
    renderFlow();
    expect(mockStart).not.toHaveBeenCalled();

    // Cambiar de paso en el riel
    fireEvent.click(screen.getByRole('button', { name: /journey\.step\.explore/ }));
    expect(mockStart).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /journey\.step\.apply/ }));
    expect(mockStart).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /journey\.step\.archive/ }));
    expect(mockStart).not.toHaveBeenCalled();

    // Saltar a proponer
    fireEvent.click(screen.getByRole('button', { name: /journey\.step\.explore/ }));
    fireEvent.click(screen.getByRole('button', { name: 'pipeline.journey.explore.skip' }));
    expect(mockStart).not.toHaveBeenCalled();

    // Completar campos y pedir revisión
    const [objective, slugField] = screen.getAllByRole('textbox');
    fireEvent.change(objective, { target: { value: 'Completar flujo' } });
    fireEvent.change(slugField, { target: { value: 'completar-flujo' } });

    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.(createBranchAndReview|review)/ }));
    expect(mockStart).not.toHaveBeenCalled();

    // Sólo se llama al pulsar el botón del lanzador
    fireEvent.click(await screen.findByTestId('launcher-start-btn'));
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('(f) aplicar y archivar no ofrecen acción', () => {
    useNewChangeDraftStore.getState().patchDraft('C:/repo', { step: 'apply' });
    const { unmount, container } = renderFlow();

    expect(screen.getByText('pipeline.journey.continuesInChange')).toBeTruthy();
    expect(container.querySelectorAll('textarea, input').length).toBe(0);
    // En el riel llevan data-state declared
    expect(container.querySelectorAll('ol > li')[2].getAttribute('data-state')).toBe('declared');
    expect(container.querySelectorAll('ol > li')[2].getAttribute('aria-current')).toBe('step');

    unmount();

    useNewChangeDraftStore.getState().patchDraft('C:/repo', { step: 'archive' });
    const { container: archiveContainer } = renderFlow();

    expect(screen.getByText('pipeline.journey.continuesInChange')).toBeTruthy();
    expect(archiveContainer.querySelectorAll('textarea, input').length).toBe(0);
    expect(archiveContainer.querySelectorAll('ol > li')[3].getAttribute('data-state')).toBe('declared');
    expect(archiveContainer.querySelectorAll('ol > li')[3].getAttribute('aria-current')).toBe('step');
  });
});
