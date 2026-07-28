'use client';

import { useId, useRef, useState } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type { RuntimeProjection } from '@/types/pipeline';
import { PipelineRuntimeLauncher } from './PipelineRuntimeLauncher';
import { validateExploreForm, validateProposeForm } from './pipeline-guided-forms';
import styles from './OpenSpecDashboard.module.css';

export type PipelineNewChangeMode = 'propose' | 'explore';

export type PipelineNewChangeFlowProps = {
  repoPath: string;
  projection: RuntimeProjection | null;
  /** Rama elegida en la guía. La persona todavía puede cambiarla acá. */
  initialMode: PipelineNewChangeMode;
  blockedByFixture?: boolean;
  onStarted?: () => void;
};

/**
 * Flujo breve para empezar un trabajo nuevo.
 *
 * Reemplaza el salto directo de "Nuevo cambio" a un textarea con `/opsx:propose`
 * pelado. La instrucción se compone a partir de campos con nombre, y sólo se
 * muestra completa bajo divulgación progresiva: el comando es un detalle de
 * implementación, no lo que la persona vino a escribir.
 *
 * No arranca nada por sí solo. Cuando el formulario es válido entrega la
 * instrucción al lanzador existente, que sigue siendo el único que abre procesos.
 */
export function PipelineNewChangeFlow({
  repoPath,
  projection,
  initialMode,
  blockedByFixture = false,
  onStarted,
}: PipelineNewChangeFlowProps) {
  const t = useT();
  const fieldId = useId();
  const [mode, setMode] = useState<PipelineNewChangeMode>(initialMode);
  const [objective, setObjective] = useState('');
  const [slug, setSlug] = useState('');
  const [constraints, setConstraints] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ objective?: string; slug?: string; description?: string }>({});
  const [instruction, setInstruction] = useState<string | null>(null);

  const objectiveRef = useRef<HTMLTextAreaElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const switchMode = (next: PipelineNewChangeMode) => {
    setMode(next);
    setErrors({});
    setInstruction(null);
  };

  const submitPropose = () => {
    const result = validateProposeForm({ objective, slug, constraints });
    setErrors(result.errors);
    setInstruction(result.instruction);
    if (result.focus === 'objective') objectiveRef.current?.focus();
    else if (result.focus === 'slug') slugRef.current?.focus();
  };

  const submitExplore = () => {
    const result = validateExploreForm({ description });
    setErrors(result.errors);
    setInstruction(result.instruction);
    if (result.focus === 'description') descriptionRef.current?.focus();
  };

  return (
    <section className={styles.newChangeFlow} aria-label={t('pipeline.newChange.title')}>
      <div className={styles.intentSwitch} role="group" aria-label={t('pipeline.newChange.intent.question')}>
        <button
          type="button"
          className={styles.intentOption}
          data-selected={mode === 'propose'}
          aria-pressed={mode === 'propose'}
          onClick={() => switchMode('propose')}
        >
          <FileText size={14} aria-hidden="true" />
          <strong>{t('pipeline.newChange.intent.propose')}</strong>
          <span>{t('pipeline.newChange.intent.proposeHelp')}</span>
        </button>
        <button
          type="button"
          className={styles.intentOption}
          data-selected={mode === 'explore'}
          aria-pressed={mode === 'explore'}
          onClick={() => switchMode('explore')}
        >
          <BookOpen size={14} aria-hidden="true" />
          <strong>{t('pipeline.newChange.intent.explore')}</strong>
          <span>{t('pipeline.newChange.intent.exploreHelp')}</span>
        </button>
      </div>

      {mode === 'propose' ? (
        <div className={styles.flowFields}>
          <label className={styles.flowField} htmlFor={`${fieldId}-objective`}>
            <span>{t('pipeline.newChange.propose.objective')}</span>
            <textarea
              id={`${fieldId}-objective`}
              ref={objectiveRef}
              rows={3}
              value={objective}
              aria-invalid={errors.objective ? true : undefined}
              aria-describedby={errors.objective ? `${fieldId}-objective-error` : undefined}
              onChange={(event) => setObjective(event.target.value)}
            />
            {errors.objective && (
              <em id={`${fieldId}-objective-error`} className={styles.flowError} role="alert">
                {t(errors.objective)}
              </em>
            )}
          </label>

          <label className={styles.flowField} htmlFor={`${fieldId}-slug`}>
            <span>{t('pipeline.newChange.propose.slug')}</span>
            <input
              id={`${fieldId}-slug`}
              ref={slugRef}
              type="text"
              value={slug}
              spellCheck={false}
              aria-invalid={errors.slug ? true : undefined}
              aria-describedby={errors.slug ? `${fieldId}-slug-error` : `${fieldId}-slug-help`}
              onChange={(event) => setSlug(event.target.value)}
            />
            {errors.slug ? (
              <em id={`${fieldId}-slug-error`} className={styles.flowError} role="alert">
                {t(errors.slug)}
              </em>
            ) : (
              <em id={`${fieldId}-slug-help`} className={styles.flowHint}>
                {t('pipeline.newChange.propose.slugHelp')}
              </em>
            )}
          </label>

          <label className={styles.flowField} htmlFor={`${fieldId}-constraints`}>
            <span>{t('pipeline.newChange.propose.constraints')}</span>
            <textarea
              id={`${fieldId}-constraints`}
              rows={2}
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
            />
          </label>

          <button type="button" className={styles.primaryAction} onClick={submitPropose}>
            {t('pipeline.newChange.propose.review')}
          </button>
        </div>
      ) : (
        <div className={styles.flowFields}>
          <label className={styles.flowField} htmlFor={`${fieldId}-description`}>
            <span>{t('pipeline.newChange.explore.description')}</span>
            <textarea
              id={`${fieldId}-description`}
              ref={descriptionRef}
              rows={3}
              value={description}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? `${fieldId}-description-error` : undefined}
              onChange={(event) => setDescription(event.target.value)}
            />
            {errors.description && (
              <em id={`${fieldId}-description-error`} className={styles.flowError} role="alert">
                {t(errors.description)}
              </em>
            )}
          </label>

          <button type="button" className={styles.primaryAction} onClick={submitExplore}>
            {t('pipeline.newChange.explore.review')}
          </button>
        </div>
      )}

      {instruction && (
        <div className={styles.launcherPanel}>
          <PipelineRuntimeLauncher
            key={`${mode}:${instruction}`}
            repoPath={repoPath}
            projection={projection}
            initialInstruction={instruction}
            // Explore no crea un cambio, así que la sesión no puede atribuirse a
            // ninguno: queda `null` en vez de inventar un identificador.
            changeId={null}
            taskId={null}
            blockedByFixture={blockedByFixture}
            startLabelKey={mode === 'propose' ? 'pipeline.newChange.propose.start' : 'pipeline.newChange.explore.start'}
            onStarted={onStarted}
          />
        </div>
      )}
    </section>
  );
}
