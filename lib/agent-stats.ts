import type { PredictionHistoryEntry, BranchDecisionRow } from '../electron/db/types';

export interface CalibrationBin {
  binStart: number;
  binEnd: number;
  meanConfidence: number | null;
  accuracy: number | null;
  count: number;
}

export interface OutcomeBreakdownEntry {
  period: string; // YYYY-MM-DD
  accepted: number;
  materialized: number;
  rejected: number;
  deferred: number;
}

export interface TypeAcceptanceStats {
  accepted: number;
  total: number;
  rate: number;
}

export interface ProviderComparisonEntry {
  provider: string;
  model: string | null;
  brierScore: number | null;
  count: number;
}

/**
 * Finds the latest decision chronologically.
 */
export function getLatestDecision(decisions: BranchDecisionRow[]): BranchDecisionRow | null {
  if (decisions.length === 0) return null;
  let latest = decisions[0];
  let latestTime = new Date(latest.decidedAt).getTime();

  for (let i = 1; i < decisions.length; i++) {
    const d = decisions[i];
    const time = new Date(d.decidedAt).getTime();
    // In case of invalid date, fallback to index order (append-only nature)
    if (!Number.isNaN(time) && (Number.isNaN(latestTime) || time >= latestTime)) {
      latest = d;
      latestTime = time;
    }
  }
  return latest;
}

/**
 * Maps latest decision to outcome value:
 * - 'accepted' or 'materialized' -> 1
 * - 'rejected' -> 0
 * - 'deferred' or null (no decisions) -> null (excluded)
 */
export function getBranchOutcome(decisions: BranchDecisionRow[]): number | null {
  const latest = getLatestDecision(decisions);
  if (!latest) return null; // Unresolved / no decisions

  if (latest.decision === 'accepted' || latest.decision === 'materialized') {
    return 1;
  }
  if (latest.decision === 'rejected') {
    return 0;
  }
  return null; // deferred
}

/**
 * Computes Brier Score: mean of (confidence - outcome)^2
 * Only resolved branches (outcome 0 or 1) are included.
 */
export function brierScore(predictions: PredictionHistoryEntry[]): number | null {
  let sumSquaredDiff = 0;
  let count = 0;

  for (const entry of predictions) {
    for (const b of entry.branches) {
      const outcome = getBranchOutcome(b.decisions);
      if (outcome !== null) {
        const diff = b.branch.confidence - outcome;
        sumSquaredDiff += diff * diff;
        count++;
      }
    }
  }

  return count > 0 ? sumSquaredDiff / count : null;
}

/**
 * Computes Calibration Curve by binning confidence values.
 * Default is 10 bins: [0-0.1), [0.1-0.2), ..., [0.9-1.0]
 */
export function calibrationCurve(predictions: PredictionHistoryEntry[], bins = 10): CalibrationBin[] {
  const result: CalibrationBin[] = [];
  const binWidth = 1 / bins;

  for (let i = 0; i < bins; i++) {
    result.push({
      binStart: i * binWidth,
      binEnd: (i + 1) * binWidth,
      meanConfidence: null,
      accuracy: null,
      count: 0,
    });
  }

  // Collect branch predictions falling into each bin
  const binValues: Array<Array<{ confidence: number; outcome: number }>> = Array.from(
    { length: bins },
    () => [],
  );

  for (const entry of predictions) {
    for (const b of entry.branches) {
      const outcome = getBranchOutcome(b.decisions);
      if (outcome !== null) {
        const conf = b.branch.confidence;
        let binIdx = Math.floor(conf / binWidth);
        if (binIdx >= bins) {
          binIdx = bins - 1; // handling edge case where confidence is exactly 1.0
        }
        binValues[binIdx].push({ confidence: conf, outcome });
      }
    }
  }

  for (let i = 0; i < bins; i++) {
    const values = binValues[i];
    const count = values.length;
    if (count > 0) {
      const sumConf = values.reduce((sum, v) => sum + v.confidence, 0);
      const sumOutcome = values.reduce((sum, v) => sum + v.outcome, 0);
      result[i].meanConfidence = sumConf / count;
      result[i].accuracy = sumOutcome / count;
      result[i].count = count;
    }
  }

  return result;
}

