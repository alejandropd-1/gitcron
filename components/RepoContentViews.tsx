'use client';

import { memo, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { FileText } from 'lucide-react';
import { StatusBadge, FlowStep } from '@/components/HelpModal';
import { useT } from '@/hooks/use-translation';
import type { Commit, GitFile } from '@/lib/git-store';
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
