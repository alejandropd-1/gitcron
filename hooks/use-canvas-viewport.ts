'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
}

export function useCanvasViewport({
  worldWidth,
  worldHeight,
  initialScale = 1.0,
  minScale = 0.2,
  maxScale = 5.0,
  padding = 100,
  initialWorldFocusX,
  initialWorldFocusY,
}: UseCanvasViewportOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewport, setViewport] = useState<ViewportState>({
    offsetX: 0,
    offsetY: 0,
    scale: initialScale,
  });

  // Track viewport state in a ref to avoid stale closure issues in DOM listeners
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Expose reset callback
  const resetViewport = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setViewport({
        offsetX: 0,
        offsetY: 0,
        scale: initialScale,
      });
      return;
    }

    const viewportWidth = container.clientWidth || 800;
    const viewportHeight = container.clientHeight || 520;

    const focusX = initialWorldFocusX ?? worldWidth / 2;
    const focusY = initialWorldFocusY ?? worldHeight / 2;
    const initialOffsetX = viewportWidth / 2 - focusX * initialScale;
    const initialOffsetY = viewportHeight / 2 - focusY * initialScale;

    setViewport(
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
  }, [worldWidth, worldHeight, initialScale, padding, initialWorldFocusX, initialWorldFocusY]);

  const hasInitialized = useRef(false);

  // Reset initialization flag when repo world dimensions change
  useEffect(() => {
    hasInitialized.current = false;
  }, [worldWidth, worldHeight]);

  // Dynamically center the viewport once container is measured and laid out
  useEffect(() => {
    if (hasInitialized.current) return;

    const container = containerRef.current;
    if (!container) return;

    const viewportWidth = container.clientWidth || 0;
    const viewportHeight = container.clientHeight || 0;

    if (viewportWidth > 0 && viewportHeight > 0) {
      const focusX = initialWorldFocusX ?? worldWidth / 2;
      const focusY = initialWorldFocusY ?? worldHeight / 2;
      const initialOffsetX = viewportWidth / 2 - focusX * initialScale;
      const initialOffsetY = viewportHeight / 2 - focusY * initialScale;

      setViewport(
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
      hasInitialized.current = true;
    }
  }, [worldWidth, worldHeight, initialScale, padding, initialWorldFocusX, initialWorldFocusY]);


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

      setViewport((current) => {
        const next = zoomAtPoint(
          centerPoint,
          current,
          factor,
          minScale,
          maxScale
        );
        return constrainViewport(
          next,
          worldWidth,
          worldHeight,
          viewportWidth,
          viewportHeight,
          padding
        );
      });
    },
    [worldWidth, worldHeight, minScale, maxScale, padding]
  );

  const zoomIn = useCallback(() => zoomDiscrete(1.2), [zoomDiscrete]);
  const zoomOut = useCallback(() => zoomDiscrete(1 / 1.2), [zoomDiscrete]);

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

        setViewport(constrained);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [worldWidth, worldHeight, padding]
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

      setViewport(constrained);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [worldWidth, worldHeight, minScale, maxScale, padding]);

  return {
    viewport,
    containerRef,
    isDragging,
    handleMouseDown,
    resetViewport,
    zoomIn,
    zoomOut,
  };
}
