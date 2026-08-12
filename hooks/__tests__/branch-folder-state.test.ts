// @vitest-environment jsdom
import { createElement } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBranchFolderState, type BranchFolderState } from '../use-branch-folder-state';

/**
 * Que las carpetas de ramas recuerden si están abiertas.
 *
 * Antes cada carpeta era un `useState(true)`: arrancaban abiertas y su estado
 * moría con el componente. Ale tiene 45 ramas bajo `origin` y 17 locales, así
 * que abrir la aplicación significaba encontrarse todo desplegado y cerrarlo a
 * mano de nuevo, cada vez.
 *
 * Es el mismo principio que ya rige para el modelo de IA del panel de commits:
 * la aplicación no elige por la persona, pero recuerda lo que ella eligió.
 */
/**
 * Devuelve lectores que consultan SIEMPRE el render vigente.
 *
 * Guardar el valor del primer render y usarlo después no sirve: tras un `toggle`
 * el componente se vuelve a dibujar y aquel `isOpen` quedó cerrado sobre el
 * estado viejo. Leído así, el test mediría la versión anterior y pasaría o
 * fallaría por el motivo equivocado.
 */
function montar(repoPath: string | null): BranchFolderState {
  const vigente: { actual: BranchFolderState | null } = { actual: null };
  function Sonda() {
    vigente.actual = useBranchFolderState(repoPath);
    return null;
  }
  render(createElement(Sonda));
  if (!vigente.actual) throw new Error('No se pudo capturar el estado');
  return {
    isOpen: (prefix: string) => vigente.actual!.isOpen(prefix),
    toggle: (prefix: string) => vigente.actual!.toggle(prefix),
  };
}

describe('estado de las carpetas de ramas', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('arrancan cerradas', () => {
    const estado = montar('C:/repo');

    // Cerradas y no abiertas: con 45 ramas bajo `origin`, desplegar todo por
    // omisión es lo que volvía la lista inmanejable.
    expect(estado.isOpen('origin')).toBe(false);
    expect(estado.isOpen('change')).toBe(false);
  });

  it('abrir una carpeta no toca a las demás', () => {
    const estado = montar('C:/repo');

    act(() => estado.toggle('change'));

    expect(estado.isOpen('change')).toBe(true);
    expect(estado.isOpen('origin')).toBe(false);
  });

  it('la elección sobrevive a volver a montar', () => {
    const primera = montar('C:/repo');
    act(() => primera.toggle('change'));

    // Segundo montaje: es lo que pasa al cerrar y reabrir la aplicación.
    expect(montar('C:/repo').isOpen('change')).toBe(true);
  });

  it('cada repositorio tiene el suyo', () => {
    const enA = montar('C:/repo-a');
    act(() => enA.toggle('change'));

    // GitCron abre varios repositorios en pestañas y sus carpetas no son las
    // mismas: un estado compartido haría que abrir una acá moviera otra ajena.
    expect(montar('C:/repo-b').isOpen('change')).toBe(false);
    expect(montar('C:/repo-a').isOpen('change')).toBe(true);
  });

  it('un valor corrupto no rompe el sidebar', () => {
    window.localStorage.setItem('gitcron:branchFolders:C:/repo', 'esto no es JSON');

    // Arranca como la primera vez, en vez de tirar y dejar la lista sin dibujar.
    expect(montar('C:/repo').isOpen('change')).toBe(false);
  });

  it('sin repositorio abierto no guarda nada', () => {
    const estado = montar(null);

    act(() => estado.toggle('change'));

    expect(window.localStorage.length).toBe(0);
  });
});
