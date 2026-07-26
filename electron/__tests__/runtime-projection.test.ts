import { describe, expect, it } from 'vitest';
import type { PipelineEventEnvelope, PipelineIdentity, RuntimeTelemetrySnapshot } from '../../types/pipeline';
import { RuntimeProjectionBuilder } from '../pipeline/runtime/runtime-projection';

function identity(over: Partial<PipelineIdentity> = {}): PipelineIdentity {
  return {
    repoId: 'repo-1',
    repoPath: 'C:/repo',
    changeId: null,
    taskId: null,
    runId: 'run-1',
    attemptId: 'attempt-1',
    sessionId: 'session-1',
    parentSessionId: null,
    agentId: 'agent-1',
    parentAgentId: null,
    orchestrationMode: 'direct',
    orchestratorRuntime: null,
    runtime: 'claude',
    provider: null,
    requestedModel: null,
    effectiveModel: null,
    reportedModel: null,
    role: 'builder',
    ...over,
  };
}

function event(
  kind: string,
  payload: unknown = {},
  over: Partial<PipelineEventEnvelope> = {},
): PipelineEventEnvelope {
  return {
    schemaVersion: '1.0',
    eventId: `${kind}-${Math.random().toString(36).slice(2, 8)}`,
    sequence: 1,
    sequenceScope: 'instance-1',
    emittedAt: null,
    observedAt: '2026-07-26T00:00:00.000Z',
    identity: identity(),
    kind,
    source: { adapterId: 'claude-code', instanceId: 'instance-1', transport: 'stream-json', protocolVersion: null },
    payload,
    provenance: 'runtime',
    evidenceStatus: 'verified',
    evidenceRefs: [],
    redactionVersion: '1',
    ...over,
  };
}

function builder() {
  return new RuntimeProjectionBuilder({
    repoId: 'repo-1',
    sessionId: 'session-1',
    runtime: 'claude',
    startedAt: '2026-07-26T00:00:00.000Z',
    controlCapabilities: ['cancel-run'],
  });
}

function unknownTelemetrySnapshot(over: Partial<RuntimeTelemetrySnapshot> = {}): RuntimeTelemetrySnapshot {
  const sample = (value: number | null) => ({
    metricId: 'm', identity: identity(), dimension: 'tokens' as const, metricName: 'tokens.input' as const,
    value, unit: 'tokens', classification: 'unknown' as const, periodStart: null, periodEnd: null,
    sourceRef: 'test', formula: null, pricingSource: null, pricingAsOf: null, dedupeScope: null,
    evidenceStatus: 'unknown' as const, evidenceRefs: [],
  });
  return {
    usage: {
      inputTokens: sample(null), outputTokens: sample(null), cacheReadTokens: sample(null),
      cacheWriteTokens: sample(null), reasoningTokens: sample(null),
    },
    context: {
      maxTokens: sample(null), currentTokens: sample(null),
      historicalTokens: sample(null), compactionCount: sample(null),
    },
    cost: { usd: sample(null), billingStatus: 'unknown' },
    reasoningVisibility: 'unavailable',
    ...over,
  };
}

