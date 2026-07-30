import { request as httpRequest } from 'node:http';
import type {
  MetricName,
  MetricSample,
  PipelineEventEnvelope,
  RuntimeDescriptor,
  RuntimeDiscovery,
  RuntimeHealth,
  RuntimeSession,
  RuntimeTelemetrySnapshot,
} from '../../../types/pipeline';
import { asRecord, metricSample, numberValue, stringValue, unknownTelemetry } from './normalization';
import { RuntimeProcessRunner } from './process-runner';
import type { RuntimeAdapter } from './runtime-adapter';

const SUPPORTED_CLI_COMMIT = '9902c3a';
const CLI_COMMIT_PREFIX = 'cli commit:';
const DEFAULT_BASE_URL = 'http://127.0.0.1:1234';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
const HTTP_TIMEOUT_MS = 5_000;
const MAX_HTTP_BYTES = 256 * 1024;

export interface LmStudioHttpResponse {
  status: number;
  body: string;
}

export type LmStudioHttpClient = (url: URL, timeoutMs: number) => Promise<LmStudioHttpResponse>;

/**
 * Loopback-only GET client built on node:http (zero new dependencies).
 * Never sends credentials and never starts, loads or unloads a model.
 */
export function createLoopbackHttpClient(): LmStudioHttpClient {
  return (url, timeoutMs) => new Promise<LmStudioHttpResponse>((resolve, reject) => {
    const req = httpRequest({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: { accept: 'application/json' },
    }, (res) => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      res.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes <= MAX_HTTP_BYTES) {
          chunks.push(chunk);
          return;
        }
        res.destroy();
        req.destroy(new Error('LM Studio HTTP response exceeds the byte limit'));
      });
      res.on('end', () => resolve({
        status: res.statusCode ?? 0,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
      res.on('error', reject);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('LM Studio HTTP timeout')));
    req.on('error', reject);
    req.end();
  });
}

function assertLoopbackBaseUrl(baseUrl: string): URL {
  const url = new URL(baseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('LM Studio base URL must be http or https');
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error('LM Studio base URL must target a loopback host');
  }
  return url;
}

/** `lms --version` prints `CLI commit: <sha>`; anything else leaves the version unknown. */
export function parseLmStudioCliCommit(output: string): string | null {
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.toLowerCase().startsWith(CLI_COMMIT_PREFIX)) continue;
    const value = trimmed.slice(trimmed.indexOf(':') + 1).trim();
    return value || null;
  }
  return null;
}

/** Parses an OpenAI-compatible `/v1/models` payload. Returns null when the shape does not match. */
export function parseOpenAiModelList(body: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const record = asRecord(parsed);
  if (!record || !Array.isArray(record.data)) return null;
  const ids: string[] = [];
  for (const item of record.data) {
    const id = stringValue(asRecord(item)?.id);
    if (id) ids.push(id);
  }
  return ids;
}

export interface LmStudioModelInfo {
  key: string;
  type: string | null;
  maxContextTokens: number | null;
  loadedInstanceCount: number;
  trainedForToolUse: boolean | null;
}

/**
 * Parses LM Studio's native `GET /api/v1/models` catalog, which carries
 * `max_context_length`, `loaded_instances` and tool-use capability that the
 * OpenAI-compatible `/v1/models` list does not expose. Returns null on mismatch.
 */
export function parseLmStudioModelCatalog(body: string): LmStudioModelInfo[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const record = asRecord(parsed);
  if (!record || !Array.isArray(record.models)) return null;

  const catalog: LmStudioModelInfo[] = [];
  for (const item of record.models) {
    const model = asRecord(item);
    const key = stringValue(model?.key);
    if (!key) continue;
    const capabilities = asRecord(model?.capabilities);
    const toolUse = capabilities?.trained_for_tool_use;
    catalog.push({
      key,
      type: stringValue(model?.type),
      maxContextTokens: numberValue(model?.max_context_length),
      loadedInstanceCount: Array.isArray(model?.loaded_instances) ? model.loaded_instances.length : 0,
      trainedForToolUse: typeof toolUse === 'boolean' ? toolUse : null,
    });
  }
  return catalog;
}

export interface LmStudioLoadedModel {
  identifier: string | null;
  contextTokens: number | null;
}

/** Parses `lms ps --json`. An empty array means the server is up with no model loaded. */
export function parseLmStudioLoadedModels(body: string): LmStudioLoadedModel[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  return parsed.map((item) => {
    const record = asRecord(item);
    return {
      identifier: stringValue(record?.identifier) ?? stringValue(record?.modelKey),
      contextTokens: numberValue(record?.contextLength)
        ?? numberValue(record?.context_length)
        ?? numberValue(record?.maxContextLength),
    };
  });
}

