'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  type ViewportState,
  type Point,
  zoomAtPoint,
  constrainViewport,
} from '@/lib/canvas-viewport';

interface UseCanvasViewportOptions {
  worldWidth: number;
  worldHeight: number;
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  padding?: number;
  initialWorldFocusX?: number;
  initialWorldFocusY?: number;
  topSafeOffset?: number;
  preserveViewportOnWorldResize?: boolean;
  resetKey?: string | number | null;
}

export function useCanvasViewport<T extends SVGElement | HTMLElement = SVGGElement>({
  worldWidth,
  worldHeight,
  initialScale = 1.0,
  minScale = 0.2,
  maxScale = 5.0,
  padding = 100,
  initialWorldFocusX,
  initialWorldFocusY,
  topSafeOffset = 0,
  preserveViewportOnWorldResize = false,
  resetKey = null,
}: UseCanvasViewportOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<T | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewport, setViewport] = useState<ViewportState>({
    offsetX: 0,
    offsetY: 0,
    scale: initialScale,
  });

  // Escribe la transformación directamente sobre el elemento DOM en el mismo cuadro de la notificación
  const applyDirectTransform = useCallback((next: ViewportState) => {
    const el = contentRef.current;
    if (!el) return;
    const transformStr = `translate(${next.offsetX}, ${next.offsetY}) scale(${next.scale})`;
    if (el instanceof SVGElement) {
      el.setAttribute('transform', transformStr);
    } else {
      (el as HTMLElement).style.transform = transformStr;
    }
  }, []);

  // Track viewport state in a ref to avoid stale closure issues in DOM listeners.
  // Los caminos de alta frecuencia lo adelantan al valor recién calculado, así que
  // este effect suele escribir el mismo valor que el handler ya escribió: es
  // idempotente y no una segunda fuente de verdad.
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const previousDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const currentCenterWorldRef = useRef<{ x: number; y: number } | null>(null);

  const updateCenterWorldPoint = useCallback((vp: ViewportState) => {
    const container = containerRef.current;
    if (!container) return;
    const viewportWidth = container.clientWidth || 800;
    const viewportHeight = container.clientHeight || 520;
    const focusHeight = viewportHeight - topSafeOffset;
    const centerX = viewportWidth / 2;
    const centerY = topSafeOffset + focusHeight / 2;
    currentCenterWorldRef.current = {
      x: (centerX - vp.offsetX) / vp.scale,
      y: (centerY - vp.offsetY) / vp.scale,
    };
  }, [topSafeOffset]);

  /**
   * Último encuadre calculado que todavía no se aplicó al estado.
   *
   * Arrastre y rueda emiten muchos más eventos por segundo que cuadros puede
   * pintar el navegador —un mouse llega a 1000 Hz—, así que aplicar estado por
   * evento produce renders que se descartan y un gesto que tironea. El cálculo
   * sigue siendo síncrono y por evento; lo único que se difiere es el `setState`.
   */
  const pendingViewportRef = useRef<ViewportState | null>(null);
  const frameRef = useRef<number | null>(null);

  const cancelPendingFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingViewportRef.current = null;
  }, []);

  /** Encola un encuadre de gesto: a lo sumo uno por cuadro, con el último valor. */
  const scheduleViewport = useCallback((next: ViewportState) => {
    // El ref se adelanta al estado para que el evento siguiente encadene sobre
    // este valor. Sin esto, dos pasos de rueda en el mismo cuadro leerían ambos
    // el último valor *aplicado* y el segundo anularía al primero.
    viewportRef.current = next;
    pendingViewportRef.current = next;
    updateCenterWorldPoint(next);
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const pending = pendingViewportRef.current;
      pendingViewportRef.current = null;
      if (pending) setViewport(pending);
    });
  }, [updateCenterWorldPoint]);

  /**
   * Aplica un encuadre puntual de inmediato y descarta el cuadro pendiente.
   *
   * Un reinicio o un centrado no pueden quedar pisados por un valor calculado
   * antes que ellos: el cuadro agendado se resolvería después y devolvería el
   * encuadre al valor viejo, de forma intermitente y dependiente del timing.
   *
   * La base sale de `viewportRef` y no del updater de `setState` porque el ref
   * incluye lo que todavía no se aplicó; calcularla acá además mantiene puro al
   * updater.
   */
  const applyViewportNow = useCallback((compute: (base: ViewportState) => ViewportState) => {
    const base = pendingViewportRef.current ?? viewportRef.current;
    cancelPendingFrame();
    const next = compute(base);
    viewportRef.current = next;
    setViewport(next);
  }, [cancelPendingFrame]);

  /** Aplica ya lo pendiente, para que soltar el gesto no retroceda un cuadro. */
  const flushPendingFrame = useCallback(() => {
    const pending = pendingViewportRef.current;
    cancelPendingFrame();
    if (pending) {
      viewportRef.current = pending;
      setViewport(pending);
    }
  }, [cancelPendingFrame]);

  useEffect(() => cancelPendingFrame, [cancelPendingFrame]);

  // Expose reset callback
  const resetViewport = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      applyViewportNow(() => ({
        offsetX: 0,
        offsetY: 0,
        scale: initialScale,
      }));
      return;
    }

    const viewportWidth = container.clientWidth || 800;
    const viewportHeight = container.clientHeight || 520;

    const focusX = initialWorldFocusX ?? worldWidth / 2;
    const focusY = initialWorldFocusY ?? worldHeight / 2;
    const initialOffsetX = viewportWidth / 2 - focusX * initialScale;
    
    // Shift Y focus down to center in the visible area below the topSafeOffset
    const focusHeight = viewportHeight - topSafeOffset;
    const initialOffsetY = topSafeOffset + focusHeight / 2 - focusY * initialScale;

    previousDimensionsRef.current = { width: viewportWidth, height: viewportHeight };
    currentCenterWorldRef.current = { x: focusX, y: focusY };

    applyViewportNow(() =>
      constrainViewport(
        {
          offsetX: initialOffsetX,
          offsetY: initialOffsetY,
          scale: initialScale,
        },
        worldWidth,
        worldHeight,
        viewportWidth,
        viewportHeight,
        padding
      )
    );
  }, [worldWidth, worldHeight, initialScale, padding, initialWorldFocusX, initialWorldFocusY, topSafeOffset, applyViewportNow]);

  const hasInitialized = useRef(false);
  const previousResetKey = useRef(resetKey);
  const previousWorldSize = useRef({ width: worldWidth, height: worldHeight });

  // Reacciona a cambios del tamaño del mundo (e.g. llegada de commits nuevos).
  // Por omisión, recentra el lienzo. El modo cronométrico opta por no hacerlo
  // (preserveViewportOnWorldResize = true) para que un commit nuevo no salte el encuadre.
  useLayoutEffect(() => {
    const previousSize = previousWorldSize.current;
    previousWorldSize.current = { width: worldWidth, height: worldHeight };

    if (previousResetKey.current !== resetKey) {
      previousResetKey.current = resetKey;
      hasInitialized.current = false;
      previousDimensionsRef.current = null;
      currentCenterWorldRef.current = null;
      return;
    }

    if (previousSize.width === worldWidth && previousSize.height === worldHeight) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const viewportWidth = container.clientWidth || 800;
    const viewportHeight = container.clientHeight || 520;

    if (!preserveViewportOnWorldResize) {
      hasInitialized.current = false;
      const focusX = initialWorldFocusX ?? worldWidth / 2;
      const focusY = initialWorldFocusY ?? worldHeight / 2;
      const initialOffsetX = viewportWidth / 2 - focusX * initialScale;
      const focusHeight = viewportHeight - topSafeOffset;
      const initialOffsetY = topSafeOffset + focusHeight / 2 - focusY * initialScale;

      currentCenterWorldRef.current = { x: focusX, y: focusY };
      previousDimensionsRef.current = { width: viewportWidth, height: viewportHeight };

      applyViewportNow(() =>
        constrainViewport(
          {
            offsetX: initialOffsetX,
            offsetY: initialOffsetY,
            scale: initialScale,
          },
          worldWidth,
          worldHeight,
          viewportWidth,
          viewportHeight,
          padding
        )
      );
      return;
    }

    applyViewportNow((current) =>
      constrainViewport(
        current,
        worldWidth,
        worldHeight,
        viewportWidth,
        viewportHeight,
        padding
      )
    );
  }, [
    worldWidth,
    worldHeight,
    preserveViewportOnWorldResize,
    resetKey,
    initialScale,
    initialWorldFocusX,
    initialWorldFocusY,
    topSafeOffset,
    padding,
    applyViewportNow,
  ]);

  // Observa el tamaño del contenedor del lienzo con ResizeObserver y recalcula el encuadre cuando cambie.
  // Preserva el punto de coordenadas de mundo que ocupaba el centro del área visible antes del cambio.
  // No usa escuchas de tamaño de ventana: el ancho cambia también al plegar un panel o arrastrar un separador.
  useLayoutEffect(() => {
    if (previousResetKey.current !== resetKey) {
      previousResetKey.current = resetKey;
      hasInitialized.current = false;
      previousDimensionsRef.current = null;
      currentCenterWorldRef.current = null;
    }

    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const viewportWidth = container.clientWidth || 0;
      const viewportHeight = container.clientHeight || 0;
      if (viewportWidth === 0 || viewportHeight === 0) return;

      const prevDimensions = previousDimensionsRef.current;

      if (!hasInitialized.current || !prevDimensions) {
        const focusX = initialWorldFocusX ?? worldWidth / 2;
        const focusY = initialWorldFocusY ?? worldHeight / 2;
        const initialOffsetX = viewportWidth / 2 - focusX * initialScale;
        const focusHeight = viewportHeight - topSafeOffset;
        const initialOffsetY = topSafeOffset + focusHeight / 2 - focusY * initialScale;

        currentCenterWorldRef.current = { x: focusX, y: focusY };

        const initial = constrainViewport(
          {
            offsetX: initialOffsetX,
            offsetY: initialOffsetY,
            scale: initialScale,
          },
          worldWidth,
          worldHeight,
          viewportWidth,
          viewportHeight,
          padding
        );

        applyDirectTransform(initial);
        applyViewportNow(() => initial);
        hasInitialized.current = true;
        previousDimensionsRef.current = { width: viewportWidth, height: viewportHeight };
      } else {
        if (prevDimensions.width === viewportWidth && prevDimensions.height === viewportHeight) return;

        const worldCenter = currentCenterWorldRef.current ?? {
          x: initialWorldFocusX ?? worldWidth / 2,
          y: initialWorldFocusY ?? worldHeight / 2,
        };

        const newCenterX = viewportWidth / 2;
        const newFocusHeight = viewportHeight - topSafeOffset;
        const newCenterY = topSafeOffset + newFocusHeight / 2;

        const newOffsetX = newCenterX - worldCenter.x * viewportRef.current.scale;
        const newOffsetY = newCenterY - worldCenter.y * viewportRef.current.scale;

        const next = constrainViewport(
          {
            offsetX: newOffsetX,
            offsetY: newOffsetY,
            scale: viewportRef.current.scale,
          },
          worldWidth,
          worldHeight,
          viewportWidth,
          viewportHeight,
          padding
        );

        // 1. Escribir la transformación directamente sobre el elemento en el mismo cuadro de la notificación
        applyDirectTransform(next);

        // 2. Sincronizar el estado a continuación
        applyViewportNow(() => next);

        previousDimensionsRef.current = { width: viewportWidth, height: viewportHeight };
      }
    };

    handleResize();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(handleResize)
      : null;

    resizeObserver?.observe(container);

    return () => {
      resizeObserver?.disconnect();
    };
  }, [
    worldWidth,
    worldHeight,
    initialScale,
    padding,
    initialWorldFocusX,
    initialWorldFocusY,
    topSafeOffset,
    resetKey,
    applyViewportNow,
  ]);


  // Handles discrete zoom actions (zoom buttons)
  const zoomDiscrete = useCallback(
    (factor: number) => {
      const container = containerRef.current;
      if (!container) return;

      const viewportWidth = container.clientWidth || 800;
      const viewportHeight = container.clientHeight || 520;
      const centerPoint: Point = {
        x: viewportWidth / 2,
        y: viewportHeight / 2,
      };

      previousDimensionsRef.current = { width: viewportWidth, height: viewportHeight };

      applyViewportNow((current) => {
        const next = zoomAtPoint(
          centerPoint,
          current,
          factor,
          minScale,
          maxScale
        );
        const constrained = constrainViewport(
          next,
          worldWidth,
          worldHeight,
          viewportWidth,
          viewportHeight,
          padding
        );
        updateCenterWorldPoint(constrained);
        return constrained;
      });
    },
    [worldWidth, worldHeight, minScale, maxScale, padding, applyViewportNow, updateCenterWorldPoint]
  );

  const zoomIn = useCallback(() => zoomDiscrete(1.2), [zoomDiscrete]);
  const zoomOut = useCallback(() => zoomDiscrete(1 / 1.2), [zoomDiscrete]);

  const focusWorldPoint = useCallback((point: Point) => {
    const container = containerRef.current;
    if (!container) return;

    const viewportWidth = container.clientWidth || 800;
    const viewportHeight = container.clientHeight || 520;
    const focusHeight = viewportHeight - topSafeOffset;

    previousDimensionsRef.current = { width: viewportWidth, height: viewportHeight };
    currentCenterWorldRef.current = { x: point.x, y: point.y };

    applyViewportNow((current) => constrainViewport(
      {
        offsetX: viewportWidth / 2 - point.x * current.scale,
        offsetY: topSafeOffset + focusHeight / 2 - point.y * current.scale,
        scale: current.scale,
      },
      worldWidth,
      worldHeight,
      viewportWidth,
      viewportHeight,
      padding
    ));
  }, [worldWidth, worldHeight, padding, topSafeOffset, applyViewportNow]);

  // Drag Panning Event Handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only pan on left mouse click
      if (e.button !== 0) return;

      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const initialOffset = {
        x: viewportRef.current.offsetX,
        y: viewportRef.current.offsetY,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        const container = containerRef.current;
        if (!container) return;

        const viewportWidth = container.clientWidth || 800;
        const viewportHeight = container.clientHeight || 520;

        const nextViewport = {
          offsetX: initialOffset.x + dx,
          offsetY: initialOffset.y + dy,
          scale: viewportRef.current.scale,
        };

        const constrained = constrainViewport(
          nextViewport,
          worldWidth,
          worldHeight,
          viewportWidth,
          viewportHeight,
          padding
        );

        scheduleViewport(constrained);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        flushPendingFrame();
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [worldWidth, worldHeight, padding, scheduleViewport, flushPendingFrame]
  );

  // Non-passive wheel event listener to support e.preventDefault() in Chromium
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Stop full electron window zooming or container scroll scrolling

      const rect = container.getBoundingClientRect();
      const mousePoint: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Zoom factor calculation based on deltaY direction
      const zoomFactor = e.deltaY < 0 ? 1.08 : 1 / 1.08;

      const viewportWidth = container.clientWidth || 800;
      const viewportHeight = container.clientHeight || 520;

      const nextViewport = zoomAtPoint(
        mousePoint,
        viewportRef.current,
        zoomFactor,
        minScale,
        maxScale
      );

      const constrained = constrainViewport(
        nextViewport,
        worldWidth,
        worldHeight,
        viewportWidth,
        viewportHeight,
        padding
      );

      scheduleViewport(constrained);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [worldWidth, worldHeight, minScale, maxScale, padding, scheduleViewport]);

  return {
    viewport,
    containerRef,
    contentRef,
    isDragging,
    handleMouseDown,
    resetViewport,
    focusWorldPoint,
    zoomIn,
    zoomOut,
  };
}
