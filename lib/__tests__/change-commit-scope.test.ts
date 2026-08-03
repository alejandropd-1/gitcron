import { describe, expect, it } from 'vitest';
import { deriveChangeCommitScope, deriveScope, suggestCommitMessage } from '../change-commit-scope';

describe('atribución de archivos a un cambio', () => {
  it('con un solo cambio en curso, todo lo modificado es suyo', () => {
    // Nadie tiene que declararlo: si ningún otro cambio tiene artefactos
    // tocados, no hay ambigüedad que resolver.
    const scope = deriveChangeCommitScope('mi-cambio', [
      'openspec/changes/mi-cambio/tasks.md',
      'components/algo.tsx',
      'electron/ipc/otro.ts',
    ], '');

    expect(scope.own).toEqual([
      'openspec/changes/mi-cambio/tasks.md',
      'components/algo.tsx',
      'electron/ipc/otro.ts',
    ]);
    expect(scope.foreign).toEqual([]);
  });

  it('con varios cambios en curso, el código queda fuera por ambiguo', () => {
    // Nada dice a qué cambio pertenece un archivo de código, y adivinarlo
    // metería trabajo ajeno en el commit.
    const scope = deriveChangeCommitScope('mi-cambio', [
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/otro-cambio/proposal.md',
      'components/algo.tsx',
    ], '');

    expect(scope.own).toEqual(['openspec/changes/mi-cambio/tasks.md']);
    expect(scope.foreign).toEqual([
      'openspec/changes/otro-cambio/proposal.md',
      'components/algo.tsx',
    ]);
  });

  it('un cambio archivado no cuenta como cambio en curso, y sus restos no entran en el propio', () => {
    // El archivo archivado pertenece al commit del archivado, no al trabajo en
    // curso: aunque sea el único change activo y no haya ambigüedad, queda fuera.
    // El código sí entra en `own` por descarte, porque ningún otro change lo reclama.
    const scope = deriveChangeCommitScope('mi-cambio', [
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/archive/2026-08-01-viejo/tasks.md',
      'components/algo.tsx',
    ], '');

    expect(scope.own).toEqual([
      'openspec/changes/mi-cambio/tasks.md',
      'components/algo.tsx',
    ]);
    expect(scope.foreign).toEqual(['openspec/changes/archive/2026-08-01-viejo/tasks.md']);
  });

  it('las specs consolidadas del archivado también quedan fuera del cambio activo', () => {
    // `openspec/specs/…` sólo cambia por consolidación de archivado o por
    // edición manual: en el primer caso acompaña a `archive/…` y se trata igual.
    const scope = deriveChangeCommitScope('mi-cambio', [
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/specs/pipeline-guided-workflow/spec.md',
      'components/algo.tsx',
    ], '');

    expect(scope.own).toEqual([
      'openspec/changes/mi-cambio/tasks.md',
      'components/algo.tsx',
    ]);
    expect(scope.foreign).toEqual(['openspec/specs/pipeline-guided-workflow/spec.md']);
  });

  it('no confunde un cambio con otro cuyo identificador lo prefija', () => {
    const scope = deriveChangeCommitScope('mi-cambio', [
      'openspec/changes/mi-cambio-largo/tasks.md',
    ], '');

    expect(scope.own).toEqual([]);
    expect(scope.foreign).toEqual(['openspec/changes/mi-cambio-largo/tasks.md']);
  });
});

describe('alcance derivado del directorio', () => {
  it('toma el segundo nivel cuando todos lo comparten', () => {
    expect(deriveScope(['components/pipeline/a.tsx', 'components/pipeline/b.tsx'])).toBe('pipeline');
  });

  it('cae al primer nivel cuando el segundo difiere', () => {
    expect(deriveScope(['electron/ipc/a.ts', 'electron/pipeline/b.ts'])).toBe('electron');
  });

  it('se omite cuando los directorios son dispares', () => {
    expect(deriveScope(['components/a.tsx', 'electron/b.ts'])).toBeNull();
  });

  it('ignora artefactos y documentación para calcularlo', () => {
    // Están en casi todos los commits: arrastrarían el alcance a `openspec` siempre.
    expect(deriveScope([
      'openspec/changes/x/tasks.md',
      'docs/reports/algo.md',
      'hooks/git-actions/working-tree.ts',
    ])).toBe('git-actions');
  });

  it('sin archivos de código no hay alcance', () => {
    expect(deriveScope(['openspec/changes/x/tasks.md'])).toBeNull();
  });
});

describe('mensaje sugerido', () => {
  it('usa tipo, alcance e identificador del cambio', () => {
    expect(suggestCommitMessage('confirm-work-in-git', ['components/pipeline/a.tsx']))
      .toBe('chore(pipeline): confirm-work-in-git');
  });

  it('omite el paréntesis cuando no hay alcance derivable', () => {
    expect(suggestCommitMessage('mi-cambio', ['components/a.tsx', 'electron/b.ts']))
      .toBe('chore: mi-cambio');
  });

  it('no se sugiere nada si ya hay un mensaje escrito', () => {
    // Pisarlo perdería lo que alguien estaba redactando, y sólo se notaría
    // después de confirmar.
    const scope = deriveChangeCommitScope('mi-cambio', ['components/a.tsx'], 'fix: algo que escribí');
    expect(scope.suggestedMessage).toBeNull();
  });

  it('un campo con sólo espacios cuenta como vacío', () => {
    const scope = deriveChangeCommitScope('mi-cambio', ['components/pipeline/a.tsx'], '   ');
    expect(scope.suggestedMessage).toBe('chore(pipeline): mi-cambio');
  });
});
