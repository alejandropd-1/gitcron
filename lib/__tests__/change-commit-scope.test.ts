import { describe, expect, it } from 'vitest';
import {
  archivedChangeId,
  deriveRepoCommitScope,
  deriveScope,
  fileOrigin,
  soleChangeId,
  suggestCommitMessage,
} from '../change-commit-scope';

describe('procedencia de cada archivo', () => {
  it('deduce el origen de la ubicación, sin cambio de referencia', () => {
    expect(fileOrigin('openspec/changes/mi-cambio/tasks.md')).toEqual({ kind: 'change', changeId: 'mi-cambio' });
    expect(fileOrigin('openspec/changes/archive/2026-08-01-viejo/tasks.md')).toEqual({ kind: 'archived' });
    expect(fileOrigin('openspec/specs/una-capacidad/spec.md')).toEqual({ kind: 'archived' });
    expect(fileOrigin('components/algo.tsx')).toEqual({ kind: 'unattributed' });
  });

  it('nombra el cambio de cada artefacto, sin privilegiar ninguno', () => {
    // Antes había un cambio de referencia y todo lo demás caía en una bolsa
    // ajena. Sin referencia, cada grupo se nombra por lo que es.
    const scope = deriveRepoCommitScope([
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/otro-cambio/proposal.md',
      'openspec/changes/archive/2026-08-01-viejo/tasks.md',
      'openspec/specs/una-capacidad/spec.md',
      'components/algo.tsx',
    ]);

    expect(scope.files).toEqual([
      { path: 'openspec/changes/mi-cambio/tasks.md', origin: { kind: 'change', changeId: 'mi-cambio' } },
      { path: 'openspec/changes/otro-cambio/proposal.md', origin: { kind: 'change', changeId: 'otro-cambio' } },
      { path: 'openspec/changes/archive/2026-08-01-viejo/tasks.md', origin: { kind: 'archived' } },
      { path: 'openspec/specs/una-capacidad/spec.md', origin: { kind: 'archived' } },
      { path: 'components/algo.tsx', origin: { kind: 'unattributed' } },
    ]);
  });

  it('no confunde un cambio con otro cuyo identificador lo prefija', () => {
    const scope = deriveRepoCommitScope([
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/mi-cambio-largo/tasks.md',
    ]);

    expect(scope.groups.map((group) => group.key)).toEqual(['change:mi-cambio', 'change:mi-cambio-largo']);
  });
});

describe('agrupación por procedencia', () => {
  it('un grupo por cambio, más los restos de archivado y lo sin atribuir', () => {
    const scope = deriveRepoCommitScope([
      'openspec/changes/mi-cambio/tasks.md',
      'components/algo.tsx',
      'openspec/changes/otro-cambio/proposal.md',
      'openspec/changes/archive/2026-08-01-viejo/tasks.md',
      'openspec/changes/mi-cambio/design.md',
    ]);

    // Los cambios primero, en el orden en que aparecen sus archivos; los dos
    // grupos fijos al final.
    expect(scope.groups.map((group) => group.key)).toEqual([
      'change:mi-cambio',
      'change:otro-cambio',
      'archived',
      'unattributed',
    ]);
    expect(scope.groups[0].entries.map((entry) => entry.path)).toEqual([
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/mi-cambio/design.md',
    ]);
  });

  it('los grupos contienen exactamente los mismos archivos que la lista plana', () => {
    // Dos fuentes para la misma pregunta terminarían contradiciéndose.
    const scope = deriveRepoCommitScope([
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/specs/una-capacidad/spec.md',
      'components/algo.tsx',
    ]);

    expect(scope.groups.flatMap((group) => group.entries).map((entry) => entry.path).sort())
      .toEqual(scope.files.map((entry) => entry.path).sort());
  });

  it('sin archivos modificados no hay nada que agrupar', () => {
    const scope = deriveRepoCommitScope([]);
    expect(scope.files).toEqual([]);
    expect(scope.groups).toEqual([]);
  });

  it('los restos de un archivado se agrupan aunque no haya ningún cambio activo', () => {
    // El caso que motivó subir el commit de nivel: después de archivar no queda
    // ningún cambio desde el cual mirar, y estos archivos igual hay que confirmarlos.
    const scope = deriveRepoCommitScope([
      'openspec/changes/archive/2026-08-01-viejo/tasks.md',
      'openspec/specs/una-capacidad/spec.md',
    ]);

    expect(scope.groups.map((group) => group.key)).toEqual(['archived']);
    expect(scope.groups[0].entries).toHaveLength(2);
  });
});

