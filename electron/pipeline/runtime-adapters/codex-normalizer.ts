import type { PipelineEventEnvelope, PipelineIdentity, RuntimeTelemetrySnapshot } from '../../../types/pipeline';
import { asRecord, envelope, metricSample, numberValue, sourceIdValue, stringValue, unknownTelemetry, type EventNormalizationContext } from './normalization';
import type { RuntimeStreamNormalizer } from './stream-normalizer';

export class CodexStreamNormalizer implements RuntimeStreamNormalizer {
  private usage: Record<string, unknown> | null = null;

  normalize(recordValue: unknown, context: EventNormalizationContext): PipelineEventEnvelope[] {
    const record = asRecord(recordValue);
    if (!record) return [envelope(context, 'runtime.schema.degraded', { reason: 'record_not_object' }, 'unknown')];
    const type = stringValue(record.type);
    const item = asRecord(record.item);
    const itemId = sourceIdValue(item?.id);
    const sourceEventId = itemId
      ? `${itemId}:${type ?? 'unknown'}:${stringValue(item?.status) ?? 'none'}`
      : type === 'thread.started' ? sourceIdValue(record.thread_id) : null;
    const scopedContext = { ...context, sourceEventId };

    if (type === 'thread.started') {
      const sessionId = sourceIdValue(record.thread_id);
      if (sessionId) context.identity.sessionId = sessionId;
      return [envelope(scopedContext, 'session.started', { reportedModel: null })];
    }
    if (type === 'turn.started') return [envelope(scopedContext, 'run.started', {})];
    if (type === 'turn.completed') {
      this.usage = asRecord(record.usage);
      return [envelope(scopedContext, 'run.completed', { success: true })];
    }
    if ((type === 'item.started' || type === 'item.completed') && item) {
      const itemType = stringValue(item.type);
      if (itemType === 'command_execution') {
        return [envelope(scopedContext, type === 'item.started' ? 'tool.started' : 'tool.completed', {
          toolUseId: sourceEventId,
          tool: 'command_execution',
          status: stringValue(item.status),
          exitCode: numberValue(item.exit_code),
        })];
      }
      if (itemType === 'agent_message') {
        return [envelope(scopedContext, 'agent.message', { text: stringValue(item.text) })];
      }
      if (itemType === 'error') {
        return [envelope(scopedContext, 'runtime.error', { message: '[REDACTED]' })];
      }
      return [envelope(scopedContext, 'runtime.item', { itemType, status: stringValue(item.status) }, 'inferred')];
    }
    return [envelope(scopedContext, 'runtime.schema.degraded', { sourceType: type }, 'unknown')];
  }

  telemetry(identity: PipelineIdentity): RuntimeTelemetrySnapshot {
    const snapshot = unknownTelemetry(identity, 'codex:turn.completed');
    const reported = (name: Parameters<typeof metricSample>[1], value: number | null) => metricSample(
      identity,
      name,
      'tokens',
      'tokens',
      value,
      value === null ? 'unknown' : 'runtime_reported',
      value === null ? 'unknown' : 'verified',
      'codex:turn.completed',
    );
    snapshot.usage.inputTokens = reported('tokens.input', numberValue(this.usage?.input_tokens));
    snapshot.usage.outputTokens = reported('tokens.output', numberValue(this.usage?.output_tokens));
    snapshot.usage.cacheReadTokens = reported('tokens.cache_read', numberValue(this.usage?.cached_input_tokens));
    snapshot.usage.reasoningTokens = reported('tokens.reasoning', numberValue(this.usage?.reasoning_output_tokens));
    snapshot.reasoningVisibility = 'unavailable';
    return snapshot;
  }
}
