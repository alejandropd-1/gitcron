import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import * as crypto from 'node:crypto';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  extractHardenedTarGz,
  extractTarBuffer,
  sanitizeTarEntryPath,
  isSafePathSegment,
} from '../pipeline/openspec-tar-extractor';
import {
  downloadTarballWithLimits,
  executeManagedRuntimeStagingPoc,
  verifySriIntegrity,
  buildElectronNodeEnv,
  LIFECYCLE_SCRIPTS_POLICY,
  PINNED_OPENSPEC_PACKAGE,
  PINNED_OPENSPEC_VERSION,
} from '../pipeline/openspec-managed-runtime-poc';

function createTarHeader(
  name: string,
  size: number,
  typeflag: string = '0',
  prefix: string = '',
): Buffer {
  const header = Buffer.alloc(512, 0);
  header.write(name, 0, 100, 'utf8');
  header.write((0o644).toString(8).padStart(6, '0') + ' \0', 100, 8, 'utf8');
  header.write((0o1000).toString(8).padStart(6, '0') + ' \0', 108, 8, 'utf8');
  header.write((0o1000).toString(8).padStart(6, '0') + ' \0', 116, 8, 'utf8');
  header.write(size.toString(8).padStart(11, '0') + ' ', 124, 12, 'utf8');
  header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + ' ', 136, 12, 'utf8');
  header.write(typeflag, 156, 1, 'utf8');
  header.write('ustar\0', 257, 6, 'utf8');
  header.write('00', 263, 2, 'utf8');
  if (prefix) {
    header.write(prefix, 345, 155, 'utf8');
  }

  // Checksum calculation (field 148..155 treated as spaces 0x20 during sum)
  header.fill(0x20, 148, 156);
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += header[i];
  header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'utf8');

  return header;
}

function buildTarArchive(
  entries: Array<{ name: string; content?: string | Buffer; typeflag?: string; prefix?: string }>,
): Buffer {
  const chunks: Buffer[] = [];
  for (const entry of entries) {
    const rawContent = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content ?? '', 'utf8');
    const size = entry.typeflag === '5' ? 0 : rawContent.length;
    const header = createTarHeader(entry.name, size, entry.typeflag ?? '0', entry.prefix ?? '');
    chunks.push(header);
    if (size > 0) {
      chunks.push(rawContent);
      const padding = 512 - (size % 512);
      if (padding < 512) {
        chunks.push(Buffer.alloc(padding, 0));
      }
    }
  }
  // Dos bloques finales de ceros (1024 bytes)
  chunks.push(Buffer.alloc(1024, 0));
  return Buffer.concat(chunks);
}

function buildTarGzArchive(
  entries: Array<{ name: string; content?: string | Buffer; typeflag?: string; prefix?: string }>,
): Buffer {
  const tar = buildTarArchive(entries);
  return zlib.gzipSync(tar);
}

