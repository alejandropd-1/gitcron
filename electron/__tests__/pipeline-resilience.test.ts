import { describe, expect, it, vi } from 'vitest';
import { ReconnectStrategy, TokenDeltaBatcher } from '../pipeline/resilience/pipeline-resilience';

describe('Pipeline Resilience & Backpressure (Fase 08 Tanda 2)', () => {
  it('batches high-frequency token deltas into a single flush', async () => {
    const onFlush = vi.fn();
    const batcher = new TokenDeltaBatcher({ batchIntervalMs: 50 }, onFlush);

    batcher.pushDelta(10);
    batcher.pushDelta(20);
    batcher.pushDelta(30);

    expect(onFlush).not.toHaveBeenCalled();

    // Flush manual o por tiempo
    batcher.flush();
    expect(onFlush).toHaveBeenCalledWith(60);
  });

  it('calculates exponential backoff delay correctly without reconnect storm', () => {
    const strategy = new ReconnectStrategy({
      initialDelayMs: 1000,
      backoffFactor: 2,
      maxRetries: 3,
    });

    expect(strategy.nextDelayMs()).toBe(1000);  // Intento 1
    expect(strategy.nextDelayMs()).toBe(2000);  // Intento 2
    expect(strategy.nextDelayMs()).toBe(4000);  // Intento 3
    expect(strategy.nextDelayMs()).toBeNull();  // Excedió máximo
  });

  it('degrades connection state gracefully when max retries are exceeded', () => {
    const strategy = new ReconnectStrategy({ maxRetries: 2 });

    expect(strategy.determineConnectionState(0)).toBe('connected');
    expect(strategy.determineConnectionState(1)).toBe('reconnecting');
    expect(strategy.determineConnectionState(3)).toBe('degraded');
  });
});
