import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { OPENSPEC_CYCLE_TARGET_VERSION, parseSemver } from '../../lib/openspec-version';

export function verifySnapshotVersionCompatibility(
  snapshotVersion: string,
  targetVersion: string = OPENSPEC_CYCLE_TARGET_VERSION,
): { valid: boolean; error?: string } {
  const snapSemver = parseSemver(snapshotVersion);
  const targetSemver = parseSemver(targetVersion);

  if (!snapSemver || !targetSemver) {
    return {
      valid: false,
      error: `Versión semver inválida: snapshot=${snapshotVersion}, target=${targetVersion}`,
    };
  }

  const isSameMajorMinor =
    snapSemver.major === targetSemver.major && snapSemver.minor === targetSemver.minor;

  if (!isSameMajorMinor) {
    return {
      valid: false,
      error: `La copia propia de herramientas (${snapshotVersion}) está desfasada respecto a la versión del ciclo SDD (${targetVersion}). Ejecutá "node scripts/capturar-herramientas-openspec.mjs" para actualizarla.`,
    };
  }

  return { valid: true };
}

describe('openspec-tools-snapshot (1.2)', () => {
  const snapshotPath = path.resolve(__dirname, '../pipeline/openspec-tools-snapshot.json');
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));

  it('la versión del JSON coincide en mayor.menor con OPENSPEC_CYCLE_TARGET_VERSION (1.13)', () => {
    const check = verifySnapshotVersionCompatibility(snapshot.version, OPENSPEC_CYCLE_TARGET_VERSION);
    if (!check.valid) {
      throw new Error(check.error);
    }
    expect(check.valid).toBe(true);
  });

  it('falla con mensaje descriptivo y comando de captura si se simula un ciclo 1.14', () => {
    const check = verifySnapshotVersionCompatibility(snapshot.version, '1.14.0');
    expect(check.valid).toBe(false);
    expect(check.error).toContain('desfasada respecto a la versión del ciclo SDD (1.14.0)');
    expect(check.error).toContain('node scripts/capturar-herramientas-openspec.mjs');
  });

  it('el JSON contiene la estructura esperada: 40 herramientas, Codex actualizado y sin github', () => {
    expect(snapshot.tools).toHaveLength(40);
    expect(snapshot.skillNames).toHaveLength(12);

    const codex = snapshot.tools.find((t: { id: string }) => t.id === 'codex');
    expect(codex).toBeDefined();
    expect(codex.skillsDir).toBe('.agents');
    expect(codex.legacySkillsDirs).toContain('.codex');

    const github = snapshot.tools.find((t: { id: string }) => t.id === 'github');
    expect(github).toBeUndefined();
  });
});
