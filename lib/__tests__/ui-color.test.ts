import { describe, it, expect } from 'vitest';
import { findOffPaletteDeclarations, compareBaseline } from '../ui-color';

describe('ui-color - findOffPaletteDeclarations', () => {
  it('color: #a3f185 (literal en CSS, debe detectarse)', () => {
    const violations = findOffPaletteDeclarations('.card { color: #a3f185; }', { isTsx: false });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('#a3f185');
    expect(violations[0].source).toBe('css');
  });

  it('color: var(--color-secondary) (token general, correcto, no debe detectarse)', () => {
    const violations = findOffPaletteDeclarations('.card { color: var(--color-secondary); }', { isTsx: false });
    expect(violations.length).toBe(0);
  });

  it('--os-green: #a3f185 (token propio local en CSS, SE DETECTA)', () => {
    const violations = findOffPaletteDeclarations('.dashboard { --os-green: #a3f185; }', { isTsx: false });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('#a3f185');
  });

  it('text-[#5ed8ff] en un .tsx (clase de utilidad literal, debe detectarse)', () => {
    const violations = findOffPaletteDeclarations('<div className="text-[#5ed8ff] px-2">Hola</div>', { isTsx: true });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('#5ed8ff');
    expect(violations[0].source).toBe('tailwind');
  });

  it('text-[var(--color-warning)] en un .tsx (token variable válido, no es literal, no debe detectarse)', () => {
    const violations = findOffPaletteDeclarations('<div className="text-[var(--color-warning)] px-2">Hola</div>', { isTsx: true });
    expect(violations.length).toBe(0);
  });

  it('un color dentro de un comentario en CSS o TSX (no debe detectarse)', () => {
    const content = '/* color: #a3f185; --os-cyan: #5ed8ff; */\n// text-[#5ed8ff]\n{/* text-[#5ed8ff] */}';
    const violations = findOffPaletteDeclarations(content, { isTsx: true });
    expect(violations.length).toBe(0);
  });

  it('background: rgba(2, 15, 30, 0.96) (functional color en CSS, debe detectarse)', () => {
    const violations = findOffPaletteDeclarations('.dashboard { background: rgba(2, 15, 30, 0.96); }', { isTsx: false });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('rgba(2, 15, 30, 0.96)');
    expect(violations[0].source).toBe('css');
  });

  it('bg-[#052900]/15 en un .tsx con modificador de opacidad (debe detectarse)', () => {
    const violations = findOffPaletteDeclarations('<span className="bg-[#052900]/15 text-sm">badge</span>', { isTsx: true });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('#052900');
    expect(violations[0].source).toBe('tailwind');
  });

  it('border-b-[#a3f185] y hover:border-[#5ed8ff]/55 en .tsx (deben detectarse)', () => {
    const violations = findOffPaletteDeclarations('<button className="border-b-[#a3f185] hover:border-[#5ed8ff]/55">btn</button>', { isTsx: true });
    expect(violations.length).toBe(2);
  });

  it('color: transparent, currentcolor, inherit, none (palabras clave permitidas, no deben detectarse)', () => {
    const violations = findOffPaletteDeclarations('.el { color: inherit; background: transparent; border-color: currentcolor; }', { isTsx: false });
    expect(violations.length).toBe(0);
  });

  it('var(--color-primary, #ff00ff) fallback literal en CSS o TSX (debe detectarse)', () => {
    const violations = findOffPaletteDeclarations('.input { color: var(--color-primary, #ff00ff); }', { isTsx: false });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('#ff00ff');
    expect(violations[0].source).toBe('fallback-literal');
  });

  it('var(--no-existe) referencia a token inexistente (debe detectarse como token colgado)', () => {
    const violations = findOffPaletteDeclarations('.box { color: var(--no-existe); }', { isTsx: false });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('--no-existe');
    expect(violations[0].source).toBe('dangling-token');
  });

  it('const GREEN = "#a3f185" en JS/TSX (constante de módulo, debe detectarse)', () => {
    const code = 'const GREEN = "#a3f185";\nexport function C() { return <div style={{ color: GREEN }}>x</div>; }';
    const violations = findOffPaletteDeclarations(code, { isTsx: true });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('#a3f185');
    expect(violations[0].source).toBe('js-constant-hex');
  });

  it('style={{ color: "#9BA1B0" }} en JSX (objeto de estilo literal, debe detectarse)', () => {
    const violations = findOffPaletteDeclarations('<div style={{ color: "#9BA1B0" }}>Loading…</div>', { isTsx: true });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('#9BA1B0');
    expect(violations[0].source).toBe('js-constant-hex');
  });

  it('S1 - border: "1px solid #ff00ff" en objeto de estilo JS (hex compuesto dentro de string, debe detectarse)', () => {
    const code = '<div style={{ border: "1px solid #ff00ff" }}>Content</div>';
    const violations = findOffPaletteDeclarations(code, { isTsx: true });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('#ff00ff');
    expect(violations[0].source).toBe('js-constant-hex');
  });

  it('S2 - className="shadow-[0_0_6px_rgba(255,0,255,0.5)]" en Tailwind (función de color en corchete compuesto, debe detectarse)', () => {
    const code = '<div className="shadow-[0_0_6px_rgba(255,0,255,0.5)]">Panel</div>';
    const violations = findOffPaletteDeclarations(code, { isTsx: true });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('rgba(255,0,255,0.5)');
    expect(violations[0].source).toBe('tailwind');
  });

  it('S3 - style={{ filter: "drop-shadow(0 0 1px rgba(255,0,255,0.4))" }} en JSX (función de color en filtro compuesto, debe detectarse)', () => {
    const code = '<div style={{ filter: "drop-shadow(0 0 1px rgba(255,0,255,0.4))" }}>Node</div>';
    const violations = findOffPaletteDeclarations(code, { isTsx: true });
    expect(violations.length).toBe(1);
    expect(violations[0].value).toBe('rgba(255,0,255,0.4)');
    expect(violations[0].source).toBe('js-constant-func');
  });
});

