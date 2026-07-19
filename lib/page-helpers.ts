// Helpers puros de la página principal (sin estado ni JSX): detección de
// errores de git, derivación de paths y de URLs de clone. Extraídos de
// app/page.tsx para poder testearlos de forma aislada.

import { formatInitials } from '@/lib/display-format';

/**
 * Derive 2-letter initials from a GitHub user object, falling back through
 * name → login → email. Always returns at most 2 chars.
 */
export function userInitials(user: { name?: string | null; login?: string; email?: string | null }): string {
  if (user.name && user.name.trim()) return formatInitials(user.name.trim());
  if (user.login) return user.login.slice(0, 2).toUpperCase();
  if (user.email) return user.email.split('@')[0].slice(0, 2).toUpperCase();
  return '?';
}

export function isSafeDirectoryError(message: string): boolean {
  return /detected dubious ownership|safe\.directory/i.test(message);
}

export function safeDirectoryPathFromError(message: string): string | null {
  const repoMatch = message.match(/repository at ['"]([^'"]+)['"]/i);
  if (repoMatch?.[1]) return repoMatch[1].trim();

  const commandMatch = message.match(/safe\.directory\s+(.+?)(?:\r?\n|$)/i);
  if (!commandMatch?.[1]) return null;

  return commandMatch[1].trim().replace(/^['"`]+|['"`]+$/g, '').replace(/[.)]+$/, '');
}

export function childPath(parent: string, name: string): string {
  const separator = parent.includes('\\') ? '\\' : '/';
  return parent.endsWith('/') || parent.endsWith('\\')
    ? `${parent}${name}`
    : `${parent}${separator}${name}`;
}

export function isPushRejected(error?: string | null): boolean {
  return Boolean(
    error?.includes('[rejected]') ||
    error?.includes('fetch first') ||
    error?.includes('non-fast-forward') ||
    error?.includes('remote contains work'),
  );
}

export function isMissingPushSourceRef(error?: string | null): boolean {
  return Boolean(
    error && /src refspec .* does not match any|does not have any commits|failed to resolve ref/i.test(error),
  );
}

export function cloneUrlFromGitHubCreateResult(
  result: { success: boolean; error?: string | null; data?: { cloneUrl?: string | null } | null },
  ownerLogin: string | undefined,
  repoName: string,
): string | null {
  if (result.success) return result.data?.cloneUrl ?? '';
  if (result.error?.includes('already exists') && ownerLogin) {
    return `https://github.com/${ownerLogin}/${repoName}.git`;
  }
  return null;
}
