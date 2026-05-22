import { describe, it, expect } from 'vitest';
import {
  screenToWorld,
  worldToScreen,
  zoomAtPoint,
  constrainViewport,
} from '../canvas-viewport';

describe('Canvas Viewport Math', () => {
  it('should transform coordinates back and forth correctly', () => {
    const viewport = { offsetX: 150, offsetY: 75, scale: 1.5 };
    const worldPoint = { x: 300, y: 200 };

    // 1. World to Screen
    const screenPoint = worldToScreen(worldPoint, viewport);
    expect(screenPoint.x).toBe(300 * 1.5 + 150); // 600
    expect(screenPoint.y).toBe(200 * 1.5 + 75);  // 375

    // 2. Screen to World
    const reconstructedWorldPoint = screenToWorld(screenPoint, viewport);
    expect(reconstructedWorldPoint.x).toBeCloseTo(300);
    expect(reconstructedWorldPoint.y).toBeCloseTo(200);
  });

  it('should zoom at a specific screen anchor point correctly', () => {
    const viewport = { offsetX: 0, offsetY: 0, scale: 1.0 };
    const anchor = { x: 500, y: 300 };

    // Zoom in by factor of 2 (scale 1.0 -> 2.0)
    const newViewport = zoomAtPoint(anchor, viewport, 2.0);
    expect(newViewport.scale).toBe(2.0);

    // Verify that the anchor screen point maps to the EXACT same world coordinates before and after zoom
    const worldAnchorBefore = screenToWorld(anchor, viewport);
    const worldAnchorAfter = screenToWorld(anchor, newViewport);

    expect(worldAnchorBefore.x).toBeCloseTo(worldAnchorAfter.x);
    expect(worldAnchorBefore.y).toBeCloseTo(worldAnchorAfter.y);

    // Since initial state is origin 0,0 scale 1.0, anchor x=500 is world x=500.
    // At scale 2.0, screen point for world 500 should still be 500.
    // screenX = 500 * 2.0 + offsetX = 500 => offsetX = -500.
    expect(newViewport.offsetX).toBe(-500);
    expect(newViewport.offsetY).toBe(-300);
  });

  it('should respect scale limits during zoom', () => {
    const viewport = { offsetX: 10, offsetY: 20, scale: 4.8 };
    const anchor = { x: 100, y: 100 };

    // Attempting to zoom in by 2x should exceed maxScale (5.0), clamping to 5.0
    const clampedIn = zoomAtPoint(anchor, viewport, 2.0, 0.2, 5.0);
    expect(clampedIn.scale).toBe(5.0);

    // Attempting to zoom out by 0.01x should exceed minScale (0.2), clamping to 0.2
    const clampedOut = zoomAtPoint(anchor, viewport, 0.01, 0.2, 5.0);
    expect(clampedOut.scale).toBe(0.2);
  });

  it('should constrain viewport offsets to keep boundaries visible', () => {
    const viewport = { offsetX: 2000, offsetY: 2000, scale: 1.0 };
    const worldWidth = 3000;
    const worldHeight = 520;
    const viewportWidth = 1200;
    const viewportHeight = 600;
    const padding = 100;

    // With offsetX = 2000 and viewportWidth = 1200, the graph is entirely shifted right out of bounds.
    // maxOffsetX = viewportWidth - padding = 1100.
    // constrainViewport should clamp offsetX to 1100.
    const constrained = constrainViewport(
      viewport,
      worldWidth,
      worldHeight,
      viewportWidth,
      viewportHeight,
      padding
    );

    expect(constrained.offsetX).toBeLessThanOrEqual(1100);
    expect(constrained.offsetY).toBeLessThanOrEqual(500);

    // If offset is panned extremely far left:
    const farLeftViewport = { offsetX: -4000, offsetY: -1000, scale: 1.0 };
    // minOffsetX = padding - worldWidth = 100 - 3000 = -2900.
    const constrainedLeft = constrainViewport(
      farLeftViewport,
      worldWidth,
      worldHeight,
      viewportWidth,
      viewportHeight,
      padding
    );

    expect(constrainedLeft.offsetX).toBe(-2900);
  });
});
