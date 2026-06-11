'use client';

// Modales de stash: crear stash con mensaje opcional y preview de un stash
// (lista de archivos + diff, con acciones apply/pop). Extraídos de
// app/page.tsx. El estado de apertura vive en la página (se abren desde el
// topbar, el details panel y el sidebar); apply/pop se ejecutan acá vía
// useGitActions.

import { motion, AnimatePresence } from 'motion/react';
import { Archive, FileDiff, FileText, Loader2, RotateCcw, Upload, X } from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useT } from '@/hooks/use-translation';

export type StashPreviewState = {
  index: number;
  message: string;
  files: string[];
  diff: string;
};

type StashCreateModalProps = {
  open: boolean;
  onClose: () => void;
  message: string;
  onMessageChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
};

export function StashCreateModal({ open, onClose, message, onMessageChange, onSubmit }: StashCreateModalProps) {
  const t = useT();
  const isLoading = useGitStore((s) => s.isLoading);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
          onClick={onClose}
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
            className="glass-overlay rounded-xl shadow-2xl p-6 w-[min(calc(100vw-2rem),480px)]"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-git-mod flex items-center gap-2">
                <Archive size={16} /> {t('stashModal.title')}
              </h3>
              <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <label htmlFor="stash-message" className="text-xs text-text-secondary block mb-1">
              {t('stashModal.messageLabel')}
            </label>
            <input
              id="stash-message"
              name="stashMessage"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
              placeholder={t('stashModal.messagePlaceholder')}
              className="w-full bg-bg-base/70 border border-border-subtle/15 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-git-mod/50 mb-2"
            />
            <p className="text-[11px] text-text-secondary leading-relaxed mb-5">
              {t('stashModal.desc')}
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                {t('modal.cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-br from-[#fd9d1a] to-[#c96c00] hover:from-[#ffb247] hover:to-[#b75f00] shadow-lg shadow-git-mod/10 disabled:opacity-40 disabled:cursor-not-allowed text-[#201100] text-sm font-bold rounded flex items-center gap-2"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                {isLoading ? t('stashModal.saving') : t('stashModal.save')}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type StashPreviewModalProps = {
  preview: StashPreviewState | null;
  onClose: () => void;
};

export function StashPreviewModal({ preview, onClose }: StashPreviewModalProps) {
  const t = useT();
  const isLoading = useGitStore((s) => s.isLoading);
  const { stashApply, stashPop } = useGitActions();
  return (
    <AnimatePresence>
      {preview && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
            className="glass-overlay rounded-xl shadow-2xl p-6 w-[min(calc(100vw-2rem),880px)] max-h-[82vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <h3 className="font-bold text-secondary flex items-center gap-2">
                  <FileDiff size={16} /> {t('stashPreview.title', { index: preview.index })}
                </h3>
                <p className="text-xs text-text-secondary mt-1 truncate">{preview.message}</p>
              </div>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-3 min-h-0 flex-1">
              <div className="rounded border border-border-subtle/15 bg-bg-base/70 overflow-hidden min-h-0">
                <div className="px-3 py-2 border-b border-border-subtle/15 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  {t('stashPreview.files', { count: preview.files.length })}
                </div>
                <div className="max-h-[52vh] overflow-y-auto p-1">
                  {preview.files.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-text-secondary italic">{t('stashPreview.noFiles')}</p>
                  ) : preview.files.map((filePath) => (
                    <div key={filePath} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-primary">
                      <FileText size={13} className="text-text-secondary shrink-0" />
                      <span className="truncate font-mono select-text">{filePath}</span>
                    </div>
                  ))}
                </div>
              </div>
              <pre
                tabIndex={0}
                className="rounded border border-border-subtle/15 bg-[#06111f] p-3 overflow-auto max-h-[52vh] text-[11px] leading-relaxed text-text-primary font-mono whitespace-pre"
              >
                <code>{preview.diff || t('stashPreview.noDiff')}</code>
              </pre>
            </div>

            <div className="flex gap-2 justify-end mt-5">
              <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                {t('modal.close')}
              </button>
              <button
                onClick={async () => {
                  const index = preview.index;
                  onClose();
                  await stashApply(index);
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-bg-base/70 border border-secondary/30 hover:border-secondary/60 hover:text-secondary disabled:opacity-40 text-sm font-bold rounded flex items-center gap-2"
              >
                <RotateCcw size={14} /> {t('stashPreview.apply')}
              </button>
              <button
                onClick={async () => {
                  const index = preview.index;
                  onClose();
                  await stashPop(index);
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-40 text-[#052900] text-sm font-bold rounded flex items-center gap-2"
              >
                <Upload size={14} /> {t('stashPreview.pop')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
