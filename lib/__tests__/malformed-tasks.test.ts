import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findMalformedTaskLines } from '../malformed-tasks';

describe('findMalformedTaskLines (Tarea 8.3)', () => {
  it('detecta tareas mal formadas según la tabla de casos requerida', () => {
    const markdown = [
      '## 1. Grupo',
      '- [ ] 1.1 ok',
      '- [] 1.2 rota',
      '-[ ] 1.3 rota',
      '- [x] 1.4 ok',
      'una línea de prosa suelta',
    ].join('\n');

    const malformed = findMalformedTaskLines(markdown);
    expect(malformed).toHaveLength(2);

    expect(malformed[0]).toMatchObject({
      line: 3,
      raw: '- [] 1.2 rota',
    });
    expect(malformed[0].reason).toContain('casilla está vacía');

    expect(malformed[1]).toMatchObject({
      line: 4,
      raw: '-[ ] 1.3 rota',
    });
    expect(malformed[1].reason).toContain('guion debe estar separado');
  });

  it('detecta numeración de lista con casilla (1. [] y 1. [ ])', () => {
    const markdown = [
      '1. [] rota con corchetes vacíos',
      '1. [ ] rota con corchete normal',
      '2. [x] rota con casilla marcada',
    ].join('\n');

    const malformed = findMalformedTaskLines(markdown);
    expect(malformed).toHaveLength(3);
    expect(malformed.map((m) => m.line)).toEqual([1, 2, 3]);
    expect(malformed[0].reason).toContain('numeración');
  });

  it('detecta guion pegado a corchete marcado (-[x]) y símbolos inválidos (- [?])', () => {
    const markdown = [
      '-[x] pegada marcada',
      '- [?] símbolo desconocido',
      '- [/] progreso parcial no soportado en tareas puras',
      '- [  ] múltiples espacios dentro de casilla',
      '- [ ] ', // sin texto
    ].join('\n');

    const malformed = findMalformedTaskLines(markdown);
    expect(malformed).toHaveLength(5);
  });

  it('detecta viñetas con asterisco y casilla (* [ ])', () => {
    const markdown = [
      '* [ ] tarea con asterisco',
      '* [] tarea asterisco vacía',
    ].join('\n');

    const malformed = findMalformedTaskLines(markdown);
    expect(malformed).toHaveLength(2);
    expect(malformed[0].reason).toContain('asterisco');
  });

  it('no genera falsos positivos en encabezados, prosa, listas normales ni citas', () => {
    const cleanMarkdown = [
      '# Título del cambio',
      '## 1. Grupo de tareas',
      '### 1.1 Subgrupo',
      '',
      'Esta es una línea de prosa explicativa sobre el cambio.',
      'Otra línea de texto con guión - intercalado sin ser viñeta.',
      '',
      '- Elemento de lista regular sin corchetes',
      '- Otro elemento de lista común',
      '  - Sub-elemento identado',
      '1. Lista numerada regular',
      '2. Segundo elemento numerado regular',
      '',
      '> - [] Esta es una cita de código o texto ajeno en blockquote',
      '> > Anidada con -[ ] rota pero en cita',
      '',
      '- [ ] 1.1 Tarea perfectamente válida',
      '- [x] 1.2 Tarea marcada válida',
      '- [X] 1.3 Tarea con mayúscula válida',
      '  - [ ] 1.4 Tarea anidada válida',
      '',
      '- KNOWN_AI_KEY_PROVIDERS definido como tupla cerrada [\'claude\', \'openrouter\'].',
    ].join('\n');

    const malformed = findMalformedTaskLines(cleanMarkdown);
    expect(malformed).toEqual([]);
  });

  it('ignora bloques de código cercados con backticks o tildes', () => {
    const markdownWithCode = [
      '# Documentación',
      '',
      '```markdown',
      '- [] Este ejemplo dentro de un bloque de código no debe reportarse',
      '-[ ] Tampoco este',
      '1. [ ] Ni este',
      '```',
      '',
      '~~~markdown',
      '- [] Bloque con tildes',
      '~~~',
      '',
      '- [ ] 1.1 Tarea real afuera del bloque',
    ].join('\n');

    const malformed = findMalformedTaskLines(markdownWithCode);
    expect(malformed).toEqual([]);
  });

  it('devuelve cero falsos positivos contra el tasks.md real de este cambio', () => {
    const tasksPath = path.resolve(__dirname, '../../openspec/changes/gestionar-ciclo-openspec-desde-gitcron/tasks.md');
    const content = fs.readFileSync(tasksPath, 'utf8');

    const malformed = findMalformedTaskLines(content);
    // El tasks.md actual del repositorio no contiene tareas rotas: DEBE dar 0.
    expect(malformed).toEqual([]);

    // Sabotaje intencional: inyectar una tarea rota en el medio del archivo real
    const sabotagedContent = content.replace('## 8. Interfaz: tareas y artefactos', '## 8. Interfaz: tareas y artefactos\n- [] 8.0 tarea rota inyectada');
    const detected = findMalformedTaskLines(sabotagedContent);
    expect(detected.length).toBeGreaterThanOrEqual(1);
    expect(detected.some((d) => d.raw.includes('- [] 8.0'))).toBe(true);
  });
});
