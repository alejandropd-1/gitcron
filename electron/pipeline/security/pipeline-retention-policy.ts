export interface RetentionConfig {
  maxLogAgeDays: number;
  maxAuditLogEntries: number;
}

export interface AuditLogEntry {
  timestamp: number;
  action: string;
  repoPath: string;
  payloadHash: string;
}

export class PipelineRetentionPolicy {
  constructor(private config: RetentionConfig = { maxLogAgeDays: 30, maxAuditLogEntries: 1000 }) {}

  /**
   * Filtra y purga entradas de log de auditoría que hayan superado el tiempo de retención o el límite máximo.
   */
  public purgeStaleEntries(entries: AuditLogEntry[], currentTimestamp: number): {
    retained: AuditLogEntry[];
    purgedCount: number;
  } {
    const maxAgeMs = this.config.maxLogAgeDays * 24 * 60 * 60 * 1000;
    const cutoffTimestamp = currentTimestamp - maxAgeMs;

    // 1. Filtrar por antigüedad
    const unexpired = entries.filter((e) => e.timestamp >= cutoffTimestamp);

    // 2. Truncar si excede el límite máximo de entradas (retener las más recientes)
    if (unexpired.length > this.config.maxAuditLogEntries) {
      const retained = unexpired.slice(unexpired.length - this.config.maxAuditLogEntries);
      return {
        retained,
        purgedCount: entries.length - retained.length,
      };
    }

    return {
      retained: unexpired,
      purgedCount: entries.length - unexpired.length,
    };
  }
}
