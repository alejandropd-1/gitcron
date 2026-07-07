import { describe, expect, it } from 'vitest';
import { parseMergedBranches, isBranchMerged } from '../../electron/ipc/branch-merge';

// Fixtures = salida cruda de `git branch --merged <base>`.

describe('parseMergedBranches', () => {
  it('quita prefijos (dos espacios, "* " actual, "+ " worktree) y trimea', () => {
    const raw = [
      '  feature-a',
      '* main',
      '+ worktree-branch',
      '  release/1.0',
    ].join('\n');
    expect(parseMergedBranches(raw)).toEqual([
      'feature-a',
      'main',
      'worktree-branch',
      'release/1.0',
    ]);
  });

  it('descarta líneas de HEAD detachado y vacías', () => {
    const raw = [
      '* (HEAD detached at 1a2b3c4)',
      '  main',
      '',
      '   ',
      '  feature-b',
    ].join('\n');
    expect(parseMergedBranches(raw)).toEqual(['main', 'feature-b']);
  });

  it('salida vacía → lista vacía', () => {
    expect(parseMergedBranches('')).toEqual([]);
    expect(parseMergedBranches('\n\n')).toEqual([]);
  });
});

describe('isBranchMerged', () => {
  const raw = ['  feature-a', '* main', '  release/1.0'].join('\n');

  it('true cuando la branch está en la lista de mergeadas', () => {
    expect(isBranchMerged('feature-a', raw)).toBe(true);
    expect(isBranchMerged('release/1.0', raw)).toBe(true);
  });

  it('false cuando la branch NO está mergeada', () => {
    expect(isBranchMerged('feature-nueva', raw)).toBe(false);
  });

  it('no hace match parcial de nombres', () => {
    // "feature" no debe matchear "feature-a"
    expect(isBranchMerged('feature', raw)).toBe(false);
  });
});
