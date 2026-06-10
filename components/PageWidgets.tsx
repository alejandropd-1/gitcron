'use client';

// Mini-widgets de la página principal: indicador de auto-fetch, handle de
// resize de columnas del graph y el loading de paneles diferidos (dynamic
// import). Extraídos de app/page.tsx.

import { Loader2, RotateCcw } from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useT } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function DeferredPanelLoading() {
  return (
    <div className="flex min-h-48 w-full items-center justify-center text-text-secondary">
      <Loader2 size={18} className="animate-spin text-secondary" />
    </div>
  );
}

export function FetchIndicator({ onClick }: { onClick: () => void | Promise<void> }) {
  const t = useT();
  const isFetchingRemote = useGitStore((s) => s.isFetchingRemote);
  const lastFetchTime = useGitStore((s) => s.lastFetchTime);
  const autoFetchEnabled = useGitStore((s) => s.autoFetchEnabled);
  const tooltip = isFetchingRemote
    ? t('autoFetch.fetching')
    : lastFetchTime
      ? `${t('autoFetch.lastSync')}: ${new Date(lastFetchTime).toLocaleTimeString()}`
      : autoFetchEnabled
        ? t('autoFetch.idle')
        : t('autoFetch.disabled');
  return (
    <button
      type="button"
      onClick={() => onClick()}
      title={tooltip}
      className={cn(
        'flex flex-col items-center justify-center p-1.5 rounded transition-colors group shrink-0',
        'hover:bg-border-subtle',
      )}
    >
      <div className={cn(
        'w-5 h-5 flex items-center justify-center',
        isFetchingRemote ? 'text-secondary' : 'text-text-secondary group-hover:text-secondary',
      )}>
        <RotateCcw size={16} className={cn(isFetchingRemote && 'animate-spin')} />
      </div>
    </button>
  );
}

export function GraphColumnHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group w-0 self-stretch -my-2 shrink-0 cursor-col-resize relative overflow-visible"
      title="Arrastrar para redimensionar columna"
    >
      <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-border-subtle/20 group-hover:bg-secondary/45 group-active:bg-secondary/70 transition-colors" />
      <div className="absolute inset-y-0 -left-1.5 -right-1.5 bg-transparent group-hover:bg-secondary/35 group-active:bg-secondary/60 transition-colors" />
    </div>
  );
}