export interface LmStudioUsageObservation {
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  model: string | null;
}

/**
 * Parses the `usage` block of an OpenAI-compatible chat completion response.
 * Fields the provider does not report stay null instead of collapsing to zero.
 */
export function parseOpenAiUsage(rawResponse: unknown): LmStudioUsageObservation | null {
  const record = asRecord(rawResponse);
  const usage = asRecord(record?.usage);
  if (!usage) return null;
  const details = asRecord(usage.completion_tokens_details);
  return {
    inputTokens: numberValue(usage.prompt_tokens),
    outputTokens: numberValue(usage.completion_tokens),
    reasoningTokens: numberValue(details?.reasoning_tokens) ?? numberValue(usage.reasoning_tokens),
    model: stringValue(record?.model),
  };
}

export const LMSTUDIO_DESCRIPTOR: RuntimeDescriptor = {
  adapterId: 'lmstudio-provider',
  runtime: 'unknown',
  adapterKind: 'openai-compatible',
  transport: 'openai-http',
  runtimeVersion: SUPPORTED_CLI_COMMIT,
  protocolVersion: 'v1',
  capabilities: [
    {
      capabilityId: 'health',
      capabilityVersion: '1',
      availability: 'available',
      evidenceStatus: 'pending_fixture',
      targetScopes: ['repo'],
      constraints: [
        'loopback GET /api/v1/models, falling back to /v1/models; main-only',
        'no auto-start, load or unload',
      ],
      evidenceRefs: [],
    },
    {
      capabilityId: 'models.list',
      capabilityVersion: '1',
      availability: 'available',
      evidenceStatus: 'pending_fixture',
      targetScopes: ['repo'],
      constraints: [
        'native catalog exposes max_context_length, loaded_instances and trained_for_tool_use',
        'OpenAI-compatible fallback only yields ids',
      ],
      evidenceRefs: [],
    },
    {
      capabilityId: 'telemetry.snapshot',
      capabilityVersion: null,
      availability: 'degraded',
      evidenceStatus: 'pending_fixture',
      targetScopes: ['run', 'session'],
      constraints: [
        'provider mode: GitCron observes responses, so usage requires an ingested response and stays unknown until then',
        'verified end to end against a real local completion; cache tokens are not reported by LM Studio',
        'cost is local_unpriced: local inference has no per-token price',
      ],
      evidenceRefs: [],
    },
  ],
};

export interface LmStudioAdapterOptions {
  baseUrl?: string;
  http?: LmStudioHttpClient;
}

export class LmStudioProviderAdapter implements RuntimeAdapter {
  readonly descriptor = LMSTUDIO_DESCRIPTOR;

  private readonly baseUrl: URL;
  private readonly http: LmStudioHttpClient;
  private lastUsage: LmStudioUsageObservation | null = null;
  private loadedContextTokens: number | null = null;
  private catalog: LmStudioModelInfo[] | null = null;

  constructor(
    private readonly canonicalRepoPath: string,
    private readonly executable: string = 'lms',
    private readonly runner = new RuntimeProcessRunner(),
    private readonly now: () => string = () => new Date().toISOString(),
    options: LmStudioAdapterOptions = {},
  ) {
    this.baseUrl = assertLoopbackBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.http = options.http ?? createLoopbackHttpClient();
  }

  async discover(): Promise<RuntimeDiscovery> {
    try {
      const result = await this.runner.run({
        executable: this.executable,
        args: ['--version'],
        cwd: this.canonicalRepoPath,
        expectedCanonicalCwd: this.canonicalRepoPath,
        timeoutMs: 10_000,
        maxStdoutBytes: 16_384,
        maxStderrBytes: 16_384,
      });
      const installed = result.exitCode === 0 && !result.timedOut && !result.outputLimit;
      const detectedCommit = installed ? parseLmStudioCliCommit(result.stdout.toString('utf8')) : null;
      const withinBaseline = detectedCommit === SUPPORTED_CLI_COMMIT;
      const diagnostics: string[] = [];
      if (!installed) diagnostics.push('LM Studio CLI version probe failed');
      else if (!detectedCommit) diagnostics.push('LM Studio CLI did not report a commit identifier');
      else if (!withinBaseline) diagnostics.push('LM Studio CLI commit differs from the reference baseline');

      return {
        installed,
        executable: installed ? this.executable : null,
        runtimeVersion: detectedCommit,
        // `evidenceStatus` aquí es informativo y depende del commit del CLI, no
        // de observación viva: la verificación real la hace `health()` sobre el
        // servidor. No bloquea el listado del proveedor.
        evidenceStatus: installed ? 'pending_fixture' : 'unknown',
        evidenceRefs: [],
        diagnostics,
      };
    } catch {
      return {
        installed: false,
        executable: null,
        runtimeVersion: null,
        evidenceStatus: 'unknown',
        evidenceRefs: [],
        diagnostics: ['LM Studio CLI executable unavailable'],
      };
    }
  }

