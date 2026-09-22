import { describe, expect, it } from 'vitest';
import { extractTaskNumber, suggestNextTaskNumber } from '../task-numbering';

describe('suggestNextTaskNumber (Tarea 4.11)', () => {
  it('archivo vacío sugiere 1.1', () => {
    expect(suggestNextTaskNumber([])).toBe('1.1');
    expect(suggestNextTaskNumber('')).toBe('1.1');
    expect(suggestNextTaskNumber('   \n\n')).toBe('1.1');
  });

  it('si el archivo viene en 1.1, 1.2, sugiere 1.3', () => {
    const tasks = [
      { text: '1.1 Primera tarea' },
      { text: '1.2 Segunda tarea' },
    ];
    expect(suggestNextTaskNumber(tasks)).toBe('1.3');

    const markdown = [
      '## 1. Grupo inicial',
      '- [ ] 1.1 Primera tarea',
      '- [x] 1.2 Segunda tarea',
    ].join('\n');
    expect(suggestNextTaskNumber(markdown)).toBe('1.3');
  });

  it('si se inserta en un grupo vacío 2, sugiere 2.1', () => {
    // Caso A: targetGroup explícito
    const tasks = [
      { text: '1.1 Primera tarea' },
      { text: '1.2 Segunda tarea' },
    ];
    expect(suggestNextTaskNumber(tasks, { targetGroup: 2 })).toBe('2.1');

    // Caso B: markdown con encabezado de grupo vacío al final
    const markdown = [
      '## 1. Primer grupo',
      '- [ ] 1.1 Tarea uno',
      '- [ ] 1.2 Tarea dos',
      '',
      '## 2. Segundo grupo vacío',
    ].join('\n');
    expect(suggestNextTaskNumber(markdown)).toBe('2.1');

    // Caso C: tasks array + options.markdown
    expect(suggestNextTaskNumber(tasks, { markdown })).toBe('2.1');
  });

  it('si la última tarea no tiene número, calcula a partir de la última numerada', () => {
    const tasks = [
      { text: '1.1 Primera tarea' },
      { text: '1.2 Segunda tarea' },
      { text: 'Tarea sin número agregada manualmente' },
      { text: 'Otra tarea sin número' },
    ];
    expect(suggestNextTaskNumber(tasks)).toBe('1.3');
  });

  it('si ninguna tarea tiene número, arranca el grupo', () => {
    // Sin encabezado: arranca en 1.1
    const tasksWithoutNum = [
      { text: 'Tarea suelta A' },
      { text: 'Tarea suelta B' },
    ];
    expect(suggestNextTaskNumber(tasksWithoutNum)).toBe('1.1');

    // Con encabezado de grupo 3: arranca en 3.1
    const markdownWithGroup3 = [
      '## 3. Tercera tanda',
      '- [ ] Tarea no numerada',
      '- [ ] Otra sin número',
    ].join('\n');
    expect(suggestNextTaskNumber(markdownWithGroup3)).toBe('3.1');
  });

  it('nunca repite un número existente en el archivo', () => {
    // Supongamos que 1.3 ya existe en el archivo más adelante o disperso
    const tasksWithHole = [
      { text: '1.1 Tarea inicial' },
      { text: '1.2 Tarea segunda' },
      { text: '1.3 Tarea ya existente' },
    ];
    expect(suggestNextTaskNumber(tasksWithHole)).toBe('1.4');

    // Si 1.3 y 1.4 ya están en el archivo, salta a 1.5
    const tasksMultiple = [
      { text: '1.1 Uno' },
      { text: '1.2 Dos' },
      { text: '1.3 Tres' },
      { text: '1.4 Cuatro' },
    ];
    expect(suggestNextTaskNumber(tasksMultiple)).toBe('1.5');

    // Si se inserta en grupo 1 donde 1.1 y 1.2 existen, pero 1.3 ya fue usado en otra parte
    const tasksDispersed = [
      { text: '1.1 Uno' },
      { text: '1.2 Dos' },
      { text: '1.3 Tres' },
      { text: '2.1 En otro grupo' },
    ];
    // Al insertar en grupo 1, debe ser 1.4 (no 1.3)
    expect(suggestNextTaskNumber(tasksDispersed, { targetGroup: 1 })).toBe('1.4');
  });

  it('inserción contextual después de una tarea concreta', () => {
    const tasks = [
      { id: 't-1', text: '1.1 Primera' },
      { id: 't-2', text: '1.2 Segunda' },
      { id: 't-3', text: '2.1 En grupo 2' },
      { id: 't-4', text: '2.2 Segunda en grupo 2' },
    ];

    // Insertar después de 1.2 (que es t-2): grupo 1, debe sugerir 1.3
    expect(suggestNextTaskNumber(tasks, { insertAfterId: 't-2' })).toBe('1.3');

    // Insertar después de 2.1 (que es t-3): si 2.2 existe, no repite 2.2 y busca el siguiente libre (2.3)
    expect(suggestNextTaskNumber(tasks, { insertAfterId: 't-3' })).toBe('2.3');
  });

  it('extractTaskNumber parsea correctamente prefijos con o sin casilla', () => {
    expect(extractTaskNumber('1.1 Primera tarea')).toEqual({ group: 1, sub: 1, raw: '1.1' });
    expect(extractTaskNumber('- [ ] 2.5 Otra tarea')).toEqual({ group: 2, sub: 5, raw: '2.5' });
    expect(extractTaskNumber('- [x] 10.12 Avanzada')).toEqual({ group: 10, sub: 12, raw: '10.12' });
    expect(extractTaskNumber('Sin número')).toBeNull();
  });
});
