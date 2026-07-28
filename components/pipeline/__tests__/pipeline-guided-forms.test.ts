import { describe, expect, it } from 'vitest';
import { canStartRuntimeSession, validateExploreForm, validateProposeForm } from '../pipeline-guided-forms';

const launchable = {
  blockedByFixture: false,
  runtimeSelected: 'claude',
  runtimeLaunchable: true,
  instruction: '/opsx:apply c1',
  sessionActive: false,
  busy: false,
};

describe('validateProposeForm', () => {
  it('exige el objetivo y lleva el foco a ese campo', () => {
    const result = validateProposeForm({ objective: '   ', slug: 'mi-cambio' });
    expect(result.errors.objective).toBe('pipeline.newChange.error.objective');
    expect(result.focus).toBe('objective');
    expect(result.instruction).toBeNull();
  });

  it('rechaza un slug inválido', () => {
    const result = validateProposeForm({ objective: 'lograr X', slug: 'Mal_Nombre' });
    expect(result.errors.slug).toBe('pipeline.newChange.error.slug');
    expect(result.focus).toBe('slug');
    expect(result.instruction).toBeNull();
  });

  it('prioriza el objetivo cuando ambos campos fallan', () => {
    const result = validateProposeForm({ objective: '', slug: '' });
    expect(result.focus).toBe('objective');
    expect(result.errors.slug).toBe('pipeline.newChange.error.slug');
  });

  it('compone la instrucción exacta cuando es válido', () => {
    const result = validateProposeForm({ objective: 'lograr X', slug: 'mi-cambio', constraints: 'sin tocar Y' });
    expect(result.errors).toEqual({});
    expect(result.focus).toBeNull();
    expect(result.instruction).toBe('/opsx:propose mi-cambio\n\nObjetivo: lograr X\nAlcance y restricciones: sin tocar Y');
  });

  it('no emite una línea de alcance vacía', () => {
    const result = validateProposeForm({ objective: 'lograr X', slug: 'mi-cambio', constraints: '   ' });
    expect(result.instruction).toBe('/opsx:propose mi-cambio\n\nObjetivo: lograr X');
  });
});

describe('validateExploreForm', () => {
  it('exige una descripción', () => {
    const result = validateExploreForm({ description: '  ' });
    expect(result.errors.description).toBe('pipeline.newChange.error.description');
    expect(result.focus).toBe('description');
    expect(result.instruction).toBeNull();
  });

  it('compone la instrucción exacta', () => {
    const result = validateExploreForm({ description: 'una idea' });
    expect(result.instruction).toBe('/opsx:explore\n\nQuiero explorar: una idea');
    expect(result.focus).toBeNull();
  });
});

describe('canStartRuntimeSession', () => {
  it('permite arrancar cuando todo está en orden', () => {
    expect(canStartRuntimeSession(launchable)).toBe(true);
  });

  it('nunca arranca con datos de vista previa en pantalla', () => {
    expect(canStartRuntimeSession({ ...launchable, blockedByFixture: true })).toBe(false);
  });

  it('no arranca con un runtime no lanzable', () => {
    expect(canStartRuntimeSession({ ...launchable, runtimeLaunchable: false })).toBe(false);
  });

  it('no arranca sin runtime elegido', () => {
    expect(canStartRuntimeSession({ ...launchable, runtimeSelected: '' })).toBe(false);
  });

  it('no duplica una sesión ya activa', () => {
    expect(canStartRuntimeSession({ ...launchable, sessionActive: true })).toBe(false);
  });

  it('no arranca con una instrucción vacía', () => {
    expect(canStartRuntimeSession({ ...launchable, instruction: '   ' })).toBe(false);
  });

  it('no arranca mientras hay una operación en curso', () => {
    expect(canStartRuntimeSession({ ...launchable, busy: true })).toBe(false);
  });
});
