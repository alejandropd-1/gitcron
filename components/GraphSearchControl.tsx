'use client';

// Control de búsqueda/filtro del graph: botón del topbar + popover flotante
// (position:fixed, así que puede renderizarse junto al botón) con el input de
// filtro. Maneja internamente apertura, posición (recalculada en resize y
// scroll), click-outside, Ctrl+Alt+F para abrir y Escape para limpiar/cerrar.
// El texto del filtro es estado de la página (lo consumen los graphs) y llega
// por props. Extraído de app/page.tsx.

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { ToolbarButton } from '@/components/PageWidgets';

type GraphSearchControlProps = {
  filterText: string;
  onFilterTextChange: (value: string) => void;
  disabled: boolean;
  /** Controlled open state — la página también lo abre vía shortcut rebindable. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GraphSearchControl({
  filterText, onFilterTextChange, disabled, open: showSearchPopover, onOpenChange: setShowSearchPopover,
}: GraphSearchControlProps) {
  const t = useT();
  const [searchPopoverPos, setSearchPopoverPos] = useState<{ top: number; right: number } | null>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const searchPopoverRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLDivElement>(null);

  // Ctrl+Alt+F focuses the filter input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearchPopover(true);
      }
      // Escape clears filter first, then closes search when pressed again.
      if (e.key === 'Escape' && document.activeElement === filterInputRef.current) {
        if (filterText) {
          onFilterTextChange('');
        } else {
          setShowSearchPopover(false);
          filterInputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [filterText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Position the popover under the button and focus the input when opening.
  // (Intentional sync setState: anchoring to a fresh getBoundingClientRect.)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!showSearchPopover) return;
    const buttonRect = searchButtonRef.current?.getBoundingClientRect();
    if (buttonRect) {
      setSearchPopoverPos({
        top: buttonRect.bottom + 8,
        right: Math.max(12, window.innerWidth - buttonRect.right),
      });
    }
    filterInputRef.current?.focus();
    filterInputRef.current?.select();
  }, [showSearchPopover]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Close on click outside (button itself toggles, so it's excluded).
  useEffect(() => {
    if (!showSearchPopover) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (searchPopoverRef.current?.contains(e.target as Node)) return;
      if (searchButtonRef.current?.contains(e.target as Node)) return;
      setShowSearchPopover(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [showSearchPopover]);

  // Keep the popover anchored on window resize/scroll.
  useEffect(() => {
    if (!showSearchPopover) return;
    const updatePosition = () => {
      const buttonRect = searchButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;
      setSearchPopoverPos({
        top: buttonRect.bottom + 8,
        right: Math.max(12, window.innerWidth - buttonRect.right),
      });
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showSearchPopover]);

  return (
    <>
      <div className="relative shrink-0" ref={searchButtonRef}>
        <ToolbarButton
          icon={<Search />}
          onClick={() => setShowSearchPopover(!showSearchPopover)}
          title={t('toolbar.filter')}
          disabled={disabled}
        />
        {filterText && (
          <span className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(163,241,133,0.7)]" />
        )}
      </div>
      {showSearchPopover && searchPopoverPos && (
        <div
          ref={searchPopoverRef}
          className="fixed w-[360px] rounded-lg border border-border-subtle/25 bg-bg-overlay/95 backdrop-blur-xl p-2 z-[200]"
          style={{ top: searchPopoverPos.top, right: searchPopoverPos.right }}
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              ref={filterInputRef}
              value={filterText}
              onChange={(e) => onFilterTextChange(e.target.value)}
              className="w-full bg-bg-base/70/70 border border-border-subtle/20 rounded px-8 py-2 text-sm text-text-primary focus:outline-none focus:border-secondary/55"
              placeholder={t('toolbar.filter')}
            />
            {filterText && (
              <button
                onClick={() => onFilterTextChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                title={t('toolbar.clearFilterTooltip')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
