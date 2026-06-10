'use client';

// Panel derecho de detalles: muestra el detalle del commit seleccionado (con
// sus archivos y commit box) o, sin selección, el StagingPanel del working
// tree. Flota en la vista chronometric y es inline en la clásica. Extraído de
// app/page.tsx.
//
// Es dueño de la carga de archivos del commit (gitShowFiles). Lo que abre
// modales/menus de la página o navega al diff llega por props.

import { useEffect, useState } from 'react';
import { Archive, Zap } from 'lucide-react';
import { useGitStore, GitFile } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useT } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { formatDate, formatInitials } from '@/lib/display-format';
import { FLOATING_PANEL_INSET } from '@/hooks/use-panel-layout';
import { StagingPanel } from '@/components/StagingPanel';

type RepoDetailsPanelProps = {
  // layout (estado de usePanelLayout, que vive en la página)
  graphMode: 'classic' | 'chronometric';
  detailsW: number;
  visible: boolean;
  isDragging: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
  // acciones que tocan estado/modales de la página
  onOpenStashModal: () => void;
  onOpenCommitFile: (file: GitFile) => void;
  onSelectFile: (file: GitFile) => void;
  onDiscardRequest: (file: GitFile) => void;
  onRequestAmend: () => void;
  onRequestSquash: () => void;
  onFileContextMenu: (menu: { x: number; y: number; file: GitFile }) => void;
  onRequestResetAll: () => void;
  onRequestCleanUntracked: () => void;
};

