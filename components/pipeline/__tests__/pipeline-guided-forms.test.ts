import { describe, expect, it } from 'vitest';
import { canStartRuntimeSession, validateExploreForm, validateProposeForm } from '../pipeline-guided-forms';
import { composeExploreInstruction, composeProposeInstruction } from '../pipeline-next-action';

const launchable = {
  blockedByFixture: false,
  runtimeSelected: 'claude',
  runtimeLaunchable: true,
  instruction: 'una instrucción cualquiera, no vacía',
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

  it('entrega la instrucción que compone la función, sin reescribirla', () => {
    // El formulario valida y delega: si armara su propio texto, lo que se
    // muestra bajo "Ver instrucción" y lo que se ejecuta podrían divergir.
    const result = validateProposeForm({ objective: 'lograr X', slug: 'mi-cambio', constraints: 'sin tocar Y' });
    expect(result.errors).toEqual({});
    expect(result.focus).toBeNull();
    expect(result.instruction).toBe(composeProposeInstruction('mi-cambio', 'lograr X', 'sin tocar Y'));
  });

  it('no emite una línea de alcance vacía', () => {
    const result = validateProposeForm({ objective: 'lograr X', slug: 'mi-cambio', constraints: '   ' });
    expect(result.instruction).not.toContain('Alcance y restricciones');
  });
});

describe('validateExploreForm', () => {
  it('exige una descripción', () => {
    const result = validateExploreForm({ description: '  ' });
    expect(result.errors.description).toBe('pipeline.newChange.error.description');
    expect(result.focus).toBe('description');
    expect(result.instruction).toBeNull();
  });

  it('entrega la instrucción que compone la función, sin reescribirla', () => {
    const result = validateExploreForm({ description: 'una idea' });
    expect(result.instruction).toBe(composeExploreInstruction('una idea'));
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

  // Una sesión que edita el repositorio no puede lanzarse con un solo clic.
  it('exige confirmación explícita cuando la sesión escribe en el repositorio', () => {
    expect(canStartRuntimeSession({ ...launchable, modifiesRepo: true })).toBe(false);
    expect(canStartRuntimeSession({ ...launchable, modifiesRepo: true, writeConfirmed: false })).toBe(false);
    expect(canStartRuntimeSession({ ...launchable, modifiesRepo: true, writeConfirmed: true })).toBe(true);
  });

  it('no pide confirmación cuando la sesión no escribe', () => {
    expect(canStartRuntimeSession({ ...launchable, modifiesRepo: false })).toBe(true);
  });

  it('la confirmación no habilita nada si hay datos de vista previa', () => {
    expect(canStartRuntimeSession({
      ...launchable, blockedByFixture: true, modifiesRepo: true, writeConfirmed: true,
    })).toBe(false);
  });
});
