/**
 * Chronometric Projection Logic
 *
 * Pure, highly testable functions to project Git commits onto a diagonal ascending chronological timeline
 * with branches fanning out perpendicularly.
 */

export interface FanConfig {
  fanFactor: number;
  width: number;
  paddingLeft: number;
  paddingRight: number;
}

export interface ProjectionConfig {
  width: number;
  height: number;
  minTime: number;
  maxTime: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  fanFactor: number;
  totalCommits: number;
  timelineBaseY?: number;
  slope?: number;
}

/**
 * Default visual slope (rise / run ratio) for the diagonal timeline.
 * An angle of ~40.4 degrees in screen coordinates corresponds to a slope of 0.85.
 * Exposing this as a configurable constant keeps the geometry highly customizable.
 */
export const DEFAULT_CHRONOMETRIC_SLOPE = 0.85;
export const CHRONOMETRIC_SLOT_WIDTH = 75;


export interface ProjectedCommit {
  x: number;
  y: number;
  branchIndex: number;
  baseX: number;
  baseY: number;
}

/**
 * Maps sequential lane indices from CommitGraph (0, 1, 2, 3...) to alternating symmetrical branch offsets:
 * 0 -> 0 (main branch)
 * 1 -> 1
 * 2 -> -1
 * 3 -> 2
 * 4 -> -2
 * ...
 */
export function mapLaneToBranchIndex(lane: number): number {
  if (lane <= 0) return 0;
  return lane % 2 === 1 ? Math.floor(lane / 2) + 1 : -Math.floor(lane / 2);
}

/**
 * Maps a commit's sequential chronological slot to a horizontal coordinate.
 *
 * The slot spacing is intentionally stable: adding a new HEAD must not
 * renormalize every existing commit and make the graph jump.
 */
export function timeToX(
  _ts: number,
  _range: [number, number],
  index: number,
  total: number,
  width: number = 1000,
  paddingLeft: number = 80,
  paddingRight: number = 80
): number {
  const availableWidth = width - paddingLeft - paddingRight;

  if (availableWidth <= 0) return paddingLeft;

  const minVisibleSlots = Math.floor(availableWidth / CHRONOMETRIC_SLOT_WIDTH);
  const stableSlots = Math.max(total - 1, minVisibleSlots, 1);
  const slotWidth = availableWidth / stableSlots;

  return paddingLeft + index * slotWidth;
}

/**
 * Computes the perpendicular offset distance for a branch lane.
 * Incorporates a growth factor so branches fan out wider towards the future (right).
 */
export function branchToOffset(
  branchIndex: number,
  x: number,
  config: FanConfig
): number {
  const { fanFactor, width, paddingLeft, paddingRight } = config;
  const xStart = paddingLeft;
  const xEnd = width - paddingRight;
  const range = xEnd - xStart;

  const p = range > 0 ? (x - xStart) / range : 0.5;

  // Fan out: starts closer at the past (0.4x spacing) and expands to the present (1.0x spacing)
  const growth = 0.4 + 0.6 * Math.max(0, Math.min(1, p));
  return branchIndex * fanFactor * growth;
}

/**
 * Projects a commit to its final 2D coordinates on the SVG canvas.
 * The commit is first placed on the base diagonal timeline and then offset perpendicularly based on its branch index.
 */
export function projectCommit(
  commit: { date: string; branchIndex: number; chronologicalIndex: number },
  config: ProjectionConfig
): ProjectedCommit {
  const {
    width,
    height,
    minTime,
    maxTime,
    paddingLeft,
    paddingRight,
    paddingBottom,
    fanFactor,
    totalCommits,
    timelineBaseY,
  } = config;

  const ts = new Date(commit.date).getTime();

  // 1. Calculate base X
  const x = timeToX(
    ts,
    [minTime, maxTime],
    commit.chronologicalIndex,
    totalCommits,
    width,
    paddingLeft,
    paddingRight
  );

  // 2. Main diagonal line segments
  const xStart = paddingLeft;
  const yStart = timelineBaseY ?? height - paddingBottom;
  const xEnd = width - paddingRight;
  const slope = config.slope ?? DEFAULT_CHRONOMETRIC_SLOPE;
  const yEnd = yStart - (xEnd - paddingLeft) * slope;

  const dx = xEnd - xStart;
  const dy = yEnd - yStart;
  const L = Math.sqrt(dx * dx + dy * dy);

  // Base position on the diagonal
  const p = dx > 0 ? (x - xStart) / dx : 0.5;
  const baseX = x;
  const baseY = yStart + p * dy;

  // 3. Compute perpendicular offset distance
  const offset = branchToOffset(commit.branchIndex, x, {
    fanFactor,
    width,
    paddingLeft,
    paddingRight,
  });

  // Perpendicular vector pointing "up and left" from the ascending diagonal:
  // Since the diagonal vector is (dx, dy) with dy < 0,
  // the unit perpendicular vector pointing up-left is (dy / L, -dx / L).
  const nx = L > 0 ? dy / L : 0;
  const ny = L > 0 ? -dx / L : -1;

  const finalX = baseX + offset * nx;
  const finalY = baseY + offset * ny;

  return {
    x: finalX,
    y: finalY,
    branchIndex: commit.branchIndex,
    baseX,
    baseY,
  };
}

/**
 * Decides whether the commit's text label should be positioned on the left or right side.
 * Supports a dynamic factor: if there are multiple active branches at this chronological step,
 * their visual left-to-right order determines which side their labels should go to prevent crossing lines.
 *
 * - positive branchIndex -> visual left wing
 * - negative branchIndex -> visual right wing
 * - 0 branchIndex -> visual center (trunk)
 */
export function labelSideFromBranchIndex(
  branchIndex: number,
  activeBranchIndices: number[] = [branchIndex],
  _parentBranchIndex?: number
): 'left' | 'right' {
  if (branchIndex > 0) {
    // If there is any active branch further to the left (larger positive index),
    // label to the right to avoid crossing its line.
    const hasBranchFurtherLeft = activeBranchIndices.some(x => x > branchIndex);
    return hasBranchFurtherLeft ? 'right' : 'left';
  }

  if (branchIndex < 0) {
    // If there is any active branch further to the right (more negative index),
    // label to the left to avoid crossing its line.
    const hasBranchFurtherRight = activeBranchIndices.some(x => x < branchIndex);
    return hasBranchFurtherRight ? 'left' : 'right';
  }

  // For trunk (branchIndex === 0), look at other active branches in that range
  const lateralActive = activeBranchIndices.filter(x => x !== 0);
  if (lateralActive.length === 0) {
    return 'left';
  }

  const hasPositive = lateralActive.some(x => x > 0);
  const hasNegative = lateralActive.some(x => x < 0);

  // Apply the outermost branch rule to trunk as well: if any left-wing lateral (+) is active,
  // the trunk's label is forced to the right to escape that wing's territory and avoid stacking
  // with the dense column of left-wing labels (each lateral on the left wing labels to the left
  // by default). This holds even when a right-wing lateral is also active, because the left wing
  // is where nested branches collide visually most often.
  if (hasPositive) {
    return 'right';
  }
  if (hasNegative) {
    return 'left'; // only right-wing laterals → trunk escapes to the left
  }

  return 'left'; // default/balanced
}

