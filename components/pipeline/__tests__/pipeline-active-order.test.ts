import { describe, expect, it } from 'vitest';
import { sortActiveChangesByProgress } from '../pipeline-view-state';

/**
 * Orden de la lista de cambios activos.
 *
 * Antes no había ninguno: la lista llegaba en el orden en que el sistema de
 * archivos lista el directorio, así que un cambio al 96% podía quedar debajo de
 * tres parqueados en 0%.
 */

function task(completed: boolean) {
  return { id: `t${completed}`, text: 'x', completed, line: 1, sourceRef: 'tasks.md:1' };
}

function change(changeId: string, done: number, total: number, createdAt?: string) {
  return {
    changeId,
    tasks: [
      ...Array.from({ length: done }, () => task(true)),
      ...Array.from({ length: total - done }, () => task(false)),
    ],
    ...(createdAt ? { createdAt: { at: createdAt, source: 'commit' as const } } : {}),
  };
}

const ids = (list: Array<{ changeId: string }>) => list.map((entry) => entry.changeId);

describe('orden de los cambios activos', () => {
  it('pone primero los más completados', () => {
    const sorted = sortActiveChangesByProgress([
      change('apenas', 1, 10),
      change('casi', 9, 10),
      change('medio', 5, 10),
    ]);
    expect(ids(sorted)).toEqual(['casi', 'medio', 'apenas']);
  });

  it('compara la proporción y no la cantidad de tareas hechas', () => {
    // Tres de cuatro está más avanzado que cinco de veinte, aunque sean menos
    // casillas tildadas.
    const sorted = sortActiveChangesByProgress([
      change('cinco-de-veinte', 5, 20),
      change('tres-de-cuatro', 3, 4),
    ]);
    expect(ids(sorted)).toEqual(['tres-de-cuatro', 'cinco-de-veinte']);
  });

  it('entre dos sin empezar, primero el creado más recientemente', () => {
    // El caso que motiva el desempate: los recién creados y los parqueados hace
    // semanas comparten el 0%, y sin esto lo nuevo caía al fondo.
    const sorted = sortActiveChangesByProgress([
      change('parqueado', 0, 16, '2026-07-31T10:00:00-03:00'),
      change('recien-creado', 0, 12, '2026-08-07T09:00:00-03:00'),
    ]);
    expect(ids(sorted)).toEqual(['recien-creado', 'parqueado']);
  });

  it('un cambio sin ninguna tarea cuenta como sin empezar', () => {
    const sorted = sortActiveChangesByProgress([
      change('sin-tareas', 0, 0, '2026-08-07T09:00:00-03:00'),
      change('empezado', 2, 10, '2026-07-01T09:00:00-03:00'),
    ]);
    expect(ids(sorted)).toEqual(['empezado', 'sin-tareas']);
  });

  it('sin marca de creación cae al identificador, sin inventar posición', () => {
    const sorted = sortActiveChangesByProgress([
      change('zeta', 0, 5),
      change('alfa', 0, 5),
    ]);
    expect(ids(sorted)).toEqual(['alfa', 'zeta']);
  });

  it('no muta la lista recibida', () => {
    // El orden no puede depender de cuántas veces lo llame la vista.
    const original = [change('apenas', 1, 10), change('casi', 9, 10)];
    const before = ids(original);
    sortActiveChangesByProgress(original);
    expect(ids(original)).toEqual(before);
  });

  it('el mismo conjunto produce siempre el mismo orden', () => {
    const list = [
      change('a', 0, 5, '2026-08-01T10:00:00-03:00'),
      change('b', 0, 5, '2026-08-01T10:00:00-03:00'),
      change('c', 3, 5),
    ];
    expect(ids(sortActiveChangesByProgress(list)))
      .toEqual(ids(sortActiveChangesByProgress(list)));
  });
});
