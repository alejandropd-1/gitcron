'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Reorder } from 'motion/react';
import { AlertTriangle, GripVertical, Play, X, Edit2, Trash2, HelpCircle } from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useT } from '@/hooks/use-translation';
import { useGitActions } from '@/hooks/use-git-actions';
import { validateRebasePlan, type RebasePlanItem, type RebaseAction } from '@/lib/rebase-plan';
import type { RebaseCommitInfo } from '@/types/electron';

interface InteractiveRebasePanelProps {
  baseCommitHash: string;
  onClose: () => void;
}

export default function InteractiveRebasePanel({ baseCommitHash, onClose }: InteractiveRebasePanelProps) {
  const t = useT();
  const repoPath = useGitStore((s) => s.repoPath);
  const { prepareInteractiveRebase, startInteractiveRebase } = useGitActions();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commits, setCommits] = useState<RebaseCommitInfo[]>([]);
  const [planItems, setPlanItems] = useState<RebasePlanItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load commits on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await prepareInteractiveRebase(baseCommitHash);
        if (res.success && res.data) {
          // Reverse the array so oldest commit is at the top (standard rebase execution order)
          const reversed = [...res.data].reverse();
          setCommits(reversed);
          setPlanItems(
            reversed.map((c) => ({
              hash: c.hash,
              action: 'pick' as RebaseAction,
              newMessage: c.subject,
            }))
          );
        } else {
          setError(res.error ?? 'Error al preparar rebase');
        }
      } catch (e: any) {
        setError(e.message || 'Error al preparar rebase');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [baseCommitHash]);

  // Validate plan whenever it changes
  useEffect(() => {
    if (planItems.length > 0) {
      const res = validateRebasePlan(planItems);
      if (res.valid) {
        setValidationError(null);
      } else {
        setValidationError(res.error ? t(res.error) : 'Invalid plan');
      }
    }
  }, [planItems, t]);

  const handleReorder = (newOrder: RebasePlanItem[]) => {
    setPlanItems(newOrder);
  };

  const handleActionChange = (hash: string, action: RebaseAction) => {
    setPlanItems((prev) =>
      prev.map((item) => {
        if (item.hash === hash) {
          // Keep the default subject if we don't have custom message
          const originalCommit = commits.find((c) => c.hash === hash);
          return {
            ...item,
            action,
            newMessage: item.newMessage || originalCommit?.subject || '',
          };
        }
        return item;
      })
    );
  };

  const handleMessageChange = (hash: string, msg: string) => {
    setPlanItems((prev) =>
      prev.map((item) => (item.hash === hash ? { ...item, newMessage: msg } : item))
    );
  };

  const handleStart = async () => {
    if (validationError) return;
    setIsLoading(true);
    try {
      // Find the commit just before the first rebase commit.
      // Since `commits` are sorted oldest-to-newest, the parent of the oldest commit is the base of the rebase.
      // We can pass `baseCommitHash~1` as the base, or calculate the exact parent SHA.
      // Let's pass `baseCommitHash~1` which git rebase understands.
      const base = `${baseCommitHash}~1`;
      const res = await startInteractiveRebase(base, planItems);
      if (res.success || res.data?.conflict) {
        onClose();
      } else {
        setError(res.error ?? 'Rebase fallido');
      }
    } catch (e: any) {
      setError(e.message || 'Error al iniciar rebase');
    } finally {
      setIsLoading(false);
    }
  };

  const hasPushedCommits = commits.some((c) => c.isPushed);

  if (isLoading && commits.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm">
        <div className="glass-overlay rounded-xl p-8 flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
          <span className="text-sm font-semibold text-text-primary">Preparando interactiva...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-overlay rounded-xl shadow-2xl w-[640px] max-h-[85vh] flex flex-col overflow-hidden border border-border-subtle/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle/15 bg-bg-surface/50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base text-secondary flex items-center gap-2">
              <Play size={16} className="text-secondary rotate-90" /> {t('rebase.title')}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {t('rebase.subtitle', { base: baseCommitHash.slice(0, 7) })}
            </p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-bg-overlay/10 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-start gap-2 animate-shake">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {hasPushedCommits && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 flex items-start gap-2 leading-relaxed">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{t('rebase.warning.pushed')}</span>
            </div>
          )}

          {/* Reorderable Commits List */}
          <div className="flex-1 min-h-[200px] border border-border-subtle/10 rounded-lg bg-bg-base/30 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-border-subtle/15 bg-bg-surface/20 flex text-[10px] font-bold text-text-secondary uppercase tracking-wider shrink-0 select-none">
              <span className="w-8" />
              <span className="w-24">Acción</span>
              <span className="w-16">Commit</span>
              <span className="flex-1">Mensaje</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
              <Reorder.Group axis="y" values={planItems} onReorder={handleReorder} className="divide-y divide-border-subtle/10">
                {planItems.map((item) => {
                  const originalCommit = commits.find((c) => c.hash === item.hash);
                  const isPushed = originalCommit?.isPushed ?? false;
                  const actionColors: Record<RebaseAction, string> = {
                    pick: 'bg-green-500/10 border-green-500/30 text-green-400',
                    reword: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
                    squash: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
                    fixup: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
                    drop: 'bg-red-500/10 border-red-500/30 text-red-400',
                  };

                  return (
                    <Reorder.Item
                      key={item.hash}
                      value={item}
                      className="flex flex-col bg-bg-surface/5 hover:bg-bg-surface/15 transition-colors group/row"
                    >
                      <div className="flex items-center px-4 py-2.5 min-w-0">
                        {/* Drag Handle */}
                        <div className="w-8 flex items-center justify-start cursor-grab active:cursor-grabbing text-text-secondary/40 hover:text-text-secondary transition-colors">
                          <GripVertical size={14} />
                        </div>

                        {/* Action Select */}
                        <div className="w-24 shrink-0">
                          <select
                            value={item.action}
                            onChange={(e) => handleActionChange(item.hash, e.target.value as RebaseAction)}
                            className={`text-xs font-bold px-2 py-1 border rounded focus:outline-none transition bg-bg-base cursor-pointer ${actionColors[item.action]}`}
                          >
                            <option value="pick">{t('rebase.action.pick')}</option>
                            <option value="reword">{t('rebase.action.reword')}</option>
                            <option value="squash">{t('rebase.action.squash')}</option>
                            <option value="fixup">{t('rebase.action.fixup')}</option>
                            <option value="drop">{t('rebase.action.drop')}</option>
                          </select>
                        </div>

                        {/* Hash */}
                        <div className="w-16 shrink-0 font-mono text-[11px] text-text-secondary flex items-center gap-1.5 select-all">
                          {isPushed && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Pushed to remote" />
                          )}
                          {item.hash.slice(0, 7)}
                        </div>

                        {/* Commit Subject / Info */}
                        <div className={`flex-1 min-w-0 text-xs font-medium truncate ${item.action === 'drop' ? 'line-through text-text-secondary/40' : 'text-text-primary'}`}>
                          {originalCommit?.subject}
                        </div>
                      </div>

                      {/* Expandable text field for Reword/Squash */}
                      <AnimatePresence initial={false}>
                        {(item.action === 'reword' || item.action === 'squash') && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-bg-base/40 border-t border-border-subtle/5"
                          >
                            <div className="px-12 py-2.5 pr-6 flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
                                <Edit2 size={10} /> Mensaje del commit
                              </span>
                              <textarea
                                value={item.newMessage ?? ''}
                                onChange={(e) => handleMessageChange(item.hash, e.target.value)}
                                className="w-full bg-bg-base/70 border border-border-subtle/15 rounded p-2 text-xs font-mono text-text-primary h-14 focus:outline-none focus:border-secondary/30 resize-none"
                                placeholder="Escribe el nuevo mensaje..."
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle/15 bg-bg-surface/50 flex items-center justify-between shrink-0">
          <div>
            {validationError ? (
              <span className="text-xs font-semibold text-red-400 flex items-center gap-1">
                <AlertTriangle size={12} /> {validationError}
              </span>
            ) : (
              <span className="text-[10px] text-text-secondary/60 flex items-center gap-1">
                <HelpCircle size={10} /> Arrastra las filas para reordenar la secuencia.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-overlay/10 rounded transition"
            >
              {t('rebase.btn.cancel')}
            </button>
            <button
              onClick={handleStart}
              disabled={isLoading || !!validationError}
              className="px-4 py-2 text-xs font-bold rounded shadow-lg bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] text-[#052900] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 rounded-full border border-[#052900] border-t-transparent animate-spin mr-1" />
              ) : (
                <Play size={11} className="fill-[#052900]" />
              )}
              {t('rebase.btn.start')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
