// lib/speculative-projection.ts
//
// Projects SPECULATIVE (AI-predicted) branches onto the EXISTING chronometric
// diagonal. These are not real commits — they fork from the present (HEAD) and
// extend into the future (further up-right along the diagonal), fanning out.
//
// Pure + testable. No React, no Git, no IO. Reuses the real projection's
// geometry (diagonal direction, fan offsets) so speculative nodes sit on the
// same coordinate system the real graph already uses.
//
// Visual rule (brief §2): real = solid/opaque/branch-color; speculative =
// dotted/semi-transparent/cyan, opacity tied to confidence, labelled "predicción".

import { mapLaneToBranchIndex, type ProjectionConfig } from './chronometric-projection';

/** Matches the AI PredictionResult branch shape (see types/temporal-agent.ts). */
export interface SpeculativeBranch {
  id: string;
  message: string;
  rationale?: string;
  /** Extended reasoning in prose (3-5 sentences). Optional for backward compatibility. */
  reasoning?: string;
  /** 1-based index in the original prediction array, before any filter. */
  predictionIndex?: number;
  type: 'improvement' | 'breakthrough' | 'trend';
  /** 0..1 — drives reach into the future, opacity, and dash density. */
  confidence: number;
}

export interface SpeculativeNode {
  branch: SpeculativeBranch;
  /** Future node position. */
  x: number;
  y: number;
  /** Fork origin — the present/HEAD point the branch springs from. */
  anchorX: number;
  anchorY: number;
  /** Signed fan lane (alternating +1,-1,+2,-2…), 0 reserved for trunk. */
  branchIndex: number;
}

export interface SpeculativeOptions {
  /** Base forward distance into the future, in world px. */
  reach?: number;
  /** Perpendicular lane spacing (mirror the real graph's fanFactor). */
  fanFactor?: number;
  /** How much the fan widens for the speculative cluster. */
  growth?: number;
}

const DEFAULTS: Required<SpeculativeOptions> = {
  reach: 400,
  fanFactor: 90,
  growth: 1.0,
};

/** Unit direction + perpendicular of the ascending diagonal, from config. */
export function diagonalBasis(config: ProjectionConfig) {
  const xStart = config.paddingLeft;
  const yStart = config.height - config.paddingBottom;
  const xEnd = config.width - config.paddingRight;
  const yEnd = config.paddingTop;

  const dx = xEnd - xStart;
  const dy = yEnd - yStart; // negative (ascending)
  const L = Math.sqrt(dx * dx + dy * dy) || 1;

  const ux = dx / L;
  const uy = dy / L;
  // Perpendicular pointing "up-left", same convention as projectCommit.
  const nx = dy / L;
  const ny = -dx / L;
  return { ux, uy, nx, ny, L };
}

/**
 * Project speculative branches as a fan springing from `present` (the HEAD
 * node) into the future. More confident predictions reach a little further
 * forward (read: "more likely to materialize"); fainter ones stay nearer and
 * foggier.
 */
export function projectSpeculative(
  speculative: SpeculativeBranch[],
  present: { x: number; y: number },
  config: ProjectionConfig,
  options: SpeculativeOptions = {},
): SpeculativeNode[] {
  const { reach, fanFactor, growth } = { ...DEFAULTS, ...options };
  const { ux, uy, nx, ny } = diagonalBasis(config);

  return speculative.map((branch, i) => {
    const branchIndex = mapLaneToBranchIndex(i + 1); // skip 0 (trunk continuation)
    const conf = clamp01(branch.confidence);

    // Forward distance scales with confidence: 0.7x … 1.3x of `reach`.
    const forward = reach * (0.7 + 0.6 * conf);
    const fx = present.x + ux * forward;
    const fy = present.y + uy * forward;

    // Perpendicular fan offset.
    const offset = branchIndex * fanFactor * growth;
    const x = fx + nx * offset;
    const y = fy + ny * offset;

    return { branch, x, y, anchorX: present.x, anchorY: present.y, branchIndex };
  });
}

/** Opacity for a speculative element from its confidence. Always sub-1 (faint). */
export function speculativeOpacity(confidence: number): number {
  return 0.2 + 0.55 * clamp01(confidence);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
