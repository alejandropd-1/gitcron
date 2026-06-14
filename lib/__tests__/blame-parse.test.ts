import { describe, expect, it } from 'vitest';
import { parseGitBlamePorcelain } from '../blame-parse';

describe('parseGitBlamePorcelain', () => {
  it('parses committed lines with author metadata and previous rename info', () => {
    const raw = [
      '1111111111111111111111111111111111111111 4 1 1',
      'author Ada Lovelace',
      'author-mail <ada@example.test>',
      'author-time 1700000000',
      'summary move algorithm',
      'previous 2222222222222222222222222222222222222222 src/old name.ts',
      'filename src/new name.ts',
      '\tconst answer = 42;',
    ].join('\n');

    expect(parseGitBlamePorcelain(raw)).toEqual([
      {
        lineNo: 1,
        content: 'const answer = 42;',
        commitHash: '1111111111111111111111111111111111111111',
        shortHash: '1111111',
        author: 'Ada Lovelace',
        authorEmail: 'ada@example.test',
        authorTime: '2023-11-14T22:13:20.000Z',
        summary: 'move algorithm',
        previousCommitHash: '2222222222222222222222222222222222222222',
        previousPath: 'src/old name.ts',
        isUncommitted: false,
      },
    ]);
  });

  it('marks zero-hash lines as uncommitted', () => {
    const raw = [
      '0000000000000000000000000000000000000000 2 3 1',
      'author Not Committed Yet',
      'author-mail <not.committed.yet>',
      'author-time 0',
      'summary Version of file.txt from file.txt',
      'filename file.txt',
      '\tworking tree content',
    ].join('\n');

    const [line] = parseGitBlamePorcelain(raw);

    expect(line).toMatchObject({
      lineNo: 3,
      content: 'working tree content',
      shortHash: '0000000',
      author: 'Not Committed Yet',
      authorEmail: 'not.committed.yet',
      isUncommitted: true,
    });
  });
});
