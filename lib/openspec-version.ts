/**
 * Rango de versiones de OpenSpec que GitCron soporta y clasificación de una
 * versión detectada frente a ese rango.
 *
 * La noción de «soportado» es necesaria porque el JSON del CLI cambia entre
 * minors —`status` ganó `requires` en 1.7, `isPlanningComplete` en 1.8—, así
 * que «se ejecuta» no implica «se soporta». El rango se declara aparte para que
 * cualquier consumidor pueda preguntar y mostrarlo.
 */

export interface OpenSpecVersionRange {
  min: string;
  max: string;
}

/** Versión de OpenSpec contra la que está diseñado y escrito el ciclo SDD de GitCron. */
export const OPENSPEC_CYCLE_TARGET_VERSION = '1.11.0';

/** Rango soportado por esta versión de GitCron, inclusivo en ambos extremos. */
export const SUPPORTED_OPENSPEC_VERSIONS: Readonly<OpenSpecVersionRange> = {
  min: '1.5.0',
  max: '1.11.0',
};

export type OpenSpecVersionClass = 'supported' | 'too-old' | 'too-new' | 'unknown';

interface Semver {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parsea una versión `MAJOR.MINOR.PATCH`, permitiendo opcionalmente un sufijo
 * de prerelease válido (p. ej. `1.8.0-beta.1`, del cual extrae `1.8.0`), pero
 * rechazando estrictamente cualquier sufijo basura (p. ej. `1.8.0basura`).
 * Si no es un semver válido, devuelve `null`.
 */
export function parseSemver(version: string | null | undefined): Semver | null {
  if (typeof version !== 'string') return null;
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version.trim());
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) return null;
  return { major, minor, patch };
}

export function compareSemver(a: Semver, b: Semver): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * Clasifica una versión frente al rango soportado. Una versión que no se pudo
 * interpretar es `unknown`, no `too-old`: no saber no es lo mismo que saber que
 * está por debajo del mínimo.
 */
export function classifyOpenSpecVersion(
  version: string | null | undefined,
  range: Readonly<OpenSpecVersionRange> = SUPPORTED_OPENSPEC_VERSIONS,
): OpenSpecVersionClass {
  const parsed = parseSemver(version);
  if (!parsed) return 'unknown';
  const min = parseSemver(range.min);
  const max = parseSemver(range.max);
  if (min && compareSemver(parsed, min) < 0) return 'too-old';
  if (max && compareSemver(parsed, max) > 0) return 'too-new';
  return 'supported';
}

/**
 * Comprueba si una versión instalada de OpenSpec es posterior a la versión
 * contra la que está diseñado el ciclo de la aplicación (1.11.0).
 */
export function isInstalledAheadOfCycle(
  installedVersion: string | null | undefined,
  cycleVersion: string = OPENSPEC_CYCLE_TARGET_VERSION,
): boolean {
  const installed = parseSemver(installedVersion);
  const cycle = parseSemver(cycleVersion);
  if (!installed || !cycle) return false;
  return compareSemver(installed, cycle) > 0;
}

/**
 * Comprueba si una versión instalada de OpenSpec es anterior a la versión
 * contra la que está diseñado el ciclo de la aplicación (1.11.0).
 *
 * Este caso importa porque el ciclo está escrito contra 1.11.0 y consume
 * campos estructurados del JSON (como `instruction`, `context`,
 * `resolvedOutputPath`, `diff`) que las versiones anteriores pueden no
 * devolver o devolver incompletos, provocando que la instrucción llegue
 * degradada al agente ejecutor sin que nadie se entere.
 */
export function isInstalledBehindCycle(
  installedVersion: string | null | undefined,
  cycleVersion: string = OPENSPEC_CYCLE_TARGET_VERSION,
): boolean {
  const installed = parseSemver(installedVersion);
  const cycle = parseSemver(cycleVersion);
  if (!installed || !cycle) return false;
  return compareSemver(installed, cycle) < 0;
}
