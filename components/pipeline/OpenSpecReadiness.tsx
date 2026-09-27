'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { OpenSpecToolEvidence, OpenSpecToolReport } from '@/types/pipeline';
import { useT } from '@/hooks/use-translation';
import snapshot from '@/electron/pipeline/openspec-tools-snapshot.json';
import styles from './OpenSpecDashboard.module.css';

/**
 * Lista y configuración de herramientas de OpenSpec en el panel inspector lateral.
 *
 * `OpenSpecToolList` es la **referencia**: la lista completa de herramientas detectadas
 * en el repositorio y su estado de configuración de skills/instrucciones. Se ubica en la
 * sección «Herramientas» del inspector derecho y permite ejecutar la inicialización de
 * OpenSpec (`openspec init`) o seleccionar herramientas interactivamente cuando el CLI
 * lo requiere.
 */

export type OpenSpecToolListProps = {
  present?: boolean;
  tools?: OpenSpecToolEvidence[];
  toolReport?: OpenSpecToolReport | null;
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
  uncommittedCount?: number;
};

export function OpenSpecToolList({
  present,
  tools,
  toolReport,
  onInitialize,
  busy,
  error,
  needsTool,
  onInitializeWith,
  uncommittedCount,
}: OpenSpecToolListProps) {
  const t = useT();
  const [chosenTools, setChosenTools] = useState<string[]>([]);
  const list = tools ?? [];
  const pending = list.filter((tool) => !tool.configured);

  const [selectedInitTools, setSelectedInitTools] = useState<string[]>(() => list.map((t) => t.toolId));
  const [showConfigureSelector, setShowConfigureSelector] = useState(false);
  const [chosenPendingTools, setChosenPendingTools] = useState<string[]>(() => pending.map((t) => t.toolId));
  const [initSuccessResult, setInitSuccessResult] = useState<string | null>(null);
  const [configureSuccessResult, setConfigureSuccessResult] = useState<string | null>(null);

  if (present === undefined) return null;

  // Se ofrece inicializar cuando hay algo que resolver: sin OpenSpec, o con
  // alguna herramienta sin configurar. Con todo en orden el botón no aparece.
  const canInitialize = Boolean(onInitialize || onInitializeWith) && (!present || pending.length > 0);
  /** El CLI no pudo detectar nada y la respuesta que falta es una elección. */
  const asking = Boolean(needsTool && onInitializeWith);
  const selectableTools = toolReport?.tools ?? snapshot.tools;

  const handleInit = async () => {
    setInitSuccessResult(null);
    const chosen = selectedInitTools.length > 0 ? selectedInitTools : undefined;
    if (onInitializeWith && chosen) {
      onInitializeWith(chosen);
    } else if (onInitialize) {
      onInitialize();
    }
    const toolNames = (chosen ?? list.map((t) => t.toolId))
      .map((id) => list.find((t) => t.toolId === id)?.label ?? id)
      .join(', ');
    const count = uncommittedCount ?? 0;
    const msg = count === 1
      ? t('pipeline.openspec.init.successResultSingle', { tools: toolNames })
      : count > 1
      ? t('pipeline.openspec.init.successResult', { tools: toolNames, count })
      : t('pipeline.openspec.init.successResultNoFiles', { tools: toolNames });
    setInitSuccessResult(msg);
  };

  const handleConfigurePending = async () => {
    setConfigureSuccessResult(null);
    if (onInitializeWith && chosenPendingTools.length > 0) {
      onInitializeWith(chosenPendingTools);
    } else if (onInitialize) {
      onInitialize();
    }
    setShowConfigureSelector(false);
    const toolNames = chosenPendingTools
      .map((id) => pending.find((t) => t.toolId === id)?.label ?? id)
      .join(', ');
    const count = uncommittedCount ?? 0;
    const msg = count === 1
      ? t('pipeline.openspec.engine.configureSuccessResultSingle', { tools: toolNames })
      : count > 1
      ? t('pipeline.openspec.engine.configureSuccessResult', { tools: toolNames, count })
      : t('pipeline.openspec.engine.configureSuccessResultNoFiles', { tools: toolNames });
    setConfigureSuccessResult(msg);
  };

  const pendingLabels = pending.map((t) => t.label).join(', ');

  return (
    <>
      {!present && <p className={styles.railEmpty}>{t('pipeline.openspec.readiness.missingTitle')}</p>}

      {present && list.length === 0 && (
        <p className={styles.railEmpty}>{t('pipeline.openspec.rail.noTools')}</p>
      )}

      {/* 6.2 Repositorio sin OpenSpec: bloque único con herramientas detectadas preseleccionadas */}
      {!present && list.length > 0 && !asking && (
        <fieldset className={styles.railChoose} disabled={busy}>
          <legend>{t('pipeline.openspec.engine.axis.tools')}</legend>
          <ul className={styles.railChooseList}>
            {list.map((tool) => (
              <li key={tool.toolId}>
                <label className={styles.railChooseOption}>
                  <input
                    type="checkbox"
                    checked={selectedInitTools.includes(tool.toolId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInitTools((prev) => [...prev, tool.toolId]);
                      } else {
                        setSelectedInitTools((prev) => prev.filter((id) => id !== tool.toolId));
                      }
                    }}
                  />
                  <strong>{tool.label}</strong>
                  <code>{tool.directory}</code>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {/* 6.4 Maqueta con 4 columnas fijas: ícono, nombre, carpeta, estado (sin botón individual por fila) */}
      {present && list.length > 0 && (
        <ul className={styles.readinessList}>
          {list.map((tool) => {
            return (
              <li key={tool.toolId} data-configured={tool.configured}>
                {tool.configured ? (
                  <CheckCircle2 size={13} aria-hidden="true" />
                ) : (
                  <AlertCircle size={13} aria-hidden="true" />
                )}
                <strong>{tool.label}</strong>
                <code>{tool.directory}</code>
                <em>
                  {tool.configured
                    ? t('pipeline.openspec.readiness.configured')
                    : t('pipeline.openspec.engine.pendingTool', { tool: tool.label })}
                </em>
              </li>
            );
          })}
        </ul>
      )}

      {/* 6.3 Repositorio con OpenSpec: una sola línea y un solo botón Configurar... para pendientes */}
      {present && pending.length > 0 && !asking && (
        <div className={styles.pendingBlockContainer}>
          <div className={styles.summaryFactRow}>
            <span>{t('pipeline.openspec.engine.pendingToolsDetected', { tools: pendingLabels })}</span>
            <button
              type="button"
              className={styles.secondaryAction}
              disabled={busy}
              onClick={() => setShowConfigureSelector((prev) => !prev)}
            >
              {t('pipeline.openspec.engine.configureActionEllipsis')}
            </button>
          </div>

          {showConfigureSelector && (
            <fieldset className={styles.pendingToolsSelectorFieldset} disabled={busy}>
              <ul className={styles.railChooseList}>
                {pending.map((tool) => (
                  <li key={tool.toolId}>
                    <label className={styles.railChooseOption}>
                      <input
                        type="checkbox"
                        checked={chosenPendingTools.includes(tool.toolId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setChosenPendingTools((prev) => [...prev, tool.toolId]);
                          } else {
                            setChosenPendingTools((prev) => prev.filter((id) => id !== tool.toolId));
                          }
                        }}
                      />
                      <span>{tool.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className={styles.pendingToolsSelectorActions}>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  disabled={busy || chosenPendingTools.length === 0}
                  onClick={() => void handleConfigurePending()}
                >
                  {t('pipeline.openspec.engine.configureAction')}
                </button>
              </div>
            </fieldset>
          )}

          {configureSuccessResult && (
            <p className={styles.configureResultLine} role="status">
              {configureSuccessResult}
            </p>
          )}
        </div>
      )}

      {pending.length > 0 && <p className={styles.railScope}>{t('pipeline.openspec.rail.toolsHelp')}</p>}

      {/* Botón único de inicialización cuando el repo no está inicializado */}
      {canInitialize && !asking && (!present || pending.length > 0) && (
        <div className={styles.railInitActionContainer}>
          <p className={styles.railScope}>{t('pipeline.openspec.rail.initWrites')}</p>
          <button
            type="button"
            className={styles.railInitAction}
            disabled={busy || (!present && list.length > 0 && selectedInitTools.length === 0)}
            onClick={() => void handleInit()}
          >
            {busy ? t('pipeline.openspec.rail.initBusy') : t('pipeline.openspec.rail.init')}
          </button>
          {initSuccessResult && (
            <p className={styles.initSuccessResult} role="status">
              {initSuccessResult}
            </p>
          )}
        </div>
      )}

      {/* Pregunta cuando el CLI no detectó ninguna herramienta */}
      {asking && (
        <fieldset className={styles.railChoose} disabled={busy}>
          <legend>{t('pipeline.openspec.rail.chooseToolLabel')}</legend>
          <p>{t('pipeline.openspec.rail.chooseToolHelp')}</p>
          <ul className={styles.railChooseList}>
            {selectableTools.map((tool) => (
              <li key={tool.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={chosenTools.includes(tool.id)}
                    onChange={() => setChosenTools((current) => (
                      current.includes(tool.id)
                        ? current.filter((id) => id !== tool.id)
                        : [...current, tool.id]
                    ))}
                  />
                  <strong>{tool.label}</strong>
                  <code>{tool.skillsDir}</code>
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
