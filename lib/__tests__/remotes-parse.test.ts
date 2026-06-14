import { describe, expect, it } from 'vitest';
import { parseGitRemotes } from '../../electron/ipc/git-sync';

describe('parseGitRemotes', () => {
  it('parses typical git remote -v output correctly', () => {
    const raw = [
      'origin\thttps://github.com/alejandropd-1/gitcron.git (fetch)',
      'origin\thttps://github.com/alejandropd-1/gitcron.git (push)',
      'upstream\tgit@github.com:another/repo.git (fetch)',
      'upstream\tgit@github.com:another/repo.git (push)',
    ].join('\n');

    expect(parseGitRemotes(raw)).toEqual([
      {
        name: 'origin',
        fetchUrl: 'https://github.com/alejandropd-1/gitcron.git',
        pushUrl: 'https://github.com/alejandropd-1/gitcron.git',
      },
      {
        name: 'upstream',
        fetchUrl: 'git@github.com:another/repo.git',
        pushUrl: 'git@github.com:another/repo.git',
      },
    ]);
  });

  it('handles remotes with missing push or fetch URLs', () => {
    const raw = [
      'origin\thttps://github.com/alejandropd-1/gitcron.git (fetch)',
      'only-push\tgit@github.com:another/repo.git (push)',
    ].join('\n');

    expect(parseGitRemotes(raw)).toEqual([
      {
        name: 'origin',
        fetchUrl: 'https://github.com/alejandropd-1/gitcron.git',
        pushUrl: undefined,
      },
      {
        name: 'only-push',
        fetchUrl: undefined,
        pushUrl: 'git@github.com:another/repo.git',
      },
    ]);
  });

  it('handles remote lines without explicit fetch/push suffix', () => {
    const raw = 'origin\thttps://github.com/alejandropd-1/gitcron.git';
    expect(parseGitRemotes(raw)).toEqual([
      {
        name: 'origin',
        fetchUrl: 'https://github.com/alejandropd-1/gitcron.git',
        pushUrl: 'https://github.com/alejandropd-1/gitcron.git',
      },
    ]);
  });
});
