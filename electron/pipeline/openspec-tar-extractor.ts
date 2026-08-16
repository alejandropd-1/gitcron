/**
 * Extractor endurecido y seguro de tarballs POSIX/USTAR sin dependencias externas.
 *
 * ESTADO Y PROPÓSITO ARQUITECTÓNICO:
 * Este módulo se conserva sin cablear a rutas productivas activas tras la POC de Fase 3.
 * Si en algún momento OpenSpec publica un artefacto autocontenido —un bundle o binarios por plataforma—,
 * este extractor endurecido entra directamente detrás de la misma abstracción (`AuthorizedOpenSpecRuntime`)
 * sin necesidad de rediseñar nada. Es una capacidad dormida y verificada con pruebas de seguridad completas,
 * no trabajo muerto.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

/**
 * Nombres reservados en sistemas de archivos Windows que no deben crearse
 * como archivos ni directorios, con o sin extensión.
 */
const WINDOWS_RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

export interface TarExtractorOptions {
  /** Límite de bytes totales descomprimidos (defensa contra bomb). Por defecto 50 MB. */
  maxTotalBytes?: number;
  /** Límite de bytes de un archivo individual. Por defecto 20 MB. */
  maxSingleFileBytes?: number;
  /** Límite de entradas totales en el archivo. Por defecto 5000. */
  maxEntries?: number;
  /** Prefijo a eliminar de las rutas de npm (por defecto 'package/'). */
  stripPrefix?: string;
  /** Plataforma objetivo para reglas de nombres (por defecto process.platform). */
  platform?: NodeJS.Platform;
}

export interface ExtractedFileEntry {
  relativePath: string;
  size: number;
  type: 'file' | 'directory';
}

export interface TarExtractionResult {
  ok: boolean;
  entriesCount: number;
  totalBytes: number;
  extractedFiles: ExtractedFileEntry[];
  error?: string;
}

/**
 * Valida si un segmento de ruta es seguro contra Windows reserved names,
 * caracteres de control o terminaciones inseguras (espacios o puntos al final).
 */
export function isSafePathSegment(segment: string, isWindows: boolean): boolean {
  if (!segment || segment === '.' || segment === '..') return false;
  // Caracteres de control o nulos
  if (/[\x00-\x1F\x7F]/.test(segment)) return false;
  // En Windows: caracteres inválidos en filenames
  if (isWindows && /[<>:"|?*]/.test(segment)) return false;
  // En Windows: espacios o puntos al final causan problemas de desbordamiento en Win32 API
  if (isWindows && (segment.endsWith(' ') || segment.endsWith('.'))) return false;

  if (isWindows) {
    const baseWithoutExt = segment.split('.')[0].toLowerCase();
    if (WINDOWS_RESERVED_NAMES.has(baseWithoutExt)) return false;
  }
  return true;
}

/**
 * Normaliza y valida una ruta interna de un tarball asegurando que:
 * 1. No sea absoluta.
 * 2. No contenga segmentos '..' en ninguna posición.
 * 3. No intente escapar de la raíz de extracción.
 * 4. Sus segmentos sean válidos en la plataforma destino.
 */
export function sanitizeTarEntryPath(
  rawPath: string,
  stripPrefix: string = 'package/',
  isWindows: boolean = process.platform === 'win32',
): string | null {
  if (typeof rawPath !== 'string' || !rawPath.trim()) return null;

  // Reemplazar separadores Windows por POSIX para análisis uniforme
  let normalized = rawPath.replace(/\\/g, '/');

  // Rechazar rutas absolutas (POSIX o Windows tipo C:/)
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    return null;
  }

  // Eliminar prefijo opcional (ej. 'package/')
  if (stripPrefix && normalized.startsWith(stripPrefix)) {
    normalized = normalized.slice(stripPrefix.length);
  }

  // Eliminar barras iniciales o finales sobrantes
  normalized = normalized.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!normalized) return ''; // Raíz vacía benigna (ej. la carpeta 'package/' misma)

  const segments = normalized.split('/');
  for (const seg of segments) {
    if (!isSafePathSegment(seg, isWindows)) {
      return null;
    }
  }

  return segments.join(path.sep);
}

