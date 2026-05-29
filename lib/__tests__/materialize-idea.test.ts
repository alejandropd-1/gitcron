import { describe, it, expect } from 'vitest';
import {
  slugify,
  flightLevelFor,
  branchNameFor,
  tagNameFor,
  buildMaterializationPlan,
} from '../materialize-idea';
import type { MaterializeIdeaInput } from '@/types/temporal-agent';

describe('slugify', () => {
  it('lowercases, hyphenates, and strips unsafe chars', () => {
    expect(slugify('Extract IPC layer into a typed contract module')).toBe(
      'extract-ipc-layer-into-a-typed-contract-module',
    );
  });
  it('strips accents and trims hyphens', () => {
    expect(slugify('  Café & Migración!! ')).toBe('cafe-migracion');
  });
  it('falls back to "idea" when empty', () => {
    expect(slugify('!!!')).toBe('idea');
  });
  it('bounds length', () => {
    expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(48);
  });
});

describe('flightLevelFor', () => {
  it('breakthrough -> creative', () => {
    expect(flightLevelFor('breakthrough', 0.9)).toBe('creative');
  });
  it('trend -> high', () => {
    expect(flightLevelFor('trend', 0.5)).toBe('high');
  });
  it('high-confidence improvement -> conservative', () => {
    expect(flightLevelFor('improvement', 0.82)).toBe('conservative');
  });
  it('low-confidence improvement -> grounded', () => {
    expect(flightLevelFor('improvement', 0.6)).toBe('grounded');
  });
});

describe('plan builders', () => {
  const idea: MaterializeIdeaInput = {
    id: 'mock-1',
    title: 'Extract IPC layer into a typed contract module',
    rationale: 'Recent commits keep touching main.ts.',
    type: 'improvement',
    confidence: 0.82,
  };

  it('branch + tag names', () => {
    expect(branchNameFor(idea.title)).toBe('imagined/extract-ipc-layer-into-a-typed-contract-module');
    expect(tagNameFor('conservative')).toBe('flight/conservative');
  });

  it('buildMaterializationPlan is deterministic and self-consistent', () => {
    const plan = buildMaterializationPlan(idea);
    expect(plan.branchName).toBe('imagined/extract-ipc-layer-into-a-typed-contract-module');
    expect(plan.flightLevel).toBe('conservative');
    expect(plan.tagName).toBe('flight/conservative');
    expect(plan.commitMessage).toBe('idea: Extract IPC layer into a typed contract module');
    // IDEA.md carries title, rationale, flight level, confidence.
    expect(plan.ideaMarkdown).toContain('# Extract IPC layer into a typed contract module');
    expect(plan.ideaMarkdown).toContain('Recent commits keep touching main.ts.');
    expect(plan.ideaMarkdown).toContain('**Flight level:** conservative');
    expect(plan.ideaMarkdown).toContain('**Agent confidence:** 82%');
  });
});
