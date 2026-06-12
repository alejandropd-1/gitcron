'use client';

// Modal de reset a un commit (soft/mixed/hard) con confirmación explícita
// para el modo hard. Extraído de app/page.tsx. El modo elegido y el checkbox
// de confirmación son estado interno; se reinician cada vez que se abre para
// un commit distinto.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useT } from '@/hooks/use-translation';

type ResetMode = 'soft' | 'mixed' | 'hard';

type ResetCommitModalProps = {
  /** Hash del commit destino; undefined = modal cerrado. */
  commitHash: string | undefined;
  onClose: () => void;
  onConfirm: (mode: ResetMode) => void | Promise<void>;
};

export function ResetCommitModal({ commitHash, onClose, onConfirm }: ResetCommitModalProps) {
  const t = useT();
  const isLoading = useGitStore((s) => s.isLoading);
  const [resetMode, setResetMode] = useState<ResetMode>('mixed');
  const [hardResetConfirmed, setHardResetConfirmed] = useState(false);

  // Volver a los defaults seguros cada vez que el modal se abre para un commit.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setResetMode('mixed');
    setHardResetConfirmed(false);
  }, [commitHash]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <AnimatePresence>
      {commitHash && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass-overlay rounded-xl shadow-2xl p-6 w-[440px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-secondary flex items-center gap-2">
                <RotateCcw size={16} /> {t('resetModal.title')}
              </h3>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              {t('resetModal.fromCommit')} <span className="font-mono text-secondary">{commitHash.slice(0, 7)}</span>
            </p>

            <div className="flex flex-col gap-3 mb-5">
              <span className="text-xs text-text-secondary font-bold block mb-1">
                {t('resetModal.modeLabel')}
              </span>

              {/* Soft Mode Option */}
              <label className="flex items-start gap-3 p-2.5 rounded border border-border-subtle/10 hover:bg-bg-overlay/20 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="resetMode"
                  value="soft"
                  checked={resetMode === 'soft'}
                  onChange={() => setResetMode('soft')}
                  className="mt-1 accent-secondary"
                />
                <div>
                  <span className="text-xs font-bold text-text-primary block">Soft (--soft)</span>
                  <span className="text-[11px] text-text-secondary leading-relaxed block mt-0.5">
                    {t('resetModal.soft')}
                  </span>
                </div>
              </label>

              {/* Mixed Mode Option */}
              <label className="flex items-start gap-3 p-2.5 rounded border border-border-subtle/10 hover:bg-bg-overlay/20 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="resetMode"
                  value="mixed"
                  checked={resetMode === 'mixed'}
                  onChange={() => setResetMode('mixed')}
                  className="mt-1 accent-secondary"
                />
                <div>
                  <span className="text-xs font-bold text-text-primary block">Mixed (--mixed)</span>
                  <span className="text-[11px] text-text-secondary leading-relaxed block mt-0.5">
                    {t('resetModal.mixed')}
                  </span>
                </div>
              </label>

              {/* Hard Mode Option */}
              <label className="flex items-start gap-3 p-2.5 rounded border border-border-subtle/10 hover:bg-bg-overlay/20 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="resetMode"
                  value="hard"
                  checked={resetMode === 'hard'}
                  onChange={() => setResetMode('hard')}
                  className="mt-1 accent-[#dc6a6a]"
                />
                <div>
                  <span className="text-xs font-bold text-[#dc6a6a] block">Hard (--hard)</span>
                  <span className="text-[11px] text-text-secondary leading-relaxed block mt-0.5">
                    {t('resetModal.hard')}
                  </span>
                </div>
              </label>
            </div>

            {/* Hard Reset Warnings & Confirmation Checkbox */}
            {resetMode === 'hard' && (
              <div className="flex flex-col gap-3 p-3 rounded bg-red-500/10 border border-red-500/30 mb-5 animate-pulse-slow">
                <div className="flex gap-2 text-[#dc6a6a]">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed font-semibold">
                    {t('resetModal.warning')}
                  </span>
                </div>
                <label className="flex items-start gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={hardResetConfirmed}
                    onChange={(e) => setHardResetConfirmed(e.target.checked)}
                    className="mt-0.5 accent-[#dc6a6a]"
                  />
                  <span className="text-[10px] text-text-primary leading-normal">
                    {t('resetModal.confirmCheckbox')}
                  </span>
                </label>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                {t('modal.cancel')}
              </button>
              <button
                onClick={() => void onConfirm(resetMode)}
                disabled={isLoading || (resetMode === 'hard' && !hardResetConfirmed)}
                className={`px-4 py-2 text-sm font-bold rounded shadow-lg transition-all ${
                  resetMode === 'hard'
                    ? 'bg-gradient-to-br from-[#dc6a6a] to-[#b34f4f] hover:from-[#e57979] hover:to-[#9f3e3e] shadow-red-500/10 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                    : 'bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-secondary/20 disabled:opacity-50 text-[#052900]'
                }`}
              >
                <RotateCcw size={14} className="inline mr-1" /> {t('resetModal.button')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
