export type ContextHealthState =
  | 'healthy'
  | 'pressure'
  | 'critical'
  | 'compressed'
  | 'unknown';

export type MeasurementSource = 'measured' | 'estimated' | 'unknown';

export interface ContextHealthStatus {
  usedTokens: number | null;
  maxTokens: number | null;
  fillPercentage: number | null;
  headroomTokens: number | null;
  healthState: ContextHealthState;
  measurementSource: MeasurementSource;
  recentCompactionCount: number;
  reinjectedContextCostUsd: number | null;
  recommendation: 'none' | 'recommend_compact' | 'recommend_new_session';
}
