import { describe, expect, it } from 'vitest';
import { integrationDecisionFromTracking, isFetchFirstPushError } from '../push-preflight';

describe('integrationDecisionFromTracking', () => {
  it('returns a diverged decision when the branch is both ahead and behind', () => {
    expect(integrationDecisionFromTracking('push', 'main', {
      main: { upstream: 'origin/main', ahead: 1, behind: 2, gone: false, hasRemote: true },
    })).toEqual({
      source: 'push',
      branch: 'main',
      ahead: 1,
      behind: 2,
      mode: 'diverged',
    });
  });

  it('returns a behind decision when no local commits need publishing', () => {
    expect(integrationDecisionFromTracking('pull', 'main', {
      main: { upstream: 'origin/main', ahead: 0, behind: 1, gone: false, hasRemote: true },
    })?.mode).toBe('behind');
  });

  it('does not interrupt an up-to-date push', () => {
    expect(integrationDecisionFromTracking('push', 'main', {
      main: { upstream: 'origin/main', ahead: 1, behind: 0, gone: false, hasRemote: true },
    })).toBeNull();
  });
});

describe('isFetchFirstPushError', () => {
  it.each([
    '[rejected] main -> main (fetch first)',
    'Updates were rejected because the remote contains work that you do not have locally.',
    '! [rejected] main -> main (non-fast-forward)',
  ])('recognizes a remote race: %s', (message) => {
    expect(isFetchFirstPushError(message)).toBe(true);
  });

  it('does not classify authentication errors as remote races', () => {
    expect(isFetchFirstPushError('Authentication failed')).toBe(false);
  });
});
