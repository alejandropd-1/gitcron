'use client';

// Dropdown de filtro de branches del graph (todas las branches vs solo la
// actual). Autocontenido: lee graphShowAllBranches del store, persiste la
// elección en el repo activo y refresca el log. Extraído de app/page.tsx.

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Filter } from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useRepoLoader } from '@/hooks/use-repo-loader';
import { useT } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function BranchFilterDropdown() {
  const t = useT();
  const graphShowAllBranches = useGitStore((s) => s.getActiveRepo()?.graphShowAllBranches ?? true);
  const updateActiveRepo = useGitStore((s) => s.updateActiveRepo);
  const { refreshLog } = useRepoLoader();
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setShowDropdown(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [showDropdown]);

  const applyFilter = (allBranches: boolean) => {
    const path = useGitStore.getState().getActiveRepo()?.path;
    if (!path) return;
    updateActiveRepo({ graphShowAllBranches: allBranches });
    refreshLog(path, { allBranches });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setShowDropdown((v) => !v)}
        title={graphShowAllBranches ? t('graph.allBranches') : t('graph.currentBranch')}
        className={cn(
          'flex flex-col items-center justify-center p-1.5 rounded transition-colors group shrink-0',
          'hover:bg-bg-overlay/70',
          !graphShowAllBranches && 'text-secondary',
        )}
      >
        <div className={cn(
          'w-5 h-5 flex items-center justify-center',
          !graphShowAllBranches ? 'text-secondary' : 'text-text-secondary group-hover:text-secondary',
        )}>
          <Filter size={15} />
        </div>
        {!graphShowAllBranches && (
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_6px_rgba(163,241,133,0.7)]" />
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full mt-1 glass-overlay rounded-lg  py-1 z-50 w-44"
            onClick={() => setShowDropdown(false)}
          >
            <button
              type="button"
              onClick={() => applyFilter(true)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                graphShowAllBranches
                  ? 'text-secondary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-border-subtle/30',
              )}
            >
              {graphShowAllBranches && <Check size={12} strokeWidth={3} className="shrink-0" />}
              {!graphShowAllBranches && <span className="w-3 shrink-0" />}
              {t('graph.allBranches')}
            </button>
            <button
              type="button"
              onClick={() => applyFilter(false)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                !graphShowAllBranches
                  ? 'text-secondary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-border-subtle/30',
              )}
            >
              {!graphShowAllBranches && <Check size={12} strokeWidth={3} className="shrink-0" />}
              {graphShowAllBranches && <span className="w-3 shrink-0" />}
              {t('graph.currentBranch')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
