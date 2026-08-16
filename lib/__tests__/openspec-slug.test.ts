import { describe, expect, it } from 'vitest';
import {
  MAX_OPENSPEC_CHANGE_SLUG,
  isValidOpenSpecChangeSlug,
  OPENSPEC_CHANGE_SLUG_PATTERN,
} from '../openspec-slug';
import { CHANGE_ID_PATTERN } from '../../electron/pipeline/openspec-cli';

describe('isValidOpenSpecChangeSlug y patrones expuestos (gramática OpenSpec 1.8)', () => {
  const valid = [
    'abc',
    'a-b',
    '1abc',
    '100-add-feature',
    '00001-add-auth',
    'a',
    'a1',
    'mi-cambio',
    'retirar-cambios-openspec-obsoletos',
    'actualizar-integracion-openspec-1-8',
  ];

  for (const value of valid) {
    it(`acepta válido: ${value}`, () => {
      expect(isValidOpenSpecChangeSlug(value)).toBe(true);
      expect(OPENSPEC_CHANGE_SLUG_PATTERN.test(value)).toBe(true);
      expect(CHANGE_ID_PATTERN.test(value)).toBe(true);
    });
  }

  const invalid: Record<string, string> = {
    'guiones consecutivos': 'a--b',
    'guion final': 'a-',
    'guion inicial': '-ab',
    mayusculas: 'Abc',
    underscore: 'a_b',
    punto: 'a.b',
    traversal: 'a/b',
    'doble punto': 'a..b',
    vacio: '',
    espacio: 'a b',
    'separador shell': 'a;b',
    pipe: 'a|b',
    comilla: "a'b",
  };

  for (const [reason, value] of Object.entries(invalid)) {
    it(`rechaza inválido (${reason}): ${JSON.stringify(value)}`, () => {
      expect(isValidOpenSpecChangeSlug(value)).toBe(false);
      expect(OPENSPEC_CHANGE_SLUG_PATTERN.test(value)).toBe(false);
      expect(CHANGE_ID_PATTERN.test(value)).toBe(false);
    });
  }

  it('MAX_OPENSPEC_CHANGE_SLUG es exactamente 200 según OpenSpec 1.8.0', () => {
    expect(MAX_OPENSPEC_CHANGE_SLUG).toBe(200);
  });

  it('el helper y ambos patrones expuestos coinciden: aceptan exactamente 200 caracteres', () => {
    const slug200 = '1' + 'a'.repeat(199);
    expect(slug200.length).toBe(200);
    expect(isValidOpenSpecChangeSlug(slug200)).toBe(true);
    expect(OPENSPEC_CHANGE_SLUG_PATTERN.test(slug200)).toBe(true);
    expect(CHANGE_ID_PATTERN.test(slug200)).toBe(true);
  });

  it('el helper y ambos patrones expuestos coinciden: rechazan 201 caracteres', () => {
    const slug201 = '1' + 'a'.repeat(200);
    expect(slug201.length).toBe(201);
    expect(isValidOpenSpecChangeSlug(slug201)).toBe(false);
    expect(OPENSPEC_CHANGE_SLUG_PATTERN.test(slug201)).toBe(false);
    expect(CHANGE_ID_PATTERN.test(slug201)).toBe(false);
  });

  it('rechaza valores que no son string', () => {
    expect(isValidOpenSpecChangeSlug(null)).toBe(false);
    expect(isValidOpenSpecChangeSlug(undefined)).toBe(false);
    expect(isValidOpenSpecChangeSlug(123)).toBe(false);
  });
});
