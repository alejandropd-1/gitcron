import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthorizedOpenSpecRuntime } from '../pipeline/openspec-engine';

const execFileMock = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

const { discoverOpenSpecCli } = await import('../pipeline/openspec-engine');
const { readOpenSpecGlobalConfig } = await import('../pipeline/openspec-global-config');
const {
  initOpenSpecWithCli,
  archiveOpenSpecChangeWithCli,
  validateOpenSpecChangeWithCli,
  statusOpenSpecChangeWithCli,
} = await import('../pipeline/openspec-cli');

const runtimeWithSpaces: AuthorizedOpenSpecRuntime = {
  executablePath: 'C:\\Program Files\\OpenSpec Runtimes 1.8.0\\openspec.cmd',
  command: 'openspec.cmd',
  shell: true,
  displayPath: 'C:\\Program Files\\OpenSpec Runtimes 1.8.0\\openspec.cmd',
  provenance: 'managed',
};

const expectedExecCmd = '"%OPENSPEC_EXEC_TARGET%"';

describe('OpenSpec Runner y Wrappers: evidencia de runtime exacto con espacios y sin fallback', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('discoverOpenSpecCli usa runtime.executablePath con comillas para shell en Windows y pasa --version', async () => {
    execFileMock.mockImplementation((cmd, args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      expect(cmd).toBe(expectedExecCmd);
      expect(args).toEqual(['--version']);
      callback(null, { stdout: '1.8.0\n', stderr: '' });
    });

    const result = await discoverOpenSpecCli({
      resolve: () => runtimeWithSpaces,
      realpath: (p) => p,
    });

    expect(result.installed).toBe(true);
    expect(result.runtimeVersion).toBe('1.8.0');
    expect(execFileMock).toHaveBeenCalledTimes(1);
  });

  it('readOpenSpecGlobalConfig usa runtime.executablePath y argumentos exactos', async () => {
    const capturedCmds: string[] = [];
    const capturedArgs: string[][] = [];

    execFileMock.mockImplementation((cmd, args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      capturedCmds.push(cmd as string);
      capturedArgs.push(args as string[]);
      const key = args[2];
      const val = key === 'profile' ? 'core' : key === 'delivery' ? 'both' : '["propose"]';
      callback(null, { stdout: val, stderr: '' });
    });

    const result = await readOpenSpecGlobalConfig({
      runtime: runtimeWithSpaces,
    });

    expect(capturedCmds.every((c) => c === expectedExecCmd)).toBe(true);
    expect(capturedArgs).toContainEqual(['config', 'get', 'profile']);
    expect(capturedArgs).toContainEqual(['config', 'get', 'delivery']);
    expect(capturedArgs).toContainEqual(['config', 'get', 'workflows']);
    expect(result.origin).toBe('cli');
  });

  it('initOpenSpecWithCli usa runtime.executablePath y no invoca PATH', async () => {
    execFileMock.mockImplementation((cmd, args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      expect(cmd).toBe(expectedExecCmd);
      expect(args).toEqual(['init']);
      callback(null, { stdout: '', stderr: '' });
    });

    const res = await initOpenSpecWithCli('C:/repo', undefined, { runtime: runtimeWithSpaces });
    expect(res.ok).toBe(true);
    expect(execFileMock).toHaveBeenCalledTimes(1);
  });

  it('archiveOpenSpecChangeWithCli usa runtime.executablePath y argumentos exactos', async () => {
    execFileMock.mockImplementation((cmd, args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      expect(cmd).toBe(expectedExecCmd);
      expect(args).toEqual(['archive', 'mi-cambio', '--yes']);
      callback(null, { stdout: '', stderr: '' });
    });

    const res = await archiveOpenSpecChangeWithCli('C:/repo', 'mi-cambio', { runtime: runtimeWithSpaces });
    expect(res.ok).toBe(true);
  });

  it('validateOpenSpecChangeWithCli usa runtime.executablePath y argumentos exactos', async () => {
    execFileMock.mockImplementation((cmd, args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      expect(cmd).toBe(expectedExecCmd);
      expect(args).toEqual(['validate', 'mi-cambio', '--strict', '--no-interactive']);
      callback(null, { stdout: '', stderr: '' });
    });

    const status = await validateOpenSpecChangeWithCli('C:/repo', 'mi-cambio', { runtime: runtimeWithSpaces });
    expect(status).toBe('passed');
  });

  it('statusOpenSpecChangeWithCli usa runtime.executablePath y argumentos exactos', async () => {
    execFileMock.mockImplementation((cmd, args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      expect(cmd).toBe(expectedExecCmd);
      expect(args).toEqual(['status', 'mi-cambio', '--json']);
      callback(null, { stdout: JSON.stringify({ artifacts: [] }), stderr: '' });
    });

    const status = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio', { runtime: runtimeWithSpaces });
    expect(status.available).toBe(true);
  });

  it('runtime: null en wrappers y global config no hace fallback silencioso y devuelve respuesta segura inmediatamente', async () => {
    const options = { runtime: null };

    expect(await initOpenSpecWithCli('C:/repo', undefined, options)).toEqual({
      ok: false,
      error: 'openspec-cli-not-found',
      needsTool: false,
    });

    expect(await archiveOpenSpecChangeWithCli('C:/repo', 'mi-cambio', options)).toEqual({
      ok: false,
      error: 'openspec-cli-not-found',
    });

    expect(await validateOpenSpecChangeWithCli('C:/repo', 'mi-cambio', options)).toBe('unknown');

    const statusRes = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio', options);
    expect(statusRes.available).toBe(false);

    const cfgRes = await readOpenSpecGlobalConfig(options);
    expect(cfgRes.origin).toBe('unknown');
    expect(cfgRes.profileState).toBe('unread');

    expect(execFileMock).not.toHaveBeenCalled();
  });
});
