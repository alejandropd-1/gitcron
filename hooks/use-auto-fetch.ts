'use client';

import { useEffect, useRef } from 'react';
import { useGitStore } from '@/lib/git-store';
import { useRepoLoader } from './use-repo-loader';

/**
 * Background fetch loop. Iterates `openRepos` on a configurable interval and
 * runs `git fetch --all --prune` per repo, refreshing branch tracking on success.
 * Does NOT call refreshLog to avoid disturbing the user's scroll position.
 */
export const useAutoFetch = () => {
  const autoFetchEnabled = useGitStore((s) => s.autoFetchEnabled);
  const autoFetchIntervalMinutes = useGitStore((s) => s.autoFetchIntervalMinutes);
  const { refreshBranches } = useRepoLoader();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  const runFetchCycle = async () => {
    if (runningRef.current) return;
    if (!window.api) return;
    const state = useGitStore.getState();
    const repos = state.openRepos;
    if (repos.length === 0) return;

    runningRef.current = true;
    state.setFetchingRemote(true);
    const token = state.githubToken ?? undefined;

    await Promise.allSettled(
      repos.map(async (repo) => {
        try {
          const r = await window.api.gitFetch(repo.path, token);
          if (r.success) {
            useGitStore.getState().updateRepoByPath(repo.path, { lastFetchError: null });
            await refreshBranches(repo.path);
          } else {
            useGitStore.getState().updateRepoByPath(repo.path, {
              lastFetchError: r.error ?? 'fetch failed',
            });
          }
        } catch (err: any) {
          useGitStore.getState().updateRepoByPath(repo.path, {
            lastFetchError: err?.message ?? 'fetch failed',
          });
        }
      }),
    );

    useGitStore.getState().setFetchingRemote(false);
    useGitStore.getState().setLastFetchTime(Date.now());
    runningRef.current = false;
  };

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!autoFetchEnabled) return;
    const minutes = Math.max(1, autoFetchIntervalMinutes);
    const ms = minutes * 60 * 1000;
    timerRef.current = setInterval(runFetchCycle, ms);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetchEnabled, autoFetchIntervalMinutes]);

  return { runFetchCycle };
};
