// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRotatingThoughts } from '@/hooks/use-rotating-thoughts';
import { commitDraftThoughts } from '@/lib/commit-draft-thoughts';

/**
 * El ciclo de frases de la espera.
 *
 * Vivía dentro de `TemporalAgentSettings.tsx` y se extrajo cuando hizo falta lo
 * mismo para redactar el asunto de un commit: dos ciclos idénticos se separan
 * con el primer arreglo, y en este panel eso ya produjo tres controles
 * duplicados.
 */

function Sonda({ thoughts, active }: { thoughts: readonly string[]; active: boolean }) {
  const current = useRotatingThoughts(thoughts, active, 1000);
  return <span data-testid="frase">{current}</span>;
}

const frase = () => screen.getByTestId('frase').textContent;

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('la rotación', () => {
  it('muestra una frase apenas empieza la espera', () => {
    render(<Sonda thoughts={['una', 'otra', 'tercera']} active />);
    expect(frase()).not.toBe('');
  });

  it('no repite la anterior', () => {
    // Repetir dos veces seguidas se lee como que el proceso se trabó, que es lo
    // contrario de lo que estas frases están para transmitir.
    render(<Sonda thoughts={['una', 'otra']} active />);
    const primera = frase();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(frase()).not.toBe(primera);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(frase()).toBe(primera);
  });

  it('con una sola frase no se rompe', () => {
    render(<Sonda thoughts={['sola']} active />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(frase()).toBe('sola');
  });
});

describe('cuándo no hay frase', () => {
  it('inactiva no muestra nada', () => {
    render(<Sonda thoughts={['una', 'otra']} active={false} />);
    expect(frase()).toBe('');
  });

  it('al terminar la espera se limpia sola', () => {
    // Quien la muestre no tiene que acordarse de limpiarla: una frase de espera
    // que sobrevive al final se leería como el resultado.
    const { rerender } = render(<Sonda thoughts={['una', 'otra']} active />);
    expect(frase()).not.toBe('');

    rerender(<Sonda thoughts={['una', 'otra']} active={false} />);
    expect(frase()).toBe('');
  });

  it('sin frases tampoco inventa', () => {
    render(<Sonda thoughts={[]} active />);
    expect(frase()).toBe('');
  });
});

describe('el vocabulario de redactar el commit', () => {
  it('es propio y no el de predecir futuros', () => {
    // Las del Agente Temporal hablan de ramas especulativas; acá se lee un diff.
    const es = commitDraftThoughts('es');
    expect(es.some((t) => /diff/i.test(t))).toBe(true);
    expect(es.some((t) => /futuro|especulat/i.test(t))).toBe(false);
  });

  it('tiene los tres idiomas, y castellano de respaldo', () => {
    expect(commitDraftThoughts('en')).not.toBe(commitDraftThoughts('es'));
    expect(commitDraftThoughts('zh')).not.toBe(commitDraftThoughts('es'));
    expect(commitDraftThoughts('pt')).toBe(commitDraftThoughts('es'));
  });

  it('todas las listas tienen la misma cantidad', () => {
    // Una lista más corta rotaría notoriamente más rápido en ese idioma.
    expect(commitDraftThoughts('en').length).toBe(commitDraftThoughts('es').length);
    expect(commitDraftThoughts('zh').length).toBe(commitDraftThoughts('es').length);
  });
});
