import type { BranchTrackingInfo } from '@/types/electron';

export type IntegrationDecision = {
  source: 'push' | 'pull';
  branch: string;
  ahead: number;
  behind: number;
  mode: 'behind' | 'diverged';
};

export function integrationDecisionFromTracking(
  source: 'push' | 'pull',
  branch: string | null,
  trackingByBranch: Record<string, BranchTrackingInfo>,
): IntegrationDecision | null {
  const tracking = branch ? trackingByBranch[branch] : undefined;
  if (!branch || !tracking?.upstream || tracking.gone || tracking.behind <= 0) return null;

  return {
    source,
    branch,
    ahead: tracking.ahead,
    behind: tracking.behind,
    mode: tracking.ahead > 0 ? 'diverged' : 'behind',
  };
}

export function isFetchFirstPushError(error: string | undefined): boolean {
  if (!error) return false;
  return /fetch first|non-fast-forward|remote contains work that you do not have locally/i.test(error);
}