export function RepoDetailsPanel({
  graphMode, detailsW, visible, isDragging, onResizeStart,
  onOpenStashModal, onOpenCommitFile, onSelectFile, onDiscardRequest,
  onRequestAmend, onRequestSquash, onFileContextMenu,
  onRequestResetAll, onRequestCleanUntracked,
}: RepoDetailsPanelProps) {
  const t = useT();
  const {
    repoPath, selectedCommit, setSelectedCommit,
    modifiedFiles, commitMessage, setCommitMessage,
    selectedFile, isLoading,
  } = useGitStore();
  const { commitChanges, stageFile, stageFiles } = useGitActions();

  // Files changed in the selected commit (lazy-loaded per selection).
  const [commitFiles, setCommitFiles] = useState<GitFile[]>([]);
  const [commitFilesLoading, setCommitFilesLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedCommit || !repoPath || !window.api) {
      setCommitFiles([]);
      return;
    }
    setCommitFilesLoading(true);
    window.api.gitShowFiles(repoPath, selectedCommit.hash)
      .then((r) => {
        if (r.success && r.data) setCommitFiles(r.data as GitFile[]);
        else setCommitFiles([]);
      })
      .catch(() => setCommitFiles([]))
      .finally(() => setCommitFilesLoading(false));
  }, [selectedCommit?.hash, repoPath]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden z-30",
        !isDragging && "transition-all duration-300",
        graphMode === 'chronometric'
          ? "absolute bg-bg-overlay/60 backdrop-blur-md border border-text-primary/15 rounded-xl"
          : "relative bg-bg-base/70 border-l border-border-subtle/30 shrink-0"
      )}
      style={
        graphMode === 'chronometric'
          ? {
              top: 96 + FLOATING_PANEL_INSET,
              right: FLOATING_PANEL_INSET,
              bottom: FLOATING_PANEL_INSET,
              width: detailsW,
              transform: visible ? 'translateX(0)' : `translateX(calc(100% + ${FLOATING_PANEL_INSET * 2}px))`,
              opacity: visible ? 1 : 0,
              visibility: visible ? 'visible' : 'hidden',
            }
          : {
              width: visible ? detailsW : 0,
              opacity: visible ? 1 : 0,
              visibility: visible ? 'visible' : 'hidden',
            }
      }
    >
      {/* Left-edge resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="group absolute top-0 left-0 h-full w-2 cursor-col-resize z-40"
        title="Arrastrar para redimensionar"
      >
        <div className="absolute inset-y-3 left-0.5 w-px bg-transparent group-hover:bg-secondary/45 group-active:bg-secondary/70 transition-colors" />
      </div>
      {selectedCommit ? (
        <div className="flex flex-col h-full">
          {/* Header bar: matches Unstaged header exactly in size, padding and font */}
          <div className="px-4 py-2 border-b border-border-subtle/15 bg-bg-surface/75 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
              {t('commit.detailsTitle')}
            </span>
            <button
              onClick={() => setSelectedCommit(null)}
              className="text-[10px] text-text-secondary hover:text-[#052900] px-2 py-0.5 rounded border border-border-subtle/15 hover:bg-secondary hover:border-secondary/40 transition-colors"
              title={t('commit.goToStagingTooltip')}
            >
              {t('commit.viewChangesBtn')}
            </button>
          </div>
          {/* WIP banner: visible when commit is selected but there are unsaved changes */}
          {modifiedFiles.length > 0 && (
            <div className="px-3 py-2 bg-git-mod/10 border-b border-git-mod/20 flex items-center gap-2 shrink-0">
              <Archive size={13} className="text-git-mod shrink-0" />
              <span className="text-[11px] text-text-primary flex-1">
                {t('commit.unstagedChangesCount', { count: modifiedFiles.length })}
              </span>
              <button
                onClick={onOpenStashModal}
                disabled={isLoading}
                className="text-[10px] font-bold text-git-mod hover:text-[#052900] hover:bg-git-mod px-2 py-0.5 rounded border border-git-mod/40 transition-colors disabled:opacity-50"
                title={t('commit.stashTooltip')}
              >
                Stash
              </button>
            </div>
          )}
          <div className="p-4 border-b border-border-subtle/15 bg-bg-surface/75 shrink-0">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[12px] font-mono text-secondary select-text">commit: {selectedCommit.shortHash}</div>
              <button className="flex items-center gap-1.5 px-2 py-1 rounded bg-border-subtle text-xs hover:bg-bg-surface/70 transition-colors">
                <Zap size={12} className="text-git-mod" /> {t('commit.explainBtn')}
              </button>
            </div>
            <h2 className="font-semibold mb-1 select-text">{selectedCommit.message}</h2>
            <div className="text-xs text-text-secondary mb-4 select-text">{formatDate(selectedCommit.date)}</div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                {formatInitials(selectedCommit.authorName)}
              </div>
              <div>
                <div className="text-sm font-medium select-text">{selectedCommit.authorName}</div>
                <div className="text-[10px] text-text-secondary select-text">{selectedCommit.authorEmail}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2 border-b border-border-subtle/15 flex justify-between items-center bg-bg-surface/75">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                {commitFilesLoading
                  ? t('commit.loadingFiles')
                  : t('commit.changedFilesCount', { count: commitFiles.length })}
              </span>
            </div>
            <div className="p-1">
              {commitFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => onOpenCommitFile(file)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                    selectedFile?.path === file.path
                      ? 'bg-secondary/10 text-secondary'
                      : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
                  )}
                >
                  <span className={cn(
                    'text-[10px] font-bold w-4 shrink-0',
                    file.status === 'added' ? 'text-secondary' :
                    file.status === 'deleted' ? 'text-error' :
                    file.status === 'renamed' ? 'text-primary' :
                    'text-git-mod',
                  )}>
                    {file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : file.status === 'renamed' ? 'R' : 'M'}
                  </span>
                  <span className="truncate text-xs select-text">{file.path}</span>
                </button>
              ))}
              {!commitFilesLoading && commitFiles.length === 0 && (
                <p className="px-4 py-4 text-xs text-text-secondary/70 text-center">{t('commit.noFiles')}</p>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-border-subtle/15 bg-bg-surface/75">
            <textarea
              className="w-full bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-sm text-text-primary h-24 focus:outline-none focus:border-secondary/30 resize-none"
              placeholder={t('staging.commitMsgPlaceholder')}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
            />
            <button
              onClick={commitChanges}
              disabled={isLoading || !commitMessage.trim() || !repoPath}
              className="w-full mt-3 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold text-[#052900] rounded transition-colors shadow-lg shadow-secondary/20"
            >
              {isLoading
                ? t('staging.committingState')
                : t('staging.commitWithCountBtn', { count: modifiedFiles.filter((f) => f.staged).length })}
            </button>
          </div>
        </div>
      ) : (
        /* Working tree: Unstaged ↑↓ Staged */
        <StagingPanel
          files={modifiedFiles}
          selectedFile={selectedFile}
          repoPath={repoPath}
          commitMessage={commitMessage}
          setCommitMessage={setCommitMessage}
          isLoading={isLoading}
          onSelectFile={onSelectFile}
          onStage={(path, stage) => stageFile(path, stage)}
          onStageMany={(paths, stage) => stageFiles(paths, stage)}
          onDiscard={(path) => {
            const file = modifiedFiles.find((f) => f.path === path);
            if (file) onDiscardRequest(file);
          }}
          onCommit={commitChanges}
          onRequestAmend={onRequestAmend}
          onRequestSquash={onRequestSquash}
          onFileContextMenu={(e, file) => {
            e.preventDefault();
            onFileContextMenu({ x: e.clientX, y: e.clientY, file });
          }}
          onRequestResetAll={onRequestResetAll}
          onRequestCleanUntracked={onRequestCleanUntracked}
        />
      )}
    </aside>
  );
}
