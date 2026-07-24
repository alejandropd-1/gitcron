import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  PipelineEventEnvelope,
  RuntimeSessionRequest,
  RuntimeTelemetrySnapshot,
} from '../../types/pipeline';
import type { RuntimeAdapter } from '../pipeline/runtime-adapters';
import {
  validateRuntimeAdapterContract,
  validateRuntimeSessionRequest,
} from '../pipeline/runtime-adapters';

const request: RuntimeSessionRequest = {
  repoId: 'repo-fixture',
  canonicalRepoPath: 'C:\\fixture\\repo',
  changeId: 'change-fixture',
  taskId: '1.1',
  runId: 'run-fixture',
  attemptId: 'attempt-fixture',
  parentSessionId: null,
  parentAgentId: null,
  orchestrationMode: 'direct',
  orchestratorRuntime: 'codex',
  provider: null,
  requestedModel: null,
  role: 'builder',
};

function adapter(overrides: Partial<RuntimeAdapter> = {}): RuntimeAdapter {
  return {
    descriptor: {
      adapterId: 'fixture-adapter',
      runtime: 'codex',
      adapterKind: 'structured-cli',
      transport: 'jsonl',
      runtimeVersion: 'fixture-version',
      protocolVersion: null,
      capabilities: [
        {
          capabilityId: 'events.stream',
          capabilityVersion: null,
          availability: 'available',
          evidenceStatus: 'verified',
          targetScopes: ['session'],
          constraints: [],
          evidenceRefs: ['fixture.jsonl'],
        },
      ],
    },
    async discover() {
      return { installed: true, executable: 'fixture', runtimeVersion: 'fixture-version', evidenceStatus: 'verified', evidenceRefs: [], diagnostics: [] };
    },
    async health() {
      return { status: 'healthy', checkedAt: '2026-07-24T00:00:00.000Z', latencyMs: null, evidenceStatus: 'verified', evidenceRefs: [], diagnostics: [] };
    },
    async *events() {
      yield {} as PipelineEventEnvelope;
    },
    async telemetry() {
      return {} as RuntimeTelemetrySnapshot;
    },
    async shutdown() {},
    ...overrides,
  };
}

describe('runtime adapter TANDA 0 conformance', () => {
  it('accepts a coherent adapter contract', () => {
    expect(validateRuntimeAdapterContract(adapter())).toEqual([]);
  });

  it('rejects an available capability without its method', () => {
    const candidate = adapter({ events: undefined as never });
    expect(validateRuntimeAdapterContract(candidate)).toContain(
      'events.stream is available but events is not implemented',
    );
  });

  it('rejects available capabilities without verified evidence', () => {
    const candidate = adapter();
    candidate.descriptor.capabilities[0] = {
      ...candidate.descriptor.capabilities[0],
      evidenceStatus: 'pending_fixture',
    };
    expect(validateRuntimeAdapterContract(candidate)).toContain(
      'events.stream is available without verified evidence',
    );
  });

  it('rejects duplicate capability declarations', () => {
    const candidate = adapter();
    candidate.descriptor.capabilities.push(candidate.descriptor.capabilities[0]);
    expect(validateRuntimeAdapterContract(candidate)).toContain('duplicate capability: events.stream');
  });

  it('requires explicit per-repo run and attempt identity before start', () => {
    expect(validateRuntimeSessionRequest(request)).toEqual([]);
    expect(validateRuntimeSessionRequest({ ...request, repoId: '', runId: '' })).toEqual([
      'repoId is required',
      'runId is required',
    ]);
  });

  it('keeps methods optional when a capability is pending or unavailable', () => {
    const candidate = adapter();
    candidate.descriptor.capabilities = [
      {
        capabilityId: 'session.resume',
        capabilityVersion: null,
        availability: 'unknown',
        evidenceStatus: 'pending_fixture',
        targetScopes: ['session'],
        constraints: ['fixture required'],
        evidenceRefs: [],
      },
    ];
    expect(validateRuntimeAdapterContract(candidate)).toEqual([]);
  });

  it('versions one sanitized evidence row per supported direct adapter/provider', () => {
    const matrixPath = path.resolve('docs/pipeline/f03/runtime-adapter-matrix.json');
    const raw = fs.readFileSync(matrixPath, 'utf8');
    const matrix = JSON.parse(raw) as {
      schemaVersion: string;
      adapters: Array<{ adapterId: string; fixture: string | null; fixtureStatus: string }>;
    };

    expect(matrix.schemaVersion).toBe('1.0');
    expect(matrix.adapters.map(({ adapterId }) => adapterId)).toEqual([
      'claude-code',
      'codex-cli',
      'opencode',
      'agy-wrapper',
      'lmstudio-provider',
    ]);
    expect(raw).not.toMatch(/C:\\Users\\|authorization|bearer\s+|api[_-]?key|cookie/i);

    for (const entry of matrix.adapters) {
      if (entry.fixture) {
        expect(fs.existsSync(path.resolve(path.dirname(matrixPath), entry.fixture))).toBe(true);
      } else {
        expect(entry.fixtureStatus).toBe('pending_fixture');
      }
    }
  });

  it('keeps captured runtime fixtures parseable and free of local identity/secrets', () => {
    const fixtureDirectory = path.resolve('docs/pipeline/f03/fixtures');
    for (const filename of fs.readdirSync(fixtureDirectory)) {
      const raw = fs.readFileSync(path.join(fixtureDirectory, filename), 'utf8');
      expect(raw).not.toMatch(/C:\\Users\\|authorization|bearer\s+|api[_-]?key|cookie|sk-[A-Za-z0-9_-]+/i);
      if (filename.endsWith('.jsonl')) {
        for (const line of raw.split(/\r?\n/).filter(Boolean)) expect(() => JSON.parse(line)).not.toThrow();
      } else {
        expect(() => JSON.parse(raw)).not.toThrow();
      }
    }
  });
});
