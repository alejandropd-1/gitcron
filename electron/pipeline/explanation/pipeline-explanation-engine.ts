import type { GroundedExplanation, PipelineNotification } from './pipeline-explanation-types';

export class PipelineExplanationEngine {
  private cache: Map<string, GroundedExplanation> = new Map();

  /**
   * Genera una explicación fundada en evidencia citada para responder "¿Por qué ocurrió esto?".
   */
  public explainEvent(params: {
    query: string;
    evidenceRefs: string[];
    contextDetails?: string;
  }): GroundedExplanation {
    const { query, evidenceRefs, contextDetails } = params;
    const cacheKey = `${query}:${evidenceRefs.sort().join(',')}`;

    if (this.cache.has(cacheKey)) {
      const cachedItem = this.cache.get(cacheKey)!;
      return { ...cachedItem, cached: true };
    }

    const summary = contextDetails
      ? `Explicación basada en evidencia [${evidenceRefs.join(', ')}]: ${contextDetails}`
      : `El evento ocurrió por la condición registrada en las evidencias [${evidenceRefs.join(', ')}].`;

    const explanation: GroundedExplanation = {
      explanationId: `exp-${Date.now()}`,
      query,
      summary,
      evidenceRefs,
      confidence: 1.0,
      cached: false,
    };

    this.cache.set(cacheKey, explanation);
    return explanation;
  }
}

export class NotificationDeduplicator {
  private lastNotificationTimestamps: Map<string, number> = new Map();
  private cooldownMs: number;

  constructor(cooldownMs: number = 60_000) {
    this.cooldownMs = cooldownMs;
  }

  /**
   * Evalúa si una notificación debe enviarse o suprimirse por deduplicación/cooldown.
   */
  public shouldSendNotification(notification: PipelineNotification): boolean {
    const key = `${notification.repoPath}:${notification.type}`;
    const lastTime = this.lastNotificationTimestamps.get(key);

    if (lastTime && notification.timestamp - lastTime < this.cooldownMs) {
      return false; // Suprimir por deduplicación dentro de quiet hours / cooldown
    }

    this.lastNotificationTimestamps.set(key, notification.timestamp);
    return true;
  }
}
