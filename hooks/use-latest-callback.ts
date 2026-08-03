'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Callback de identidad estable que siempre invoca la versión vigente.
 *
 * Existe para no anular `React.memo` sin darse cuenta. Una función declarada en
 * el cuerpo de un componente se recrea en cada render, y pasarla a un hijo
 * memoizado lo hace re-renderizar siempre: el resultado sigue siendo correcto y
 * el único síntoma es lentitud, que es un modo de falla invisible.
 *
 * `useCallback` con la lista de dependencias real no sirve cuando la función
 * depende de media docena de valores del cuerpo: volvería a recrearse casi
 * siempre. Acá la identidad es de por vida y lo que cambia es lo que hay dentro
 * del ref.
 *
 * El ref se actualiza en un effect y no durante el render, que es lo que
 * `react-hooks` prohíbe con razón. La consecuencia es que llamarlo *durante* el
 * render del mismo ciclo en que la función cambió usaría la versión anterior;
 * para manijas de eventos —que es su único uso acá— eso no puede ocurrir,
 * porque el usuario sólo interactúa después del commit.
 */
export function useLatestCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  });

  return useCallback((...args: Args) => latest.current(...args), []);
}
