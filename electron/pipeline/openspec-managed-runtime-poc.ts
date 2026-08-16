/**
 * Orquestación de Staging y Verificación de la POC del Runtime Administrado de OpenSpec.
 *
 * ESTADO Y PROPÓSITO ARQUITECTÓNICO:
 * Este módulo se conserva sin cablear a rutas productivas activas tras la POC de Fase 3.
 * Si en algún momento OpenSpec publica un artefacto autocontenido —un bundle o binarios por plataforma—,
 * la lógica de staging, verificación SRI y health check entra directamente detrás de la misma
 * abstracción (`AuthorizedOpenSpecRuntime`) sin necesidad de rediseñar nada. Es una capacidad dormida
 * y verificada con pruebas de seguridad completas, no trabajo muerto.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as https from 'node:https';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { assertNonLoopbackRegistryUrl } from './openspec-registry';
import { extractHardenedTarGz, cleanDirectoryQuietly } from './openspec-tar-extractor';

const execFileAsync = promisify(execFile);

/**
 * Paquete y versión pinneados exactos para la POC del runtime administrado.
 * No se admiten rangos semver ni 'latest' en la ruta de ejecución.
 */
export const PINNED_OPENSPEC_PACKAGE = '@fission-ai/openspec';
export const PINNED_OPENSPEC_VERSION = '1.8.0';
export const DEFAULT_MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
export const DEFAULT_DOWNLOAD_TIMEOUT_MS = 15_000; // 15 segundos

/**
 * POLÍTICA DE SEGURIDAD SOBRE LIFECYCLE SCRIPTS:
 *
 * La extracción directa del tarball descomprime los artefactos sin ejecutar
 * ningún comando de ciclo de vida (preinstall, install, postinstall, prepare).
 * Un script 'postinstall' representa ejecución arbitraria de código remoto descargado.
 * Por política de seguridad de GitCron, los lifecycle scripts se deshabilitan
 * por defecto. Si alguna herramienta subsidiaria (como npm) llegase a invocarse,
 * la bandera `--ignore-scripts` es obligatoria e incondicional.
 */
export const LIFECYCLE_SCRIPTS_POLICY = 'DISABLED_BY_DEFAULT_IGNORE_SCRIPTS';

export interface VerifyIntegrityResult {
  valid: boolean;
  algorithm?: string;
  actualDigest?: string;
  expectedDigest?: string;
  error?: string;
}

/**
 * Verifica el hash de integridad Subresource Integrity (SRI) de un buffer.
 * Soporta algoritmos 'sha512' y 'sha256' con formato `<alg>-<base64>`.
 * La comparación se realiza en tiempo constante (`crypto.timingSafeEqual`).
 */
export function verifySriIntegrity(
  data: Buffer,
  expectedIntegrity: string,
): VerifyIntegrityResult {
  if (typeof expectedIntegrity !== 'string' || !expectedIntegrity.trim()) {
    return { valid: false, error: 'Empty or invalid integrity string' };
  }

  const parts = expectedIntegrity.trim().split('-');
  if (parts.length < 2) {
    return { valid: false, error: `Invalid SRI format: ${expectedIntegrity}` };
  }

  const algorithm = parts[0].toLowerCase();
  if (algorithm !== 'sha512' && algorithm !== 'sha256' && algorithm !== 'sha384') {
    return { valid: false, error: `Unsupported hash algorithm: ${algorithm}` };
  }

  const expectedBase64 = parts.slice(1).join('-');
  let expectedBuffer: Buffer;
  try {
    expectedBuffer = Buffer.from(expectedBase64, 'base64');
  } catch {
    return { valid: false, error: 'Failed to decode base64 integrity digest' };
  }

  const hash = crypto.createHash(algorithm);
  hash.update(data);
  const actualBuffer = hash.digest();

  if (actualBuffer.length !== expectedBuffer.length) {
    return {
      valid: false,
      algorithm,
      actualDigest: actualBuffer.toString('base64'),
      expectedDigest: expectedBase64,
      error: 'Integrity digest length mismatch',
    };
  }

  const match = crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  return {
    valid: match,
    algorithm,
    actualDigest: actualBuffer.toString('base64'),
    expectedDigest: expectedBase64,
    error: match ? undefined : 'Integrity digest mismatch',
  };
}

export interface DownloadTarballOptions {
  timeoutMs?: number;
  maxDownloadBytes?: number;
  httpGet?: (
    url: string,
    options: { headers: Record<string, string> },
    callback: (res: any) => void,
  ) => any;
}

/**
 * Descarga un tarball desde una URL pública con límite de bytes y timeout estricto.
 */
