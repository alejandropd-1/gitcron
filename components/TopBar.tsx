'use client';

// Topbar de la app jerarquizada:
// - Acciones frecuentes visibles: Traer (Pull), Publicar (Push), Recargar (Fetch).
// - Desplegable de acciones: Deshacer, Rehacer, Crear rama, Guardar temporalmente, Aplicar parche.
// - Desplegable de herramientas: Terminal, Filtro de ramas, Búsqueda, con sus atajos visibles.
// - Toggles de paneles a los extremos.

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Archive, ChevronDown, Download, FileInput, Filter, GitBranch, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Redo, Search, SlidersHorizontal, Terminal, Undo, Upload, Wrench,
} from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useT } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { FetchIndicator, ToolbarButton } from '@/components/PageWidgets';
import { GraphSearchControl } from '@/components/GraphSearchControl';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
}

interface TopBarDropdownProps {
  id: string;
  label: string;
  icon?: React.ReactNode;
  items: DropdownMenuItem[];
  disabled?: boolean;
}

export function TopBarDropdown({
  id,
  label,
  icon,
  items,
  disabled = false,
}: TopBarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const closeMenu = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    setFocusedIndex(-1);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closeMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen, closeMenu]);

  // Focus the item when focusedIndex changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && focusedIndex < items.length) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex, items.length]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
      setFocusedIndex(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setFocusedIndex(items.length - 1);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        let next = (prev + 1) % items.length;
        while (items[next]?.disabled && next !== prev) {
          next = (next + 1) % items.length;
        }
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        let next = (prev - 1 + items.length) % items.length;
        while (items[next]?.disabled && next !== prev) {
          next = (next - 1 + items.length) % items.length;
        }
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedIndex(items.length - 1);
    } else if (e.key === 'Tab') {
      closeMenu(false);
    }
  };

  const handleItemClick = (item: DropdownMenuItem) => {
    if (item.disabled) return;
    item.onClick();
    closeMenu(true);
  };

  return (
    <div className="relative inline-block text-left" onKeyDown={handleMenuKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        id={`${id}-trigger`}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            closeMenu(false);
          } else {
            setIsOpen(true);
            setFocusedIndex(0);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
        className={cn(
          'min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5',
          'bg-text-primary/[0.035] text-text-secondary hover:bg-text-primary/10 hover:text-text-primary',
          'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
          isOpen && 'bg-text-primary/10 text-secondary',
          disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
        )}
      >
        {icon && <span className="shrink-0 text-text-secondary/70">{icon}</span>}
        <span>{label}</span>
        <ChevronDown size={12} className={cn('transition-transform duration-150', isOpen && 'rotate-180 text-secondary')} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={`${id}-trigger`}
          className="absolute left-0 top-full mt-1 w-56 rounded-xl bg-bg-surface shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              tabIndex={focusedIndex === index ? 0 : -1}
              onClick={() => handleItemClick(item)}
              className={cn(
                'w-full px-3 py-2 flex items-center justify-between text-xs transition-colors text-left min-h-[44px]',
                item.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : focusedIndex === index
                  ? 'bg-secondary/15 text-secondary'
                  : 'text-text-secondary hover:bg-text-primary/10 hover:text-text-primary',
                'focus-visible:outline-none'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.icon && <span className="shrink-0 opacity-80">{item.icon}</span>}
                <span className="truncate font-medium">{item.label}</span>
              </div>
              {item.shortcut && (
                <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded bg-text-primary/[0.06] text-text-secondary/70 shrink-0">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type TopBarProps = {
  // panel toggles
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  // acciones git
  onPullIntent: () => void;
  onPushIntent: () => void;
  onNewBranchRequest: () => void;
  onOpenStashModal: () => void;
  onFetchNow: () => void | Promise<void>;
  // búsqueda
  filterText: string;
  onFilterTextChange: (value: string) => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
};

export function TopBar({
  sidebarOpen, onToggleSidebar, detailsOpen, onToggleDetails,
  onPullIntent, onPushIntent, onNewBranchRequest, onOpenStashModal, onFetchNow,
  filterText, onFilterTextChange, searchOpen, onSearchOpenChange,
}: TopBarProps) {
  const t = useT();
  const repoPath = useGitStore((s) => s.repoPath);
  const isLoading = useGitStore((s) => s.isLoading);
  const { applyPatchFile, openTerminal } = useGitActions();

  const actionsMenuItems: DropdownMenuItem[] = [
    {
      id: 'undo',
      label: t('toolbar.undo'),
      icon: <Undo size={14} />,
      disabled: !repoPath || isLoading,
      onClick: () => {},
    },
    {
      id: 'redo',
      label: t('toolbar.redo'),
      icon: <Redo size={14} />,
      disabled: !repoPath || isLoading,
      onClick: () => {},
    },
    {
      id: 'new-branch',
      label: t('toolbar.newBranch'),
      icon: <GitBranch size={14} />,
      shortcut: 'Ctrl + B',
      disabled: !repoPath,
      onClick: onNewBranchRequest,
    },
    {
      id: 'stash',
      label: t('toolbar.stash'),
      icon: <Archive size={14} />,
      disabled: !repoPath || isLoading,
      onClick: onOpenStashModal,
    },
    {
      id: 'patch',
      label: t('toolbar.applyPatchTooltip'),
      icon: <FileInput size={14} />,
      disabled: !repoPath || isLoading,
      onClick: applyPatchFile,
    },
  ];

  const toolsMenuItems: DropdownMenuItem[] = [
    {
      id: 'terminal',
      label: t('toolbar.terminal'),
      icon: <Terminal size={14} />,
      shortcut: 'Ctrl + `',
      disabled: !repoPath,
      onClick: openTerminal,
    },
    {
      id: 'branch-filter',
      label: t('toolbar.branchFilter'),
      icon: <Filter size={14} />,
      shortcut: 'Ctrl + Shift + B',
      disabled: !repoPath,
      onClick: () => {
        onSearchOpenChange(true);
      },
    },
    {
      id: 'search',
      label: t('shortcuts.search'),
      icon: <Search size={14} />,
      shortcut: 'Ctrl + Alt + F',
      disabled: !repoPath,
      onClick: () => onSearchOpenChange(true),
    },
  ];

  return (
    <header
      className="grid items-center shrink-0 relative z-50 h-12 bg-bg-surface grid-cols-[auto_1fr_auto] px-4 gap-4"
    >
      {/* Left: Sidebar Toggle */}
      <div className="flex items-center gap-2 h-full">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? t('toolbar.hideSidebar') : t('toolbar.showSidebar')}
          aria-pressed={sidebarOpen}
          title={sidebarOpen ? t('toolbar.hideSidebar') : t('toolbar.showSidebar')}
          className={cn(
            'min-h-[44px] min-w-[44px] h-11 w-11 shrink-0 rounded-lg bg-text-primary/[0.035] text-text-secondary',
            'flex items-center justify-center transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
            'hover:bg-text-primary/10 hover:text-secondary',
            'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
            sidebarOpen && 'text-secondary bg-secondary/10',
          )}
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>

      {/* Center: Acciones dropdown, Traer (Pull), Publicar (Push), Recargar (Fetch) */}
      <div className="flex items-center justify-center gap-2 px-2">
        <TopBarDropdown
          id="topbar-actions"
          label={t('toolbar.actionsMenu')}
          icon={<SlidersHorizontal size={14} />}
          items={actionsMenuItems}
          disabled={!repoPath}
        />
        <div className="w-px h-4 bg-border-subtle mx-1" />
        <ToolbarButton
          icon={<Download size={15} />}
          onClick={onPullIntent}
          title={t('toolbar.pull')}
          label={t('toolbar.pull')}
          disabled={!repoPath || isLoading}
        />
        <ToolbarButton
          icon={<Upload size={15} />}
          onClick={onPushIntent}
          title={t('toolbar.push')}
          label={t('toolbar.push')}
          disabled={!repoPath || isLoading}
        />
        <div className="w-px h-4 bg-border-subtle mx-1" />
        <FetchIndicator onClick={onFetchNow} />
      </div>

      {/* Right: Herramientas dropdown, Details Toggle */}
      <div className="flex items-center justify-end gap-2">
        <TopBarDropdown
          id="topbar-tools"
          label={t('toolbar.toolsMenu')}
          icon={<Wrench size={14} />}
          items={toolsMenuItems}
          disabled={!repoPath}
        />
        <GraphSearchControl
          filterText={filterText}
          onFilterTextChange={onFilterTextChange}
          disabled={!repoPath}
          open={searchOpen}
          onOpenChange={onSearchOpenChange}
        />
        <div className="w-px h-4 bg-border-subtle mx-1 shrink-0" />
        <button
          type="button"
          onClick={onToggleDetails}
          aria-label={detailsOpen ? t('toolbar.hideDetails') : t('toolbar.showDetails')}
          aria-pressed={detailsOpen}
          title={detailsOpen ? t('toolbar.hideDetails') : t('toolbar.showDetails')}
          className={cn(
            'min-h-[44px] min-w-[44px] h-11 w-11 shrink-0 rounded-lg bg-text-primary/[0.035] text-text-secondary',
            'flex items-center justify-center transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
            'hover:bg-text-primary/10 hover:text-secondary',
            'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
            detailsOpen && 'text-secondary bg-secondary/10',
          )}
        >
          {detailsOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      </div>
    </header>
  );
}
