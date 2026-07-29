import { describe, expect, it } from 'vitest';
import {
  resolvePipelineViewState,
  SUPPORTED_SNAPSHOT_VERSION,
  type PipelineSnapshot,
} from '../pipeline-view-state';
import { RUNNING_SNAPSHOT } from '../__fixtures__/pipeline-fixtures';

function snapshot(overrides: Partial<PipelineSnapshot> = {}): PipelineSnapshot {
  return {
    ...RUNNING_SNAPSHOT,
    schemaVersion: SUPPORTED_SNAPSHOT_VERSION,
    repoId: 'repo-1',
    availableSources: ['git', 'runtime', 'openspec'],
    hasPipelineActivity: true,
    ...overrides,
  };
}

const base = { repoPath: 'C:\\repo', snapshot: null, isLoading: false, error: null };

describe('resolvePipelineViewState', () => {
  it('asks for a repository before anything else', () => {
    expect(resolvePipelineViewState({ ...base, repoPath: null, isLoading: true }))
      .toEqual({ kind: 'no-repo' });
  });

  it('surfaces a recoverable error over the loading state', () => {
    const state = resolvePipelineViewState({
      ...base,
      isLoading: true,
      error: { messageKey: 'pipeline.error.title', canRetry: true },
    });
    expect(state).toEqual({ kind: 'error', messageKey: 'pipeline.error.title', canRetry: true });
  });

  it('reports no activity instead of an error when the repo is simply idle', () => {
    expect(resolvePipelineViewState(base)).toEqual({ kind: 'no-pipeline' });
    expect(resolvePipelineViewState({ ...base, snapshot: snapshot({ hasPipelineActivity: false }) }))
      .toEqual({ kind: 'no-pipeline' });
  });

  it('refuses to interpret an unknown envelope version', () => {
    const state = resolvePipelineViewState({ ...base, snapshot: snapshot({ schemaVersion: '9.9' }) });
    expect(state).toEqual({ kind: 'incompatible', foundVersion: '9.9' });
  });

  it('an unknown version wins over every other degradation', () => {
    // Si no sabemos leer el sobre, no podemos afirmar nada sobre su contenido.
    const state = resolvePipelineViewState({
      ...base,
      snapshot: snapshot({ schemaVersion: '', availableSources: ['git'] }),
    });
    expect(state).toEqual({ kind: 'incompatible', foundVersion: null });
  });

  // El workspace ya no exige la presencia del kit multi-agente retirado: con un
  // snapshot legible alcanza, y la ausencia de cambios la resuelve la propia
  // guía dentro del workspace.
  it('reaches ready with only Git as a source', () => {
    const state = resolvePipelineViewState({
      ...base,
      snapshot: snapshot({ availableSources: ['git'] }),
    });
    expect(state.kind).toBe('ready');
  });

  it('reaches ready only with a compatible, complete snapshot', () => {
    const state = resolvePipelineViewState({ ...base, snapshot: snapshot() });
    expect(state.kind).toBe('ready');
  });
});
