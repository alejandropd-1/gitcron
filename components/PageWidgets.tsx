'use client';

// Mini-widgets de la página principal: indicador de auto-fetch, handle de
// resize de columnas del graph y el loading de paneles diferidos (dynamic
// import). Extraídos de app/page.tsx.

import { Loader2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

export function ToolbarButton({
  icon, onClick, title, label, disabled,
}: { icon: React.ReactNode; onClick: () => void; title?: string; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      className={cn(
        'flex shrink-0 flex-col items-center justify-center self-center rounded-md border border-transparent bg-text-primary/[0.025] transition-colors group shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        label ? 'h-10 min-w-[54px] px-2.5 py-1 gap-0.5' : 'h-8 w-10 p-1.5',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#d9e7fc]/[0.075] hover:border-text-primary/15',
      )}
    >
      <div className="w-5 h-5 shrink-0 text-text-secondary group-hover:text-secondary flex items-center justify-center">{icon}</div>
      {label && <span className="text-[9px] leading-none font-bold uppercase tracking-tighter text-text-secondary">{label}</span>}
    </button>
  );
}

// LCAR-29 right-side decorative panel — cronométrico only when Graph tab is
// active and no diff is open. Pure decoration (pointer-events-none), extracted
// from app/page.tsx. `show` gates the entrance/exit fade via AnimatePresence.
export function LcarsDecorPanel({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="lcar-right-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="absolute pointer-events-none select-none"
          style={{
            top: 0,
            right: 0,
            bottom: 0,
            height: '100%',
            width: 'auto',
            aspectRatio: '513 / 600',
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          <svg
            viewBox="0 0 513 600"
            className="h-full w-auto"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <defs>
              <style>{`
                .cls-1 { fill: #36a9d4; }
                .cls-2 { fill: #8dd5e2; }
              `}</style>
            </defs>

            {/* Solid curved mask backing - matches the precise circular sweep of the LCARS arc with smooth Bezier curves */}
            <path
              d="M 144,0 C 260,30 380,100 371,200 C 360,300 220,400 140,470 C 80,520 20,560 0,600 L 513,600 L 513,0 Z"
              fill="var(--color-bg-base)"
            />

            {/* SVG Decorative layers */}
            <g id="Layer_7" data-name="Layer 7" opacity="0.18">
              <path className="cls-2" d="M337.63,396.05c-20.91,23.6-45.29,47.37-72.67,69.69l17.03,135.11h160.93l-105.3-204.8Z" />
              <path className="cls-2" d="M263.86,457.16c24.11-19.84,48.1-42.77,70.19-68l-35.18-69.3c-14.59,17.32-30.74,35.23-45.65,51.47l10.64,85.84Z" />
              <path className="cls-1" d="M334.63,276.08s-.04.05-.05.07c-10.08,13-20.39,25.78-30.86,38.32l36.84,69.4c16.31-19.1,31.48-39.46,44.78-60.76l-50.71-47.03Z" />
              <path className="cls-1" d="M275.79,600.85l-15.95-130.99-11.48-92.72c-21.84,23.61-43.73,45.61-64.97,66.38l-12.36,75.43-13.17,81.9h117.93Z" />
              <path className="cls-2" d="M44.66,566.01c3.99-.79,56.32-11.46,119.91-43.71l11.77-71.9c-51.81,50.17-99.19,89.04-131.68,115.61Z" />
              <path className="cls-2" d="M415.87,264.27l-57.01-26.35c-7.69,15.82-16.13,27.52-20.81,33.68l50.31,46.65c10.59-17.44,19.89-35.49,27.51-53.97Z" />
              <path className="cls-1" d="M418.34,258.1c.24-.61.5-1.22.73-1.83,6.9-18.01,12.78-40.03,15.59-62.99l-60.47-5.01c-2.21,16.43-7.05,31.24-12.62,43.82l56.77,26.02Z" />
              <path className="cls-2" d="M162.86,532.72c-40.79,20.79-85.21,36.69-132.37,44.76-18.86,15.11-29.99,23.38-29.99,23.38h151.48l10.88-68.13Z" />
              <path className="cls-2" d="M440.71,125.84c.75,3.4,5.5,26.77,2.11,62.17l70.58,5.9v-84.92l-72.68,16.84Z" />
              <path className="cls-1" d="M390.91,328.26c-3.63,5.73-7.49,11.55-11.6,17.47-10.14,14.6-21.9,29.77-35.14,45.08l108.31,210.05h60.92v-159.16l-122.48-113.43Z" />
              <path className="cls-2" d="M513.39,308.74l-90.58-41.36c-7.22,17.63-16.65,36.27-28.87,56.04l119.44,110.59v-125.27Z" />
              <path className="cls-1" d="M442.19,193.92c-2.44,20.76-7.59,43.05-16.91,67.25l88.12,39.9v-101.24l-71.2-5.92Z" />
              <path className="cls-2" d="M435.31,187.37c1.96-20.01,1.46-40.53-2.82-59.58l-59.87,13.81c.03.13.05.26.07.37,2.9,14.17,3.35,27.71,2.18,40.37l60.44,5.04Z" />
            </g>
            <g id="Layer_20" data-name="Layer 20" opacity="0.18">
              <path className="cls-2" d="M268.76,39.18c68.95,13.6,97.25,74.72,102.42,95.82l142.22-33.6V-.51H172.23l-28.16,19.88,35.35,26.61c49.53-16.51,89.35-6.8,89.35-6.8Z" />
            </g>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
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
