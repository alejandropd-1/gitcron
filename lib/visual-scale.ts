import { stripCommentsPreservingLines, compareBaseline } from './ui-color';

export interface OffScaleDeclaration {
  line: number;
  property: string;
  value: string;
  raw: string;
  source?: 'css' | 'tailwind' | 'js-style';
}

export const JS_TO_CSS_PROPERTIES: Record<string, string> = {
  fontSize: 'font-size',
  padding: 'padding',
  paddingTop: 'padding-top',
  paddingRight: 'padding-right',
  paddingBottom: 'padding-bottom',
  paddingLeft: 'padding-left',
  paddingInline: 'padding-inline',
  paddingInlineStart: 'padding-inline-start',
  paddingInlineEnd: 'padding-inline-end',
  paddingBlock: 'padding-block',
  paddingBlockStart: 'padding-block-start',
  paddingBlockEnd: 'padding-block-end',
  margin: 'margin',
  marginTop: 'margin-top',
  marginRight: 'margin-right',
  marginBottom: 'margin-bottom',
  marginLeft: 'margin-left',
  marginInline: 'margin-inline',
  marginInlineStart: 'margin-inline-start',
  marginInlineEnd: 'margin-inline-end',
  marginBlock: 'margin-block',
  marginBlockStart: 'margin-block-start',
  marginBlockEnd: 'margin-block-end',
  gap: 'gap',
  rowGap: 'row-gap',
  columnGap: 'column-gap',
  borderRadius: 'border-radius',
  borderTopLeftRadius: 'border-top-left-radius',
  borderTopRightRadius: 'border-top-right-radius',
  borderBottomLeftRadius: 'border-bottom-left-radius',
  borderBottomRightRadius: 'border-bottom-right-radius',
};

const CHECKED_PROPERTIES = new Set(Object.values(JS_TO_CSS_PROPERTIES));

const ALLOWED_KEYWORDS = new Set([
  '0',
  '0px',
  '0rem',
  '0em',
  '0%',
  '50%',
  'auto',
  'inherit',
  'initial',
  'unset',
  'none',
  'normal',
  'transparent',
  'currentcolor',
]);

const TS_TYPE_KEYWORDS = new Set([
  'number',
  'string',
  'boolean',
  'any',
  'unknown',
  'never',
  'void',
  'null',
  'undefined',
  'symbol',
  'bignumber',
]);

/**
 * Checks whether a single value token is valid (is a CSS variable reference or an allowed keyword/zero).
 */
function isValidValueToken(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return true;
  if (ALLOWED_KEYWORDS.has(trimmed.toLowerCase())) return true;
  if (/^var\(--[a-zA-Z0-9_-]+(?:\s*,\s*[^)]+)?\)$/.test(trimmed)) return true;
  if (trimmed.startsWith('calc(') && trimmed.endsWith(')') && trimmed.includes('var(--')) return true;
  return false;
}

/**
 * Checks whether a CSS property value is completely expressed via tokens or valid keywords.
 */
export function isOffScaleValue(property: string, value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  // Custom properties definitions (--var: ...) are not subject to checks here
  if (property.startsWith('--')) return false;

  // For font shorthand, check if it contains a literal size
  if (property === 'font') {
    // If it's a keyword like inherit/initial
    if (ALLOWED_KEYWORDS.has(trimmed.toLowerCase())) return false;
    // If it contains a literal font size like 0.72rem, 12px, 1.2em without var()
    if (/(?:^|\s)(?:0?\.[0-9]+[a-z%]+|[0-9]+(?:px|rem|em|pt|%))(?:\/[0-9.]+(?:[a-z%]+)?)?(?:\s|$)/.test(trimmed)) {
      return true;
    }
    return false;
  }

  // If the whole value is a single var(--...) or allowed keyword
  if (isValidValueToken(trimmed)) return false;

  // Split multi-value shorthand (e.g. padding: var(--space-2) var(--space-3) or padding: 4px 8px)
  const tokens: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;

    if (char === ' ' && parenDepth === 0) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }

  if (tokens.length === 0) return false;

  // If all tokens are valid, it's not off-scale
  const allValid = tokens.every((t) => isValidValueToken(t));
  return !allValid;
}

