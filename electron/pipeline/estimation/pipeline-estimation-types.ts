export interface CohortIdentifier {
  taskType: string;
  riskCategory: 'low' | 'medium' | 'high' | 'critical';
}

export interface HistoricalTaskRecord {
  taskId: string;
  cohort: CohortIdentifier;
  modelId: string;
  providerFamily: string;
  durationMs: number;
  costUsd: number | null;
  outcome: 'approved' | 'rejected' | 'interrupted';
}

export interface EstimationResult {
  hasSufficientData: boolean;
  sampleSize: number;
  cohort: CohortIdentifier;
  estimatedRemainingDurationMs: { p10: number; mean: number; p90: number } | null;
  estimatedRemainingCostUsd: { p10: number; mean: number; p90: number } | null;
  notice?: string;
}

export interface ModelComparisonResult {
  cohort: CohortIdentifier;
  sampleSize: number;
  hasSufficientData: boolean;
  models: Array<{
    modelId: string;
    sampleSize: number;
    approvalRate: number;
    auditRejectionRate: number;
    avgDurationMs: number;
    avgCostUsd: number | null;
  }>;
}
