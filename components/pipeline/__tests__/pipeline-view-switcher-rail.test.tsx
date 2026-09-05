// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ViewSwitcherRail, type ViewSwitcherItem } from '../ViewSwitcherRail';

afterEach(cleanup);

describe('ViewSwitcherRail - Intercambiador modular de vistas', () => {
  it('retorna null (no se monta) si sólo hay una vista disponible y no hay señales de entorno', () => {
    const views: ViewSwitcherItem[] = [
      { id: 'in-progress', label: 'En curso', slotIndex: 1 },
    ];

    const { container } = render(
      <ViewSwitcherRail
        views={views}
        activeViewId="in-progress"
        onSwitchView={() => undefined}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('se monta y lista las vistas disponibles que NO están activas en el cuerpo', () => {
    const onSwitch = vi.fn();
    const views: ViewSwitcherItem[] = [
      { id: 'in-progress', label: 'En curso', count: 4, slotIndex: 1 },
      { id: 'archived', label: 'Archivados', count: 12, slotIndex: 2 },
      { id: 'new-change', label: 'Empezar un cambio', slotIndex: 3 },
    ];

    render(
      <ViewSwitcherRail
        views={views}
        activeViewId="in-progress"
        onSwitchView={onSwitch}
      />,
    );

    // La vista activa 'in-progress' no aparece en el riel
    expect(screen.queryByRole('button', { name: /En curso/ })).toBeNull();

    // Las vistas inactivas 'archived' y 'new-change' aparecen con sus etiquetas y métricas
    const archivedBtn = screen.getByRole('button', { name: /Archivados/ });
    expect(archivedBtn).toBeTruthy();
    expect(archivedBtn.textContent).toContain('12');

    const newChangeBtn = screen.getByRole('button', { name: /Empezar un cambio/ });
    expect(newChangeBtn).toBeTruthy();

    // Al pulsar un botón, se invoca onSwitchView con su id
    fireEvent.click(archivedBtn);
    expect(onSwitch).toHaveBeenCalledWith('archived');
  });

  it('mantiene la estabilidad de ranuras cuando entra una nueva vista', () => {
    const initialViews: ViewSwitcherItem[] = [
      { id: 'archived', label: 'Archivados', slotIndex: 1 },
      { id: 'new-change', label: 'Empezar un cambio', slotIndex: 2 },
    ];

    const { container, rerender } = render(
      <ViewSwitcherRail
        views={initialViews}
        activeViewId="in-progress"
        onSwitchView={() => undefined}
      />,
    );

    const slot1 = container.querySelector('div[data-slot="1"] button');
    const slot2 = container.querySelector('div[data-slot="2"] button');
    expect(slot1?.getAttribute('data-view-id')).toBe('archived');
    expect(slot2?.getAttribute('data-view-id')).toBe('new-change');

    // Agregamos una nueva vista en slot 3
    const expandedViews: ViewSwitcherItem[] = [
      ...initialViews,
      { id: 'diffs', label: 'Diffs', count: 3, slotIndex: 3 },
    ];

    rerender(
      <ViewSwitcherRail
        views={expandedViews}
        activeViewId="in-progress"
        onSwitchView={() => undefined}
      />,
    );

    // Slot 1 y Slot 2 permanecen en su ranura idéntica y sin corrimientos
    const slot1After = container.querySelector('div[data-slot="1"] button');
    const slot2After = container.querySelector('div[data-slot="2"] button');
    const slot3After = container.querySelector('div[data-slot="3"] button');

    expect(slot1After?.getAttribute('data-view-id')).toBe('archived');
    expect(slot2After?.getAttribute('data-view-id')).toBe('new-change');
    expect(slot3After?.getAttribute('data-view-id')).toBe('diffs');
  });

  it('permite colapsar el contenido del panel mediante la sección desplegable y reabrirlo', () => {
    const onToggle = vi.fn();
    const views: ViewSwitcherItem[] = [
      { id: 'archived', label: 'Archivados', slotIndex: 1 },
    ];

    const { rerender } = render(
      <ViewSwitcherRail
        views={views}
        activeViewId="in-progress"
        onSwitchView={() => undefined}
        isCollapsed={false}
        onToggleCollapse={onToggle}
        ariaLabel="Vistas"
      />,
    );

    const sectionToggleBtn = screen.getByRole('button', { name: /Vistas/ });
    expect(sectionToggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /Archivados/ })).toBeTruthy();

    fireEvent.click(sectionToggleBtn);
    expect(onToggle).toHaveBeenCalled();

    // Rerender colapsado
    rerender(
      <ViewSwitcherRail
        views={views}
        activeViewId="in-progress"
        onSwitchView={() => undefined}
        isCollapsed={true}
        onToggleCollapse={onToggle}
        ariaLabel="Vistas"
      />,
    );

    expect(sectionToggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: /Archivados/ })).toBeNull();
  });
});
