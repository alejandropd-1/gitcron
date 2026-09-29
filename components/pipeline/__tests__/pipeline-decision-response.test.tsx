// @vitest-environment jsdom

// El inspector del panel derecho montaba DecisionInbox sin onRespondDecision:
// la opción quedaba habilitada pero el clic no enviaba nada. Aquí se monta el
// RepoDetailsPanel real (SDD) con su inspector, y el clic en la opción visible
// debe llegar al contrato IPC que ya usaba PipelineWorkspace.

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    value: { pipelineControl: { respondDecision: respondDecisionSpy } },
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
});
