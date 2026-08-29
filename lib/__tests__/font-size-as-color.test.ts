import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { stripCommentsPreservingLines } from '../ui-color';

/**
 * Invariante 22 — la comprobación declara en este archivo qué archivos recorre:
 *
 * 1. CSS COMPILADO: out/_next/static/css/ (todos los .css del directorio)
 *    Requiere `pnpm build` previo. Si no existe, el test falla a propósito:
 *    una comprobación que se salta sola no protege nada.
 * 2. FUENTE DE INTERFAZ: todos los .tsx bajo components/ y app/ (recursivo)
 *
 * Contexto (2026-08-27): `text-[var(--font-size-xs)]` sin el prefijo `length:`
 * no genera `font-size`, sino `color`: Tailwind no puede inferir si un
 * text-[...] con var() adentro es color o tamaño, y elige color. El detector
 * de escala (lib/visual-scale.ts) no lo ve porque `var(...)` no es literal;
 * el build compila porque la clase es válida. Esta comprobación mide lo que
 * el navegador recibe (CSS compilado) y ataja el error antes de compilar
 * (fuente .tsx).
 */

const COMPILED_CSS_DIR = path.join(process.cwd(), 'out', '_next', 'static', 'css');
const INTERFACE_TSX_DIRS = ['components', 'app'] as const;

// Un token de TAMAÑO aplicado como COLOR en el CSS compilado.
// El lookbehind descarta background-color, border-color, --color, etc.
const SIZE_AS_COLOR_REGEX = /(?<![\w-])color\s*:\s*var\(\s*--font-size-[a-z0-9-]+/gi;

// text-[var(--font-size-*)] sin el prefijo length: en la fuente de interfaz.
const BARE_SIZE_VAR_REGEX = /text-\[var\(\s*--font-size-/g;

function listTsxRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...listTsxRecursive(full));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      found.push(full);
    }
  }
  return found;
}

function findMatchesByLine(content: string, regex: RegExp): Array<{ line: number; snippet: string }> {
  const hits: Array<{ line: number; snippet: string }> = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(lines[i])) !== null) {
      hits.push({ line: i + 1, snippet: m[0] });
    }
  }
  return hits;
}

describe('font-size como color (invariante 22)', () => {
  const cssFiles = fs.existsSync(COMPILED_CSS_DIR)
    ? fs
        .readdirSync(COMPILED_CSS_DIR)
        .filter((name) => name.endsWith('.css'))
        .map((name) => path.join(COMPILED_CSS_DIR, name))
    : [];

  it('existe CSS compilado en out/_next/static/css (correr `pnpm build` primero)', () => {
    expect(
      cssFiles.length,
      'Falta el CSS compilado en out/_next/static/css: corre `pnpm build` antes de la suite. ' +
        'Esta comprobación no se salta: sin CSS compilado no puede verificar lo que el navegador recibe.'
    ).toBeGreaterThan(0);
  });

  it('ninguna regla del CSS compilado aplica un token --font-size-* como color', () => {
    const violations = cssFiles.flatMap((file) =>
      findMatchesByLine(fs.readFileSync(file, 'utf8'), SIZE_AS_COLOR_REGEX).map(
        (h) => `${path.relative(process.cwd(), file)}:${h.line} ${h.snippet}`
      )
    );
    expect(
      violations,
      `Reglas del CSS compilado que aplican un token de tamaño como color.
Causa típica: text-[var(--font-size-*)] sin el prefijo length: en la fuente.
Corregir a text-[length:var(--font-size-*)] y volver a correr pnpm build:
${violations.join('\n')}`
    ).toEqual([]);
  });

  it('los .tsx de interfaz no usan text-[var(--font-size-*)] sin el prefijo length:', () => {
    const violations = INTERFACE_TSX_DIRS.flatMap((dir) =>
      listTsxRecursive(path.join(process.cwd(), dir)).flatMap((file) =>
        findMatchesByLine(stripCommentsPreservingLines(fs.readFileSync(file, 'utf8')), BARE_SIZE_VAR_REGEX).map(
          (h) => `${path.relative(process.cwd(), file)}:${h.line} ${h.snippet}`
        )
      )
    );
    expect(
      violations,
      `text-[var(--font-size-*)] sin el prefijo length: — Tailwind lo compila como color, no como font-size.
Usar text-[length:var(--font-size-*)]:
${violations.join('\n')}`
    ).toEqual([]);
  });
});
