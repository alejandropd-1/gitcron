import { describe, expect, it } from 'vitest';
import { isMissingPushSourceRef } from '../page-helpers';

describe('isMissingPushSourceRef', () => {
  it.each([
    "error: src refspec main does not match any",
    'fatal: the current branch does not have any commits yet',
    'failed to resolve ref HEAD',
  ])('detects a missing local branch or first commit: %s', (message) => {
    expect(isMissingPushSourceRef(message)).toBe(true);
  });

  it('does not hide unrelated GitHub failures', () => {
    expect(isMissingPushSourceRef('remote: Repository not found.')).toBe(false);
  });
});
