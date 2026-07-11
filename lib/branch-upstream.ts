export type RemoteBranchTarget = {
  remote: string;
  branch: string;
};

/**
 * Converts Git's short upstream form (`origin/feature/name`) into the remote
 * and branch arguments expected by `git push <remote> --delete <branch>`.
 */
export function remoteBranchTarget(
  upstream: string | null | undefined,
  fallbackBranch: string,
): RemoteBranchTarget {
  if (!upstream) return { remote: 'origin', branch: fallbackBranch };

  const separator = upstream.indexOf('/');
  if (separator <= 0 || separator === upstream.length - 1) {
    return { remote: 'origin', branch: fallbackBranch };
  }

  return {
    remote: upstream.slice(0, separator),
    branch: upstream.slice(separator + 1),
  };
}
