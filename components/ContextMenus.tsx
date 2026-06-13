'use client';

import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useT } from '@/hooks/use-translation';
import type { GitFile } from '@/lib/git-store';

/**
 * Custom hook to dynamically adjust the context menu position
 * so it never overflows the bottom or right edges of the viewport.
 * Uses a two-pass render style (hidden first frame) to measure and
 * reposition seamlessly without flickering.
 */
function useAdjustedPosition(x: number, y: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ left: x, top: y });
  const [isMeasured, setIsMeasured] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let left = x;
      let top = y;

      // Adjust horizontally if it goes off-screen to the right
      if (x + rect.width > winW) {
        left = Math.max(8, winW - rect.width - 8);
      }
      // Adjust vertically if it goes off-screen to the bottom (render upwards)
      if (y + rect.height > winH) {
        top = Math.max(8, winH - rect.height - 8);
      }

      setCoords({ left, top });
      setIsMeasured(true);
    }
  }, [x, y]);

  return { ref, coords, isMeasured };
}

function ContextMenuItem({
  onClick, text, textSecondary,
}: { onClick: () => void; text: string; textSecondary?: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center justify-between px-4 py-1.5 text-ui-body text-left hover:bg-secondary/20 text-text-primary hover:text-secondary transition-colors"
    >
      <span className="text-left">{text}</span>
      {textSecondary && <span className="text-[10px] opacity-50 ml-4 shrink-0">{textSecondary}</span>}
    </button>
  );
}

export function CommitContextMenu({
  x, y, onMerge, onRevert, onCheckout, onCreateBranch, onCreateTag, onReset, onCherryPick, onCopySha, onClose,
}: {
  x: number; y: number;
  onMerge: () => void; onRevert: () => void; onCheckout: () => void;
  onCreateBranch: () => void; onCreateTag: () => void; onReset: () => void; onCherryPick: () => void; onCopySha: () => void; onClose: () => void;
}) {
  const t = useT();
  const { ref, coords, isMeasured } = useAdjustedPosition(x, y);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: isMeasured ? 1 : 0 }}
      className="fixed glass-overlay rounded-lg py-1 z-[100] w-64"
      style={{
        left: coords.left,
        top: coords.top,
        visibility: isMeasured ? 'visible' : 'hidden',
      }}
    >
      <ContextMenuItem onClick={onMerge} text="Merge into current branch" />
      <ContextMenuItem onClick={onCherryPick} text={t('commitMenu.cherryPick')} />
      <ContextMenuItem onClick={onRevert} text="Revert commit" />
      <ContextMenuItem onClick={onReset} text={t('commitMenu.reset')} />
      <div className="h-px bg-border-subtle my-1" />
      <ContextMenuItem onClick={onCheckout} text="Checkout" />
      <ContextMenuItem onClick={onCreateBranch} text="Create branch here" />
      <ContextMenuItem onClick={onCreateTag} text={t('commitMenu.createTag')} />
      <div className="h-px bg-border-subtle my-1" />
      <ContextMenuItem onClick={onCopySha} text="Copy commit SHA" textSecondary="Ctrl+C" />
      <ContextMenuItem onClick={onClose} text="Cerrar" />
    </motion.div>
  );
}

