import { describe, expect, it } from 'vitest';
import {
  buildAgentTree,
  groupActivity,
  hasUsableCostCoverage,
  runtimeDisplayName,
  type ActivityEntry,
  type AgentNode,
  type EconomyState,
} from '../pipeline-domain';
import { FIXTURES } from '../__fixtures__/pipeline-fixtures';

function agent(id: string, parent: string | null): AgentNode {
  return {
    agentId: id,
    parentAgentId: parent,
    runtime: 'claude',
    provider: null,
    model: null,
    role: null,
    state: 'unknown',
    elapsedMs: null,
    inputTokens: null,
    outputTokens: null,
  };
}

function entry(id: string, channel: ActivityEntry['channel'], agentId: string | null): ActivityEntry {
  return { entryId: id, channel, text: id, at: null, agentId };
}

function economy(overrides: Partial<EconomyState> = {}): EconomyState {
  return {
    tokens: { input: null, output: null, reasoning: null, cacheRead: null },
    costUsd: null,
    costBasis: 'unknown',
    costCoverage: { withCost: 0, total: 0 },
    contextMaxTokens: null,
    contextCurrentTokens: null,
    compactionCount: null,
    reasoningAvailable: false,
    ...overrides,
  };
}

describe('runtimeDisplayName', () => {
  it('maps known runtime ids to their commercial names', () => {
    expect(runtimeDisplayName('lmstudio')).toBe('LM Studio');
    expect(runtimeDisplayName('agy')).toBe('Antigravity');
  });

  it('falls back to the raw id rather than inventing a name', () => {
    expect(runtimeDisplayName('some-new-runtime')).toBe('some-new-runtime');
    expect(runtimeDisplayName(null)).toBeNull();
  });
});

describe('buildAgentTree', () => {
  it('nests children under their parent', () => {
    const tree = buildAgentTree([agent('root', null), agent('child', 'root')]);
    expect(tree).toHaveLength(1);
    expect(tree[0].children.map((n) => n.agentId)).toEqual(['child']);
  });

  it('promotes orphans to root instead of dropping them', () => {
    // Perder un agente de la vista sería peor que mostrarlo sin jerarquía.
    const tree = buildAgentTree([agent('orphan', 'missing-parent')]);
    expect(tree.map((n) => n.agentId)).toEqual(['orphan']);
  });

  it('never loses a node to a cycle', () => {
    const tree = buildAgentTree([agent('a', 'b'), agent('b', 'a')]);
    const seen = new Set<string>();
    const walk = (nodes: ReturnType<typeof buildAgentTree>) => {
      for (const node of nodes) {
        if (seen.has(node.agentId)) continue;
        seen.add(node.agentId);
        walk(node.children);
      }
    };
    walk(tree);
    expect([...seen].sort()).toEqual(['a', 'b']);
  });

  it('does not mutate the input nodes', () => {
    const input = [agent('root', null), agent('child', 'root')];
    buildAgentTree(input);
    expect(input.every((node) => !('children' in node))).toBe(true);
  });
});

describe('groupActivity', () => {
  it('collapses consecutive reasoning deltas so it does not render per token', () => {
    const groups = groupActivity([
      entry('r1', 'reasoning', 'a'),
      entry('r2', 'reasoning', 'a'),
      entry('r3', 'reasoning', 'a'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(3);
  });

  it('keeps separate bursts apart because order is information', () => {
    const groups = groupActivity([
      entry('r1', 'reasoning', 'a'),
      entry('t1', 'tool', 'a'),
      entry('r2', 'reasoning', 'a'),
    ]);
    expect(groups.map((g) => g.channel)).toEqual(['reasoning', 'tool', 'reasoning']);
  });

  it('does not merge deltas from different agents', () => {
    const groups = groupActivity([entry('r1', 'reasoning', 'a'), entry('r2', 'reasoning', 'b')]);
    expect(groups).toHaveLength(2);
  });

  it('never collapses narrative or file entries', () => {
    const groups = groupActivity([entry('n1', 'narrative', 'a'), entry('n2', 'narrative', 'a')]);
    expect(groups).toHaveLength(2);
  });
});

describe('hasUsableCostCoverage', () => {
  it('is false when only some agents reported cost', () => {
    // Un ranking en dinero compararía agentes medidos contra agentes sin medir.
    expect(hasUsableCostCoverage(economy({ costCoverage: { withCost: 2, total: 3 } }))).toBe(false);
  });

  it('is false when nothing reported cost', () => {
    expect(hasUsableCostCoverage(economy({ costCoverage: { withCost: 0, total: 3 } }))).toBe(false);
  });

  it('is true only with full coverage', () => {
    expect(hasUsableCostCoverage(economy({ costCoverage: { withCost: 3, total: 3 } }))).toBe(true);
  });
});

describe('fixtures for tanda 3', () => {
  it('models a runtime without telemetry as null tokens, never zero', () => {
    const scout = FIXTURES.running.agents.find((a) => a.runtime === 'agy');
    expect(scout?.inputTokens).toBeNull();
    expect(scout?.outputTokens).toBeNull();
  });

  it('exercises partial cost coverage', () => {
    expect(hasUsableCostCoverage(FIXTURES.running.economy)).toBe(false);
  });

  it('builds a two-level agent tree from the running fixture', () => {
    const tree = buildAgentTree(FIXTURES.running.agents);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(2);
  });
});
