import { describe, expect, it } from 'vitest';
import { PipelineAnomalyEngine } from '../pipeline/anomaly/pipeline-anomaly-engine';

describe('PipelineAnomalyEngine — Deterministic Loop & Anomaly Engine (Fase 07 Tanda 2)', () => {
  const engine = new PipelineAnomalyEngine();

  it('detects repeated audit rejections with cited evidence', () => {
    const alerts = engine.detectRepeatedAuditRejections([
      { findingRuleId: 'C1-typecheck', timestamp: 1000 },
      { findingRuleId: 'C1-typecheck', timestamp: 2000 },
    ]);

    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe('REPEATED_AUDIT_REJECTION');
    expect(alerts[0].evidenceRefs).toContain('rule:C1-typecheck');
  });

  it('detects repeated command failures', () => {
    const alerts = engine.detectRepeatedCommandFailures([
      { command: 'pnpm test', exitCode: 1, timestamp: 1000 },
      { command: 'pnpm test', exitCode: 1, timestamp: 2000 },
    ]);

    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe('REPEATED_COMMAND_FAILURE');
    expect(alerts[0].evidenceRefs).toContain('cmd:pnpm test');
  });

  it('detects stagnant token spend when >50k tokens are used with zero files modified', () => {
    const alert = engine.detectStagnantTokenSpend({
      totalTokens: 60_000,
      filesModifiedCount: 0,
      timestamp: 3000,
    });

    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('STAGNANT_TOKEN_SPEND');
    expect(alert?.evidenceRefs).toContain('tokens:60000');
  });

  it('detects inactive heartbeat when running agent is silent > 300s', () => {
    const alert = engine.detectInactiveHeartbeat({
      agentId: 'agent-99',
      state: 'running',
      lastActivityTimestamp: 1000,
      currentTimestamp: 305_000, // 304 seconds later
    });

    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('INACTIVE_HEARTBEAT');
  });

  it('detects unannounced model drift', () => {
    const alert = engine.detectModelDrift({
      agentId: 'agent-1',
      resolvedModelId: 'claude-3-7-sonnet',
      reportedModelId: 'gpt-4o',
      timestamp: 5000,
    });

    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('UNANNOUNCED_MODEL_DRIFT');
    expect(alert?.evidenceRefs).toContain('resolved:claude-3-7-sonnet');
    expect(alert?.evidenceRefs).toContain('reported:gpt-4o');
  });

  it('detects context pressure retry loop', () => {
    const alert = engine.detectContextPressureRetryLoop({
      contextFillPercentage: 92,
      consecutiveFailures: 2,
      timestamp: 6000,
    });

    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('CONTEXT_PRESSURE_RETRY_LOOP');
    expect(alert?.severity).toBe('critical');
  });
});
