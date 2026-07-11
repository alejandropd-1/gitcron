'use client';

// Toasts globales de la página: success (auto-dismiss desde la página),
// decisión de pull (behind/diverged con acciones ff/rebase/merge) y error
// (con acciones de recuperación: borrar index.lock y confiar safe.directory).
// Extraído de app/page.tsx. success/error viven en el store; el toast de
// pull-decision es estado de la página y llega por props.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Check, X, FileText } from 'lucide-react';
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

  const [hovered, setHovered] = useState(false);

  // Auto-dismiss success toast after 3s (short) or 10s (long pull files list).
  // Pauses auto-dismiss on hover when a files list exists.
  useEffect(() => {
    if (!success) return;

    let isLongList = false;
    try {
      const parsed = JSON.parse(success);
      if (parsed && parsed.type === 'pull' && parsed.files && parsed.files.length > 0) {
        isLongList = true;
      }
    } catch (e) {}

    if (isLongList && hovered) {
      return;
    }

    const duration = isLongList ? 10000 : 3000;
    const timer = setTimeout(() => {
      setSuccess(null);
    }, duration);

    return () => clearTimeout(timer);
  }, [success, hovered, setSuccess]);

  // Try to parse success as a pull success JSON object
  let isPullSuccess = false;
  let pullFiles: string[] = [];
  let pullSummary = '';
  let pullMode = '';
  let displayMessage = success || '';

  if (success) {
    try {
      const parsed = JSON.parse(success);
      if (parsed && parsed.type === 'pull') {
        isPullSuccess = true;
        pullFiles = parsed.files || [];
        pullSummary = parsed.summary || '';
        pullMode = parsed.mode || 'default';
      }
    } catch (e) {
      // Keep displayMessage as success string
    }
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[300] flex flex-col items-center gap-2 px-4"
      role="region"
      aria-label={t('notifications.regionLabel')}
    >
      {/* ──────────── SUCCESS TOAST (auto-dismiss 3s/10s) ──────────── */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role="status"
            aria-live="polite"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={
              isPullSuccess
                ? "pointer-events-auto p-4 glass-alert-success rounded-lg shadow-2xl flex flex-col items-stretch w-[min(calc(100vw-2rem),400px)] max-w-md"
                : "pointer-events-auto px-4 py-3 glass-alert-success rounded-lg shadow-2xl flex items-center gap-3 w-[min(calc(100vw-2rem),640px)]"
            }
          >
            {isPullSuccess ? (
              <>
                {/* HEADER fijo */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Check size={18} className="shrink-0 text-secondary" />
                    <span className="text-sm font-semibold truncate text-secondary">
                      {pullFiles.length === 0
                        ? t('success.pullTitle')
                        : pullFiles.length === 1
                        ? t('success.pullTitleWithFile')
                        : t('success.pullTitleWithFiles', { count: pullFiles.length })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuccess(null)}
                    className="hover:opacity-70 shrink-0 text-secondary p-0.5 -mt-0.5 -mr-1"
                  >
                    <X size={16} />
                  </button>
                </div>
                {/* BODY (lista de archivos scrolleable) */}
                {pullFiles.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-secondary/20 flex flex-col gap-2 min-w-0">
                    <div className="max-h-40 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
                      {pullFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-mono text-secondary/85 min-w-0">
                          <FileText size={12} className="shrink-0 opacity-70" />
                          <span className="truncate" title={file}>{file}</span>
                        </div>
                      ))}
                    </div>
                    {pullSummary && (
                      <div className="text-[10px] opacity-75 font-mono text-secondary/90 border-t border-secondary/10 pt-1.5 mt-0.5 truncate" title={pullSummary}>
                        {pullSummary}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <Check size={18} className="shrink-0" />
                <span className="text-sm font-medium">{displayMessage}</span>
                <button type="button" onClick={() => setSuccess(null)} className="ml-3 hover:opacity-70 shrink-0 text-secondary">
                  <X size={14} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── PULL DECISION TOAST ──────────── */}
      <AnimatePresence>
        {pullDecision && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            role="alertdialog"
            aria-modal="false"
            className="pointer-events-auto px-4 py-3 glass-alert-warning text-text-primary rounded-lg shadow-2xl flex items-center gap-3 w-[min(calc(100vw-2rem),760px)]"
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
            <button type="button" onClick={onDismissPullDecision} className="hover:opacity-70 shrink-0 text-[#ffd98a]">
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
            role="alert"
            aria-live="assertive"
            className="pointer-events-auto p-3 bg-[#9f0519] text-[#ffdad6] rounded-lg shadow-2xl flex items-start gap-3 border border-[#ffa8a3]/20 w-[min(calc(100vw-2rem),640px)]"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <span className="text-sm font-medium flex-1 whitespace-pre-line">{error}</span>
            {/* Recovery action when git index is locked */}
            {error.toLowerCase().includes('index.lock') && (
              <button
                type="button"
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
                type="button"
                onClick={onTrustSafeDirectory}
                disabled={isLoading}
                className="shrink-0 px-3 py-1 text-xs font-bold bg-[#ffa8a3]/20 hover:bg-[#ffa8a3]/30 text-[#ffdad6] rounded transition-colors disabled:opacity-50"
                title="Agrega esta carpeta a git config --global safe.directory y vuelve a abrirla"
              >
                Confiar carpeta
              </button>
            )}
            <button type="button" onClick={() => setError(null)} className="hover:opacity-70 shrink-0">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