  /**
   * Real HTTP probe: the server is the source of truth, not the CLI exit code.
   * Prefers the native catalog and degrades to the OpenAI-compatible list on
   * builds that do not expose /api/v1.
   */
  async health(): Promise<RuntimeHealth> {
    const startedAt = Date.now();
    const diagnostics: string[] = [];

    this.catalog = await this.fetchCatalog(diagnostics);
    let modelCount = this.catalog?.length ?? null;
    let nativeCatalog = this.catalog !== null;

    if (!nativeCatalog) {
      const fallback = await this.fetchOpenAiModelIds(diagnostics);
      modelCount = fallback?.length ?? null;
      await this.refreshLoadedModels(diagnostics);
    } else {
      this.loadedContextTokens = this.catalog!
        .find((model) => model.loadedInstanceCount > 0 && model.maxContextTokens !== null)
        ?.maxContextTokens ?? null;
      if (!this.catalog!.some((model) => model.loadedInstanceCount > 0)) {
        diagnostics.push('LM Studio has no model loaded');
      }
    }

    if (modelCount === null) {
      return {
        status: 'unavailable',
        checkedAt: this.now(),
        latencyMs: Date.now() - startedAt,
        evidenceStatus: 'unknown',
        evidenceRefs: [],
        diagnostics,
      };
    }

    if (modelCount === 0) diagnostics.push('LM Studio reports no downloaded models');
    return {
      status: 'healthy',
      checkedAt: this.now(),
      latencyMs: Date.now() - startedAt,
      evidenceStatus: nativeCatalog ? 'verified' : 'pending_fixture',
      evidenceRefs: [],
      diagnostics,
    };
  }

  /** Native catalog with context limits and tool-use capability, or null when unavailable. */
  async modelCatalog(): Promise<LmStudioModelInfo[] | null> {
    const diagnostics: string[] = [];
    const catalog = await this.fetchCatalog(diagnostics);
    if (catalog) this.catalog = catalog;
    return catalog;
  }

  /** Model ids exposed by the local OpenAI-compatible server, or null when unreachable. */
  async listModels(): Promise<string[] | null> {
    const catalog = await this.fetchCatalog([]);
    if (catalog) return catalog.map((model) => model.key);
    return this.fetchOpenAiModelIds([]);
  }

  private async fetchCatalog(diagnostics: string[]): Promise<LmStudioModelInfo[] | null> {
    try {
      const response = await this.http(new URL('/api/v1/models', this.baseUrl), HTTP_TIMEOUT_MS);
      if (response.status !== 200) {
        diagnostics.push(`LM Studio /api/v1/models returned status ${response.status}`);
        return null;
      }
      const catalog = parseLmStudioModelCatalog(response.body);
      if (!catalog) diagnostics.push('LM Studio /api/v1/models payload is not a native model catalog');
      return catalog;
    } catch {
      diagnostics.push('LM Studio HTTP endpoint unreachable on loopback');
      return null;
    }
  }

  private async fetchOpenAiModelIds(diagnostics: string[]): Promise<string[] | null> {
    try {
      const response = await this.http(new URL('/v1/models', this.baseUrl), HTTP_TIMEOUT_MS);
      if (response.status !== 200) {
        diagnostics.push(`LM Studio /v1/models returned status ${response.status}`);
        return null;
      }
      const ids = parseOpenAiModelList(response.body);
      if (!ids) diagnostics.push('LM Studio /v1/models payload is not an OpenAI-compatible model list');
      return ids;
    } catch {
      diagnostics.push('LM Studio HTTP endpoint unreachable on loopback');
      return null;
    }
  }

  /**
   * Ingests a real OpenAI-compatible response so telemetry can report measured usage.
   * Returns false when the payload carries no usage block, leaving telemetry unknown.
   */
  recordCompletionUsage(rawResponse: unknown): boolean {
    const usage = parseOpenAiUsage(rawResponse);
    if (!usage) return false;
    this.lastUsage = usage;
    return true;
  }

  async *events(_session: RuntimeSession): AsyncIterable<PipelineEventEnvelope> {
    // Provider mode: GitCron observes responses, it does not own an agent session.
    return;
  }

