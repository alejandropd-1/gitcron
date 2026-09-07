import type { DiffHunk } from '@/components/DiffViewer';

export interface DiffOp {
  type: 'common' | 'add' | 'remove';
  line: string;
}

export function computeMyersDiff(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  if (max === 0) return [];

  const v: Record<number, number> = { 1: 0 };
  const trace: Array<Record<number, number>> = [];

  loop: for (let d = 0; d <= max; d++) {
    trace.push({ ...v });
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && (v[k - 1] ?? 0) < (v[k + 1] ?? 0))) {
        x = v[k + 1] ?? 0;
      } else {
        x = (v[k - 1] ?? 0) + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[k] = x;
      if (x >= n && y >= m) {
        break loop;
      }
    }
  }

  const ops: DiffOp[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vPrev = trace[d];
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && (vPrev[k - 1] ?? 0) < (vPrev[k + 1] ?? 0))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = vPrev[prevK] ?? 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      x--;
      y--;
      ops.unshift({ type: 'common', line: a[x] });
    }
    if (d > 0) {
      if (x === prevX) {
        y--;
        ops.unshift({ type: 'add', line: b[y] });
      } else {
        x--;
        ops.unshift({ type: 'remove', line: a[x] });
      }
    }
  }

  return ops;
}

export function generateUnifiedDiff(
  oldContent: string,
  newContent: string,
  filePath = 'spec.md',
  contextLines = 3,
): string {
  if (oldContent === newContent) return '';
  const a = oldContent === '' ? [] : oldContent.split(/\r?\n/);
  const b = newContent === '' ? [] : newContent.split(/\r?\n/);
  const ops = computeMyersDiff(a, b);
  if (ops.every((op) => op.type === 'common')) return '';

  const isChange = ops.map((op) => op.type !== 'common');
  interface HunkGroup {
    start: number;
    end: number;
  }
  const groups: HunkGroup[] = [];
  let currentGroup: HunkGroup | null = null;

  for (let i = 0; i < ops.length; i++) {
    if (isChange[i]) {
      const start = Math.max(0, i - contextLines);
      const end = Math.min(ops.length - 1, i + contextLines);
      if (!currentGroup) {
        currentGroup = { start, end };
      } else if (start <= currentGroup.end + 1) {
        currentGroup.end = end;
      } else {
        groups.push(currentGroup);
        currentGroup = { start, end };
      }
    }
  }
  if (currentGroup) groups.push(currentGroup);

  const header = `--- a/${filePath}\n+++ b/${filePath}`;
  const hunksStr: string[] = [];

  let oldLine = 1;
  let newLine = 1;
  let opIdx = 0;

  for (const group of groups) {
    while (opIdx < group.start) {
      if (ops[opIdx].type === 'common' || ops[opIdx].type === 'remove') oldLine++;
      if (ops[opIdx].type === 'common' || ops[opIdx].type === 'add') newLine++;
      opIdx++;
    }

    const hunkOldStart = oldLine;
    const hunkNewStart = newLine;
    let hunkOldCount = 0;
    let hunkNewCount = 0;
    const hunkLines: string[] = [];

    while (opIdx <= group.end) {
      const op = ops[opIdx];
      if (op.type === 'common') {
        hunkLines.push(` ${op.line}`);
        hunkOldCount++;
        hunkNewCount++;
        oldLine++;
        newLine++;
      } else if (op.type === 'remove') {
        hunkLines.push(`-${op.line}`);
        hunkOldCount++;
        oldLine++;
      } else if (op.type === 'add') {
        hunkLines.push(`+${op.line}`);
        hunkNewCount++;
        newLine++;
      }
      opIdx++;
    }

    const hunkHeader = `@@ -${hunkOldCount === 1 ? hunkOldStart : `${hunkOldStart},${hunkOldCount}`} +${hunkNewCount === 1 ? hunkNewStart : `${hunkNewStart},${hunkNewCount}`} @@`;
    hunksStr.push([hunkHeader, ...hunkLines].join('\n'));
  }

  return `${header}\n${hunksStr.join('\n')}\n`;
}

function detectEol(content: string): string {
  const crlf = (content.match(/\r\n/g) || []).length;
  const lf = (content.match(/[^\r]\n/g) || []).length;
  return crlf > lf ? '\r\n' : '\n';
}

/**
 * Reconstruye el contenido del archivo aplicando únicamente los hunks aceptados.
 * Los hunks no aceptados (descartados o pendientes) conservan las líneas originales.
 */
export function applyHunksToContent(
  originalContent: string,
  hunks: DiffHunk[],
  acceptedHunkIndices: Set<number> | number[],
  options: { selectedLinesByHunk?: Record<number, number[]> } = {},
): string {
  if (!hunks || hunks.length === 0) return originalContent;

  const accepted = acceptedHunkIndices instanceof Set
    ? acceptedHunkIndices
    : new Set(acceptedHunkIndices);

  const eol = detectEol(originalContent);
  const originalLines = originalContent === '' ? [] : originalContent.split(/\r?\n/);
  const resultLines: string[] = [];
  let currentOriginalIdx = 0;

  for (let hi = 0; hi < hunks.length; hi++) {
    const hunk = hunks[hi];
    const match = hunk.header.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (!match) continue;

    const oldStart = Number.parseInt(match[1], 10);
    const oldLinesCount = match[2] !== undefined ? Number.parseInt(match[2], 10) : 1;

    // En 0-index:
    const startIdx = oldStart === 0 ? 0 : oldStart - 1;
    const endIdx = startIdx + oldLinesCount;

    // Copiar líneas del original previas a este hunk
    while (currentOriginalIdx < startIdx && currentOriginalIdx < originalLines.length) {
      resultLines.push(originalLines[currentOriginalIdx]);
      currentOriginalIdx++;
    }

    const isAccepted = accepted.has(hi);
    const selectedLines = options.selectedLinesByHunk?.[hi];
    const hasLineSelection = Array.isArray(selectedLines) && selectedLines.length > 0;

    for (const line of hunk.lines) {
      if (line.type === 'context') {
        resultLines.push(line.content);
      } else if (line.type === 'add') {
        if (isAccepted) {
          if (!hasLineSelection || selectedLines.includes(line.index)) {
            resultLines.push(line.content);
          }
        }
      } else if (line.type === 'remove') {
        if (!isAccepted) {
          // Bloque descartado: preservar la línea original
          resultLines.push(line.content);
        } else if (hasLineSelection && !selectedLines.includes(line.index)) {
          // Bloque aceptado pero esta línea NO fue seleccionada para remoción: preservarla
          resultLines.push(line.content);
        }
      }
    }

    currentOriginalIdx = Math.max(currentOriginalIdx, endIdx);
  }

  // Copiar el remanente de líneas originales después del último hunk
  while (currentOriginalIdx < originalLines.length) {
    resultLines.push(originalLines[currentOriginalIdx]);
    currentOriginalIdx++;
  }

  return resultLines.join(eol);
}
