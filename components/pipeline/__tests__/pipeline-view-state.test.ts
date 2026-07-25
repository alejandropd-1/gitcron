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
    availableSources: ['git', 'runtime', 'kit'],
    hermesConnected: true,
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
      snapshot: snapshot({ schemaVersion: '', hermesConnected: false, availableSources: ['git'] }),
    });
    expect(state).toEqual({ kind: 'incompatible', foundVersion: null });
  });

  it('keeps the remaining sources when the repo has no governance kit', () => {
    const state = resolvePipelineViewState({
      ...base,
      snapshot: snapshot({ availableSources: ['git', 'hermes', 'runtime'] }),
    });
    expect(state).toEqual({ kind: 'no-kit', availableSources: ['git', 'hermes', 'runtime'] });
  });

  it('treats a disconnected Hermes as a normal state, not a failure', () => {
    const state = resolvePipelineViewState({ ...base, snapshot: snapshot({ hermesConnected: false }) });
    expect(state.kind).toBe('hermes-offline');
  });

  it('reaches ready only with a compatible, complete snapshot', () => {
    const state = resolvePipelineViewState({ ...base, snapshot: snapshot() });
    expect(state.kind).toBe('ready');
  });
});
