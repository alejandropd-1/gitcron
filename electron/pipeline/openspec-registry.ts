import * as fs from 'node:fs';
import * as https from 'node:https';
import * as path from 'node:path';
import { parseSemver } from '../../lib/openspec-version';
import type { OpenSpecRegistryCheck } from '../../types/pipeline';

const TARGET_PACKAGE = '@fission-ai/openspec';
const REGISTRY_URL = `https://registry.npmjs.org/${TARGET_PACKAGE}/latest`;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MB
export const STALE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Hosts de loopback. El patrón es el inverso del de `lmstudio-adapter` (que
 * EXIGE loopback porque habla con un servidor local): la consulta al registry
 * sale del proceso principal hacia un destino público y nunca debe poder
 * dirigirse a la propia máquina.
 */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/**
 * Guarda de destino del registry (2.8): rechaza URLs loopback antes de emitir
 * la petición. La URL es una constante del proceso principal — el renderer
 * nunca la elige — pero la guarda existe para que ningún cambio futuro (ni un
 * error) pueda convertir esta consulta en un pedido a un servicio local.
 */
export function assertNonLoopbackRegistryUrl(target: string): URL {
  const url = new URL(target);
  if (url.protocol !== 'https:') {
    throw new Error('Registry URL must be https');
  }
  if (LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(`Registry URL must not target a loopback host: ${url.hostname}`);
  }
  return url;
}

export interface OpenSpecRegistryCacheEntry {
  latestVersion: string;
  checkedAt: string; // ISO-8601
}

export interface CheckLatestOpenSpecVersionDeps {
  userDataDir?: string | null;
  now?: () => Date;
  fetchLatestVersion?: (url: string, timeoutMs: number) => Promise<string | null>;
  /**
   * Transporte HTTP inyectable: permite ejercitar los modos de fallo reales
   * (timeout, 404, 500, red indisponible) a través de la lógica productiva
   * de `defaultFetchLatestVersion`, en vez de colapsarlos a `null` con un
   * `fetchLatestVersion` de prueba.
   */
  httpGet?: RegistryHttpGet;
  readCacheFile?: (cachePath: string) => string | null;
  writeCacheFile?: (cachePath: string, content: string) => void;
}

/**
 * Superficie mínima de `https.get` que usa el transporte del registry,
 * declarada structuralmente para poder inyectarla en pruebas.
 */
export interface RegistryHttpResponse {
  statusCode?: number;
  resume(): void;
  on(event: 'data', listener: (chunk: string | Buffer) => void): unknown;
  on(event: 'end', listener: () => void): unknown;
}

export interface RegistryHttpRequest {
  destroy(): void;
  on(event: 'error', listener: (err: Error) => void): unknown;
}

export type RegistryHttpGet = (
  url: string,
  options: { headers: Record<string, string> },
  callback: (res: RegistryHttpResponse) => void,
) => RegistryHttpRequest;

const defaultHttpGet: RegistryHttpGet = (url, options, callback) =>
  https.get(url, options, callback);

/**
 * Transporte real del registry. Exportado para que su guarda de destino sea
 * ejercitable en pruebas negativas.
 */
export function defaultFetchLatestVersion(
  url: string,
  timeoutMs: number,
  httpGet: RegistryHttpGet = defaultHttpGet,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    // Guarda primero: un destino loopback se rechaza SIN emitir la petición.
    try {
      assertNonLoopbackRegistryUrl(url);
    } catch (err) {
      reject(err);
      return;
    }
    let timer: NodeJS.Timeout;
    const req = httpGet(url, { headers: { 'User-Agent': 'GitCron-OpenSpec-Engine/1.8' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        clearTimeout(timer);
        return resolve(null);
      }

      let data = '';
      let bytes = 0;

      res.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > MAX_RESPONSE_BYTES) {
          req.destroy();
          clearTimeout(timer);
          return resolve(null);
        }
        data += chunk;
      });

      res.on('end', () => {
        clearTimeout(timer);
        try {
          const json = JSON.parse(data);
          const ver = typeof json?.version === 'string' ? json.version.trim() : null;
          if (ver && parseSemver(ver)) {
            return resolve(ver);
          }
          return resolve(null);
        } catch {
          return resolve(null);
        }
      });
    });

    req.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });

    timer = setTimeout(() => {
      req.destroy();
      resolve(null);
    }, timeoutMs);
  });
}

function defaultReadCacheFile(cachePath: string): string | null {
  try {
    if (!fs.existsSync(cachePath)) return null;
    return fs.readFileSync(cachePath, 'utf8');
  } catch {
    return null;
  }
}

function defaultWriteCacheFile(cachePath: string, content: string): void {
  const dir = path.dirname(cachePath);
  const tmpPath = `${cachePath}.tmp.${process.pid}.${Math.random().toString(36).slice(2)}`;
  const backupPath = `${cachePath}.bak.${process.pid}.${Math.random().toString(36).slice(2)}`;
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(tmpPath, content, 'utf8');

    if (process.platform === 'win32' && fs.existsSync(cachePath)) {
      try {
        fs.renameSync(cachePath, backupPath);
        try {
          fs.renameSync(tmpPath, cachePath);
          if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        } catch (renameErr) {
          if (fs.existsSync(backupPath)) fs.renameSync(backupPath, cachePath);
          throw renameErr;
        }
      } catch {
        // Fallback directo sobreescribiendo el archivo sin dejar ventana vacía
        fs.writeFileSync(cachePath, content, 'utf8');
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      }
    } else {
      fs.renameSync(tmpPath, cachePath);
    }
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      if (fs.existsSync(backupPath)) {
        if (!fs.existsSync(cachePath)) fs.renameSync(backupPath, cachePath);
        else fs.unlinkSync(backupPath);
      }
    } catch {
      // ignore
    }
    throw err;
  }
}

