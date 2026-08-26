import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getScannedUiFiles } from '../scan-targets';
import { findOffPaletteDeclarations, compareBaseline } from '../ui-color';

describe('ui-color-scan - Verificación automática de paleta de color (The Compiled Carbon Soul)', () => {
  const scannedFiles = getScannedUiFiles();
  const baselinePath = path.resolve(__dirname, '../baselines/ui-color-baseline.json');

  it('los archivos de interfaz no deben contener colores literales fuera de la paleta general', () => {
    const actualPerFile: Record<string, Record<string, number>> = {};
    let totalViolations = 0;
    const detailedViolations: Array<{ file: string; line: number; value: string; raw: string }> = [];

    for (const relativePath of scannedFiles) {
      const fullPath = path.resolve(process.cwd(), relativePath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const isGlobalsCss = relativePath === 'app/globals.css';
      const isTsx = relativePath.endsWith('.tsx');

      const violations = findOffPaletteDeclarations(content, { isTsx, isGlobalsCss });

      if (violations.length > 0) {
        actualPerFile[relativePath] = {};
        for (const v of violations) {
          actualPerFile[relativePath][v.value] = (actualPerFile[relativePath][v.value] || 0) + 1;
          detailedViolations.push({
            file: relativePath,
            line: v.line,
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
          `Verificación de paleta de color sin línea de base: se encontraron ${totalViolations} violaciones en ${Object.keys(actualPerFile).length} archivos:\n${fileSummary}`
        );
      }
      expect(totalViolations).toBe(0);
      return;
    }

    // Si existe línea de base, se compara de forma estricta por archivo, valor y cantidad
    const baselineContent = fs.readFileSync(baselinePath, 'utf-8');
    const baseline = JSON.parse(baselineContent) as Record<string, Record<string, number>>;

    const result = compareBaseline(actualPerFile, baseline);

    if (!result.passed) {
      expect.fail(result.errorMessage);
    }

    expect(result.passed).toBe(true);
  });

  it('la hoja de estilos de Pipeline (OpenSpecDashboard.module.css) no contiene declaraciones ni tokens locales propios', () => {
    const cssPath = path.resolve(process.cwd(), 'components/pipeline/OpenSpecDashboard.module.css');
    const content = fs.readFileSync(cssPath, 'utf-8');
    const violations = findOffPaletteDeclarations(content, { isTsx: false });
    expect(violations.length).toBe(0);
  });
});
