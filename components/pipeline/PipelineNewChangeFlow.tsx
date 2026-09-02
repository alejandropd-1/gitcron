'use client';

import { useId, useRef, useState } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { useNewChangeDraft, useNewChangeDraftStore } from '@/lib/new-change-draft-store';
import type { BranchDivergence, RuntimeProjection } from '@/types/pipeline';
import { BranchBaseNotice } from './ChangeBranchNotice';
import { PipelineRuntimeLauncher } from './PipelineRuntimeLauncher';
import { validateExploreForm, validateProposeForm } from './pipeline-guided-forms';
import styles from './OpenSpecDashboard.module.css';

export type PipelineNewChangeMode = 'propose' | 'explore';

export type PipelineNewChangeFlowProps = {
  repoPath: string;
  projection: RuntimeProjection | null;
  blockedByFixture?: boolean;
  onStarted?: () => void;
  /** Rama actual: es la base de la que sale la del cambio si no se elige otra. */
  currentBranch?: string | null;
  /** Cuánto se aparta esa base del `main` local. */
  divergence?: BranchDivergence;
  /**
   * Si el árbol de trabajo está limpio.
   *
   * `undefined` es no saber, y con eso no se afirma que esté sucio: la rama se
   * crea igual, como hasta ahora.
   */
  workingTreeClean?: boolean;
  /**
   * Relee la evidencia del repositorio.
   *
   * Crear la rama cambia en qué rama está parado el repositorio, y sin esto el
   * panel seguía mostrando la anterior. Es el peor defecto posible acá: el
   * trabajo de este formulario es declarar la rama, y justo después de que la
   * aplicación la cambia declaraba la equivocada. Ale lo detectó mirando la
   * franja de evidencia con la rama vieja.
   */
  onRefresh?: () => void;
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
  blockedByFixture = false,
  onStarted,
  currentBranch,
  divergence,
  workingTreeClean,
  onRefresh,
}: PipelineNewChangeFlowProps) {
  const t = useT();
  const fieldId = useId();
  /**
   * Lo que se está escribiendo vive en el store y no acá.
   *
   * Las solapas de la aplicación se desmontan al cambiar: ir al grafo y volver
   * se llevaba el formulario entero. Lo transitorio —errores, la instrucción ya
   * compuesta— sí se queda en el componente: se recalcula de los campos, y
   * guardarlo sería un segundo lugar donde vive el mismo dato.
   */
  const draft = useNewChangeDraft(repoPath);
  const patchDraft = useNewChangeDraftStore((state) => state.patchDraft);
  const clearDraft = useNewChangeDraftStore((state) => state.clearDraft);
  const { mode, objective, slug, constraints, description } = draft;
  const setMode = (next: PipelineNewChangeMode) => patchDraft(repoPath, { mode: next });
  const setObjective = (next: string) => patchDraft(repoPath, { objective: next });
  const setSlug = (next: string) => patchDraft(repoPath, { slug: next });
  const setConstraints = (next: string) => patchDraft(repoPath, { constraints: next });
  const setDescription = (next: string) => patchDraft(repoPath, { description: next });
  const [errors, setErrors] = useState<{ objective?: string; slug?: string; description?: string }>({});
  const [instruction, setInstruction] = useState<string | null>(null);
  /**
   * Trabajar el cambio en su propia rama. Marcado por defecto: desmarcado
   * dejaría la función invisible y el trabajo seguiría en `main` por inercia.
   * No es silencioso —se declara en el formulario— y desmarcarlo no toca Git.
   */
  const withBranch = draft.withBranch;
  const setWithBranch = (next: boolean) => patchDraft(repoPath, { withBranch: next });
  /** Motivo real informado por Git. No se normaliza a un mensaje propio. */
  const [branchError, setBranchError] = useState<string | null>(null);
  /** Motivo real informado por el motor OpenSpec si una consulta falla o está bloqueada. */
  const [engineError, setEngineError] = useState<string | null>(null);
  /**
   * Crear la rama a partir de `main` en vez de donde se está parado.
   *
   * Desmarcado por omisión: una rama con commits propios sin fusionar puede ser
   * exactamente donde se quiere estar, y elegir la base por la persona perdería
   * ese trabajo de vista.
   */
  const fromMain = draft.fromMain;
  const setFromMain = (next: boolean) => patchDraft(repoPath, { fromMain: next });
  /** Se pidió crear la rama con trabajo sin confirmar. Se declara, no se hace. */
  const [dirtyBlocked, setDirtyBlocked] = useState(false);

  const objectiveRef = useRef<HTMLTextAreaElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const switchMode = (next: PipelineNewChangeMode) => {
    setMode(next);
    setErrors({});
    setBranchError(null);
    setEngineError(null);
    setDirtyBlocked(false);
    setInstruction(null);
  };

  /**
   * Valida y, si corresponde, deja el repositorio parado en la rama del cambio
   * antes de entregar la instrucción al lanzador.
   *
   * Al proponer un nuevo change, la carpeta aún no existe en disco:
   * `openspec instructions proposal --change <slug>` fallaría con "Change 'x' not found".
   * La instrucción se compone con el objetivo y alcance declarados por la persona,
   * delegando la creación del scaffold y los artefactos al ejecutor sin inventar llamadas
   * a un change inexistente.
   */
  const submitPropose = async () => {
    const result = validateProposeForm({ objective, slug, constraints });
    setErrors(result.errors);
    setBranchError(null);
    setEngineError(null);
    if (result.focus === 'objective') objectiveRef.current?.focus();
    else if (result.focus === 'slug') slugRef.current?.focus();
    if (!result.instruction) {
      setInstruction(null);
      return;
    }

    if (withBranch) {
      // Con trabajo sin confirmar la rama no se crea: `git checkout -b` lo
      // arrastra, y la rama se crea al **abrir** un cambio, que es justo cuando
      // lo que hay sin confirmar es de otro. Pasó al proponer este mismo cambio.
      if (workingTreeClean === false) {
        setBranchError(null);
        setDirtyBlocked(true);
        setInstruction(null);
        return;
      }
      setDirtyBlocked(false);
      // Sin elección explícita se invoca sin punto de partida: la rama sale de
      // donde se está parado, que es lo que hace Git. La alternativa se ofrece,
      // no se aplica sola.
      const branchName = `change/${slug.trim()}`;
      const created = fromMain
        ? await window.api?.gitCreateBranch(repoPath, branchName, 'main')
        : await window.api?.gitCreateBranch(repoPath, branchName);
      if (!created?.success) {
        // La rama de **este mismo cambio** ya existe: es trabajo propio que se
        // retoma, así que el repositorio se para en ella en vez de cortar el
        // flujo. `branchName` lo construye esta función a partir del slug, de
        // modo que un «already exists» sólo puede ser de esta rama y nunca de
        // otro trabajo: cambiarse no arrastra commits ajenos. Cualquier otro
        // fallo sigue cortando, con el motivo real y sin normalizar, porque uno
        // genérico obliga a ir a la terminal a averiguar qué pasó.
        //
        // Con `fromMain` marcado la rama no se recrea desde main: ya existe y
        // rehacerla descartaría lo que tenga. Se retoma donde quedó.
        const yaExistia = /already exists/i.test(created?.error ?? '');
        const parado = yaExistia ? await window.api?.gitCheckout(repoPath, branchName) : null;
        if (!parado?.success) {
          setBranchError(created?.error || 'unknown');
          setInstruction(null);
          return;
        }
      }
      // La rama recién creada es dónde está parado el repositorio ahora, y el
      // panel lo declara en la franja de evidencia. Sin releer seguía mostrando
      // la anterior: el formulario cambiaba el hecho que el panel afirma, y lo
      // dejaba afirmando el viejo.
      onRefresh?.();
    }

    setInstruction(result.instruction);
  };

  /**
   * Explorar es una actividad previa que no posee un change ni artefactos asociados.
   * Por contrato del CLI, `openspec instructions` exige `--change <id>`; al no existir
   * un change para explorar, la instrucción se compone directamente a partir de la
   * descripción de la idea planteada por la persona.
   */
  const submitExplore = () => {
    const result = validateExploreForm({ description });
    setErrors(result.errors);
    setBranchError(null);
    setEngineError(null);
    if (result.focus === 'description') {
      descriptionRef.current?.focus();
      setInstruction(null);
      return;
    }

    setInstruction(result.instruction);
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
          {/* De dónde sale la rama. `git checkout -b` no lo dice, y una base de
              meses atrás no se nota hasta mucho después. */}
          {withBranch && (
            <>
              <BranchBaseNotice divergence={divergence} branch={currentBranch} />
              {divergence?.measured && (divergence.behind > 0 || divergence.ahead > 0) && (
                <label className={styles.flowCheck}>
                  <input
                    type="checkbox"
                    checked={fromMain}
                    onChange={(event) => setFromMain(event.target.checked)}
                  />
                  <span>
                    <strong>{t('pipeline.newChange.propose.fromBase', { base: divergence.base })}</strong>
                    <em>{t('pipeline.newChange.propose.fromBaseHelp')}</em>
                  </span>
                </label>
              )}
            </>
          )}

          {/* El árbol sucio se declara donde se crea la rama, no al lado del
              botón: es el motivo por el que no se creó, no un error de Git. */}
          {dirtyBlocked && (
            <p className={styles.flowError} role="alert">
              {t('pipeline.newChange.propose.branchDirty')}
            </p>
          )}
          {branchError && (
            <p className={styles.flowError} role="alert">
              {t('pipeline.newChange.propose.branchFailed')} {branchError}
            </p>
          )}
          {engineError && (
            <p className={styles.flowError} role="alert">
              {t('pipeline.newChange.propose.engineFailed')} {engineError}
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

          {engineError && (
            <p className={styles.flowError} role="alert">
              {t('pipeline.newChange.propose.engineFailed')} {engineError}
            </p>
          )}

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
            // Arrancar la sesión es uno de los dos momentos en que el borrador
            // deja de serlo: lo que se escribió ya está en manos del ejecutor.
            onStarted={() => {
              clearDraft(repoPath);
              onStarted?.();
            }}
          />
        </div>
      )}
    </section>
  );
}
