export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parses hex (#rgb, #rgba, #rrggbb, #rrggbbaa) and rgb/rgba strings into RGBA object.
 */
export function parseColor(colorStr: string): RGBA {
  const s = colorStr.trim().toLowerCase();

  // Hex color
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: parseInt(hex[3] + hex[3], 16) / 255,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // rgb(...) or rgba(...)
  const rgbMatch = s.match(/^rgba?\(\s*([0-9.]+)\s*(?:,|\s+)\s*([0-9.]+)\s*(?:,|\s+)\s*([0-9.]+)(?:\s*(?:,|\/)\s*([0-9.]+))?\s*\)$/);
  if (rgbMatch) {
    return {
      r: parseFloat(rgbMatch[1]),
      g: parseFloat(rgbMatch[2]),
      b: parseFloat(rgbMatch[3]),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  throw new Error(`Color no reconocido: "${colorStr}"`);
}

/**
 * Calculates WCAG 2.1 relative luminance for given RGB channel values (0-255).
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Blends a semi-transparent foreground color over an opaque background color.
 */
export function compositeColor(foreground: RGBA, background: RGBA): RGBA {
  const alpha = foreground.a;
  return {
    r: Math.round((1 - alpha) * background.r + alpha * foreground.r),
    g: Math.round((1 - alpha) * background.g + alpha * foreground.g),
    b: Math.round((1 - alpha) * background.b + alpha * foreground.b),
    a: 1,
  };
}

/**
 * Pure function that calculates WCAG 2.1 contrast ratio between two colors.
 * Returns a number >= 1.0 and <= 21.0.
 */
export function getContrastRatio(color1: string, color2: string): number {
  let c1 = parseColor(color1);
  let c2 = parseColor(color2);

  // If one of the colors has alpha, composite it over the other
  if (c1.a < 1 && c2.a === 1) {
    c1 = compositeColor(c1, c2);
  } else if (c2.a < 1 && c1.a === 1) {
    c2 = compositeColor(c2, c1);
  }

  const l1 = getRelativeLuminance(c1.r, c1.g, c1.b);
  const l2 = getRelativeLuminance(c2.r, c2.g, c2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}
