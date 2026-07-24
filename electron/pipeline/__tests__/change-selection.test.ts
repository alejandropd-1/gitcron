import { describe, expect, it } from 'vitest';
import { selectPipelineChange } from '../change-selection';

describe('selectPipelineChange', () => {
  it('prefers an unambiguous branch match', () => {
    expect(selectPipelineChange('feature/add-auth', ['add-auth', 'other'])).toMatchObject({ changeId: 'add-auth', confidence: 'confirmed', selectionRequired: false });
  });

  it('infers the only active change', () => {
    expect(selectPipelineChange('main', ['only-change'])).toMatchObject({ changeId: 'only-change', confidence: 'inferred' });
  });

  it('requires selection for multiple unmatched changes', () => {
    expect(selectPipelineChange('main', ['one', 'two'])).toMatchObject({ changeId: null, selectionRequired: true });
  });

  it('does not confuse auth with oauth and maps pipeline branch names exactly', () => {
    expect(selectPipelineChange('feature/auth', ['auth', 'oauth'])).toMatchObject({ changeId: 'auth', selectionRequired: false });
    expect(selectPipelineChange('pipeline/fase-01-modelo-evidencia', ['pipeline-fase-01-modelo-evidencia'])).toMatchObject({ changeId: 'pipeline-fase-01-modelo-evidencia' });
  });
});