function BranchContextMenu({
  x, y, branch, currentBranch, tracking,
  onMerge, onRebase, onFastForward, onPull, onPush,
  onCheckout, onRename, onDelete, onCopyName, onCreateFrom, onClose,
}: {
  x: number; y: number; branch: string; currentBranch: string;
  tracking?: { ahead: number; behind: number; gone: boolean; upstream: string | null };
  onMerge: () => void; onRebase: () => void; onFastForward: () => void;
  onPull: () => void; onPush: () => void; onCheckout: () => void;
  onRename: () => void; onDelete: () => void; onCopyName: () => void;
  onCreateFrom: () => void; onClose: () => void;
}) {
  const isCurrent = branch === currentBranch;
  const hasUpstream = !!tracking?.upstream;
  const canPush = hasUpstream && (tracking?.ahead ?? 0) > 0;
  const canPull = hasUpstream && (tracking?.behind ?? 0) > 0;
  const { ref, coords, isMeasured } = useAdjustedPosition(x, y);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: isMeasured ? 1 : 0 }}
      className="fixed glass-overlay rounded-lg py-1 z-[100] w-72"
      style={{
        left: coords.left,
        top: coords.top,
        visibility: isMeasured ? 'visible' : 'hidden',
      }}
    >
      <div className="px-4 py-1.5 text-ui-label-bold text-text-secondary/70 border-b border-border-subtle/15 truncate">{branch}</div>
      {!isCurrent && <ContextMenuItem onClick={onMerge} text={`Merge "${branch}" en "${currentBranch}"`} />}
      {!isCurrent && <ContextMenuItem onClick={onRebase} text={`Rebase "${currentBranch}" sobre "${branch}"`} />}
      {!isCurrent && tracking?.upstream && tracking.behind > 0 && tracking.ahead === 0 && (
        <ContextMenuItem onClick={onFastForward} text={`Fast-forward a origin/${branch}`} textSecondary={`↓${tracking.behind}`} />
      )}
      {!isCurrent && <div className="h-px bg-border-subtle/15 my-1" />}
      <ContextMenuItem onClick={onCheckout} text={isCurrent ? '(branch actual)' : 'Checkout (cambiar a esta)'} />
      <div className="h-px bg-border-subtle/15 my-1" />
      <ContextMenuItem onClick={onPull} text="Pull" textSecondary={canPull ? `↓${tracking?.behind}` : hasUpstream ? '✓' : '—'} />
      <ContextMenuItem onClick={onPush} text="Push" textSecondary={canPush ? `↑${tracking?.ahead}` : hasUpstream ? '✓' : '—'} />
      <div className="h-px bg-border-subtle/15 my-1" />
      <ContextMenuItem onClick={onCreateFrom} text="Crear nueva branch desde acá" />
      <ContextMenuItem onClick={onRename} text="Renombrar..." />
      {!isCurrent && <ContextMenuItem onClick={onDelete} text="Eliminar" />}
      <div className="h-px bg-border-subtle/15 my-1" />
      <ContextMenuItem onClick={onCopyName} text="Copiar nombre" textSecondary="Ctrl+C" />
      <ContextMenuItem onClick={onClose} text="Cerrar" />
    </motion.div>
  );
}

export function FileContextMenu({
  x, y, file,
  onStage, onDiscard, onStashFile, onIgnore,
  onOpenInEditor, onShowInFolder, onCopyPath, onDelete, onClose,
}: {
  x: number; y: number; file: GitFile;
  onStage: () => void; onDiscard: () => void; onStashFile: () => void;
  onIgnore: () => void; onOpenInEditor: () => void; onShowInFolder: () => void;
  onCopyPath: () => void; onDelete: () => void; onClose: () => void;
}) {
  const { ref, coords, isMeasured } = useAdjustedPosition(x, y);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: isMeasured ? 1 : 0 }}
      className="fixed glass-overlay rounded-lg py-1 z-[100] w-60"
      style={{
        left: coords.left,
        top: coords.top,
        visibility: isMeasured ? 'visible' : 'hidden',
      }}
    >
      <ContextMenuItem onClick={onStage} text={file.staged ? 'Unstage' : 'Stage'} />
      <ContextMenuItem onClick={onIgnore} text="Agregar a .gitignore" />
      <ContextMenuItem onClick={onStashFile} text="Stashear este archivo" />
      <div className="h-px bg-border-subtle/20 my-1" />
      <ContextMenuItem onClick={onOpenInEditor} text="Abrir en editor" />
      <ContextMenuItem onClick={onShowInFolder} text="Mostrar en carpeta" />
      <ContextMenuItem onClick={onCopyPath} text="Copiar path" textSecondary="Ctrl+C" />
      <div className="h-px bg-border-subtle/20 my-1" />
      <ContextMenuItem onClick={onDiscard} text="Descartar cambios" />
      <ContextMenuItem onClick={onDelete} text="Eliminar archivo" />
      <div className="h-px bg-border-subtle/20 my-1" />
      <ContextMenuItem onClick={onClose} text="Cerrar" />
    </motion.div>
  );
}

