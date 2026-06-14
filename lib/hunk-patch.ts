export type DiffLineType = 'context' | 'add' | 'remove' | 'no-newline';

export type DiffLinePrefix = ' ' | '+' | '-' | '\\';

export interface DiffLine {
  index: number;
  type: DiffLineType;
  prefix: DiffLinePrefix;
  content: string;
  raw: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface Hunk {
  index: number;
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  section?: string;
  lines: DiffLine[];
}

export interface FileDiff {
  filePath: string;
  oldPath: string;
  newPath: string;
  oldFileName: string;
  newFileName: string;
  fileHeaders: string[];
  hunks: Hunk[];
  isBinary: boolean;
  isNewFile: boolean;
  isDeletedFile: boolean;
  isRenamed: boolean;
  oldMode?: string;
  newMode?: string;
}

export interface ApplyHunkOptions {
  reverse?: boolean;
  cached?: boolean;
}

export interface BuildHunkPatchOptions {
  selectedLines?: readonly number[];
}

const EMPTY_FILE_DIFF: FileDiff = {
  filePath: '',
  oldPath: '',
  newPath: '',
  oldFileName: '',
  newFileName: '',
  fileHeaders: [],
  hunks: [],
  isBinary: false,
  isNewFile: false,
  isDeletedFile: false,
  isRenamed: false,
};

const HUNK_HEADER_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: ?(.*))?$/;

export function parseUnifiedDiff(raw: string): FileDiff {
  if (!raw) return { ...EMPTY_FILE_DIFF };

  const lines = splitDiffLines(raw);
  const fileDiff: FileDiff = { ...EMPTY_FILE_DIFF, fileHeaders: [], hunks: [] };
  let currentHunk: Hunk | null = null;
  let oldLineNumber = 0;
  let newLineNumber = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (fileDiff.fileHeaders.length > 0 || fileDiff.hunks.length > 0) break;
      fileDiff.fileHeaders.push(line);
      const paths = parseDiffGitPaths(line);
      fileDiff.oldPath = paths.oldPath;
      fileDiff.newPath = paths.newPath;
      fileDiff.filePath = paths.filePath;
      continue;
    }

    const parsedHunk = parseHunkHeader(line, fileDiff.hunks.length);
    if (parsedHunk) {
      currentHunk = parsedHunk;
      fileDiff.hunks.push(currentHunk);
      oldLineNumber = parsedHunk.oldStart;
      newLineNumber = parsedHunk.newStart;
      continue;
    }

    if (!currentHunk) {
      fileDiff.fileHeaders.push(line);
      applyFileHeader(fileDiff, line);
      continue;
    }

    currentHunk.lines.push(parseDiffLine(line, currentHunk.lines.length, oldLineNumber, newLineNumber));
    const nextLineNumbers = advanceLineNumbers(line, oldLineNumber, newLineNumber);
    oldLineNumber = nextLineNumbers.oldLineNumber;
    newLineNumber = nextLineNumbers.newLineNumber;
  }

  if (!fileDiff.filePath) {
    fileDiff.filePath = normalizeDisplayPath(fileDiff.newPath || fileDiff.oldPath);
  }

  return fileDiff;
}

export function buildHunkPatch(fileDiff: FileDiff, hunkIndex: number, options: BuildHunkPatchOptions = {}): string {
  const hunk = fileDiff.hunks[hunkIndex];
  if (!hunk) {
    throw new Error(`Hunk index ${hunkIndex} does not exist`);
  }
  if (fileDiff.isBinary) {
    throw new Error('Cannot build a text hunk patch for a binary diff');
  }

  const selectedLineSet = normalizeSelectedLines(options.selectedLines);
  const hunkLines = selectedLineSet
    ? buildPartialHunkLines(hunk, selectedLineSet)
    : hunk.lines.map((line) => line.raw);
  const header = selectedLineSet
    ? buildHunkHeader(hunk, hunkLines)
    : hunk.header;

  const patchLines = [
    ...fileDiff.fileHeaders,
    header,
    ...hunkLines,
  ];

  return `${patchLines.join('\n')}\n`;
}

