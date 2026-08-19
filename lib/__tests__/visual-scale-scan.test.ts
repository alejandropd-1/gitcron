import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { findOffScaleDeclarations } from '../visual-scale';

describe('visual-scale-scan - Verificación automática de escala de tipografía y espaciado', () => {
  const cssFiles = [
    path.resolve(process.cwd(), 'app/globals.css'),
    path.resolve(process.cwd(), 'components/pipeline/OpenSpecDashboard.module.css'),
  ];

  it('no debe contener declaraciones de font-size, padding, margin o gap fuera de escala', () => {
    const allViolations: Array<{
      file: string;
      line: number;
      property: string;
      value: string;
      raw: string;
    }> = [];

    for (const filePath of cssFiles) {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      const violations = findOffScaleDeclarations(content);

      for (const v of violations) {
        allViolations.push({
          file: relativePath,
          line: v.line,
          property: v.property,
          value: v.value,
          raw: v.raw,
        });
      }
    }

    if (allViolations.length > 0) {
      const summary = allViolations
        .map((v) => `  ${v.file}:${v.line} -> [${v.property}] ${v.raw}`)
        .join('\n');
      expect.fail(
        `Se encontraron ${allViolations.length} declaraciones fuera de escala:\n${summary}`
      );
    }

    expect(allViolations.length).toBe(0);
  });
});
