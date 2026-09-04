import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RuntimeProcessRunner, resolveRuntimeExecutable } from '../pipeline/runtime-adapters';

const temporaryDirectories: string[] = [];

async function fixtureDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-runtime-runner-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })));
});

describe('RuntimeProcessRunner', () => {
  it('runs executable and args without a shell and cleans ownership', async () => {
    const cwd = await fixtureDirectory();
    const runner = new RuntimeProcessRunner();
    const result = await runner.run({
      executable: process.execPath,
      args: ['-e', 'process.stdout.write(process.argv[1])', 'SAFE;NOT_A_SHELL'],
      cwd,
      expectedCanonicalCwd: cwd,
      timeoutMs: 5_000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toBe('SAFE;NOT_A_SHELL');
    expect(result.timedOut).toBe(false);
    expect(runner.ownedProcessCount()).toBe(0);
  });

  it('rejects a cwd that does not match the bound repository', async () => {
    const cwd = await fixtureDirectory();
    const other = await fixtureDirectory();
    const runner = new RuntimeProcessRunner();
    await expect(runner.run({
      executable: process.execPath,
      args: ['-e', 'process.exit(0)'],
      cwd,
      expectedCanonicalCwd: other,
    })).rejects.toThrow('Runtime cwd does not match the bound repository');
    expect(runner.ownedProcessCount()).toBe(0);
  });

  it('terminates an owned process on timeout and waits for close', async () => {
    const cwd = await fixtureDirectory();
    const runner = new RuntimeProcessRunner();
    const result = await runner.run({
      executable: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      cwd,
      expectedCanonicalCwd: cwd,
      timeoutMs: 50,
      killGraceMs: 50,
    });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
    expect(runner.ownedProcessCount()).toBe(0);
  });

  it('terminates when bounded stdout is exceeded', async () => {
    const cwd = await fixtureDirectory();
    const runner = new RuntimeProcessRunner();
    const result = await runner.run({
      executable: process.execPath,
      args: ['-e', 'process.stdout.write("x".repeat(4096)); setInterval(() => {}, 1000)'],
      cwd,
      expectedCanonicalCwd: cwd,
      maxStdoutBytes: 128,
      timeoutMs: 5_000,
    });
    expect(result.outputLimit).toBe('stdout');
    expect(result.stdout).toHaveLength(128);
    expect(runner.ownedProcessCount()).toBe(0);
  });

  it('supports AbortSignal and never controls unknown process ids', async () => {
    const cwd = await fixtureDirectory();
    const runner = new RuntimeProcessRunner();
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);
    const result = await runner.run({
      executable: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      cwd,
      expectedCanonicalCwd: cwd,
      signal: controller.signal,
      timeoutMs: 5_000,
    });
    expect(result.aborted).toBe(true);
    expect(runner.terminateOwned('external-pid')).toBe(false);
  });
});

// Los literales incluyen NODE_ENV porque next/types/global.d.ts lo declara requerido en NodeJS.ProcessEnv; el resolver solo lee PATH y PATHEXT.
describe('resolveRuntimeExecutable', () => {
  it('resolves a bare name to the first PATHEXT match of each directory, not exe-first', async () => {
    const dir = await fixtureDirectory();
    await fs.writeFile(path.join(dir, 'probe.cmd'), '@echo cmd\r\n');
    await fs.writeFile(path.join(dir, 'probe.exe'), 'not-used');
    // La extensión conserva el caso que declara PATHEXT: en Windows la
    // resolución es insensible a mayúsculas.
    const resolution = await resolveRuntimeExecutable('probe', { PATH: dir, PATHEXT: '.CMD;.EXE' });
    expect(resolution).toEqual({ file: path.join(dir, 'probe.CMD'), viaShell: true });
  });

  it('walks PATH directories in order and lets an earlier .cmd beat a later .exe', async () => {
    const first = await fixtureDirectory();
    const second = await fixtureDirectory();
    await fs.writeFile(path.join(first, 'probe.cmd'), '@echo cmd\r\n');
    await fs.writeFile(path.join(second, 'probe.exe'), 'not-used');
    const resolution = await resolveRuntimeExecutable('probe', {
      PATH: `${first};${second}`,
      PATHEXT: '.COM;.EXE;.BAT;.CMD',
    });
    expect(resolution).toEqual({ file: path.join(first, 'probe.CMD'), viaShell: true });
  });

  it('resolves a bare name to a direct .exe without the shell', async () => {
    const dir = await fixtureDirectory();
    await fs.writeFile(path.join(dir, 'probe.exe'), 'not-used');
    const resolution = await resolveRuntimeExecutable('probe', { PATH: dir, PATHEXT: '.COM;.EXE' });
    expect(resolution).toEqual({ file: path.join(dir, 'probe.EXE'), viaShell: false });
  });

  it('passes a full path through without searching PATH', async () => {
    const direct = await resolveRuntimeExecutable('C:\\tools\\probe.exe', { PATH: '' });
    expect(direct).toEqual({ file: 'C:\\tools\\probe.exe', viaShell: false });
    const batch = await resolveRuntimeExecutable('C:\\tools\\probe.cmd', { PATH: '' });
    expect(batch).toEqual({ file: 'C:\\tools\\probe.cmd', viaShell: true });
  });

  it('reports a name whose extension this application cannot launch, with the measured path', async () => {
    const dir = await fixtureDirectory();
    await fs.writeFile(path.join(dir, 'weird.tool'), 'not-used');
    await expect(resolveRuntimeExecutable('weird.tool', { PATH: dir, PATHEXT: '.CMD' }))
      .rejects.toThrow(/resolved to .*weird\.tool.* cannot launch/);
  });

  it('reports a bare name that only exists as an extensionless shim with the measured path', async () => {
    const dir = await fixtureDirectory();
    await fs.writeFile(path.join(dir, 'probe'), '#!/bin/sh\n');
    await expect(resolveRuntimeExecutable('probe', { PATH: dir, PATHEXT: '.COM;.EXE;.BAT;.CMD' }))
      .rejects.toThrow(`was found as ${path.join(dir, 'probe')}`);
  });

  it('reports a missing bare name with the environment that was searched', async () => {
    const dir = await fixtureDirectory();
    await expect(resolveRuntimeExecutable('probe', { PATH: dir, PATHEXT: '.COM;.EXE' }))
      .rejects.toThrow(/not found in the application environment PATH \(1 directories/);
  });
});

describe.skipIf(process.platform !== 'win32')('batch shim launch', () => {
  it('runs a resolved .cmd through the shell and captures its output', async () => {
    const bin = await fixtureDirectory();
    const cwd = await fixtureDirectory();
    await fs.writeFile(path.join(bin, 'probe.cmd'), '@echo SAFE;NOT_A_SHELL\r\n');
    const runner = new RuntimeProcessRunner();
    const result = await runner.run({
      executable: 'probe',
      args: [],
      cwd,
      expectedCanonicalCwd: cwd,
      env: { PATH: bin, PATHEXT: '.CMD' },
      timeoutMs: 5_000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString().trim()).toBe('SAFE;NOT_A_SHELL');
    expect(runner.ownedProcessCount()).toBe(0);
  });

  it('rejects an unresolvable bare name with the measured reason before spawning', async () => {
    const cwd = await fixtureDirectory();
    const runner = new RuntimeProcessRunner();
    await expect(runner.run({
      executable: 'definitely-missing-runtime',
      args: [],
      cwd,
      expectedCanonicalCwd: cwd,
      env: { PATH: '', PATHEXT: '.COM;.EXE' },
      timeoutMs: 5_000,
    })).rejects.toThrow(/not found in the application environment PATH/);
    expect(runner.ownedProcessCount()).toBe(0);
  });
});