/**
 * Extrae un buffer tar (ya descomprimido) de forma segura y endurecida.
 */
export function extractTarBuffer(
  tarBuffer: Buffer,
  destDir: string,
  options: TarExtractorOptions = {},
): TarExtractionResult {
  const maxTotalBytes = options.maxTotalBytes ?? 50 * 1024 * 1024; // 50 MB
  const maxSingleFileBytes = options.maxSingleFileBytes ?? 20 * 1024 * 1024; // 20 MB
  const maxEntries = options.maxEntries ?? 5000;
  const stripPrefix = options.stripPrefix ?? 'package/';
  const isWindows = (options.platform ?? process.platform) === 'win32';

  const canonicalDestDir = path.resolve(destDir);
  const destDirWithSep = canonicalDestDir.endsWith(path.sep)
    ? canonicalDestDir
    : canonicalDestDir + path.sep;

  let offset = 0;
  let entriesCount = 0;
  let totalBytes = 0;
  const extractedFiles: ExtractedFileEntry[] = [];
  const seenPathsCaseInsensitive = new Set<string>();

  try {
    while (offset + 512 <= tarBuffer.length) {
      const header = tarBuffer.subarray(offset, offset + 512);
      // Dos bloques de 512 bytes de ceros indican el fin del archivo tar
      if (header.every((b) => b === 0)) {
        break;
      }

      entriesCount++;
      if (entriesCount > maxEntries) {
        throw new Error(`Tar extraction exceeded maximum entry limit of ${maxEntries}`);
      }

      // Leer nombre del archivo (bytes 0..99)
      const rawName = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '').trim();
      // Leer tamaño del archivo (bytes 124..135, octal)
      const rawSize = header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim();
      const size = parseInt(rawSize, 8);
      if (Number.isNaN(size) || size < 0) {
        throw new Error(`Invalid tar header size for entry: ${rawName}`);
      }

      if (size > maxSingleFileBytes) {
        throw new Error(`File ${rawName} size (${size} bytes) exceeds single file limit (${maxSingleFileBytes} bytes)`);
      }

      totalBytes += size;
      if (totalBytes > maxTotalBytes) {
        throw new Error(`Total extraction size (${totalBytes} bytes) exceeds total limit (${maxTotalBytes} bytes)`);
      }

      // Typeflag (byte 156)
      const typeFlag = String.fromCharCode(header[156]);
      // Prefijo USTAR (bytes 345..499)
      const rawPrefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '').trim();
      const fullName = rawPrefix ? `${rawPrefix}/${rawName}` : rawName;

      // Rechazar enlaces simbólicos (2), duros (1), FIFOs (6), bloques (4), caracteres (3)
      if (typeFlag !== '0' && typeFlag !== '\0' && typeFlag !== '5') {
        throw new Error(`Unsupported or unsafe tar entry type '${typeFlag}' for entry: ${fullName}`);
      }

      const safeRelPath = sanitizeTarEntryPath(fullName, stripPrefix, isWindows);
      if (safeRelPath === null) {
        throw new Error(`Unsafe or malicious tar entry path: ${fullName}`);
      }

      if (safeRelPath === '') {
        // Carpeta raíz del paquete (ej. 'package/'), se ignora benignamente
        offset += 512 + Math.ceil(size / 512) * 512;
        continue;
      }

      // Detección de colisiones de casing en sistemas Windows/case-insensitive
      const lowerKey = isWindows ? safeRelPath.toLowerCase() : safeRelPath;
      if (seenPathsCaseInsensitive.has(lowerKey)) {
        throw new Error(`Casing collision or duplicate path detected: ${safeRelPath}`);
      }
      seenPathsCaseInsensitive.add(lowerKey);

      // Verificación de confinamiento estricto
      const targetPath = path.resolve(canonicalDestDir, safeRelPath);
      if (!targetPath.startsWith(destDirWithSep)) {
        throw new Error(`Path traversal attempt detected: ${fullName} escapes destination ${canonicalDestDir}`);
      }

      if (typeFlag === '5') {
        // Directorio
        fs.mkdirSync(targetPath, { recursive: true });
        extractedFiles.push({ relativePath: safeRelPath, size: 0, type: 'directory' });
      } else {
        // Archivo regular
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        const fileDataStart = offset + 512;
        const fileDataEnd = fileDataStart + size;
        if (fileDataEnd > tarBuffer.length) {
          throw new Error(`Corrupted tar archive: unexpected EOF for file ${fullName}`);
        }

        const fileData = tarBuffer.subarray(fileDataStart, fileDataEnd);
        fs.writeFileSync(targetPath, fileData);
        extractedFiles.push({ relativePath: safeRelPath, size, type: 'file' });
      }

      offset += 512 + Math.ceil(size / 512) * 512;
    }

    return {
      ok: true,
      entriesCount,
      totalBytes,
      extractedFiles,
    };
  } catch (err) {
    return {
      ok: false,
      entriesCount,
      totalBytes,
      extractedFiles,
      error: (err as Error).message,
    };
  }
}

