import { stripCommentsPreservingLines } from './ui-color';

export interface CssSyntaxViolation {
  file?: string;
  line: number;
  property: string;
  value: string;
  raw: string;
  error: string;
}

/**
 * Analiza una hoja de estilos CSS y detecta declaraciones de propiedades con
 * paréntesis desbalanceados en sus valores (e.g. `var(--foo))` o `calc(100% - 2px`).
 */
export function findUnbalancedDeclarations(cssContent: string): CssSyntaxViolation[] {
  const clean = stripCommentsPreservingLines(cssContent);
  const lines = clean.split('\n');
  const violations: CssSyntaxViolation[] = [];

  let blockDepth = 0;
  let inString: "'" | '"' | null = null;
  let currentDecl = '';
  let declStartLine = 1;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];

    for (let charIdx = 0; charIdx < rawLine.length; charIdx++) {
      const ch = rawLine[charIdx];

      // Manejo de cadenas de texto dentro de CSS
      if (inString) {
        if (ch === inString && rawLine[charIdx - 1] !== '\\') {
          inString = null;
        }
        currentDecl += ch;
        continue;
      }

      if (ch === "'" || ch === '"') {
        inString = ch;
        currentDecl += ch;
        continue;
      }

      if (ch === '{') {
        blockDepth++;
        currentDecl = '';
        continue;
      }

      if (ch === '}') {
        if (blockDepth > 0 && currentDecl.trim().length > 0) {
          checkDeclaration(currentDecl, declStartLine, rawLine);
          currentDecl = '';
        }
        blockDepth = Math.max(0, blockDepth - 1);
        continue;
      }

      if (blockDepth > 0) {
        if (currentDecl.trim().length === 0 && !/\s/.test(ch)) {
          declStartLine = lineIdx + 1;
        }

        if (ch === ';') {
          if (currentDecl.trim().length > 0) {
            checkDeclaration(currentDecl, declStartLine, rawLine);
          }
          currentDecl = '';
        } else {
          currentDecl += ch;
        }
      }
    }

    if (currentDecl.length > 0) {
      currentDecl += '\n';
    }
  }

  function checkDeclaration(declText: string, line: number, raw: string) {
    const colonIdx = declText.indexOf(':');
    if (colonIdx === -1) return;

    const prop = declText.slice(0, colonIdx).trim();
    const val = declText.slice(colonIdx + 1).trim();

    // Validar que la propiedad sea un identificador CSS válido o custom property
    if (!/^[a-zA-Z0-9_-]+$/.test(prop)) return;

    let openParen = 0;
    let closeParen = 0;
    let quote: "'" | '"' | null = null;

    for (let i = 0; i < val.length; i++) {
      const c = val[i];
      if (quote) {
        if (c === quote && val[i - 1] !== '\\') quote = null;
      } else if (c === "'" || c === '"') {
        quote = c;
      } else if (c === '(') {
        openParen++;
      } else if (c === ')') {
        closeParen++;
      }
    }

    if (openParen !== closeParen) {
      violations.push({
        line,
        property: prop,
        value: val,
        raw: raw.trim(),
        error: `Paréntesis desbalanceados: ${openParen} apertura '(' vs ${closeParen} cierre ')'`,
      });
    }
  }

  return violations;
}
