import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthorizedOpenSpecRuntime } from '../pipeline/openspec-engine';

const execFileMock = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

const { statusOpenSpecChangeWithCli } = await import('../pipeline/openspec-cli');

const mockRuntime: AuthorizedOpenSpecRuntime = {
  executablePath: 'C:\\custom\\path\\openspec.cmd',
  command: 'openspec.cmd',
  shell: true,
  displayPath: 'C:\\custom\\path\\openspec.cmd',
  provenance: 'global',
};

describe('statusOpenSpecChangeWithCli (Contrato Tri-Estado skipSpecs)', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a) .openspec.yaml ausente + status sin skip_specs top-level => skipSpecs: null', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [{ id: 'proposal', status: 'done' }],
          isComplete: false,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo-no-file', 'mi-cambio', { runtime: mockRuntime });
    expect(result.available).toBe(true);
    expect(result.skipSpecs).toBeNull();
  });

  it('b) metadata inválida + status sin skip_specs top-level => skipSpecs: null', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [{ id: 'proposal', status: 'done' }],
          isComplete: false,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio', { runtime: mockRuntime });
    // Si la lectura de metadata falla o es inválida, skipSpecs resulta null
    expect(result.available).toBe(true);
    expect(result.skipSpecs).toBeNull();
  });

  it('d) campo top-level skip_specs booleano en status JSON prevalece sobre .openspec.yaml', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [{ id: 'proposal', status: 'done' }],
          skip_specs: true,
          isComplete: false,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio', { runtime: mockRuntime });
    expect(result.available).toBe(true);
    expect(result.skipSpecs).toBe(true);
  });

  it('e) artefacto skipped conserva state=skipped en el grafo pero NO falsifica la metadata (skipSpecs queda null si metadata es ausente/inválida)', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [
            { id: 'proposal', status: 'done' },
            { id: 'specs', status: 'skipped' },
          ],
          isComplete: false,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo-no-file', 'mi-cambio', { runtime: mockRuntime });
    expect(result.available).toBe(true);
    // specs conserva state: 'skipped'
    expect(result.artifacts.find((a) => a.id === 'specs')?.state).toBe('skipped');
    // PERO skipSpecs no se convierte falsamente en true: se mantiene null si la metadata es ausente/inválida
    expect(result.skipSpecs).toBeNull();
  });

  it('tolera elementos null, primitivos o arrays dentro de artifacts descartándolos sin romper el grafo ni dar available false', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [
            null,
            42,
            "cadena-suelta",
            ["array-anidado"],
            { id: 'valid-artifact', status: 'done' },
            { noId: 'invalid' },
          ],
          isComplete: false,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio', { runtime: mockRuntime });
    expect(result.available).toBe(true);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].id).toBe('valid-artifact');
  });

  it('transporta schema desconocido y campos adicionales futuros sin romper', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [{ id: 'proposal', status: 'done' }],
          schemaName: 'custom-future-schema',
          futureField: { nested: true },
          isComplete: true,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio', { runtime: mockRuntime });
    expect(result.available).toBe(true);
    expect(result.schemaName).toBe('custom-future-schema');
  });

  it('dá preferencia a isPlanningComplete boolean false sobre alias isComplete true', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [],
          applyRequires: [],
          isPlanningComplete: false,
          isComplete: true,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio', { runtime: mockRuntime });
    expect(result.isPlanningComplete).toBe(false);
    expect(result.isComplete).toBe(false);
  });

  it('conserva artefactos con estado desconocido como unknown con rawState', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [
            { id: 'proposal', status: 'done' },
            { id: 'coso', status: 'half-done' },
            { id: 'tasks', status: 'blocked', missingDeps: ['proposal'] },
          ],
          applyRequires: ['tasks'],
          isComplete: false,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio', { runtime: mockRuntime });

    expect(result.available).toBe(true);
    expect(result.artifacts.map((a) => a.id)).toEqual(['proposal', 'coso', 'tasks']);
    expect(result.artifacts[1]).toEqual({
      id: 'coso',
      state: 'unknown',
      rawState: 'half-done',
      missingDeps: [],
      requires: [],
    });
  });

  it('rechaza el changeId de 201 caracteres antes de spawn', async () => {
    const tooLong = 'a'.repeat(201);
    const result = await statusOpenSpecChangeWithCli('C:/repo', tooLong, { runtime: mockRuntime });
    expect(result.available).toBe(false);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('acepta el changeId de 200 caracteres con prefijo numérico', async () => {
    const atLimit = '1' + 'a'.repeat(199);
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [{ id: 'proposal', status: 'done' }],
          isComplete: true,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', atLimit, { runtime: mockRuntime });
    expect(result.available).toBe(true);
  });
});
