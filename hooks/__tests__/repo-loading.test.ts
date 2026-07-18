import { beforeEach, describe, expect, it } from 'vitest';
import { useGitStore } from '@/lib/git-store';
import { setRepoLoading } from '../git-actions/repo-loading';

describe('setRepoLoading', () => {
  beforeEach(() => {
    useGitStore.setState({ openRepos: [], activeRepoIdx: -1, repoPath: null });
  });

  it('clears the repository that started the operation after another tab becomes active', () => {
    const store = useGitStore.getState();
    store.setRepoPath('C:\\repos\\first');
    store.setRepoName('first');
    store.setRepoPath('C:\\repos\\second');
    store.setRepoName('second');

    store.setActiveRepoIdx(0);
    setRepoLoading('C:\\repos\\first', true);
    store.setActiveRepoIdx(1);
    setRepoLoading('C:\\repos\\first', false);

    const next = useGitStore.getState();
    expect(next.openRepos[0].isLoading).toBe(false);
    expect(next.openRepos[1].isLoading).toBe(false);
    expect(next.activeRepoIdx).toBe(1);
  });
});