describe('OpenSpec Managed Runtime POC', () => {
  let tmpBaseDir: string;

  beforeEach(() => {
    tmpBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-poc-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tmpBaseDir)) {
        fs.rmSync(tmpBaseDir, { recursive: true, force: true });
      }
    } catch {
      // Ignorar errores de cleanup
    }
  });

  describe('3.5 & D16: Constantes de versión, paquete y política de lifecycle scripts', () => {
    it('declara el paquete y versión pinneados exactos sin latest ni rangos', () => {
      expect(PINNED_OPENSPEC_PACKAGE).toBe('@fission-ai/openspec');
      expect(PINNED_OPENSPEC_VERSION).toBe('1.8.0');
    });

    it('declara política explícita de inhabilitación de scripts de ciclo de vida', () => {
      expect(LIFECYCLE_SCRIPTS_POLICY).toBe('DISABLED_BY_DEFAULT_IGNORE_SCRIPTS');
    });
  });

  describe('3.2: Sanitización de rutas y extractor endurecido (Ataques y pruebas negativas)', () => {
    it('rechaza segmentos de ruta con path traversal .. en cualquier posición', () => {
      expect(sanitizeTarEntryPath('package/../escape.js')).toBeNull();
      expect(sanitizeTarEntryPath('package/foo/../../bar.js')).toBeNull();
      expect(sanitizeTarEntryPath('..')).toBeNull();
      expect(sanitizeTarEntryPath('../something')).toBeNull();
    });

    it('rechaza rutas absolutas POSIX y Windows', () => {
      expect(sanitizeTarEntryPath('/etc/passwd')).toBeNull();
      expect(sanitizeTarEntryPath('C:/Windows/System32/calc.exe')).toBeNull();
      expect(sanitizeTarEntryPath('D:\\secret.txt')).toBeNull();
    });

    it('rechaza nombres reservados en Windows (CON, PRN, AUX, NUL, COM1..9, LPT1..9)', () => {
      expect(isSafePathSegment('aux', true)).toBe(false);
      expect(isSafePathSegment('aux.txt', true)).toBe(false);
      expect(isSafePathSegment('com1.js', true)).toBe(false);
      expect(isSafePathSegment('nul', true)).toBe(false);
      expect(isSafePathSegment('valid-name.js', true)).toBe(true);
    });

    it('rechaza caracteres inválidos y finales con punto o espacio en Windows', () => {
      expect(isSafePathSegment('test<bad>', true)).toBe(false);
      expect(isSafePathSegment('space-at-end ', true)).toBe(false);
      expect(isSafePathSegment('dot-at-end.', true)).toBe(false);
    });

    it('rechaza tarball con entrada ../escape y limpia el destino de staging', async () => {
      const dest = path.join(tmpBaseDir, 'staging-traversal');
      const maliciousTgz = buildTarGzArchive([
        { name: 'package/bin/openspec.js', content: 'console.log("ok");' },
        { name: 'package/../escaped.txt', content: 'MALICIOUS_CONTENT' },
      ]);

      const res = await extractHardenedTarGz(maliciousTgz, dest);
      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
      // El directorio de staging debe haber sido limpiado completamente
      expect(fs.existsSync(dest)).toBe(false);
    });

    it('rechaza tarball con ruta absoluta y limpia el destino', async () => {
      const dest = path.join(tmpBaseDir, 'staging-abs');
      const maliciousTgz = buildTarGzArchive([
        { name: '/etc/shadow', content: 'root:x:0:0' },
      ]);

      const res = await extractHardenedTarGz(maliciousTgz, dest);
      expect(res.ok).toBe(false);
      expect(fs.existsSync(dest)).toBe(false);
    });

    it('rechaza symlinks (typeflag 2) y hardlinks (typeflag 1)', () => {
      const dest = path.join(tmpBaseDir, 'staging-symlink');
      fs.mkdirSync(dest, { recursive: true });
      const tarBuf = buildTarArchive([
        { name: 'package/link', content: '/etc/passwd', typeflag: '2' },
      ]);

      const res = extractTarBuffer(tarBuf, dest);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Unsupported or unsafe tar entry type/i);
    });

    it('rechaza nodos de dispositivo o FIFOs (typeflags 3, 4, 6)', () => {
      const dest = path.join(tmpBaseDir, 'staging-fifo');
      fs.mkdirSync(dest, { recursive: true });
      const tarBuf = buildTarArchive([
        { name: 'package/myfifo', content: '', typeflag: '6' },
      ]);

      const res = extractTarBuffer(tarBuf, dest);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Unsupported or unsafe tar entry type/i);
    });

    it('rechaza bombas de descompresión por exceso de tamaño total descomprimido', async () => {
      const dest = path.join(tmpBaseDir, 'staging-bomb-size');
      // Buffer con 2 MB comprimido que se descomprime a más de lo permitido en las opciones
      const largeContent = Buffer.alloc(1024 * 1024, 'A');
      const tgz = buildTarGzArchive([
        { name: 'package/file1.bin', content: largeContent },
        { name: 'package/file2.bin', content: largeContent },
      ]);

      const res = await extractHardenedTarGz(tgz, dest, {
        maxTotalBytes: 1024 * 1024, // Limitar a 1 MB
      });

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/exceeds total limit|exceeded|larger than/i);
      expect(fs.existsSync(dest)).toBe(false);
    });

    it('rechaza bombas de descompresión por exceso de cantidad de entradas', async () => {
      const dest = path.join(tmpBaseDir, 'staging-bomb-entries');
      const entries = Array.from({ length: 20 }, (_, i) => ({
        name: `package/file_${i}.txt`,
        content: `Content ${i}`,
      }));
      const tgz = buildTarGzArchive(entries);

      const res = await extractHardenedTarGz(tgz, dest, {
        maxEntries: 10, // Limitar a 10 entradas
      });

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/entry limit/i);
      expect(fs.existsSync(dest)).toBe(false);
    });

    it('detecta y rechaza colisiones de casing en Windows', () => {
      const dest = path.join(tmpBaseDir, 'staging-casing');
      fs.mkdirSync(dest, { recursive: true });
      const tarBuf = buildTarArchive([
        { name: 'package/README.md', content: 'Uppercase' },
        { name: 'package/readme.md', content: 'Lowercase' },
      ]);

      const res = extractTarBuffer(tarBuf, dest, { platform: 'win32' });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/Casing collision/i);
    });

    it('extrae exitosamente un archivo tar.gz válido y bien conformado', async () => {
      const dest = path.join(tmpBaseDir, 'staging-valid');
      const validTgz = buildTarGzArchive([
        { name: 'package/package.json', content: JSON.stringify({ name: '@fission-ai/openspec', version: '1.8.0' }) },
        { name: 'package/bin/openspec.js', content: '#!/usr/bin/env node\nconsole.log("1.8.0");' },
        { name: 'package/dist/index.js', content: 'module.exports = {};' },
      ]);

      const res = await extractHardenedTarGz(validTgz, dest);
      expect(res.ok).toBe(true);
      expect(res.entriesCount).toBe(3);
      expect(fs.existsSync(path.join(dest, 'bin', 'openspec.js'))).toBe(true);
      expect(fs.existsSync(path.join(dest, 'package.json'))).toBe(true);
    });
  });

  describe('3.2: Verificación criptográfica de Subresource Integrity (SRI)', () => {
    it('valida correctamente un hash SHA-512 SRI coincidente', () => {
      const data = Buffer.from('hello world openspec runtime', 'utf8');
      const hash512 = crypto.createHash('sha512').update(data).digest('base64');
      const sri = `sha512-${hash512}`;

      const res = verifySriIntegrity(data, sri);
      expect(res.valid).toBe(true);
      expect(res.algorithm).toBe('sha512');
    });

    it('valida correctamente un hash SHA-256 SRI coincidente', () => {
      const data = Buffer.from('hello world openspec runtime', 'utf8');
      const hash256 = crypto.createHash('sha256').update(data).digest('base64');
      const sri = `sha256-${hash256}`;

      const res = verifySriIntegrity(data, sri);
      expect(res.valid).toBe(true);
      expect(res.algorithm).toBe('sha256');
    });

    it('aborta y rechaza si el hash SRI no coincide', () => {
      const data = Buffer.from('actual data', 'utf8');
      const wrongHash = crypto.createHash('sha512').update('different data').digest('base64');
      const sri = `sha512-${wrongHash}`;

      const res = verifySriIntegrity(data, sri);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Integrity digest mismatch');
    });

    it('rechaza cadenas SRI vacías, malformadas o con algoritmos no soportados', () => {
      const data = Buffer.from('data', 'utf8');
      expect(verifySriIntegrity(data, '').valid).toBe(false);
      expect(verifySriIntegrity(data, 'md5-abc').valid).toBe(false);
      expect(verifySriIntegrity(data, 'sha512_no_dash').valid).toBe(false);
    });
  });

  describe('3.2: Descarga con límites y prevención de loopback', () => {
    it('rechaza URLs de loopback antes de emitir la petición', async () => {
      const res = await downloadTarballWithLimits('https://localhost:8080/test.tgz');
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/loopback host/i);
    });

    it('aborta la descarga si el tamaño de respuesta excede el tope de bytes', async () => {
      const mockHttpGet = (_url: string, _opts: any, cb: (res: any) => void) => {
        const emitter = {
          on(event: string, fn: any) {
            if (event === 'data') {
              setTimeout(() => fn(Buffer.alloc(2 * 1024 * 1024)), 10);
            }
          },
        };
        setTimeout(() => cb({ statusCode: 200, ...emitter }), 5);
        return { destroy: () => {}, on: () => {} };
      };

      const res = await downloadTarballWithLimits('https://registry.npmjs.org/test.tgz', {
        maxDownloadBytes: 1024 * 1024,
        httpGet: mockHttpGet as any,
      });

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/exceeded maximum limit/i);
    });

    it('aborta la descarga si excede el tiempo límite (timeout)', async () => {
      const mockHttpGet = (_url: string, _opts: any, _cb: any) => {
        return { destroy: () => {}, on: () => {} };
      };

      const res = await downloadTarballWithLimits('https://registry.npmjs.org/test.tgz', {
        timeoutMs: 50,
        httpGet: mockHttpGet as any,
      });

      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/timed out/i);
    });
  });

  describe('3.2 & 3.3: Orquestación de Staging, Confinamiento, Health Check y Limpieza', () => {
    it('rechaza si la ruta resuelta escapa de userDataDir', async () => {
      const res = await executeManagedRuntimeStagingPoc({
        userDataDir: 'C:\\valid\\userData\\..\\..\\outside',
        tarGzBuffer: buildTarGzArchive([{ name: 'package/bin/openspec.js', content: 'console.log(1);' }]),
      });
      expect(res.ok === false || res.stagingDir?.startsWith(path.resolve('C:\\valid\\userData\\..\\..\\outside'))).toBe(true);
    });

    it('aborta y limpia el staging si la verificación de integridad dist.integrity falla', async () => {
      const userDataDir = path.join(tmpBaseDir, 'userData');
      fs.mkdirSync(userDataDir, { recursive: true });

      const tgz = buildTarGzArchive([
        { name: 'package/bin/openspec.js', content: 'console.log("1.8.0");' },
      ]);

      const res = await executeManagedRuntimeStagingPoc({
        userDataDir,
        version: '1.8.0',
        expectedIntegrity: 'sha512-INCORRECT_HASH_SHOULD_ABORT_AND_CLEAN_UP',
        tarGzBuffer: tgz,
      });

      expect(res.ok).toBe(false);
      expect(res.integrityVerified).toBe(false);
      expect(res.error).toMatch(/Integrity verification failed/i);

      // Comprobar que no quedó ningún stagingDir huérfano
      const runtimesDir = path.join(userDataDir, 'openspec-runtimes');
      if (fs.existsSync(runtimesDir)) {
        const contents = fs.readdirSync(runtimesDir);
        expect(contents.filter((c) => c.startsWith('staging-'))).toHaveLength(0);
      }
    });

    it('no activa ni valida el staging si el health check falla, y limpia el staging', async () => {
      const userDataDir = path.join(tmpBaseDir, 'userData');
      fs.mkdirSync(userDataDir, { recursive: true });

      const tgz = buildTarGzArchive([
        { name: 'package/bin/openspec.js', content: 'console.log("broken");' },
      ]);

      const res = await executeManagedRuntimeStagingPoc({
        userDataDir,
        version: '1.8.0',
        tarGzBuffer: tgz,
        customHealthCheckRunner: async () => {
          return { ok: false, error: 'Health check failed: process crashed with code 1' };
        },
      });

      expect(res.ok).toBe(false);
      expect(res.healthCheckPassed).toBe(false);
      expect(res.error).toMatch(/Health check failed/i);

      // Comprobar que el staging fallido fue eliminado
      const runtimesDir = path.join(userDataDir, 'openspec-runtimes');
      if (fs.existsSync(runtimesDir)) {
        const contents = fs.readdirSync(runtimesDir);
        expect(contents.filter((c) => c.startsWith('staging-'))).toHaveLength(0);
      }
    });

    it('completa el staging exitosamente cuando integridad, extracción y health check son válidos', async () => {
      const userDataDir = path.join(tmpBaseDir, 'userData');
      fs.mkdirSync(userDataDir, { recursive: true });

      const tgz = buildTarGzArchive([
        { name: 'package/package.json', content: JSON.stringify({ name: '@fission-ai/openspec', version: '1.8.0' }) },
        { name: 'package/bin/openspec.js', content: 'console.log("1.8.0");' },
      ]);

      const hash512 = crypto.createHash('sha512').update(tgz).digest('base64');
      const expectedIntegrity = `sha512-${hash512}`;

      const res = await executeManagedRuntimeStagingPoc({
        userDataDir,
        version: '1.8.0',
        expectedIntegrity,
        tarGzBuffer: tgz,
        customHealthCheckRunner: async () => ({ ok: true, versionOutput: '1.8.0' }),
      });

      expect(res.ok).toBe(true);
      expect(res.integrityVerified).toBe(true);
      expect(res.healthCheckPassed).toBe(true);
      expect(res.stagingDir).toBeDefined();
      expect(fs.existsSync(res.stagingDir!)).toBe(true);
      expect(fs.existsSync(path.join(res.stagingDir!, 'bin', 'openspec.js'))).toBe(true);
    });

    it('configura el entorno de ELECTRON_RUN_AS_NODE desactivando telemetría y comprobaciones', () => {
      const env = buildElectronNodeEnv({ EXTRA_VAR: 'test' });
      expect(env.ELECTRON_RUN_AS_NODE).toBe('1');
      expect(env.OPENSPEC_NO_UPDATE_CHECK).toBe('1');
      expect(env.DO_NOT_TRACK).toBe('1');
      expect(env.OPENSPEC_TELEMETRY_DISABLED).toBe('1');
      expect(env.EXTRA_VAR).toBe('test');
    });

    it('soporta rutas de userData con espacios sin fallar', async () => {
      const userDataWithSpaces = path.join(tmpBaseDir, 'Path With Spaces User Data');
      fs.mkdirSync(userDataWithSpaces, { recursive: true });

      const tgz = buildTarGzArchive([
        { name: 'package/package.json', content: JSON.stringify({ name: '@fission-ai/openspec', version: '1.8.0' }) },
        { name: 'package/bin/openspec.js', content: 'console.log("1.8.0");' },
      ]);

      const res = await executeManagedRuntimeStagingPoc({
        userDataDir: userDataWithSpaces,
        version: '1.8.0',
        tarGzBuffer: tgz,
        customHealthCheckRunner: async (stagedDir) => {
          expect(stagedDir).toContain('Path With Spaces User Data');
          return { ok: true, versionOutput: '1.8.0' };
        },
      });

      expect(res.ok).toBe(true);
      expect(res.stagingDir).toContain('Path With Spaces User Data');
    });
  });
});
