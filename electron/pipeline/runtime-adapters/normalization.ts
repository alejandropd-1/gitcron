import { randomUUID } from 'node:crypto';
import type {
  MetricClassification,
  MetricDimension,
  MetricName,
  MetricSample,
  PipelineEventEnvelope,
  PipelineEvidenceStatus,
  PipelineIdentity,
  RuntimeDescriptor,
  RuntimeSessionRequest,
  RuntimeTelemetrySnapshot,
} from '../../../types/pipeline';

export interface EventNormalizationContext {
  identity: PipelineIdentity;
  descriptor: RuntimeDescriptor;
  instanceId: string;
  observedAt: string;
  sequence: number;
  sourceEventId: string | null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function sourceIdValue(value: unknown): string | null {
  const valueString = stringValue(value);
  return valueString && !valueString.startsWith('<redacted-') ? valueString : null;
}

export function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function createPipelineIdentity(
  request: RuntimeSessionRequest,
  descriptor: RuntimeDescriptor,
): PipelineIdentity {
  return {
    repoId: request.repoId,
    repoPath: request.canonicalRepoPath,
    changeId: request.changeId,
    taskId: request.taskId,
    runId: request.runId,
    attemptId: request.attemptId,
    sessionId: randomUUID(),
    parentSessionId: request.parentSessionId,
    agentId: randomUUID(),
    parentAgentId: request.parentAgentId,
    orchestrationMode: request.orchestrationMode,
    orchestratorRuntime: request.orchestratorRuntime,
    runtime: descriptor.runtime,
    provider: request.provider,
    requestedModel: request.requestedModel,
    effectiveModel: null,
    reportedModel: null,
    role: request.role,
  };
}

export function envelope<T>(
  context: EventNormalizationContext,
  kind: string,
  payload: T,
  evidenceStatus: PipelineEvidenceStatus = 'verified',
  provenance: PipelineEventEnvelope['provenance'] = 'runtime',
): PipelineEventEnvelope<T> {
  return {
    schemaVersion: '1.0',
    eventId: context.sourceEventId ?? `${context.instanceId}:${context.sequence}`,
    sequence: context.sequence,
    sequenceScope: context.instanceId,
    emittedAt: null,
    observedAt: context.observedAt,
    identity: { ...context.identity },
    kind,
    source: {
      adapterId: context.descriptor.adapterId,
      instanceId: context.instanceId,
      transport: context.descriptor.transport,
      protocolVersion: context.descriptor.protocolVersion,
    },
    payload,
    provenance,
    evidenceStatus,
    evidenceRefs: context.descriptor.capabilities.flatMap((capability) => capability.evidenceRefs).slice(0, 8),
    redactionVersion: '1',
  };
}

export function metricSample(
  identity: PipelineIdentity,
  metricName: MetricName,
  dimension: MetricDimension,
  unit: string,
  value: number | null,
  classification: MetricClassification,
  evidenceStatus: PipelineEvidenceStatus,
  sourceRef: string,
): MetricSample {
  return {
    metricId: `${identity.runId}:${identity.attemptId}:${metricName}`,
    identity: { ...identity },
    dimension,
    metricName,
    value,
    unit,
    classification,
    periodStart: null,
    periodEnd: null,
    sourceRef,
    formula: null,
    pricingSource: null,
    pricingAsOf: null,
    dedupeScope: `${identity.runId}:${identity.attemptId}`,
    evidenceStatus,
    evidenceRefs: [sourceRef],
  };
}

export function unknownTelemetry(identity: PipelineIdentity, sourceRef: string): RuntimeTelemetrySnapshot {
  const unknown = (name: MetricName, dimension: MetricDimension, unit: string) => (
    metricSample(identity, name, dimension, unit, null, 'unknown', 'unknown', sourceRef)
  );
  return {
    usage: {
      inputTokens: unknown('tokens.input', 'tokens', 'tokens'),
      outputTokens: unknown('tokens.output', 'tokens', 'tokens'),
      cacheReadTokens: unknown('tokens.cache_read', 'tokens', 'tokens'),
      cacheWriteTokens: unknown('tokens.cache_write', 'tokens', 'tokens'),
      reasoningTokens: unknown('tokens.reasoning', 'tokens', 'tokens'),
    },
    context: {
      maxTokens: unknown('context.max_tokens', 'context', 'tokens'),
      currentTokens: unknown('context.current_tokens', 'context', 'tokens'),
      historicalTokens: unknown('context.historical_tokens', 'context', 'tokens'),
      compactionCount: unknown('context.compaction_count', 'context', 'count'),
    },
    cost: {
      usd: unknown('cost.usd', 'cost', 'USD'),
      billingStatus: 'unknown',
    },
    reasoningVisibility: 'unavailable',
  };
}
