import { describe, expect, it } from 'vitest';
import { remoteBranchTarget } from '../branch-upstream';

describe('remoteBranchTarget', () => {
  it('preserves a remote branch name that differs from the local branch', () => {
    expect(remoteBranchTarget('origin/feat/astro.scaffold', 'feat/astro-scaffold')).toEqual({
      remote: 'origin',
      branch: 'feat/astro.scaffold',
    });
  });

  it('falls back to origin and the local name without a valid upstream', () => {
    expect(remoteBranchTarget(null, 'feature/local')).toEqual({
      remote: 'origin',
      branch: 'feature/local',
    });
  });
});
