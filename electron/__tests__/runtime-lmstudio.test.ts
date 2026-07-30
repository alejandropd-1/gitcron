import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RuntimeProcessRunner,
  createLmStudioProviderAdapter,
  parseLmStudioCliCommit,
  parseLmStudioLoadedModels,
  parseLmStudioModelCatalog,
  parseOpenAiModelList,
  parseOpenAiUsage,
  validateRuntimeAdapterContract,
  type LmStudioHttpClient,
  type RuntimeProcessResult,
  type RuntimeProcessSpec,
} from '../pipeline/runtime-adapters';

const USAGE_FIXTURE = 'docs/pipeline/f03/fixtures/lmstudio-9902c3a-usage.sanitized.json';

/**
 * Verbatim response captured from a real local completion (F03).
 * The fixture stores the actual wire payload, so nothing is reconstructed here
 * and no live inference runs in tests (Invariante 10).
 */
function completionResponseFromFixture(): {
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    completion_tokens_details: { reasoning_tokens: number };
  };
} {
  const raw = JSON.parse(fs.readFileSync(path.resolve(USAGE_FIXTURE), 'utf8')) as {
    observedResponse: {
      model: string;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        completion_tokens_details: { reasoning_tokens: number };
      };
    };
  };
  return raw.observedResponse;
}

class LmStudioTestRunner extends RuntimeProcessRunner {
  constructor(
    private readonly outputs: Record<string, string> = {},
    private readonly exitCode = 0,
  ) {
    super();
  }

  override async run(spec: RuntimeProcessSpec): Promise<RuntimeProcessResult> {
    const key = spec.args.join(' ');
    return {
      processId: `probe:${key}`,
      exitCode: this.exitCode,
      signal: null,
      stdout: Buffer.from(this.outputs[key] ?? ''),
      stderr: Buffer.alloc(0),
      durationMs: 1,
      timedOut: false,
      aborted: false,
      outputLimit: null,
    };
  }
}

const MODEL_LIST_BODY = JSON.stringify({
  object: 'list',
  data: [
    { id: 'google/gemma-4-12b-qat', object: 'model', owned_by: 'organization_owner' },
    { id: 'qwen/qwen3.6-27b', object: 'model', owned_by: 'organization_owner' },
  ],
});

const CATALOG_BODY = JSON.stringify({
  models: [
    {
      type: 'llm',
      key: 'google/gemma-4-12b-qat',
      max_context_length: 262144,
      loaded_instances: [],
      capabilities: { trained_for_tool_use: true },
    },
    {
      type: 'llm',
      key: 'qwen/qwen3.6-27b',
      max_context_length: 131072,
      loaded_instances: [{ id: 'instance-1' }],
      capabilities: { trained_for_tool_use: false },
    },
    {
      // Mirrors the model used for the real capture in the usage fixture.
      type: 'llm',
      key: 'qwen/qwen3.5-9b',
      max_context_length: 262144,
      loaded_instances: [],
      capabilities: { trained_for_tool_use: true },
    },
  ],
});

/** Routes by path so the native catalog and the OpenAI-compatible list can differ. */
function httpStub(bodies: { catalog?: string; openai?: string }): LmStudioHttpClient {
  return async (url) => {
    const body = url.pathname === '/api/v1/models' ? bodies.catalog : bodies.openai;
    return body === undefined ? { status: 404, body: 'not found' } : { status: 200, body };
  };
}

/** Modern LM Studio: native /api/v1 catalog available. */
const nativeHttp = (): LmStudioHttpClient => httpStub({ catalog: CATALOG_BODY, openai: MODEL_LIST_BODY });

/** Older build: only the OpenAI-compatible surface exists. */
const legacyHttp = (): LmStudioHttpClient => httpStub({ openai: MODEL_LIST_BODY });

function unreachableHttp(): LmStudioHttpClient {
  return async () => {
    throw new Error('ECONNREFUSED');
  };
}

const session = (adapter: { descriptor: unknown }) => ({
  identity: {
    repoId: 'repo-1',
    repoPath: 'C:\\fixture\\repo',
    changeId: null,
    taskId: null,
    runId: 'run-1',
    attemptId: 'attempt-1',
    sessionId: 'session-1',
    parentSessionId: null,
    agentId: 'agent-1',
    parentAgentId: null,
    orchestrationMode: 'direct' as const,
    orchestratorRuntime: null,
    runtime: 'unknown' as const,
    provider: 'LM Studio',
    requestedModel: 'google/gemma-4-12b-qat' as string | null,
    effectiveModel: 'google/gemma-4-12b-qat' as string | null,
    reportedModel: 'google/gemma-4-12b-qat' as string | null,
    role: 'builder' as const,
  },
  descriptor: adapter.descriptor as never,
  ownedProcess: false,
  startedAt: '2026-07-24T00:00:00.000Z',
});

