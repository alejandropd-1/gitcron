import { describe, it, expect } from 'vitest';
import { getContrastRatio, parseColor, getRelativeLuminance } from '../contrast';

describe('contrast - getContrastRatio & WCAG calculations', () => {
  it('calculates 21:1 for pure black and pure white', () => {
    const ratio = getContrastRatio('#000000', '#ffffff');
    expect(ratio).toBeCloseTo(21, 1);
  });

  it('calculates 1:1 for identical colors', () => {
    const ratio = getContrastRatio('#123456', '#123456');
    expect(ratio).toBeCloseTo(1, 4);
  });

  it('calculates exact 4.5:1 ratio for a calibrated test pair', () => {
    // Luminance for black is 0; luminance for target is 0.175 giving (0.175 + 0.05) / 0.05 = 4.5000:1
    const targetChannel = 255 * (1.055 * Math.pow(0.175, 1 / 2.4) - 0.055);
    const colorExact45 = `rgb(${targetChannel}, ${targetChannel}, ${targetChannel})`;
    const ratio = getContrastRatio(colorExact45, '#000000');
    expect(Number(ratio.toFixed(4))).toBe(4.5);
  });

  it('calculates known contrast pairs correctly', () => {
    // #767676 on #ffffff is the standard WCAG reference gray for ~4.54:1
    const ratio = getContrastRatio('#767676', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeLessThan(4.6);
  });

  it('supports rgba alpha compositing over solid background', () => {
    const ratio = getContrastRatio('rgba(255, 255, 255, 0.5)', '#000000');
    expect(ratio).toBeGreaterThan(1);
  });
});
