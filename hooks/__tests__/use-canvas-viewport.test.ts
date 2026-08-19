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

describe('useCanvasViewport · preservación del centro ante redimensionado del contenedor', () => {
  let resizeCallbacks: Array<() => void> = [];

  class MockResizeObserver {
    private cb: () => void;
    constructor(cb: () => void) {
      this.cb = cb;
      resizeCallbacks.push(cb);
    }
    observe() {}
    unobserve() {}
    disconnect() {
      resizeCallbacks = resizeCallbacks.filter((c) => c !== this.cb);
    }
  }

  beforeEach(() => {
    resizeCallbacks = [];
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserva el punto de mundo que ocupaba el centro al cambiar el ancho del contenedor', () => {
    let clientWidth = 1000;
    let clientHeight = 600;

    function ResizableHarness() {
      const value = useCanvasViewport({
        worldWidth: 4000,
        worldHeight: 3000,
        initialScale: 1,
        initialWorldFocusX: 2000,
        initialWorldFocusY: 1500,
        padding: 0,
      });

      useEffect(() => { api = value; });
      useEffect(() => { viewports.push(value.viewport); }, [value.viewport]);

      return createElement('div', {
        ref: (el: HTMLDivElement | null) => {
          if (el) {
            Object.defineProperty(el, 'clientWidth', { get: () => clientWidth, configurable: true });
            Object.defineProperty(el, 'clientHeight', { get: () => clientHeight, configurable: true });
          }
          (value.containerRef as any).current = el;
        },
      });
    }

    render(createElement(ResizableHarness));

    // Inicialmente: ancho 1000, alto 600.
    // initialWorldFocusX = 2000, initialWorldFocusY = 1500.
    // Centro del área visible en pantalla: (500, 300).
    const initialVp = api.viewport;
    const initialCenterWorldX = (1000 / 2 - initialVp.offsetX) / initialVp.scale;
    const initialCenterWorldY = (600 / 2 - initialVp.offsetY) / initialVp.scale;
    expect(initialCenterWorldX).toBeCloseTo(2000, 1);
    expect(initialCenterWorldY).toBeCloseTo(1500, 1);

    // Simular que el panel lateral derecho se despliega o se ensancha, reduciendo el ancho del contenedor a 700px
    act(() => {
      clientWidth = 700;
      for (const cb of resizeCallbacks) cb();
    });

    // Nuevo centro en pantalla: 700 / 2 = 350px.
    // El punto de mundo que antes estaba en el centro (2000) debe seguir en el centro de los 700px.
    const resizedVp = api.viewport;
    const newCenterWorldX = (700 / 2 - resizedVp.offsetX) / resizedVp.scale;
    const newCenterWorldY = (600 / 2 - resizedVp.offsetY) / resizedVp.scale;

    expect(newCenterWorldX).toBeCloseTo(2000, 1);
    expect(newCenterWorldY).toBeCloseTo(1500, 1);
  });

  it('preserva el punto de mundo en el centro cuando el encuadre fue desplazado por el usuario', () => {
    let clientWidth = 800;
    let clientHeight = 600;

    function ResizableHarness() {
      const value = useCanvasViewport({
        worldWidth: 4000,
        worldHeight: 3000,
        initialScale: 1,
        initialWorldFocusX: 2000,
        initialWorldFocusY: 1500,
        padding: 0,
      });

      useEffect(() => { api = value; });

      return createElement('div', {
        ref: (el: HTMLDivElement | null) => {
          if (el) {
            Object.defineProperty(el, 'clientWidth', { get: () => clientWidth, configurable: true });
            Object.defineProperty(el, 'clientHeight', { get: () => clientHeight, configurable: true });
          }
          (value.containerRef as any).current = el;
        },
      });
    }

    render(createElement(ResizableHarness));

    // El usuario enfoca explícitamente en el punto de mundo (3200, 2100)
    act(() => {
      api.focusWorldPoint({ x: 3200, y: 2100 });
    });

    const vpBefore = api.viewport;
    const centerBeforeX = (800 / 2 - vpBefore.offsetX) / vpBefore.scale;
    const centerBeforeY = (600 / 2 - vpBefore.offsetY) / vpBefore.scale;
    expect(centerBeforeX).toBeCloseTo(3200, 1);
    expect(centerBeforeY).toBeCloseTo(2100, 1);

    // El usuario pliega el panel lateral, el contenedor se expande de 800px a 1100px
    act(() => {
      clientWidth = 1100;
      for (const cb of resizeCallbacks) cb();
    });

    const vpAfter = api.viewport;
    const centerAfterX = (1100 / 2 - vpAfter.offsetX) / vpAfter.scale;
    const centerAfterY = (600 / 2 - vpAfter.offsetY) / vpAfter.scale;

    // El punto enfocado por el usuario (3200, 2100) sigue exactamente en el centro
    expect(centerAfterX).toBeCloseTo(3200, 1);
    expect(centerAfterY).toBeCloseTo(2100, 1);
  });

  it('varias notificaciones consecutivas de tamaño dejan el centro en el mismo lugar que una directa (sin rebote)', () => {
    let clientWidthA = 1000;
    let clientHeightA = 600;
    let apiA: Api = null as any;

    let clientWidthB = 1000;
    let clientHeightB = 600;
    let apiB: Api = null as any;

    let resizeCallbacksA: Array<() => void> = [];
    let resizeCallbacksB: Array<() => void> = [];

    // Harness A: arranca en 1000px con focusX: 1200, transiciona a 400px (donde recorta a -900) y vuelve a 1000px
    function HarnessA() {
      const value = useCanvasViewport({
        worldWidth: 1000,
        worldHeight: 800,
        initialScale: 1,
        initialWorldFocusX: 1200,
        initialWorldFocusY: 400,
        padding: 100,
      });
      useEffect(() => { apiA = value; });
      return createElement('div', {
        ref: (el: HTMLDivElement | null) => {
          if (el) {
            Object.defineProperty(el, 'clientWidth', { get: () => clientWidthA, configurable: true });
            Object.defineProperty(el, 'clientHeight', { get: () => clientHeightA, configurable: true });
          }
          (value.containerRef as any).current = el;
        },
      });
    }

    // Harness B: arranca en 1000px y permanece en 1000px con el mismo foco
    function HarnessB() {
      const value = useCanvasViewport({
        worldWidth: 1000,
        worldHeight: 800,
        initialScale: 1,
        initialWorldFocusX: 1200,
        initialWorldFocusY: 400,
        padding: 100,
      });
      useEffect(() => { apiB = value; });
      return createElement('div', {
        ref: (el: HTMLDivElement | null) => {
          if (el) {
            Object.defineProperty(el, 'clientWidth', { get: () => clientWidthB, configurable: true });
            Object.defineProperty(el, 'clientHeight', { get: () => clientHeightB, configurable: true });
          }
          (value.containerRef as any).current = el;
        },
      });
    }

    clientWidthA = 1000;
    clientWidthB = 1000;

    const { unmount: unmountA } = render(createElement(HarnessA));
    resizeCallbacksA = [...resizeCallbacks];
    resizeCallbacks = [];

    // Transición consecutiva de un panel (700, 400, 700, 1000)
    for (const stepWidth of [700, 400, 700, 1000]) {
      act(() => {
        clientWidthA = stepWidth;
        for (const cb of resizeCallbacksA) cb();
      });
    }
    const finalVpA = apiA.viewport;
    unmountA();

    // Notificación directa en 1000
    resizeCallbacks = [];
    const { unmount: unmountB } = render(createElement(HarnessB));

    const finalVpB = apiB.viewport;
    unmountB();

    // Ambas deben coincidir exactamente: la transición consecutiva no debe contaminar el centro
    expect(finalVpA.offsetX).toBeCloseTo(finalVpB.offsetX, 4);
    expect(finalVpA.offsetY).toBeCloseTo(finalVpB.offsetY, 4);

    // Y el centro en mundo debe seguir siendo exactamente 1200
    const centerWorldX = (1000 / 2 - finalVpA.offsetX) / finalVpA.scale;
    expect(centerWorldX).toBeCloseTo(1200, 1);
  });

  it('preserveViewportOnWorldResize respeta si recentrar o conservar encuadre al cambiar tamaño del mundo', () => {
    let currentWorldWidth = 4000;
    let currentWorldHeight = 3000;

    // Con preserveViewportOnWorldResize = false (comportamiento clásico): recentra
    function ClassicHarness() {
      const value = useCanvasViewport({
        worldWidth: currentWorldWidth,
        worldHeight: currentWorldHeight,
        preserveViewportOnWorldResize: false,
        initialScale: 1,
        initialWorldFocusX: 2000,
        initialWorldFocusY: 1500,
        padding: 0,
      });
      useEffect(() => { api = value; });
      return createElement('div', {
        ref: (el: HTMLDivElement | null) => {
          if (el) {
            Object.defineProperty(el, 'clientWidth', { get: () => 1000, configurable: true });
            Object.defineProperty(el, 'clientHeight', { get: () => 600, configurable: true });
          }
          (value.containerRef as any).current = el;
        },
      });
    }

    const { rerender, unmount } = render(createElement(ClassicHarness));

    // El usuario desplaza el encuadre a (3500, 2500)
    act(() => {
      api.focusWorldPoint({ x: 3500, y: 2500 });
    });
    expect(api.viewport.offsetX).toBe(1000 / 2 - 3500);

    // Cambia el tamaño del mundo: al no preservar, se recentra a initialWorldFocusX (2000)
    currentWorldWidth = 6000;
    rerender(createElement(ClassicHarness));
    expect(api.viewport.offsetX).toBe(1000 / 2 - 2000);

    unmount();
  });

  it('2.14 · reproduce la secuencia de notificaciones del panel izquierdo (840 a 1100) preservando el centro', () => {
    let clientWidth = 840;
    let clientHeight = 750;
    let localApi: Api = null as any;

    function LeftPanelTransitionHarness() {
      const value = useCanvasViewport({
        worldWidth: 5000,
        worldHeight: 2500,
        initialScale: 1.0,
        minScale: 0.25,
        maxScale: 3.5,
        padding: 120,
        initialWorldFocusX: 4720,
        initialWorldFocusY: 172,
        topSafeOffset: 96,
        preserveViewportOnWorldResize: true,
        resetKey: 'repo-1',
      });
      useEffect(() => { localApi = value; });
      return createElement('div', {
        ref: (el: HTMLDivElement | null) => {
          if (el) {
            Object.defineProperty(el, 'clientWidth', { get: () => clientWidth, configurable: true });
            Object.defineProperty(el, 'clientHeight', { get: () => clientHeight, configurable: true });
          }
          (value.containerRef as any).current = el;
        },
      });
    }

    const { unmount } = render(createElement(LeftPanelTransitionHarness));
    const capturedCallbacks = [...resizeCallbacks];
    resizeCallbacks = [];

    // Secuencia real capturada al plegar el panel izquierdo (260px -> 0px)
    const leftTransitionWidths = [862, 905, 960, 1015, 1060, 1088, 1100];

    for (const w of leftTransitionWidths) {
      act(() => {
        clientWidth = w;
        for (const cb of capturedCallbacks) cb();
      });

      // En cada paso de la transición, el punto central de mundo debe preservarse exactamente
      const currentVp = localApi.viewport;
      const visibleCenterWorldX = (w / 2 - currentVp.offsetX) / currentVp.scale;
      expect(visibleCenterWorldX).toBeCloseTo(4720, 1);
    }

    // Offset final exacto a 1100px: 1100 / 2 - 4720 = 550 - 4720 = -4170
    expect(localApi.viewport.offsetX).toBeCloseTo(-4170, 1);

    unmount();
  });

  it('2.16 · la transformación se escribe directamente sobre el elemento en el mismo cuadro de la notificación de resize', () => {
    let clientWidth = 840;
    let clientHeight = 750;
    let localApi: Api = null as any;
    let gElement: Element | null = null;

    function DirectTransformHarness() {
      const value = useCanvasViewport({
        worldWidth: 5000,
        worldHeight: 2500,
        initialScale: 1.0,
        minScale: 0.25,
        maxScale: 3.5,
        padding: 120,
        initialWorldFocusX: 4720,
        initialWorldFocusY: 172,
        topSafeOffset: 96,
        preserveViewportOnWorldResize: true,
        resetKey: 'repo-1',
      });
      useEffect(() => { localApi = value; });
      return createElement(
        'div',
        {
          ref: (el: HTMLDivElement | null) => {
            if (el) {
              Object.defineProperty(el, 'clientWidth', { get: () => clientWidth, configurable: true });
              Object.defineProperty(el, 'clientHeight', { get: () => clientHeight, configurable: true });
            }
            (value.containerRef as any).current = el;
          },
        },
        createElement('svg', null,
          createElement('g', {
            ref: (el: any) => {
              gElement = el;
              (value.contentRef as any).current = el;
            },
            transform: `translate(${value.viewport.offsetX}, ${value.viewport.offsetY}) scale(${value.viewport.scale})`,
          })
        )
      );
    }

    const { unmount } = render(createElement(DirectTransformHarness));
    const capturedCallbacks = [...resizeCallbacks];
    resizeCallbacks = [];

    // Estado inicial en 840px: transform es translate(-4300, 251) scale(1)
    expect((gElement as Element | null)?.getAttribute('transform')).toBe('translate(-4300, 251) scale(1)');

    // Cambio de tamaño a 1100px: se dispara el callback del ResizeObserver dentro de act
    clientWidth = 1100;
    act(() => {
      for (const cb of capturedCallbacks) {
        cb();
        // En el MISMO CUADRO de la notificación, el nodo DOM tiene la transformación escrita directamente
        expect((gElement as Element | null)?.getAttribute('transform')).toBe('translate(-4170, 251) scale(1)');
      }
    });

    // Al completarse el ciclo, el estado de React coincide exactamente con el transform del nodo
    expect(localApi.viewport.offsetX).toBe(-4170);
    expect(localApi.viewport.offsetY).toBe(251);
    expect(localApi.viewport.scale).toBe(1);

    unmount();
  });
});
