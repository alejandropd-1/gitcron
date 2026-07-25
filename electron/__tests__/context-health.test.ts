import { describe, expect, it } from 'vitest';
import { ContextHealthEngine } from '../pipeline/models/context-health-engine';

describe('ContextHealthEngine — Context Window & Headroom (Fase 06 Tanda 4)', () => {
  const engine = new ContextHealthEngine();

  it('evaluates healthy state when context usage is below 70%', () => {
    const status = engine.evaluateContextHealth({
      usedTokens: 50_000,
      maxTokens: 200_000,
    });

    expect(status.healthState).toBe('healthy');
    expect(status.fillPercentage).toBe(25.0);
    expect(status.headroomTokens).toBe(150_000);
    expect(status.recommendation).toBe('none');
  });

  it('evaluates pressure state and recommends compacting between 70% and 89%', () => {
    const status = engine.evaluateContextHealth({
      usedTokens: 150_000,
      maxTokens: 200_000,
    });

    expect(status.healthState).toBe('pressure');
    expect(status.fillPercentage).toBe(75.0);
    expect(status.headroomTokens).toBe(50_000);
    expect(status.recommendation).toBe('recommend_compact');
  });

  it('evaluates critical state and recommends new session above 90%', () => {
    const status = engine.evaluateContextHealth({
      usedTokens: 190_000,
      maxTokens: 200_000,
    });

    expect(status.healthState).toBe('critical');
    expect(status.fillPercentage).toBe(95.0);
    expect(status.headroomTokens).toBe(10_000);
    expect(status.recommendation).toBe('recommend_new_session');
  });

  it('returns unknown healthState when tokens or maxTokens are null', () => {
    const status = engine.evaluateContextHealth({
      usedTokens: null,
      maxTokens: 128_000,
    });

    expect(status.healthState).toBe('unknown');
    expect(status.fillPercentage).toBeNull();
    expect(status.headroomTokens).toBeNull();
    expect(status.recommendation).toBe('none');
  });

  it('marks compressed state when recentCompactionCount > 0 under 70%', () => {
    const status = engine.evaluateContextHealth({
      usedTokens: 40_000,
      maxTokens: 200_000,
      recentCompactionCount: 2,
    });

    expect(status.healthState).toBe('compressed');
    expect(status.recentCompactionCount).toBe(2);
  });
});
