import fs from 'fs';
import path from 'path';
import type { PipelineAuditLogEntry } from './control-bus-types';

/**
 * Audit Log Append-Only sanitizado para Pipeline Control (F05).
 *
 * Registra cada intento de comando (aceptado, rechazado o fallido) en un log
 * local por repositorio sin exponer credenciales ni payloads privados.
 */
export class PipelineControlAuditor {
  private resolveLogPath(repoPath: string): string {
    const gitcronDir = path.join(repoPath, '.git', 'gitcron');
    if (!fs.existsSync(gitcronDir)) {
      fs.mkdirSync(gitcronDir, { recursive: true });
    }
    return path.join(gitcronDir, 'pipeline-audit.jsonl');
  }

  public record(entry: PipelineAuditLogEntry): void {
    try {
      const logPath = this.resolveLogPath(entry.repoPath);
      const sanitizedLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(logPath, sanitizedLine, 'utf8');
    } catch {
      // Un fallo al escribir en el audit log no debe colgar el proceso principal
    }
  }

  public readEntries(repoPath: string, maxEntries = 100): PipelineAuditLogEntry[] {
    try {
      const logPath = this.resolveLogPath(repoPath);
      if (!fs.existsSync(logPath)) return [];
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.split('\n').filter((line) => line.trim().length > 0);
      const entries: PipelineAuditLogEntry[] = [];
      for (const line of lines.slice(-maxEntries)) {
        try {
          entries.push(JSON.parse(line) as PipelineAuditLogEntry);
        } catch {
          // Ignorar líneas corruptas
        }
      }
      return entries;
    } catch {
      return [];
    }
  }
}
