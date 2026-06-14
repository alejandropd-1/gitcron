import type { BlameLine } from '../types/electron';

const ZERO_HASH_RE = /^0+$/;

type BlameBlock = {
  commitHash: string;
  finalLineNo: number;
  author?: string;
  authorEmail?: string;
  authorTime?: string;
  summary?: string;
  previousCommitHash?: string;
  previousPath?: string;
};

export function parseGitBlamePorcelain(raw: string): BlameLine[] {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blameLines: BlameLine[] = [];
  let block: BlameBlock | null = null;

  for (const line of lines) {
    const header = parseHeader(line);
    if (header) {
      block = header;
      continue;
    }

    if (!block) continue;

    if (line.startsWith('author ')) {
      block.author = line.slice('author '.length);
    } else if (line.startsWith('author-mail ')) {
      block.authorEmail = normalizeMail(line.slice('author-mail '.length));
    } else if (line.startsWith('author-time ')) {
      block.authorTime = normalizeAuthorTime(line.slice('author-time '.length));
    } else if (line.startsWith('summary ')) {
      block.summary = line.slice('summary '.length);
    } else if (line.startsWith('previous ')) {
      applyPrevious(block, line.slice('previous '.length));
    } else if (line.startsWith('\t')) {
      blameLines.push(buildBlameLine(block, line.slice(1)));
      block = null;
    }
  }

  return blameLines;
}

function parseHeader(line: string): BlameBlock | null {
  const match = line.match(/^([0-9a-f]{40})\s+\d+\s+(\d+)(?:\s+\d+)?$/i);
  if (!match) return null;
  return {
    commitHash: match[1],
    finalLineNo: Number.parseInt(match[2], 10),
  };
}

function buildBlameLine(block: BlameBlock, content: string): BlameLine {
  const isUncommitted = ZERO_HASH_RE.test(block.commitHash);
  return {
    lineNo: block.finalLineNo,
    content,
    commitHash: block.commitHash,
    shortHash: isUncommitted ? '0000000' : block.commitHash.slice(0, 7),
    author: block.author ?? '',
    authorEmail: block.authorEmail,
    authorTime: block.authorTime ?? '',
    summary: block.summary ?? '',
    previousCommitHash: block.previousCommitHash,
    previousPath: block.previousPath,
    isUncommitted,
  };
}

function normalizeMail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^<|>$/g, '');
}

function normalizeAuthorTime(value: string): string {
  const seconds = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(seconds)) return value.trim();
  return new Date(seconds * 1000).toISOString();
}

function applyPrevious(block: BlameBlock, value: string): void {
  const firstSpace = value.indexOf(' ');
  if (firstSpace === -1) {
    block.previousCommitHash = value.trim() || undefined;
    return;
  }

  block.previousCommitHash = value.slice(0, firstSpace).trim() || undefined;
  block.previousPath = value.slice(firstSpace + 1).trim() || undefined;
}
