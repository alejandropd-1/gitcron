'use client';

import { useRef } from 'react';
import { Loader2, Maximize2, Minus, Plus, X } from 'lucide-react';
import { Reorder } from 'motion/react';
import { useT } from '@/hooks/use-translation';
import type { RepoState } from '@/lib/git-store';
import { cn } from '@/lib/utils';

type RepoTabsProps = {
  repos: RepoState[];
  activeIdx: number;
  onSelect: (idx: number) => void | Promise<void>;
  onClose: (idx: number) => void | Promise<void>;
  onOpen: () => void | Promise<void>;
  onReorder: (newOrder: RepoState[]) => void;
};

export function RepoTabs({ repos, activeIdx, onSelect, onClose, onOpen, onReorder }: RepoTabsProps) {
  const t = useT();
  const isDraggingRef = useRef(false);
  if (repos.length === 0) return null;

  return (
    <div className="app-titlebar h-10 rounded-t-2xl bg-transparent border-b border-text-primary/10 flex items-stretch shrink-0 overflow-hidden gap-1">
      <div className="min-w-0 flex-1 flex items-end gap-1 pl-2 pt-1.5 pb-1 overflow-x-auto overflow-y-hidden">
        <div className="app-titlebar-control h-7 mb-0 mr-2 flex items-center gap-2 shrink-0 px-2 select-none">
          <img
            src="/gitcron-icon.png"
            alt="GitCron"
            data-keep-color
            className="w-4 h-4 rounded-sm"
          />
          <span className="text-sm font-bold text-primary tracking-tight">GitCron</span>
        </div>
        <Reorder.Group
          axis="x"
          values={repos}
          onReorder={onReorder}
          className="flex items-end gap-1 min-w-0"
        >
          {repos.map((repo, idx) => {
            const isActive = idx === activeIdx;
            return (
              <Reorder.Item
                key={repo.path}
                value={repo}
                onDragStart={() => {
                  isDraggingRef.current = true;
                }}
                onDragEnd={() => {
                  setTimeout(() => {
                    isDraggingRef.current = false;
                  }, 50);
                }}
                className={cn(
                  'app-titlebar-control group h-7 min-w-0 max-w-52 rounded-md flex items-center border transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] cursor-grab active:cursor-grabbing',
                  isActive
                    ? 'bg-text-primary/10 border-secondary/25 text-text-primary shadow-[0_0_18px_rgba(163,241,133,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'bg-text-primary/[0.035] border-text-primary/10 text-text-secondary hover:text-text-primary hover:bg-text-primary/[0.07] hover:border-text-primary/20',
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!isDraggingRef.current) onSelect(idx);
                  }}
                  title={t('repoTabs.switchTo', { repo: repo.name })}
                  className="min-w-0 flex-1 h-full px-2.5 flex items-center gap-2 text-left"
                >
                  {repo.isLoading ? (
                    <Loader2 size={10} className="shrink-0 animate-spin text-secondary" />
                  ) : (
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        isActive ? 'bg-secondary shadow-[0_0_10px_rgba(var(--color-secondary-rgb),0.5)]' : 'bg-border-subtle',
                      )}
                    />
                  )}
                  <span className="truncate text-xs font-semibold">{repo.name}</span>
                  <span className="text-[10px] text-text-secondary/70 font-mono truncate max-w-20 hidden md:block">
                    {repo.currentBranch || '-'}
                  </span>
                </button>
                <button
                  type="button"
                  title={t('repoTabs.close', { repo: repo.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(idx);
                  }}
                  className="mr-1 p-0.5 rounded text-text-secondary/70 hover:text-error hover:bg-error/10 opacity-70 group-hover:opacity-100 transition"
                >
                  <X size={13} />
                </button>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
        <button
          type="button"
          onClick={onOpen}
          title={t('repoTabs.openAnother')}
          className="app-titlebar-control h-7 w-7 mb-0 rounded-md flex items-center justify-center text-text-secondary bg-text-primary/[0.025] hover:text-secondary hover:bg-text-primary/[0.07] border border-text-primary/15 hover:border-text-primary/25 transition-colors shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="app-titlebar-control h-10 self-stretch flex items-stretch shrink-0 pr-3 gap-1">
        <button
          type="button"
          aria-label="Minimizar"
          title="Minimizar"
          onClick={() => window.api?.windowMinimize()}
          className="h-7 w-10 my-1.5 rounded-md flex items-center justify-center text-text-secondary bg-text-primary/[0.035] hover:bg-text-primary/[0.09] hover:text-text-primary transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          aria-label="Maximizar o restaurar"
          title="Maximizar o restaurar"
          onClick={() => window.api?.windowToggleMaximize()}
          className="h-7 w-10 my-1.5 rounded-md flex items-center justify-center text-text-secondary bg-text-primary/[0.035] hover:bg-text-primary/[0.09] hover:text-text-primary transition-colors"
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          aria-label="Cerrar"
          title="Cerrar"
          onClick={() => window.api?.windowClose()}
          className="h-7 w-10 my-1.5 rounded-md flex items-center justify-center text-text-secondary bg-text-primary/[0.035] hover:bg-error/20 hover:text-[#ffdad6] transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
