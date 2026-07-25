export type AnomalyType =
  | 'REPEATED_AUDIT_REJECTION'
  | 'REPEATED_COMMAND_FAILURE'
  | 'STAGNANT_TOKEN_SPEND'
  | 'INACTIVE_HEARTBEAT'
  | 'UNANNOUNCED_MODEL_DRIFT'
  | 'CONTEXT_PRESSURE_RETRY_LOOP';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AnomalyAlert {
  alertId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  confidence: number;
  evidenceRefs: string[];
  explanationKey: string;
  suggestedActionKey: string;
  timestamp: number;
}
