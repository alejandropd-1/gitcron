import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import {
  assertNonLoopbackRegistryUrl,
  checkLatestOpenSpecVersion,
  defaultFetchLatestVersion,
  getLocalCacheRegistryStatus,
  isValidIsoDate,
  STALE_CACHE_TTL_MS,
} from '../pipeline/openspec-registry';

describe('checkLatestOpenSpecVersion & Registry Cache (Audit Point 11 Tests)', () => {
  it('valida fechas ISO finitas y descarta fechas futuras o calendariamente inválidas (ej. 2026-02-30)', () => {
    const now = new Date('2026-08-13T10:00:00Z');
    expect(isValidIsoDate('2026-08-13T09:00:00Z', now)).toBe(true);
    expect(isValidIsoDate('invalid-date', now)).toBe(false);
    expect(isValidIsoDate('', now)).toBe(false);
    // Fecha calendáricamente inválida (30 de febrero no existe)
    expect(isValidIsoDate('2026-02-30T10:00:00Z', now)).toBe(false);
    expect(isValidIsoDate('2026-04-31T10:00:00Z', now)).toBe(false);
    // Fecha futura (mañana) debe ser descartada por skew de reloj
    expect(isValidIsoDate('2026-08-15T10:00:00Z', now)).toBe(false);
  });

  it('maneja consulta online exitosa con escritura en caché', async () => {
    const mockWriteCache = vi.fn();
    const result = await checkLatestOpenSpecVersion({
      userDataDir: 'C:\\userData',
      now: () => new Date('2026-08-13T10:00:00Z'),
      fetchLatestVersion: async () => '1.8.0',
      readCacheFile: () => null,
      writeCacheFile: mockWriteCache,
    });

    expect(result.status).toBe('online');
    expect(result.latestVersion).toBe('1.8.0');
    expect(result.fromCache).toBe(false);
    expect(result.cacheAgeSeconds).toBe(0);
    expect(result.freshness).toBe('fresh');
    expect(mockWriteCache).toHaveBeenCalledWith(
      expect.stringContaining('openspec-registry-cache.json'),
      expect.stringContaining('1.8.0'),
    );
  });

  // Los tres modos de fallo del transporte (timeout, 404, 500) y la red
  // indisponible producen a propósito el MISMO estado declarado (fallback a
  // caché con su antigüedad): la distinción se ejerce a nivel de transporte,
  // inyectando httpGet sobre la lógica productiva de defaultFetchLatestVersion.
  const freshEntry = JSON.stringify({
    latestVersion: '1.8.0',
    checkedAt: '2026-08-13T09:30:00Z', // Hace 30 min
  });
  const staleEntry = JSON.stringify({
    latestVersion: '1.8.0',
    checkedAt: '2026-08-11T10:00:00Z', // Hace 48h (>24h)
  });

  const statusResponse = (statusCode: number) => ({
    statusCode,
    resume: vi.fn(),
    on: vi.fn(),
  });
  const requestStub = () => ({ destroy: vi.fn(), on: vi.fn() });

  it('fallback a caché fresca cuando el transporte da timeout (el registry nunca responde)', async () => {
    vi.useFakeTimers();
    try {
      const pending = checkLatestOpenSpecVersion({
        userDataDir: 'C:\\userData',
        now: () => new Date('2026-08-13T10:00:00Z'),
        readCacheFile: () => freshEntry,
        // La petición se abre pero jamás llega respuesta: sólo el timeout la corta.
        httpGet: () => requestStub(),
      });
      await vi.advanceTimersByTimeAsync(10_500);
      const result = await pending;

      expect(result.status).toBe('cached');
      expect(result.freshness).toBe('fresh');
      expect(result.cacheAgeSeconds).toBe(1800);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fallback a caché fresca cuando el registry responde 404', async () => {
    const result = await checkLatestOpenSpecVersion({
      userDataDir: 'C:\\userData',
      now: () => new Date('2026-08-13T10:00:00Z'),
      readCacheFile: () => freshEntry,
      httpGet: (_url, _opts, cb) => {
        setImmediate(() => cb(statusResponse(404)));
        return requestStub();
      },
    });

    expect(result.status).toBe('cached');
    expect(result.freshness).toBe('fresh');
    expect(result.cacheAgeSeconds).toBe(1800);
  });

  it('fallback a caché stale cuando el registry responde 500', async () => {
    const result = await checkLatestOpenSpecVersion({
      userDataDir: 'C:\\userData',
      now: () => new Date('2026-08-13T10:00:00Z'),
      readCacheFile: () => staleEntry,
      httpGet: (_url, _opts, cb) => {
        setImmediate(() => cb(statusResponse(500)));
        return requestStub();
      },
    });

    expect(result.status).toBe('cached');
    expect(result.freshness).toBe('stale');
    expect(result.cacheAgeSeconds).toBe(172800);
  });

  it('fallback a caché fresca cuando la red está indisponible (error de transporte)', async () => {
    const result = await checkLatestOpenSpecVersion({
      userDataDir: 'C:\\userData',
      now: () => new Date('2026-08-13T10:00:00Z'),
      readCacheFile: () => freshEntry,
      httpGet: (_url, _opts, _cb) => ({
        destroy: vi.fn(),
        on: (event: string, listener: (err: Error) => void) => {
          if (event === 'error') setImmediate(() => listener(new Error('getaddrinfo EAI_AGAIN')));
        },
      }),
    });

    expect(result.status).toBe('cached');
    expect(result.freshness).toBe('fresh');
    expect(result.cacheAgeSeconds).toBe(1800);
  });

  it('rechaza caché corrupta por JSON inválido, SemVer inválido o fecha ISO corrupta', () => {
    const now = new Date('2026-08-13T10:00:00Z');
    expect(getLocalCacheRegistryStatus('C:\\userData', now, () => '{bad json')).toBeNull();
    expect(getLocalCacheRegistryStatus('C:\\userData', now, () => JSON.stringify({ latestVersion: 'invalid-semver', checkedAt: now.toISOString() }))).toBeNull();
    expect(getLocalCacheRegistryStatus('C:\\userData', now, () => JSON.stringify({ latestVersion: '1.8.0', checkedAt: 'bad-date' }))).toBeNull();
    expect(getLocalCacheRegistryStatus('C:\\userData', now, () => JSON.stringify({ latestVersion: '1.8.0', checkedAt: '2026-02-30T00:00:00Z' }))).toBeNull();
  });

  it('devuelve status offline cuando ni online ni caché están disponibles', async () => {
    const result = await checkLatestOpenSpecVersion({
      userDataDir: 'C:\\userData',
      now: () => new Date('2026-08-13T10:00:00Z'),
      fetchLatestVersion: async () => null,
      readCacheFile: () => null,
    });

    expect(result.status).toBe('offline');
    expect(result.latestVersion).toBeNull();
    expect(result.error).toContain('unreachable');
  });

  it('la guarda de no-loopback rechaza destinos locales y acepta el registry público', () => {
    // El destino del registry es público; el patrón es el inverso al de
    // lmstudio-adapter, que EXIGE loopback para hablar con un servidor local.
    expect(assertNonLoopbackRegistryUrl('https://registry.npmjs.org/@fission-ai/openspec/latest').hostname).toBe('registry.npmjs.org');

    expect(() => assertNonLoopbackRegistryUrl('https://127.0.0.1/x')).toThrow('loopback');
    expect(() => assertNonLoopbackRegistryUrl('https://localhost/x')).toThrow('loopback');
    expect(() => assertNonLoopbackRegistryUrl('https://[::1]/x')).toThrow('loopback');
    // No es loopback pero tampoco es un destino válido: https es obligatorio.
    expect(() => assertNonLoopbackRegistryUrl('http://registry.npmjs.org/x')).toThrow('https');
  });

  it('un destino loopback es rechazado por el transporte SIN emitir la petición', async () => {
    const httpGet = vi.fn();
    await expect(defaultFetchLatestVersion('https://127.0.0.1/openspec/latest', 5_000, httpGet as never)).rejects.toThrow('loopback');
    await expect(defaultFetchLatestVersion('https://localhost/openspec/latest', 5_000, httpGet as never)).rejects.toThrow('loopback');
    await expect(defaultFetchLatestVersion('https://[::1]/openspec/latest', 5_000, httpGet as never)).rejects.toThrow('loopback');
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('ejercita el reemplazo seguro de caché en disco real sin dejar ventana vacía', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-cache-test-'));
    try {
      const cachePath = path.join(tempDir, 'openspec-registry-cache.json');

      // 1. Primera escritura
      await checkLatestOpenSpecVersion({
        userDataDir: tempDir,
        now: () => new Date('2026-08-13T10:00:00Z'),
        fetchLatestVersion: async () => '1.8.0',
      });

      expect(fs.existsSync(cachePath)).toBe(true);
      const firstContent = fs.readFileSync(cachePath, 'utf8');
      expect(firstContent).toContain('1.8.0');

      // 2. Segunda escritura (reemplazo seguro atómico)
      await checkLatestOpenSpecVersion({
        userDataDir: tempDir,
        now: () => new Date('2026-08-13T11:00:00Z'),
        fetchLatestVersion: async () => '1.8.1',
      });

      expect(fs.existsSync(cachePath)).toBe(true);
      const secondContent = fs.readFileSync(cachePath, 'utf8');
      expect(secondContent).toContain('1.8.1');

      // 3. No quedan archivos temporales .tmp o .bak huérfanos
      const leftover = fs.readdirSync(tempDir).filter((f) => f.includes('.tmp.') || f.includes('.bak.'));
      expect(leftover).toEqual([]);
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });
});
