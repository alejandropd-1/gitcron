export type RuntimeConnectionState = 'connected' | 'reconnecting' | 'degraded' | 'disconnected';

export interface TokenDeltaBatcherConfig {
  batchIntervalMs: number; // Intervalo de amortiguación (p. ej. 100ms)
}

export interface ReconnectStrategyConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
  backoffFactor: number;
}
