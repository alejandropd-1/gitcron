'use client';

import { cn } from '@/lib/utils';

export function StatusBadge({ label, count, color, letter }: { label: string; count: number; color: string; letter: string }) {
  const bg = color.startsWith('var(')
    ? `color-mix(in srgb, ${color} 20%, transparent)`
    : `${color}33`;

  return (
    <div className="flex items-center gap-2 text-ui-body">
      <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: bg, color }}>
        {letter}
      </div>
      <span className="text-text-primary">{label}</span>
      <span className="text-text-secondary ml-auto font-mono text-ui-mono">{count}</span>
    </div>
  );
}

export function FlowStep({ n, done, children }: { n: number; done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn('shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold', done ? 'bg-secondary text-[#052900]' : 'bg-border-subtle text-text-secondary')}>
        {done ? '✓' : n}
      </span>
      <span className={cn('flex-1', done && 'text-text-secondary')}>{children}</span>
    </li>
  );
}