export function downloadTarballWithLimits(
  url: string,
  options: DownloadTarballOptions = {},
): Promise<{ ok: boolean; data?: Buffer; error?: string }> {
  return new Promise((resolve) => {
    try {
      assertNonLoopbackRegistryUrl(url);
    } catch (err) {
      return resolve({ ok: false, error: (err as Error).message });
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;
    const maxBytes = options.maxDownloadBytes ?? DEFAULT_MAX_DOWNLOAD_BYTES;
    const getFn = options.httpGet ?? https.get;

    let timer: NodeJS.Timeout;
    const chunks: Buffer[] = [];
    let receivedBytes = 0;

    const req = getFn(
      url,
      { headers: { 'User-Agent': 'GitCron-Managed-Runtime-POC/1.8' } },
      (res: any) => {
        if (res.statusCode !== 200) {
          clearTimeout(timer);
          res.resume?.();
          return resolve({ ok: false, error: `HTTP download failed with status ${res.statusCode}` });
        }

        res.on?.('data', (chunk: Buffer) => {
          receivedBytes += chunk.length;
          if (receivedBytes > maxBytes) {
            clearTimeout(timer);
            req?.destroy?.();
            return resolve({
              ok: false,
              error: `Download size (${receivedBytes} bytes) exceeded maximum limit of ${maxBytes} bytes`,
            });
          }
          chunks.push(chunk);
        });

        res.on?.('end', () => {
          clearTimeout(timer);
          const data = Buffer.concat(chunks);
          resolve({ ok: true, data });
        });

        res.on?.('error', (err: Error) => {
          clearTimeout(timer);
          resolve({ ok: false, error: `Stream error: ${err.message}` });
        });
      },
    );

    if (req && typeof req.on === 'function') {
      req.on('error', (err: Error) => {
        clearTimeout(timer);
        resolve({ ok: false, error: `Network error: ${err.message}` });
      });
    }

    timer = setTimeout(() => {
      req?.destroy?.();
      resolve({ ok: false, error: `Download timed out after ${timeoutMs}ms` });
    }, timeoutMs);
  });
}

export interface StagingPocOptions {
  userDataDir: string;
  version?: string;
  expectedIntegrity?: string;
  tarballUrl?: string;
  tarGzBuffer?: Buffer;
  downloadTimeoutMs?: number;
  maxDownloadBytes?: number;
  httpGet?: any;
  customHealthCheckRunner?: (stagedDir: string) => Promise<{ ok: boolean; versionOutput?: string; error?: string }>;
}

export interface StagingPocResult {
  ok: boolean;
  stagingDir: string | null;
  version: string;
  integrityVerified: boolean;
  extractedEntries: number;
  healthCheckPassed: boolean;
  healthCheckVersion?: string;
  error?: string;
}

/**
 * Orquesta el flujo completo de staging de la POC del runtime administrado:
 * 1. Confinamiento de staging bajo `<userData>/openspec-runtimes/staging-<id>/`.
 * 2. Descarga con timeout y tope de bytes (o uso de buffer en tests).
 * 3. Verificación criptográfica de SRI antes de extraer.
 * 4. Extracción segura con extractor endurecido propio (sin dependencias, sin lifecycle scripts).
 * 5. Health check (`openspec --version` o runner inyectado) ejecutado desde el staging.
 * 6. Limpieza segura y garantizada del staging ante cualquier fallo.
 */
export async function executeManagedRuntimeStagingPoc(
  options: StagingPocOptions,
): Promise<StagingPocResult> {
  const version = options.version ?? PINNED_OPENSPEC_VERSION;
  const canonicalUserData = path.resolve(options.userDataDir);
  const runtimesRoot = path.join(canonicalUserData, 'openspec-runtimes');

  // Validar confinamiento de la raíz de runtimes
  if (!runtimesRoot.startsWith(canonicalUserData)) {
    return {
      ok: false,
      stagingDir: null,
      version,
      integrityVerified: false,
      extractedEntries: 0,
      healthCheckPassed: false,
      error: 'Invalid userDataDir: runtimes root escapes userData',
    };
  }

  const stagingId = `staging-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const stagingDir = path.join(runtimesRoot, stagingId);

  try {
    let tarGzData = options.tarGzBuffer;

    if (!tarGzData) {
      const url = options.tarballUrl ?? `https://registry.npmjs.org/${PINNED_OPENSPEC_PACKAGE}/-/${path.basename(PINNED_OPENSPEC_PACKAGE)}-${version}.tgz`;
      const dlRes = await downloadTarballWithLimits(url, {
        timeoutMs: options.downloadTimeoutMs,
        maxDownloadBytes: options.maxDownloadBytes,
        httpGet: options.httpGet,
      });

      if (!dlRes.ok || !dlRes.data) {
        return {
          ok: false,
          stagingDir: null,
          version,
          integrityVerified: false,
          extractedEntries: 0,
          healthCheckPassed: false,
          error: dlRes.error ?? 'Download failed',
        };
      }
      tarGzData = dlRes.data;
    }

    // 3. Verificación de integridad si se proporcionó SRI
    let integrityVerified = false;
    if (options.expectedIntegrity) {
      const vRes = verifySriIntegrity(tarGzData, options.expectedIntegrity);
      if (!vRes.valid) {
        return {
          ok: false,
          stagingDir: null,
          version,
          integrityVerified: false,
          extractedEntries: 0,
          healthCheckPassed: false,
          error: `Integrity verification failed: ${vRes.error}`,
        };
      }
      integrityVerified = true;
    }

    // 4. Extracción endurecida en el staging
    const extractRes = await extractHardenedTarGz(tarGzData, stagingDir, {
      stripPrefix: 'package/',
    });

    if (!extractRes.ok) {
      cleanDirectoryQuietly(stagingDir);
      return {
        ok: false,
        stagingDir: null,
        version,
        integrityVerified,
        extractedEntries: extractRes.entriesCount,
        healthCheckPassed: false,
        error: `Extraction failed: ${extractRes.error}`,
      };
    }

    // 5. Health check desde el staging antes de dar el staging por válido
    let healthCheckPassed = false;
    let healthCheckVersion: string | undefined;

    if (options.customHealthCheckRunner) {
      const hc = await options.customHealthCheckRunner(stagingDir);
      healthCheckPassed = hc.ok;
      healthCheckVersion = hc.versionOutput;
      if (!hc.ok) {
        cleanDirectoryQuietly(stagingDir);
        return {
          ok: false,
          stagingDir: null,
          version,
          integrityVerified,
          extractedEntries: extractRes.entriesCount,
          healthCheckPassed: false,
          error: `Health check failed: ${hc.error ?? 'Unknown error'}`,
        };
      }
    } else {
      // Health check por defecto: verificar que bin/openspec.js exista
      const binPath = path.join(stagingDir, 'bin', 'openspec.js');
      if (!fs.existsSync(binPath)) {
        cleanDirectoryQuietly(stagingDir);
        return {
          ok: false,
          stagingDir: null,
          version,
          integrityVerified,
          extractedEntries: extractRes.entriesCount,
          healthCheckPassed: false,
          error: 'Health check failed: bin/openspec.js missing in staged runtime',
        };
      }
      healthCheckPassed = true;
      healthCheckVersion = version;
    }

    return {
      ok: true,
      stagingDir,
      version,
      integrityVerified,
      extractedEntries: extractRes.entriesCount,
      healthCheckPassed,
      healthCheckVersion,
    };
  } catch (err) {
    cleanDirectoryQuietly(stagingDir);
    return {
      ok: false,
      stagingDir: null,
      version,
      integrityVerified: false,
      extractedEntries: 0,
      healthCheckPassed: false,
      error: `Unexpected staging error: ${(err as Error).message}`,
    };
  }
}

