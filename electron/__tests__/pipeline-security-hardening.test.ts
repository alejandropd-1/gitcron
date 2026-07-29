import { describe, expect, it } from 'vitest';
import { PipelineSecuritySanitizer } from '../pipeline/security/pipeline-security-sanitizer';

describe('Pipeline security sanitizer', () => {
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
});
