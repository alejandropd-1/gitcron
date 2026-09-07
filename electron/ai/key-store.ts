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

/**
 * Identificadores de proveedores con claves en el baúl seguro.
 * Desacoplado de AIPredictionProvider['id'] para admitir proveedores de texto
 * (LM Studio/local, OpenRouter, Unsloth Desktop, etc.) sin refactorizar el almacenamiento.
 */
export type AIKeyProviderId =
  | 'claude'
  | 'openrouter'
  | 'openai'
  | 'gemini'
  | 'opencode'
  | 'unsloth'
  | (string & {});

type ProviderId = AIKeyProviderId;

interface KeyFile {
  // provider id or provider:secretName -> base64 of safeStorage-encrypted key bytes
  [storageKey: string]: string;
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

/**
 * Compone la clave de almacenamiento interna en el baúl.
 * Si secretName está ausente o vacío, se indexa por provider directamente (compatibilidad hacia atrás).
 * Si secretName está presente, se indexa como `${provider}:${secretName}`.
 */
export function buildSecretKey(provider: ProviderId, secretName?: string): string {
  const p = provider.trim();
  const s = secretName?.trim();
  return s ? `${p}:${s}` : p;
}

/** Store/replace a provider key or named secret (encrypted at rest). One-way from the renderer's view. */
export function setKey(provider: ProviderId, key: string, secretName?: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption unavailable; refusing to store key in plaintext');
  }
  const data = readFile();
  const targetKey = buildSecretKey(provider, secretName);
  data[targetKey] = safeStorage.encryptString(key).toString('base64');
  writeFile(data);
}

/** INTERNAL ONLY — never expose over IPC. Used by adapters inside main. */
export function getKey(provider: ProviderId, secretName?: string): string | undefined {
  const data = readFile();
  const targetKey = buildSecretKey(provider, secretName);
  const enc = data[targetKey];
  if (!enc) return undefined;
  try {
    return safeStorage.decryptString(Buffer.from(enc, 'base64'));
  } catch {
    return undefined;
  }
}

/** Safe to expose: tells the renderer only whether a key exists. */
export function hasKey(provider: ProviderId, secretName?: string): boolean {
  const targetKey = buildSecretKey(provider, secretName);
  return Boolean(readFile()[targetKey]);
}

/**
 * Elimina una clave o secreto nombrado del baúl.
 * Si se especifica secretName, elimina sólo ese secreto nombrado.
 * Si no se especifica secretName, elimina la clave principal del proveedor y todos sus secretos nombrados (`${provider}:*`).
 */
export function removeKey(provider: ProviderId, secretName?: string): void {
  const data = readFile();
  if (secretName && secretName.trim()) {
    delete data[buildSecretKey(provider, secretName)];
  } else {
    const cleanProvider = provider.trim();
    const prefix = `${cleanProvider}:`;
    delete data[cleanProvider];
    for (const k of Object.keys(data)) {
      if (k.startsWith(prefix)) {
        delete data[k];
      }
    }
  }
  writeFile(data);
}

/**
 * Safe-to-expose stable identifier of WHICH key is stored — NOT any part of the
 * secret. We hash the full key with SHA-256 and return only the first 8 hex
 * chars.
 */
export function getKeyFingerprint(provider: ProviderId, secretName?: string): string | null {
  const key = getKey(provider, secretName);
  if (!key) return null;
  return createHash('sha256').update(key).digest('hex').slice(0, 8);
}

/**
 * Recupera las credenciales de Unsloth Desktop guardadas en el baúl seguro:
 * token del modelo, ID de cliente de Cloudflare Access y secreto de cliente de Cloudflare Access.
 */
export function getUnslothCredentials(): {
  apiKey?: string;
  cfAccessClientId?: string;
  cfAccessClientSecret?: string;
} {
  return {
    apiKey: getKey('unsloth') ?? getKey('unsloth', 'apiKey') ?? getKey('unsloth', 'token'),
    cfAccessClientId: getKey('unsloth', 'cf-client-id') ?? getKey('unsloth', 'cf-access-client-id'),
    cfAccessClientSecret:
      getKey('unsloth', 'cf-client-secret') ?? getKey('unsloth', 'cf-access-client-secret'),
  };
}
