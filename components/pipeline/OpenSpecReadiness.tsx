'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { OpenSpecToolEvidence } from '@/types/pipeline';
import { useT } from '@/hooks/use-translation';
// El catálogo de herramientas conocidas se comparte con el lector en vez de
// copiarse: dos listas que envejecen por separado dirían cosas distintas del
// mismo repositorio. El módulo es puro —tablas y funciones, sin APIs de Node—,
// así que vale en el renderer igual que en el proceso principal.
import { OPENSPEC_TOOL_DIRECTORIES } from '@/electron/pipeline/openspec-tooling';
import styles from './OpenSpecDashboard.module.css';

/**
 * Lo que le falta al repositorio, separado en dos piezas por lo que hace cada una.
 *
 * `OpenSpecReadiness` es el **aviso**: una línea arriba de la guía, que aparece
 * sólo cuando falta algo. Interrumpe, y por eso no puede vivir detrás de una
 * solapa: lo que hay que ver antes de empezar no se puede pedir que lo vayan a
 * buscar.
 *
 * `OpenSpecToolList` es la **referencia**: la lista completa, en el rail. Se
 * consulta cuando se quiere, incluye las que están bien, y no urge.
 *
 * Los dos estados que muestran eran invisibles hasta ahora. No tener `openspec/`
 * se ve igual que un repositorio recién empezado. Y una herramienta presente sin
 * sus skills convive con un repositorio correctamente inicializado: su ejecutor
 * no sabe que existe el canal de instrucciones, así que trabaja sin el método y
 * sin avisar. Pasó con Antigravity en `odontoPau`.
 */

export type OpenSpecReadinessProps = {
  present?: boolean;
  tools?: OpenSpecToolEvidence[];
  /**
   * Lleva al detalle, que vive en el rail, y ahí está la única acción que
   * inicializa.
   *
   * El aviso no repite el botón: los dos serían el mismo control con el mismo
   * texto y el mismo efecto, visibles a la vez, que es lo que la guía de este
   * panel prohíbe. Sin este callback el aviso sólo declara —que es lo correcto
   * cuando el rail está cerrado y no habría a dónde llevar—.
   */
  onShowDetail?: () => void;
};

export function OpenSpecReadiness({ present, tools, onShowDetail }: OpenSpecReadinessProps) {
  const t = useT();
  // `undefined` es un snapshot de una versión anterior que no trae el dato. No
  // saber no es «no hay»: sin el dato no se afirma nada.
  if (present === undefined) return null;

  const pending = (tools ?? []).filter((tool) => !tool.configured);
  if (present && pending.length === 0) return null;

  return (
    <section className={styles.readiness} data-kind={present ? 'tools' : 'missing'}>
      <div className={styles.readinessMain}>
        <AlertCircle size={15} aria-hidden="true" />
        <p>
          <strong>
            {present
              ? t('pipeline.openspec.readiness.toolsTitle', { count: pending.length })
              : t('pipeline.openspec.readiness.missingTitle')}
          </strong>
          {' '}
          {present
            ? t('pipeline.openspec.readiness.toolsHelp')
            : t('pipeline.openspec.readiness.missingHelp')}
        </p>
      </div>
      {/* También sin OpenSpec: declarar sin ofrecer salida deja a la persona
          sabiendo que algo falta y sin nada que hacer al respecto, que es el
          peor de los dos estados. El rótulo cambia porque lo que espera del
          otro lado es distinto: cuál falta, o cómo resolverlo. */}
      {onShowDetail && (
        <div className={styles.readinessActions}>
          <button type="button" className={styles.readinessLink} onClick={onShowDetail}>
            {present
              ? t('pipeline.openspec.readiness.seeDetail')
              : t('pipeline.openspec.readiness.resolve')}
          </button>
        </div>
      )}
    </section>
  );
}

export type OpenSpecToolListProps = {
  present?: boolean;
  tools?: OpenSpecToolEvidence[];
  /** Ejecuta la inicialización. Sin esto, la lista es sólo lectura. */
  onInitialize?: () => void;
  busy?: boolean;
  /** Motivo real informado por el CLI, sin normalizar. */
  error?: string | null;
  /**
   * El CLI no encontró ninguna herramienta que detectar y hay que elegir una.
   *
   * No es un fallo: `openspec init` detecta por los directorios del repositorio,
   * y en uno donde no hay ninguno se planta pidiendo `--tools`. Por eso se
   * muestra como una pregunta y no como un error.
   */
  needsTool?: boolean;
  /**
   * Reintenta la inicialización con las herramientas elegidas.
   *
   * Recibe una lista y no una sola: el CLI acepta `--tools a,b` y las configura
   * juntas, y un repositorio trabajado con dos ejecutores las necesita a las
   * dos. Pedirlas de a una dejaría la segunda al olvido.
   */
  onInitializeWith?: (toolIds: string[]) => void;
};

