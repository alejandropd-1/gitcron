// electron/ai/key-store.ts
// Multi-provider API-key vault. MAIN PROCESS ONLY.
//
// SECURITY (brief §0 / §6.5 / SECURITY.md):
//  - Keys encrypted with Electron safeStorage (DPAPI / Keychain / libsecret),
//    same mechanism as the GitHub token.
//  - One key per provider. Keys live and are used ONLY in main.
//  - The renderer NEVER receives a key. It can only ask "is there a key for X?"
//    (boolean) and submit a new key to be stored (one-way: in, encrypted, never out).
//  - getKey() is NOT exposed over IPC — it's internal, called only by the
//    provider adapters when assembling a request in main.
//  - OpenCode (local/gateway) may have NO key — callers must tolerate undefined.

import { app, safeStorage } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import type { AIPredictionProvider } from '../../types/temporal-agent';

export type ProviderId = AIPredictionProvider['id'];

interface KeyFile {
  // provider id -> base64 of safeStorage-encrypted key bytes
  [providerId: string]: string;
}

function keyFilePath(): string {
  return path.join(app.getPath('userData'), 'ai-keys.enc');
}

function readFile(): KeyFile {
  try {
    return JSON.parse(fs.readFileSync(keyFilePath(), 'utf8')) as KeyFile;
  } catch {
    return {};
  }
}

function writeFile(data: KeyFile): void {
  fs.writeFileSync(keyFilePath(), JSON.stringify(data), { mode: 0o600 });
}

/** Store/replace a provider key (encrypted at rest). One-way from the renderer's view. */
export function setKey(provider: ProviderId, key: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption unavailable; refusing to store key in plaintext');
  }
  const data = readFile();
  data[provider] = safeStorage.encryptString(key).toString('base64');
  writeFile(data);
}

/** INTERNAL ONLY — never expose over IPC. Used by adapters inside main. */
export function getKey(provider: ProviderId): string | undefined {
  const data = readFile();
  const enc = data[provider];
  if (!enc) return undefined;
  try {
    return safeStorage.decryptString(Buffer.from(enc, 'base64'));
  } catch {
    return undefined;
  }
}

/** Safe to expose: tells the renderer only whether a key exists. */
export function hasKey(provider: ProviderId): boolean {
  return Boolean(readFile()[provider]);
}

export function removeKey(provider: ProviderId): void {
  const data = readFile();
  delete data[provider];
  writeFile(data);
}

/**
 * Safe-to-expose stable identifier of WHICH key is stored — NOT any part of the
 * secret. We hash the full key with SHA-256 and return only the first 8 hex
 * chars. This lets the user recognize which key they loaded (the fingerprint is
 * deterministic per-key) while no byte of the real key ever leaves main.
 * Replaces the old getKeyPrefix(), which leaked the first 10 real characters.
 */
export function getKeyFingerprint(provider: ProviderId): string | null {
  const key = getKey(provider);
  if (!key) return null;
  return createHash('sha256').update(key).digest('hex').slice(0, 8);
}
