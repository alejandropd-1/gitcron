import { describe, it, expect } from 'vitest';
import { getContrastRatio } from '../contrast';

export interface ContrastPairCheck {
  description: string;
  type: 'text' | 'ui-control' | 'focus-ring';
  foreground: string;
  background: string;
  minRatio: number;
}

export const PALETTE_PAIRS: ContrastPairCheck[] = [
  // Primary / Secondary text on shared backgrounds (target >= 4.5:1)
  {
    description: '--color-text-primary on --color-bg-base',
    type: 'text',
    foreground: '#d9e7fc',
    background: '#06182a',
    minRatio: 4.5,
  },
  {
    description: '--color-text-primary on --color-bg-surface',
    type: 'text',
    foreground: '#d9e7fc',
    background: '#020f1e',
    minRatio: 4.5,
  },
  {
    description: '--color-text-primary on --color-bg-overlay',
    type: 'text',
    foreground: '#d9e7fc',
    background: '#12273c',
    minRatio: 4.5,
  },
  {
    description: '--color-text-secondary on --color-bg-base',
    type: 'text',
    foreground: '#9eacc0',
    background: '#06182a',
    minRatio: 4.5,
  },
  {
    description: '--color-text-secondary on --color-bg-surface',
    type: 'text',
    foreground: '#9eacc0',
    background: '#020f1e',
    minRatio: 4.5,
  },
  {
    description: '--color-text-secondary on --color-bg-overlay',
    type: 'text',
    foreground: '#9eacc0',
    background: '#12273c',
    minRatio: 4.5,
  },
  // Accents as text on dark backgrounds
  {
    description: '--color-primary (Cyan) on --color-bg-base',
    type: 'text',
    foreground: '#5ed8ff',
    background: '#06182a',
    minRatio: 4.5,
  },
  {
    description: '--color-secondary (Green) on --color-bg-base',
    type: 'text',
    foreground: '#a3f185',
    background: '#06182a',
    minRatio: 4.5,
  },
  {
    description: '--color-git-mod (Orange) on --color-bg-base',
    type: 'text',
    foreground: '#fd9d1a',
    background: '#06182a',
    minRatio: 4.5,
  },
  {
    description: '--color-error (Red) on --color-bg-base',
    type: 'text',
    foreground: '#ff716c',
    background: '#06182a',
    minRatio: 4.5,
  },
  {
    description: '--color-accent-purple on --color-bg-surface',
    type: 'text',
    foreground: '#8a5cf5',
    background: '#020f1e',
    minRatio: 4.5,
  },
  // Pipeline tokens (text)
  {
    description: '--os-muted on --os-bg',
    type: 'text',
    foreground: '#93a5ba',
    background: '#06182a',
    minRatio: 4.5,
  },
  {
    description: '--os-violet on --os-bg',
    type: 'text',
    foreground: '#9b87ff',
    background: '#06182a',
    minRatio: 4.5,
  },
  {
    description: '--os-amber on --os-bg',
    type: 'text',
    foreground: '#ffbf47',
    background: '#06182a',
    minRatio: 4.5,
  },
  // Focus ring (target >= 3.0:1)
  {
    description: 'Focus ring (--color-primary) on --color-bg-base',
    type: 'focus-ring',
    foreground: '#5ed8ff',
    background: '#06182a',
    minRatio: 3.0,
  },
  {
    description: 'Focus ring (--color-primary) on --color-bg-surface',
    type: 'focus-ring',
    foreground: '#5ed8ff',
    background: '#020f1e',
    minRatio: 3.0,
  },
  // Control borders (target >= 3.0:1)
  {
    description: '--color-border-subtle on --color-bg-base',
    type: 'ui-control',
    foreground: '#566579',
    background: '#06182a',
    minRatio: 3.0,
  },
  {
    description: '--os-border on --os-bg',
    type: 'ui-control',
    foreground: 'rgba(141, 169, 198, 0.55)',
    background: '#06182a',
    minRatio: 3.0,
  },
  {
    description: '--os-border-strong on --os-bg',
    type: 'ui-control',
    foreground: 'rgba(141, 169, 198, 0.65)',
    background: '#06182a',
    minRatio: 3.0,
  },
  {
    description: 'Secondary action border on --os-bg',
    type: 'ui-control',
    foreground: 'rgba(141, 169, 198, 0.6)',
    background: '#06182a',
    minRatio: 3.0,
  },
];

describe('palette-contrast - Verificación de contraste WCAG AA', () => {
  it('todos los pares de color deben cumplir con el ratio mínimo exigido', () => {
    const failingPairs: Array<{
      description: string;
      foreground: string;
      background: string;
      ratio: number;
      minRatio: number;
    }> = [];

    for (const pair of PALETTE_PAIRS) {
      const ratio = getContrastRatio(pair.foreground, pair.background);
      if (ratio < pair.minRatio) {
        failingPairs.push({
          description: pair.description,
          foreground: pair.foreground,
          background: pair.background,
          ratio: Number(ratio.toFixed(2)),
          minRatio: pair.minRatio,
        });
      }
    }

    if (failingPairs.length > 0) {
      const summary = failingPairs
        .map(
          (p) =>
            `  - [${p.description}] (${p.foreground} sobre ${p.background}) -> Obtenido: ${p.ratio}:1, Requerido: ${p.minRatio}:1`
        )
        .join('\n');
      expect.fail(
        `Se encontraron ${failingPairs.length} pares con contraste insuficiente:\n${summary}`
      );
    }

    expect(failingPairs.length).toBe(0);
  });
});
