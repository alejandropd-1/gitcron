import { describe, expect, it } from 'vitest';
import { parseDiff } from '@/components/DiffViewer';
import { applyHunksToContent, generateUnifiedDiff } from '../diff-proposal';

describe('diff-proposal logic', () => {
  it('generateUnifiedDiff produce un diff vacío si los contenidos son idénticos', () => {
    const content = '# Spec\n\n## Purpose\nInitial text\n';
    expect(generateUnifiedDiff(content, content)).toBe('');
  });

  it('generateUnifiedDiff genera diff parseable por DiffViewer', () => {
    const oldContent = 'Line 1\nLine 2\nLine 3\n';
    const newContent = 'Line 1\nLine 2 modified\nLine 3\nLine 4 added\n';
    const diff = generateUnifiedDiff(oldContent, newContent, 'test.md');
    expect(diff).toContain('--- a/test.md');
    expect(diff).toContain('+++ b/test.md');
    expect(diff).toContain('@@');

    const hunks = parseDiff(diff);
    expect(hunks.length).toBeGreaterThan(0);
    expect(hunks[0].lines.some((l) => l.type === 'add')).toBe(true);
  });

  describe('applyHunksToContent', () => {
    const oldContent = [
      '# Document',
      '',
      '## Section 1',
      'Old content 1',
      'unchanged A',
      'unchanged B',
      'unchanged C',
      '## Section 2',
      'Old content 2',
      'unchanged D',
      'unchanged E',
      '## Section 3',
      'Old content 3',
    ].join('\n');

    const newContent = [
      '# Document',
      '',
      '## Section 1',
      'NEW content 1',
      'unchanged A',
      'unchanged B',
      'unchanged C',
      '## Section 2',
      'NEW content 2',
      'unchanged D',
      'unchanged E',
      '## Section 3',
      'Old content 3',
    ].join('\n');

    const diff = generateUnifiedDiff(oldContent, newContent, 'doc.md', 1);
    const hunks = parseDiff(diff);

    it('aplica todos los cambios cuando todos los hunks están aceptados', () => {
      const acceptedAll = new Set(hunks.map((_, i) => i));
      const result = applyHunksToContent(oldContent, hunks, acceptedAll);
      expect(result).toBe(newContent);
    });

    it('preserva el contenido original completo cuando ningún hunk es aceptado', () => {
      const result = applyHunksToContent(oldContent, hunks, new Set());
      expect(result).toBe(oldContent);
    });

    it('aplica ÚNICAMENTE los bloques aceptados cuando se acepta parcialmente (Tarea 8.7)', () => {
      expect(hunks.length).toBeGreaterThanOrEqual(2);

      // Aceptar solo el primer hunk (Section 1), descartar el segundo (Section 2)
      const acceptedOnlyFirst = new Set([0]);
      const result = applyHunksToContent(oldContent, hunks, acceptedOnlyFirst);

      // Section 1 debe tener NEW content 1
      expect(result).toContain('NEW content 1');
      expect(result).not.toContain('Old content 1');

      // Section 2 debe conservar Old content 2 (descartado)
      expect(result).toContain('Old content 2');
      expect(result).not.toContain('NEW content 2');

      // Section 3 sin cambios
      expect(result).toContain('Old content 3');
    });

    it('preserva finales de línea CRLF', () => {
      const crlfOld = oldContent.replace(/\n/g, '\r\n');
      const crlfNew = newContent.replace(/\n/g, '\r\n');
      const crlfDiff = generateUnifiedDiff(crlfOld, crlfNew, 'doc.md', 1);
      const crlfHunks = parseDiff(crlfDiff);

      const result = applyHunksToContent(crlfOld, crlfHunks, new Set([0]));
      expect(result.includes('\r\n')).toBe(true);
      expect(result.replace(/\r\n/g, '').includes('\n')).toBe(false);
    });
  });
});
