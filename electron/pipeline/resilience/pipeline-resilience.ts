import type {
  ReconnectStrategyConfig,
  RuntimeConnectionState,
  TokenDeltaBatcherConfig,
} from './pipeline-resilience-types';

export class TokenDeltaBatcher {
  private pendingDeltas: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private config: TokenDeltaBatcherConfig;

  constructor(
    config: TokenDeltaBatcherConfig = { batchIntervalMs: 100 },
    private onFlush?: (batchedTokens: number) => void
  ) {
    this.config = config;
  }

  public pushDelta(delta: number): void {
    this.pendingDeltas += delta;
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.config.batchIntervalMs);
    }
  }

  public flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pendingDeltas > 0) {
      const batched = this.pendingDeltas;
      this.pendingDeltas = 0;
      this.onFlush?.(batched);
    }
  }
}

export class ReconnectStrategy {
  private attempts: number = 0;
  private config: ReconnectStrategyConfig;

  constructor(
    config: Partial<ReconnectStrategyConfig> = {}
  ) {
    this.config = {
      initialDelayMs: config.initialDelayMs ?? 1000,
      maxDelayMs: config.maxDelayMs ?? 30000,
      maxRetries: config.maxRetries ?? 5,
      backoffFactor: config.backoffFactor ?? 2,
    };
  }

  public nextDelayMs(): number | null {
    if (this.attempts >= this.config.maxRetries) {
      return null; // Excedió el máximo de reintentos
    }

    const delay = Math.min(
      this.config.maxDelayMs,
      this.config.initialDelayMs * Math.pow(this.config.backoffFactor, this.attempts)
    );

    this.attempts += 1;
    return delay;
  }

  public reset(): void {
    this.attempts = 0;
  }

  public getAttempts(): number {
    return this.attempts;
  }

  public determineConnectionState(errCount: number): RuntimeConnectionState {
    if (errCount === 0) return 'connected';
    if (errCount <= this.config.maxRetries) return 'reconnecting';
    return 'degraded';
  }
}
