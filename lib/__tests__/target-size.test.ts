import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

export interface TargetSizeViolation {
  element: string;
  source: string;
  measuredSize: string;
  minSize: number;
}

export function parseDimensionPx(val: string): number | null {
  const v = val.trim();
  if (v.endsWith('px')) {
    return parseFloat(v);
  }
  if (v.endsWith('rem')) {
    return parseFloat(v) * 16;
  }
  if (v.endsWith('em')) {
    return parseFloat(v) * 16;
  }
  return null;
}

describe('target-size - Verificación de área objetivo mínima (44x44px)', () => {
  it('todos los controles interactivos deben cumplir con un tamaño mínimo de 44px de alto y ancho', () => {
    const violations: TargetSizeViolation[] = [];
    const minTargetPx = 44;

    // 1. Inspect OpenSpecDashboard CSS controls
    const cssPath = path.resolve(process.cwd(), 'components/pipeline/OpenSpecDashboard.module.css');
    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, 'utf-8');

      const controlsToCheck = [
        { name: '.changeToggle', selector: /\.changeToggle\s*\{([^}]+)\}/ },
        { name: '.artifactRow', selector: /\.artifactRow\s*\{([^}]+)\}/ },
        { name: '.compactList button', selector: /\.compactList button\s*\{([^}]+)\}/ },
        { name: '.specList > button', selector: /\.specList > button\s*\{([^}]+)\}/ },
        { name: '.taskStatus', selector: /\.taskStatus\s*\{([^}]+)\}/ },
        { name: '.tabsRow .actions button', selector: /\.tabsRow \.actions button\s*\{([^}]+)\}/ },
        { name: '.groupToggle', selector: /\.groupToggle\s*\{([^}]+)\}/ },
        { name: '.repoHealth', selector: /\.repoHealth\s*\{([^}]+)\}/ },
        { name: '.repoHealthCta', selector: /\.repoHealthCta\s*\{([^}]+)\}/ },
      ];

      for (const ctrl of controlsToCheck) {
        const match = ctrl.selector.exec(css);
        if (match) {
          const body = match[1];
          const heightMatch = body.match(/(?:min-height|min-block-size|height)\s*:\s*([^;]+);/);
          const widthMatch = body.match(/(?:min-width|min-inline-size|width)\s*:\s*([^;]+);/);

          let hPx = heightMatch ? parseDimensionPx(heightMatch[1]) : null;
          let wPx = widthMatch ? parseDimensionPx(widthMatch[1]) : null;

          if (hPx === null) {
            const paddingMatch = body.match(/padding\s*:\s*([^;]+);/);
            if (paddingMatch) {
              const pTokens = paddingMatch[1].split(' ').map((t) => parseDimensionPx(t) || 0);
              const padY = pTokens.length === 1 ? pTokens[0] * 2 : (pTokens[0] || 0) * 2;
              hPx = padY + 16;
            }
          }

          if ((hPx !== null && hPx < minTargetPx) || (wPx !== null && wPx < minTargetPx)) {
            violations.push({
              element: ctrl.name,
              source: 'components/pipeline/OpenSpecDashboard.module.css',
              measuredSize: `${wPx ?? 'auto'} x ${hPx ?? 'auto'} px`,
              minSize: minTargetPx,
            });
          }
        }
      }
    }

    // 2. Inspect TopBar controls in components/TopBar.tsx
    const topBarPath = path.resolve(process.cwd(), 'components/TopBar.tsx');
    if (fs.existsSync(topBarPath)) {
      const topBarContent = fs.readFileSync(topBarPath, 'utf-8');

      const topBarButtons = [
        { name: 'onToggleSidebar button', match: /onToggleSidebar[\s\S]{1,300}?className=\{cn\(\s*'([^']+)'/ },
        { name: 'onToggleDetails button', match: /onToggleDetails[\s\S]{1,300}?className=\{cn\(\s*'([^']+)'/ },
      ];

      for (const btn of topBarButtons) {
        const m = btn.match.exec(topBarContent);
        if (m) {
          const classes = m[1];
          if (/h-9\b|w-9\b|h-[678]\b|w-[678]\b|p-1\b|p-1\.5\b/.test(classes)) {
            violations.push({
              element: btn.name,
              source: 'components/TopBar.tsx',
              measuredSize: classes.includes('h-9') ? '36x36px' : '<44px',
              minSize: minTargetPx,
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      const summary = violations
        .map(
          (v) =>
            `  - [${v.element}] en ${v.source}: tamaño medido ${v.measuredSize} (mínimo exigido: ${v.minSize}px)`
        )
        .join('\n');
      expect.fail(
        `Se encontraron ${violations.length} controles por debajo del área objetivo de 44x44px:\n${summary}`
      );
    }

    expect(violations.length).toBe(0);
  });
});
