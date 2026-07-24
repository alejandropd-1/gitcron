import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RuntimeProcessRunner,
  createOpenCodeAcpRuntimeAdapter,
  validateRuntimeAdapterContract,
  type RuntimeProcessHandle,
  type RuntimeProcessResult,
  type RuntimeProcessSpec,
} from '../pipeline/runtime-adapters';

class AcpFixtureRunner extends RuntimeProcessRunner {
  capturedSpec: RuntimeProcessSpec | null = null;
  terminated = false;

  constructor(private readonly response: Buffer) {
    super();
  }

  override async run(_spec: RuntimeProcessSpec): Promise<RuntimeProcessResult> {
    return {
      processId: 'version-probe',
      exitCode: 0,
      signal: null,
      stdout: Buffer.from('1.18.3\n'),
      stderr: Buffer.alloc(0),
      durationMs: 1,
      timedOut: false,
      aborted: false,
      outputLimit: null,
    };
  }

  override async start(spec: RuntimeProcessSpec): Promise<RuntimeProcessHandle> {
    this.capturedSpec = spec;
    const result = Promise.resolve().then((): RuntimeProcessResult => {
      spec.onStdout?.(this.response.subarray(0, 19));
      spec.onStdout?.(this.response.subarray(19));
      return {
        processId: 'acp-probe',
        exitCode: null,
        signal: 'SIGTERM',
        stdout: this.response,
        stderr: Buffer.alloc(0),
        durationMs: 2,
        timedOut: false,
        aborted: true,
        outputLimit: null,
      };
    });
    return {
      processId: 'acp-probe',
      result,
      terminate: () => {
        this.terminated = true;
        return true;
      },
    };
  }
}

function fixtureResponse(): Buffer {
  const fixture = JSON.parse(fs.readFileSync(
    path.resolve('docs/pipeline/f03/fixtures/opencode-1.18.3-acp-initialize.sanitized.json'),
    'utf8',
  )) as { response: unknown };
  return Buffer.from(`${JSON.stringify(fixture.response)}\n`);
}

describe('OpenCode ACP adapter', () => {
  it('negotiates health through bounded ACP initialize and cleans up its owned process', async () => {
    const runner = new AcpFixtureRunner(fixtureResponse());
    const adapter = createOpenCodeAcpRuntimeAdapter(
      'C:\\fixture\\repo',
      'C:\\fixture\\opencode.exe',
      runner,
      () => '2026-07-24T00:00:00.000Z',
    );

    await expect(adapter.health()).resolves.toMatchObject({
      status: 'healthy',
      evidenceStatus: 'verified',
    });
    expect(runner.capturedSpec?.args).toEqual(['acp', '--cwd', 'C:\\fixture\\repo']);
    expect(runner.capturedSpec?.stdin).toContain('"method":"initialize"');
    expect(runner.capturedSpec?.stdin).not.toMatch(/prompt|zai|glm/i);
    expect(runner.terminated).toBe(true);
    expect(validateRuntimeAdapterContract(adapter)).toEqual([]);
  });

  it('degrades an incompatible ACP response without enabling sessions', async () => {
    const response = fixtureResponse().toString('utf8').replace('"protocolVersion":1', '"protocolVersion":2');
    const runner = new AcpFixtureRunner(Buffer.from(response));
    const adapter = createOpenCodeAcpRuntimeAdapter('C:\\fixture\\repo', 'opencode.exe', runner);

    await expect(adapter.health()).resolves.toMatchObject({
      status: 'degraded',
      evidenceStatus: 'pending_fixture',
    });
    expect('start' in adapter).toBe(false);
    expect('resume' in adapter).toBe(false);
  });
});
