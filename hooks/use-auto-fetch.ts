'use client';

import { useEffect, useRef } from 'react';
import { useGitStore } from '@/lib/git-store';
import { useRepoLoader } from './use-repo-loader';
import { notify } from '@/lib/os-notify';

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

    // Capture behind counts BEFORE refresh, to detect NEW commits coming in
    const behindBefore = new Map<string, Record<string, number>>();
    for (const repo of repos) {
      const tracking: Record<string, number> = {};
      for (const [branch, info] of Object.entries(repo.branchTracking ?? {})) {
        tracking[branch] = info?.behind ?? 0;
      }
      behindBefore.set(repo.path, tracking);
    }

    await Promise.allSettled(
      repos.map(async (repo) => {
        try {
          const r = await window.api.gitFetch(repo.path, token);
          if (r.success) {
            useGitStore.getState().updateRepoByPath(repo.path, { lastFetchError: null });
            await refreshBranches(repo.path);

            // After refresh, compare new behind counts with the snapshot.
            // Notify only if at least one branch gained new remote commits.
            const updated = useGitStore.getState().openRepos.find((x) => x.path === repo.path);
            const before = behindBefore.get(repo.path) ?? {};
            let newCommits = 0;
            const branchesWithNew: string[] = [];
            for (const [branch, info] of Object.entries(updated?.branchTracking ?? {})) {
              const prev = before[branch] ?? 0;
              const now = info?.behind ?? 0;
              if (now > prev) {
                newCommits += (now - prev);
                branchesWithNew.push(branch);
              }
            }
            if (newCommits > 0) {
              const branchList = branchesWithNew.slice(0, 3).join(', ')
                + (branchesWithNew.length > 3 ? '…' : '');
              notify(`GitCron — ${newCommits} commits nuevos`, {
                body: `${repo.name}: ${branchList}`,
                silent: true,
              });
            }
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