describe('ui-color - compareBaseline', () => {
  it('pasa cuando las violaciones coinciden exactamente con la línea de base plana', () => {
    const actual = {
      'components/panel.tsx': { '#5ed8ff': 2 },
    };
    const baseline = {
      'components/panel.tsx': { '#5ed8ff': 2 },
    };
    const result = compareBaseline(actual, baseline);
    expect(result.passed).toBe(true);
  });

  it('pasa cuando las violaciones coinciden con una línea de base particionada en pendiente y exento', () => {
    const actual = {
      'components/pipeline/panel.tsx': { '#5ed8ff': 2 },
      'components/ChronometricGraph.tsx': { '#a3f185': 5 },
    };
    const baseline = {
      exento: {
        'components/ChronometricGraph.tsx': { '#a3f185': 5 },
      },
      pendiente: {
        'components/pipeline/panel.tsx': { '#5ed8ff': 2 },
      },
    };
    const result = compareBaseline(actual, baseline);
    expect(result.passed).toBe(true);
  });

  it('falla ante una violación NUEVA en un archivo EXENTO (exento no es ignorado)', () => {
    const actual = {
      'components/ChronometricGraph.tsx': {
        '#a3f185': 5,
        '#ff00ff': 1,
      },
    };
    const baseline = {
      exento: {
        'components/ChronometricGraph.tsx': { '#a3f185': 5 },
      },
      pendiente: {},
    };
    const result = compareBaseline(actual, baseline);
    expect(result.passed).toBe(false);
    expect(result.newViolations.length).toBe(1);
    expect(result.newViolations[0].file).toBe('components/ChronometricGraph.tsx');
    expect(result.newViolations[0].value).toBe('#ff00ff');
    expect(result.errorMessage).toContain('CASO 1: VIOLACIÓN NUEVA NO DECLARADA');
  });

  it('falla cuando una violación declarada en la línea de base ya no aparece (poda pendiente)', () => {
    const actual = {
      'components/panel.tsx': { '#5ed8ff': 1 },
    };
    const baseline = {
      'components/panel.tsx': { '#5ed8ff': 2 },
    };
    const result = compareBaseline(actual, baseline);
    expect(result.passed).toBe(false);
    expect(result.missingViolations.length).toBe(1);
    expect(result.missingViolations[0].file).toBe('components/panel.tsx');
    expect(result.missingViolations[0].expected).toBe(2);
    expect(result.missingViolations[0].actual).toBe(1);
    expect(result.errorMessage).toContain('CASO 3: VIOLACIÓN EN LÍNEA DE BASE YA NO APARECE');
  });
});