const TW_SCALE_REGEX = /(?:[a-zA-Z0-9_\-\:\[\]\.]+:)?(text|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|rounded|rounded-[trblse])-\[([^\]]+)\](?:\/[^\s"'`]+)?/g;
const SIZE_OR_LENGTH_REGEX = /^(?:-?[0-9]*\.?[0-9]+(?:px|rem|em|pt|vh|vw|%)|-?[0-9]+)$/;

const JS_PROP_NAMES = Object.keys(JS_TO_CSS_PROPERTIES).join('|');
const JS_STYLE_PROP_REGEX = new RegExp(`\\b(${JS_PROP_NAMES})\\s*:\\s*([^,;{}]+)`, 'g');

/**
 * Pure function that analyzes a CSS stylesheet or TSX component string and returns all declarations
 * of font-size, padding, margin, gap, and border-radius that do not use design system tokens.
 *
 * Detects:
 * 1. CSS property declarations outside @theme.
 * 2. Tailwind utility classes with bracketed arbitrary values (`text-[10px]`, `p-[1px]`).
 * 3. JS style objects (`style={{ fontSize: 11, padding: '8px 16px' }}`) with numbers or strings.
 */
export function findOffScaleDeclarations(
  content: string,
  options: { isTsx?: boolean } = {}
): OffScaleDeclaration[] {
  const offScale: OffScaleDeclaration[] = [];
  const cleanContent = stripCommentsPreservingLines(content);
  const lines = cleanContent.split('\n');

  const isTsx = options.isTsx ?? (content.includes('import React') || content.includes('className=') || content.includes('export default') || content.includes('<div') || content.includes('<span'));

  if (!isTsx) {
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const trimmedLine = line.trim();

      // Skip empty lines or at-rules like @import, @theme definitions
      if (!trimmedLine || trimmedLine.startsWith('@import') || trimmedLine.startsWith('@theme')) {
        continue;
      }

      // Match property declarations: property : value [;}]
      const declRegex = /([\w-]+)\s*:\s*([^;{}]+?)(?:;|\}|$)/g;
      let match: RegExpExecArray | null;

      while ((match = declRegex.exec(line)) !== null) {
        const prop = match[1].trim().toLowerCase();
        const val = match[2].trim();

        // Only check inspected properties or font shorthand
        if (CHECKED_PROPERTIES.has(prop) || prop === 'font') {
          if (isOffScaleValue(prop, val)) {
            offScale.push({
              line: lineIndex + 1,
              property: prop,
              value: val,
              raw: `${match[1]}: ${match[2]}`.trim(),
              source: 'css',
            });
          }
        }
      }
    }
    return offScale;
  }

  // Detección en TSX:
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // 1. Clases arbitrarias de Tailwind (e.g. text-[11px], p-[1px])
    let match: RegExpExecArray | null;
    TW_SCALE_REGEX.lastIndex = 0;

    while ((match = TW_SCALE_REGEX.exec(line)) !== null) {
      const propType = match[1];
      const bracketContent = match[2].trim();
      if (bracketContent.startsWith('var(')) continue;

      if (SIZE_OR_LENGTH_REGEX.test(bracketContent)) {
        offScale.push({
          line: lineIndex + 1,
          property: propType,
          value: bracketContent,
          raw: match[0],
          source: 'tailwind',
        });
      }
    }

    // 2. Objetos de estilo JS / React (e.g. style={{ fontSize: 11, padding: '8px 16px' }})
    const lineWithoutTw = line.replace(TW_SCALE_REGEX, (m) => ' '.repeat(m.length));

    JS_STYLE_PROP_REGEX.lastIndex = 0;
    let jm: RegExpExecArray | null;
    while ((jm = JS_STYLE_PROP_REGEX.exec(lineWithoutTw)) !== null) {
      const jsProp = jm[1];
      const cssProp = JS_TO_CSS_PROPERTIES[jsProp];
      const rawVal = jm[2].trim();

      // Ignorar anotaciones de tipo TypeScript (e.g. fontSize: number; padding?: string)
      if (TS_TYPE_KEYWORDS.has(rawVal.toLowerCase())) continue;

      let cleanVal = rawVal;
      let isStringLiteral = false;
      if (
        (cleanVal.startsWith("'") && cleanVal.endsWith("'")) ||
        (cleanVal.startsWith('"') && cleanVal.endsWith('"')) ||
        (cleanVal.startsWith('`') && cleanVal.endsWith('`'))
      ) {
        cleanVal = cleanVal.slice(1, -1).trim();
        isStringLiteral = true;
      }

      let isNumericLiteral = false;
      if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(cleanVal)) {
        if (cleanVal === '0') continue;
        cleanVal = `${cleanVal}px`;
        isNumericLiteral = true;
      }

      // Solo evaluamos literales numéricos o cadenas literales
      if (!isNumericLiteral && !isStringLiteral) {
        continue;
      }

      if (isOffScaleValue(cssProp, cleanVal)) {
        offScale.push({
          line: lineIndex + 1,
          property: cssProp,
          value: cleanVal,
          raw: jm[0].trim(),
          source: 'js-style',
        });
      }
    }
  }

  return offScale;
}

export function compareScaleBaseline(
  actual: Parameters<typeof compareBaseline>[0],
  baseline: Parameters<typeof compareBaseline>[1]
): ReturnType<typeof compareBaseline> {
  return compareBaseline(actual, baseline, 'escala visual');
}
