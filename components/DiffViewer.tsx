'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

function parseDiff(raw: string): DiffHunk[] {
  if (!raw) return [];
  const hunks: DiffHunk[] = [];
  const lines = raw.split('\n');
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    if (
      line.startsWith('diff --git') || line.startsWith('index ') ||
      line.startsWith('---') || line.startsWith('+++') ||
      line.startsWith('new file mode') || line.startsWith('deleted file mode') ||
      line.startsWith('similarity index') || line.startsWith('rename from') ||
      line.startsWith('rename to') || line.startsWith('\\ No newline')
    ) continue;

    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      oldLineNum = parseInt(hunkMatch[1], 10);
      newLineNum = parseInt(hunkMatch[2], 10);
      currentHunk = { header: line, lines: [] };
      hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith('+')) {
      currentHunk.lines.push({ type: 'add', content: line.slice(1), newLineNum: newLineNum++ });
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({ type: 'remove', content: line.slice(1), oldLineNum: oldLineNum++ });
    } else {
      currentHunk.lines.push({
        type: 'context',
        content: line.startsWith(' ') ? line.slice(1) : line,
        oldLineNum: oldLineNum++,
        newLineNum: newLineNum++,
      });
    }
  }

  return hunks;
}

export function DiffViewer({ diff, filePath }: { diff: string; filePath?: string }) {
  const hunks = useMemo(() => parseDiff(diff), [diff]);

  if (!diff) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#9eacc0] text-sm">
        No hay cambios para mostrar
      </div>
    );
  }
  if (hunks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#9eacc0] text-sm">
        Archivo binario o sin diff parseable
      </div>
    );
  }

  const adds = hunks.reduce((s, h) => s + h.lines.filter((l) => l.type === 'add').length, 0);
  const removes = hunks.reduce((s, h) => s + h.lines.filter((l) => l.type === 'remove').length, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#020f1e]">
      {filePath && (
        <div className="px-4 py-2 border-b border-[#3c495a]/15 bg-[#0d2134] flex items-center justify-between shrink-0">
          <span className="text-xs font-mono text-[#d9e7fc] truncate">{filePath}</span>
          <div className="flex gap-3 text-[11px] font-mono shrink-0 ml-3">
            <span className="text-[#a3f185]">+{adds}</span>
            <span className="text-[#ff716c]">-{removes}</span>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto font-mono text-[12px] leading-[1.5]">
        {hunks.map((hunk, hi) => (
          <div key={hi} className="border-b border-[#3c495a]/20">
            <div className="px-4 py-1 bg-[#12273c] text-[#9eacc0] text-[11px] sticky top-0 z-10">
              {hunk.header}
            </div>
            <div>
              {hunk.lines.map((line, li) => <DiffLineRow key={li} line={line} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const bg = line.type === 'add' ? 'bg-[#a3f185]/10 hover:bg-[#a3f185]/20'
    : line.type === 'remove' ? 'bg-[#ff716c]/10 hover:bg-[#ff716c]/20'
    : 'hover:bg-[#3c495a]/30';
  const marker = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
  const markerColor = line.type === 'add' ? 'text-[#a3f185]'
    : line.type === 'remove' ? 'text-[#ff716c]' : 'text-[#9eacc0]';
  const textColor = line.type === 'add' ? 'text-[#c1f0a8]'
    : line.type === 'remove' ? 'text-[#ffa8a3]' : 'text-[#d9e7fc]';

  return (
    <div className={cn('flex items-stretch', bg)}>
      <span className="w-12 text-right pr-2 select-none text-[#697789] border-r border-[#3c495a]/20 shrink-0 text-[10px] py-[1px]">
        {line.oldLineNum ?? ''}
      </span>
      <span className="w-12 text-right pr-2 select-none text-[#697789] border-r border-[#3c495a]/20 shrink-0 text-[10px] py-[1px]">
        {line.newLineNum ?? ''}
      </span>
      <span className={cn('w-6 text-center select-none shrink-0', markerColor)}>{marker}</span>
      <pre className={cn('whitespace-pre flex-1 min-w-0 pr-4', textColor)}>{line.content}</pre>
    </div>
  );
}