describe('RuntimeProjectionBuilder', () => {
  it('starts with reasoning visibility unknown, not unavailable', () => {
    // Antes de que el runtime diga nada no sabemos si expone razonamiento.
    // `unavailable` sería una afirmación sobre el runtime que nadie hizo.
    expect(builder().snapshot().reasoningVisibility).toBe('unknown');
  });

  it('reports reasoning as emitted as soon as the stream carries one', () => {
    const projection = builder();
    projection.ingest(event('reasoning.delta', { reasoning: 'pensando', visibility: 'emitted' }));
    expect(projection.snapshot().reasoningVisibility).toBe('emitted');
  });

  it('keeps telemetry null while the run is still open', () => {
    const projection = builder();
    projection.ingest(event('agent.message', { text: 'hola' }));
    expect(projection.snapshot().telemetry).toBeNull();
  });

  it('never turns a missing metric into zero', () => {
    const projection = builder();
    projection.setTelemetry(unknownTelemetrySnapshot());
    const { telemetry } = projection.snapshot();
    expect(telemetry?.inputTokens).toBeNull();
    expect(telemetry?.costUsd).toBeNull();
    expect(telemetry?.contextMaxTokens).toBeNull();
  });

  it('routes each event kind to its channel', () => {
    const projection = builder();
    projection.ingest(event('agent.message', { text: 'hola' }));
    projection.ingest(event('reasoning.delta', { reasoning: 'pensando' }));
    projection.ingest(event('tool.started', { name: 'Read' }));
    projection.ingest(event('run.completed', { success: true }));
    expect(projection.snapshot().activity.map((entry) => entry.channel))
      .toEqual(['narrative', 'reasoning', 'tool', 'system']);
  });

  // Los normalizadores redactan las rutas antes de llegar acá, así que deducir
  // "archivo" del nombre de la herramienta afirmaría una escritura que nadie
  // observó: una llamada pedida no es un archivo tocado.
  it('never infers the file channel from a tool name', () => {
    const projection = builder();
    projection.ingest(event('tool.started', { name: 'Write' }));
    projection.ingest(event('tool.started', { name: 'Edit' }));
    expect(projection.snapshot().activity.every((entry) => entry.channel === 'tool')).toBe(true);
  });

  it('drops entries with no readable text instead of logging empty nodes', () => {
    const projection = builder();
    projection.ingest(event('tool.input.delta', { byteLength: 12 }));
    expect(projection.snapshot().activity).toHaveLength(0);
  });

  it('redacts secrets that reach the log through free text', () => {
    const projection = builder();
    projection.ingest(event('agent.message', { text: 'usa sk-abcdefghijklmnopqrstuvwxyz123456 para entrar' }));
    expect(projection.snapshot().activity[0].text).not.toContain('sk-abcdefghijklmnopqrstuvwxyz123456');
    expect(projection.snapshot().activity[0].text).toContain('[REDACTED_SECRET]');
  });

  it('carries the observed hierarchy without deriving one', () => {
    const projection = builder();
    projection.ingest(event('agent.started', {}, { identity: identity({ agentId: 'root' }) }));
    projection.ingest(event('agent.started', {}, { identity: identity({ agentId: 'child', parentAgentId: 'root' }) }));
    const agents = projection.snapshot().agents;
    expect(agents.map((agent) => [agent.agentId, agent.parentAgentId]))
      .toEqual([['root', null], ['child', 'root']]);
  });

  it('leaves an agent unknown when the stream stopped before it finished', () => {
    const projection = builder();
    projection.ingest(event('agent.started'));
    projection.close('2026-07-26T00:01:00.000Z', 'completed');
    // Dejamos de observarlo, que no es lo mismo que verlo terminar.
    expect(projection.snapshot().agents[0].state).toBe('unknown');
  });

  it('marks agents failed only when the process actually failed', () => {
    const projection = builder();
    projection.ingest(event('agent.started'));
    projection.close('2026-07-26T00:01:00.000Z', 'failed');
    expect(projection.snapshot().agents[0].state).toBe('failed');
  });

  it('closes an agent as done when it reported its own completion', () => {
    const projection = builder();
    projection.ingest(event('agent.started'));
    projection.ingest(event('agent.completed'));
    projection.close('2026-07-26T00:01:00.000Z', 'completed');
    expect(projection.snapshot().agents[0].state).toBe('done');
  });

  it('counts what the bounded buffer dropped instead of truncating silently', () => {
    const projection = builder();
    for (let index = 0; index < 2_050; index += 1) {
      projection.ingest(event('agent.message', { text: `delta ${index}` }));
    }
    const snapshot = projection.snapshot();
    expect(snapshot.activity).toHaveLength(2_000);
    expect(snapshot.droppedActivity).toBe(50);
  });

  it('records stream degradation as a diagnostic', () => {
    const projection = builder();
    projection.ingest(event('runtime.schema.degraded', { reason: 'record_not_object' }));
    expect(projection.snapshot().diagnostics[0]).toContain('runtime.schema.degraded');
  });
});
