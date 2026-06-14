'use client';

import { memo, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { FileText, ArrowLeft, ExternalLink, FileDiff, WrapText, AlignLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { StatusBadge, FlowStep } from '@/components/HelpModal';
import { DiffViewer, type HunkActionMode } from '@/components/DiffViewer';
import { ConflictResolver } from '@/components/ConflictResolver';
import { DangerConfirmDialog } from '@/components/DangerConfirmDialog';
import { useT } from '@/hooks/use-translation';
import type { Commit, GitFile } from '@/lib/git-store';
import type { FileHistoryEntry, PullRequestDiffData, PullRequestEntry } from '@/types/electron';
import { cn } from '@/lib/utils';
import { formatDate, formatInitials } from '@/lib/display-format';

type HistoryViewProps = {
  commits: Commit[];
  selectedHash?: string;
  currentBranch?: string;
  filterText?: string;
  onSelect: (commit: Commit) => void;
  onContextMenu: (event: MouseEvent, commit: Commit) => void;
  isLoading: boolean;
};

/**
 * Linear chronological history list: no SVG, more detail per row.
 * Useful for skimming the full commit log of the current branch.
 */
export const HistoryView = memo(function HistoryView({
  commits,
  selectedHash,
  currentBranch,
  filterText,
  onSelect,
  onContextMenu,
  isLoading,
}: HistoryViewProps) {
  const filter = filterText?.trim().toLowerCase() ?? '';
  const filtered = useMemo(() => {
    if (!filter) return commits;
    return commits.filter(
      (commit) =>
        commit.message.toLowerCase().includes(filter) ||
        commit.shortHash.startsWith(filter) ||
        commit.authorName.toLowerCase().includes(filter),
    );
  }, [commits, filter]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="sticky top-0 bg-bg-surface/75 border-b border-border-subtle/15 z-10 py-2 px-4 text-[11px] text-text-secondary uppercase tracking-wider font-bold shrink-0">
        {filter
          ? `${filtered.length} de ${commits.length} commits`
          : `Historial · ${commits.length} commits`}
      </div>
      <div className="flex-1 overflow-y-auto">
        {commits.length === 0 && isLoading && (
          <p className="px-4 py-8 text-center text-text-secondary text-sm">Cargando commits...</p>
        )}
        {filter && filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-text-secondary text-sm">
            Sin resultados para &quot;{filter}&quot;
          </p>
        )}
        {filtered.map((commit) => {
          const isSelected = selectedHash === commit.hash;
          return (
            <div
              key={commit.hash}
              onClick={() => onSelect(commit)}
              onContextMenu={(event) => {
                event.preventDefault();
                onContextMenu(event, commit);
              }}
              className={cn(
                'px-4 py-3 border-b border-border-subtle/15 cursor-pointer transition-colors select-text',
                isSelected ? 'bg-secondary/10' : 'hover:bg-bg-surface/75',
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <code className="text-[11px] font-mono text-secondary shrink-0 select-text">{commit.shortHash}</code>
                  {commit.refs && commit.refs.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {commit.refs.slice(0, 3).map((ref) => {
                        const isTag = ref.startsWith('tag: ');
                        const isRemote = ref.includes('/');
                        const text = isTag ? ref.replace('tag: ', '') : ref;
                        const isCurrent = !isTag && !isRemote && text === currentBranch;
                        return (
                          <span
                            key={ref}
                            className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap font-medium',
                              isTag ? 'bg-git-mod/15 text-git-mod border-git-mod/30'
                                : isCurrent ? 'bg-secondary/20 text-secondary border-secondary/40'
                                : isRemote ? 'bg-primary/10 text-primary border-[#5ed8ff]/30'
                                : 'bg-secondary/15 text-secondary border-secondary/30',
                            )}
                          >
                            {text}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-text-secondary/70 shrink-0 font-mono select-text">{formatDate(commit.date)}</span>
              </div>
              <p className="text-sm font-medium mb-1.5 select-text text-text-primary">
                {commit.message}
              </p>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#a3f185] to-[#68b24f] flex items-center justify-center text-[8px] font-bold text-[#052900]">
                  {formatInitials(commit.authorName)}
                </div>
                <span className="select-text">{commit.authorName}</span>
                <span className="text-text-secondary/70">·</span>
                <span className="text-text-secondary/70 font-mono text-[10px] select-text">{commit.authorEmail}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

type FileHistoryViewProps = {
  file: GitFile;
  entries: FileHistoryEntry[];
  selectedHash?: string;
  isLoading: boolean;
  onBack: () => void;
  onSelect: (entry: FileHistoryEntry) => void;
  onContextMenu: (event: MouseEvent, entry: FileHistoryEntry) => void;
};

export function FileHistoryView({
  file,
  entries,
  selectedHash,
  isLoading,
  onBack,
  onSelect,
  onContextMenu,
}: FileHistoryViewProps) {
  const t = useT();

  return (
    <motion.div
      key={`file-history-${file.path}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle/15 bg-bg-base/70 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-secondary transition-colors"
        >
          <ArrowLeft size={14} /> {t('fileHistory.back')}
        </button>
        <span className="text-text-secondary/70">/</span>
        <span className="text-xs text-text-primary font-mono truncate">{file.path}</span>
        <div className="flex-1" />
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-bold">
          {t('fileHistory.title')}
        </span>
      </div>
      <HistoryView
        commits={entries}
        selectedHash={selectedHash}
        filterText=""
        onSelect={(entry) => onSelect(entry as FileHistoryEntry)}
        onContextMenu={(event, entry) => onContextMenu(event, entry as FileHistoryEntry)}
        isLoading={isLoading}
      />
    </motion.div>
  );
}

type CommitTabViewProps = {
  modifiedFiles: GitFile[];
  hasGithubUser: boolean;
};

/**
 * "Commit" tab: focused workspace for preparing changes.
 */
export const CommitTabView = memo(function CommitTabView({ modifiedFiles, hasGithubUser }: CommitTabViewProps) {
  const t = useT();
  const { staged, statusCounts, unstaged } = useMemo(() => {
    const counts: Partial<Record<GitFile['status'], number>> = {};
    let stagedCount = 0;
    let unstagedCount = 0;

    for (const file of modifiedFiles) {
      counts[file.status] = (counts[file.status] ?? 0) + 1;
      if (file.staged) stagedCount += 1;
      else unstagedCount += 1;
    }

    return { staged: stagedCount, statusCounts: counts, unstaged: unstagedCount };
  }, [modifiedFiles]);

  const statusCount = (status: GitFile['status']) => statusCounts[status] ?? 0;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-2">{t('commitTab.pageTitle')}</h2>
          <p className="text-sm text-text-secondary">
            {t('commitTab.introText')}
          </p>
        </div>

        {modifiedFiles.length === 0 ? (
          <div className="bg-bg-surface/75 border border-border-subtle/15 rounded-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-secondary" />
            </div>
            <p className="text-base font-semibold text-text-primary mb-1">{t('commitTab.cleanWorkspace')}</p>
            <p className="text-sm text-text-secondary">{t('commitTab.cleanWorkspaceDesc')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard label={t('staging.unstagedTitle')} value={unstaged} accent="muted" />
              <StatCard label={t('staging.stagedTitle')} value={staged} accent="primary" />
            </div>

            <div className="bg-bg-surface/75 border border-border-subtle/15 rounded-lg p-5 mb-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                {t('commitTab.changesByTypeLabel')}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {statusCount('modified') > 0 && <StatusBadge label={t('status.modified')} count={statusCount('modified')} color="#fd9d1a" letter="M" />}
                {statusCount('added') > 0 && <StatusBadge label={t('status.added')} count={statusCount('added')} color="#a3f185" letter="A" />}
                {statusCount('deleted') > 0 && <StatusBadge label={t('status.deleted')} count={statusCount('deleted')} color="#ff716c" letter="D" />}
                {statusCount('untracked') > 0 && <StatusBadge label={t('status.untracked')} count={statusCount('untracked')} color="#9eacc0" letter="U" />}
                {statusCount('renamed') > 0 && <StatusBadge label={t('status.renamed')} count={statusCount('renamed')} color="#5ed8ff" letter="R" />}
              </div>
            </div>

            <div className="bg-bg-surface/75 border border-border-subtle/15 rounded-lg p-5">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">{t('commitTab.stepByStepLabel')}</h3>
              <ol className="space-y-2 text-sm text-text-primary">
                <FlowStep n={1} done={true}>{t('commitTab.step1Text')}</FlowStep>
                <FlowStep n={2} done={staged > 0}>{t('commitTab.step2Text')}</FlowStep>
                <FlowStep n={3} done={false}>{t('commitTab.step3Text')}</FlowStep>
                <FlowStep n={4} done={false}>{t('commitTab.step4Text')}</FlowStep>
                {hasGithubUser && <FlowStep n={5} done={false}>{t('commitTab.step5Text')}</FlowStep>}
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'primary' | 'muted' }) {
  return (
    <div
      className={cn(
        'bg-bg-surface/75 border rounded-lg p-4',
        accent === 'primary' ? 'border-secondary/40' : 'border-border-subtle/15',
      )}
    >
      <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', accent === 'primary' ? 'text-secondary' : 'text-text-primary')}>
        {value}
      </p>
    </div>
  );
}

type PullRequestDiffViewProps = {
  pullRequest: PullRequestEntry;
  pullRequestDiff: PullRequestDiffData | null;
  pullRequestDiffLoading: boolean;
  wordWrap: boolean;
  onBack: () => void;
};

/**
 * Vista de diff unificado de un Pull Request: cabecera con metadatos + chips de
 * archivos + DiffViewer. El motion.div lleva la key por número de PR para que
 * cambiar de PR re-monte la vista.
 */
export function PullRequestDiffView({
  pullRequest,
  pullRequestDiff,
  pullRequestDiffLoading,
  wordWrap,
  onBack,
}: PullRequestDiffViewProps) {
  const t = useT();

  return (
    <motion.div
      key={`pr-diff-${pullRequest.number}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border-subtle/15 bg-bg-base/70 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-secondary transition-colors"
          >
            <ArrowLeft size={14} /> {t('prDiff.back')}
          </button>
          <span className="text-text-secondary/70">/</span>
          <span className="text-xs font-mono text-secondary">PR #{pullRequest.number}</span>
          <div className="flex-1" />
          {pullRequest.draft && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#697789]/20 text-text-secondary uppercase">
              {t('sidebar.draft')}
            </span>
          )}
          <button
            type="button"
            onClick={() => window.api?.shellOpenExternal(pullRequest.url)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-secondary transition-colors"
          >
            <ExternalLink size={13} /> {t('prDiff.open')}
          </button>
        </div>
        <div className="flex items-start gap-3">
          <FileDiff size={18} className="text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-text-primary truncate">{pullRequest.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
              <span>@{pullRequest.author}</span>
              <span className="text-text-secondary/70">·</span>
              <span className="font-mono text-primary">{pullRequest.branch}</span>
              <span className="text-text-secondary/70">→</span>
              <span className="font-mono text-text-primary">{pullRequest.baseBranch}</span>
              <span className="text-text-secondary/70">·</span>
              <span>{t('prDiff.changedFiles', { count: String(pullRequestDiff?.changedFiles ?? pullRequest.changedFiles) })}</span>
              <span className="font-mono text-secondary">+{pullRequestDiff?.additions ?? pullRequest.additions}</span>
              <span className="font-mono text-error">-{pullRequestDiff?.deletions ?? pullRequest.deletions}</span>
            </div>
          </div>
        </div>
        {!!pullRequestDiff?.files.length && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {pullRequestDiff.files.slice(0, 18).map((file) => (
              <span
                key={file.filename}
                title={file.previousFilename ? `${file.previousFilename} → ${file.filename}` : file.filename}
                className="shrink-0 max-w-[220px] truncate rounded border border-border-subtle/20 bg-bg-base px-2 py-1 text-[10px] font-mono text-text-secondary"
              >
                {file.filename}
              </span>
            ))}
            {pullRequestDiff.files.length > 18 && (
              <span className="shrink-0 rounded border border-border-subtle/20 bg-bg-base px-2 py-1 text-[10px] font-mono text-text-secondary/70">
                +{pullRequestDiff.files.length - 18}
              </span>
            )}
          </div>
        )}
      </div>
      {pullRequestDiffLoading ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
          <Loader2 size={16} className="animate-spin mr-2 text-secondary" />
          {t('prDiff.loading')}
        </div>
      ) : (
        <DiffViewer diff={pullRequestDiff?.diff ?? ''} filePath={t('prDiff.unifiedDiff', { number: String(pullRequest.number) })} wordWrap={wordWrap} />
      )}
    </motion.div>
  );
}

type FileDiffViewProps = {
  file: GitFile;
  currentDiff: string;
  wordWrap: boolean;
  hunkActionMode?: HunkActionMode;
  hunkActionLoading?: number | null;
  onToggleWordWrap: () => void;
  onBack: () => void;
  onStageHunk?: (hunkIndex: number, selectedLines?: number[]) => void;
  onUnstageHunk?: (hunkIndex: number, selectedLines?: number[]) => void;
  onDiscardHunk?: (hunkIndex: number, selectedLines?: number[]) => void;
  conflictFileLoading: boolean;
  conflictFileContent: string;
  isSaving: boolean;
  onSaveConflict: (content: string) => Promise<void> | void;
};

/**
 * Vista de diff de un archivo del working tree: cabecera con toggle de word-wrap
 * y badge de estado + ConflictResolver (si el archivo está en conflicto) +
 * DiffViewer. La key del motion.div incluye path+staged para re-montar al cambiar.
 */
export function FileDiffView({
  file,
  currentDiff,
  wordWrap,
  hunkActionMode,
  hunkActionLoading,
  onToggleWordWrap,
  onBack,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
  conflictFileLoading,
  conflictFileContent,
  isSaving,
  onSaveConflict,
}: FileDiffViewProps) {
  const t = useT();
  const [pendingDiscardHunk, setPendingDiscardHunk] = useState<{ hunkIndex: number; selectedLines?: number[] } | null>(null);
  const hasHunkActions = !!hunkActionMode && !file.conflicted;

  const confirmDiscardHunk = () => {
    if (!pendingDiscardHunk) return;
    onDiscardHunk?.(pendingDiscardHunk.hunkIndex, pendingDiscardHunk.selectedLines);
    setPendingDiscardHunk(null);
  };

  return (
    <motion.div
      key={`file-diff-${file.path}-${file.staged}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle/15 bg-bg-base/70 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-secondary transition-colors"
        >
          <ArrowLeft size={14} /> {t('diff.backToGraph')}
        </button>
        <span className="text-text-secondary/70">/</span>
        <span className="text-xs text-text-primary font-mono truncate">{file.path}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onToggleWordWrap}
          title={wordWrap ? t('diff.wordWrapOn') : t('diff.wordWrapOff')}
          className={cn(
            "p-1 rounded border flex items-center justify-center transition-all cursor-pointer mr-1",
            wordWrap
              ? "border-secondary/40 bg-secondary/15 text-secondary hover:bg-secondary/25"
              : "border-text-primary/10 bg-text-primary/[0.02] text-text-secondary hover:text-text-primary hover:border-text-primary/20"
          )}
        >
          {wordWrap ? <WrapText size={14} /> : <AlignLeft size={14} />}
        </button>
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-bold',
            file.status === 'modified' ? 'bg-git-mod/20 text-git-mod' :
            file.status === 'added' ? 'bg-secondary/20 text-secondary' :
            file.status === 'renamed' ? 'bg-primary/20 text-primary' :
            file.status === 'untracked' ? 'bg-[#9eacc0]/20 text-text-secondary' :
            'bg-error/20 text-error',
          )}
        >
          {file.status.toUpperCase()}
        </span>
      </div>
      {file.conflicted && (
        conflictFileLoading ? (
          <div className="px-4 py-3 border-b border-border-subtle/15 bg-bg-base/45 flex items-center gap-2 text-text-secondary text-sm shrink-0">
            <Loader2 size={16} className="animate-spin text-git-mod" />
            {t('conflictResolver.loading')}
          </div>
        ) : (
          <ConflictResolver
            filePath={file.path}
            content={conflictFileContent}
            isSaving={isSaving}
            onSave={onSaveConflict}
          />
        )
      )}
      <DiffViewer
        diff={currentDiff}
        filePath={file.path}
        wordWrap={wordWrap}
        hunkActions={hasHunkActions ? {
          mode: hunkActionMode,
          busyHunkIndex: hunkActionLoading,
          onStageHunk,
          onUnstageHunk,
          onDiscardHunk: hunkActionMode === 'stage' && onDiscardHunk
            ? (hunkIndex, selectedLines) => setPendingDiscardHunk({ hunkIndex, selectedLines })
            : undefined,
        } : undefined}
      />
      <DangerConfirmDialog
        open={pendingDiscardHunk != null}
        title={t('diff.discardHunkTitle')}
        message={t('diff.discardHunkMessage')}
        warning={t('diff.discardHunkWarning')}
        confirmLabel={t('diff.discardHunkConfirm')}
        cancelLabel={t('common.cancel')}
        disabled={hunkActionLoading != null}
        onCancel={() => setPendingDiscardHunk(null)}
        onConfirm={confirmDiscardHunk}
      />
    </motion.div>
  );
}
