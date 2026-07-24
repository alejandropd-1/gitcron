import type { ChangeSelection } from '../../types/pipeline';

function candidatesFromBranch(branch: string): string[] {
  const normalized = branch.replace(/^refs\/heads\//, '');
  const slash = normalized.indexOf('/');
  if (slash < 0) return [];
  const suffix = normalized.slice(slash + 1);
  return [suffix, normalized, normalized.replaceAll('/', '-')];
}

export function selectPipelineChange(branch: string, activeChanges: string[]): ChangeSelection {
  const unique = [...new Set(activeChanges)];
  const branchCandidates = candidatesFromBranch(branch);
  const matches = unique.filter((change) => branchCandidates.includes(change));
  if (matches.length === 1) {
    return { changeId: matches[0], confidence: 'confirmed', selectionRequired: false, reason: 'branch-match' };
  }
  if (unique.length === 1) {
    return { changeId: unique[0], confidence: 'inferred', selectionRequired: false, reason: 'single-active-change' };
  }
  return {
    changeId: null,
    confidence: unique.length === 0 ? 'unknown' : 'confirmed',
    selectionRequired: unique.length > 1,
    reason: unique.length === 0 ? 'no-active-change' : 'ambiguous-active-changes',
  };
}
