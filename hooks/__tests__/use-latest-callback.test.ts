// @vitest-environment jsdom
import { createElement, useState } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useLatestCallback } from '../use-latest-callback';

afterEach(cleanup);

describe('useLatestCallback', () => {
  it('keeps the same identity across renders of its owner', () => {
    const seen: Array<(value: number) => number> = [];
    let bump: () => void = () => undefined;

    function Owner() {
      const [count, setCount] = useState(0);
      bump = () => setCount((value) => value + 1);
      // Función nueva en cada render: es el caso que el hook existe para tapar.
      const stable = useLatestCallback((value: number) => value + count);
      seen.push(stable);
      return null;
    }

    render(createElement(Owner));
    act(() => { bump(); });
    act(() => { bump(); });

    expect(seen.length).toBeGreaterThanOrEqual(3);
    expect(new Set(seen).size).toBe(1);
  });

  it('invokes the current version, not the one from the first render', () => {
    // En un objeto y no en un `let`: TypeScript no sigue la asignación hecha
    // dentro del componente y estrecharía la variable a `never`.
    const box: { stable: ((value: number) => number) | null } = { stable: null };
    let bump: () => void = () => undefined;

    function Owner() {
      const [count, setCount] = useState(0);
      bump = () => setCount((value) => value + 1);
      box.stable = useLatestCallback((value: number) => value + count);
      return null;
    }

    render(createElement(Owner));
    expect(box.stable?.(10)).toBe(10);

    act(() => { bump(); });
    act(() => { bump(); });

    // Misma identidad de siempre, pero cerrando sobre el estado vigente.
    expect(box.stable?.(10)).toBe(12);
  });
});