function normalizeSelectedLines(selectedLines: readonly number[] | undefined): Set<number> | null {
  if (!selectedLines || selectedLines.length === 0) return null;
  return new Set(selectedLines);
}

function buildPartialHunkLines(hunk: Hunk, selectedLines: Set<number>): string[] {
  const lines: string[] = [];
  let changeBlock: DiffLine[] = [];
  let emittedChange = false;

  const flushChangeBlock = () => {
    if (changeBlock.length === 0) return;
    emittedChange = emitChangeBlock(changeBlock, selectedLines, lines) || emittedChange;
    changeBlock = [];
  };

  for (const line of hunk.lines) {
    if (line.type === 'add' || line.type === 'remove') {
      changeBlock.push(line);
      continue;
    }

    flushChangeBlock();
    lines.push(line.raw);
  }

  flushChangeBlock();

  if (!emittedChange) {
    throw new Error('No selected changed lines in hunk');
  }

  return lines;
}

function emitChangeBlock(changeBlock: DiffLine[], selectedLines: Set<number>, output: string[]): boolean {
  const removals = changeBlock.filter((line) => line.type === 'remove');
  const additions = changeBlock.filter((line) => line.type === 'add');
  const pairCount = Math.min(removals.length, additions.length);
  let emittedChange = false;

  for (let index = 0; index < pairCount; index += 1) {
    const removal = removals[index];
    const addition = additions[index];
    const pairSelected = selectedLines.has(removal.index) || selectedLines.has(addition.index);
    if (pairSelected) {
      output.push(removal.raw);
      emittedChange = true;
    } else {
      output.push(` ${removal.content}`);
    }
    if (pairSelected) {
      output.push(addition.raw);
      emittedChange = true;
    }
  }

  for (const removal of removals.slice(pairCount)) {
    if (selectedLines.has(removal.index)) {
      output.push(removal.raw);
      emittedChange = true;
    } else {
      output.push(` ${removal.content}`);
    }
  }

  for (const addition of additions.slice(pairCount)) {
    if (selectedLines.has(addition.index)) {
      output.push(addition.raw);
      emittedChange = true;
    }
  }

  return emittedChange;
}

function buildHunkHeader(hunk: Hunk, lines: string[]): string {
  const oldLines = lines.filter((line) => line.startsWith(' ') || line.startsWith('-')).length;
  const newLines = lines.filter((line) => line.startsWith(' ') || line.startsWith('+')).length;
  const section = hunk.section ? ` ${hunk.section}` : '';
  return `@@ -${formatHunkRange(hunk.oldStart, oldLines)} +${formatHunkRange(hunk.newStart, newLines)} @@${section}`;
}

function formatHunkRange(start: number, count: number): string {
  if (count === 1) return String(start);
  return `${start},${count}`;
}

function splitDiffLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function parseHunkHeader(line: string, index: number): Hunk | null {
  const match = line.match(HUNK_HEADER_RE);
  if (!match) return null;

  return {
    index,
    header: line,
    oldStart: Number.parseInt(match[1], 10),
    oldLines: parseOptionalLineCount(match[2]),
    newStart: Number.parseInt(match[3], 10),
    newLines: parseOptionalLineCount(match[4]),
    section: match[5] || undefined,
    lines: [],
  };
}

function parseOptionalLineCount(value: string | undefined): number {
  return value === undefined ? 1 : Number.parseInt(value, 10);
}

function advanceLineNumbers(
  line: string,
  oldLineNumber: number,
  newLineNumber: number,
): { oldLineNumber: number; newLineNumber: number } {
  if (line.startsWith('-')) return { oldLineNumber: oldLineNumber + 1, newLineNumber };
  if (line.startsWith('+')) return { oldLineNumber, newLineNumber: newLineNumber + 1 };
  if (line.startsWith('\\')) return { oldLineNumber, newLineNumber };
  return { oldLineNumber: oldLineNumber + 1, newLineNumber: newLineNumber + 1 };
}

