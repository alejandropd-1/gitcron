import type { PipelineEventEnvelope, PipelineIdentity, RuntimeTelemetrySnapshot } from '../../../types/pipeline';
import { asRecord, envelope, metricSample, numberValue, sourceIdValue, stringValue, unknownTelemetry, type EventNormalizationContext } from './normalization';
import type { RuntimeStreamNormalizer } from './stream-normalizer';

function contentItems(value: unknown): Record<string, unknown>[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
}

export class ClaudeStreamNormalizer implements RuntimeStreamNormalizer {
  private usage: Record<string, unknown> | null = null;
  private modelUsage: Record<string, unknown> | null = null;
  private costUsd: number | null = null;
  private reasoningEmitted = false;
  private readonly startedTools = new Set<string>();
  private readonly completedTools = new Set<string>();

  normalize(recordValue: unknown, context: EventNormalizationContext): PipelineEventEnvelope[] {
    const record = asRecord(recordValue);
    if (!record) return [envelope(context, 'runtime.schema.degraded', { reason: 'record_not_object' }, 'unknown')];
    const type = stringValue(record.type);
    const sourceEventId = sourceIdValue(record.uuid);
    const scopedContext = { ...context, sourceEventId };

    if (type === 'system' && record.subtype === 'init') {
      const reportedModel = stringValue(record.model);
      const sessionId = sourceIdValue(record.session_id);
      if (reportedModel) {
        context.identity.reportedModel = reportedModel;
        context.identity.effectiveModel = reportedModel;
      }
      if (sessionId) context.identity.sessionId = sessionId;
      return [envelope(scopedContext, 'session.started', {
        runtimeVersion: stringValue(record.claude_code_version),
        model: reportedModel,
        permissionMode: stringValue(record.permissionMode),
      })];
    }

    if (type === 'stream_event') return this.normalizeStreamEvent(asRecord(record.event), scopedContext);

    if (type === 'assistant') {
      const message = asRecord(record.message);
      const events: PipelineEventEnvelope[] = [];
      for (const [index, content] of contentItems(message?.content).entries()) {
        const contentType = stringValue(content.type);
        const contentContext = {
          ...scopedContext,
          sourceEventId: scopedContext.sourceEventId ? `${scopedContext.sourceEventId}:${index}:${contentType ?? 'unknown'}` : null,
        };
        if (contentType === 'tool_use') {
          const toolUseId = sourceIdValue(content.id) ?? `${scopedContext.instanceId}:tool:${scopedContext.sequence}`;
          if (!this.startedTools.has(toolUseId)) {
            this.startedTools.add(toolUseId);
            events.push(envelope(contentContext, 'tool.started', { toolUseId, name: stringValue(content.name) }));
          }
        } else if (contentType === 'text') {
          events.push(envelope(contentContext, 'agent.message', { text: stringValue(content.text) }));
        } else if (contentType === 'thinking') {
          this.reasoningEmitted = true;
          events.push(envelope(contentContext, 'reasoning.delta', {
            reasoning: stringValue(content.thinking),
            visibility: 'emitted',
          }));
        }
      }
      return events;
    }

    if (type === 'user') {
      const message = asRecord(record.message);
      const events: PipelineEventEnvelope[] = [];
      for (const [index, content] of contentItems(message?.content).entries()) {
        if (content.type !== 'tool_result') continue;
        const toolUseId = sourceIdValue(content.tool_use_id) ?? `${scopedContext.instanceId}:tool:${scopedContext.sequence}`;
        if (this.completedTools.has(toolUseId)) continue;
        this.completedTools.add(toolUseId);
        events.push(envelope({
          ...scopedContext,
          sourceEventId: scopedContext.sourceEventId ? `${scopedContext.sourceEventId}:${index}:tool_result` : null,
        }, 'tool.completed', { toolUseId, status: 'completed' }));
      }
      return events;
    }

    if (type === 'result') {
      this.usage = asRecord(record.usage);
      this.modelUsage = asRecord(record.modelUsage);
      this.costUsd = numberValue(record.total_cost_usd);
      return [envelope(scopedContext, 'run.completed', {
        success: record.is_error === false,
        stopReason: stringValue(record.stop_reason),
        durationMs: numberValue(record.duration_ms),
        turns: numberValue(record.num_turns),
      })];
    }

    if (type === 'rate_limit_event') {
      return [envelope(scopedContext, 'runtime.rate_limit', { observed: true })];
    }

    return [envelope(scopedContext, 'runtime.schema.degraded', { sourceType: type }, 'unknown')];
  }

