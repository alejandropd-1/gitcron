import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Escáner de clases CSS de Pipeline', () => {
  it('todas las clases styles.X usadas en components/pipeline/*.tsx están definidas en OpenSpecDashboard.module.css', () => {
    const pipelineDir = path.resolve(__dirname, '../pipeline');
    const cssPath = path.join(pipelineDir, 'OpenSpecDashboard.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Extraer todos los nombres de clases definidos en selectores CSS (.clase)
    const definedClasses = new Set<string>();
    const cssClassRegex = /\.([a-zA-Z0-9_-]+)/g;
    let cssMatch: RegExpExecArray | null;
    while ((cssMatch = cssClassRegex.exec(cssContent)) !== null) {
      definedClasses.add(cssMatch[1]);
    }

    // Recorrer components/pipeline/*.tsx y extraer cada styles.X
    const tsxFiles = fs
      .readdirSync(pipelineDir)
      .filter((file) => file.endsWith('.tsx'));

    const usedStyles = new Map<string, string[]>();
    const styleUsageRegex = /\bstyles\.([a-zA-Z0-9_]+)\b/g;

    for (const file of tsxFiles) {
      const filePath = path.join(pipelineDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let styleMatch: RegExpExecArray | null;
      while ((styleMatch = styleUsageRegex.exec(fileContent)) !== null) {
        const className = styleMatch[1];
        if (!usedStyles.has(className)) {
          usedStyles.set(className, []);
        }
        usedStyles.get(className)!.push(file);
      }
    }

    // Identificar clases huérfanas sin excepciones
    const orphans: { className: string; files: string[] }[] = [];
    for (const [className, files] of usedStyles.entries()) {
      if (!definedClasses.has(className)) {
        orphans.push({ className, files: Array.from(new Set(files)) });
      }
    }

    expect(
      orphans,
      `Clases CSS fantasma/huérfanas encontradas en components/pipeline: ${JSON.stringify(orphans, null, 2)}`,
    ).toEqual([]);
  });
});
