import { useGitStore } from '@/lib/git-store';

/**
 * Updates the loading flag of the repository that started an async operation.
 * The active tab may change before the operation settles, so using the legacy
 * active-repo setter in a finally block can otherwise leave the original tab
 * spinning forever.
 */
export function setRepoLoading(repoPath: string | null, isLoading: boolean): void {
  const state = useGitStore.getState();
  if (repoPath) {
    state.updateRepoByPath(repoPath, { isLoading });
    return;
  }
  state.setLoading(isLoading);
}
