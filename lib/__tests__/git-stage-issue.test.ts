import { describe, expect, it } from 'vitest';
import { makeGitStageIssueMessage, parseGitStageIssue } from '../git-stage-issue';

describe('parseGitStageIssue', () => {
  it('separates ignored paths from harmless line-ending warnings', () => {
    const message = [
      "warning: in the working copy of '.astro/types.d.ts', LF will be replaced by CRLF the next time Git touches it",
      'The following paths are ignored by one of your .gitignore files:',
      '.astro',
      'hint: Use -f if you really want to add them.',
      "warning: in the working copy of 'src/pages/api/contacto.ts', LF will be replaced by CRLF the next time Git touches it",
    ].join('\n');

    expect(parseGitStageIssue(message)).toEqual({
      ignoredPaths: ['.astro'],
      lineEndingPaths: ['.astro/types.d.ts', 'src/pages/api/contacto.ts'],
    });
  });

  it('does not reinterpret unrelated Git failures', () => {
    expect(parseGitStageIssue('fatal: Unable to create .git/index.lock')).toBeNull();
  });

  it('limits the force action to the exact requested files inside an ignored directory', () => {
    const raw = [
      'The following paths are ignored by one of your .gitignore files:',
      '.astro',
      'hint: Use -f if you really want to add them.',
    ].join('\n');

    const message = makeGitStageIssueMessage(raw, ['.astro/types.d.ts', 'src/pages/api/contacto.ts']);

    expect(parseGitStageIssue(message)).toEqual({
      ignoredPaths: ['.astro/types.d.ts'],
      lineEndingPaths: [],
    });
  });
});
