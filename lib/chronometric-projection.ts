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
  slope?: number;
}

/**
 * Default visual slope (rise / run ratio) for the diagonal timeline.
 * An angle of ~40.4 degrees in screen coordinates corresponds to a slope of 0.85.
 * Exposing this as a configurable constant keeps the geometry highly customizable.
 */
export const DEFAULT_CHRONOMETRIC_SLOPE = 0.85;


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
 * Maps a commit's timestamp and sequential index to a horizontal coordinate.
 * Uses a hybrid model (30% linear time, 70% sequential index) to preserve real chronological proportions
 * while preventing clustering of nodes during high-frequency periods.
 */
export function timeToX(
  ts: number,
  range: [number, number],
  index: number,
  total: number,
  width: number = 1000,
  paddingLeft: number = 80,
  paddingRight: number = 80
): number {
  const [minTime, maxTime] = range;
  const availableWidth = width - paddingLeft - paddingRight;

  if (availableWidth <= 0) return paddingLeft;

  // 1. Linear time percentage
  let pTime = 0.5;
  if (maxTime > minTime) {
    pTime = Math.max(0, Math.min(1, (ts - minTime) / (maxTime - minTime)));
  }

  // 2. Sequential index percentage
  let pIndex = 0.5;
  if (total > 1) {
    pIndex = index / (total - 1);
  }

  // 3. Weighted hybrid interpolation
  const p = pTime * 0.05 + pIndex * 0.95;

  return paddingLeft + p * availableWidth;
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
    paddingTop,
    paddingBottom,
    fanFactor,
    totalCommits,
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
  const yStart = height - paddingBottom;
  const xEnd = width - paddingRight;
  const yEnd = paddingTop;

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
