export interface GroundedExplanation {
  explanationId: string;
  query: string;
  summary: string;
  evidenceRefs: string[];
  confidence: number;
  cached: boolean;
}

export interface PipelineNotification {
  notificationId: string;
  repoPath: string;
  type: 'need_spec' | 'escalation' | 'budget_warning' | 'audit_rejected' | 'merge_ready';
  title: string;
  message: string;
  timestamp: number;
}
