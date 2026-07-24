import type { PipelineEventEnvelope, PipelineIdentity, RuntimeTelemetrySnapshot } from '../../../types/pipeline';
import type { EventNormalizationContext } from './normalization';

export interface RuntimeStreamNormalizer {
  normalize(record: unknown, context: EventNormalizationContext): PipelineEventEnvelope[];
  telemetry(identity: PipelineIdentity): RuntimeTelemetrySnapshot;
}
