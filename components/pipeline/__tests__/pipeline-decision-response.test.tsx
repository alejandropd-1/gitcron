// @vitest-environment jsdom

// El inspector del panel derecho montaba DecisionInbox sin onRespondDecision:
// la opción quedaba habilitada pero el clic no enviaba nada. Aquí se monta el
// RepoDetailsPanel real (SDD) con su inspector, y el clic en la opción visible
// debe llegar al contrato IPC que ya usaba PipelineWorkspace.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeProjection } from '@/types/pipeline';
import { RepoDetailsPanel } from '../../RepoDetailsPanel';
import { useGitStore } from '@/lib/git-store';
import { usePipelineStore } from '@/lib/pipeline-store';
import { REJECTED_SNAPSHOT } from '../__fixtures__/pipeline-fixtures';

type RespondPayload = {
  repoPath: string;
  sessionId: string;
  decisionId: string;
  optionId: string;
  nonce: string;
};

const respondDecisionSpy = vi.fn().mockResolvedValue({ success: true });
const shellOpenItemSpy = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/hooks/use-git-actions', () => ({
  useGitActions: () => ({
    commitChanges: vi.fn(),
    stageFile: vi.fn(),
    stageFiles: vi.fn(),
    continueInteractiveRebase: vi.fn(),
    abortInteractiveRebase: vi.fn(),
    undoInteractiveRebase: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  tNow: (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

function projection(overrides: Partial<RuntimeProjection> = {}): RuntimeProjection {
  return {
    schemaVersion: '1.0',
    repoId: 'fixture-repo',
    sessionId: 'sess-respond',
    runtime: 'claude',
    changeId: null,
    taskId: null,
    role: 'orchestrator',
    active: true,
    outcome: null,
    startedAt: '2026-09-28T10:00:00.000Z',
    endedAt: null,
    agents: [],
    activity: [],
    reasoningVisibility: 'emitted',
    telemetry: null,
    controlCapabilities: ['respond-decision'],
    droppedActivity: 0,
    diagnostics: [],
    ...overrides,
  } as unknown as RuntimeProjection;
}

function renderPanel() {
  return render(
    <RepoDetailsPanel
      activeTab="Pipeline"
      graphMode="chronometric"
      detailsW={320}
      visible
      isDragging={false}
      onResizeStart={vi.fn()}
      onOpenStashModal={vi.fn()}
      onOpenCommitFile={vi.fn()}
      onSelectFile={vi.fn()}
      onDiscardRequest={vi.fn()}
      onRequestAmend={vi.fn()}
      onRequestSquash={vi.fn()}
      onFileContextMenu={vi.fn()}
      onRequestResetAll={vi.fn()}
      onRequestCleanUntracked={vi.fn()}
    />,
  );
}

function setStores(next: { projection?: RuntimeProjection | null }) {
  usePipelineStore.setState({
    prepareOpen: false,
    reviewOpen: false,
    aiNotice: null,
    snapshot: REJECTED_SNAPSHOT,
    projection: next.projection ?? null,
    runtimeHistory: [],
    selectedChangeId: null,
    openSpecificationId: null,
    expandedChanges: {},
    lastPreparedCount: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      pipelineControl: { respondDecision: respondDecisionSpy },
      shellOpenItem: shellOpenItemSpy,
    },
  });
  useGitStore.setState({
    repoPath: 'C:/test-repo',
    currentBranch: 'feature/respond-decision',
    selectedCommit: null,
    modifiedFiles: [],
    commitMessage: '',
    isLoading: false,
  });
});

afterEach(() => {
  cleanup();
  usePipelineStore.setState({
    prepareOpen: false,
    reviewOpen: false,
    aiNotice: null,
    snapshot: null,
    projection: null,
    runtimeHistory: [],
    selectedChangeId: null,
  });
  useGitStore.setState({
    repoPath: null,
    selectedCommit: null,
    selectedFile: null,
    modifiedFiles: [],
    commitMessage: '',
  });
  delete (window as { api?: unknown }).api;
});

describe('respuesta compartida de decisiones', { timeout: 15_000 }, () => {
  it('el clic en la opción del inspector envía el contrato IPC ligado al repo y a la decisión', () => {
    setStores({ projection: projection() });
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'pipeline.option.approve' }));

    expect(respondDecisionSpy).toHaveBeenCalledTimes(1);
    const [payload] = respondDecisionSpy.mock.calls[0] as [RespondPayload];
    expect(payload.repoPath).toBe('C:/test-repo');
    expect(payload.sessionId).toBe('sess-respond');
    expect(payload.decisionId).toBe('dec-1');
    expect(payload.optionId).toBe('approve');
    expect(typeof payload.nonce).toBe('string');
    expect(payload.nonce.length).toBeGreaterThan(0);
  });

  it('no envía sin sesión activa', () => {
    setStores({ projection: null });
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'pipeline.option.approve' }));

    expect(respondDecisionSpy).not.toHaveBeenCalled();
  });

  it('no envía sin la capacidad respond-decision', () => {
    setStores({ projection: projection({ controlCapabilities: [] }) });
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'pipeline.option.approve' }));

    expect(respondDecisionSpy).not.toHaveBeenCalled();
  });

  it('estado «enviando» por decisión: muestra aviso de envío y deshabilita botones mientras está en vuelo y tras el acuse', async () => {
    let resolveIpc: (val: unknown) => void = () => {};
    respondDecisionSpy.mockReturnValue(
      new Promise((resolve) => {
        resolveIpc = resolve;
      }),
    );

    setStores({ projection: projection() });
    renderPanel();

    const button = screen.getByRole('button', { name: 'pipeline.option.approve' });
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);

    expect(screen.getByText('pipeline.decision.sending')).toBeDefined();
    expect((button as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveIpc({ success: true });
    });

    // Sin rehabilitar botones tras un acuse: permanece deshabilitado hasta que la proyección resuelva la decisión
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('tocar «Ver evidencia» llama a shellOpenItem con la ruta relativa y nunca a respondDecision', async () => {
    setStores({ projection: projection() });
    renderPanel();

    const viewEvidenceBtn = screen.getByRole('button', { name: 'pipeline.option.viewEvidence' });
    await act(async () => {
      fireEvent.click(viewEvidenceBtn);
    });

    expect(shellOpenItemSpy).toHaveBeenCalledTimes(1);
    expect(shellOpenItemSpy).toHaveBeenCalledWith('C:/test-repo', 'gates.jsonl');
    expect(respondDecisionSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('pipeline.control.respondUnsupported')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('archivo de evidencia que no se puede abrir informa que no se encontró sin afirmar resolución', async () => {
    shellOpenItemSpy.mockResolvedValueOnce({ success: false, error: 'not found' });
    setStores({ projection: projection() });
    renderPanel();

    const viewEvidenceBtn = screen.getByRole('button', { name: 'pipeline.option.viewEvidence' });
    await act(async () => {
      fireEvent.click(viewEvidenceBtn);
    });

    expect(shellOpenItemSpy).toHaveBeenCalledWith('C:/test-repo', 'gates.jsonl');
    expect(respondDecisionSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('pipeline.decision.evidenceNotFound');
  });

  it('presenta solicitudes como avisos con badge de aviso y título de bandeja cuando sus opciones son informativas', () => {
    setStores({ projection: projection() });
    renderPanel();

    expect(screen.getByRole('heading', { level: 4, name: 'pipeline.inbox.title' })).toBeDefined();
    const badges = screen.getAllByText('pipeline.decision.notice');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('error visible si el IPC rechaza o devuelve error', async () => {
    // Caso A: IPC responde success: false
    respondDecisionSpy.mockResolvedValueOnce({ success: false, error: 'rejected' });
    setStores({ projection: projection() });
    const { unmount } = renderPanel();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'pipeline.option.approve' }));
    });

    expect(screen.getByRole('alert').textContent).toContain('pipeline.decision.error');

    unmount();

    // Caso B: IPC rechaza con excepción
    respondDecisionSpy.mockRejectedValueOnce(new Error('IPC crash'));
    renderPanel();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'pipeline.option.approve' }));
    });

    expect(screen.getByRole('alert').textContent).toContain('pipeline.decision.error');
  });

  it('protección de doble clic: un segundo clic mientras se envía no vuelve a enviar', async () => {
    let resolveIpc: (val: unknown) => void = () => {};
    respondDecisionSpy.mockReturnValue(
      new Promise((resolve) => {
        resolveIpc = resolve;
      }),
    );

    setStores({ projection: projection() });
    renderPanel();

    const button = screen.getByRole('button', { name: 'pipeline.option.approve' });

    // Primer clic envía
    fireEvent.click(button);
    expect(respondDecisionSpy).toHaveBeenCalledTimes(1);

    // Segundo clic mientras está pendiente
    fireEvent.click(button);
    expect(respondDecisionSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveIpc({ success: true });
    });
  });

  it('una respuesta que llega después de cambiar de repositorio no toca el estado del repositorio nuevo', async () => {
    let resolveIpc: (val: unknown) => void = () => {};
    respondDecisionSpy.mockReturnValue(
      new Promise((resolve) => {
        resolveIpc = resolve;
      }),
    );

    setStores({ projection: projection() });
    const { rerender } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'pipeline.option.approve' }));
    expect(respondDecisionSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('pipeline.decision.sending')).toBeDefined();

    // El usuario cambia de repositorio
    await act(async () => {
      useGitStore.setState({ repoPath: 'C:/other-repo' });
    });
    rerender(
      <RepoDetailsPanel
        activeTab="Pipeline"
        graphMode="chronometric"
        detailsW={320}
        visible
        isDragging={false}
        onResizeStart={vi.fn()}
        onOpenStashModal={vi.fn()}
        onOpenCommitFile={vi.fn()}
        onSelectFile={vi.fn()}
        onDiscardRequest={vi.fn()}
        onRequestAmend={vi.fn()}
        onRequestSquash={vi.fn()}
        onFileContextMenu={vi.fn()}
        onRequestResetAll={vi.fn()}
        onRequestCleanUntracked={vi.fn()}
      />,
    );

    expect(screen.queryByText('pipeline.decision.sending')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();

    // Llega respuesta tardía con error del repo anterior
    await act(async () => {
      resolveIpc({ success: false });
    });

    // El repo nuevo no debe verse afectado por la respuesta del repo anterior
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('pipeline.decision.sending')).toBeNull();
  });
});
