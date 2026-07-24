import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PipelineIdentity } from '../../types/pipeline';
import {
  CLAUDE_DESCRIPTOR,
  CODEX_DESCRIPTOR,
  ClaudeStreamNormalizer,
  CodexStreamNormalizer,
  validateRuntimeAdapterContract,
  createClaudeRuntimeAdapter,
  createCodexRuntimeAdapter,
} from '../pipeline/runtime-adapters';

const identity = (runtime: PipelineIdentity['runtime']): PipelineIdentity => ({
  repoId: 'repo-fixture',
  repoPath: 'C:\\fixture\\repo',
  changeId: 'pipeline-fase-03-runtime-adapters',
  taskId: '2.6',
  runId: `run-${runtime}`,
  attemptId: 'attempt-1',
  sessionId: 'session-local',
  parentSessionId: null,
  agentId: 'agent-fixture',
  parentAgentId: null,
  orchestrationMode: 'direct',
  orchestratorRuntime: 'codex',
  runtime,
  provider: null,
  requestedModel: null,
  effectiveModel: null,
  reportedModel: null,
  role: 'builder',
});

function fixtureRecords(name: string): unknown[] {
  return fs.readFileSync(path.resolve('docs/pipeline/f03/fixtures', name), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe('ClaudeStreamNormalizer', () => {
  it('normalizes verified events and telemetry without inventing billing semantics', () => {
    const runtimeIdentity = identity('claude');
    const normalizer = new ClaudeStreamNormalizer();
    const events = fixtureRecords('claude-2.1.206-stream.sanitized.jsonl').flatMap((record, index) => normalizer.normalize(record, {
      identity: runtimeIdentity,
      descriptor: CLAUDE_DESCRIPTOR,
      instanceId: 'claude-fixture',
      observedAt: '2026-07-24T00:00:00.000Z',
      sequence: index + 1,
      sourceEventId: null,
    }));
    const telemetry = normalizer.telemetry(runtimeIdentity);

    expect(events.map(({ kind }) => kind)).toEqual(expect.arrayContaining([
      'session.started',
      'reasoning.delta',
      'tool.started',
      'tool.completed',
      'agent.message',
      'run.completed',
    ]));
    expect(runtimeIdentity.reportedModel).toBe('claude-sonnet-5');
    expect(telemetry.usage.inputTokens.value).toBe(1280);
    expect(telemetry.usage.cacheWriteTokens.value).toBe(163478);
    expect(telemetry.cost.usd.value).toBeCloseTo(0.988127);
    expect(telemetry.cost.billingStatus).toBe('reported');
    expect(telemetry.context.maxTokens.value).toBe(1000000);
    expect(telemetry.reasoningVisibility).toBe('emitted');
  });
});

describe('CodexStreamNormalizer', () => {
  it('keeps cost/context unknown while retaining reported usage and tool failure', () => {
    const runtimeIdentity = identity('codex');
    const normalizer = new CodexStreamNormalizer();
    const events = fixtureRecords('codex-0.143.0-exec.sanitized.jsonl').flatMap((record, index) => normalizer.normalize(record, {
      identity: runtimeIdentity,
      descriptor: CODEX_DESCRIPTOR,
      instanceId: 'codex-fixture',
      observedAt: '2026-07-24T00:00:00.000Z',
      sequence: index + 1,
      sourceEventId: null,
    }));
    const telemetry = normalizer.telemetry(runtimeIdentity);

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'tool.completed', payload: expect.objectContaining({ status: 'failed', exitCode: -1 }) }),
      expect.objectContaining({ kind: 'runtime.error' }),
      expect.objectContaining({ kind: 'run.completed' }),
    ]));
    expect(new Set(events.map(({ eventId }) => eventId)).size).toBe(events.length);
    expect(telemetry.usage.inputTokens.value).toBe(41220);
    expect(telemetry.usage.reasoningTokens.value).toBe(141);
    expect(telemetry.cost.usd.value).toBeNull();
    expect(telemetry.cost.usd.classification).toBe('unknown');
    expect(telemetry.context.maxTokens.value).toBeNull();
    expect(telemetry.reasoningVisibility).toBe('unavailable');
    expect(runtimeIdentity.reportedModel).toBeNull();
  });
});

describe('Claude/Codex adapter contracts', () => {
  it('match their implemented methods and verified evidence', () => {
    expect(validateRuntimeAdapterContract(createClaudeRuntimeAdapter(process.cwd()))).toEqual([]);
    expect(validateRuntimeAdapterContract(createCodexRuntimeAdapter(process.cwd()))).toEqual([]);
  });
});