export function OpenSpecToolList({
  present,
  tools,
  onInitialize,
  busy,
  error,
  needsTool,
  onInitializeWith,
}: OpenSpecToolListProps) {
  const t = useT();
  /**
   * Sin preselección: arranca vacía y el botón no se puede pulsar hasta que haya
   * al menos una elegida. Marcar alguna por omisión configuraría una herramienta
   * que nadie eligió, y esto escribe en el repositorio.
   */
  const [chosenTools, setChosenTools] = useState<string[]>([]);
  if (present === undefined) return null;

  const list = tools ?? [];
  const pending = list.filter((tool) => !tool.configured);
  // Se ofrece inicializar cuando hay algo que resolver: sin OpenSpec, o con
  // alguna herramienta sin configurar. Con todo en orden el botón no aparece.
  const canInitialize = Boolean(onInitialize) && (!present || pending.length > 0);
  /** El CLI no pudo detectar nada y la respuesta que falta es una elección. */
  const asking = Boolean(needsTool && onInitializeWith);

  return (
    <>
      {!present && <p className={styles.railEmpty}>{t('pipeline.openspec.readiness.missingTitle')}</p>}

      {present && list.length === 0 && (
        <p className={styles.railEmpty}>{t('pipeline.openspec.rail.noTools')}</p>
      )}

      {/* Las configuradas también se listan: el contraste es lo que hace legible
          lo que falta, y sin ellas el rail estaría vacío casi siempre. */}
      {list.length > 0 && (
        <ul className={styles.readinessList}>
          {list.map((tool) => (
            <li key={tool.toolId} data-configured={tool.configured}>
              {tool.configured
                ? <CheckCircle2 size={13} aria-hidden="true" />
                : <AlertCircle size={13} aria-hidden="true" />}
              <strong>{tool.label}</strong>
              <code>{tool.directory}</code>
              <em>
                {tool.configured
                  ? t('pipeline.openspec.readiness.configured')
                  : t('pipeline.openspec.readiness.notConfigured')}
              </em>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.railScope}>{t('pipeline.openspec.rail.toolsHelp')}</p>

      {/* Mientras hay que elegir, el botón que detecta no se ofrece: ya se sabe
          que no encuentra nada, así que volvería a fallar igual. Dejarlo sería
          un segundo control con el mismo efecto y una salida conocida. */}
      {canInitialize && !asking && (
        <>
          {/* Qué se va a escribir, antes de escribirlo. No es una lista exacta
              —el comando no ofrece una previsualización— y por eso se declara
              como lo que es: dónde escribe, no cuántos archivos. */}
          <p className={styles.railScope}>{t('pipeline.openspec.rail.initWrites')}</p>
          <button
            type="button"
            className={styles.railInitAction}
            disabled={busy}
            onClick={onInitialize}
          >
            {busy ? t('pipeline.openspec.rail.initBusy') : t('pipeline.openspec.rail.init')}
          </button>
        </>
      )}

      {/* «No encontró herramientas» y «falló» piden respuestas distintas de
          quien lo lee, así que se muestran distinto: lo primero es una pregunta
          con su lista, lo segundo el motivo crudo del CLI. */}
      {asking && (
        <fieldset className={styles.railChoose} disabled={busy}>
          <legend>{t('pipeline.openspec.rail.chooseToolLabel')}</legend>
          <p>{t('pipeline.openspec.rail.chooseToolHelp')}</p>
          {/* Casillas y no una lista desplegable: se puede elegir más de una, y
              el CLI las toma juntas en una sola corrida —`--tools a,b`—. Un
              repositorio que se trabaja con dos ejecutores las necesita a las
              dos, y pedirlas de a una dejaría la segunda al olvido, que es
              exactamente el estado que este panel existe para evitar. */}
          <ul className={styles.railChooseList}>
            {OPENSPEC_TOOL_DIRECTORIES.map((tool) => (
              <li key={tool.toolId}>
                <label>
                  <input
                    type="checkbox"
                    checked={chosenTools.includes(tool.toolId)}
                    onChange={() => setChosenTools((current) => (
                      current.includes(tool.toolId)
                        ? current.filter((id) => id !== tool.toolId)
                        : [...current, tool.toolId]
                    ))}
                  />
                  <strong>{tool.label}</strong>
                  <code>{tool.directory}</code>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={styles.railInitAction}
            disabled={busy || chosenTools.length === 0}
            onClick={() => onInitializeWith?.(chosenTools)}
          >
            {busy
              ? t('pipeline.openspec.rail.initBusy')
              : t('pipeline.openspec.rail.chooseToolConfirm', { count: chosenTools.length })}
          </button>
        </fieldset>
      )}

      {error && <p className={styles.railError} role="alert">{error}</p>}
    </>
  );
}
