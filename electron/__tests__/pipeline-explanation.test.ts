import { describe, expect, it } from 'vitest';
import {
  NotificationDeduplicator,
  PipelineExplanationEngine,
} from '../pipeline/explanation/pipeline-explanation-engine';
import type { PipelineNotification } from '../pipeline/explanation/pipeline-explanation-types';

describe('PipelineExplanationEngine & NotificationDeduplicator (Fase 07 Tanda 4)', () => {
  it('generates grounded explanations with cited evidence and caches results', () => {
    const engine = new PipelineExplanationEngine();
    const query = '¿Por qué volvió al fixer?';
    const evidence = ['gate:C1-typecheck', 'finding:TS2305'];

    const exp1 = engine.explainEvent({ query, evidenceRefs: evidence, contextDetails: 'Falló el typecheck por import nulo.' });
    expect(exp1.cached).toBe(false);
    expect(exp1.evidenceRefs).toEqual(evidence);
    expect(exp1.summary).toContain('gate:C1-typecheck');

    // Second call with same key returns cached explanation
    const exp2 = engine.explainEvent({ query, evidenceRefs: evidence });
    expect(exp2.cached).toBe(true);
  });

  it('deduplicates notifications within the cooldown window', () => {
    const deduplicator = new NotificationDeduplicator(60_000); // 60s cooldown

    const n1: PipelineNotification = {
      notificationId: 'notif-1',
      repoPath: '/www/gitcron',
      type: 'budget_warning',
      title: 'Presupuesto al 75%',
      message: 'Uso de presupuesto al 75%',
      timestamp: 1000,
    };

    const n2: PipelineNotification = {
      notificationId: 'notif-2',
      repoPath: '/www/gitcron',
      type: 'budget_warning',
      title: 'Presupuesto al 76%',
      message: 'Uso de presupuesto al 76%',
      timestamp: 15000, // 14s later (within 60s cooldown)
    };

    const n3: PipelineNotification = {
      notificationId: 'notif-3',
      repoPath: '/www/gitcron',
      type: 'budget_warning',
      title: 'Presupuesto al 90%',
      message: 'Uso de presupuesto al 90%',
      timestamp: 70000, // 69s later (after 60s cooldown)
    };

    expect(deduplicator.shouldSendNotification(n1)).toBe(true);
    expect(deduplicator.shouldSendNotification(n2)).toBe(false); // Suppressed!
    expect(deduplicator.shouldSendNotification(n3)).toBe(true);  // Allowed!
  });
});
