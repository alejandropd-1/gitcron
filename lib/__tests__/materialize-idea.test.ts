import { describe, it, expect } from 'vitest';
import {
  slugify,
  branchSlugFromTitle,
  codeFenceFor,
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

describe('branchSlugFromTitle', () => {
  it('lowercases, strips accents, and removes EN/ES filler words', () => {
    expect(branchSlugFromTitle('Café y una canción con el artista del año')).toBe(
      'cafe-cancion-artista-ano',
    );
    expect(branchSlugFromTitle('The extract of a prompt in the system for testing')).toBe(
      'extract-prompt-system-testing',
    );
  });

  it('bounds to first 3-4 meaningful words and ~40 characters on word boundary', () => {
    // Meaningful words: ['heavy', 'refactoring', 'database', 'connection', 'pooling', 'logic']
    // Count 4: 'heavy-refactoring-database-connection' -> 37 chars <= 40 -> perfect!
    expect(branchSlugFromTitle('Heavy refactoring of the database connection pooling logic')).toBe(
      'heavy-refactoring-database-connection',
    );

    // If 4 words exceed 40 chars, it takes 3 words:
    // Words: ['supercalifragilisticexpialidocious', 'refactoring', 'database', 'system']
    // Count 2: 'supercalifragilisticexpialidocious-refactoring' -> 46 chars > 40
    // Count 1: 'supercalifragilisticexpialidocious' -> 34 chars <= 40 -> perfect!
    expect(branchSlugFromTitle('supercalifragilisticexpialidocious refactoring of database system')).toBe(
      'supercalifragilisticexpialidocious',
    );
  });

  it('truncates a single extremely long word if it alone exceeds 40 characters', () => {
    const longWord = 'a'.repeat(50);
    expect(branchSlugFromTitle(longWord)).toBe('a'.repeat(40));
  });

  it('falls back to raw words if all words are fillers', () => {
    expect(branchSlugFromTitle('the a an of')).toBe('the-a-an-of');
  });

  it('falls back to "idea" when empty', () => {
    expect(branchSlugFromTitle('!!!')).toBe('idea');
    expect(branchSlugFromTitle('')).toBe('idea');
  });
});

describe('codeFenceFor', () => {
  it('returns triple backticks for content without backticks or empty content', () => {
    expect(codeFenceFor('hello world')).toBe('```');
    expect(codeFenceFor('')).toBe('```');
  });

  it('returns minimum 3 backticks even if there is a shorter run', () => {
    expect(codeFenceFor('hello `world` and ``test``')).toBe('```');
  });

  it('uses longest run plus one backtick when triple backticks are in content', () => {
    expect(codeFenceFor('some ``` code block')).toBe('````');
  });

  it('uses longest run plus one backtick when quadruple backticks are in content', () => {
    expect(codeFenceFor('some ```` code block')).toBe('`````');
  });

  it('handles backticks at the start or end correctly', () => {
    expect(codeFenceFor('```start and end```')).toBe('````');
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
    // Meaningful words: ['extract', 'ipc', 'layer', 'into', 'typed', 'contract', 'module']
    // First 4: 'extract-ipc-layer-into'
    expect(branchNameFor(idea.title)).toBe('imagined/extract-ipc-layer-into');
    expect(tagNameFor('conservative')).toBe('flight/conservative');
  });

  it('branchNameFor deduplicates correctly when existingBranches are provided', () => {
    const existing = [
      'imagined/extract-ipc-layer-into',
      'imagined/extract-ipc-layer-into-2',
    ];
    expect(branchNameFor(idea.title, existing)).toBe('imagined/extract-ipc-layer-into-3');
  });

  it('tagNameFor deduplicates correctly when existingTags are provided', () => {
    const existing = [
      'flight/conservative',
      'flight/conservative-2',
    ];
    expect(tagNameFor('conservative', existing)).toBe('flight/conservative-3');
  });

  it('buildMaterializationPlan is deterministic and self-consistent', () => {
    const plan = buildMaterializationPlan(idea);
    expect(plan.branchName).toBe('imagined/extract-ipc-layer-into');
    expect(plan.flightLevel).toBe('conservative');
    expect(plan.tagName).toBe('flight/conservative');
    expect(plan.commitMessage).toBe('idea: Extract IPC layer into a typed contract module');
    // IDEA.md carries title, rationale, flight level, confidence.
    expect(plan.ideaMarkdown).toContain('# Extract IPC layer into a typed contract module');
    expect(plan.ideaMarkdown).toContain('Recent commits keep touching main.ts.');
    expect(plan.ideaMarkdown).toContain('**Flight level:** conservative');
    expect(plan.ideaMarkdown).toContain('**Agent confidence:** 82%');
  });

  it('buildMaterializationPlan uses secure code fence for agentPrompt', () => {
    const customIdea: MaterializeIdeaInput = {
      ...idea,
      agentPrompt: 'Here is a ``` code block inside prompt ```.',
    };
    const plan = buildMaterializationPlan(customIdea);
    expect(plan.ideaMarkdown).toContain('````text');
    expect(plan.ideaMarkdown).toContain('Here is a ``` code block inside prompt ```.');
    expect(plan.ideaMarkdown).toContain('````');
  });
});
