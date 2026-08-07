import { describe, expect, it } from 'vitest';
import { changeIdFromBranch } from '../change-branch';
import {
  deriveRepoCommitScope,
  soleChangeId,
  suggestCommitMessage,
  type ChangeAttribution,
} from '../change-commit-scope';

/**
 * A qué cambio pertenece un archivo de código.
 *
 * El dato no existe en el repositorio: un artefacto se atribuye por su ruta
 * —vive bajo `openspec/changes/<slug>/`— y un archivo de código no lleva encima
 * ninguna marca de por qué se editó. Ale eligió la rama como fuente primaria:
 * una rama es una afirmación deliberada, mientras que observar qué rutas
 * cambiaron mientras una sesión estaba abierta es una correlación temporal.
 *
 * El riesgo central no es técnico: una atribución que parece cierta y no lo es
 * es peor que ninguna, porque lleva a confirmar en Git archivos que no
 * corresponden creyendo que la aplicación lo verificó. Por eso cada atribución
 * viaja con su fuente, y lo que ninguna fuente explica queda sin atribuir.
 */

const branch = (changeId: string): ChangeAttribution => ({ changeId, source: 'branch' });

describe('el cambio que declara la rama', () => {
  it('lo lee del nombre de la rama', () => {
    expect(changeIdFromBranch('change/attribute-files-to-change')).toBe('attribute-files-to-change');
  });

  it('cualquier otra rama no declara nada', () => {
    // Heredar el cambio seleccionado en la pantalla sería inventar justo la
    // atribución que este trabajo existe para no inventar.
    expect(changeIdFromBranch('main')).toBeNull();
    expect(changeIdFromBranch('feature/algo')).toBeNull();
    // `imagined/*` y `flight/*` ya significan otra cosa en este proyecto.
    expect(changeIdFromBranch('imagined/una-idea')).toBeNull();
    expect(changeIdFromBranch(null)).toBeNull();
    expect(changeIdFromBranch('')).toBeNull();
  });

  it('una rama sin identificador tampoco', () => {
    expect(changeIdFromBranch('change/')).toBeNull();
    // El slug de OpenSpec no admite barras: esto no es la rama de ningún cambio.
    expect(changeIdFromBranch('change/algo/otro')).toBeNull();
  });
});

describe('atribución de archivos de código', () => {
  it('un archivo atribuido por rama declara la rama como fuente', () => {
    const scope = deriveRepoCommitScope(['components/algo.tsx'], branch('mi-cambio'));

    expect(scope.files).toEqual([
      { path: 'components/algo.tsx', origin: { kind: 'change', changeId: 'mi-cambio', source: 'branch' } },
    ]);
  });

  it('sin fuente queda sin atribuir, y no hereda ningún cambio', () => {
    const scope = deriveRepoCommitScope(['components/algo.tsx'], null);
    expect(scope.files[0].origin).toEqual({ kind: 'unattributed' });
  });

  it('la rama no pisa la ruta: el hecho manda sobre la declaración', () => {
    // Un artefacto **vive** bajo la carpeta de su cambio; eso no se puede
    // equivocar. La rama afirma sobre el archivo por dónde se lo editó.
    const scope = deriveRepoCommitScope(
      ['openspec/changes/otro-cambio/tasks.md'],
      branch('mi-cambio'),
    );
    expect(scope.files[0].origin).toEqual({ kind: 'change', changeId: 'otro-cambio', source: 'path' });
  });

  it('los restos de un archivado tampoco se reatribuyen', () => {
    const scope = deriveRepoCommitScope(
      ['openspec/changes/archive/2026-08-01-viejo/tasks.md', 'openspec/specs/una-capacidad/spec.md'],
      branch('mi-cambio'),
    );
    expect(scope.files.map((entry) => entry.origin)).toEqual([{ kind: 'archived' }, { kind: 'archived' }]);
  });

  it('las dos fuentes no se mezclan en un grupo', () => {
    // Un grupo no podría declarar una sola procedencia si adentro conviven un
    // hecho de ubicación y una declaración de rama.
    const scope = deriveRepoCommitScope(
      ['openspec/changes/mi-cambio/tasks.md', 'components/algo.tsx'],
      branch('mi-cambio'),
    );

    expect(scope.groups.map((group) => group.key)).toEqual(['change:mi-cambio', 'branch:mi-cambio']);
  });
});

describe('el mensaje sugerido con la atribución', () => {
  it('un conjunto de puro código ya puede nombrar su cambio', () => {
    // Antes salía vacío incluso cuando la separación era posible, porque no
    // había dato con el cual intentarla.
    expect(suggestCommitMessage(['components/pipeline/algo.tsx'], branch('mi-cambio')))
      .toBe('chore(pipeline): mi-cambio');
  });

  it('sin atribución sigue saliendo sin descripción', () => {
    expect(suggestCommitMessage(['components/pipeline/algo.tsx'])).toBe('chore(pipeline): ');
  });

  it('trabajar en la rama de uno tocando artefactos de otro sigue mezclando', () => {
    // Dos identificadores, descripción vacía: es la señal visible de que el
    // commit mezcla trabajos, y llega antes de confirmar.
    expect(soleChangeId(['openspec/changes/otro/tasks.md', 'components/algo.tsx'], branch('mi-cambio')))
      .toBeNull();
  });

  it('la rama coincidiendo con los artefactos no rompe el caso corriente', () => {
    expect(suggestCommitMessage(
      ['openspec/changes/mi-cambio/tasks.md', 'components/pipeline/algo.tsx'],
      branch('mi-cambio'),
    )).toBe('chore(pipeline): mi-cambio');
  });

  it('un archivado sigue diciendo archived, sin que la rama lo tape', () => {
    expect(suggestCommitMessage(
      ['openspec/changes/archive/2026-08-01-viejo/tasks.md'],
      branch('mi-cambio'),
    )).toBe('chore: archived viejo');
  });
});
