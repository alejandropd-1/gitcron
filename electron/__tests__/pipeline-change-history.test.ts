import { describe, expect, it } from 'vitest';
import { parseChangeHistory } from '../pipeline/repo-evidence-reader';

/**
 * La salida real de
 * `git log --diff-filter=A --no-renames --name-only --reverse --format=%x00%aI`:
 * una línea por commit marcada con NUL, y debajo los archivos que ese commit
 * dio de alta.
 */
function log(entries: Array<{ at: string; files: string[] }>): string {
  return entries.map(({ at, files }) => `\0${at}\n\n${files.join('\n')}`).join('\n');
}

describe('historia de cambios en una sola pasada', () => {
  it('fecha la creación con la primera aparición del cambio', () => {
    const { created } = parseChangeHistory(log([
      { at: '2026-08-01T10:00:00-03:00', files: ['openspec/changes/mi-cambio/proposal.md'] },
      { at: '2026-08-02T11:00:00-03:00', files: ['openspec/changes/mi-cambio/tasks.md'] },
    ]));
    expect(created.get('mi-cambio')).toBe('2026-08-01T10:00:00-03:00');
  });

  it('fecha el archivado con la primera aparición bajo archive/', () => {
    const { created, archived } = parseChangeHistory(log([
      { at: '2026-08-01T10:00:00-03:00', files: ['openspec/changes/mi-cambio/proposal.md'] },
      { at: '2026-08-03T12:00:00-03:00', files: ['openspec/changes/archive/2026-08-03-mi-cambio/proposal.md'] },
    ]));
    // La creación sigue siendo alcanzable después de archivar: se fechó por la
    // ruta original, que existió antes del movimiento.
    expect(created.get('mi-cambio')).toBe('2026-08-01T10:00:00-03:00');
    expect(archived.get('mi-cambio')).toBe('2026-08-03T12:00:00-03:00');
  });

  it('no confunde el prefijo de fecha con parte del identificador', () => {
    // Los identificadores llevan guiones: partir por el último rompería.
    const { archived } = parseChangeHistory(log([
      { at: '2026-08-03T12:00:00-03:00', files: ['openspec/changes/archive/2026-08-03-carry-branch-rule-in-config/tasks.md'] },
    ]));
    expect(archived.get('carry-branch-rule-in-config')).toBe('2026-08-03T12:00:00-03:00');
  });

  it('ignora una carpeta de archivado sin prefijo de fecha', () => {
    // Adivinar el identificador es peor que no aportarlo.
    const { archived } = parseChangeHistory(log([
      { at: '2026-08-03T12:00:00-03:00', files: ['openspec/changes/archive/suelto/tasks.md'] },
    ]));
    expect(archived.size).toBe(0);
  });

  it('ignora rutas fuera de openspec/changes', () => {
    const { created } = parseChangeHistory(log([
      { at: '2026-08-01T10:00:00-03:00', files: ['components/pipeline/a.tsx', 'openspec/specs/una/spec.md'] },
    ]));
    expect(created.size).toBe(0);
  });

  it('devuelve vacío sin historia', () => {
    const { created, archived } = parseChangeHistory('');
    expect(created.size).toBe(0);
    expect(archived.size).toBe(0);
  });
});
