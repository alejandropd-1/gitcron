import { describe, expect, it } from 'vitest';
import { PipelineRuntimeMatrix } from '../pipeline/runtime/pipeline-runtime-matrix';

describe('PipelineRuntimeMatrix — Windows Compatibility & Process Ownership (Fase 08 Tanda 3)', () => {
  const matrix = new PipelineRuntimeMatrix();

  it('resolves Windows command executables with .cmd extension when running on Windows', () => {
    expect(matrix.resolveWindowsExecutable('agy', true)).toBe('agy.cmd');
    expect(matrix.resolveWindowsExecutable('agy.exe', true)).toBe('agy.exe');
    expect(matrix.resolveWindowsExecutable('npx', true)).toBe('npx.cmd');
    expect(matrix.resolveWindowsExecutable('npx', false)).toBe('npx');
  });

  it('evaluates runtime availability matrix gracefully without throwing on missing runtimes', () => {
    const report = matrix.evaluateRuntimeMatrix({
      claude: '/usr/bin/claude',
      codex: null,
      agy: 'C:\\Users\\Ale\\AppData\\Roaming\\npm\\agy.cmd',
      opencode: null,
      lmstudio: null,
    });

    expect(report.length).toBe(5);

    const agy = report.find((r) => r.runtimeId === 'agy');
    expect(agy?.isAvailable).toBe(true);

    const codex = report.find((r) => r.runtimeId === 'codex');
    expect(codex?.isAvailable).toBe(false);
    expect(codex?.degradedReason).toContain('Modo degradado activo');
  });

  it('verifies GitCron process ownership before attempting process kill', () => {
    const spawnedPids = new Set([1001, 1002]);

    expect(matrix.isProcessOwnedByGitCron(1001, spawnedPids)).toBe(true);
    expect(matrix.isProcessOwnedByGitCron(9999, spawnedPids)).toBe(false); // Process of another app!
  });
});
