/**
 * Canvas Viewport Math Utilities
 *
 * Pure, highly testable mathematical functions for 2D viewport pan and zoom transforms.
 */

export interface ViewportState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Transforms container screen coordinates to world canvas coordinates.
 */
export function screenToWorld(
  screenPoint: Point,
  viewport: ViewportState
): Point {
  return {
    x: (screenPoint.x - viewport.offsetX) / viewport.scale,
    y: (screenPoint.y - viewport.offsetY) / viewport.scale,
  };
}

/**
 * Transforms world canvas coordinates to container screen coordinates.
 */
export function worldToScreen(
  worldPoint: Point,
  viewport: ViewportState
): Point {
  return {
    x: worldPoint.x * viewport.scale + viewport.offsetX,
    y: worldPoint.y * viewport.scale + viewport.offsetY,
  };
}

/**
 * Computes the new ViewportState after scaling around a screen-space anchor point.
 * Ensures the scale stays within [minScale, maxScale] and keeps the point in world coordinates stable.
 */
export function zoomAtPoint(
  anchorScreenPoint: Point,
  viewport: ViewportState,
  zoomFactor: number,
  minScale: number = 0.2,
  maxScale: number = 5.0
): ViewportState {
  const newScale = Math.max(minScale, Math.min(maxScale, viewport.scale * zoomFactor));

  // Determine world coordinates under the cursor before zoom
  const worldAnchor = screenToWorld(anchorScreenPoint, viewport);

  // Compute new offset coordinates so that world anchor matches original screen coordinates
  const newOffsetX = anchorScreenPoint.x - worldAnchor.x * newScale;
  const newOffsetY = anchorScreenPoint.y - worldAnchor.y * newScale;

  return {
    offsetX: newOffsetX,
    offsetY: newOffsetY,
    scale: newScale,
  };
}

/**
 * Constrains viewport offsets to keep at least a fraction of the world canvas visible inside the viewport.
 */
export function constrainViewport(
  viewport: ViewportState,
  worldWidth: number,
  worldHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 100
): ViewportState {
  // Clamp offsetX so that:
  // - Right boundary (worldWidth * scale + offsetX) >= padding
  // - Left boundary (offsetX) <= viewportWidth - padding
  const minOffsetX = padding - worldWidth * viewport.scale;
  const maxOffsetX = viewportWidth - padding;

  // Clamp offsetY so that:
  // - Bottom boundary (worldHeight * scale + offsetY) >= padding
  // - Top boundary (offsetY) <= viewportHeight - padding
  const minOffsetY = padding - worldHeight * viewport.scale;
  const maxOffsetY = viewportHeight - padding;

  // Protect against edge cases where viewport calculations produce inverted boundaries
  const constrainedOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, viewport.offsetX));
  const constrainedOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, viewport.offsetY));

  return {
    offsetX: constrainedOffsetX,
    offsetY: constrainedOffsetY,
    scale: viewport.scale,
  };
}
