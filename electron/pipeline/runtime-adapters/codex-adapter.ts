import type { RuntimeDescriptor } from '../../../types/pipeline';
import { CodexStreamNormalizer } from './codex-normalizer';
import { RuntimeProcessRunner } from './process-runner';
import type { RuntimeStartRequest } from './runtime-adapter';
import { StructuredCliRuntimeAdapter } from './structured-cli-adapter';

const FIXTURE_REF = 'docs/pipeline/f03/fixtures/codex-0.143.0-exec.sanitized.jsonl';

export const CODEX_DESCRIPTOR: RuntimeDescriptor = {
  adapterId: 'codex-cli',
  runtime: 'codex',
  adapterKind: 'structured-cli',
  transport: 'exec-jsonl',
  runtimeVersion: '0.143.0',
  protocolVersion: null,
  capabilities: [
    { capabilityId: 'session.start', capabilityVersion: null, availability: 'degraded', evidenceStatus: 'verified', targetScopes: ['repo', 'run'], constraints: ['read-only sandbox in F03'], evidenceRefs: [FIXTURE_REF] },
    { capabilityId: 'events.stream', capabilityVersion: null, availability: 'available', evidenceStatus: 'verified', targetScopes: ['session'], constraints: ['bounded JSONL'], evidenceRefs: [FIXTURE_REF] },
    { capabilityId: 'telemetry.snapshot', capabilityVersion: null, availability: 'degraded', evidenceStatus: 'verified', targetScopes: ['run', 'session'], constraints: ['cost and context unavailable'], evidenceRefs: [FIXTURE_REF] },
    { capabilityId: 'session.resume', capabilityVersion: null, availability: 'unknown', evidenceStatus: 'pending_fixture', targetScopes: ['session'], constraints: ['ephemeral capture does not prove resume'], evidenceRefs: [] },
  ],
};

function buildCodexArgs(request: RuntimeStartRequest): string[] {
  const args = ['exec', '--ephemeral', '--sandbox', 'read-only', '--json'];
  if (request.requestedModel) args.push('--model', request.requestedModel);
  args.push('-');
  return args;
}

export function createCodexRuntimeAdapter(
  canonicalRepoPath: string,
  runner = new RuntimeProcessRunner(),
  now?: () => string,
): StructuredCliRuntimeAdapter {
  return new StructuredCliRuntimeAdapter(canonicalRepoPath, {
    descriptor: CODEX_DESCRIPTOR,
    executable: 'codex',
    versionArgs: ['--version'],
    matchesFixtureVersion: (output) => output === 'codex-cli 0.143.0',
    buildArgs: buildCodexArgs,
    createNormalizer: () => new CodexStreamNormalizer(),
    evidenceRef: FIXTURE_REF,
  }, runner, now);
}
