import { describe, expect, it } from 'vitest';
import { PipelineSecuritySanitizer } from '../pipeline/security/pipeline-security-sanitizer';
import { PipelineRetentionPolicy, type AuditLogEntry } from '../pipeline/security/pipeline-retention-policy';

describe('Pipeline Security Hardening & Retention Policy (Fase 08 Tanda 1)', () => {
  const sanitizer = new PipelineSecuritySanitizer();

  it('redacts OpenAI API keys from outputs', () => {
    const raw = 'Error executing request with key sk-1234567890abcdef1234567890abcdef';
    const clean = sanitizer.sanitizeOutput(raw);
    expect(clean).not.toContain('sk-1234567890abcdef1234567890abcdef');
    expect(clean).toContain('[REDACTED_SECRET]');
  });

  it('redacts GitHub personal tokens and Bearer headers', () => {
    const raw = 'Auth Header: Bearer secret-token-xyz123 and ghp_1234567890abcdef1234567890abcdef';
    const clean = sanitizer.sanitizeOutput(raw);
    expect(clean).not.toContain('ghp_1234567890abcdef1234567890abcdef');
    expect(clean).toContain('[REDACTED_SECRET]');
  });

  it('purges audit log entries older than retention policy cutoff', () => {
    const policy = new PipelineRetentionPolicy({ maxLogAgeDays: 30, maxAuditLogEntries: 5 });
    const now = 100 * 24 * 60 * 60 * 1000; // Día 100
    const oldTimestamp = 60 * 24 * 60 * 60 * 1000; // Día 60 (hace 40 días, excede 30 días)
    const recentTimestamp = 85 * 24 * 60 * 60 * 1000; // Día 85 (hace 15 días, dentro de 30 días)

    const entries: AuditLogEntry[] = [
      { timestamp: oldTimestamp, action: 'a1', repoPath: '/r1', payloadHash: 'h1' },
      { timestamp: recentTimestamp, action: 'a2', repoPath: '/r1', payloadHash: 'h2' },
    ];

    const result = policy.purgeStaleEntries(entries, now);
    expect(result.retained.length).toBe(1);
    expect(result.retained[0].action).toBe('a2');
    expect(result.purgedCount).toBe(1);
  });
});
