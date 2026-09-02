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
  type RuntimeStartRequest,
} from '../pipeline/runtime-adapters';

class AcpFixtureRunner extends RuntimeProcessRunner {
  capturedSpec: RuntimeProcessSpec | null = null;
  terminated = false;

  constructor(private readonly responses: Buffer[]) {
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
    const combined = Buffer.concat(this.responses);
    const result = Promise.resolve().then((): RuntimeProcessResult => {
      spec.onStdout?.(combined);
      return {
        processId: 'acp-probe',
        exitCode: null,
        signal: 'SIGTERM',
        stdout: combined,
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

function initFixtureResponse(): Buffer {
  const fixture = JSON.parse(fs.readFileSync(
    path.resolve('electron/__tests__/fixtures/f03/fixtures/opencode-1.18.3-acp-initialize.sanitized.json'),
    'utf8',
  )) as { response: unknown };
  return Buffer.from(`${JSON.stringify(fixture.response)}\n`);
}

function sessionNewFixtureResponse(): Buffer {
  const fixture = JSON.parse(fs.readFileSync(
    path.resolve('electron/__tests__/fixtures/f03/fixtures/opencode-1.18.3-acp-session-new.sanitized.json'),
    'utf8',
  )) as { response: unknown; notifications: unknown[] };
  const lines = [JSON.stringify(fixture.response), ...fixture.notifications.map((n) => JSON.stringify(n))];
  return Buffer.from(lines.map((l) => `${l}\n`).join(''));
}

describe('OpenCode ACP adapter', () => {
  it('negotiates health through bounded ACP initialize and cleans up its owned process', async () => {
    const runner = new AcpFixtureRunner([initFixtureResponse()]);
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

  it('starts an ACP session, parses model config, collects events, telemetry and shuts down cleanly', async () => {
    const responses = [initFixtureResponse(), sessionNewFixtureResponse()];
    const runner = new AcpFixtureRunner(responses);
    const adapter = createOpenCodeAcpRuntimeAdapter(
      'C:\\fixture\\repo',
      'C:\\fixture\\opencode.exe',
      runner,
      () => '2026-07-24T00:00:00.000Z',
    );

    const request: RuntimeStartRequest = {
      repoId: 'repo-123',
      canonicalRepoPath: 'C:\\fixture\\repo',
      changeId: 'change-1',
      taskId: 'task-1',
      runId: 'run-1',
      attemptId: 'attempt-1',
      parentSessionId: null,
      parentAgentId: null,
      orchestrationMode: 'direct',
      orchestratorRuntime: 'orchestrator',
      provider: 'Z.AI',
      requestedModel: 'zai-coding-plan/glm-5.2',
      role: 'builder',
      instruction: 'Do not execute prompt',
    };

    const session = await adapter.start(request);
    expect(session.identity).toMatchObject({
      repoId: 'repo-123',
      sessionId: 'ses_sanitized_0000000000000000000000',
      runtime: 'opencode',
      provider: 'Z.AI',
      requestedModel: 'zai-coding-plan/glm-5.2',
      effectiveModel: 'opencode/big-pickle',
      reportedModel: 'opencode/big-pickle',
      role: 'builder',
    });

    const events = [];
    for await (const event of adapter.events(session)) {
      events.push(event);
    }
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].kind).toBe('session.update');

    // F03 never sends session/prompt, so nothing was billed and nothing was measured.
    // An unobserved run must stay unknown rather than collapse to a zero-cost run.
    const telemetry = await adapter.telemetry(session);
    expect(telemetry.cost.usd.value).toBeNull();
    expect(telemetry.cost.usd.classification).toBe('unknown');
    expect(telemetry.cost.billingStatus).toBe('unknown');
    expect(telemetry.usage.inputTokens.value).toBeNull();
    expect(telemetry.usage.outputTokens.value).toBeNull();
    expect(telemetry.reasoningVisibility).toBe('unavailable');

    await adapter.shutdown(session);
    expect(runner.terminated).toBe(true);
  });

  it('reports usage as inferred when session/update actually carries it', async () => {
    const usageNotification = Buffer.from(`${JSON.stringify({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'ses_sanitized_0000000000000000000000',
        usage: { inputTokens: 6113, outputTokens: 1078, reasoningTokens: 4131, cacheReadTokens: 26368 },
      },
    })}\n`);
    const runner = new AcpFixtureRunner([
      initFixtureResponse(),
      sessionNewFixtureResponse(),
      usageNotification,
    ]);
    const adapter = createOpenCodeAcpRuntimeAdapter(
      'C:\\fixture\\repo',
      'C:\\fixture\\opencode.exe',
      runner,
      () => '2026-07-24T00:00:00.000Z',
    );

    const session = await adapter.start({
      repoId: 'repo-123',
      canonicalRepoPath: 'C:\\fixture\\repo',
      changeId: null,
      taskId: null,
      runId: 'run-1',
      attemptId: 'attempt-1',
      parentSessionId: null,
      parentAgentId: null,
      orchestrationMode: 'direct',
      orchestratorRuntime: null,
      provider: 'Z.AI',
      requestedModel: 'zai-coding-plan/glm-5.2',
      role: 'builder',
      instruction: 'Do not execute prompt',
    });

    const telemetry = await adapter.telemetry(session);
    expect(telemetry.usage.inputTokens.value).toBe(6113);
    expect(telemetry.usage.outputTokens.value).toBe(1078);
    expect(telemetry.usage.reasoningTokens.value).toBe(4131);
    expect(telemetry.usage.cacheReadTokens.value).toBe(26368);
    expect(telemetry.usage.inputTokens.classification).toBe('runtime_reported');
    // The ACP field mapping has no fixture in 1.18.3, so it is inferred, not verified.
    expect(telemetry.usage.inputTokens.evidenceStatus).toBe('inferred');
    // Cost is still unknown: usage is not a price.
    expect(telemetry.cost.usd.value).toBeNull();

    await adapter.shutdown(session);
  });

  it('degrades an incompatible ACP response without enabling sessions', async () => {
    const response = initFixtureResponse().toString('utf8').replace('"protocolVersion":1', '"protocolVersion":2');
    const runner = new AcpFixtureRunner([Buffer.from(response)]);
    const adapter = createOpenCodeAcpRuntimeAdapter('C:\\fixture\\repo', 'opencode.exe', runner);

    await expect(adapter.health()).resolves.toMatchObject({
      status: 'degraded',
      evidenceStatus: 'pending_fixture',
    });
  });
});
