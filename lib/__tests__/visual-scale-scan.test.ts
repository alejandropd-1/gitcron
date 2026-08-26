import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getScannedUiFiles } from '../scan-targets';
import { findOffScaleDeclarations, compareScaleBaseline } from '../visual-scale';

describe('visual-scale-scan - Verificación automática de escala de tipografía y espaciado', () => {
  const scannedFiles = getScannedUiFiles();
  const baselinePath = path.resolve(__dirname, '../baselines/visual-scale-baseline.json');

  it('los archivos de interfaz no deben contener declaraciones de tamaño o espaciado fuera de escala', () => {
    const actualPerFile: Record<string, Record<string, number>> = {};
    let totalViolations = 0;
    const detailedViolations: Array<{ file: string; line: number; property: string; value: string; raw: string }> = [];

    for (const relativePath of scannedFiles) {
      const fullPath = path.resolve(process.cwd(), relativePath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const isTsx = relativePath.endsWith('.tsx');

      const violations = findOffScaleDeclarations(content, { isTsx });

      if (violations.length > 0) {
        actualPerFile[relativePath] = {};
        for (const v of violations) {
          actualPerFile[relativePath][v.value] = (actualPerFile[relativePath][v.value] || 0) + 1;
          detailedViolations.push({
            file: relativePath,
            line: v.line,
            property: v.property,
            value: v.value,
            raw: v.raw,
          });
          totalViolations++;
        }
      }
    }

    // Si no existe el archivo de línea de base versionado, la verificación corre desnuda
    if (!fs.existsSync(baselinePath)) {
      if (totalViolations > 0) {
        const fileSummary = Object.entries(actualPerFile)
          .sort((a, b) => Object.values(b[1]).reduce((s, c) => s + c, 0) - Object.values(a[1]).reduce((s, c) => s + c, 0))
          .map(([f, map]) => {
            const count = Object.values(map).reduce((s, c) => s + c, 0);
            const values = Object.entries(map).map(([val, cnt]) => `${val} (${cnt})`).join(', ');
            return `  ${f} (${count}): ${values}`;
          })
          .join('\n');

        expect.fail(
          `Verificación de escala visual sin línea de base: se encontraron ${totalViolations} violaciones en ${Object.keys(actualPerFile).length} archivos:\n${fileSummary}`
        );
      }
      expect(totalViolations).toBe(0);
      return;
    }

    // Si existe línea de base, se compara de forma estricta por archivo, valor y cantidad
    const baselineContent = fs.readFileSync(baselinePath, 'utf-8');
    const baseline = JSON.parse(baselineContent) as Record<string, Record<string, number>>;

    const result = compareScaleBaseline(actualPerFile, baseline);

    if (!result.passed) {
      expect.fail(result.errorMessage);
    }

    expect(result.passed).toBe(true);
  });
});