describe('LM Studio payload parsers', () => {
  it('reads the CLI commit from the real `lms --version` format', () => {
    expect(parseLmStudioCliCommit('CLI commit: 9902c3a\n')).toBe('9902c3a');
    expect(parseLmStudioCliCommit('unrelated output')).toBeNull();
  });

  it('parses an OpenAI-compatible model list and rejects foreign payloads', () => {
    expect(parseOpenAiModelList(MODEL_LIST_BODY)).toEqual([
      'google/gemma-4-12b-qat',
      'qwen/qwen3.6-27b',
    ]);
    expect(parseOpenAiModelList('{"nope":true}')).toBeNull();
    expect(parseOpenAiModelList('not json')).toBeNull();
  });

  it('treats an empty `lms ps --json` array as "server up, nothing loaded"', () => {
    expect(parseLmStudioLoadedModels('[]')).toEqual([]);
    expect(parseLmStudioLoadedModels('[{"identifier":"m","contextLength":8192}]'))
      .toEqual([{ identifier: 'm', contextTokens: 8192 }]);
    expect(parseLmStudioLoadedModels('{}')).toBeNull();
  });

  it('keeps unreported usage fields null instead of collapsing them to zero', () => {
    expect(parseOpenAiUsage({ usage: { prompt_tokens: 10 } })).toEqual({
      inputTokens: 10,
      outputTokens: null,
      reasoningTokens: null,
      model: null,
    });
    expect(parseOpenAiUsage({ choices: [] })).toBeNull();
  });
});