describe('las dos mitades de un archivado', () => {
  it('van en un solo grupo', () => {
    // La detección de renombres de Git opera sobre el diff de un commit, así que
    // repartir las mitades en dos commits la deshabilita: medido acá mismo, con
    // el movimiento entero los artefactos figuran como renombres de cero líneas,
    // y separados figuran como un borrado y un alta sin vínculo.
    const scope = deriveRepoCommitScope([
      'openspec/changes/mi-cambio/design.md',
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/archive/2026-08-05-mi-cambio/design.md',
      'openspec/changes/archive/2026-08-05-mi-cambio/tasks.md',
      'openspec/specs/una-capacidad/spec.md',
    ]);

    expect(scope.groups.map((group) => group.key)).toEqual(['archived']);
    expect(scope.groups[0].entries).toHaveLength(5);
  });

  it('un cambio no archivado conserva su grupo aunque le falte un archivo', () => {
    // Caso de control: sin ninguna carpeta de archivado que lo reclame, el
    // archivo sigue siendo del cambio.
    const scope = deriveRepoCommitScope([
      'openspec/changes/mi-cambio/design.md',
      'openspec/changes/archive/2026-08-05-otro-cambio/design.md',
    ]);

    expect(scope.groups.map((group) => group.key)).toEqual(['change:mi-cambio', 'archived']);
  });

  it('archivar un cambio no arrastra a otro que sigue activo', () => {
    const scope = deriveRepoCommitScope([
      'openspec/changes/archive/2026-08-05-cerrado/tasks.md',
      'openspec/changes/cerrado/tasks.md',
      'openspec/changes/abierto/tasks.md',
    ]);

    expect(scope.groups.map((group) => group.key)).toEqual(['change:abierto', 'archived']);
    expect(scope.groups[1].entries.map((entry) => entry.path)).toEqual([
      'openspec/changes/archive/2026-08-05-cerrado/tasks.md',
      'openspec/changes/cerrado/tasks.md',
    ]);
  });

  it('el identificador sale de quitar el prefijo de fecha, no de partir por guiones', () => {
    expect(archivedChangeId('openspec/changes/archive/2026-08-05-add-pipeline-start-screen/design.md'))
      .toBe('add-pipeline-start-screen');
    // Sin prefijo de fecha no se adivina.
    expect(archivedChangeId('openspec/changes/archive/suelto/design.md')).toBeNull();
    expect(archivedChangeId('openspec/changes/mi-cambio/design.md')).toBeNull();
  });

  it('una carpeta de archivado sin prefijo de fecha no reclama nada', () => {
    // No aporta identificador, así que el cambio activo conserva su grupo.
    const scope = deriveRepoCommitScope([
      'openspec/changes/archive/suelto/design.md',
      'openspec/changes/suelto/design.md',
    ]);

    expect(scope.groups.map((group) => group.key)).toEqual(['change:suelto', 'archived']);
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

describe('el cambio al que pertenece un conjunto', () => {
  it('es el único que aparece, aunque haya código sin atribuir', () => {
    // El caso corriente: se trabaja en un cambio tocando sus artefactos y algo
    // de código. El código no tiene dueño con el cual entrar en conflicto.
    expect(soleChangeId([
      'openspec/changes/mi-cambio/tasks.md',
      'components/algo.tsx',
    ])).toBe('mi-cambio');
  });

  it('no hay ninguno cuando aparecen dos cambios', () => {
    expect(soleChangeId([
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/otro-cambio/proposal.md',
    ])).toBeNull();
  });

  it('un cambio archivado sí aporta identificador', () => {
    // Cuando la selección es el archivado, negarlo dejaba sin descripción justo
    // el commit que mejor se puede describir.
    expect(soleChangeId([
      'openspec/changes/archive/2026-08-01-viejo/tasks.md',
      'openspec/changes/viejo/tasks.md',
      'openspec/specs/una-capacidad/spec.md',
    ])).toBe('viejo');
  });

  it('un archivado y un cambio activo siguen siendo dos, y no nombran nada', () => {
    // El riesgo que cubría la regla anterior lo sigue cubriendo ésta.
    expect(soleChangeId([
      'openspec/changes/archive/2026-08-01-viejo/tasks.md',
      'openspec/changes/en-curso/tasks.md',
    ])).toBeNull();
  });

  it('una carpeta de archivado sin prefijo de fecha no aporta identificador', () => {
    expect(soleChangeId(['openspec/changes/archive/suelto/tasks.md'])).toBeNull();
  });
});

describe('mensaje sugerido', () => {
  it('usa tipo, alcance e identificador cuando el conjunto es de un solo cambio', () => {
    expect(suggestCommitMessage([
      'openspec/changes/confirm-work-in-git/tasks.md',
      'components/pipeline/a.tsx',
    ])).toBe('chore(pipeline): confirm-work-in-git');
  });

  it('omite el paréntesis cuando no hay alcance derivable', () => {
    expect(suggestCommitMessage([
      'openspec/changes/mi-cambio/tasks.md',
      'components/a.tsx',
      'electron/b.ts',
    ])).toBe('chore: mi-cambio');
  });

  it('deja la descripción vacía cuando el conjunto abarca varios cambios', () => {
    // Deliberado: que deje de nombrar un cambio es la señal de que el commit
    // está mezclando trabajos, y llega antes de confirmar. El prefijo queda
    // listo para que una persona complete la descripción.
    expect(suggestCommitMessage([
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/otro-cambio/proposal.md',
      'components/pipeline/a.tsx',
    ])).toBe('chore(pipeline): ');
  });

  it('deja la descripción vacía cuando no hay ningún cambio en el conjunto', () => {
    expect(suggestCommitMessage([
      'openspec/changes/archive/suelto/tasks.md',
      'openspec/specs/una-capacidad/spec.md',
    ])).toBe('chore: ');
  });

  it('el commit del archivado nombra el cambio archivado', () => {
    // Es el commit del movimiento entero: las dos mitades más la consolidación
    // de specs. Sin esto quedaba `chore: ` pelado, que es lo que empujaba a
    // partirlo en dos para conservar un mensaje útil.
    expect(suggestCommitMessage([
      'openspec/changes/archive/2026-08-05-mi-cambio/design.md',
      'openspec/changes/mi-cambio/design.md',
      'openspec/specs/una-capacidad/spec.md',
    ])).toBe('chore: mi-cambio');
  });

  it('se compone sobre el conjunto elegido, no sobre todo lo modificado', () => {
    // El defecto que ya se había corregido y que no vuelve: la sugerencia tiene
    // que describir el commit que se va a hacer, no el árbol entero.
    const todo = deriveRepoCommitScope([
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/otro-cambio/proposal.md',
      'components/pipeline/a.tsx',
    ]);
    const elegidos = todo.files
      .filter((entry) => entry.origin.kind !== 'change' || entry.origin.changeId === 'mi-cambio')
      .map((entry) => entry.path);

    expect(suggestCommitMessage(elegidos)).toBe('chore(pipeline): mi-cambio');
  });
});
