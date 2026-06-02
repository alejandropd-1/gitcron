'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, GitMerge, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/hooks/use-translation';

type PlainSegment = {
  type: 'plain';
  lines: string[];
};

type ConflictSegment = {
  type: 'conflict';
  oursLabel: string;
  theirsLabel: string;
  ours: string[];
  base: string[];
  theirs: string[];
};

type ConflictSegmentWithIndex = ConflictSegment & {
  conflictIndex: number;
};

type Segment = PlainSegment | ConflictSegment;
type ConflictSection = 'ours' | 'base' | 'theirs';

function joinLines(lines: string[]): string {
  return lines.join('\n');
}

function parseConflictBlock(lines: string[], startIndex: number): { segment: ConflictSegment; endIndex: number } {
  const oursLabel = lines[startIndex].slice('<<<<<<<'.length).trim() || 'HEAD';
  const segment: ConflictSegment = {
    type: 'conflict',
    oursLabel,
    theirsLabel: 'incoming',
    ours: [],
    base: [],
    theirs: [],
  };
  let section: ConflictSection = 'ours';
  let endIndex = startIndex;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const current = lines[index];
    endIndex = index;
    if (current.startsWith('|||||||')) {
      section = 'base';
    } else if (current.startsWith('=======')) {
      section = 'theirs';
    } else if (current.startsWith('>>>>>>>')) {
      segment.theirsLabel = current.slice('>>>>>>>'.length).trim() || 'incoming';
      break;
    } else {
      segment[section].push(current);
    }
  }

  return { segment, endIndex };
}

function parseConflictFile(content: string): { segments: Segment[]; trailingNewline: boolean } {
  const trailingNewline = content.endsWith('\n');
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  if (trailingNewline) lines.pop();

  const segments: Segment[] = [];
  let plain: string[] = [];

  const pushPlain = () => {
    if (plain.length > 0) {
      segments.push({ type: 'plain', lines: plain });
      plain = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith('<<<<<<<')) {
      plain.push(line);
      continue;
    }

    pushPlain();
    const conflict = parseConflictBlock(lines, index);
    segments.push(conflict.segment);
    index = conflict.endIndex;
  }

  pushPlain();
  return { segments, trailingNewline };
}

function buildResolvedContent(segments: Segment[], resolutions: string[], trailingNewline: boolean): string {
  const output: string[] = [];
  let conflictIndex = 0;
  for (const segment of segments) {
    if (segment.type === 'plain') {
      output.push(...segment.lines);
    } else {
      const resolution = resolutions[conflictIndex] ?? '';
      if (resolution.length > 0) output.push(...resolution.split('\n'));
      conflictIndex += 1;
    }
  }
  return `${output.join('\n')}${trailingNewline ? '\n' : ''}`;
}

function ConflictCodeBlock({ title, label, lines, tone }: { title: string; label: string; lines: string[]; tone: 'ours' | 'theirs' | 'base' }) {
  const toneClass = tone === 'ours'
    ? 'border-secondary/25 bg-secondary/10 text-secondary'
    : tone === 'theirs'
      ? 'border-primary/25 bg-primary/10 text-primary'
      : 'border-border-subtle/20 bg-bg-base/60 text-text-secondary';

  return (
    <div className="min-w-0">
      <div className={cn('px-2 py-1 rounded-t border text-[10px] font-bold uppercase tracking-wider truncate', toneClass)}>
        {title}: <span className="font-mono normal-case tracking-normal">{label}</span>
      </div>
      <pre className="max-h-40 overflow-auto rounded-b border-x border-b border-border-subtle/15 bg-[#06111f] p-2 text-[11px] leading-relaxed text-text-primary font-mono whitespace-pre">
        <code>{lines.length > 0 ? joinLines(lines) : '(empty)'}</code>
      </pre>
    </div>
  );
}

