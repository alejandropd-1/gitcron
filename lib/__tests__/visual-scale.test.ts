import { describe, it, expect } from 'vitest';
import { findOffScaleDeclarations, isOffScaleValue } from '../visual-scale';

describe('visual-scale - isOffScaleValue & findOffScaleDeclarations', () => {
  const cases: Array<{
    name: string;
    css: string;
    expectedViolations: number;
    expectedProperty?: string;
  }> = [
    {
      name: 'font-size: 0.625rem (literal, debe detectarse)',
      css: '.card { font-size: 0.625rem; }',
      expectedViolations: 1,
      expectedProperty: 'font-size',
    },
    {
      name: 'font-size: var(--font-size-sm) (correcto)',
      css: '.card { font-size: var(--font-size-sm); }',
      expectedViolations: 0,
    },
    {
      name: 'padding: 4px 8px (literal, debe detectarse)',
      css: '.card { padding: 4px 8px; }',
      expectedViolations: 1,
      expectedProperty: 'padding',
    },
    {
      name: 'padding: var(--space-2) var(--space-3) (correcto)',
      css: '.card { padding: var(--space-2) var(--space-3); }',
      expectedViolations: 0,
    },
    {
      name: 'declaración dentro de un comentario (NO debe detectarse)',
      css: '.card {\n  /* font-size: 0.625rem; padding: 4px 8px; */\n  color: white;\n}',
      expectedViolations: 0,
    },
    {
      name: 'padding y margin con valor 0 y auto (correcto)',
      css: '.card { padding: 0; margin: 0 auto; gap: 0; }',
      expectedViolations: 0,
    },
    {
      name: 'gap: 12px literal (debe detectarse)',
      css: '.grid { gap: 12px; }',
      expectedViolations: 1,
      expectedProperty: 'gap',
    },
    {
      name: 'margin-block: var(--space-4) (correcto)',
      css: '.section { margin-block: var(--space-4); }',
      expectedViolations: 0,
    },
    {
      name: 'border-radius: 6px (literal, debe detectarse)',
      css: '.box { border-radius: 6px; }',
      expectedViolations: 1,
      expectedProperty: 'border-radius',
    },
    {
      name: 'border-radius: var(--radius-md) (correcto)',
      css: '.box { border-radius: var(--radius-md); }',
      expectedViolations: 0,
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const violations = findOffScaleDeclarations(c.css);
      expect(violations.length).toBe(c.expectedViolations);
      if (c.expectedProperty && violations.length > 0) {
        expect(violations[0].property).toBe(c.expectedProperty);
      }
    });
  }
});