  telemetry(identity: PipelineIdentity): RuntimeTelemetrySnapshot {
    const snapshot = unknownTelemetry(identity, 'claude:stream-json');
    const reported = (name: Parameters<typeof metricSample>[1], value: number | null) => metricSample(
      identity,
      name,
      name.startsWith('cost.') ? 'cost' : name.startsWith('context.') ? 'context' : 'tokens',
      name === 'cost.usd' ? 'USD' : 'tokens',
      value,
      value === null ? 'unknown' : 'runtime_reported',
      value === null ? 'unknown' : 'verified',
      'claude:result',
    );
    snapshot.usage.inputTokens = reported('tokens.input', numberValue(this.usage?.input_tokens));
    snapshot.usage.outputTokens = reported('tokens.output', numberValue(this.usage?.output_tokens));
    snapshot.usage.cacheReadTokens = reported('tokens.cache_read', numberValue(this.usage?.cache_read_input_tokens));
    snapshot.usage.cacheWriteTokens = reported('tokens.cache_write', numberValue(this.usage?.cache_creation_input_tokens));
    snapshot.cost.usd = reported('cost.usd', this.costUsd);
    snapshot.cost.billingStatus = this.costUsd === null ? 'unknown' : 'reported';

    const model = identity.reportedModel ? asRecord(this.modelUsage?.[identity.reportedModel]) : null;
    snapshot.context.maxTokens = reported('context.max_tokens', numberValue(model?.contextWindow));
    snapshot.reasoningVisibility = this.reasoningEmitted ? 'emitted' : 'unavailable';
    return snapshot;
  }

  private normalizeStreamEvent(event: Record<string, unknown> | null, context: EventNormalizationContext): PipelineEventEnvelope[] {
    if (!event) return [envelope(context, 'runtime.schema.degraded', { reason: 'event_not_object' }, 'unknown')];
    const eventType = stringValue(event.type);
    if (eventType === 'content_block_delta') {
      const delta = asRecord(event.delta);
      const deltaType = stringValue(delta?.type);
      if (deltaType === 'thinking_delta') {
        this.reasoningEmitted = true;
        return [envelope(context, 'reasoning.delta', {
          reasoning: stringValue(delta?.thinking),
          visibility: 'emitted',
          estimatedTokens: numberValue(delta?.estimated_tokens),
        })];
      }
      if (deltaType === 'text_delta') return [envelope(context, 'agent.message.delta', { text: stringValue(delta?.text) })];
      if (deltaType === 'input_json_delta') {
        const fragment = stringValue(delta?.partial_json);
        return [envelope(context, 'tool.input.delta', { byteLength: fragment ? Buffer.byteLength(fragment) : 0 })];
      }
      return [];
    }
    if (eventType === 'content_block_start') {
      const block = asRecord(event.content_block);
      if (block?.type === 'tool_use') {
        const toolUseId = sourceIdValue(block.id) ?? `${context.instanceId}:tool:${context.sequence}`;
        if (this.startedTools.has(toolUseId)) return [];
        this.startedTools.add(toolUseId);
        return [envelope(context, 'tool.started', { toolUseId, name: stringValue(block.name) })];
      }
      return [];
    }
    if (eventType === 'message_start') return [envelope(context, 'agent.started', { model: stringValue(asRecord(event.message)?.model) })];
    if (eventType === 'message_stop') return [envelope(context, 'agent.completed', {})];
    return [];
  }
}
