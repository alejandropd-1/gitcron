export type GitStageIssue = {
  ignoredPaths: string[];
  lineEndingPaths: string[];
};

const SERIALIZED_PREFIX = 'gitcron:stage-issue:';

const LINE_ENDING_WARNING =
  /warning: in the working copy of ['"](.+?)['"], (?:LF|CRLF) will be replaced by (?:CRLF|LF) the next time Git touches it/gi;

export function parseGitStageIssue(message: string): GitStageIssue | null {
  if (message.startsWith(SERIALIZED_PREFIX)) {
    try {
      const parsed = JSON.parse(message.slice(SERIALIZED_PREFIX.length)) as GitStageIssue;
      if (Array.isArray(parsed.ignoredPaths) && Array.isArray(parsed.lineEndingPaths)) return parsed;
    } catch {
      return null;
    }
  }

  return parseRawGitStageIssue(message);
}

function parseRawGitStageIssue(message: string): GitStageIssue | null {
  const normalized = message.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lineEndingPaths = Array.from(normalized.matchAll(LINE_ENDING_WARNING), (match) => match[1]);
  const lines = normalized.split('\n');
  const ignoredPaths: string[] = [];
  let readingIgnoredPaths = false;

  for (const line of lines) {
    if (/the following paths are ignored by one of your \.gitignore files:/i.test(line)) {
      readingIgnoredPaths = true;
      continue;
    }
    if (!readingIgnoredPaths) continue;

    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(?:hint|warning|fatal|error):/i.test(trimmed)) break;
    ignoredPaths.push(trimmed.replace(/^['"]|['"]$/g, ''));
  }

  if (ignoredPaths.length === 0) return null;
  return {
    ignoredPaths: [...new Set(ignoredPaths)],
    lineEndingPaths: [...new Set(lineEndingPaths)],
  };
}

export function makeGitStageIssueMessage(message: string, requestedPaths: string[]): string {
  const issue = parseRawGitStageIssue(message);
  if (!issue) return message;

  const ignoredRoots = issue.ignoredPaths.map(normalizePath);
  const ignoredRequestedPaths = requestedPaths.filter((requestedPath) => {
    const candidate = normalizePath(requestedPath);
    return ignoredRoots.some((root) => candidate === root || candidate.startsWith(`${root}/`));
  });

  if (ignoredRequestedPaths.length === 0) return message;
  return SERIALIZED_PREFIX + JSON.stringify({
    ...issue,
    ignoredPaths: [...new Set(ignoredRequestedPaths)],
  } satisfies GitStageIssue);
}

const normalizePath = (value: string) => value.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
