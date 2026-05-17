'use client';

import { motion } from 'motion/react';
import { useT } from '@/hooks/use-translation';
import type { GitFile } from '@/lib/git-store';

export function ContextMenuItem({
  onClick, text, textSecondary,
}: { onClick: () => void; text: string; textSecondary?: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center justify-between px-4 py-1.5 text-sm text-left hover:bg-[#a3f185]/20 text-[#d9e7fc] hover:text-[#a3f185] transition-colors"
    >
      <span className="text-left">{text}</span>
      {textSecondary && <span className="text-[10px] opacity-50 ml-4 shrink-0">{textSecondary}</span>}
    </button>
  );
}

export function CommitContextMenu({
  x, y, onMerge, onRevert, onCheckout, onCreateBranch, onCherryPick, onCopySha, onClose,
}: {
  x: number; y: number;
  onMerge: () => void; onRevert: () => void; onCheckout: () => void;
  onCreateBranch: () => void; onCherryPick: () => void; onCopySha: () => void; onClose: () => void;
}) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="fixed bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-lg shadow-2xl py-1 z-[100] w-64"
      style={{ left: x, top: y }}
    >
      <ContextMenuItem onClick={onMerge} text="Merge into current branch" />
      <ContextMenuItem onClick={onCherryPick} text={t('commitMenu.cherryPick')} />
      <ContextMenuItem onClick={onRevert} text="Revert commit" />
      <div className="h-px bg-[#3c495a] my-1" />
      <ContextMenuItem onClick={onCheckout} text="Checkout" />
      <ContextMenuItem onClick={onCreateBranch} text="Create branch here" />
      <div className="h-px bg-[#3c495a] my-1" />
      <ContextMenuItem onClick={onCopySha} text="Copy commit SHA" textSecondary="Ctrl+C" />
      <ContextMenuItem onClick={onClose} text="Cerrar" />
    </motion.div>
  );
}

export function BranchContextMenu({
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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="fixed bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-lg shadow-2xl py-1 z-[100] w-72"
      style={{ left: x, top: y }}
    >
      <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-[#697789] border-b border-[#3c495a]/15 truncate">{branch}</div>
      {!isCurrent && <ContextMenuItem onClick={onMerge} text={`Merge "${branch}" en "${currentBranch}"`} />}
      {!isCurrent && <ContextMenuItem onClick={onRebase} text={`Rebase "${currentBranch}" sobre "${branch}"`} />}
      {!isCurrent && tracking?.upstream && tracking.behind > 0 && tracking.ahead === 0 && (
        <ContextMenuItem onClick={onFastForward} text={`Fast-forward a origin/${branch}`} textSecondary={`↓${tracking.behind}`} />
      )}
      {!isCurrent && <div className="h-px bg-[#3c495a]/15 my-1" />}
      <ContextMenuItem onClick={onCheckout} text={isCurrent ? '(branch actual)' : 'Checkout (cambiar a esta)'} />
      <div className="h-px bg-[#3c495a]/15 my-1" />
      <ContextMenuItem onClick={onPull} text="Pull" textSecondary={canPull ? `↓${tracking?.behind}` : hasUpstream ? '✓' : '—'} />
      <ContextMenuItem onClick={onPush} text="Push" textSecondary={canPush ? `↑${tracking?.ahead}` : hasUpstream ? '✓' : '—'} />
      <div className="h-px bg-[#3c495a]/15 my-1" />
      <ContextMenuItem onClick={onCreateFrom} text="Crear nueva branch desde acá" />
      <ContextMenuItem onClick={onRename} text="Renombrar..." />
      {!isCurrent && <ContextMenuItem onClick={onDelete} text="Eliminar" />}
      <div className="h-px bg-[#3c495a]/15 my-1" />
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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="fixed bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-lg shadow-2xl py-1 z-[100] w-60"
      style={{ left: x, top: y }}
    >
      <ContextMenuItem onClick={onStage} text={file.staged ? 'Unstage' : 'Stage'} />
      <ContextMenuItem onClick={onIgnore} text="Agregar a .gitignore" />
      <ContextMenuItem onClick={onStashFile} text="Stashear este archivo" />
      <div className="h-px bg-[#3c495a]/20 my-1" />
      <ContextMenuItem onClick={onOpenInEditor} text="Abrir en editor" />
      <ContextMenuItem onClick={onShowInFolder} text="Mostrar en carpeta" />
      <ContextMenuItem onClick={onCopyPath} text="Copiar path" textSecondary="Ctrl+C" />
      <div className="h-px bg-[#3c495a]/20 my-1" />
      <ContextMenuItem onClick={onDiscard} text="Descartar cambios" />
      <ContextMenuItem onClick={onDelete} text="Eliminar archivo" />
      <div className="h-px bg-[#3c495a]/20 my-1" />
      <ContextMenuItem onClick={onClose} text="Cerrar" />
    </motion.div>
  );
}
