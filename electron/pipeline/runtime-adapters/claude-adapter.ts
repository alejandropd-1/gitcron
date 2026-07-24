import type { RuntimeDescriptor } from '../../../types/pipeline';
import { ClaudeStreamNormalizer } from './claude-normalizer';
import { RuntimeProcessRunner } from './process-runner';
import type { RuntimeStartRequest } from './runtime-adapter';
import { StructuredCliRuntimeAdapter } from './structured-cli-adapter';

const FIXTURE_REF = 'docs/pipeline/f03/fixtures/claude-2.1.206-stream.sanitized.jsonl';

export const CLAUDE_DESCRIPTOR: RuntimeDescriptor = {
  adapterId: 'claude-code',
  runtime: 'claude',
  adapterKind: 'native-stream',
  transport: 'stream-json',
  runtimeVersion: '2.1.206',
  protocolVersion: null,
  capabilities: [
    { capabilityId: 'session.start', capabilityVersion: null, availability: 'degraded', evidenceStatus: 'verified', targetScopes: ['repo', 'run'], constraints: ['read-only tools in F03'], evidenceRefs: [FIXTURE_REF] },
    { capabilityId: 'events.stream', capabilityVersion: null, availability: 'available', evidenceStatus: 'verified', targetScopes: ['session'], constraints: ['bounded JSONL'], evidenceRefs: [FIXTURE_REF] },
    { capabilityId: 'telemetry.snapshot', capabilityVersion: null, availability: 'available', evidenceStatus: 'verified', targetScopes: ['run', 'session'], constraints: ['billing semantics remain unknown'], evidenceRefs: [FIXTURE_REF] },
    { capabilityId: 'session.resume', capabilityVersion: null, availability: 'unknown', evidenceStatus: 'pending_fixture', targetScopes: ['session'], constraints: ['effect not tested'], evidenceRefs: [] },
  ],
};

function buildClaudeArgs(request: RuntimeStartRequest): string[] {
  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--permission-mode', 'manual',
    '--tools=Read,Grep,Glob',
    '--allowedTools=Read,Grep,Glob',
  ];
  if (request.requestedModel) args.push('--model', request.requestedModel);
  return args;
}

export function createClaudeRuntimeAdapter(
  canonicalRepoPath: string,
  runner = new RuntimeProcessRunner(),
  now?: () => string,
): StructuredCliRuntimeAdapter {
  return new StructuredCliRuntimeAdapter(canonicalRepoPath, {
    descriptor: CLAUDE_DESCRIPTOR,
    executable: 'claude',
    versionArgs: ['--version'],
    matchesFixtureVersion: (output) => output === '2.1.206 (Claude Code)',
    buildArgs: buildClaudeArgs,
    createNormalizer: () => new ClaudeStreamNormalizer(),
    evidenceRef: FIXTURE_REF,
  }, runner, now);
}
