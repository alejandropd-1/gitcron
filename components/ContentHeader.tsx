'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ContentHeaderProps = {
  children?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
  testId?: string;
};

/**
 * Encabezado único para las áreas de contenido de la aplicación (grafo, historial, autoría).
 * Mantiene una sola firma visual con fondo semitransparente, tipografía unificada,
 * altura fija determinista de 36px (h-9 = ROW_H) y separación por fondo y espacio (sin border-b).
 */
export function ContentHeader({
  children,
  left,
  right,
  className,
  testId = 'content-header',
}: ContentHeaderProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'sticky top-0 bg-bg-surface/75 z-10 h-9 px-4 text-[length:var(--font-size-2xs)] text-text-secondary uppercase font-medium shrink-0 flex items-center',
        (left || right) && 'justify-between gap-2',
        className,
      )}
    >
      {children ? (
        children
      ) : (
        <>
          <div className="flex items-center gap-2 min-w-0">{left}</div>
          {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
        </>
      )}
    </div>
  );
}
