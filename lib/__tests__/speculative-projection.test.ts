// lib/__tests__/speculative-projection.test.ts
import { describe, it, expect } from 'vitest';
import {
  projectSpeculative,
  speculativeOpacity,
  diagonalBasis,
  type SpeculativeBranch,
} from '../speculative-projection';
import type { ProjectionConfig } from '../chronometric-projection';

const config: ProjectionConfig = {
  width: 1100,
  height: 950,
  minTime: 0,
  maxTime: 1000,
  paddingLeft: 100,
  paddingRight: 100,
  paddingTop: 100,
  paddingBottom: 100,
  fanFactor: 38,
  totalCommits: 10,
};

// HEAD/present near the top-right end of the diagonal.
const present = { x: config.width - config.paddingRight, y: config.paddingTop };

const specs: SpeculativeBranch[] = [
  { id: 's1', message: 'Add code signing', type: 'improvement', confidence: 0.9 },
  { id: 's2', message: 'WASM diff engine', type: 'breakthrough', confidence: 0.4 },
  { id: 's3', message: 'AI commit summaries', type: 'trend', confidence: 0.6 },
];

describe('diagonalBasis', () => {
  it('points up-right (ux>0, uy<0) and yields a perpendicular', () => {
    const { ux, uy, nx, ny } = diagonalBasis(config);
    expect(ux).toBeGreaterThan(0);
    expect(uy).toBeLessThan(0); // ascending
    // perpendicular is orthogonal to the direction
    expect(ux * nx + uy * ny).toBeCloseTo(0, 6);
  });
});

describe('projectSpeculative', () => {
  const nodes = projectSpeculative(specs, present, config);

  it('projects every branch and anchors all to HEAD', () => {
    expect(nodes).toHaveLength(3);
    for (const n of nodes) {
      expect(n.anchorX).toBe(present.x);
      expect(n.anchorY).toBe(present.y);
    }
  });

  it('places nodes in the future: further right and higher than HEAD', () => {
    for (const n of nodes) {
      expect(n.x).toBeGreaterThan(present.x); // future = further right
      expect(n.y).toBeLessThan(present.y); // and higher up
    }
  });

  it('fans out with alternating lanes (+1, -1, +2 …)', () => {
    expect(nodes[0].branchIndex).toBe(1);
    expect(nodes[1].branchIndex).toBe(-1);
    expect(nodes[2].branchIndex).toBe(2);
  });

  it('higher confidence reaches further into the future', () => {
    const high = projectSpeculative(
      [{ id: 'h', message: 'x', type: 'improvement', confidence: 1 }],
      present,
      config,
    )[0];
    const low = projectSpeculative(
      [{ id: 'l', message: 'x', type: 'improvement', confidence: 0 }],
      present,
      config,
    )[0];
    const distHigh = Math.hypot(high.x - present.x, high.y - present.y);
    const distLow = Math.hypot(low.x - present.x, low.y - present.y);
    expect(distHigh).toBeGreaterThan(distLow);
  });
});

describe('speculativeOpacity', () => {
  it('stays faint (never fully opaque) and rises with confidence', () => {
    expect(speculativeOpacity(0)).toBeCloseTo(0.2);
    expect(speculativeOpacity(1)).toBeCloseTo(0.75);
    expect(speculativeOpacity(1)).toBeLessThan(1); // real commits stay distinct
  });
});