/**
 * Valida si una cadena de fecha es una fecha ISO-8601 finita y calendáricamente válida.
 * Descarta fechas futuras o fechas calendáricamente inválidas (ej. 2026-02-30).
 */
export function isValidIsoDate(dateStr: string, nowDate: Date = new Date()): boolean {
  if (typeof dateStr !== 'string' || !dateStr) return false;
  const d = new Date(dateStr);
  const timestamp = d.getTime();
  if (Number.isNaN(timestamp) || !Number.isFinite(timestamp)) return false;
  // Descartar fechas en el futuro (> 1 min por skew de reloj)
  if (timestamp > nowDate.getTime() + 60_000) return false;

  // Validación calendárica estricta para evitar desbordamientos tipo 2026-02-30 -> 2026-03-02
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) {
      return false;
    }
  }
  return true;
}

/**
 * Obtiene el estado actual de la caché local de la versión del registry sin hacer red.
 */
export function getLocalCacheRegistryStatus(
  userDataDir: string | null,
  nowDate: Date = new Date(),
  readCache: (p: string) => string | null = defaultReadCacheFile,
): OpenSpecRegistryCheck | null {
  if (!userDataDir) return null;
  const cachePath = path.join(userDataDir, 'openspec-registry-cache.json');
  const rawCache = readCache(cachePath);
  if (!rawCache) return null;

  try {
    const cached: OpenSpecRegistryCacheEntry = JSON.parse(rawCache);
    if (
      typeof cached?.latestVersion === 'string' &&
      parseSemver(cached.latestVersion) &&
      isValidIsoDate(cached.checkedAt)
    ) {
      const cachedTime = new Date(cached.checkedAt).getTime();
      const ageMs = nowDate.getTime() - cachedTime;
      const ageSec = Math.max(0, Math.floor(ageMs / 1000));
      const freshness: 'fresh' | 'stale' = ageMs <= STALE_CACHE_TTL_MS ? 'fresh' : 'stale';

      return {
        status: 'cached',
        latestVersion: cached.latestVersion,
        checkedAt: cached.checkedAt,
        fromCache: true,
        cacheAgeSeconds: Number.isNaN(ageSec) ? null : ageSec,
        freshness,
        error: null,
      };
    }
  } catch {
    // cache inválido
  }
  return null;
}

/**
 * Consulta la última versión oficial de `@fission-ai/openspec` en npm registry.
 *
 * Nunca acepta paquete ni URL desde el renderer.
 * Mantiene una caché atómica fechada bajo `userData` y soporta DI para pruebas.
 */
export async function checkLatestOpenSpecVersion(
  deps: CheckLatestOpenSpecVersionDeps = {},
): Promise<OpenSpecRegistryCheck> {
  const now = deps.now ? deps.now() : new Date();
  const nowIso = now.toISOString();

  const userDataDir = deps.userDataDir ?? null;
  const cachePath = userDataDir ? path.join(userDataDir, 'openspec-registry-cache.json') : null;

  const readCache = deps.readCacheFile ?? defaultReadCacheFile;
  const writeCache = deps.writeCacheFile ?? defaultWriteCacheFile;
  const fetchVersion = deps.fetchLatestVersion
    ?? ((url: string, timeoutMs: number) => defaultFetchLatestVersion(url, timeoutMs, deps.httpGet));

  // 1. Intentar consulta online
  let onlineVersion: string | null = null;
  try {
    onlineVersion = await fetchVersion(REGISTRY_URL, FETCH_TIMEOUT_MS);
  } catch {
    onlineVersion = null;
  }

  if (onlineVersion && parseSemver(onlineVersion)) {
    if (cachePath) {
      const entry: OpenSpecRegistryCacheEntry = {
        latestVersion: onlineVersion,
        checkedAt: nowIso,
      };
      try {
        writeCache(cachePath, JSON.stringify(entry, null, 2));
      } catch {
        // fallo de escritura no impide devolver el estado online
      }
    }

    return {
      status: 'online',
      latestVersion: onlineVersion,
      checkedAt: nowIso,
      fromCache: false,
      cacheAgeSeconds: 0,
      freshness: 'fresh',
      error: null,
    };
  }

  // 2. Fallback a caché local si la consulta falló o timeout
  const localCache = getLocalCacheRegistryStatus(userDataDir, now, readCache);
  if (localCache) {
    return localCache;
  }

  // 3. Ni online ni caché disponible
  return {
    status: 'offline',
    latestVersion: null,
    checkedAt: nowIso,
    fromCache: false,
    cacheAgeSeconds: null,
    freshness: 'unknown',
    error: 'npm registry unreachable and no valid cache available',
  };
}