export function ConflictResolver({
  filePath,
  content,
  isSaving,
  onSave,
}: {
  filePath: string;
  content: string;
  isSaving: boolean;
  onSave: (content: string) => Promise<void> | void;
}) {
  const t = useT();
  const parsed = useMemo(() => parseConflictFile(content), [content]);
  const conflictSegments = useMemo(() => {
    let conflictIndex = 0;
    return parsed.segments.flatMap((segment) => {
      if (segment.type !== 'conflict') return [];
      const withIndex: ConflictSegmentWithIndex = { ...segment, conflictIndex };
      conflictIndex += 1;
      return [withIndex];
    });
  }, [parsed.segments]);
  const [resolutions, setResolutions] = useState<string[]>([]);

  useEffect(() => {
    setResolutions(conflictSegments.map((segment) => joinLines(segment.ours)));
  }, [conflictSegments]);

  const resolvedContent = useMemo(
    () => buildResolvedContent(parsed.segments, resolutions, parsed.trailingNewline),
    [parsed.segments, parsed.trailingNewline, resolutions],
  );

  if (conflictSegments.length === 0) {
    return (
      <div className="mx-4 mt-3 p-4 bg-bg-overlay/80 border border-secondary/25 rounded-xl shrink-0">
        <div className="flex items-center gap-2 text-secondary">
          <Check size={16} />
          <span className="text-sm font-bold">{t('conflictResolver.noMarkersTitle')}</span>
        </div>
        <p className="text-xs text-text-secondary mt-1">{t('conflictResolver.noMarkersDesc')}</p>
      </div>
    );
  }

  return (
    <div className="border-b border-border-subtle/15 bg-bg-base/45 shrink-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle/15 flex items-start gap-3">
        <GitMerge className="text-git-mod shrink-0 mt-0.5" size={20} />
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-text-primary text-sm">{t('conflictResolver.title')}</h4>
          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
            {t('conflictResolver.desc', { count: conflictSegments.length })}
          </p>
          <p className="text-[11px] text-text-secondary/80 mt-1 font-mono truncate">{filePath}</p>
        </div>
      </div>

      <div className="max-h-[44vh] overflow-y-auto px-4 py-3 space-y-4">
        {conflictSegments.map((segment) => {
          const current = resolutions[segment.conflictIndex] ?? '';
          return (
            <section key={segment.conflictIndex} className="overflow-hidden">
              <div className="py-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  {t('conflictResolver.hunkTitle', { index: segment.conflictIndex + 1 })}
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setResolutions((prev) => prev.map((value, index) => index === segment.conflictIndex ? joinLines(segment.ours) : value))}
                    className="px-2 py-1 text-[10px] rounded border border-secondary/35 text-secondary hover:bg-secondary hover:text-[#052900] transition-colors"
                  >
                    {t('conflictResolver.acceptOurs')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutions((prev) => prev.map((value, index) => index === segment.conflictIndex ? joinLines(segment.theirs) : value))}
                    className="px-2 py-1 text-[10px] rounded border border-primary/35 text-primary hover:bg-primary hover:text-[#020f1e] transition-colors"
                  >
                    {t('conflictResolver.acceptTheirs')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutions((prev) => prev.map((value, index) => index === segment.conflictIndex ? joinLines([...segment.ours, ...segment.theirs]) : value))}
                    className="px-2 py-1 text-[10px] rounded border border-border-subtle/30 text-text-secondary hover:text-text-primary hover:bg-border-subtle/30 transition-colors"
                  >
                    {t('conflictResolver.acceptBothOursFirst')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutions((prev) => prev.map((value, index) => index === segment.conflictIndex ? joinLines([...segment.theirs, ...segment.ours]) : value))}
                    className="px-2 py-1 text-[10px] rounded border border-border-subtle/30 text-text-secondary hover:text-text-primary hover:bg-border-subtle/30 transition-colors"
                  >
                    {t('conflictResolver.acceptBothTheirsFirst')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <ConflictCodeBlock title={t('conflictResolver.oursLabel')} label={segment.oursLabel} lines={segment.ours} tone="ours" />
                <ConflictCodeBlock title={t('conflictResolver.theirsLabel')} label={segment.theirsLabel} lines={segment.theirs} tone="theirs" />
                {segment.base.length > 0 && (
                  <div className="xl:col-span-2">
                    <ConflictCodeBlock title={t('conflictResolver.baseLabel')} label="base" lines={segment.base} tone="base" />
                  </div>
                )}
                <label className="xl:col-span-2 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-1">
                    {t('conflictResolver.finalLabel')}
                  </span>
                  <textarea
                    value={current}
                    onChange={(event) => setResolutions((prev) => prev.map((value, index) => index === segment.conflictIndex ? event.target.value : value))}
                    className="w-full min-h-28 max-h-64 bg-[#06111f] border border-border-subtle/20 rounded p-2 text-[11px] leading-relaxed text-text-primary font-mono resize-y focus:outline-none focus:border-git-mod/50"
                    spellCheck={false}
                  />
                </label>
              </div>
            </section>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-border-subtle/15 bg-bg-surface/35 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2 text-[11px] text-text-secondary">
          <AlertCircle size={14} className="text-git-mod shrink-0 mt-0.5" />
          <span>{t('conflictResolver.saveHint')}</span>
        </div>
        <button
          type="button"
          onClick={() => onSave(resolvedContent)}
          disabled={isSaving}
          className="shrink-0 px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-40 disabled:cursor-not-allowed text-[#052900] text-sm font-bold rounded flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {isSaving ? t('conflictResolver.saving') : t('conflictResolver.save')}
        </button>
      </div>
    </div>
  );
}