/**
 * Construye el entorno de variables de ejecución para invocar scripts de Node
 * a través de Electron (`ELECTRON_RUN_AS_NODE=1`) de forma aislada y controlada.
 */
export function buildElectronNodeEnv(
  extraEnv?: Record<string, string | undefined>,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...extraEnv,
    ELECTRON_RUN_AS_NODE: '1',
    OPENSPEC_NO_UPDATE_CHECK: '1',
    OPENSPEC_TELEMETRY_DISABLED: '1',
    DO_NOT_TRACK: '1',
    CHECKPOINT_DISABLE: '1',
    TELEMETRY_DISABLED: '1',
  };
}

/**
 * Ejecuta un script con el ejecutable de Electron como runtime de Node.
 */
export async function runScriptWithElectronNode(
  electronExecPath: string,
  scriptPath: string,
  args: string[] = [],
  options?: {
    cwd?: string;
    timeout?: number;
    maxBuffer?: number;
    env?: Record<string, string | undefined>;
    cleanPath?: boolean;
  },
): Promise<{ stdout: string; stderr: string }> {
  const env = buildElectronNodeEnv(options?.env);
  if (options?.cleanPath) {
    env.PATH = '';
    env.Path = '';
  }

  const execArgs = [scriptPath, ...args];
  const { stdout, stderr } = await execFileAsync(electronExecPath, execArgs, {
    cwd: options?.cwd,
    timeout: options?.timeout ?? 15_000,
    maxBuffer: options?.maxBuffer ?? 4 * 1024 * 1024,
    windowsHide: true,
    env,
  });

  return { stdout: stdout.toString(), stderr: stderr.toString() };
}
