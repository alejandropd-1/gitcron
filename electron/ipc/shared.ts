// electron/ipc/shared.ts
// Helpers compartidos por todos los módulos IPC: sanitización de errores/logs
// (nunca filtrar tokens), autenticación GitHub vía http.extraheader (nunca
// URLs con token), y validación de paths relativos al repo.

import * as path from 'path';
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

/**
 * Disable credential helper and askpass for token-authed operations.
 *
 * git-for-windows ≥2.40 blocks ANY `-c credential.helper=...` (even an empty
 * value) with "Configuring credential.helper is not permitted without enabling
 * allowUnsafeCredentialHelper". Upstream git is more permissive — it only
 * blocks NON-empty values — but on Windows we must explicitly opt in via
 * `safe.allowUnsafeCredentialHelper=true` before our empty override is honored.
 *
 * Same story for `GIT_CONFIG_GLOBAL`: git-for-windows blocks it unless
 * `safe.allowUnsafeConfigPaths=true` is set. We don't use GIT_CONFIG_GLOBAL
 * anymore (removed in v1.1.5), so that flag is no longer needed.
 *
 * Env vars complement the config:
 *   GIT_TERMINAL_PROMPT=0  → no interactive terminal prompts
 *   GCM_INTERACTIVE=never  → GCM never opens its GUI dialog
 */
const NO_CREDENTIAL_HELPER_CONFIG: string[] = [
  'safe.allowUnsafeCredentialHelper=true',
  'credential.helper=',
  'core.askpass=',
];

const NO_CREDENTIAL_HELPER_OPTIONS: Partial<SimpleGitOptions> = {
  config: NO_CREDENTIAL_HELPER_CONFIG,
  unsafe: {
    allowUnsafeCredentialHelper: true,
    allowUnsafeAskPass: true,
  },
};

export function getGitHubAuthOptions(token: string): Partial<SimpleGitOptions> {
  const basic = Buffer.from(`x-access-token:${token}`, 'utf8').toString('base64');
  return {
    ...NO_CREDENTIAL_HELPER_OPTIONS,
    config: [
      ...NO_CREDENTIAL_HELPER_CONFIG,
      `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basic}`,
    ],
  };
}

export function getNoPromptEnv(): Record<string, string> {
  return {
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'never',
  };
}

/**
 * Redact any GitHub-token-in-URL pattern from a string before logging.
 * Matches token-in-URL and token-in-extraheader patterns and replaces the token
 * with `[REDACTED]`. Safe to call with any value —
 * non-strings are stringified first.
 */
export function sanitizeForLog(value: unknown): string {
  let str: string;
  try {
    str = typeof value === 'string'
      ? value
      : value instanceof Error
        ? `${value.name}: ${value.message}`
        : JSON.stringify(value);
  } catch {
    str = String(value);
  }
  return str
    .replace(/(x-access-token:)[^@]+@/g, '$1[REDACTED]@')
    .replace(/(AUTHORIZATION:\s*basic\s+)[A-Za-z0-9+/=]+/gi, '$1[REDACTED]');
}

export function formatFetchError(error: unknown): string {
  const err = error as { message?: string; cause?: { message?: string; code?: string } };
  const message = err?.message ?? 'Unknown error';
  const causeMessage = err?.cause?.message;
  const causeCode = err?.cause?.code;
  return sanitizeForLog([message, causeCode, causeMessage].filter(Boolean).join(' - '));
}

/**
 * Safely extract a sanitized error message from any thrown value.
 * Replaces `error.message` in every IPC return path so tokens never leak
 * through git CLI error output (e.g. "fatal: unable to access https://x-access-token:abc@github.com/...").
 */
export function errMsg(error: unknown): string {
  const e = error as { message?: string };
  return sanitizeForLog(e?.message ?? String(error));
}

export function normalizeSafeDirectoryPath(targetPath: string): string {
  return path.resolve(targetPath).replace(/\\/g, '/');
}

function isDubiousOwnershipError(message: string): boolean {
  return /detected dubious ownership|safe\.directory/i.test(message);
}

export function repoAccessErrMsg(error: unknown, targetPath: string): string {
  const message = errMsg(error);
  if (!isDubiousOwnershipError(message)) return message;

  const safePath = normalizeSafeDirectoryPath(targetPath);
  return [
    `Git bloqueo "${path.basename(targetPath)}" porque la carpeta pertenece a otro usuario o a Administradores.`,
    'Esto puede pasar si el repo se clono desde una terminal elevada o con otra cuenta de Windows.',
    `Podés confiar esta carpeta desde GitCron o correr: git config --global --add safe.directory ${safePath}`,
  ].join('\n');
}

/**
 * Resolve a repo-relative path defensively. Returns null when the resolved
 * path escapes the repo root (".." traversal or absolute paths).
 */
export function resolveRepoRelativePath(repoRoot: string, relativeFilePath: string): string | null {
  const resolved = path.resolve(repoRoot, relativeFilePath);
  const rel = path.relative(repoRoot, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return resolved;
}

export async function getGitHubOwnerRepoFromOrigin(targetPath: string): Promise<{ owner: string; repo: string } | null> {
  const g = simpleGit(targetPath);
  const remotes = await g.getRemotes(true);
  const origin = remotes.find((r) => r.name === 'origin');
  const url = origin?.refs?.fetch || origin?.refs?.push || '';
  const match = url.match(/github\.com[:/]+([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

// Helper: authenticate GitHub HTTPS remotes without writing token-bearing URLs.
// The token is passed through a process-scoped http.extraheader config while
// credential helpers and interactive prompts stay disabled.
export async function withGitHubToken<T>(
  targetPath: string,
  token: string | undefined,
  fn: (g: SimpleGit) => Promise<T>,
): Promise<T> {
  if (!token) return fn(simpleGit(targetPath));

  // Read the remote with a vanilla instance so auth config never affects local
  // plumbing. SSH and non-GitHub remotes keep their native auth behavior.
  const plain = simpleGit(targetPath);
  const remotes = await plain.getRemotes(true);
  const origin = remotes.find((r) => r.name === 'origin');
  const originalUrl = origin?.refs?.push || origin?.refs?.fetch;
  const isHttpsGithub = originalUrl && /^https:\/\/github\.com\//i.test(originalUrl);
  if (!isHttpsGithub) return fn(simpleGit(targetPath));

  const g = simpleGit({ ...getGitHubAuthOptions(token), baseDir: targetPath });
  g.env(getNoPromptEnv());
  return fn(g);
}
