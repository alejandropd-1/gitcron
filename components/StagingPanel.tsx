'use client';

import { memo, useMemo, useState } from 'react';
import { FileText, GitBranch, Layers, Minus, Plus, RotateCcw, Trash2, AlertCircle, Play } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { type GitFile, useGitStore } from '@/lib/git-store';
import { cn } from '@/lib/utils';
import { useGitActions } from '@/hooks/use-git-actions';

type StagingPanelProps = {
  files: GitFile[];
  selectedFile: GitFile | null;
  repoPath: string | null;
  commitMessage: string;
  setCommitMessage: (message: string) => void;
  isLoading: boolean;
  onSelectFile: (file: GitFile) => void;
  onStage: (path: string, stage: boolean) => void;
  onStageMany: (paths: string[], stage: boolean) => void;
  onDiscard: (path: string) => void;
  onCommit: () => void;
  onRequestAmend: () => void;
  onRequestSquash: () => void;
  onFileContextMenu: (event: React.MouseEvent, file: GitFile) => void;
  onRequestResetAll: () => void;
  onRequestCleanUntracked: () => void;
};

export const StagingPanel = memo(function StagingPanel({
  files, selectedFile, repoPath, commitMessage, setCommitMessage, isLoading,
  onSelectFile, onStage, onStageMany, onDiscard, onCommit, onRequestAmend, onRequestSquash,
  onFileContextMenu, onRequestResetAll, onRequestCleanUntracked,
}: StagingPanelProps) {
  const t = useT();
  const mergeInProgress = useGitStore((s) => s.mergeInProgress);
  const rebaseInProgress = useGitStore((s) => s.rebaseInProgress);
  const { continueInteractiveRebase, abortInteractiveRebase, undoInteractiveRebase } = useGitActions();
  const { unstaged, staged, untrackedCount } = useMemo(() => {
    const nextUnstaged = files.filter((file) => !file.staged);
    const nextStaged = files.filter((file) => file.staged);
    return {
      unstaged: nextUnstaged,
      staged: nextStaged,
      untrackedCount: nextUnstaged.filter((file) => file.status === 'untracked').length,
    };
  }, [files]);

  const stageAll = () => onStageMany(unstaged.map((file) => file.path), true);
  const unstageAll = () => onStageMany(staged.map((file) => file.path), false);

  if (!repoPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-text-secondary text-sm">
        <GitBranch size={32} className="mx-auto mb-3 opacity-30" />
        {t('staging.openRepoPrompt')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {rebaseInProgress && (
        <div className="p-3 bg-[#fd9d1a]/10 border-b border-[#fd9d1a]/30 flex flex-col gap-2 shrink-0">
          <div className="flex items-start gap-2 text-[#fd9d1a]">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold block">{t('rebase.banner.title')}</span>
              <span className="text-[10px] text-text-secondary leading-normal block mt-0.5">
                {t('rebase.banner.desc')}
              </span>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={async () => {
                await abortInteractiveRebase();
              }}
              disabled={isLoading}
              className="px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded transition-colors disabled:opacity-40"
            >
              {t('rebase.banner.btn.abort')}
            </button>
            <button
              onClick={async () => {
                await continueInteractiveRebase();
              }}
              disabled={isLoading}
              className="px-2.5 py-1 text-[10px] font-bold bg-[#fd9d1a] hover:bg-[#ffb03a] text-black rounded transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              {isLoading ? (
                <div className="w-3 h-3 rounded-full border border-black border-t-transparent animate-spin" />
              ) : (
                <Play size={10} className="fill-black" />
              )}
              {t('rebase.banner.btn.continue')}
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="px-4 py-2 border-b border-border-subtle/15 bg-bg-surface/75 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
            {t('staging.unstagedTitle')} ({unstaged.length})
          </span>
          <div className="flex items-center gap-2">
            {untrackedCount > 0 && (
              <button
                type="button"
                onClick={onRequestCleanUntracked}
                disabled={isLoading}
                className="text-[10px] text-[#ffd98a] hover:text-[#201100] px-2 py-0.5 rounded border border-[#f4b942]/40 hover:bg-[#f4b942] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('staging.cleanUntrackedTooltip')}
              >
                {t('staging.cleanUntrackedBtn')}
              </button>
            )}
            {files.length > 0 && (
              <button
                onClick={onRequestResetAll}
                className="p-1 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                title={t('staging.discardAllTooltip')}
              >
                <Trash2 size={12} />
              </button>
            )}
            {unstaged.length > 0 && (
              <button
                onClick={stageAll}
                className="text-[10px] text-secondary hover:text-[#052900] px-2 py-0.5 rounded border border-secondary/40 hover:bg-secondary transition-colors"
              >
                {t('staging.stageAllBtn')}
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {unstaged.length === 0 ? (
            <p className="px-4 py-3 text-xs text-text-secondary/70 italic">{t('staging.noUnstagedChanges')}</p>
          ) : (
            <div className="p-1">
              {unstaged.map((file) => (
                <StagingFileRow
                  key={file.path}
                  file={file}
                  selected={selectedFile?.path === file.path}
                  direction="stage"
                  onClick={() => onSelectFile(file)}
                  onAction={() => onStage(file.path, true)}
                  onDiscard={() => onDiscard(file.path)}
                  onContextMenu={(event) => onFileContextMenu(event, file)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col min-h-0 flex-1 border-t-2 border-secondary/30">
        <div className="px-4 py-2 border-b border-border-subtle/15 bg-[#052900] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
            {t('staging.stagedTitle')} ({staged.length})
          </span>
          {staged.length > 0 && (
            <button
              onClick={unstageAll}
              className="text-[10px] text-text-secondary hover:text-[#020f1e] px-2 py-0.5 rounded border border-[#9eacc0]/40 hover:bg-[#9eacc0] transition-colors"
            >
              {t('staging.unstageAllBtn')}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {staged.length === 0 ? (
            <p className="px-4 py-3 text-xs text-text-secondary/70 italic">{t('staging.noStagedChanges')}</p>
          ) : (
            <div className="p-1">
              {staged.map((file) => (
                <StagingFileRow
                  key={file.path}
                  file={file}
                  selected={selectedFile?.path === file.path}
                  direction="unstage"
                  onClick={() => onSelectFile(file)}
                  onAction={() => onStage(file.path, false)}
                  onDiscard={() => onDiscard(file.path)}
                  onContextMenu={(event) => onFileContextMenu(event, file)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border-subtle/15 bg-bg-surface/75 shrink-0">
        <textarea
          className="w-full bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-sm text-text-primary h-16 focus:outline-none focus:border-secondary/30 resize-none"
          placeholder={t('staging.commitMsgPlaceholder')}
          value={commitMessage}
          onChange={(event) => setCommitMessage(event.target.value)}
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={onCommit}
            disabled={isLoading || !commitMessage.trim() || staged.length === 0}
            className="flex-1 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-[#052900] rounded transition-colors"
          >
            {isLoading
              ? t('staging.committingState')
              : staged.length > 0
                ? t('staging.commitWithCountBtn', { count: staged.length })
                : t('staging.commitBtn')}
          </button>
          <button
            onClick={onRequestAmend}
            disabled={isLoading || !repoPath || mergeInProgress}
            title={mergeInProgress ? t('staging.disabledDuringMergeTooltip') : t('staging.amendTooltip')}
            className="px-3 py-2 bg-bg-base/70 border border-border-subtle/30 hover:border-[#fd9d1a]/50 hover:text-git-mod disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-secondary rounded transition-colors flex items-center gap-1"
          >
            <RotateCcw size={12} />
            {t('staging.amendBtn')}
          </button>
          <button
            onClick={onRequestSquash}
            disabled={isLoading || !repoPath || mergeInProgress}
            title={mergeInProgress ? t('staging.disabledDuringMergeTooltip') : t('staging.squashTooltip')}
            className="px-3 py-2 bg-bg-base/70 border border-border-subtle/30 hover:border-[#fd9d1a]/50 hover:text-git-mod disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-text-secondary rounded transition-colors flex items-center gap-1"
          >
            <Layers size={12} />
            {t('staging.squashBtn')}
          </button>
        </div>
        <div className="mt-2 text-right">
          <button
            onClick={async () => {
              if (confirm(t('rebase.banner.btn.undo') + '?')) {
                await undoInteractiveRebase('refs/gitcron/pre-rebase');
              }
            }}
            disabled={isLoading}
            className="text-[10px] text-text-secondary hover:text-secondary hover:underline transition-colors disabled:opacity-40 font-semibold"
          >
            {t('rebase.banner.btn.undo')}
          </button>
        </div>
      </div>
    </div>
  );
});

type StagingFileRowProps = {
  file: GitFile;
  selected: boolean;
  direction: 'stage' | 'unstage';
  onClick: () => void;
  onAction: () => void;
  onDiscard: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
};

const StagingFileRow = memo(function StagingFileRow({
  file, selected, direction, onClick, onAction, onDiscard, onContextMenu,
}: StagingFileRowProps) {
  const t = useT();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded group transition-colors cursor-pointer',
        selected ? 'bg-secondary/15' : 'hover:bg-border-subtle/50',
      )}
    >
      <button
        onClick={(event) => { event.stopPropagation(); onAction(); }}
        title={direction === 'stage' ? t('staging.stageFileTooltip') : t('staging.unstageFileTooltip')}
        className={cn(
          'p-1 rounded shrink-0 transition-colors',
          direction === 'stage'
            ? 'text-text-secondary hover:text-secondary hover:bg-secondary/10'
            : 'text-text-secondary hover:text-git-mod hover:bg-git-mod/10',
        )}
      >
        {direction === 'stage' ? <Plus size={14} /> : <Minus size={14} />}
      </button>
      <FileText
        size={14}
        className={cn(
          'shrink-0',
          file.conflicted ? 'text-error' :
          file.status === 'modified' ? 'text-git-mod' :
          file.status === 'added' ? 'text-secondary' :
          file.status === 'renamed' ? 'text-primary' :
          file.status === 'untracked' ? 'text-text-secondary' :
          'text-error',
        )}
      />
      <span className="text-xs truncate flex-1 text-text-primary group-hover:text-text-primary">{file.path}</span>
      {isHovered && direction === 'stage' && (
        <button
          onClick={(event) => { event.stopPropagation(); onDiscard(); }}
          className="p-1 hover:text-error text-text-secondary shrink-0"
          title={t('staging.discardFileTooltip')}
        >
          <Trash2 size={12} />
        </button>
      )}
      <div
        className={cn(
          'w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0',
          file.conflicted ? 'bg-error/20 text-error border border-[#ff716c]/40 animate-pulse' :
          file.status === 'modified' ? 'bg-git-mod/20 text-git-mod' :
          file.status === 'added' ? 'bg-secondary/20 text-secondary' :
          file.status === 'renamed' ? 'bg-primary/20 text-primary' :
          file.status === 'untracked' ? 'bg-[#9eacc0]/20 text-text-secondary' :
          'bg-error/20 text-error',
        )}
      >
        {file.conflicted ? '!' : file.status[0].toUpperCase()}
      </div>
    </div>
  );
});
