'use client';

import {
  AlertCircle, AlertTriangle, Archive, FileText, Folder,
  Layers, Loader2, RotateCcw, Trash2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useT } from '@/hooks/use-translation';
import type { Commit } from '@/lib/git-store';

/* ──────────────────────────────────────────────────────────────────────────
   1. CHECKOUT CONFLICT MODAL
   ────────────────────────────────────────────────────────────────────────── */

interface CheckoutConflictModalProps {
  checkoutConflict: { branch: string; error: string } | null;
  onClose: () => void;
  onStashAndSwitch: (branch: string) => Promise<void> | void;
  isLoading: boolean;
}

export function CheckoutConflictModal({
  checkoutConflict,
  onClose,
  onStashAndSwitch,
  isLoading,
}: CheckoutConflictModalProps) {
  const t = useT();

  return (
    <AnimatePresence>
      {checkoutConflict && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass-overlay rounded-xl shadow-2xl p-6 w-[580px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle size={22} className="text-git-mod shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-text-primary mb-1">{t('checkoutConflict.title')}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t('checkoutConflict.desc', { branch: checkoutConflict.branch })}
                </p>
              </div>
            </div>

            <div className="bg-bg-base border border-border-subtle/15 rounded p-3 mb-4 text-[11px] font-mono text-text-secondary/70 max-h-32 overflow-y-auto">
              {checkoutConflict.error}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                {t('modal.cancel')}
              </button>
              <button
                onClick={() => onStashAndSwitch(checkoutConflict.branch)}
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded flex items-center gap-2"
              >
                <Archive size={14} />
                {t('checkoutConflict.stashAndSwitch')}
              </button>
            </div>
            <p className="text-[10px] text-text-secondary/70 mt-3 text-center">
              {t('checkoutConflict.stashAndSwitchDesc')}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   2. RESET ALL CONFIRMATION DIALOG
   ────────────────────────────────────────────────────────────────────────── */

interface ResetAllConfirmDialogProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isLoading: boolean;
}

export function ResetAllConfirmDialog({
  show,
  onClose,
  onConfirm,
  isLoading,
}: ResetAllConfirmDialogProps) {
  const t = useT();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 glass-alert-error rounded-lg shadow-2xl px-4 py-3 flex items-center gap-4 max-w-2xl"
        >
          <AlertCircle size={20} className="text-[#ffdad6] shrink-0" />
          <span className="text-sm text-[#ffdad6]">
            {t('resetAll.warning')}
          </span>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="shrink-0 px-3 py-1.5 text-xs font-bold bg-error hover:bg-[#ff8a86] text-white rounded transition-colors disabled:opacity-50"
          >
            {t('resetAll.button')}
          </button>
          <button
            onClick={onClose}
            className="shrink-0 px-3 py-1.5 text-xs font-medium text-[#ffdad6] hover:text-white"
          >
            {t('modal.cancel')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   3. CLEAN UNTRACKED MODAL
   ────────────────────────────────────────────────────────────────────────── */

interface CleanUntrackedModalProps {
  show: boolean;
  onClose: () => void;
  cleanableFiles: string[];
  selectedCleanFiles: Set<string>;
  setSelectedCleanFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
  onClean: () => Promise<void> | void;
  cleanModalLoading: boolean;
}

export function CleanUntrackedModal({
  show,
  onClose,
  cleanableFiles,
  selectedCleanFiles,
  setSelectedCleanFiles,
  onClean,
  cleanModalLoading,
}: CleanUntrackedModalProps) {
  const t = useT();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="glass-overlay rounded-xl shadow-2xl p-6 w-[min(calc(100vw-2rem),620px)] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-[#ffd98a] flex items-center gap-2">
                  <Trash2 size={16} /> {t('cleanModal.title')}
                </h3>
                <p className="text-xs text-text-secondary mt-1">{t('cleanModal.desc')}</p>
              </div>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>

            <div className="flex items-start gap-2 p-3 rounded bg-[#f4b942]/10 border border-[#f4b942]/30 text-[#ffd98a] mb-4">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed font-semibold">{t('cleanModal.warning')}</p>
            </div>

            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[11px] text-text-secondary font-bold uppercase tracking-wider">
                {t('cleanModal.selectedCount', { count: selectedCleanFiles.size })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCleanFiles(new Set(cleanableFiles.filter((filePath) => !filePath.endsWith('/'))))}
                  disabled={cleanModalLoading || cleanableFiles.length === 0}
                  className="text-[10px] text-secondary hover:text-[#052900] px-2 py-0.5 rounded border border-secondary/40 hover:bg-secondary transition-colors disabled:opacity-40"
                >
                  {t('cleanModal.selectFiles')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCleanFiles(new Set())}
                  disabled={cleanModalLoading || cleanableFiles.length === 0}
                  className="text-[10px] text-text-secondary hover:text-bg-base px-2 py-0.5 rounded border border-[#9eacc0]/40 hover:bg-[#9eacc0] transition-colors disabled:opacity-40"
                >
                  {t('cleanModal.selectNone')}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[180px] overflow-y-auto rounded border border-border-subtle/15 bg-bg-base/70 p-1">
              {cleanModalLoading && cleanableFiles.length === 0 ? (
                <div className="h-full min-h-[170px] flex flex-col items-center justify-center text-text-secondary gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  <p className="text-xs">{t('cleanModal.loading')}</p>
                </div>
              ) : cleanableFiles.length === 0 ? (
                <div className="h-full min-h-[170px] flex items-center justify-center text-xs text-text-secondary">
                  {t('cleanModal.empty')}
                </div>
              ) : (
                cleanableFiles.map((filePath) => {
                  const checked = selectedCleanFiles.has(filePath);
                  return (
                    <label
                      key={filePath}
                      className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-border-subtle/35 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedCleanFiles((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(filePath);
                            else next.delete(filePath);
                            return next;
                          });
                        }}
                        className="accent-[#f4b942] shrink-0"
                      />
                      {filePath.endsWith('/') ? (
                        <Folder size={13} className="text-[#ffd98a] shrink-0" />
                      ) : (
                        <FileText size={13} className="text-text-secondary shrink-0" />
                      )}
                      <span className="text-xs text-text-primary font-mono truncate">{filePath}</span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                {t('modal.cancel')}
              </button>
              <button
                onClick={onClean}
                disabled={cleanModalLoading || selectedCleanFiles.size === 0}
                className="px-4 py-2 bg-gradient-to-br from-[#dc6a6a] to-[#b34f4f] hover:from-[#e57979] hover:to-[#9f3e3e] shadow-lg shadow-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded flex items-center gap-2"
              >
                {cleanModalLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {cleanModalLoading ? t('cleanModal.cleaning') : t('cleanModal.cleanSelected')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   4. AMEND LAST COMMIT MODAL
   ────────────────────────────────────────────────────────────────────────── */

interface AmendLastCommitModalProps {
  show: boolean;
  onClose: () => void;
  lastCommitMessage: string;
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onConfirm: () => Promise<void> | void;
  isLoading: boolean;
  hasCommits: boolean;
}

export function AmendLastCommitModal({
  show,
  onClose,
  lastCommitMessage,
  newMessage,
  setNewMessage,
  onConfirm,
  isLoading,
  hasCommits,
}: AmendLastCommitModalProps) {
  const t = useT();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-overlay rounded-xl shadow-2xl p-6 w-[580px] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-git-mod flex items-center gap-2 text-base">
                <RotateCcw size={16} /> {t('amend.title')}
              </h3>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-3">{t('amend.desc')}</p>
            <div className="bg-git-mod/10 border border-git-mod/30 rounded p-2 text-xs text-[#ffd89e] mb-4">
              {t('amend.warning')}
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary block mb-1">
                  {t('amend.currentMessage')}
                </label>
                <div className="bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-sm text-text-secondary font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                  {lastCommitMessage}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary block mb-1">
                  {t('amend.newMessage')}
                </label>
                <textarea
                  autoFocus
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={lastCommitMessage || ''}
                  className="w-full bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-sm text-text-primary h-24 focus:outline-none focus:border-git-mod/40 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 shrink-0">
              <button
                onClick={onConfirm}
                disabled={isLoading || !hasCommits}
                className="flex-1 py-2 bg-gradient-to-br from-[#fd9d1a] to-[#c87d10] hover:from-[#feab33] hover:to-[#d68f1f] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-[#2a1500] rounded transition-colors"
              >
                {isLoading ? '...' : t('amend.button')}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-bg-base/70 border border-border-subtle/30 hover:text-text-primary text-sm text-text-secondary rounded transition-colors"
              >
                {t('amend.cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   5. SQUASH COMMITS MODAL
   ────────────────────────────────────────────────────────────────────────── */

interface SquashCommitsModalProps {
  show: boolean;
  onClose: () => void;
  commits: Commit[];
  squashN: number;
  setSquashN: (n: number) => void;
  squashMessage: string;
  setSquashMessage: (msg: string) => void;
  onConfirm: () => Promise<void> | void;
  isLoading: boolean;
}

export function SquashCommitsModal({
  show,
  onClose,
  commits,
  squashN,
  setSquashN,
  squashMessage,
  setSquashMessage,
  onConfirm,
  isLoading,
}: SquashCommitsModalProps) {
  const t = useT();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-overlay rounded-xl shadow-2xl p-6 w-[580px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-git-mod flex items-center gap-2 text-base">
                <Layers size={16} /> {t('page.modals.squash.title')}
              </h3>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <div className="bg-git-mod/10 border border-git-mod/30 rounded p-2 text-xs text-[#ffd89e] mb-4">
              {t('page.modals.squash.warning')}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary block mb-2">
                  {t('page.modals.squash.lastCommits')}
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSquashN(n)}
                      className={cn(
                        'flex-1 py-2 rounded border text-sm font-bold transition-colors',
                        squashN === n
                          ? 'bg-git-mod/15 border-[#fd9d1a]/50 text-git-mod'
                          : 'bg-bg-base/70 border-border-subtle/30 text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-2 bg-bg-base/70 border border-border-subtle/15 rounded p-2 max-h-32 overflow-y-auto">
                  {commits.slice(0, squashN).map((c, i) => (
                    <div key={c.hash} className="flex items-center gap-2 py-0.5 text-xs">
                      <span className="font-mono text-text-secondary/70 shrink-0">{c.shortHash}</span>
                      <span className={cn('truncate', i === 0 ? 'text-text-primary' : 'text-text-secondary')}>
                        {c.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary block mb-1">
                  {t('page.modals.squash.newMessage')}
                </label>
                <textarea
                  autoFocus
                  value={squashMessage}
                  onChange={(e) => setSquashMessage(e.target.value)}
                  placeholder={commits[0]?.message ?? ''}
                  className="w-full bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-sm text-text-primary h-20 focus:outline-none focus:border-git-mod/40 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={onConfirm}
                disabled={isLoading || commits.length < 2}
                className="flex-1 py-2 bg-gradient-to-br from-[#fd9d1a] to-[#c87d10] hover:from-[#feab33] hover:to-[#d68f1f] disabled:opacity-40 text-sm font-bold text-[#2a1500] rounded transition-colors"
              >
                {isLoading ? '...' : t('page.modals.squash.button', { n: squashN })}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-bg-base/70 border border-border-subtle/30 hover:text-text-primary text-sm text-text-secondary rounded transition-colors"
              >
                {t('modal.cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
