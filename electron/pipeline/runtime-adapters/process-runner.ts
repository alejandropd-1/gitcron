import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_KILL_GRACE_MS = 2_000;
const MAX_STDIN_BYTES = 64 * 1024;

const BASE_ENV_KEYS = [
  'PATH',
  'Path',
  'PATHEXT',
  'SYSTEMROOT',
  'WINDIR',
  'TEMP',
  'TMP',
  'HOME',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
] as const;

export interface RuntimeProcessSpec {
  executable: string;
  args: string[];
  cwd: string;
  expectedCanonicalCwd: string;
  stdin?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  killGraceMs?: number;
  maxStdoutBytes?: number;
  maxStderrBytes?: number;
  signal?: AbortSignal;
  onStdout?: (chunk: Buffer) => void;
  onStderr?: (chunk: Buffer) => void;
}

export interface RuntimeProcessResult {
  processId: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: Buffer;
  stderr: Buffer;
  durationMs: number;
  timedOut: boolean;
  aborted: boolean;
  outputLimit: 'stdout' | 'stderr' | null;
}

export interface RuntimeProcessHandle {
  processId: string;
  result: Promise<RuntimeProcessResult>;
  terminate(): boolean;
}

type OwnedProcess = {
  child: ChildProcessWithoutNullStreams;
  terminate: (reason: 'timeout' | 'abort' | 'output_limit') => void;
};

function positiveLimit(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && (value as number) > 0 ? value as number : fallback;
}

function minimalEnvironment(overrides: Record<string, string> | undefined): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV };
  for (const key of BASE_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (!key || key.includes('\0') || value.includes('\0')) throw new Error('Invalid runtime environment entry');
    env[key] = value;
  }
  return env;
}

async function assertCanonicalCwd(cwd: string, expected: string): Promise<string> {
  const [actualPath, expectedPath] = await Promise.all([fs.realpath(cwd), fs.realpath(expected)]);
  const normalize = (value: string) => process.platform === 'win32' ? value.toLowerCase() : value;
  if (normalize(actualPath) !== normalize(expectedPath)) throw new Error('Runtime cwd does not match the bound repository');
  return actualPath;
}

export class RuntimeProcessRunner {
  private readonly owned = new Map<string, OwnedProcess>();

  ownedProcessCount(): number {
    return this.owned.size;
  }

  async run(spec: RuntimeProcessSpec): Promise<RuntimeProcessResult> {
    const handle = await this.start(spec);
    return handle.result;
  }

  async start(spec: RuntimeProcessSpec): Promise<RuntimeProcessHandle> {
    if (!spec.executable.trim() || spec.executable.includes('\0')) throw new Error('Runtime executable is required');
    if (spec.args.some((arg) => arg.includes('\0'))) throw new Error('Runtime args contain a null byte');
    if (spec.stdin && Buffer.byteLength(spec.stdin) > MAX_STDIN_BYTES) throw new Error('Runtime stdin exceeds limit');
    if (spec.signal?.aborted) throw new Error('Runtime execution aborted before start');

    const cwd = await assertCanonicalCwd(spec.cwd, spec.expectedCanonicalCwd);
    const timeoutMs = positiveLimit(spec.timeoutMs, DEFAULT_TIMEOUT_MS);
    const killGraceMs = positiveLimit(spec.killGraceMs, DEFAULT_KILL_GRACE_MS);
    const maxStdoutBytes = positiveLimit(spec.maxStdoutBytes, DEFAULT_MAX_BYTES);
    const maxStderrBytes = positiveLimit(spec.maxStderrBytes, DEFAULT_MAX_BYTES);
    const processId = randomUUID();
    const startedAt = Date.now();

    let resolveResult!: (result: RuntimeProcessResult) => void;
    let rejectResult!: (reason: unknown) => void;
    const result = new Promise<RuntimeProcessResult>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(spec.executable, [...spec.args], {
        cwd,
        env: minimalEnvironment(spec.env),
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      rejectResult(error);
      return { processId, result, terminate: () => false };
    }

    {
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let timedOut = false;
      let aborted = false;
      let outputLimit: 'stdout' | 'stderr' | null = null;
      let settled = false;
      let forceTimer: ReturnType<typeof setTimeout> | null = null;

      const terminate = (reason: 'timeout' | 'abort' | 'output_limit') => {
        if (reason === 'timeout') timedOut = true;
        if (reason === 'abort') aborted = true;
        if (!child.killed) child.kill('SIGTERM');
        if (!forceTimer) {
          forceTimer = setTimeout(() => {
            if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
          }, killGraceMs);
          forceTimer.unref?.();
        }
      };

      this.owned.set(processId, { child, terminate });
      const timeout = setTimeout(() => terminate('timeout'), timeoutMs);
      timeout.unref?.();
      const onAbort = () => terminate('abort');
      spec.signal?.addEventListener('abort', onAbort, { once: true });

      const collect = (target: Buffer[], chunk: Buffer, stream: 'stdout' | 'stderr') => {
        const current = stream === 'stdout' ? stdoutBytes : stderrBytes;
        const maximum = stream === 'stdout' ? maxStdoutBytes : maxStderrBytes;
        const remaining = Math.max(0, maximum - current);
        if (remaining > 0) target.push(chunk.subarray(0, remaining));
        if (stream === 'stdout') {
          stdoutBytes += Math.min(chunk.length, remaining);
          spec.onStdout?.(chunk.subarray(0, remaining));
        } else {
          stderrBytes += Math.min(chunk.length, remaining);
          spec.onStderr?.(chunk.subarray(0, remaining));
        }
        if (chunk.length > remaining && !outputLimit) {
          outputLimit = stream;
          terminate('output_limit');
        }
      };

      child.stdout.on('data', (chunk: Buffer) => collect(stdout, chunk, 'stdout'));
      child.stderr.on('data', (chunk: Buffer) => collect(stderr, chunk, 'stderr'));

      child.once('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (forceTimer) clearTimeout(forceTimer);
        spec.signal?.removeEventListener('abort', onAbort);
        this.owned.delete(processId);
        rejectResult(error);
      });

      child.once('close', (exitCode, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (forceTimer) clearTimeout(forceTimer);
        spec.signal?.removeEventListener('abort', onAbort);
        this.owned.delete(processId);
        resolveResult({
          processId,
          exitCode,
          signal,
          stdout: Buffer.concat(stdout),
          stderr: Buffer.concat(stderr),
          durationMs: Date.now() - startedAt,
          timedOut,
          aborted,
          outputLimit,
        });
      });

      if (spec.stdin !== undefined) child.stdin.end(spec.stdin);
      else child.stdin.end();
    }

    return {
      processId,
      result,
      terminate: () => this.terminateOwned(processId),
    };
  }

  terminateOwned(processId: string): boolean {
    const owned = this.owned.get(processId);
    if (!owned) return false;
    owned.terminate('abort');
    return true;
  }
}
