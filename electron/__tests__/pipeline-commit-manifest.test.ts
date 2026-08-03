import { describe, expect, it } from 'vitest';
import {
  archiveCommitPaths,
  deterministicChangePaths,
} from '../pipeline/change-commit-manifest';

/**
 * Este archivo cubría además el parseo de `commit.md` y la tarea de firma.
 * Ambas eran convenciones propias que OpenSpec no define y que se retiraron al
 * desacoplar el archivado del commit; quedan las dos derivaciones puras, que
 * responden qué archivos modificados pertenecen a un change usando sólo su id.
 */
describe('rutas deterministas', () => {
  const changed = [
    'openspec/changes/mi-cambio/tasks.md',
    'openspec/changes/otro/proposal.md',
    'openspec/changes/archive/2026-07-31-mi-cambio/tasks.md',
    'openspec/specs/una-capacidad/spec.md',
    'components/algo.tsx',
  ];

  it('los artefactos del cambio se derivan de su id, sin declararlos', () => {
    expect(deterministicChangePaths('mi-cambio', changed))
      .toEqual(['openspec/changes/mi-cambio/tasks.md']);
  });

  it('el archivado toca destino, origen y specs consolidadas', () => {
    expect(archiveCommitPaths('mi-cambio', changed)).toEqual([
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/archive/2026-07-31-mi-cambio/tasks.md',
      'openspec/specs/una-capacidad/spec.md',
    ]);
    // El cambio ajeno no entra en ninguno de los dos.
    expect(archiveCommitPaths('mi-cambio', changed)).not.toContain('openspec/changes/otro/proposal.md');
  });

  it('no confunde un cambio con otro cuyo id lo prefija', () => {
    const files = ['openspec/changes/mi-cambio-largo/tasks.md'];
    expect(deterministicChangePaths('mi-cambio', files)).toEqual([]);
  });
});
