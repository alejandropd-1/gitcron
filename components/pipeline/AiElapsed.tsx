'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/hooks/use-translation';
import styles from './OpenSpecDashboard.module.css';

/**
 * Cuánto va, y una barra mientras carga.
 *
 * Ale lo pidió con estas palabras: «me gustaría estar un poco más enterado de lo
 * que está pasando». Medido, una carga tarda 8,8 a 11 segundos y una redacción
 * 25 a 98: sin nada que se mueva, cualquiera de las dos se lee como colgada.
 *
 * Componente propio y con su propio temporizador, por la misma razón que
 * `DraftingThought`: un `setState` por segundo dentro de `OpenSpecDashboard`
 * re-renderizaría el panel entero sesenta veces por minuto. Acá sólo se
 * re-renderiza este nodo.
 *
 * Los segundos se **derivan** de la marca de arranque en vez de sumar uno por
 * tick: un intervalo que se atrasa —y con la máquina cargada se atrasa— iría
 * quedando corto, y el número dejaría de ser el tiempo real.
 */
export function AiElapsed({
  phase,
  startedAt,
}: {
  phase: 'idle' | 'loading' | 'drafting';
  startedAt: number | null;
}) {
  const t = useT();
  /**
   * Los segundos ya contados. Arrancan en cero y los escribe **el intervalo**,
   * nunca el render: `Date.now()` durante el render es impuro y el linter lo
   * rechaza con razón —dos renders seguidos darían números distintos sin que
   * nada haya cambiado—.
   *
   * Cada corrida remonta este componente, porque quien lo usa lo distingue por
   * su marca de arranque. Por eso el cero inicial siempre es el correcto.
   */
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (phase === 'idle' || startedAt === null) return;
    // Se calcula contra la marca de arranque y no sumando uno por tick: un
    // intervalo que se atrasa —y con la máquina cargada se atrasa— iría quedando
    // corto, y el número dejaría de ser el tiempo real.
    const timer = window.setInterval(
      () => setSeconds(Math.max(0, Math.round((Date.now() - startedAt) / 1000))),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [phase, startedAt]);

  if (phase === 'idle' || startedAt === null) return null;

  return (
    <div className={styles.aiElapsed}>
      {/* La barra sólo durante la carga. Es indeterminada porque el progreso
          real viaja por otro canal que todavía no se consume: fingir una
          fracción que no se midió sería inventar. */}
      {phase === 'loading' && (
        <span className={styles.aiLoadTrack} role="progressbar" aria-busy="true" aria-label={t('pipeline.openspec.prepare.aiLoading')}>
          <span />
        </span>
      )}
      <em aria-live="off">
        {phase === 'loading'
          ? t('pipeline.openspec.prepare.aiElapsedLoading', { seconds })
          : t('pipeline.openspec.prepare.aiElapsedDrafting', { seconds })}
      </em>
    </div>
  );
}
