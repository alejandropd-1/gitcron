import { describe, expect, it } from 'vitest';
import {
  appendTaskLogEntry,
  composeTaskLogEntry,
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

describe('registro de cambios de estado', () => {
  it('nombra la tarea y la dirección del cambio', () => {
    expect(composeTaskLogEntry('2026-08-04T10:42:00.000Z', '6.5 Ale valida el panel', true))
      .toBe('- 2026-08-04 10:42 — marcada — "6.5 Ale valida el panel"');
    expect(composeTaskLogEntry('2026-08-04T10:45:00.000Z', '6.3 pnpm test verde', false))
      .toBe('- 2026-08-04 10:45 — desmarcada — "6.3 pnpm test verde"');
  });

  it('crea el registro con su encabezado la primera vez', () => {
    const entry = '- 2026-08-04 10:42 — marcada — "1.1 algo"';
    expect(appendTaskLogEntry(null, entry)).toBe(`# Registro de tildes\n\n${entry}\n`);
  });

  it('agrega al final sin duplicar el encabezado', () => {
    const first = '- 2026-08-04 10:42 — marcada — "1.1 algo"';
    const second = '- 2026-08-04 10:45 — desmarcada — "1.1 algo"';
    const log = appendTaskLogEntry(appendTaskLogEntry(null, first), second);

    expect(log).toBe(`# Registro de tildes\n\n${first}\n${second}\n`);
  });
});
