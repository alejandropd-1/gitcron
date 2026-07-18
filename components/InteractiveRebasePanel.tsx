'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Reorder } from 'motion/react';
import { AlertTriangle, GripVertical, Play, X, Edit2, HelpCircle, ChevronDown, Check } from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useT } from '@/hooks/use-translation';
import { useGitActions } from '@/hooks/use-git-actions';
import { validateRebasePlan, type RebasePlanItem, type RebaseAction } from '@/lib/rebase-plan';
import type { RebaseCommitInfo } from '@/types/electron';
import { cn } from '@/lib/utils';

interface InteractiveRebasePanelProps {
  baseCommitHash: string;
  onClose: () => void;
}

interface DropdownProps {
  value: RebaseAction;
  onChange: (value: RebaseAction) => void;
  actionColors: Record<RebaseAction, string>;
  t: (key: string) => string;
}

function RebaseActionDropdown({ value, onChange, actionColors, t }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleSelect = (val: RebaseAction) => {
    onChange(val);
    setIsOpen(false);
  };

  const actions: RebaseAction[] = ['pick', 'reword', 'squash', 'fixup', 'drop'];

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className={cn(
          "w-full text-xs font-bold px-2 py-1.5 border rounded focus:outline-none transition flex items-center justify-between gap-1 select-none cursor-pointer",
          actionColors[value]
        )}
      >
        <span className="truncate">{t(`rebase.action.${value}`)}</span>
        <ChevronDown size={11} className="opacity-60 shrink-0" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="fixed glass-overlay rounded-lg py-1 z-[9999] shadow-2xl border border-border-subtle/20"
          style={{
            top: coords.top + 4,
            left: coords.left,
            minWidth: Math.max(96, coords.width),
          }}
        >
          {actions.map((act) => {
            const isSelected = act === value;
            return (
              <button
                key={act}
                type="button"
                onClick={() => handleSelect(act)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-left transition-colors cursor-pointer",
                  isSelected
                    ? "bg-border-subtle/30"
                    : "hover:bg-border-subtle/20",
                  act === 'pick' && 'text-green-400',
                  act === 'reword' && 'text-cyan-400',
                  act === 'squash' && 'text-orange-400',
                  act === 'fixup' && 'text-purple-400',
                  act === 'drop' && 'text-red-400'
                )}
              >
                <span>{t(`rebase.action.${act}`)}</span>
                {isSelected && <Check size={11} strokeWidth={3} className="shrink-0 ml-2" />}
              </button>
            );
          })}
        </motion.div>,
        document.body
      )}
    </div>
  );
}

export default function InteractiveRebasePanel({
  baseCommitHash,
  onClose,
}: InteractiveRebasePanelProps) {
  const t = useT();
  const repoPath = useGitStore((s) => s.repoPath);
  const { prepareInteractiveRebase, startInteractiveRebase } = useGitActions();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commits, setCommits] = useState<RebaseCommitInfo[]>([]);
  const [planItems, setPlanItems] = useState<RebasePlanItem[]>([]);

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

  const validationError = useMemo(() => {
    if (planItems.length === 0) return null;
    const result = validateRebasePlan(planItems);
    return result.valid ? null : result.error ? t(result.error) : 'Invalid plan';
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-bg-base/40">
        <div className="glass-overlay rounded-xl p-8 flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
          <span className="text-sm font-semibold text-text-primary">Preparando interactiva...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="absolute inset-0 flex flex-col min-h-0 select-none"
    >
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-overlay/60 backdrop-blur-md border border-text-primary/15 rounded-xl">
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
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-bg-overlay/10 rounded cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Warnings */}
        {(error || hasPushedCommits) && (
          <div className="px-6 pt-4 flex flex-col gap-2 shrink-0">
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
          </div>
        )}

        {/* List Header */}
        <div className="px-6 py-2.5 border-b border-border-subtle/15 bg-bg-surface/20 flex text-[10px] font-bold text-text-secondary uppercase tracking-wider shrink-0 select-none mt-2">
          <span className="w-12" />
          <span className="w-32">Acción</span>
          <span className="w-24">Commit</span>
          <span className="flex-1">Mensaje</span>
        </div>

        {/* Scrollable Commits List */}
        <div className="flex-1 overflow-y-auto min-h-0">
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
                  <div className="flex items-center px-6 py-3 min-w-0">
                    {/* Drag Handle */}
                    <div className="w-12 flex items-center justify-start cursor-grab active:cursor-grabbing text-text-secondary/40 hover:text-text-secondary transition-colors">
                      <GripVertical size={14} />
                    </div>

                    {/* Action Select */}
                    <div className="w-32 shrink-0 pr-4">
                      <RebaseActionDropdown
                        value={item.action}
                        onChange={(val) => handleActionChange(item.hash, val)}
                        actionColors={actionColors}
                        t={t}
                      />
                    </div>

                    {/* Hash */}
                    <div className="w-24 shrink-0 pr-2 font-mono text-[11px] text-text-secondary flex items-center gap-1.5 select-all">
                      {isPushed && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Pushed to remote" />
                      )}
                      {item.hash.slice(0, 7)}
                    </div>

                    {/* Commit Subject / Info */}
                    <div className={`flex-1 min-w-0 text-xs font-semibold truncate ${item.action === 'drop' ? 'line-through text-text-secondary/40' : 'text-text-primary'}`}>
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
                        <div className="pl-[68px] pr-6 py-2.5 flex flex-col gap-1.5">
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
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-overlay/10 rounded transition cursor-pointer"
            >
              {t('rebase.btn.cancel')}
            </button>
            <button
              onClick={handleStart}
              disabled={isLoading || !!validationError}
              className="px-4 py-2 text-xs font-bold rounded shadow-lg bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] text-[#052900] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
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
      </div>
    </motion.div>
  );
}
