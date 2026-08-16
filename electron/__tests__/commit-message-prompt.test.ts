import { describe, expect, it } from 'vitest';
import {
  buildUserPrompt,
  CHARS_PER_TOKEN,
  inputBudgetChars,
  isConventionalSubject,
  SYSTEM_PROMPT,
  truncateDiff,
} from '../ai/commit-message/prompt';

/**
 * Qué se le manda al modelo.
 *
 * Puro sobre sus entradas, por el mismo motivo que `lib/change-commit-scope.ts`:
 * se prueba con tablas y no termina sabiendo de Git.
 */

const diffDe = (lineas: number) => Array.from({ length: lineas }, (_, i) => `+linea ${i}`).join('\n');

describe('la instrucción del sistema (SYSTEM_PROMPT)', () => {
  it('pide asunto convencional, línea en blanco y cuerpo explicativo opcional', () => {
    expect(SYSTEM_PROMPT).toContain('asunto convencional');
    expect(SYSTEM_PROMPT).toContain('Una línea en blanco');
    expect(SYSTEM_PROMPT).toContain('Cuerpo breve en prosa en castellano');
    expect(SYSTEM_PROMPT).toContain('qué cambia y por qué');
  });

  it('no exige un conteo ni límite numérico de caracteres al modelo', () => {
    expect(SYSTEM_PROMPT).not.toContain('Máximo 72 caracteres');
    expect(SYSTEM_PROMPT).not.toMatch(/\d+\s*caracteres/i);
  });
});

describe('el presupuesto de entrada', () => {
  it('se queda corto a propósito', () => {
    // Medido: 14.782 caracteres dieron 4.649 tokens, o sea 3,18 por token. Se
    // usa 3 para que la estimación no se pase: pasarse del contexto es un fallo
    // duro, recortar de más sólo cuesta detalle.
    expect(CHARS_PER_TOKEN).toBeLessThan(3.18);
    // La mitad del contexto queda para razonar y responder, que es lo que más
    // consume en los modelos medidos.
    expect(inputBudgetChars(65_536)).toBe(98_304);
  });

  it('un contexto ridículo no produce un presupuesto negativo', () => {
    expect(inputBudgetChars(0)).toBe(0);
  });
});

describe('el recorte del diff', () => {
  it('no toca lo que entra', () => {
    const diff = diffDe(3);
    expect(truncateDiff(diff, 10_000)).toEqual({ text: diff, truncated: false, originalLength: diff.length });
  });

  it('corta en un límite de línea, no al medio', () => {
    const resultado = truncateDiff(diffDe(50), 100);

    expect(resultado.truncated).toBe(true);
    expect(resultado.text.endsWith('\n')).toBe(false);
    // Ninguna línea quedó partida.
    for (const linea of resultado.text.split('\n')) expect(linea).toMatch(/^\+linea \d+$/);
  });

  it('declara el tamaño original, para poder decir cuánto se perdió', () => {
    const diff = diffDe(50);
    expect(truncateDiff(diff, 100).originalLength).toBe(diff.length);
  });
});

describe('el mensaje que se arma', () => {
  const base = {
    changeId: 'draft-commit-message-with-local-ai',
    intent: 'Redactar el asunto con un modelo local.',
    tickedTasks: ['- [x] 2.1 Proveedor con endpoint configurable'],
    stat: ' electron/ai/commit-message/prompt.ts | 40 ++++',
    diff: { text: '+algo', truncated: false, originalLength: 5 },
  };

  it('pone el encuadre primero y el diff al final', () => {
    // Si algo se recorta es el diff, así que conviene que lo que se pierda sea
    // su cola y no el encuadre.
    const prompt = buildUserPrompt(base);
    expect(prompt.indexOf('Cambio de OpenSpec')).toBeLessThan(prompt.indexOf('Diff:'));
    expect(prompt.indexOf('Intención')).toBeLessThan(prompt.indexOf('Diff:'));
  });

  it('omite entero lo que falta, en vez de dejar la sección vacía', () => {
    // Una sección con un hueco invita al modelo a rellenarla.
    const prompt = buildUserPrompt({ ...base, changeId: null, intent: null, tickedTasks: [], stat: '  ' });
    expect(prompt).not.toContain('Cambio de OpenSpec');
    expect(prompt).not.toContain('Intención');
    expect(prompt).not.toContain('Tareas');
    expect(prompt).not.toContain('Archivos tocados');
    expect(prompt).toContain('Diff:');
  });

  it('avisa dentro del propio prompt cuando el diff va recortado', () => {
    const prompt = buildUserPrompt({
      ...base,
      diff: { text: '+algo', truncated: true, originalLength: 40_000 },
    });
    expect(prompt).toContain('recortado');
    expect(prompt).toContain('40000');
  });
});

describe('la forma del asunto devuelto', () => {
  it('acepta lo que tiene la forma pedida en una sola línea (comportamiento actual intacto)', () => {
    expect(isConventionalSubject('feat(pipeline): atribuir archivos por la rama')).toBe(true);
    expect(isConventionalSubject('chore: archivar el cambio')).toBe(true);
    expect(isConventionalSubject('style(pipeline): cambiar color de avisos a ámbar')).toBe(true);
  });

  it('acepta un mensaje multilínea con asunto convencional válido seguido de cuerpo explicativo', () => {
    const multiline = [
      'feat(pipeline): agregar guarda de contención en resolución de ejecutable',
      '',
      'Unifica validRepoPath en shared.ts y comprueba que la ruta canónica',
      'no escape del directorio del repositorio.',
    ].join('\n');
    expect(isConventionalSubject(multiline)).toBe(true);

    const multilineWithCrLf = 'fix(ipc): validar autorización\r\n\r\nCuerpo con saltos Windows.';
    expect(isConventionalSubject(multilineWithCrLf)).toBe(true);
  });

  it('rechaza lo que no se puede imponer en el campo (con o sin cuerpo)', () => {
    // Ofrecer algo mal formado obliga a corregirlo a mano, que es peor que no
    // sugerir nada.
    expect(isConventionalSubject('Corregí el color de los avisos')).toBe(false);
    expect(isConventionalSubject('Corregí el color de los avisos\n\nCuerpo explicativo.')).toBe(false);
    expect(isConventionalSubject('feat pipeline: sin los dos puntos')).toBe(false);
    expect(isConventionalSubject('feat(pipeline):')).toBe(false);
    expect(isConventionalSubject('')).toBe(false);
  });

  it('rechaza un tipo que el pedido no nombró (con o sin cuerpo)', () => {
    // Aceptarlo sería premiar que el modelo ignore la instrucción.
    expect(isConventionalSubject('wip(pipeline): a medio hacer')).toBe(false);
    expect(isConventionalSubject('wip(pipeline): a medio hacer\n\nCuerpo del wip.')).toBe(false);
  });

  it('no rechaza por largo en el asunto', () => {
    const largo = `feat(pipeline): ${'a'.repeat(80)}`;
    expect(isConventionalSubject(largo)).toBe(true);
  });
});