/**
 * Descomprime un buffer `.tgz` (gzip) y lo extrae de forma endurecida en `destDir`.
 * Si la extracción falla o se detecta cualquier intento malicioso, el directorio `destDir`
 * se limpia de forma segura para no dejar un estado corrupto o parcial.
 */
export async function extractHardenedTarGz(
  tarGzBuffer: Buffer,
  destDir: string,
  options: TarExtractorOptions = {},
): Promise<TarExtractionResult> {
  const canonicalDest = path.resolve(destDir);
  if (!fs.existsSync(canonicalDest)) {
    fs.mkdirSync(canonicalDest, { recursive: true });
  }

  try {
    const tarBuffer = await new Promise<Buffer>((resolve, reject) => {
      zlib.gunzip(tarGzBuffer, { maxOutputLength: options.maxTotalBytes ?? 50 * 1024 * 1024 }, (err, buf) => {
        if (err) return reject(err);
        resolve(buf);
      });
    });

    const result = extractTarBuffer(tarBuffer, canonicalDest, options);
    if (!result.ok) {
      // Limpieza segura del staging fallido
      cleanDirectoryQuietly(canonicalDest);
      return result;
    }

    // Verificación final de confinamiento de los archivos creados
    for (const file of result.extractedFiles) {
      const fullPath = path.resolve(canonicalDest, file.relativePath);
      try {
        const real = fs.realpathSync(fullPath);
        const canonicalRealDest = fs.realpathSync(canonicalDest);
        const sep = path.sep;
        if (!real.startsWith(canonicalRealDest + sep) && real !== canonicalRealDest) {
          cleanDirectoryQuietly(canonicalDest);
          return {
            ok: false,
            entriesCount: result.entriesCount,
            totalBytes: result.totalBytes,
            extractedFiles: [],
            error: `Confinement check failed: canonical path ${real} escaped ${canonicalRealDest}`,
          };
        }
      } catch (realpathErr) {
        cleanDirectoryQuietly(canonicalDest);
        return {
          ok: false,
          entriesCount: result.entriesCount,
          totalBytes: result.totalBytes,
          extractedFiles: [],
          error: `Confinement check error on ${file.relativePath}: ${(realpathErr as Error).message}`,
        };
      }
    }

    return result;
  } catch (err) {
    cleanDirectoryQuietly(canonicalDest);
    return {
      ok: false,
      entriesCount: 0,
      totalBytes: 0,
      extractedFiles: [],
      error: `Decompression error: ${(err as Error).message}`,
    };
  }
}

/**
 * Limpia un directorio de staging de forma segura y tolerante a fallos.
 */
export function cleanDirectoryQuietly(dirPath: string): void {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch {
    // Ignorado intencionalmente
  }
}