/**
 * Outcome breakdown over time (grouped by prediction date YYYY-MM-DD).
 */
export function outcomeBreakdown(predictions: PredictionHistoryEntry[]): OutcomeBreakdownEntry[] {
  const breakdownMap = new Map<string, OutcomeBreakdownEntry>();

  for (const entry of predictions) {
    const dateStr = entry.run.generatedAt.split('T')[0];
    if (!breakdownMap.has(dateStr)) {
      breakdownMap.set(dateStr, {
        period: dateStr,
        accepted: 0,
        materialized: 0,
        rejected: 0,
        deferred: 0,
      });
    }

    const data = breakdownMap.get(dateStr)!;

    for (const b of entry.branches) {
      const latest = getLatestDecision(b.decisions);
      if (!latest) {
        data.deferred++;
      } else if (latest.decision === 'materialized') {
        data.materialized++;
      } else if (latest.decision === 'accepted') {
        data.accepted++;
      } else if (latest.decision === 'rejected') {
        data.rejected++;
      } else {
        data.deferred++; // deferred
      }
    }
  }

  // Sort periods chronologically
  return Array.from(breakdownMap.values()).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Breakdown of acceptance by prediction type (improvement, breakthrough, trend).
 */
export function acceptanceByType(predictions: PredictionHistoryEntry[]): Record<string, TypeAcceptanceStats> {
  const stats: Record<string, { accepted: number; total: number }> = {
    improvement: { accepted: 0, total: 0 },
    breakthrough: { accepted: 0, total: 0 },
    trend: { accepted: 0, total: 0 },
  };

  for (const entry of predictions) {
    for (const b of entry.branches) {
      const type = b.branch.type;
      if (!stats[type]) {
        stats[type] = { accepted: 0, total: 0 };
      }

      const outcome = getBranchOutcome(b.decisions);
      if (outcome !== null) {
        stats[type].total++;
        if (outcome === 1) {
          stats[type].accepted++;
        }
      }
    }
  }

  const result: Record<string, TypeAcceptanceStats> = {};
  for (const type of Object.keys(stats)) {
    const s = stats[type];
    result[type] = {
      accepted: s.accepted,
      total: s.total,
      rate: s.total > 0 ? s.accepted / s.total : 0,
    };
  }

  return result;
}

/**
 * Provider/model comparison of Brier score.
 */
export function providerComparison(predictions: PredictionHistoryEntry[]): ProviderComparisonEntry[] {
  // Group predictions by provider and model
  const groupMap = new Map<string, { provider: string; model: string | null; entries: PredictionHistoryEntry[] }>();

  for (const entry of predictions) {
    const key = `${entry.run.provider}::${entry.run.model ?? ''}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        provider: entry.run.provider,
        model: entry.run.model,
        entries: [],
      });
    }
    // We add the run but keep only the branches relevant to this run.
    // However, since PredictionHistoryEntry groups branches by run, we can just push this entry.
    // Wait, to compute correctly, we just push the entry as is.
    groupMap.get(key)!.entries.push(entry);
  }

  return Array.from(groupMap.values()).map((g) => {
    // Count only branches for this group that are resolved
    let sumSquaredDiff = 0;
    let count = 0;

    for (const entry of g.entries) {
      for (const b of entry.branches) {
        const outcome = getBranchOutcome(b.decisions);
        if (outcome !== null) {
          const diff = b.branch.confidence - outcome;
          sumSquaredDiff += diff * diff;
          count++;
        }
      }
    }

    return {
      provider: g.provider,
      model: g.model,
      brierScore: count > 0 ? sumSquaredDiff / count : null,
      count,
    };
  });
}
