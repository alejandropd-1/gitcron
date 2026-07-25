import type { AnomalyAlert, AnomalyType } from './pipeline-anomaly-types';

export interface AuditRecordInput {
  findingRuleId: string;
  timestamp: number;
}

export interface CommandExecInput {
  command: string;
  exitCode: number;
  timestamp: number;
}

export interface AgentHeartbeatInput {
  agentId: string;
  state: 'running' | 'completed' | 'failed';
  lastActivityTimestamp: number;
  currentTimestamp: number;
}

export interface ModelDriftInput {
  agentId: string;
  resolvedModelId: string;
  reportedModelId: string;
  timestamp: number;
}

export interface ContextRetryInput {
  contextFillPercentage: number;
  consecutiveFailures: number;
  timestamp: number;
}

export class PipelineAnomalyEngine {
  /**
   * 1. REPEATED_AUDIT_REJECTION: Mismo hallazgo rechazado 2+ veces.
   */
  public detectRepeatedAuditRejections(records: AuditRecordInput[]): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = [];
    const counts = new Map<string, number>();

    for (const record of records) {
      const current = (counts.get(record.findingRuleId) ?? 0) + 1;
      counts.set(record.findingRuleId, current);

      if (current >= 2) {
        alerts.push({
          alertId: `alert-audit-${record.findingRuleId}-${record.timestamp}`,
          type: 'REPEATED_AUDIT_REJECTION',
          severity: 'high',
          confidence: 1.0,
          evidenceRefs: [`rule:${record.findingRuleId}`, `rejections:${current}`],
          explanationKey: 'pipeline.anomaly.repeatedAuditRejection',
          suggestedActionKey: 'pipeline.anomaly.reviewRuleFix',
          timestamp: record.timestamp,
        });
      }
    }
    return alerts;
  }

  /**
   * 2. REPEATED_COMMAND_FAILURE: Mismo comando fallado 2+ veces.
   */
  public detectRepeatedCommandFailures(execs: CommandExecInput[]): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = [];
    const failureCounts = new Map<string, number>();

    for (const exec of execs) {
      if (exec.exitCode !== 0) {
        const count = (failureCounts.get(exec.command) ?? 0) + 1;
        failureCounts.set(exec.command, count);

        if (count >= 2) {
          alerts.push({
            alertId: `alert-cmd-${exec.timestamp}`,
            type: 'REPEATED_COMMAND_FAILURE',
            severity: 'medium',
            confidence: 0.95,
            evidenceRefs: [`cmd:${exec.command}`, `exitCode:${exec.exitCode}`, `failures:${count}`],
            explanationKey: 'pipeline.anomaly.repeatedCommandFailure',
            suggestedActionKey: 'pipeline.anomaly.inspectCommandLogs',
            timestamp: exec.timestamp,
          });
        }
      }
    }
    return alerts;
  }

  /**
   * 3. STAGNANT_TOKEN_SPEND: >50k tokens sin cambios de archivos.
   */
  public detectStagnantTokenSpend(params: {
    totalTokens: number;
    filesModifiedCount: number;
    timestamp: number;
  }): AnomalyAlert | null {
    if (params.totalTokens >= 50_000 && params.filesModifiedCount === 0) {
      return {
        alertId: `alert-stagnant-${params.timestamp}`,
        type: 'STAGNANT_TOKEN_SPEND',
        severity: 'high',
        confidence: 0.9,
        evidenceRefs: [`tokens:${params.totalTokens}`, `filesModified:${params.filesModifiedCount}`],
        explanationKey: 'pipeline.anomaly.stagnantTokenSpend',
        suggestedActionKey: 'pipeline.anomaly.pauseAndSteer',
        timestamp: params.timestamp,
      };
    }
    return null;
  }

  /**
   * 4. INACTIVE_HEARTBEAT: Agente running inactivo > 300s.
   */
  public detectInactiveHeartbeat(input: AgentHeartbeatInput): AnomalyAlert | null {
    const elapsedSeconds = (input.currentTimestamp - input.lastActivityTimestamp) / 1000;
    if (input.state === 'running' && elapsedSeconds > 300) {
      return {
        alertId: `alert-heartbeat-${input.agentId}-${input.currentTimestamp}`,
        type: 'INACTIVE_HEARTBEAT',
        severity: 'medium',
        confidence: 1.0,
        evidenceRefs: [`agentId:${input.agentId}`, `inactiveSeconds:${Math.round(elapsedSeconds)}`],
        explanationKey: 'pipeline.anomaly.inactiveHeartbeat',
        suggestedActionKey: 'pipeline.anomaly.checkProcessRunner',
        timestamp: input.currentTimestamp,
      };
    }
    return null;
  }

  /**
   * 5. UNANNOUNCED_MODEL_DRIFT: reportedModelId != resolvedModelId.
   */
  public detectModelDrift(input: ModelDriftInput): AnomalyAlert | null {
    if (input.resolvedModelId !== input.reportedModelId) {
      return {
        alertId: `alert-drift-${input.agentId}-${input.timestamp}`,
        type: 'UNANNOUNCED_MODEL_DRIFT',
        severity: 'medium',
        confidence: 1.0,
        evidenceRefs: [`resolved:${input.resolvedModelId}`, `reported:${input.reportedModelId}`],
        explanationKey: 'pipeline.anomaly.unannouncedModelDrift',
        suggestedActionKey: 'pipeline.anomaly.verifyModelConfig',
        timestamp: input.timestamp,
      };
    }
    return null;
  }

  /**
   * 6. CONTEXT_PRESSURE_RETRY_LOOP: Contexto >=90% + fallos consecutivos.
   */
  public detectContextPressureRetryLoop(input: ContextRetryInput): AnomalyAlert | null {
    if (input.contextFillPercentage >= 90 && input.consecutiveFailures >= 2) {
      return {
        alertId: `alert-context-loop-${input.timestamp}`,
        type: 'CONTEXT_PRESSURE_RETRY_LOOP',
        severity: 'critical',
        confidence: 0.95,
        evidenceRefs: [`fill:${input.contextFillPercentage}%`, `failures:${input.consecutiveFailures}`],
        explanationKey: 'pipeline.anomaly.contextPressureRetryLoop',
        suggestedActionKey: 'pipeline.anomaly.recommendNewSession',
        timestamp: input.timestamp,
      };
    }
    return null;
  }
}
