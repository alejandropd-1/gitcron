'use client';

import { useState, useEffect, useRef } from 'react';
import {
  AlertCircle, AlertTriangle, Archive, FileText, Folder,
  GitBranch, GitMerge, Layers, Loader2, Plus, RotateCcw, Tag, Trash2, Upload, X,
  FolderOpen, Github, Globe, Link2, TreePine, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { isValidExistingGitHubRemoteUrl } from '@/lib/github-remote-url';
import { useT } from '@/hooks/use-translation';
import type { Commit } from '@/lib/git-store';

/* ──────────────────────────────────────────────────────────────────────────
   SHARED MODAL SHELL — backdrop + centered glass panel + click-outside/stop.
   Used by the lightweight modals below so the overlay scaffold lives once.
   ────────────────────────────────────────────────────────────────────────── */

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  panelClassName: string;
  backdropClassName?: string;
  children: React.ReactNode;
}

function ModalShell({ open, onClose, panelClassName, backdropClassName, children }: ModalShellProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className={backdropClassName ?? 'fixed inset-0 bg-black/60 flex items-center justify-center z-[100]'}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={panelClassName}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          role="alertdialog"
          aria-modal="false"
          aria-labelledby="reset-all-title"
          aria-describedby="reset-all-description"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[310] glass-alert-error rounded-lg shadow-2xl px-4 py-3 flex items-start gap-3 w-[min(calc(100vw-2rem),760px)]"
        >
          <AlertCircle size={20} className="text-[#ffdad6] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p id="reset-all-title" className="text-sm font-bold text-[#ffdad6]">
              {t('resetAll.title')}
            </p>
            <p id="reset-all-description" className="text-xs text-[#ffdad6]/90 mt-0.5 leading-snug">
              {t('resetAll.warning')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#ffdad6] hover:text-white rounded transition-colors"
            >
              {t('modal.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-bold bg-error hover:bg-[#ff8a86] text-white rounded transition-colors disabled:opacity-50"
            >
              {t('resetAll.button')}
            </button>
          </div>
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

/* ──────────────────────────────────────────────────────────────────────────
   6. NEW BRANCH MODAL
   ────────────────────────────────────────────────────────────────────────── */

interface NewBranchModalProps {
  show: boolean;
  onClose: () => void;
  branchName: string;
  onBranchNameChange: (name: string) => void;
  branchFrom?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onCreate: () => void;
  isLoading: boolean;
}

export function NewBranchModal({
  show,
  onClose,
  branchName,
  onBranchNameChange,
  branchFrom,
  inputRef,
  onCreate,
  isLoading,
}: NewBranchModalProps) {
  const t = useT();

  return (
    <ModalShell open={show} onClose={onClose} panelClassName="glass-overlay rounded-xl shadow-2xl p-6 w-[420px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-secondary flex items-center gap-2"><GitBranch size={16} /> {t('newBranch.title')}</h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
      </div>
      {branchFrom && (
        <p className="text-xs text-text-secondary mb-3">
          {t('newBranch.fromCommit')} <span className="font-mono text-secondary">{branchFrom.slice(0, 7)}</span>
        </p>
      )}
      <input
        ref={inputRef}
        value={branchName}
        onChange={(e) => onBranchNameChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); if (e.key === 'Escape') onClose(); }}
        placeholder={t('newBranch.namePlaceholder')}
        className="w-full bg-bg-base/70 border border-border-subtle/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary/50 mb-4"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">{t('modal.cancel')}</button>
        <button
          onClick={onCreate}
          disabled={!branchName.trim() || isLoading}
          className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded"
        >
          <Plus size={14} className="inline mr-1" /> {t('modal.create')}
        </button>
      </div>
    </ModalShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   7. CREATE TAG MODAL
   ────────────────────────────────────────────────────────────────────────── */

interface CreateTagModalProps {
  commitHash?: string;
  onClose: () => void;
  tagName: string;
  onTagNameChange: (name: string) => void;
  tagMessage: string;
  onTagMessageChange: (msg: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onCreate: () => void;
  isLoading: boolean;
}

export function CreateTagModal({
  commitHash,
  onClose,
  tagName,
  onTagNameChange,
  tagMessage,
  onTagMessageChange,
  inputRef,
  onCreate,
  isLoading,
}: CreateTagModalProps) {
  const t = useT();
  const shortHash = commitHash ? commitHash.slice(0, 7) : '';

  return (
    <ModalShell open={!!commitHash} onClose={onClose} panelClassName="glass-overlay rounded-xl shadow-2xl p-6 w-[420px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-secondary flex items-center gap-2"><Tag size={16} /> {t('createTag.title')}</h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
      </div>
      <p className="text-xs text-text-secondary mb-3">
        {t('newBranch.fromCommit')} <span className="font-mono text-secondary">{shortHash}</span>
      </p>
      <div className="flex flex-col gap-3 mb-4">
        <div>
          <label className="text-xs text-text-secondary block mb-1">{t('createTag.nameLabel')}</label>
          <input
            ref={inputRef}
            value={tagName}
            onChange={(e) => onTagNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); if (e.key === 'Escape') onClose(); }}
            placeholder="v1.0.0"
            className="w-full bg-bg-base/70 border border-border-subtle/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary/50"
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-1">{t('createTag.msgLabel')}</label>
          <input
            value={tagMessage}
            onChange={(e) => onTagMessageChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); if (e.key === 'Escape') onClose(); }}
            placeholder="Release v1.0.0"
            className="w-full bg-bg-base/70 border border-border-subtle/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary/50"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">{t('modal.cancel')}</button>
        <button
          onClick={onCreate}
          disabled={!tagName.trim() || isLoading}
          className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded"
        >
          <Plus size={14} className="inline mr-1" /> {t('createTag.button')}
        </button>
      </div>
    </ModalShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   8. MERGE: NEEDS CHECKOUT TO TARGET BRANCH FIRST
   ────────────────────────────────────────────────────────────────────────── */

interface MergeNeedsCheckoutModalProps {
  mergeNeedsCheckout: { sourceBranch: string; targetBranch: string } | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading: boolean;
}

export function MergeNeedsCheckoutModal({
  mergeNeedsCheckout,
  onClose,
  onConfirm,
  isLoading,
}: MergeNeedsCheckoutModalProps) {
  const t = useT();
  const targetBranch = mergeNeedsCheckout?.targetBranch ?? '';
  const sourceBranch = mergeNeedsCheckout?.sourceBranch ?? '';

  return (
    <ModalShell open={!!mergeNeedsCheckout} onClose={onClose} panelClassName="glass-overlay rounded-xl shadow-2xl p-6 w-[580px]">
      <div className="flex items-start gap-3 mb-4">
        <GitMerge size={22} className="text-secondary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-text-primary mb-1">{t('mergeCheckout.title', { branch: targetBranch })}</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('mergeCheckout.desc', { src: sourceBranch, dst: targetBranch })}
          </p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
        >
          {t('modal.cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded flex items-center gap-2"
        >
          <GitMerge size={14} />
          {t('mergeCheckout.button', { branch: targetBranch })}
        </button>
      </div>
    </ModalShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   9. RENAME BRANCH MODAL
   ────────────────────────────────────────────────────────────────────────── */

interface RenameBranchModalProps {
  renameModal: { oldName: string; newName: string } | null;
  onClose: () => void;
  onNewNameChange: (name: string) => void;
  onConfirm: () => void | Promise<void>;
  isLoading: boolean;
}

export function RenameBranchModal({
  renameModal,
  onClose,
  onNewNameChange,
  onConfirm,
  isLoading,
}: RenameBranchModalProps) {
  const t = useT();
  const oldName = renameModal?.oldName ?? '';
  const newName = renameModal?.newName ?? '';

  return (
    <ModalShell open={!!renameModal} onClose={onClose} panelClassName="glass-overlay rounded-xl shadow-2xl p-6 w-[420px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-secondary flex items-center gap-2"><GitBranch size={16} /> {t('rename.title')}</h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
      </div>
      <p className="text-xs text-text-secondary mb-2">{t('rename.renaming')}</p>
      <p className="text-sm text-text-primary font-mono bg-bg-base px-3 py-1.5 rounded mb-3">{oldName}</p>
      <input
        autoFocus
        value={newName}
        onChange={(e) => onNewNameChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder={t('rename.newName')}
        className="w-full bg-bg-base border border-border-subtle/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary/50 mb-4"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">{t('modal.cancel')}</button>
        <button
          onClick={onConfirm}
          disabled={!newName.trim() || newName === oldName || isLoading}
          className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded"
        >
          {t('rename.button')}
        </button>
      </div>
    </ModalShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   10. FORCE PUSH CONFIRM MODAL
   ────────────────────────────────────────────────────────────────────────── */

interface ForcePushConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ForcePushConfirmModal({
  open,
  onCancel,
  onConfirm,
}: ForcePushConfirmModalProps) {
  const t = useT();

  return (
    <ModalShell
      open={open}
      onClose={onCancel}
      backdropClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-[300]"
      panelClassName="bg-[#152335]/98 backdrop-blur-xl border border-[#ffa8a3]/20 rounded-2xl p-6 w-[480px]"
    >
      <div className="flex items-start gap-4 mb-5">
        <div className="p-3 bg-[#9f0519]/25 rounded-xl border border-[#9f0519]/40 text-[#ff8b87] shrink-0">
          <AlertCircle size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-lg text-[#ffdad6] mb-2 tracking-tight">{t('page.modals.forcePush.title')}</h3>
          <p className="text-sm text-[#ccdbe8] leading-relaxed mb-3">
            {t('page.modals.forcePush.desc')}
          </p>
          <div className="bg-bg-base/80 border border-border-subtle/25 rounded-xl p-3 mb-1">
            <p className="text-[11px] text-[#ff8b87] uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
              {t('page.modals.forcePush.warningTitle')}
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t('page.modals.forcePush.warningDesc')}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-[#1a2e44]/50 rounded-xl transition duration-200"
        >
          {t('modal.cancel')}
        </button>
        <button
          onClick={onConfirm}
          className="px-5 py-2.5 bg-gradient-to-br from-[#ff8b87] to-[#d63a35] hover:from-[#ff9f9c] hover:to-[#e64742] shadow-lg shadow-[#d63a35]/20 text-[#fff0ef] text-sm font-bold rounded-xl transition duration-200"
        >
          {t('page.modals.forcePush.confirmBtn')}
        </button>
      </div>
    </ModalShell>
  );
}

interface InitializeRepoGuardModalProps {
  pendingRepo: { path: string; name: string; isInitialized?: boolean } | null;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  onConfirmRemote: (
    remoteUrl: string,
    onProgress?: (progress: 'validating' | 'initializing' | 'linking' | 'recovering') => void,
  ) => Promise<{
    success: boolean;
    error?: string;
    code?: 'invalid-remote-url' | 'remote-add-failed' | 'remote-check-failed' | 'remote-has-history' | 'first-push-failed' | 'remote-adopt-failed';
    authRequired?: boolean;
    localRepoReady?: boolean;
    retryable?: boolean;
  }> | {
    success: boolean;
    error?: string;
    code?: 'invalid-remote-url' | 'remote-add-failed' | 'remote-check-failed' | 'remote-has-history' | 'first-push-failed' | 'remote-adopt-failed';
    authRequired?: boolean;
    localRepoReady?: boolean;
    retryable?: boolean;
  };
  onAdoptRemote: (
    remoteUrl: string,
    onProgress?: (progress: 'validating' | 'initializing' | 'linking' | 'recovering') => void,
  ) => Promise<{
    success: boolean;
    error?: string;
    code?: 'invalid-remote-url' | 'remote-add-failed' | 'remote-check-failed' | 'remote-has-history' | 'first-push-failed' | 'remote-adopt-failed';
    authRequired?: boolean;
  }> | {
    success: boolean;
    error?: string;
    code?: 'invalid-remote-url' | 'remote-add-failed' | 'remote-check-failed' | 'remote-has-history' | 'first-push-failed' | 'remote-adopt-failed';
    authRequired?: boolean;
  };
  isLoading: boolean;
}

export function InitializeRepoGuardModal({
  pendingRepo,
  onCancel,
  onConfirm,
  onConfirmRemote,
  onAdoptRemote,
  isLoading,
}: InitializeRepoGuardModalProps) {
  const t = useT();
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteHasHistory, setRemoteHasHistory] = useState(false);
  const [remoteProgress, setRemoteProgress] = useState<'validating' | 'initializing' | 'linking' | 'recovering' | null>(null);

  useEffect(() => {
    if (pendingRepo) {
      setRemoteOpen(false);
      setRemoteUrl('');
      setRemoteError(null);
      setRemoteHasHistory(false);
      setRemoteProgress(null);
    }
  }, [pendingRepo?.path]);

  const isBusy = isLoading || remoteProgress !== null;
  const remoteProgressLabel = remoteProgress ? t(`initGuard.progress.${remoteProgress}`) : null;

  const readableRemoteError = (result: {
    code?: 'invalid-remote-url' | 'remote-add-failed' | 'remote-check-failed' | 'remote-has-history' | 'first-push-failed' | 'remote-adopt-failed';
    authRequired?: boolean;
    localRepoReady?: boolean;
  }) => {
    if (result.code === 'invalid-remote-url') return t('initGuard.remoteError.invalidUrl');
    if (result.code === 'remote-add-failed') return t('initGuard.remoteError.addRemote');
    if (result.code === 'remote-check-failed') return t('initGuard.remoteError.check');
    if (result.code === 'remote-adopt-failed') return t('initGuard.remoteError.adopt');
    if (result.authRequired) return t('initGuard.remoteError.auth');
    if (result.code === 'remote-has-history') return t('initGuard.remoteHistory.desc');
    if (result.code === 'first-push-failed') {
      return result.localRepoReady
        ? t('initGuard.remoteError.pushLocalReady')
        : t('initGuard.remoteError.push');
    }
    return t('initGuard.remoteError.generic');
  };

  const handleRemoteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUrl = remoteUrl.trim();
    setRemoteError(null);
    setRemoteHasHistory(false);
    if (!isValidExistingGitHubRemoteUrl(trimmedUrl)) {
      setRemoteError(t('initGuard.remoteError.invalidUrl'));
      return;
    }
    setRemoteProgress('validating');
    const result = await onConfirmRemote(trimmedUrl, setRemoteProgress);
    if (!result.success) {
      setRemoteProgress(null);
      if (result.code === 'remote-has-history') {
        setRemoteHasHistory(true);
        return;
      }
      setRemoteError(readableRemoteError(result));
    }
  };

  const handleAdoptRemote = async () => {
    setRemoteError(null);
    const result = await onAdoptRemote(remoteUrl.trim(), setRemoteProgress);
    if (!result.success) {
      setRemoteProgress(null);
      setRemoteError(readableRemoteError(result));
    }
  };

  return (
    <ModalShell
      open={!!pendingRepo}
      onClose={onCancel}
      backdropClassName="fixed inset-0 bg-black/65 flex items-center justify-center z-[220] px-4"
      panelClassName="glass-overlay rounded-xl shadow-2xl w-[min(calc(100vw-2rem),540px)] overflow-hidden border border-secondary/25"
    >
      <div className="h-2 bg-gradient-to-r from-secondary via-primary to-[#ffd98a]" />
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-lg border border-secondary/35 bg-secondary/12 p-3 text-secondary shadow-lg shadow-secondary/10">
            <GitBranch size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-extrabold text-text-primary">
              {t('initGuard.title')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {t('initGuard.desc', { name: pendingRepo?.name ?? '' })}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded p-1 text-text-secondary hover:text-text-primary"
            aria-label={t('modal.close')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 rounded border border-border-subtle/20 bg-bg-base/75 p-3">
          <p className="mb-1 text-[10px] font-bold uppercase text-text-secondary">
            {t('initGuard.pathLabel')}
          </p>
          <p className="select-text break-all font-mono text-xs text-text-primary">
            {pendingRepo?.path ?? ''}
          </p>
        </div>

        {pendingRepo?.isInitialized && (
          <div className="mt-4 rounded border border-secondary/25 bg-secondary/10 p-3 text-xs leading-relaxed text-text-secondary">
            {t('initGuard.localReady')}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="flex min-h-[72px] items-center gap-3 rounded border border-secondary/25 bg-secondary/10 p-3 text-left transition-colors hover:border-secondary/45 hover:bg-secondary/15 disabled:opacity-50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded bg-secondary/15 text-secondary">
              {isBusy && !remoteProgress ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-text-primary">{t('initGuard.localAction')}</span>
              <span className="mt-1 block text-xs leading-snug text-text-secondary">{t('initGuard.localDesc')}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRemoteOpen(true);
              setRemoteError(null);
            }}
            disabled={isBusy}
            className="flex min-h-[72px] items-center gap-3 rounded border border-primary/25 bg-primary/10 p-3 text-left transition-colors hover:border-primary/45 hover:bg-primary/15 disabled:opacity-50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded bg-primary/15 text-primary">
              <Link2 size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-text-primary">{t('initGuard.remoteAction')}</span>
              <span className="mt-1 block text-xs leading-snug text-text-secondary">{t('initGuard.remoteDesc')}</span>
            </span>
          </button>
        </div>

        {remoteOpen && (
          <form onSubmit={handleRemoteSubmit} className="mt-4 rounded border border-border-subtle/20 bg-bg-base/55 p-3">
            <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
              {t('initGuard.remoteUrlLabel')}
            </label>
            <input
              autoFocus
              value={remoteUrl}
              onChange={(event) => {
                setRemoteUrl(event.target.value);
                if (remoteError) setRemoteError(null);
                if (remoteHasHistory) setRemoteHasHistory(false);
              }}
              placeholder={t('initGuard.remoteUrlPlaceholder')}
              disabled={isBusy}
              className="h-10 w-full rounded border border-border-subtle/25 bg-bg-base/90 px-3 font-mono text-xs text-text-primary outline-none transition-colors placeholder:text-text-secondary/55 focus:border-primary/60 disabled:opacity-60"
            />
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              {t('initGuard.remoteUrlHint')}
            </p>
            {remoteProgressLabel && (
              <div className="mt-3 flex items-center gap-2 rounded border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-text-primary">
                <Loader2 size={14} className="animate-spin text-primary" />
                {remoteProgressLabel}
              </div>
            )}
            {remoteError && (
              <div className="mt-3 flex items-start gap-2 rounded border border-[#ff8b87]/25 bg-[#9f0519]/15 px-3 py-2 text-xs leading-relaxed text-[#ffdad6]">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-[#ff8b87]" />
                <span>{remoteError}</span>
              </div>
            )}
            {remoteHasHistory && (
              <div className="mt-3 rounded border border-[#ffd98a]/30 bg-[#ffd98a]/10 p-3">
                <div className="flex items-start gap-2 text-xs leading-relaxed text-text-primary">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-[#ffd98a]" />
                  <div>
                    <p className="font-bold">{t('initGuard.remoteHistory.title')}</p>
                    <p className="mt-1 text-text-secondary">{t('initGuard.remoteHistory.desc')}</p>
                    <p className="mt-2 text-[11px] text-text-secondary">
                      {pendingRepo?.isInitialized
                        ? t('initGuard.remoteHistory.backup')
                        : t('initGuard.remoteHistory.files')}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAdoptRemote}
                    disabled={isBusy}
                    className="flex items-center gap-2 rounded border border-[#ffd98a]/35 bg-[#ffd98a]/15 px-4 py-2 text-sm font-bold text-[#ffe8ad] transition-colors hover:bg-[#ffd98a]/20 disabled:opacity-50"
                  >
                    <GitBranch size={14} />
                    {t('initGuard.remoteHistory.action')}
                  </button>
                </div>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={isBusy || !remoteUrl.trim()}
                className="flex items-center gap-2 rounded bg-gradient-to-br from-primary to-secondary px-4 py-2 text-sm font-bold text-bg-base shadow-lg shadow-primary/15 transition-colors hover:brightness-110 disabled:opacity-50"
              >
                {remoteProgress ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                {remoteProgress ? t('initGuard.remoteWorking') : t('initGuard.remoteConfirm')}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
          >
            {t('modal.cancel')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   11. PUBLISH REPOSITORY (MISSING REMOTE)
   ────────────────────────────────────────────────────────────────────────── */

type PublishResult = { success: boolean; error?: string };

interface PublishRepositoryModalProps {
  show: boolean;
  repoName: string;
  githubConnected: boolean;
  isLoading: boolean;
  onClose: () => void;
  onCreateGitHub: () => Promise<PublishResult>;
  onLinkExisting: (url: string) => Promise<PublishResult>;
  onConnectGitHub: () => void;
}

export function PublishRepositoryModal({
  show,
  repoName,
  githubConnected,
  isLoading,
  onClose,
  onCreateGitHub,
  onLinkExisting,
  onConnectGitHub,
}: PublishRepositoryModalProps) {
  const t = useT();
  const [mode, setMode] = useState<'choose' | 'link'>('choose');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetAndClose = () => {
    setMode('choose');
    setUrl('');
    setError(null);
    onClose();
  };

  const handleCreate = async () => {
    setError(null);
    const result = await onCreateGitHub();
    if (result.success) {
      resetAndClose();
      return;
    }
    setError(result.error ?? t('publishRemote.errorGeneric'));
  };

  const handleLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUrl = url.trim();
    if (!isValidExistingGitHubRemoteUrl(trimmedUrl)) {
      setError(t('publishRemote.errorInvalidUrl'));
      return;
    }
    setError(null);
    const result = await onLinkExisting(trimmedUrl);
    if (result.success) {
      resetAndClose();
      return;
    }
    setError(result.error ?? t('publishRemote.errorGeneric'));
  };

  return (
    <ModalShell open={show} onClose={resetAndClose} panelClassName="glass-overlay rounded-xl shadow-2xl p-6 w-[min(calc(100vw-2rem),600px)]">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <Upload size={18} className="text-secondary" />
            {t('publishRemote.title')}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            {t('publishRemote.description', { repo: repoName })}
          </p>
        </div>
        <button type="button" onClick={resetAndClose} className="text-text-secondary hover:text-text-primary transition-colors" aria-label={t('modal.cancel')}>
          <X size={16} />
        </button>
      </div>

      {mode === 'choose' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isLoading || !githubConnected}
            className="rounded-lg border border-secondary/25 bg-secondary/[0.07] p-4 text-left transition-colors hover:border-secondary/55 hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Github size={18} className="mb-3 text-secondary" />
            <span className="block text-sm font-bold text-text-primary">{t('publishRemote.createTitle')}</span>
            <span className="mt-1 block text-xs leading-snug text-text-secondary">{t('publishRemote.createDesc')}</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('link'); setError(null); }}
            disabled={isLoading}
            className="rounded-lg border border-primary/25 bg-primary/[0.07] p-4 text-left transition-colors hover:border-primary/55 hover:bg-primary/10 disabled:opacity-50"
          >
            <Link2 size={18} className="mb-3 text-primary" />
            <span className="block text-sm font-bold text-text-primary">{t('publishRemote.linkTitle')}</span>
            <span className="mt-1 block text-xs leading-snug text-text-secondary">{t('publishRemote.linkDesc')}</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleLink}>
          <label htmlFor="publish-remote-url" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
            {t('publishRemote.urlLabel')}
          </label>
          <input
            id="publish-remote-url"
            autoFocus
            value={url}
            onChange={(event) => { setUrl(event.target.value); if (error) setError(null); }}
            placeholder="https://github.com/usuario/repositorio.git"
            disabled={isLoading}
            className="h-10 w-full rounded border border-border-subtle/25 bg-bg-base/90 px-3 font-mono text-xs text-text-primary outline-none transition-colors placeholder:text-text-secondary/55 focus:border-primary/60 disabled:opacity-60"
          />
          <div className="mt-3 flex justify-between gap-2">
            <button type="button" onClick={() => { setMode('choose'); setError(null); }} className="px-3 py-2 text-xs text-text-secondary hover:text-text-primary">
              {t('publishRemote.back')}
            </button>
            <button type="submit" disabled={isLoading || !url.trim()} className="flex items-center gap-2 rounded bg-gradient-to-br from-primary to-secondary px-4 py-2 text-sm font-bold text-bg-base disabled:opacity-50">
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {t('publishRemote.publish')}
            </button>
          </div>
        </form>
      )}

      {!githubConnected && mode === 'choose' && (
        <button type="button" onClick={onConnectGitHub} className="mt-4 text-xs font-semibold text-primary underline hover:text-secondary">
          {t('publishRemote.connectGitHub')}
        </button>
      )}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded border border-[#ff8b87]/25 bg-[#9f0519]/15 px-3 py-2 text-xs leading-relaxed text-[#ffdad6]" role="alert">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-[#ff8b87]" />
          <span>{error}</span>
        </div>
      )}
    </ModalShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   12. REMOTE MODALS (ADD, RENAME, SET URL)
   ────────────────────────────────────────────────────────────────────────── */

interface AddRemoteModalProps {
  show: boolean;
  onClose: () => void;
  onAdd: (name: string, url: string) => Promise<void> | void;
  isLoading: boolean;
}

export function AddRemoteModal({ show, onClose, onAdd, isLoading }: AddRemoteModalProps) {
  const t = useT();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (show) {
      setName('');
      setUrl('');
    }
  }, [show]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    onAdd(name.trim(), url.trim());
  };

  return (
    <ModalShell open={show} onClose={onClose} panelClassName="glass-overlay rounded-xl shadow-2xl p-6 w-[480px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-text-primary flex items-center gap-2">
          <Globe size={18} className="text-secondary" />
          {t('sidebar.remoteAdd')}
        </h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
            {t('remote.name')}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. upstream"
            className="h-10 w-full rounded-lg border border-border-subtle/20 bg-bg-base/80 px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/65 focus:border-secondary/55"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
            {t('remote.url')}
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            className="h-10 w-full rounded-lg border border-border-subtle/20 bg-bg-base/80 px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/65 focus:border-secondary/55 font-mono text-xs"
          />
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            {t('modal.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading || !name.trim() || !url.trim()}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-[#68b24f] px-4 text-xs font-extrabold text-[#052900] shadow-lg shadow-secondary/20 transition-colors hover:from-[#95e279] hover:to-[#4a9a31] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {t('sidebar.remoteAdd')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

interface RenameRemoteModalProps {
  remote: { name: string; fetchUrl?: string } | null;
  onClose: () => void;
  onRename: (oldName: string, newName: string) => Promise<void> | void;
  isLoading: boolean;
}

export function RenameRemoteModal({ remote, onClose, onRename, isLoading }: RenameRemoteModalProps) {
  const t = useT();
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (remote) {
      setNewName(remote.name);
    }
  }, [remote]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remote || !newName.trim() || newName.trim() === remote.name) return;
    onRename(remote.name, newName.trim());
  };

  return (
    <ModalShell open={!!remote} onClose={onClose} panelClassName="glass-overlay rounded-xl shadow-2xl p-6 w-[480px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-text-primary flex items-center gap-2">
          <Globe size={18} className="text-secondary" />
          {t('sidebar.remoteRename')}
        </h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <span className="text-xs text-text-secondary block mb-1">
            Renombrando remoto: <strong className="text-text-primary font-bold">{remote?.name}</strong>
          </span>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
            {t('remote.newName')}
          </label>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. upstream"
            className="h-10 w-full rounded-lg border border-border-subtle/20 bg-bg-base/80 px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/65 focus:border-secondary/55"
          />
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            {t('modal.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading || !newName.trim() || newName.trim() === remote?.name}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-[#68b24f] px-4 text-xs font-extrabold text-[#052900] shadow-lg shadow-secondary/20 transition-colors hover:from-[#95e279] hover:to-[#4a9a31] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {t('sidebar.remoteRename')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

interface SetRemoteUrlModalProps {
  remote: { name: string; fetchUrl?: string } | null;
  onClose: () => void;
  onSetUrl: (name: string, url: string) => Promise<void> | void;
  isLoading: boolean;
}

export function SetRemoteUrlModal({ remote, onClose, onSetUrl, isLoading }: SetRemoteUrlModalProps) {
  const t = useT();
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (remote) {
      setUrl(remote.fetchUrl || '');
    }
  }, [remote]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remote || !url.trim()) return;
    onSetUrl(remote.name, url.trim());
  };

  return (
    <ModalShell open={!!remote} onClose={onClose} panelClassName="glass-overlay rounded-xl shadow-2xl p-6 w-[480px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-text-primary flex items-center gap-2">
          <Globe size={18} className="text-secondary" />
          {t('sidebar.remoteSetUrl')}
        </h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <span className="text-xs text-text-secondary block mb-1">
            Remoto: <strong className="text-text-primary font-bold">{remote?.name}</strong>
          </span>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
            {t('remote.newUrl')}
          </label>
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            className="h-10 w-full rounded-lg border border-border-subtle/20 bg-bg-base/80 px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/65 focus:border-secondary/55 font-mono text-xs"
          />
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            {t('modal.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-[#68b24f] px-4 text-xs font-extrabold text-[#052900] shadow-lg shadow-secondary/20 transition-colors hover:from-[#95e279] hover:to-[#4a9a31] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {t('sidebar.remoteSetUrl')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   12. WORKTREE MODALS (ADD)
   ────────────────────────────────────────────────────────────────────────── */

interface NewWorktreeModalProps {
  show: boolean;
  onClose: () => void;
  onAdd: (path: string, branch: string) => Promise<void> | void;
  onPickFolder: () => Promise<string | null>;
  isLoading: boolean;
  branches: string[];
}

export function NewWorktreeModal({ show, onClose, onAdd, onPickFolder, isLoading, branches }: NewWorktreeModalProps) {
  const t = useT();
  const [folderPath, setFolderPath] = useState('');
  const [branch, setBranch] = useState('');

  useEffect(() => {
    if (show) {
      setFolderPath('');
      setBranch(branches[0] || '');
    }
  }, [show, branches]);

  const handlePickFolder = async () => {
    const picked = await onPickFolder();
    if (picked) {
      setFolderPath(picked);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPath.trim() || !branch.trim()) return;
    onAdd(folderPath.trim(), branch.trim());
  };

  return (
    <ModalShell open={show} onClose={onClose} panelClassName="glass-overlay rounded-xl shadow-2xl p-6 w-[520px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-text-primary flex items-center gap-2">
          <TreePine size={18} className="text-secondary" />
          {t('sidebar.worktreeAdd')}
        </h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
            {t('worktree.path')}
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={folderPath}
              placeholder="Click al botón para seleccionar..."
              className="h-10 flex-1 rounded-lg border border-border-subtle/20 bg-bg-base/80 px-3 text-xs text-text-primary outline-none font-mono"
            />
            <button
              type="button"
              onClick={handlePickFolder}
              className="h-10 px-4 rounded-lg bg-bg-surface border border-border-subtle/30 text-xs font-bold text-text-primary hover:bg-bg-surface/80 flex items-center gap-2 shrink-0"
            >
              <FolderOpen size={14} />
              Elegir
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
            {t('worktree.branch')}
          </label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border-subtle/20 bg-bg-base/80 px-3 text-sm text-text-primary outline-none transition-colors focus:border-secondary/55"
          >
            {branches.map((br) => (
              <option key={br} value={br} className="bg-bg-base text-text-primary text-xs font-mono">
                {br}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            {t('modal.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading || !folderPath.trim() || !branch.trim()}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-[#68b24f] px-4 text-xs font-extrabold text-[#052900] shadow-lg shadow-secondary/20 transition-colors hover:from-[#95e279] hover:to-[#4a9a31] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {t('sidebar.worktreeAdd')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   13. SUBMODULE MODALS (ADD)
   ────────────────────────────────────────────────────────────────────────── */

interface NewSubmoduleModalProps {
  show: boolean;
  onClose: () => void;
  onAdd: (url: string, path: string) => Promise<void> | void;
  isLoading: boolean;
}

export function NewSubmoduleModal({ show, onClose, onAdd, isLoading }: NewSubmoduleModalProps) {
  const t = useT();
  const [url, setUrl] = useState('');
  const [path, setPath] = useState('');

  useEffect(() => {
    if (show) {
      setUrl('');
      setPath('');
    }
  }, [show]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !path.trim()) return;
    onAdd(url.trim(), path.trim());
  };

  return (
    <ModalShell open={show} onClose={onClose} panelClassName="glass-overlay rounded-xl shadow-2xl p-6 w-[480px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-text-primary flex items-center gap-2">
          <Layers size={18} className="text-secondary" />
          {t('sidebar.submoduleAdd')}
        </h3>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
            {t('submodule.url')}
          </label>
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            className="h-10 w-full rounded-lg border border-border-subtle/20 bg-bg-base/80 px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/65 focus:border-secondary/55 font-mono text-xs"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
            {t('submodule.path')}
          </label>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="e.g. libs/my-submodule"
            className="h-10 w-full rounded-lg border border-border-subtle/20 bg-bg-base/80 px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/65 focus:border-secondary/55 font-mono text-xs"
          />
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            {t('modal.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading || !url.trim() || !path.trim()}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-[#68b24f] px-4 text-xs font-extrabold text-[#052900] shadow-lg shadow-secondary/20 transition-colors hover:from-[#95e279] hover:to-[#4a9a31] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {t('sidebar.submoduleAdd')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