  async telemetry(session: RuntimeSession): Promise<RuntimeTelemetrySnapshot> {
    const identity = { ...session.identity };
    const sourceRef = `${this.baseUrl.origin}/v1/chat/completions`;
    const observation = this.lastUsage;

    const snapshot = unknownTelemetry(identity, sourceRef);

    // Local inference has no per-token price, so 0 USD is a property of the provider.
    // It is only "verified" once a real local response has actually been observed.
    snapshot.cost.usd = metricSample(
      identity,
      'cost.usd',
      'cost',
      'USD',
      0,
      'local_unpriced',
      observation ? 'verified' : 'inferred',
      sourceRef,
    );
    snapshot.cost.billingStatus = 'local_unpriced';

    const context = this.resolveContextWindow(identity, observation);
    if (context) {
      snapshot.context.maxTokens = metricSample(
        identity,
        'context.max_tokens',
        'context',
        'tokens',
        context.tokens,
        'runtime_reported',
        'verified',
        context.sourceRef,
      );
    }

    if (!observation) return snapshot;

    const measured = (name: MetricName, value: number | null): MetricSample => metricSample(
      identity,
      name,
      'tokens',
      'tokens',
      value,
      value === null ? 'unknown' : 'runtime_reported',
      value === null ? 'unknown' : 'verified',
      sourceRef,
    );
    snapshot.usage.inputTokens = measured('tokens.input', observation.inputTokens);
    snapshot.usage.outputTokens = measured('tokens.output', observation.outputTokens);
    snapshot.usage.reasoningTokens = measured('tokens.reasoning', observation.reasoningTokens);
    snapshot.reasoningVisibility = observation.reasoningTokens === null ? 'unavailable' : 'summary';
    return snapshot;
  }

  async shutdown(_session: RuntimeSession): Promise<void> {
    // Provider mode: GitCron owns no LM Studio process and never unloads a model.
    return;
  }

  /**
   * The catalog's `max_context_length` is a per-model capability, so it only
   * describes this run when we know which model ran. Falls back to a single
   * loaded model, and otherwise stays unknown rather than guessing.
   */
  private resolveContextWindow(
    identity: { effectiveModel: string | null; reportedModel: string | null },
    observation: LmStudioUsageObservation | null,
  ): { tokens: number; sourceRef: string } | null {
    const wanted = observation?.model ?? identity.effectiveModel ?? identity.reportedModel;
    if (wanted && this.catalog) {
      const match = this.catalog.find((model) => model.key === wanted);
      if (match?.maxContextTokens != null) {
        return { tokens: match.maxContextTokens, sourceRef: `${this.baseUrl.origin}/api/v1/models` };
      }
    }
    if (this.catalog) {
      const loaded = this.catalog.filter((model) => model.loadedInstanceCount > 0 && model.maxContextTokens !== null);
      if (loaded.length === 1) {
        return { tokens: loaded[0].maxContextTokens!, sourceRef: `${this.baseUrl.origin}/api/v1/models` };
      }
    }
    return this.loadedContextTokens !== null
      ? { tokens: this.loadedContextTokens, sourceRef: `${this.executable} ps --json` }
      : null;
  }

  private async refreshLoadedModels(diagnostics: string[]): Promise<void> {
    try {
      const result = await this.runner.run({
        executable: this.executable,
        args: ['ps', '--json'],
        cwd: this.canonicalRepoPath,
        expectedCanonicalCwd: this.canonicalRepoPath,
        timeoutMs: 10_000,
        maxStdoutBytes: 65_536,
        maxStderrBytes: 16_384,
      });
      if (result.exitCode !== 0 || result.timedOut || result.outputLimit) {
        diagnostics.push('LM Studio loaded-model probe failed');
        return;
      }
      const loaded = parseLmStudioLoadedModels(result.stdout.toString('utf8'));
      if (!loaded) {
        diagnostics.push('lms ps --json payload is not a model array');
        return;
      }
      if (loaded.length === 0) diagnostics.push('LM Studio has no model loaded');
      this.loadedContextTokens = loaded.find((model) => model.contextTokens !== null)?.contextTokens ?? null;
    } catch {
      diagnostics.push('LM Studio CLI unavailable for the loaded-model probe');
    }
  }
}

export function createLmStudioProviderAdapter(
  canonicalRepoPath: string,
  executable = 'lms',
  runner = new RuntimeProcessRunner(),
  now?: () => string,
  options: LmStudioAdapterOptions = {},
): LmStudioProviderAdapter {
  return new LmStudioProviderAdapter(canonicalRepoPath, executable, runner, now, options);
}