function applyFileHeader(fileDiff: FileDiff, line: string): void {
  applyFileNameHeader(fileDiff, line);
  applyModeHeader(fileDiff, line);
  applyStateHeader(fileDiff, line);

  fileDiff.isNewFile = fileDiff.isNewFile || fileDiff.oldFileName === '/dev/null';
  fileDiff.isDeletedFile = fileDiff.isDeletedFile || fileDiff.newFileName === '/dev/null';
}

function applyFileNameHeader(fileDiff: FileDiff, line: string): void {
  if (line.startsWith('--- ')) {
    fileDiff.oldFileName = line.slice(4);
    fileDiff.oldPath = fileDiff.oldPath || normalizeDiffFileName(fileDiff.oldFileName);
  } else if (line.startsWith('+++ ')) {
    fileDiff.newFileName = line.slice(4);
    fileDiff.newPath = fileDiff.newPath || normalizeDiffFileName(fileDiff.newFileName);
    fileDiff.filePath = normalizeDisplayPath(fileDiff.newPath || fileDiff.oldPath);
  }
}

function applyModeHeader(fileDiff: FileDiff, line: string): void {
  if (line.startsWith('new file mode ')) {
    fileDiff.isNewFile = true;
    fileDiff.newMode = line.slice('new file mode '.length);
  } else if (line.startsWith('deleted file mode ')) {
    fileDiff.isDeletedFile = true;
    fileDiff.oldMode = line.slice('deleted file mode '.length);
  } else if (line.startsWith('old mode ')) {
    fileDiff.oldMode = line.slice('old mode '.length);
  } else if (line.startsWith('new mode ')) {
    fileDiff.newMode = line.slice('new mode '.length);
  }
}

function applyStateHeader(fileDiff: FileDiff, line: string): void {
  if (line.startsWith('rename from ') || line.startsWith('rename to ')) {
    fileDiff.isRenamed = true;
  } else if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
    fileDiff.isBinary = true;
  }
}

function parseDiffLine(line: string, index: number, oldLineNumber: number, newLineNumber: number): DiffLine {
  if (line.startsWith('+')) {
    return {
      index,
      type: 'add',
      prefix: '+',
      content: line.slice(1),
      raw: line,
      newLineNumber,
    };
  }
  if (line.startsWith('-')) {
    return {
      index,
      type: 'remove',
      prefix: '-',
      content: line.slice(1),
      raw: line,
      oldLineNumber,
    };
  }
  if (line.startsWith('\\')) {
    return {
      index,
      type: 'no-newline',
      prefix: '\\',
      content: line.slice(1).trimStart(),
      raw: line,
    };
  }
  return {
    index,
    type: 'context',
    prefix: ' ',
    content: line.startsWith(' ') ? line.slice(1) : line,
    raw: line.startsWith(' ') ? line : ` ${line}`,
    oldLineNumber,
    newLineNumber,
  };
}

function parseDiffGitPaths(line: string): { oldPath: string; newPath: string; filePath: string } {
  const rest = line.slice('diff --git '.length);
  const separator = rest.lastIndexOf(' b/');
  if (separator === -1) {
    return { oldPath: '', newPath: '', filePath: '' };
  }
  const oldPath = normalizeDiffFileName(rest.slice(0, separator));
  const newPath = normalizeDiffFileName(rest.slice(separator + 1));
  return {
    oldPath,
    newPath,
    filePath: normalizeDisplayPath(newPath || oldPath),
  };
}

function normalizeDiffFileName(fileName: string): string {
  if (fileName === '/dev/null') return '';
  return unquotePath(fileName.replace(/^[ab]\//, ''));
}

function normalizeDisplayPath(filePath: string): string {
  return filePath.replace(/^[ab]\//, '');
}

function unquotePath(filePath: string): string {
  if (filePath.startsWith('"') && filePath.endsWith('"')) {
    return filePath.slice(1, -1).replace(/\\"/g, '"');
  }
  return filePath;
}
