import { useEffect, useState } from 'react';

/**
 * Frases que rotan mientras se espera a un modelo.
 *
 * Vivía dentro de `TemporalAgentSettings.tsx`, resolviendo la espera de las
 * predicciones. Cuando hizo falta lo mismo para redactar el asunto de un commit
 * —medido: entre 25 y 98 segundos, tiempo suficiente para que un campo quieto se
 * lea como colgado— se extrajo en vez de copiarse. Dos ciclos idénticos se
 * separan con el primer arreglo, y en este panel eso ya produjo tres controles
 * duplicados.
 *
 * Lo que se comparte es **el mecanismo**. El vocabulario lo trae cada caso: las
 * frases del Agente Temporal hablan de predecir futuros y ramas especulativas, y
 * una frase que no describe lo que está pasando convierte la espera en decorado.
 *
 * Devuelve `''` cuando no hay espera en curso. Nunca devuelve una frase con
 * `active` en falso: quien la muestre no tiene que acordarse de limpiarla.
 */
export function useRotatingThoughts(
  thoughts: readonly string[],
  active: boolean,
  intervalMs = 2800,
): string {
  /**
   * Sólo avanza un contador; la frase se **deriva** de él.
   *
   * Es la forma que este proyecto ya adoptó cuando el linter marca un `setState`
   * dentro de un efecto: en vez de escribir el estado al activarse y limpiarlo
   * al desactivarse, el estado se calcula en el render y el efecto se limita a
   * marcar el paso del tiempo.
   */
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active || thoughts.length === 0) return;
    const timer = setInterval(() => setTick((previous) => previous + 1), intervalMs);
    return () => clearInterval(timer);
  }, [active, thoughts, intervalMs]);

  /**
   * Se recorre la lista en orden, no al azar.
   *
   * La versión anterior sorteaba, y sortear en el render es impuro: el linter lo
   * rechaza con razón, porque un re-render cualquiera cambiaría la frase a
   * destiempo. Recorrer en orden sale gratis y **garantiza** lo que el sorteo
   * apenas hacía probable —que no se repita la anterior—, que es lo único que
   * importaba: repetir dos veces seguidas se lee como que el proceso se trabó.
   *
   * El costo asumido es que cada espera empieza por la misma frase. Con una
   * espera de 47 segundos medidos y rotación cada 2,8, se ven casi todas de
   * todos modos.
   */
  if (!active || thoughts.length === 0) return '';
  return thoughts[tick % thoughts.length];
}
