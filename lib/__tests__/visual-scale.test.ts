import { describe, it, expect } from 'vitest';
import { findOffScaleDeclarations, isOffScaleValue } from '../visual-scale';

describe('visual-scale - isOffScaleValue & findOffScaleDeclarations', () => {
  const cases: Array<{
    name: string;
    content: string;
    isTsx?: boolean;
    expectedViolations: number;
    expectedProperty?: string;
  }> = [
    {
      name: 'font-size: 0.625rem (literal, debe detectarse)',
      content: '.card { font-size: 0.625rem; }',
      isTsx: false,
      expectedViolations: 1,
      expectedProperty: 'font-size',
    },
    {
      name: 'font-size: var(--font-size-sm) (correcto)',
      content: '.card { font-size: var(--font-size-sm); }',
      isTsx: false,
      expectedViolations: 0,
    },
    {
      name: 'padding: 4px 8px (literal, debe detectarse)',
      content: '.card { padding: 4px 8px; }',
      isTsx: false,
      expectedViolations: 1,
      expectedProperty: 'padding',
    },
    {
      name: 'padding: var(--space-2) var(--space-3) (correcto)',
      content: '.card { padding: var(--space-2) var(--space-3); }',
      isTsx: false,
      expectedViolations: 0,
    },
    {
      name: 'declaración dentro de un comentario (NO debe detectarse)',
      content: '.card {\n  /* font-size: 0.625rem; padding: 4px 8px; */\n  color: white;\n}',
      isTsx: false,
      expectedViolations: 0,
    },
    {
      name: 'padding y margin con valor 0 y auto (correcto)',
      content: '.card { padding: 0; margin: 0 auto; gap: 0; }',
      isTsx: false,
      expectedViolations: 0,
    },
    {
      name: 'gap: 12px literal (debe detectarse)',
      content: '.grid { gap: 12px; }',
      isTsx: false,
      expectedViolations: 1,
      expectedProperty: 'gap',
    },
    {
      name: 'margin-block: var(--space-4) (correcto)',
      content: '.section { margin-block: var(--space-4); }',
      isTsx: false,
      expectedViolations: 0,
    },
    {
      name: 'border-radius: 6px (literal, debe detectarse)',
      content: '.box { border-radius: 6px; }',
      isTsx: false,
      expectedViolations: 1,
      expectedProperty: 'border-radius',
    },
    {
      name: 'border-radius: var(--radius-md) (correcto)',
      content: '.box { border-radius: var(--radius-md); }',
      isTsx: false,
      expectedViolations: 0,
    },
    {
      name: 'text-[9px] en un componente .tsx (literal fuera de escala, debe detectarse)',
      content: '<span className="text-[9px] font-mono">12:00</span>',
      isTsx: true,
      expectedViolations: 1,
      expectedProperty: 'text',
    },
    {
      name: 'text-[10px] y gap-[12px] en un componente .tsx (deben detectarse)',
      content: '<div className="text-[10px] gap-[12px]">Texto</div>',
      isTsx: true,
      expectedViolations: 2,
    },
    {
      name: 'text-[var(--font-size-xs)] en un componente .tsx (correcto, no debe detectarse)',
      content: '<div className="text-[var(--font-size-xs)] p-2">Texto</div>',
      isTsx: true,
      expectedViolations: 0,
    },
    {
      name: 'text-[9px] dentro de comentario en TSX (no debe detectarse)',
      content: '{/* <div className="text-[9px]">comentado</div> */}\n// text-[10px]',
      isTsx: true,
      expectedViolations: 0,
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const violations = findOffScaleDeclarations(c.content, { isTsx: c.isTsx });
      expect(violations.length).toBe(c.expectedViolations);
      if (c.expectedProperty && violations.length > 0) {
        expect(violations[0].property).toBe(c.expectedProperty);
      }
    });
  }
});