function RemoteBranchContextMenu({
  x, y, branch,
  onCheckout, onCopyName, onCreateFrom, onClose,
}: {
  x: number; y: number; branch: string;
  onCheckout: () => void; onCopyName: () => void;
  onCreateFrom: () => void; onClose: () => void;
}) {
  const { ref, coords, isMeasured } = useAdjustedPosition(x, y);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: isMeasured ? 1 : 0 }}
      className="fixed glass-overlay rounded-lg py-1 z-[100] w-72"
      style={{
        left: coords.left,
        top: coords.top,
        visibility: isMeasured ? 'visible' : 'hidden',
      }}
    >
      <div className="px-4 py-1.5 text-ui-label-bold text-text-secondary/70 border-b border-border-subtle/15 truncate">{branch}</div>
      <ContextMenuItem onClick={onCheckout} text="Checkout (descargar localmente)" />
      <div className="h-px bg-border-subtle/15 my-1" />
      <ContextMenuItem onClick={onCreateFrom} text="Crear nueva branch desde acá" />
      <div className="h-px bg-border-subtle/15 my-1" />
      <ContextMenuItem onClick={onCopyName} text="Copiar nombre" textSecondary="Ctrl+C" />
      <ContextMenuItem onClick={onClose} text="Cerrar" />
    </motion.div>
  );
}

type BranchContextMenuLayerProps = {
  branchMenu: { x: number; y: number; branch: string } | null;
  remoteBranchMenu: { x: number; y: number; branch: string } | null;
  currentBranch: string;
  branchTracking: Record<string, { ahead: number; behind: number; gone: boolean; upstream: string | null }>;
  onMerge: (branch: string) => void;
  onRebase: (branch: string) => void;
  onFastForward: (branch: string) => void;
  onPull: (branch: string) => void;
  onPush: (branch: string) => void;
  onCheckout: (branch: string) => void;
  onRename: (branch: string) => void;
  onDelete: (branch: string) => void;
  onCopyName: (branch: string) => void;
  onCreateFrom: (branch: string) => void;
  onCloseBranchMenu: () => void;
  onCloseRemoteBranchMenu: () => void;
};

export function BranchContextMenuLayer({
  branchMenu,
  remoteBranchMenu,
  currentBranch,
  branchTracking,
  onMerge,
  onRebase,
  onFastForward,
  onPull,
  onPush,
  onCheckout,
  onRename,
  onDelete,
  onCopyName,
  onCreateFrom,
  onCloseBranchMenu,
  onCloseRemoteBranchMenu,
}: BranchContextMenuLayerProps) {
  return (
    <>
      <AnimatePresence>
        {branchMenu && (
          <BranchContextMenu
            x={branchMenu.x}
            y={branchMenu.y}
            branch={branchMenu.branch}
            currentBranch={currentBranch}
            tracking={branchTracking[branchMenu.branch]}
            onMerge={() => onMerge(branchMenu.branch)}
            onRebase={() => onRebase(branchMenu.branch)}
            onFastForward={() => onFastForward(branchMenu.branch)}
            onPull={() => onPull(branchMenu.branch)}
            onPush={() => onPush(branchMenu.branch)}
            onCheckout={() => onCheckout(branchMenu.branch)}
            onRename={() => onRename(branchMenu.branch)}
            onDelete={() => onDelete(branchMenu.branch)}
            onCopyName={() => onCopyName(branchMenu.branch)}
            onCreateFrom={() => onCreateFrom(branchMenu.branch)}
            onClose={onCloseBranchMenu}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {remoteBranchMenu && (
          <RemoteBranchContextMenu
            x={remoteBranchMenu.x}
            y={remoteBranchMenu.y}
            branch={remoteBranchMenu.branch}
            onCheckout={() => onCheckout(remoteBranchMenu.branch)}
            onCopyName={() => onCopyName(remoteBranchMenu.branch)}
            onCreateFrom={() => onCreateFrom(remoteBranchMenu.branch)}
            onClose={onCloseRemoteBranchMenu}
          />
        )}
      </AnimatePresence>
    </>
  );
}
