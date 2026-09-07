import { describe, expect, it } from 'vitest';
import {
  addTaskLine,
  appendTaskLogEntry,
  composeTaskLogEntry,
  editTaskText,
  moveTaskLine,
  removeTaskLine,
  toggleTaskCheckbox,
} from '../pipeline/task-checkbox';

const TASKS = [
  '## 1. Primera tanda',
  '',
  '- [ ] 1.1 hacer algo',
  '- [x] 1.2 ya estaba hecho',
  '',
  '## 2. Segunda tanda',
  '',
  '- [ ] 2.1 hacer algo',
  '',
].join('\n');

describe('cambiar el estado de una tarea', () => {
  it('marca sólo esa línea y deja el resto igual', () => {
    const result = toggleTaskCheckbox(TASKS, 3, '1.1 hacer algo', true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.split('\n')[2]).toBe('- [x] 1.1 hacer algo');
    // Todo lo demás intacto, incluida la tarea homónima de la otra sección.
    expect(result.content.split('\n')[3]).toBe('- [x] 1.2 ya estaba hecho');
    expect(result.content.split('\n')[7]).toBe('- [ ] 2.1 hacer algo');
  });

  it('desmarca una tarea marcada', () => {
    const result = toggleTaskCheckbox(TASKS, 4, '1.2 ya estaba hecho', false);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.split('\n')[3]).toBe('- [ ] 1.2 ya estaba hecho');
  });

  it('no escribe nada si el texto de esa línea cambió', () => {
    // Con el watcher andando el archivo puede cambiar entre que se dibujó la
    // pantalla y llegó el clic: marcar igual sería marcar otra tarea.
    const result = toggleTaskCheckbox(TASKS, 3, '1.1 otra cosa distinta', true);

    expect(result).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('no confunde dos tareas con el mismo texto en secciones distintas', () => {
    // `1.1 hacer algo` y `2.1 hacer algo` comparten descripción: por eso se
    // ubica por línea y no por búsqueda de texto.
    const result = toggleTaskCheckbox(TASKS, 8, '2.1 hacer algo', true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.split('\n')[2]).toBe('- [ ] 1.1 hacer algo');
    expect(result.content.split('\n')[7]).toBe('- [x] 2.1 hacer algo');
  });

  it('informa cuando la línea no es una casilla de tarea', () => {
    expect(toggleTaskCheckbox(TASKS, 1, '## 1. Primera tanda', true))
      .toEqual({ ok: false, reason: 'not-found' });
    expect(toggleTaskCheckbox(TASKS, 999, 'lo que sea', true))
      .toEqual({ ok: false, reason: 'not-found' });
  });

  it('conserva la sangría de una tarea anidada', () => {
    const nested = '  - [ ] 3.1 tarea sangrada';
    const result = toggleTaskCheckbox(nested, 1, '3.1 tarea sangrada', true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toBe('  - [x] 3.1 tarea sangrada');
  });
});

describe('agregar una tarea (addTaskLine)', () => {
  it('agrega en un archivo vacío', () => {
    const result = addTaskLine('', '1.1 tarea inicial');
    expect(result).toEqual({
      ok: true,
      content: '- [ ] 1.1 tarea inicial\n',
      text: '1.1 tarea inicial',
    });
  });

  it('agrega al final en un archivo sin salto de línea final', () => {
    const withoutEol = '## 1. Tanda\n- [ ] 1.1 hacer algo';
    const result = addTaskLine(withoutEol, '1.2 segunda tarea');
    expect(result).toEqual({
      ok: true,
      content: '## 1. Tanda\n- [ ] 1.1 hacer algo\n- [ ] 1.2 segunda tarea',
      text: '1.2 segunda tarea',
    });
  });

  it('agrega al final en un archivo con salto de línea final preservando el salto', () => {
    const withEol = '## 1. Tanda\n- [ ] 1.1 hacer algo\n';
    const result = addTaskLine(withEol, '1.2 segunda tarea');
    expect(result).toEqual({
      ok: true,
      content: '## 1. Tanda\n- [ ] 1.1 hacer algo\n- [ ] 1.2 segunda tarea\n',
      text: '1.2 segunda tarea',
    });
  });

  it('agrega debajo de una línea específica preservando sangría', () => {
    const content = [
      '## 1. Tanda',
      '  - [ ] 1.1 sangrada',
      '  - [ ] 1.3 posterior',
    ].join('\n');

    const result = addTaskLine(content, '1.2 nueva', {
      line: 2,
      position: 'below',
      expectedText: '1.1 sangrada',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.split('\n')).toEqual([
      '## 1. Tanda',
      '  - [ ] 1.1 sangrada',
      '  - [ ] 1.2 nueva',
      '  - [ ] 1.3 posterior',
    ]);
  });

  it('agrega encima de una línea específica (position: above)', () => {
    const result = addTaskLine(TASKS, '1.0 previa', {
      line: 3,
      position: 'above',
      expectedText: '1.1 hacer algo',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.split('\n')[2]).toBe('- [ ] 1.0 previa');
    expect(result.content.split('\n')[3]).toBe('- [ ] 1.1 hacer algo');
  });

  it('rechaza con mismatch si expectedText no coincide con la línea de referencia', () => {
    const result = addTaskLine(TASKS, '1.3 nueva', {
      line: 3,
      expectedText: 'texto cambiado',
    });
    expect(result).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('rechaza si la línea de referencia está fuera de rango', () => {
    const result = addTaskLine(TASKS, '1.3 nueva', { line: 999 });
    expect(result).toEqual({ ok: false, reason: 'out-of-bounds' });
  });

  it('rechaza si el texto está vacío', () => {
    expect(addTaskLine(TASKS, '')).toEqual({ ok: false, reason: 'empty-text' });
    expect(addTaskLine(TASKS, '   ')).toEqual({ ok: false, reason: 'empty-text' });
    expect(addTaskLine(TASKS, '- [ ] ')).toEqual({ ok: false, reason: 'empty-text' });
  });

  it('limpia prefijos de checkbox si el llamador los incluyó en el texto', () => {
    const result = addTaskLine('', '- [ ] 2.6 tarea con prefijo');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toBe('- [ ] 2.6 tarea con prefijo\n');
    expect(result.text).toBe('2.6 tarea con prefijo');
  });
});

describe('editar texto de una tarea (editTaskText)', () => {
  it('preserva sangría, estado [x] y numeración existente al editar', () => {
    const content = [
      '## 1. Tanda',
      '  - [x] 1.2 ya estaba hecho',
      '- [ ] 1.3 siguiente',
    ].join('\n');

    const result = editTaskText(content, 2, '1.2 ya estaba hecho', 'completado y revisado');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.split('\n')[1]).toBe('  - [x] 1.2 completado y revisado');
    expect(result.text).toBe('1.2 completado y revisado');
  });

  it('no duplica el número si el llamador lo incluye en el nuevo texto', () => {
    const result = editTaskText(TASKS, 3, '1.1 hacer algo', '1.1 hacer algo mejor');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.split('\n')[2]).toBe('- [ ] 1.1 hacer algo mejor');
    expect(result.text).toBe('1.1 hacer algo mejor');
  });

  it('edita correctamente una tarea sin número sin inventar numeración', () => {
    const content = '- [ ] tarea simple sin numero';
    const result = editTaskText(content, 1, 'tarea simple sin numero', 'tarea simple actualizada');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toBe('- [ ] tarea simple actualizada');
  });

  it('rechaza con mismatch ante discrepancia exacta (no tolera prefijos)', () => {
    // A diferencia de toggleCheckbox, editTaskText exige coincidencia estricta:
    // no permite que expectedText empiece con el actual si no es idéntico.
    const result = editTaskText(TASKS, 3, '1.1 hacer', 'nuevo texto');
    expect(result).toEqual({ ok: false, reason: 'mismatch' });

    const result2 = editTaskText(TASKS, 3, '1.1 hacer algo y algo mas', 'nuevo texto');
    expect(result2).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('rechaza con not-a-task si la línea no es una tarea (encabezado o línea rota)', () => {
    expect(editTaskText(TASKS, 1, '## 1. Primera tanda', 'nuevo')).toEqual({
      ok: false,
      reason: 'not-a-task',
    });

    const brokenContent = '- [] 1.1 tarea rota sin espacio';
    expect(editTaskText(brokenContent, 1, '1.1 tarea rota sin espacio', 'nuevo')).toEqual({
      ok: false,
      reason: 'not-a-task',
    });
  });

  it('rechaza si la línea está fuera de rango', () => {
    expect(editTaskText(TASKS, 0, 'algo', 'nuevo')).toEqual({ ok: false, reason: 'not-found' });
    expect(editTaskText(TASKS, 999, 'algo', 'nuevo')).toEqual({ ok: false, reason: 'not-found' });
  });

  it('rechaza si el nuevo texto está vacío', () => {
    expect(editTaskText(TASKS, 3, '1.1 hacer algo', '')).toEqual({
      ok: false,
      reason: 'empty-text',
    });
  });

  it('no modifica ninguna línea vecina (comparación de archivo completo)', () => {
    const originalLines = TASKS.split('\n');
    const result = editTaskText(TASKS, 3, '1.1 hacer algo', '1.1 modificado');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const newLines = result.content.split('\n');
    // Línea 3 (índice 2) es la única cambiada
    expect(newLines[2]).toBe('- [ ] 1.1 modificado');
    // Todas las demás líneas son exactamente idénticas antes y después
    const othersBefore = originalLines.filter((_, idx) => idx !== 2);
    const othersAfter = newLines.filter((_, idx) => idx !== 2);
    expect(othersAfter).toEqual(othersBefore);
  });
});

describe('mover una tarea (moveTaskLine)', () => {
  it('mueve una tarea entre líneas sin renumerar nada ajeno ni propio (2.6.a)', () => {
    const result = moveTaskLine(TASKS, 3, 4, '1.1 hacer algo');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = result.content.split('\n');
    expect(lines[2]).toBe('- [x] 1.2 ya estaba hecho');
    expect(lines[3]).toBe('- [ ] 1.1 hacer algo');
  });

  it('mueve la primera tarea hacia el final', () => {
    const content = [
      '- [ ] 1.1 primera',
      '- [ ] 1.2 segunda',
      '- [ ] 1.3 tercera',
    ].join('\n');

    const result = moveTaskLine(content, 1, 3, '1.1 primera');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.split('\n')).toEqual([
      '- [ ] 1.2 segunda',
      '- [ ] 1.3 tercera',
      '- [ ] 1.1 primera',
    ]);
  });

  it('mueve la última tarea hacia el inicio', () => {
    const content = [
      '- [ ] 1.1 primera',
      '- [ ] 1.2 segunda',
      '- [ ] 1.3 tercera',
    ].join('\n');

    const result = moveTaskLine(content, 3, 1, '1.3 tercera');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.split('\n')).toEqual([
      '- [ ] 1.3 tercera',
      '- [ ] 1.1 primera',
      '- [ ] 1.2 segunda',
    ]);
  });

  it('mover a la misma posición devuelve ok: true y contenido idéntico', () => {
    const result = moveTaskLine(TASKS, 3, 3, '1.1 hacer algo');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toBe(TASKS);
    expect(result.text).toBe('1.1 hacer algo');
  });

  it('rechaza con mismatch ante discrepancia de texto exacta', () => {
    const result = moveTaskLine(TASKS, 3, 4, '1.1 texto incorrecto');
    expect(result).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('rechaza si origen o destino están fuera de rango', () => {
    expect(moveTaskLine(TASKS, 0, 3, '1.1 hacer algo')).toEqual({ ok: false, reason: 'not-found' });
    expect(moveTaskLine(TASKS, 999, 3, '1.1 hacer algo')).toEqual({ ok: false, reason: 'not-found' });
    expect(moveTaskLine(TASKS, 3, 999, '1.1 hacer algo')).toEqual({ ok: false, reason: 'out-of-bounds' });
  });

  it('rechaza con not-a-task si la línea de origen no es una tarea o está rota', () => {
    expect(moveTaskLine(TASKS, 1, 3, '## 1. Primera tanda')).toEqual({
      ok: false,
      reason: 'not-a-task',
    });

    const broken = '- [] 1.1 rota\n- [ ] 1.2 valida';
    expect(moveTaskLine(broken, 1, 2, '1.1 rota')).toEqual({
      ok: false,
      reason: 'not-a-task',
    });
  });

  it('no altera el orden relativo de líneas ajenas al movimiento', () => {
    const content = [
      '- [ ] 1.1 a',
      '- [ ] 1.2 b',
      '- [ ] 1.3 c',
      '- [ ] 1.4 d',
      '- [ ] 1.5 e',
    ].join('\n');

    // Mover 1.2 b a posición 4
    const result = moveTaskLine(content, 2, 4, '1.2 b');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Las demás líneas (1.1 a, 1.3 c, 1.4 d, 1.5 e) conservan su orden relativo
    const lines = result.content.split('\n');
    expect(lines).toEqual([
      '- [ ] 1.1 a',
      '- [ ] 1.3 c',
      '- [ ] 1.4 d',
      '- [ ] 1.2 b',
      '- [ ] 1.5 e',
    ]);
  });
});

describe('eliminar una tarea (removeTaskLine)', () => {
  it('elimina sólo esa línea y deja las vecinas intactas', () => {
    const originalLines = TASKS.split('\n');
    const result = removeTaskLine(TASKS, 3, '1.1 hacer algo');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const newLines = result.content.split('\n');
    expect(newLines).toHaveLength(originalLines.length - 1);
    expect(newLines[2]).toBe('- [x] 1.2 ya estaba hecho');
    expect(newLines[6]).toBe('- [ ] 2.1 hacer algo');
  });

  it('borra la única tarea que queda dejando contenido vacío', () => {
    const single = '- [ ] 1.1 unica tarea que queda';
    const result = removeTaskLine(single, 1, '1.1 unica tarea que queda');

    expect(result).toEqual({
      ok: true,
      content: '',
      text: '1.1 unica tarea que queda',
    });
  });

  it('rechaza con mismatch ante discrepancia de texto', () => {
    const result = removeTaskLine(TASKS, 3, '1.1 texto diferente');
    expect(result).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('rechaza con not-a-task si la línea no es una tarea o tiene checkbox roto', () => {
    expect(removeTaskLine(TASKS, 1, '## 1. Primera tanda')).toEqual({
      ok: false,
      reason: 'not-a-task',
    });

    const broken = '- [] 1.1 rota';
    expect(removeTaskLine(broken, 1, '1.1 rota')).toEqual({
      ok: false,
      reason: 'not-a-task',
    });
  });

  it('rechaza si la línea está fuera de rango', () => {
    expect(removeTaskLine(TASKS, 0, 'algo')).toEqual({ ok: false, reason: 'not-found' });
    expect(removeTaskLine(TASKS, 999, 'algo')).toEqual({ ok: false, reason: 'not-found' });
  });
});

describe('registro de cambios de estado y autoría (2.2 y 2.6.b)', () => {
  it('soporta operaciones con actor especificado (persona o agente)', () => {
    expect(
      composeTaskLogEntry('2026-08-04T10:42:00.000Z', '6.5 Ale valida el panel', 'marcada', 'persona'),
    ).toBe('- 2026-08-04 10:42 — persona — marcada — "6.5 Ale valida el panel"');

    expect(
      composeTaskLogEntry('2026-08-04T10:43:00.000Z', '2.6 Nueva tarea de spec', 'agregada', 'agente'),
    ).toBe('- 2026-08-04 10:43 — agente — agregada — "2.6 Nueva tarea de spec"');

    expect(
      composeTaskLogEntry('2026-08-04T10:44:00.000Z', '3.1 Tarea editada', 'editada', 'persona'),
    ).toBe('- 2026-08-04 10:44 — persona — editada — "3.1 Tarea editada"');

    expect(
      composeTaskLogEntry('2026-08-04T10:45:00.000Z', '3.2 Tarea movida', 'movida', 'agente'),
    ).toBe('- 2026-08-04 10:45 — agente — movida — "3.2 Tarea movida"');

    expect(
      composeTaskLogEntry('2026-08-04T10:46:00.000Z', '3.3 Tarea descartada', 'eliminada', 'persona'),
    ).toBe('- 2026-08-04 10:46 — persona — eliminada — "3.3 Tarea descartada"');
  });

  it('conserva compatibilidad sin actor sin inventar procedencia', () => {
    expect(composeTaskLogEntry('2026-08-04T10:42:00.000Z', '6.5 Ale valida el panel', true))
      .toBe('- 2026-08-04 10:42 — marcada — "6.5 Ale valida el panel"');
    expect(composeTaskLogEntry('2026-08-04T10:45:00.000Z', '6.3 pnpm test verde', false))
      .toBe('- 2026-08-04 10:45 — desmarcada — "6.3 pnpm test verde"');
    expect(composeTaskLogEntry('2026-08-04T10:48:00.000Z', '2.1 tarea sin actor', 'agregada'))
      .toBe('- 2026-08-04 10:48 — agregada — "2.1 tarea sin actor"');
  });

  it('crea el registro con su nuevo encabezado # Registro de tareas la primera vez (2.6.b)', () => {
    const entry = '- 2026-08-04 10:42 — persona — marcada — "1.1 algo"';
    expect(appendTaskLogEntry(null, entry)).toBe(`# Registro de tareas\n\n${entry}\n`);
    expect(appendTaskLogEntry('', entry)).toBe(`# Registro de tareas\n\n${entry}\n`);
  });

  it('conserva encabezados existentes # Registro de tildes sin sobreescribir ni duplicar (2.6.b)', () => {
    const existingOldLog = '# Registro de tildes\n\n- 2026-08-04 10:40 — marcada — "1.0 vieja"';
    const newEntry = '- 2026-08-04 10:42 — persona — agregada — "1.1 nueva"';

    const appended = appendTaskLogEntry(existingOldLog, newEntry);
    expect(appended).toBe(
      '# Registro de tildes\n\n- 2026-08-04 10:40 — marcada — "1.0 vieja"\n- 2026-08-04 10:42 — persona — agregada — "1.1 nueva"\n',
    );
  });

  it('agrega al final sin duplicar el encabezado nuevo', () => {
    const first = '- 2026-08-04 10:42 — marcada — "1.1 algo"';
    const second = '- 2026-08-04 10:45 — desmarcada — "1.1 algo"';
    const log = appendTaskLogEntry(appendTaskLogEntry(null, first), second);

    expect(log).toBe(`# Registro de tareas\n\n${first}\n${second}\n`);
  });
});
