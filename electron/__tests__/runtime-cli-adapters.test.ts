import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RuntimeSessionRequest } from '../../types/pipeline';
import {
  RuntimeProcessRunner,
  createClaudeRuntimeAdapter,
  createCodexRuntimeAdapter,
  type RuntimeProcessHandle,
  type RuntimeProcessResult,
  type RuntimeProcessSpec,
} from '../pipeline/runtime-adapters';

const baseRequest: RuntimeSessionRequest = {
  repoId: 'repo-fixture',
  canonicalRepoPath: 'C:\\fixture\\repo',
  changeId: 'pipeline-fase-03-runtime-adapters',
  taskId: '2.6',
  runId: 'run-fixture',
  attemptId: 'attempt-1',
  parentSessionId: null,
  parentAgentId: null,
  orchestrationMode: 'direct',
  orchestratorRuntime: 'codex',
  provider: null,
  requestedModel: null,
  role: 'builder',
};

class FixtureRunner extends RuntimeProcessRunner {
  capturedSpec: RuntimeProcessSpec | null = null;

  constructor(private readonly fixture: Buffer) {
    super();
  }

  override async start(spec: RuntimeProcessSpec): Promise<RuntimeProcessHandle> {
    this.capturedSpec = spec;
    const result = Promise.resolve().then((): RuntimeProcessResult => {
      const midpoint = Math.floor(this.fixture.length / 2);
      spec.onStdout?.(this.fixture.subarray(0, midpoint));
      spec.onStdout?.(this.fixture.subarray(midpoint));
      return {
        processId: 'fixture-process',
        exitCode: 0,
        signal: null,
        stdout: this.fixture,
        stderr: Buffer.alloc(0),
        durationMs: 10,
        timedOut: false,
        aborted: false,
        outputLimit: null,
      };
    });
    return { processId: 'fixture-process', result, terminate: () => true };
  }

  override async run(spec: RuntimeProcessSpec): Promise<RuntimeProcessResult> {
    const stdout = spec.executable === 'claude'
      ? Buffer.from('2.1.206 (Claude Code)\n')
      : Buffer.from('codex-cli 0.143.0\n');
    return {
      processId: 'version-probe',
      exitCode: 0,
      signal: null,
      stdout,
      stderr: Buffer.alloc(0),
      durationMs: 1,
      timedOut: false,
      aborted: false,
      outputLimit: null,
    };
  }
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) values.push(value);
  return values;
}

describe('structured CLI runtime adapters', () => {
  it.each([
    {
      name: 'claude',
      fixture: 'claude-2.1.206-stream.sanitized.jsonl',
      create: createClaudeRuntimeAdapter,
      expectedKind: 'reasoning.delta',
      expectedInputTokens: 1280,
    },
    {
      name: 'codex',
      fixture: 'codex-0.143.0-exec.sanitized.jsonl',
      create: createCodexRuntimeAdapter,
      expectedKind: 'tool.completed',
      expectedInputTokens: 41220,
    },
  ])('streams and normalizes $name without placing the instruction in argv', async ({ fixture, create, expectedKind, expectedInputTokens }) => {
    const bytes = fs.readFileSync(path.resolve('docs/pipeline/f03/fixtures', fixture));
    const runner = new FixtureRunner(bytes);
    const adapter = create(baseRequest.canonicalRepoPath, runner, () => '2026-07-24T00:00:00.000Z');
    const instruction = 'PRIVATE_FIXTURE_INSTRUCTION';
    const session = await adapter.start?.({ ...baseRequest, instruction, timeoutMs: 5_000 });
    expect(session).toBeDefined();
    if (!session) throw new Error('adapter did not create a session');

    const events = await collect(adapter.events(session));
    const telemetry = await adapter.telemetry(session);
    expect(events.map(({ kind }) => kind)).toContain(expectedKind);
    expect(events.at(-1)).toMatchObject({
      kind: 'runtime.process.completed',
      provenance: 'derived',
      payload: { exitCode: 0, stderrBytes: 0 },
    });
    expect(telemetry.usage.inputTokens.value).toBe(expectedInputTokens);
    expect(runner.capturedSpec?.stdin).toBe(instruction);
    expect(runner.capturedSpec?.args).not.toContain(instruction);
    expect(runner.capturedSpec?.cwd).toBe(baseRequest.canonicalRepoPath);
    await adapter.shutdown(session);
  });

  it('rejects missing identity before a runner is invoked', async () => {
    const runner = new FixtureRunner(Buffer.alloc(0));
    const adapter = createCodexRuntimeAdapter(baseRequest.canonicalRepoPath, runner);
    await expect(adapter.start?.({ ...baseRequest, repoId: '', instruction: 'safe' })).rejects.toThrow('repoId is required');
    expect(runner.capturedSpec).toBeNull();
  });

  it('degrades and refuses to parse an installed version without a matching fixture', async () => {
    class NewVersionRunner extends FixtureRunner {
      override async run(spec: RuntimeProcessSpec): Promise<RuntimeProcessResult> {
        return { ...(await super.run(spec)), stdout: Buffer.from('codex-cli 0.144.0\n') };
      }
    }
    const runner = new NewVersionRunner(Buffer.alloc(0));
    const adapter = createCodexRuntimeAdapter(baseRequest.canonicalRepoPath, runner);
    await expect(adapter.health()).resolves.toMatchObject({ status: 'degraded', evidenceStatus: 'pending_fixture' });
    await expect(adapter.start?.({ ...baseRequest, instruction: 'safe' })).rejects.toThrow(
      'Runtime version has no compatible verified fixture',
    );
    expect(runner.capturedSpec).toBeNull();
  });
});
