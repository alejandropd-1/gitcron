'use client';

import { useT } from '@/hooks/use-translation';

/**
 * Por qué falta el dato. Cambia el texto, no solo el guión: "no aplica" y
 * "sin datos" significan cosas distintas para quien lee.
 */
export type UnknownReason = 'not-reported' | 'not-applicable' | 'pending-fixture' | 'unknown';

const LABEL_KEY: Record<UnknownReason, string> = {
  'not-reported': 'pipeline.unknown.notReported',
  'not-applicable': 'pipeline.unknown.notApplicable',
  'pending-fixture': 'pipeline.unknown.pendingFixture',
  unknown: 'pipeline.unknown.unknown',
};

export type UnknownValueProps = {
  reason: UnknownReason;
};

/**
 * Único punto de la UI que decide cómo se ve un valor ausente.
 *
 * Existe para que la regla "unknown nunca se muestra como 0" sea estructural y
 * no una convención repetida en cada componente, donde alguna copia terminaría
 * rompiéndola. Si un dato no está, se renderiza esto: nunca `0`, nunca vacío.
 */
export function UnknownValue({ reason }: UnknownValueProps) {
  const t = useT();
  return (
    <span
      className="pipeline-unknown"
      data-unknown-reason={reason}
      title={t(`${LABEL_KEY[reason]}.help`)}
    >
      {t(LABEL_KEY[reason])}
    </span>
  );
}