describe('LM Studio provider adapter', () => {
  it('reports healthy only when the OpenAI-compatible endpoint really answers', async () => {
    const runner = new LmStudioTestRunner({ '--version': 'CLI commit: 9902c3a\n', 'ps --json': '[]' });
    const adapter = createLmStudioProviderAdapter(
      'C:\\fixture\\repo',
      'lms',
      runner,
      () => '2026-07-24T00:00:00.000Z',
      { http: nativeHttp() },
    );

    const discovery = await adapter.discover();
    expect(discovery).toMatchObject({
      installed: true,
      runtimeVersion: '9902c3a',
      // `discover` sólo reporta el commit del CLI: la verificación real la hace
      // `health` contra el servidor HTTP vivo. El commit es referencia, no
      // evidencia, así que el estado es informativo.
      evidenceStatus: 'pending_fixture',
    });

    const health = await adapter.health();
    expect(health).toMatchObject({ status: 'healthy', evidenceStatus: 'verified' });
    expect(await adapter.listModels()).toContain('google/gemma-4-12b-qat');
    expect(validateRuntimeAdapterContract(adapter)).toEqual([]);
  });

  it('reads context limits and tool-use capability from the native catalog', async () => {
    const runner = new LmStudioTestRunner({ '--version': 'CLI commit: 9902c3a\n', 'ps --json': '[]' });
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner, undefined, {
      http: nativeHttp(),
    });

    const catalog = await adapter.modelCatalog();
    expect(catalog).toEqual([
      {
        key: 'google/gemma-4-12b-qat',
        type: 'llm',
        maxContextTokens: 262144,
        loadedInstanceCount: 0,
        trainedForToolUse: true,
      },
      {
        key: 'qwen/qwen3.6-27b',
        type: 'llm',
        maxContextTokens: 131072,
        loadedInstanceCount: 1,
        trainedForToolUse: false,
      },
      {
        key: 'qwen/qwen3.5-9b',
        type: 'llm',
        maxContextTokens: 262144,
        loadedInstanceCount: 0,
        trainedForToolUse: true,
      },
    ]);
  });

  it('falls back to the OpenAI list when /api/v1 is absent, and says so', async () => {
    const runner = new LmStudioTestRunner({ '--version': 'CLI commit: 9902c3a\n', 'ps --json': '[]' });
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner, undefined, {
      http: legacyHttp(),
    });

    const health = await adapter.health();
    expect(health.status).toBe('healthy');
    // Reachable but without the native catalog, so it must not claim verified evidence.
    expect(health.evidenceStatus).toBe('pending_fixture');
    expect(health.diagnostics).toContain('LM Studio /api/v1/models returned status 404');
    expect(await adapter.modelCatalog()).toBeNull();
    expect(await adapter.listModels()).toContain('qwen/qwen3.6-27b');
  });

  it('does not attribute a context window when the model is unknown', async () => {
    const runner = new LmStudioTestRunner({ '--version': 'CLI commit: 9902c3a\n', 'ps --json': '[]' });
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner, undefined, {
      http: nativeHttp(),
    });
    await adapter.health();

    const anonymous = session(adapter);
    anonymous.identity.effectiveModel = null;
    anonymous.identity.reportedModel = null;
    // Two models exist and only one is loaded, so the loaded one is the honest answer.
    const telemetry = await adapter.telemetry(anonymous);
    expect(telemetry.context.maxTokens.value).toBe(131072);
  });

  it('does not claim a version the CLI never reported', async () => {
    const runner = new LmStudioTestRunner({ '--version': 'CLI commit: deadbee\n', 'ps --json': '[]' });
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner, undefined, {
      http: nativeHttp(),
    });

    const discovery = await adapter.discover();
    expect(discovery.runtimeVersion).toBe('deadbee');
    expect(discovery.evidenceStatus).toBe('pending_fixture');
    expect(discovery.diagnostics).toContain('LM Studio CLI commit differs from the reference baseline');
  });

  it('is unavailable when the HTTP endpoint is unreachable, even if the CLI works', async () => {
    const runner = new LmStudioTestRunner({ '--version': 'CLI commit: 9902c3a\n', 'ps --json': '[]' });
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner, undefined, {
      http: unreachableHttp(),
    });

    const health = await adapter.health();
    expect(health).toMatchObject({ status: 'unavailable', evidenceStatus: 'unknown' });
    expect(health.diagnostics).toContain('LM Studio HTTP endpoint unreachable on loopback');
  });

  it('keeps usage unknown until a real response is ingested, without inventing zeros', async () => {
    const runner = new LmStudioTestRunner({ '--version': 'CLI commit: 9902c3a\n', 'ps --json': '[]' });
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner, undefined, {
      http: nativeHttp(),
    });

    const telemetry = await adapter.telemetry(session(adapter));
    expect(telemetry.usage.inputTokens.value).toBeNull();
    expect(telemetry.usage.inputTokens.classification).toBe('unknown');
    expect(telemetry.usage.outputTokens.value).toBeNull();
    expect(telemetry.context.maxTokens.value).toBeNull();
    // Local inference has no per-token price; that is not the same as "measured 0 usage".
    expect(telemetry.cost.usd.value).toBe(0);
    expect(telemetry.cost.usd.classification).toBe('local_unpriced');
    expect(telemetry.cost.usd.evidenceStatus).toBe('inferred');
    expect(telemetry.cost.billingStatus).toBe('local_unpriced');
  });

  it('reports the token counts the provider actually returned', async () => {
    const runner = new LmStudioTestRunner({
      '--version': 'CLI commit: 9902c3a\n',
      'ps --json': '[{"identifier":"google/gemma-4-12b-qat","contextLength":8192}]',
    });
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner, undefined, {
      http: nativeHttp(),
    });

    await adapter.health();
    const captured = completionResponseFromFixture();
    expect(adapter.recordCompletionUsage(captured)).toBe(true);

    const live = session(adapter);
    live.identity.effectiveModel = captured.model;
    live.identity.reportedModel = captured.model;
    const telemetry = await adapter.telemetry(live);
    expect(telemetry.usage.inputTokens.value).toBe(captured.usage.prompt_tokens);
    expect(telemetry.usage.outputTokens.value).toBe(captured.usage.completion_tokens);
    expect(telemetry.usage.reasoningTokens.value).toBe(captured.usage.completion_tokens_details.reasoning_tokens);
    // LM Studio does not report cache tokens; they must stay null, never zero.
    expect(telemetry.usage.cacheReadTokens.value).toBeNull();
    expect(telemetry.usage.inputTokens.classification).toBe('runtime_reported');
    // Resolved by model key against the native catalog, not by the stale CLI probe.
    expect(telemetry.context.maxTokens.value).toBe(262144);
    expect(telemetry.context.maxTokens.classification).toBe('runtime_reported');
    expect(telemetry.cost.usd.evidenceStatus).toBe('verified');
    expect(telemetry.reasoningVisibility).toBe('summary');
  });

  it('ignores a payload with no usage block instead of guessing', async () => {
    const runner = new LmStudioTestRunner({ '--version': 'CLI commit: 9902c3a\n', 'ps --json': '[]' });
    const adapter = createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', runner, undefined, {
      http: nativeHttp(),
    });

    expect(adapter.recordCompletionUsage({ choices: [] })).toBe(false);
    const telemetry = await adapter.telemetry(session(adapter));
    expect(telemetry.usage.outputTokens.value).toBeNull();
  });

  it('refuses a non-loopback base URL', () => {
    expect(() => createLmStudioProviderAdapter('C:\\fixture\\repo', 'lms', new LmStudioTestRunner(), undefined, {
      baseUrl: 'http://10.0.0.5:1234',
    })).toThrow(/loopback/);
  });
});
