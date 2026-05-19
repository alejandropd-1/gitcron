import { describe, it, expect } from 'vitest';

// sanitizeForLog is not exported from os-notify, but we can test the pattern directly.
// This mirrors the regex used inside sanitizeForLog in electron/main.ts.
const REDACT_PATTERN = /(x-access-token:)[^@]+@/g;
const AUTH_HEADER_PATTERN = /(AUTHORIZATION:\s*basic\s+)[A-Za-z0-9+/=]+/gi;

function sanitize(str: string) {
  return str
    .replace(REDACT_PATTERN, '$1[REDACTED]@')
    .replace(AUTH_HEADER_PATTERN, '$1[REDACTED]');
}

describe('token URL sanitization (mirrors electron/main.ts sanitizeForLog)', () => {
  it('redacts a token in a clone URL', () => {
    const url = 'https://x-access-token:ghp_ABC123@github.com/user/repo.git';
    expect(sanitize(url)).toBe('https://x-access-token:[REDACTED]@github.com/user/repo.git');
  });

  it('redacts a token in a git error message', () => {
    const msg = 'fatal: unable to access "https://x-access-token:ghs_SECRET@github.com/org/repo.git/"';
    const result = sanitize(msg);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('ghs_SECRET');
  });

  it('leaves non-auth URLs untouched', () => {
    const url = 'https://github.com/user/repo.git';
    expect(sanitize(url)).toBe(url);
  });

  it('leaves plain text untouched', () => {
    const text = 'Push exitoso — cambios subidos al remoto';
    expect(sanitize(text)).toBe(text);
  });

  it('redacts multiple tokens in one string', () => {
    const multi = 'a https://x-access-token:T1@github.com/r1 b https://x-access-token:T2@github.com/r2';
    const result = sanitize(multi);
    expect(result).not.toContain('T1');
    expect(result).not.toContain('T2');
    expect(result.match(/\[REDACTED\]/g)?.length).toBe(2);
  });

  it('redacts GitHub authorization extraheader values', () => {
    const msg = 'git -c http.https://github.com/.extraheader=AUTHORIZATION: basic eC1hY2Nlc3MtdG9rZW46Z2hwX1NFQ1JFVA== push';
    const result = sanitize(msg);
    expect(result).toContain('AUTHORIZATION: basic [REDACTED]');
    expect(result).not.toContain('Z2hwX1NFQ1JFVA');
  });
});
