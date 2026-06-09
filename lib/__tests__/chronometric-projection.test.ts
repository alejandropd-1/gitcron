import { describe, it, expect } from 'vitest';
import {
  mapLaneToBranchIndex,
  timeToX,
  branchToOffset,
  projectCommit,
  ProjectionConfig,
  DEFAULT_CHRONOMETRIC_SLOPE,
  labelSideFromBranchIndex,
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


describe('mapLaneToBranchIndex — abanico simétrico con signo', () => {
  it('lane 0 (troncal) -> 0', () => {
    expect(mapLaneToBranchIndex(0)).toBe(0);
  });

  it('lanes impares abren a la derecha (positivos)', () => {
    expect(mapLaneToBranchIndex(1)).toBe(1);
    expect(mapLaneToBranchIndex(3)).toBe(2);
    expect(mapLaneToBranchIndex(5)).toBe(3);
  });

  it('lanes pares abren a la izquierda (negativos)', () => {
    expect(mapLaneToBranchIndex(2)).toBe(-1);
    expect(mapLaneToBranchIndex(4)).toBe(-2);
    expect(mapLaneToBranchIndex(6)).toBe(-3);
  });

  it('lanes negativos defensivos colapsan a la troncal', () => {
    expect(mapLaneToBranchIndex(-1)).toBe(0);
  });
});

describe('timeToX', () => {
  it('anchors the oldest chronological slot at paddingLeft', () => {
    const range: [number, number] = [1000, 2000];
    const width = 1000;
    const paddingLeft = 100;
    const paddingRight = 100;

    const xMin = timeToX(1000, range, 0, 2, width, paddingLeft, paddingRight);
    expect(xMin).toBe(paddingLeft);
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

    // Should keep readable slot separation even when timestamps are close.
    expect(x2 - x1).toBeGreaterThan(60);
    expect(x3 - x2).toBeGreaterThan(60);
  });

  it('keeps existing slot positions stable when a newer commit is appended', () => {
    const rangeBefore: [number, number] = [1000, 3000];
    const rangeAfter: [number, number] = [1000, 4000];
    const widthBefore = 1100;
    const widthAfter = 1100;
    const paddingLeft = 100;
    const paddingRight = 100;

    const existingBefore = [0, 1, 2].map((index) =>
      timeToX(1000 + index * 1000, rangeBefore, index, 3, widthBefore, paddingLeft, paddingRight)
    );
    const existingAfter = [0, 1, 2].map((index) =>
      timeToX(1000 + index * 1000, rangeAfter, index, 4, widthAfter, paddingLeft, paddingRight)
    );

    expect(existingAfter).toEqual(existingBefore);
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

  it('keeps existing projected coordinates stable when the timeline extends', () => {
    const baseConfig: ProjectionConfig = {
      width: 1100,
      height: 965,
      minTime: 1000,
      maxTime: 3000,
      paddingLeft: 100,
      paddingRight: 100,
      paddingTop: 100,
      paddingBottom: 100,
      fanFactor: 50,
      totalCommits: 3,
      timelineBaseY: 865,
    };
    const extendedConfig: ProjectionConfig = {
      ...baseConfig,
      width: 1175,
      height: 1028.75,
      maxTime: 4000,
      totalCommits: 4,
    };

    const before = projectCommit(
      {
        date: new Date(2000).toISOString(),
        branchIndex: 0,
        chronologicalIndex: 1,
      },
      baseConfig
    );
    const after = projectCommit(
      {
        date: new Date(2000).toISOString(),
        branchIndex: 0,
        chronologicalIndex: 1,
      },
      extendedConfig
    );

    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(after.baseX).toBeCloseTo(before.baseX);
    expect(after.baseY).toBeCloseTo(before.baseY);
  });
});

describe('labelSideFromBranchIndex — el lado respeta la divergencia y factor dinámico', () => {
  describe('comportamiento estático (caída por defecto/rama única)', () => {
    it('troncal (0) va a la izquierda', () => {
      expect(labelSideFromBranchIndex(0)).toBe('left');
    });
    it('abanico positivo va a la izquierda (físico)', () => {
      expect(labelSideFromBranchIndex(1)).toBe('left');
      expect(labelSideFromBranchIndex(2)).toBe('left');
    });
    it('abanico negativo va a la derecha (físico)', () => {
      expect(labelSideFromBranchIndex(-1)).toBe('right');
      expect(labelSideFromBranchIndex(-2)).toBe('right');
    });
  });

  describe('comportamiento dinámico (múltiples ramas activas paralelas)', () => {
    it('troncal (0) con rama a la izquierda (1) -> troncal va a la derecha', () => {
      expect(labelSideFromBranchIndex(0, [1, 0])).toBe('right');
      expect(labelSideFromBranchIndex(1, [1, 0])).toBe('left');
    });

    it('troncal (0) con rama a la derecha (-1) -> troncal va a la izquierda', () => {
      expect(labelSideFromBranchIndex(0, [0, -1])).toBe('left');
      expect(labelSideFromBranchIndex(-1, [0, -1])).toBe('right');
    });

    it('troncal (0) con ramas a ambos lados (1, 0, -1) -> escapa del ala izquierda (right)', () => {
      // The left wing accumulates label density (every lateral on +X labels to the left by default).
      // To avoid stacking, trunk commits squeezed between both wings push their labels to the right.
      expect(labelSideFromBranchIndex(1, [1, 0, -1])).toBe('left');
      expect(labelSideFromBranchIndex(0, [1, 0, -1])).toBe('right');
      expect(labelSideFromBranchIndex(-1, [1, 0, -1])).toBe('right');
    });
  });

  describe('divergencia relativa (ramas anidadas/bifurcadas)', () => {
    it('rama hija a la derecha de la rama padre (p. ej. hijo 0 de padre 1) -> va a la derecha', () => {
      expect(labelSideFromBranchIndex(0, [0, 1])).toBe('right');
    });

    it('rama hija a la izquierda de la rama padre (p. ej. hijo 2 de padre 1) -> va a la izquierda', () => {
      expect(labelSideFromBranchIndex(2, [1, 2])).toBe('left');
    });

    it('rama hija a la derecha de la rama padre en el ala izquierda (p. ej. hijo 1 de padre 2) -> va a la derecha', () => {
      expect(labelSideFromBranchIndex(1, [1, 2])).toBe('right');
    });

    it('rama hija a la derecha de la rama padre en el ala derecha (p. ej. hijo -2 de padre -1) -> va a la derecha', () => {
      expect(labelSideFromBranchIndex(-2, [-1, -2])).toBe('right');
    });

    it('rama hija a la izquierda de la rama padre en el ala derecha (p. ej. hijo -1 de padre -2) -> va a la izquierda', () => {
      expect(labelSideFromBranchIndex(-1, [-1, -2])).toBe('left');
    });

    it('rama hija a la izquierda de la rama padre en el ala derecha (p. ej. hijo 0 de padre -1) -> va a la izquierda', () => {
      expect(labelSideFromBranchIndex(0, [0, -1])).toBe('left');
    });
  });
});

