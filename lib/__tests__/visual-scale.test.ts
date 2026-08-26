import { describe, it, expect } from 'vitest';
import { findOffScaleDeclarations, isOffScaleValue } from '../visual-scale';

describe('visual-scale - isOffScaleValue & findOffScaleDeclarations', () => {
  const cases: Array<{
    name: string;
    content: string;
    isTsx?: boolean;
    expectedViolations: number;
    expectedProperty?: string;
    expectedValue?: string;
  }> = [
    {
      name: 'font-size: 0.625rem (literal, debe detectarse)',
      content: '.card { font-size: 0.625rem; }',
      isTsx: false,
      expectedViolations: 1,
      expectedProperty: 'font-size',
      expectedValue: '0.625rem',
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
      expectedValue: '4px 8px',
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
      expectedValue: '12px',
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
      expectedValue: '6px',
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
      expectedValue: '9px',
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
    {
      name: 'fontSize: 11 en style object de TSX (debe detectarse como font-size: 11px)',
      content: '<span style={{ fontSize: 11 }}>Texto</span>',
      isTsx: true,
      expectedViolations: 1,
      expectedProperty: 'font-size',
      expectedValue: '11px',
    },
    {
      name: 'fontSize: "0.64rem" en style object de TSX (debe detectarse como font-size: 0.64rem)',
      content: '<p style={{ fontSize: "0.64rem" }}>Texto</p>',
      isTsx: true,
      expectedViolations: 1,
      expectedProperty: 'font-size',
      expectedValue: '0.64rem',
    },
    {
      name: 'padding: 7 y borderRadius: 4 en style object de TSX (deben detectarse como 7px y 4px)',
      content: '<div style={{ padding: 7, borderRadius: 4 }}>Caja</div>',
      isTsx: true,
      expectedViolations: 2,
    },
    {
      name: 'style con tokens CSS var(--font-size-xs) y var(--radius-sm) (correcto)',
      content: '<div style={{ fontSize: "var(--font-size-xs)", borderRadius: "var(--radius-sm)" }}>Caja</div>',
      isTsx: true,
      expectedViolations: 0,
    },
    {
      name: 'style con valores 0 y keywords auto/inherit (correcto)',
      content: '<div style={{ padding: 0, margin: "0 auto", gap: 0 }}>Caja</div>',
      isTsx: true,
      expectedViolations: 0,
    },
    {
      name: 'anotaciones de tipo TypeScript fontSize: number (no debe detectarse como violación)',
      content: 'interface StyleProps {\n  fontSize: number;\n  padding?: string;\n}',
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
      if (c.expectedValue && violations.length > 0) {
        expect(violations[0].value).toBe(c.expectedValue);
      }
    });
  }
});
