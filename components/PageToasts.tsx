'use client';

// Toasts globales de la página: success (auto-dismiss desde la página),
// decisión de pull (behind/diverged con acciones ff/rebase/merge) y error
// (con acciones de recuperación: borrar index.lock y confiar safe.directory).
// Extraído de app/page.tsx. success/error viven en el store; el toast de
// pull-decision es estado de la página y llega por props.

import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Check, X } from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useT } from '@/hooks/use-translation';

export type PullDecisionToast = {
  source: 'push' | 'pull';
  branch: string;
  ahead: number;
  behind: number;
  mode: 'behind' | 'diverged';
};

type PageToastsProps = {
  pullDecision: PullDecisionToast | null;
  onPullDecision: (mode: 'ff-only' | 'rebase' | 'merge') => void | Promise<unknown>;
  onDismissPullDecision: () => void;
  canTrustSafeDirectory: boolean;
  onTrustSafeDirectory: () => void | Promise<void>;
};

export function PageToasts({
  pullDecision, onPullDecision, onDismissPullDecision,
  canTrustSafeDirectory, onTrustSafeDirectory,
}: PageToastsProps) {
  const t = useT();
  const { success, setSuccess, error, setError, isLoading } = useGitStore();
  const { removeIndexLock } = useGitActions();

  return (
    <>
      {/* ──────────── SUCCESS TOAST (auto-dismiss 3s) ──────────── */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 glass-alert-success rounded-lg shadow-2xl flex items-center gap-3 z-50 max-w-xl"
          >
            <Check size={18} className="shrink-0" />
            <span className="text-sm font-medium">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-3 hover:opacity-70 shrink-0 text-secondary">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── PULL DECISION TOAST ──────────── */}
      <AnimatePresence>
        {pullDecision && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 glass-alert-warning text-text-primary rounded-lg shadow-2xl flex items-center gap-3 z-50 w-[min(calc(100vw-2rem),760px)]"
          >
            <AlertCircle size={20} className="shrink-0 text-[#f4b942]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#ffd98a] leading-tight">
                {pullDecision.mode === 'diverged'
                  ? t('pullDecision.divergedTitle', { branch: pullDecision.branch })
                  : t('pullDecision.behindTitle', { branch: pullDecision.branch })}
              </p>
              <p className="text-xs text-text-secondary mt-0.5 leading-snug">
                {pullDecision.mode === 'diverged'
                  ? pullDecision.source === 'push'
                    ? t('pullDecision.divergedPushDesc', { behind: pullDecision.behind, ahead: pullDecision.ahead })
                    : t('pullDecision.divergedPullDesc', { behind: pullDecision.behind, ahead: pullDecision.ahead })
                  : t('pullDecision.behindDesc', { behind: pullDecision.behind })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pullDecision.mode === 'behind' && (
                <button
                  type="button"
                  onClick={() => void onPullDecision('ff-only')}
                  className="px-3 py-1.5 text-xs font-bold bg-secondary/20 hover:bg-secondary/30 text-secondary rounded transition-colors whitespace-nowrap"
                  title={t('pullDecision.ffTooltip')}
                >
                  {t('pullDecision.ffBtn')}
                </button>
              )}
              {pullDecision.mode === 'diverged' && (
                <button
                  type="button"
                  onClick={() => void onPullDecision('rebase')}
                  className="px-3 py-1.5 text-xs font-bold bg-secondary/20 hover:bg-secondary/30 text-secondary rounded transition-colors whitespace-nowrap"
                  title={t('pullDecision.rebaseTooltip')}
                >
                  {t('pullDecision.rebaseBtn')}
                </button>
              )}
              <button
                type="button"
                onClick={() => void onPullDecision('merge')}
                className="px-3 py-1.5 text-xs font-bold bg-[#f4b942]/15 hover:bg-[#f4b942]/25 text-[#ffd98a] rounded transition-colors whitespace-nowrap"
                title={t('pullDecision.mergeTooltip')}
              >
                {t('pullDecision.mergeBtn')}
              </button>
            </div>
            <button onClick={onDismissPullDecision} className="hover:opacity-70 shrink-0 text-[#ffd98a]">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── ERROR TOAST ──────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 p-3 bg-[#9f0519] text-[#ffdad6] rounded-lg shadow-2xl flex items-start gap-3 z-50 border border-[#ffa8a3]/20 max-w-xl"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <span className="text-sm font-medium flex-1 whitespace-pre-line">{error}</span>
            {/* Recovery action when git index is locked */}
            {error.toLowerCase().includes('index.lock') && (
              <button
                onClick={async () => {
                  const ok = await removeIndexLock();
                  if (ok) setError(null);
                }}
                className="shrink-0 px-3 py-1 text-xs font-bold bg-[#ffa8a3]/20 hover:bg-[#ffa8a3]/30 text-[#ffdad6] rounded transition-colors"
                title="Borra .git/index.lock y refresca el estado"
              >
                Eliminar lock
              </button>
            )}
            {canTrustSafeDirectory && (
              <button
                onClick={onTrustSafeDirectory}
                disabled={isLoading}
                className="shrink-0 px-3 py-1 text-xs font-bold bg-[#ffa8a3]/20 hover:bg-[#ffa8a3]/30 text-[#ffdad6] rounded transition-colors disabled:opacity-50"
                title="Agrega esta carpeta a git config --global safe.directory y vuelve a abrirla"
              >
                Confiar carpeta
              </button>
            )}
            <button onClick={() => setError(null)} className="hover:opacity-70 shrink-0">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
