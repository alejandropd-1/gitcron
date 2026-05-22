import { describe, it, expect } from 'vitest';
import {
  mapLaneToBranchIndex,
  timeToX,
  branchToOffset,
  projectCommit,
  ProjectionConfig,
  DEFAULT_CHRONOMETRIC_SLOPE,
} from '../chronometric-projection';

describe('DEFAULT_CHRONOMETRIC_SLOPE', () => {
  it('defines a visual slope corresponding to an angle between 35° and 50°', () => {
    expect(DEFAULT_CHRONOMETRIC_SLOPE).toBeDefined();
    expect(typeof DEFAULT_CHRONOMETRIC_SLOPE).toBe('number');
    
    // Calculate angle in degrees: atan(slope) * 180 / PI
    const angleRad = Math.atan(DEFAULT_CHRONOMETRIC_SLOPE);
    const angleDeg = (angleRad * 180) / Math.PI;
    
    expect(angleDeg).toBeGreaterThanOrEqual(35);
    expect(angleDeg).toBeLessThanOrEqual(50);
    expect(DEFAULT_CHRONOMETRIC_SLOPE).toBe(0.85); // 40.4°
  });
});


describe('mapLaneToBranchIndex', () => {
  it('maps sequential lane indices to alternating symmetrical indices', () => {
    expect(mapLaneToBranchIndex(0)).toBe(0);
    expect(mapLaneToBranchIndex(1)).toBe(1);
    expect(mapLaneToBranchIndex(2)).toBe(-1);
    expect(mapLaneToBranchIndex(3)).toBe(2);
    expect(mapLaneToBranchIndex(4)).toBe(-2);
    expect(mapLaneToBranchIndex(5)).toBe(3);
  });

  it('handles negative or invalid values gracefully', () => {
    expect(mapLaneToBranchIndex(-5)).toBe(0);
  });
});

describe('timeToX', () => {
  it('maps minTime to paddingLeft and maxTime to width-paddingRight', () => {
    const range: [number, number] = [1000, 2000];
    const width = 1000;
    const paddingLeft = 100;
    const paddingRight = 100;

    // Single commit at minTime
    const xMin = timeToX(1000, range, 0, 2, width, paddingLeft, paddingRight);
    expect(xMin).toBe(paddingLeft);

    // Single commit at maxTime
    const xMax = timeToX(2000, range, 1, 2, width, paddingLeft, paddingRight);
    expect(xMax).toBe(width - paddingRight);
  });

  it('incorporates sequential index correctly to prevent collisions', () => {
    const range: [number, number] = [1000, 1001]; // very close times
    const width = 1000;
    const paddingLeft = 100;
    const paddingRight = 100;

    // Even if timestamps are almost identical, sequential indices are different
    const x1 = timeToX(1000, range, 0, 3, width, paddingLeft, paddingRight);
    const x2 = timeToX(1000, range, 1, 3, width, paddingLeft, paddingRight);
    const x3 = timeToX(1001, range, 2, 3, width, paddingLeft, paddingRight);

    // Should have substantial separation because of sequential index weighting (70%)
    expect(x2 - x1).toBeGreaterThan(100);
    expect(x3 - x2).toBeGreaterThan(100);
  });
});

describe('branchToOffset', () => {
  it('scales offset by branch index and growth factor', () => {
    const config = {
      fanFactor: 40,
      width: 1000,
      paddingLeft: 100,
      paddingRight: 100,
    };

    // At the start of the diagonal, spacing growth is 0.4
    const offsetStart = branchToOffset(1, 100, config);
    expect(offsetStart).toBeCloseTo(1 * 40 * 0.4);

    // At the end of the diagonal, spacing growth is 1.0
    const offsetEnd = branchToOffset(2, 900, config);
    expect(offsetEnd).toBeCloseTo(2 * 40 * 1.0);
  });
});

describe('projectCommit', () => {
  it('projects commit perpendicularly to the diagonal line', () => {
    const minTime = 1000;
    const maxTime = 2000;
    const config: ProjectionConfig = {
      width: 1000,
      height: 600,
      minTime,
      maxTime,
      paddingLeft: 100,
      paddingRight: 100,
      paddingTop: 50,
      paddingBottom: 50,
      fanFactor: 50,
      totalCommits: 2,
    };

    const commit1 = {
      date: new Date(1000).toISOString(),
      branchIndex: 1,
      chronologicalIndex: 0,
    };

    const result = projectCommit(commit1, config);

    // Base position on the diagonal at the start
    expect(result.baseX).toBe(100);
    expect(result.baseY).toBe(550); // height - paddingBottom = 600 - 50 = 550

    // Since branchIndex = 1, it should deviate perpendicularly
    // Direction is up and left
    expect(result.x).toBeLessThan(result.baseX);
    expect(result.y).toBeLessThan(result.baseY);

    // Verify distance is perpendicular
    const dx = result.x - result.baseX;
    const dy = result.y - result.baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const expectedOffset = branchToOffset(1, 100, {
      fanFactor: 50,
      width: 1000,
      paddingLeft: 100,
      paddingRight: 100,
    });

    expect(distance).toBeCloseTo(expectedOffset);
  });
});
