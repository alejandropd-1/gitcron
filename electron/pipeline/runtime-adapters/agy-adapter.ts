import type {
  PipelineEventEnvelope,
  RuntimeDescriptor,
  RuntimeDiscovery,
  RuntimeHealth,
  RuntimeSession,
  RuntimeTelemetrySnapshot,
} from '../../../types/pipeline';
import { unknownTelemetry } from './normalization';
import { RuntimeProcessRunner } from './process-runner';
import type { RuntimeAdapter } from './runtime-adapter';

/**
 * Versions whose CLI surface was audited for the wrapper contract: neither
 * exposes a --json / --output-format / --stream flag, so there is no structured
 * stream to normalize.
 */
const SUPPORTED_RUNTIME_VERSIONS = ['1.1.5', '1.1.6'] as const;
const BASELINE_RUNTIME_VERSION = '1.1.6';

export const AGY_WRAPPER_DESCRIPTOR: RuntimeDescriptor = {
  adapterId: 'agy-wrapper',
  runtime: 'agy',
  adapterKind: 'wrapper',
  transport: 'process-lifecycle',
  runtimeVersion: BASELINE_RUNTIME_VERSION,
  protocolVersion: null,
  capabilities: [
    {
      capabilityId: 'health',
      capabilityVersion: '1',
      availability: 'available',
      evidenceStatus: 'pending_fixture',
      targetScopes: ['repo'],
      constraints: ['process probe only; no structured event stream'],
      evidenceRefs: [],
    },
    {
      capabilityId: 'session.start',
      capabilityVersion: '1',
      availability: 'unknown',
      evidenceStatus: 'pending_fixture',
      targetScopes: ['repo', 'run'],
      constraints: ['wrapper lifecycle only; structured stream unavailable'],
      evidenceRefs: [],
    },
    {
      capabilityId: 'events.stream',
      capabilityVersion: '1',
      availability: 'unknown',
      evidenceStatus: 'pending_fixture',
      targetScopes: ['session'],
      constraints: ['no --json/--output-format/--stream flag; no regex on raw terminal text'],
      evidenceRefs: [],
    },
    {
      capabilityId: 'telemetry.snapshot',
      capabilityVersion: null,
      availability: 'unknown',
      evidenceStatus: 'pending_fixture',
      targetScopes: ['run', 'session'],
      constraints: ['usage and cost metrics unavailable without structured telemetry stream'],
      evidenceRefs: [],
    },
  ],
};

export class AgyWrapperRuntimeAdapter implements RuntimeAdapter {
  readonly descriptor = AGY_WRAPPER_DESCRIPTOR;

  constructor(
    private readonly canonicalRepoPath: string,
    private readonly executable: string = 'agy',
    private readonly runner = new RuntimeProcessRunner(),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

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
      const output = result.stdout.toString('utf8').trim();
      const installed = result.exitCode === 0 && !result.timedOut && !result.outputLimit;
      const detectedVersion = installed && output ? output : null;
      const withinBaseline = detectedVersion !== null
        && (SUPPORTED_RUNTIME_VERSIONS as readonly string[]).includes(detectedVersion);
      return {
        installed,
        executable: installed ? this.executable : null,
        runtimeVersion: detectedVersion,
        // `evidenceStatus` es informativo: `pending_fixture` porque el fixture
        // de referencia se retiró. No bloquea el listado del runtime.
        evidenceStatus: installed ? 'pending_fixture' : 'unknown',
        evidenceRefs: [],
        diagnostics: withinBaseline
          ? []
          : installed
            ? ['agy version outside the reference baseline set']
            : ['agy version probe failed'],
      };
    } catch (error) {
      // El motivo medido, no un genérico: si el binario existe pero la app no
      // lo resuelve, el diagnóstico debe decir por qué (camino encontrado,
      // forma no lanzable, PATH usado), no "no disponible".
      return {
        installed: false,
        executable: null,
        runtimeVersion: null,
        evidenceStatus: 'unknown',
        evidenceRefs: [],
        diagnostics: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  async health(): Promise<RuntimeHealth> {
    const startedAt = Date.now();
    const discovery = await this.discover();
    return {
      status: discovery.evidenceStatus === 'verified' ? 'healthy' : discovery.installed ? 'degraded' : 'unavailable',
      checkedAt: this.now(),
      latencyMs: Date.now() - startedAt,
      evidenceStatus: discovery.evidenceStatus,
      evidenceRefs: discovery.evidenceRefs,
      diagnostics: discovery.diagnostics,
    };
  }

  async *events(_session: RuntimeSession): AsyncIterable<PipelineEventEnvelope> {
    // Wrapper mode: no structured event stream emitted
    return;
  }

  async telemetry(session: RuntimeSession): Promise<RuntimeTelemetrySnapshot> {
    return unknownTelemetry(session.identity, 'agy-wrapper');
  }

  async shutdown(_session: RuntimeSession): Promise<void> {
    // No-op for lifecycle wrapper session without child handle
    return;
  }
}

export function createAgyWrapperRuntimeAdapter(
  canonicalRepoPath: string,
  executable = 'agy',
  runner = new RuntimeProcessRunner(),
  now?: () => string,
): AgyWrapperRuntimeAdapter {
  return new AgyWrapperRuntimeAdapter(canonicalRepoPath, executable, runner, now);
}
