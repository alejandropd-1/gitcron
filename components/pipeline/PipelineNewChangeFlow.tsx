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
  /**
   * Trabajar el cambio en su propia rama. Marcado por defecto: desmarcado
   * dejaría la función invisible y el trabajo seguiría en `main` por inercia.
   * No es silencioso —se declara en el formulario— y desmarcarlo no toca Git.
   */
  const [withBranch, setWithBranch] = useState(true);
  /** Motivo real informado por Git. No se normaliza a un mensaje propio. */
  const [branchError, setBranchError] = useState<string | null>(null);

  const objectiveRef = useRef<HTMLTextAreaElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const switchMode = (next: PipelineNewChangeMode) => {
    setMode(next);
    setErrors({});
    setInstruction(null);
  };

  /**
   * Valida y, si corresponde, deja el repositorio parado en la rama del cambio
   * antes de entregar la instrucción al lanzador.
   *
   * Éste es el único momento en que la aplicación conoce el slug y todavía no
   * abrió ningún proceso: el cambio lo crea después un runtime ejecutando
   * `openspec new change`. La rama no se crea dentro del lanzador porque el
   * lanzador es el único que abre procesos, y su fallo se confundiría con un
   * fallo de arranque.
   *
   * Un fallo al crearla **no** lanza la sesión: la persona acaba de leer que se
   * iba a trabajar en `change/<slug>`, y arrancar en otra rama sería divergencia
   * entre lo declarado y lo ejecutado.
   */
  const submitPropose = async () => {
    const result = validateProposeForm({ objective, slug, constraints });
    setErrors(result.errors);
    setBranchError(null);
    if (result.focus === 'objective') objectiveRef.current?.focus();
    else if (result.focus === 'slug') slugRef.current?.focus();
    if (!result.instruction) {
      setInstruction(null);
      return;
    }

    if (withBranch) {
      const created = await window.api?.gitCreateBranch(repoPath, `change/${slug.trim()}`);
      if (!created?.success) {
        // El motivo real, sin normalizar: uno genérico obliga a ir a la terminal
        // a averiguar qué pasó. No se intenta cambiarse a una rama existente
        // porque arrastraría los commits de otro trabajo.
        setBranchError(created?.error || 'unknown');
        setInstruction(null);
        return;
      }
    }
    setInstruction(result.instruction);
  };

  const submitExplore = () => {
    const result = validateExploreForm({ description });
    setErrors(result.errors);
    setInstruction(result.instruction);
    if (result.focus === 'description') descriptionRef.current?.focus();
  };

  return (
    <section className={styles.newChangeFlow} aria-label={t('pipeline.newChange.title')}>
      {/* La salida no vive acá: va en la fila de la guía, junto a las dos
          acciones que abren este formulario. Puesta adentro competía con el
          selector de modo en vez de leerse como su contraria. */}
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
          {/* Nada de lo que se completa se guarda en un archivo: los campos
              componen un texto que un ejecutor recibe, y es él quien escribe la
              propuesta, el diseño y las tareas. La instrucción entera se ve
              recién en el paso siguiente, dentro del lanzador, así que hasta acá
              no había forma de saber qué se estaba armando. */}
          <p className={styles.flowNature}>{t('pipeline.newChange.propose.nature')}</p>

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
            {errors.objective ? (
              <em id={`${fieldId}-objective-error`} className={styles.flowError} role="alert">
                {t(errors.objective)}
              </em>
            ) : (
              <em className={styles.flowHint}>{t('pipeline.newChange.propose.objectiveHelp')}</em>
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
                {' '}
                {t('pipeline.newChange.propose.slugTarget')}
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
            <em className={styles.flowHint}>{t('pipeline.newChange.propose.constraintsHelp')}</em>
          </label>

          {/* Se declara antes de ocurrir: es una escritura de Git, y en este
              proyecto las escrituras nuevas se autorizan explícitamente. */}
          <label className={styles.flowCheck}>
            <input
              type="checkbox"
              checked={withBranch}
              onChange={(event) => setWithBranch(event.target.checked)}
            />
            <span>
              <strong>{t('pipeline.newChange.propose.branch', { branch: `change/${slug.trim() || '<slug>'}` })}</strong>
              <em>{t('pipeline.newChange.propose.branchHelp')}</em>
            </span>
          </label>
          {branchError && (
            <p className={styles.flowError} role="alert">
              {t('pipeline.newChange.propose.branchFailed')} {branchError}
            </p>
          )}

          <button type="button" className={styles.primaryAction} onClick={() => void submitPropose()}>
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
