// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  useSpeculativeBranchesPreference,
  readSpeculativePreference,
  writeSpeculativePreference,
} from '../use-speculative-branches-preference';

afterEach(cleanup);

type PreferenceHandle = {
  getShowSpeculative: () => boolean;
  toggle: () => void;
  setShowSpeculative: (val: boolean) => void;
};

function montar(repoPath: string | null): PreferenceHandle {
  const vigente: { actual: ReturnType<typeof useSpeculativeBranchesPreference> | null } = { actual: null };
  function Sonda() {
    vigente.actual = useSpeculativeBranchesPreference(repoPath);
    return null;
  }
  render(createElement(Sonda));
  if (!vigente.actual) throw new Error('No se pudo capturar el estado');
  return {
    getShowSpeculative: () => vigente.actual!.showSpeculative,
    toggle: () => vigente.actual!.toggleSpeculative(),
    setShowSpeculative: (val: boolean) => vigente.actual!.setShowSpeculative(val),
  };
}

describe('Preferencia de ramas especulativas por repositorio', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sin elección registrada el estado por omisión es oculto (false)', () => {
    const handle = montar('C:/repos/gitcron');
    expect(handle.getShowSpeculative()).toBe(false);
  });

  it('apertura con predicciones guardadas y sin elección previa deja la capa oculta', () => {
    // Simular que el repositorio ya tiene predicciones guardadas en SQLite o caché,
    // pero no hay preferencia registrada en localStorage.
    expect(readSpeculativePreference('C:/repos/proyecto-x')).toBe(false);
    const handle = montar('C:/repos/proyecto-x');
    expect(handle.getShowSpeculative()).toBe(false);
  });

  it('la elección de un repositorio se recuerda al volver a montarlo', () => {
    const handle = montar('C:/repos/repo-a');
    expect(handle.getShowSpeculative()).toBe(false);

    act(() => handle.toggle());
    expect(handle.getShowSpeculative()).toBe(true);

    // Segundo montaje (reabrir repositorio)
    const handleReabierto = montar('C:/repos/repo-a');
    expect(handleReabierto.getShowSpeculative()).toBe(true);
  });

  it('la elección de un repositorio no se propaga a otro', () => {
    const handleA = montar('C:/repos/repo-a');
    act(() => handleA.toggle());
    expect(handleA.getShowSpeculative()).toBe(true);

    // Abrir repo-b sin elección registrada: debe permanecer oculto
    const handleB = montar('C:/repos/repo-b');
    expect(handleB.getShowSpeculative()).toBe(false);

    // Volver a repo-a: sigue visible
    expect(montar('C:/repos/repo-a').getShowSpeculative()).toBe(true);
  });

  it('llegada de una predicción nueva con la capa oculta no la enciende', () => {
    const handle = montar('C:/repos/repo-c');
    expect(handle.getShowSpeculative()).toBe(false);

    // Simular llegada de predicción nueva: no se llama a setShowSpeculative(true), el estado sigue false
    expect(handle.getShowSpeculative()).toBe(false);
  });

  it('un valor inválido o no booleano en storage degrada a false', () => {
    window.localStorage.setItem('gitcron:speculativeBranches:C:/repos/corrupto', 'not-a-bool');
    const handle = montar('C:/repos/corrupto');
    expect(handle.getShowSpeculative()).toBe(false);
  });

  it('sin ruta de repositorio no persiste en storage', () => {
    const handle = montar(null);
    expect(handle.getShowSpeculative()).toBe(false);
    act(() => handle.toggle());
    expect(window.localStorage.length).toBe(0);
  });
});
