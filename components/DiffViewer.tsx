'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/hooks/use-translation';

interface DiffLine {
  index: number;
  type: 'context' | 'add' | 'remove' | 'no-newline';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export type HunkActionMode = 'stage' | 'unstage';

type HunkActions = {
  mode: HunkActionMode;
  busyHunkIndex?: number | null;
  disabled?: boolean;
  onStageHunk?: (hunkIndex: number, selectedLines?: number[]) => void;
  onUnstageHunk?: (hunkIndex: number, selectedLines?: number[]) => void;
  onDiscardHunk?: (hunkIndex: number, selectedLines?: number[]) => void;
};

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
      line.startsWith('rename to')
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
      currentHunk.lines.push({ index: currentHunk.lines.length, type: 'add', content: line.slice(1), newLineNum: newLineNum++ });
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({ index: currentHunk.lines.length, type: 'remove', content: line.slice(1), oldLineNum: oldLineNum++ });
    } else if (line.startsWith('\\')) {
      currentHunk.lines.push({ index: currentHunk.lines.length, type: 'no-newline', content: line.slice(1).trimStart() });
    } else {
      currentHunk.lines.push({
        index: currentHunk.lines.length,
        type: 'context',
        content: line.startsWith(' ') ? line.slice(1) : line,
        oldLineNum: oldLineNum++,
        newLineNum: newLineNum++,
      });
    }
  }

  return hunks;
}

export function DiffViewer({
  diff,
  filePath,
  wordWrap = false,
  hunkActions,
}: {
  diff: string;
  filePath?: string;
  wordWrap?: boolean;
  hunkActions?: HunkActions;
}) {
  const t = useT();
  const hunks = useMemo(() => parseDiff(diff), [diff]);
  const [selectedLinesByHunk, setSelectedLinesByHunk] = useState<Record<number, number[]>>({});

  useEffect(() => {
    setSelectedLinesByHunk({});
  }, [diff]);

  const toggleLineSelection = (hunkIndex: number, lineIndex: number) => {
    setSelectedLinesByHunk((current) => {
      const existing = current[hunkIndex] ?? [];
      const next = existing.includes(lineIndex)
        ? existing.filter((index) => index !== lineIndex)
        : [...existing, lineIndex].sort((a, b) => a - b);
      return { ...current, [hunkIndex]: next };
    });
  };

  if (!diff) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#9eacc0] text-sm">
        {t('diff.noChanges')}
      </div>
    );
  }
  if (hunks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#9eacc0] text-sm">
        {t('diff.binaryFile')}
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
        <div className="min-w-full inline-block">
          {hunks.map((hunk, hi) => (
            <div key={hi} className="border-b border-[#3c495a]/20">
              <div className="px-4 py-1 bg-[#12273c] text-[#9eacc0] text-[11px] sticky top-0 z-10 select-none flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{hunk.header}</span>
                {hunkActions && (selectedLinesByHunk[hi]?.length ?? 0) > 0 && (
                  <span className="shrink-0 text-[10px] text-secondary">
                    {t('diff.selectedLines', { count: String(selectedLinesByHunk[hi].length) })}
                  </span>
                )}
                {hunkActions && (
                  <HunkActionButtons
                    hunkIndex={hi}
                    selectedLines={selectedLinesByHunk[hi] ?? []}
                    actions={hunkActions}
                  />
                )}
              </div>
              <div>
                {hunk.lines.map((line, li) => (
                  <DiffLineRow
                    key={li}
                    line={line}
                    wordWrap={wordWrap}
                    lineSelectionEnabled={!!hunkActions}
                    selected={!!selectedLinesByHunk[hi]?.includes(line.index)}
                    onToggleSelected={() => toggleLineSelection(hi, line.index)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HunkActionButtons({
  hunkIndex,
  selectedLines,
  actions,
}: {
  hunkIndex: number;
  selectedLines: number[];
  actions: HunkActions;
}) {
  const t = useT();
  const isBusy = actions.busyHunkIndex === hunkIndex;
  const disabled = actions.disabled || isBusy || actions.busyHunkIndex != null;
  const selectedLinePayload = selectedLines.length > 0 ? selectedLines : undefined;

  return (
    <div className="flex items-center gap-1 shrink-0">
      {actions.mode === 'stage' ? (
        <button
          type="button"
          onClick={() => actions.onStageHunk?.(hunkIndex, selectedLinePayload)}
          disabled={disabled || !actions.onStageHunk}
          title={selectedLinePayload ? t('diff.stageSelectedLines') : t('diff.stageHunk')}
          className="h-6 w-6 rounded border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => actions.onUnstageHunk?.(hunkIndex, selectedLinePayload)}
          disabled={disabled || !actions.onUnstageHunk}
          title={selectedLinePayload ? t('diff.unstageSelectedLines') : t('diff.unstageHunk')}
          className="h-6 w-6 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Minus size={13} />}
        </button>
      )}
      {actions.mode === 'stage' && actions.onDiscardHunk && (
        <button
          type="button"
          onClick={() => actions.onDiscardHunk?.(hunkIndex, selectedLinePayload)}
          disabled={disabled}
          title={selectedLinePayload ? t('diff.discardSelectedLines') : t('diff.discardHunk')}
          className="h-6 w-6 rounded border border-error/30 bg-error/10 text-error hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

function DiffLineRow({
  line,
  wordWrap,
  lineSelectionEnabled,
  selected,
  onToggleSelected,
}: {
  line: DiffLine;
  wordWrap: boolean;
  lineSelectionEnabled: boolean;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const t = useT();
  const bg = line.type === 'add' ? 'bg-[#a3f185]/10 hover:bg-[#a3f185]/20'
    : line.type === 'remove' ? 'bg-[#ff716c]/10 hover:bg-[#ff716c]/20'
    : line.type === 'no-newline' ? 'bg-[#3c495a]/10'
    : 'hover:bg-[#3c495a]/30';
  const marker = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : line.type === 'no-newline' ? '\\' : ' ';
  const markerColor = line.type === 'add' ? 'text-[#a3f185]'
    : line.type === 'remove' ? 'text-[#ff716c]' : 'text-[#9eacc0]';
  const textColor = line.type === 'add' ? 'text-[#c1f0a8]'
    : line.type === 'remove' ? 'text-[#ffa8a3]'
    : line.type === 'no-newline' ? 'text-[#9eacc0]' : 'text-[#d9e7fc]';
  const canSelectLine = lineSelectionEnabled && (line.type === 'add' || line.type === 'remove');

  return (
    <div className={cn('flex items-stretch', bg)}>
      {lineSelectionEnabled && (
        <span className="w-7 shrink-0 flex items-center justify-center border-r border-[#3c495a]/20 py-[1px]">
          {canSelectLine && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelected}
              title={selected ? t('diff.deselectLine') : t('diff.selectLine')}
              className="h-3 w-3 accent-secondary cursor-pointer"
            />
          )}
        </span>
      )}
      <span className="w-12 text-right pr-2 select-none text-[#697789] border-r border-[#3c495a]/20 shrink-0 text-[10px] py-[1px]">
        {line.oldLineNum ?? ''}
      </span>
      <span className="w-12 text-right pr-2 select-none text-[#697789] border-r border-[#3c495a]/20 shrink-0 text-[10px] py-[1px]">
        {line.newLineNum ?? ''}
      </span>
      <span className={cn('w-6 text-center select-none shrink-0', markerColor)}>{marker}</span>
      <pre className={cn(
        wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre',
        'flex-1 min-w-0 pr-4',
        textColor
      )}>
        {line.content}
      </pre>
    </div>
  );
}
