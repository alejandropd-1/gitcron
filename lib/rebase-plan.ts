export type RebaseAction = 'pick' | 'reword' | 'squash' | 'fixup' | 'drop';

export interface RebasePlanItem {
  hash: string;
  action: RebaseAction;
  newMessage?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a proposed interactive rebase plan.
 * Returns { valid: true } if valid, or { valid: false, error: string } with a description of the issue.
 */
export function validateRebasePlan(plan: RebasePlanItem[]): ValidationResult {
  if (!plan || plan.length === 0) {
    return { valid: false, error: 'rebase.validation.emptyPlan' };
  }

  // Check for duplicate hashes
  const seenHashes = new Set<string>();
  for (const item of plan) {
    const hash = item.hash.toLowerCase();
    if (seenHashes.has(hash)) {
      return { valid: false, error: 'rebase.validation.duplicateCommits' };
    }
    seenHashes.add(hash);
  }

  // Filter out comments/invalid actions
  const validActions = new Set<RebaseAction>(['pick', 'reword', 'squash', 'fixup', 'drop']);
  for (const item of plan) {
    if (!validActions.has(item.action)) {
      return { valid: false, error: 'rebase.validation.invalidAction' };
    }
  }

  // The first action in the plan cannot be 'squash' or 'fixup'
  // (Note: dropped commits are skipped or commented out. The first ACTIVE commit in the final sequence
  // cannot be a squash/fixup. If we drop some commits first, the first non-drop commit is the first active one.)
  const firstActiveItem = plan.find(item => item.action !== 'drop');
  if (firstActiveItem) {
    if (firstActiveItem.action === 'squash' || firstActiveItem.action === 'fixup') {
      return { valid: false, error: 'rebase.validation.invalidFirstSquash' };
    }
  } else {
    // If all commits are dropped
    return { valid: false, error: 'rebase.validation.allCommitsDropped' };
  }

  // Check message validations for reword/squash
  for (const item of plan) {
    if ((item.action === 'reword' || item.action === 'squash') && item.newMessage !== undefined) {
      if (item.newMessage.trim() === '') {
        return { valid: false, error: 'rebase.validation.emptyCommitMessage' };
      }
    }
  }

  return { valid: true };
}
