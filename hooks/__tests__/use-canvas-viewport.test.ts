// @vitest-environment jsdom
import { createElement, useEffect } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasViewport } from '../use-canvas-viewport';
import type { ViewportState } from '@/lib/canvas-viewport';

/**
 * Cuadros bajo control del test.
 *
 * Lo que se verifica es *cuándo* se aplica el encuadre, así que dejar que los
 * cuadros los agende el navegador haría la prueba dependiente del timing real.
 */
let frames: FrameRequestCallback[] = [];
let requestCount = 0;

const runFrame = () => {
  const pending = frames;
  frames = [];
  act(() => {
    for (const callback of pending) callback(0);
  });
};

beforeEach(() => {
  frames = [];
  requestCount = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    requestCount += 1;
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
    if (frames[handle - 1]) frames[handle - 1] = () => undefined;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Api = ReturnType<typeof useCanvasViewport>;

let api: Api;
let viewports: ViewportState[] = [];

// Sin JSX: `vitest.config.ts` sólo incluye `.test.ts` bajo `hooks/__tests__`.
function Harness() {
  // `padding: 0` deja el rango de `constrainViewport` en [-worldSize, viewportSize],
  // así los desplazamientos de estas pruebas no chocan el límite y lo que se
  // observa es la coalescencia y no el recorte.
  const value = useCanvasViewport({
    worldWidth: 4000,
    worldHeight: 3000,
    padding: 0,
    minScale: 0.1,
    maxScale: 8,
  });

  // La captura va en effects y no en el cuerpo del render: escribir afuera
  // durante el render es el side effect que `react-hooks/globals` prohíbe.
  useEffect(() => { api = value; });
  // La dependencia es el encuadre, no el render: `setIsDragging` también
  // rerenderiza, y contarlo mediría renders en vez de encuadres aplicados.
  useEffect(() => { viewports.push(value.viewport); }, [value.viewport]);

  return createElement('div', { ref: value.containerRef });
}

function mount() {
  viewports = [];
  const utils = render(createElement(Harness));
  // Lo aplicado durante el montaje no es objeto de estas pruebas.
  viewports = [];
  return utils;
}

/** Arranca un arrastre en el origen. */
function startDrag() {
  act(() => {
    api.handleMouseDown({
      button: 0,
      clientX: 0,
      clientY: 0,
      preventDefault: () => undefined,
    } as unknown as Parameters<Api['handleMouseDown']>[0]);
  });
}

function moveTo(x: number, y: number) {
  act(() => {
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
  });
}

describe('useCanvasViewport · coalescencia por cuadro', () => {
  it('applies one viewport update per frame, with the last position', () => {
    mount();
    startDrag();

    const before = requestCount;
    moveTo(10, 10);
    moveTo(30, 30);
    moveTo(50, 50);

    // Tres eventos, un solo cuadro agendado y ningún estado aplicado todavía.
    expect(requestCount - before).toBe(1);
    expect(viewports).toHaveLength(0);

    runFrame();

    expect(viewports).toHaveLength(1);
    expect(viewports[0]).toMatchObject({ offsetX: 50, offsetY: 50 });
  });

  it('keeps advancing across frames without skipping any', () => {
    mount();
    startDrag();

    moveTo(10, 10);
    runFrame();
    moveTo(80, 40);
    runFrame();

    expect(viewports.map(({ offsetX }) => offsetX)).toEqual([10, 80]);
  });

  it('accumulates two wheel steps in the same frame instead of cancelling one out', () => {
    const { container } = mount();
    const target = container.firstChild as HTMLElement;

    const wheel = () => act(() => {
      target.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -100, clientX: 0, clientY: 0, cancelable: true,
      }));
    });

    wheel();
    wheel();
    runFrame();

    // Cada paso multiplica por 1.08 sobre el resultado del anterior. Si el
    // segundo evento leyera el último valor *aplicado*, la escala sería 1.08.
    expect(viewports).toHaveLength(1);
    expect(viewports[0].scale).toBeCloseTo(1.08 * 1.08, 5);
  });

  it('lets a reset discard the pending frame instead of being overwritten by it', () => {
    mount();
    startDrag();
    moveTo(120, 90);

    act(() => api.resetViewport());
    const afterReset = viewports[viewports.length - 1];

    runFrame();

    expect(viewports[viewports.length - 1]).toEqual(afterReset);
    expect(afterReset).not.toMatchObject({ offsetX: 120, offsetY: 90 });
  });

  it('keeps the last position when the drag ends before the frame runs', () => {
    mount();
    startDrag();
    moveTo(70, 25);

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(viewports[viewports.length - 1]).toMatchObject({ offsetX: 70, offsetY: 25 });
  });

  it('does not apply state after unmounting with a pending frame', () => {
    const { unmount } = mount();
    startDrag();
    moveTo(40, 40);

    unmount();
    const applied = viewports.length;
    runFrame();

    expect(viewports).toHaveLength(applied);
  });
});
