import { describe, it, expect } from 'vitest';
import { validateRebasePlan, type RebasePlanItem } from '../rebase-plan';

describe('validateRebasePlan', () => {
  it('should pass on a valid reorder and pick plan', () => {
    const plan: RebasePlanItem[] = [
      { hash: 'sha1', action: 'pick' },
      { hash: 'sha2', action: 'pick' },
    ];
    expect(validateRebasePlan(plan)).toEqual({ valid: true });
  });

  it('should pass on a valid plan with rewords and drops', () => {
    const plan: RebasePlanItem[] = [
      { hash: 'sha2', action: 'reword', newMessage: 'New Commit Message 2' },
      { hash: 'sha1', action: 'pick' },
      { hash: 'sha3', action: 'drop' },
    ];
    expect(validateRebasePlan(plan)).toEqual({ valid: true });
  });

  it('should pass when squash/fixup occurs after a pick', () => {
    const plan: RebasePlanItem[] = [
      { hash: 'sha1', action: 'pick' },
      { hash: 'sha2', action: 'squash', newMessage: 'Squashed commit message' },
      { hash: 'sha3', action: 'fixup' },
    ];
    expect(validateRebasePlan(plan)).toEqual({ valid: true });
  });

  it('should fail on empty plan', () => {
    expect(validateRebasePlan([])).toEqual({
      valid: false,
      error: 'rebase.validation.emptyPlan',
    });
  });

  it('should fail on duplicate hashes', () => {
    const plan: RebasePlanItem[] = [
      { hash: 'sha1', action: 'pick' },
      { hash: 'sha1', action: 'pick' },
    ];
    expect(validateRebasePlan(plan)).toEqual({
      valid: false,
      error: 'rebase.validation.duplicateCommits',
    });
  });

  it('should fail if the first action is squash', () => {
    const plan: RebasePlanItem[] = [
      { hash: 'sha1', action: 'squash', newMessage: 'Combined message' },
      { hash: 'sha2', action: 'pick' },
    ];
    expect(validateRebasePlan(plan)).toEqual({
      valid: false,
      error: 'rebase.validation.invalidFirstSquash',
    });
  });

  it('should fail if the first action is fixup', () => {
    const plan: RebasePlanItem[] = [
      { hash: 'sha1', action: 'fixup' },
      { hash: 'sha2', action: 'pick' },
    ];
    expect(validateRebasePlan(plan)).toEqual({
      valid: false,
      error: 'rebase.validation.invalidFirstSquash',
    });
  });

  it('should fail if all commits are dropped', () => {
    const plan: RebasePlanItem[] = [
      { hash: 'sha1', action: 'drop' },
      { hash: 'sha2', action: 'drop' },
    ];
    expect(validateRebasePlan(plan)).toEqual({
      valid: false,
      error: 'rebase.validation.allCommitsDropped',
    });
  });

  it('should fail if first active action (after drops) is squash', () => {
    const plan: RebasePlanItem[] = [
      { hash: 'sha1', action: 'drop' },
      { hash: 'sha2', action: 'squash', newMessage: 'Combined' },
      { hash: 'sha3', action: 'pick' },
    ];
    expect(validateRebasePlan(plan)).toEqual({
      valid: false,
      error: 'rebase.validation.invalidFirstSquash',
    });
  });

  it('should fail if reword message is empty', () => {
    const plan: RebasePlanItem[] = [
      { hash: 'sha1', action: 'reword', newMessage: '   ' },
    ];
    expect(validateRebasePlan(plan)).toEqual({
      valid: false,
      error: 'rebase.validation.emptyCommitMessage',
    });
  });

  it('should fail if squash message is empty', () => {
    const plan: RebasePlanItem[] = [
      { hash: 'sha1', action: 'pick' },
      { hash: 'sha2', action: 'squash', newMessage: '' },
    ];
    expect(validateRebasePlan(plan)).toEqual({
      valid: false,
      error: 'rebase.validation.emptyCommitMessage',
    });
  });
});
