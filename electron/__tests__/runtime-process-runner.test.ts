import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RuntimeProcessRunner } from '../pipeline/runtime-adapters';

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
