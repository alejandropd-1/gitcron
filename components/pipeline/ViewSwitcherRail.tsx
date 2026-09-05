import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './OpenSpecDashboard.module.css';

export const VIEW_SWITCHER_SLOTS = [1, 2, 3, 4] as const;
export type ViewSwitcherSlotIndex = typeof VIEW_SWITCHER_SLOTS[number];

export type ViewSwitcherItem = {
  id: string;
  label: string;
  count?: number | null;
  badge?: string | null;
  slotIndex: number; // 1 | 2 | 3 | 4
  icon?: React.ReactNode;
  disabled?: boolean;
};

export type ViewSwitcherRailProps = {
  views: ViewSwitcherItem[];
  activeViewId: string;
  onSwitchView: (viewId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  environmentSlot?: React.ReactNode;
  ariaLabel?: string;
  collapseAriaLabel?: string;
  className?: string;
};

/**
 * Intercambiador dinámico de vistas (Modelo Codex dinámico).
 *
 * Principio de funcionamiento:
 * - El cuerpo central muestra una única vista soberana por vez.
 * - El riel lateral lista todas las demás vistas disponibles que NO se están
 *   mirando en ese instante, organizadas en ranuras estables.
 * - Al pulsar cualquier entrada del riel, pasa al cuerpo central y la vista
 *   que estaba en el cuerpo pasa al riel.
 * - Si sólo hay una vista disponible y no hay señales de entorno, el riel no
 *   se monta en el DOM (retorna null), cediendo el 100% del ancho al cuerpo.
 * - Ocupa su propia franja vertical de alto completo lado a lado con el cuerpo;
 *   no flota ni se superpone encima del contenido.
 */
export function ViewSwitcherRail({
  views,
  activeViewId,
  onSwitchView,
  isCollapsed = false,
  onToggleCollapse,
  environmentSlot,
  ariaLabel = 'Vistas',
  collapseAriaLabel,
  className,
}: ViewSwitcherRailProps) {
  const availableViews = views.filter((v) => v.id !== activeViewId);

  // Auto-hide: si no hay vistas alternativas ni señales de entorno, el riel no existe.
  if (availableViews.length === 0 && !environmentSlot) {
    return null;
  }

  return (
    <nav
      className={cn(styles.switcherRail, className)}
      aria-label={ariaLabel}
      data-collapsed={isCollapsed ? 'true' : 'false'}
    >
      <div className={styles.railHeader}>
        {!isCollapsed && <span className={styles.railTitle}>{ariaLabel}</span>}
        {onToggleCollapse && (
          <button
            type="button"
            className={styles.railCollapseToggle}
            aria-label={
              collapseAriaLabel ??
              (isCollapsed ? 'Desplegar panel de vistas' : 'Plegar panel de vistas')
            }
            title={isCollapsed ? 'Desplegar panel' : 'Plegar panel'}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ChevronLeft size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
          </button>
        )}
      </div>

      <div className={styles.railSlots}>
        {VIEW_SWITCHER_SLOTS.map((slotIdx) => {
          const item = availableViews.find((v) => v.slotIndex === slotIdx);
          return (
            <div
              key={slotIdx}
              className={styles.railSlot}
              data-slot={slotIdx}
              data-occupied={Boolean(item) ? 'true' : 'false'}
            >
              {item && (
                <button
                  type="button"
                  className={styles.railItem}
                  data-slot={slotIdx}
                  data-view-id={item.id}
                  title={
                    isCollapsed
                      ? `${item.label}${item.count !== undefined && item.count !== null ? ` (· ${item.count})` : ''}`
                      : undefined
                  }
                  onClick={() => onSwitchView(item.id)}
                  disabled={item.disabled}
                >
                  {item.icon && <span className={styles.railItemIcon} aria-hidden="true">{item.icon}</span>}
                  {!isCollapsed && (
                    <>
                      <span className={styles.railItemLabel}>{item.label}</span>
                      {item.count !== undefined && item.count !== null && (
                        <span className={styles.railItemCount} aria-label={`${item.count}`}>
                          <span className={styles.railItemCountSep}>·</span>
                          <span className={styles.railItemCountValue}>{item.count}</span>
                        </span>
                      )}
                      {item.badge && <span className={styles.railItemBadge}>{item.badge}</span>}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {environmentSlot && (
        <div className={styles.railEnvironment} data-slot="environment">
          {environmentSlot}
        </div>
      )}
    </nav>
  );
}
