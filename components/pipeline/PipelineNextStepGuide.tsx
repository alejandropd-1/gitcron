'use client';

import { useState } from 'react';
import { ChevronDown, Play } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type { PipelineActionIntent, PipelineNextAction, PipelineNextActionButton } from './pipeline-next-action';
import styles from './OpenSpecDashboard.module.css';

export type PipelineNextStepGuideProps = {
  action: PipelineNextAction;
  onAct: (intent: PipelineActionIntent) => void;
  /** Deshabilita lo ejecutable sin ocultarlo, para que el estado sea legible. */
  executionBlocked?: boolean;
};

/**
 * Bloque contextual "siguiente paso".
 *
 * No decide nada: `derivePipelineNextAction` ya resolvió qué mostrar y si la
 * acción es ejecutable. Acá sólo se renderiza. Esa separación es lo que permite
 * probar las once filas de la matriz sin montar React.
 *
 * El tope es estructural, no estilístico: etiqueta, título, una frase, una acción
 * primaria y una secundaria sólo si existe. Lo técnico vive bajo divulgación
 * progresiva porque la app es densa y productiva, no un tutorial.
 */
export function PipelineNextStepGuide({ action, onAct, executionBlocked = false }: PipelineNextStepGuideProps) {
  const t = useT();
  const [showInstruction, setShowInstruction] = useState(false);

  const renderButton = (item: PipelineNextActionButton, variant: 'primary' | 'secondary') => {
    // Un botón ejecutable con la ejecución bloqueada se muestra deshabilitado en
    // vez de desaparecer: ocultarlo haría parecer que la función no existe.
    const disabled = executionBlocked && item.executable;
    return (
      <button
        type="button"
        className={variant === 'primary' ? styles.primaryAction : styles.secondaryAction}
        disabled={disabled}
        onClick={() => onAct(item.intent)}
      >
        {variant === 'primary' && item.executable && <Play size={14} />}
        {t(item.labelKey, item.labelParams)}
      </button>
    );
  };

  return (
    <section className={styles.nextStep} data-kind={action.kind} aria-label={t('pipeline.next.label')}>
      <header className={styles.nextStepHeader}>
        <span className={styles.nextStepBadge}>{t('pipeline.next.label')}</span>
        {action.step && (
          <span className={styles.nextStepCounter}>
            {t('pipeline.next.step', { index: action.step.index, total: action.step.total })}
          </span>
        )}
      </header>

      <h4 className={styles.nextStepTitle}>{t(action.titleKey, action.titleParams)}</h4>
      <p className={styles.nextStepHelp}>{t(action.helpKey)}</p>

      {(action.primary || action.secondary) && (
        <div className={styles.nextStepActions}>
          {action.primary && renderButton(action.primary, 'primary')}
          {action.secondary && renderButton(action.secondary, 'secondary')}
        </div>
      )}

      {action.instruction && (
        <div className={styles.nextStepDisclosure}>
          <button
            type="button"
            className={styles.disclosureToggle}
            aria-expanded={showInstruction}
            onClick={() => setShowInstruction((value) => !value)}
          >
            <ChevronDown size={13} aria-hidden="true" data-open={showInstruction} />
            {showInstruction ? t('pipeline.next.hideInstruction') : t('pipeline.next.showInstruction')}
          </button>
          {showInstruction && <pre className={styles.instructionPreview}>{action.instruction}</pre>}
        </div>
      )}
    </section>
  );
}
