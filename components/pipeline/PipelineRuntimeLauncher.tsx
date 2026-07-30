'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { RuntimeDiscoveryEntry, RuntimeProjection } from '@/types/pipeline';
import { runtimeDisplayName } from './pipeline-domain';
import { canStartRuntimeSession } from './pipeline-guided-forms';

export type PipelineRuntimeLauncherProps = {
  repoPath: string;
  projection: RuntimeProjection | null;
  initialInstruction?: string;
  changeId?: string | null;
  taskId?: string | null;
  /**
   * Se invoca cuando el estado de descubrimiento cambia. El contenedor lo usa
   * para no pintar su marco mientras el launcher aún carga: un panel con marco
   * cuyo interior está vacío se percibe como un recuadro roto.
   */
  onDiscoveringChange?: (loading: boolean) => void;
  /**
   * `true` cuando hay un fixture de desarrollo en pantalla.
   *
   * Con datos inventados a la vista, arrancar una sesión real produciría una
   * pantalla donde lo observado y lo inventado son indistinguibles. Se bloquea
   * y se dice por qué, en vez de esconderlo: ocultarlo haría parecer que la
   * función no existe.
   */
  blockedByFixture?: boolean;
  /**
   * Etiqueta del CTA final. Por defecto es el genérico `Iniciar`; el flujo
   * guiado lo reemplaza por `Iniciar propuesta` / `Iniciar exploración`, que
   * dicen qué va a pasar en vez de sólo que algo pasará.
   */
  startLabelKey?: string;
  /** Se avisa después de un arranque exitoso, para que el compositor reaccione. */
  onStarted?: () => void;
};

/**
 * Arranque y corte de una sesión de runtime sobre el repo abierto.
 *
 * Es la única superficie de Pipeline que abre procesos, y por eso muestra sin
 * adornos lo que va a pasar: qué runtime, con qué versión, y que la instrucción
 * viaja tal cual al CLI.
 *
 * Sólo se ofrecen los runtimes que Main declaró `launchable`. Un runtime
 * instalado pero con versión distinta de la del fixture auditado aparece
 * deshabilitado con su motivo: `start()` abortaría igual, y un botón que tira
 * es peor que un botón ausente.
 */
export function PipelineRuntimeLauncher({
  repoPath,
  projection,
  initialInstruction = '',
  changeId = null,
  taskId = null,
  blockedByFixture = false,
  startLabelKey = 'pipeline.launcher.start',
  onStarted,
  onDiscoveringChange,
}: PipelineRuntimeLauncherProps) {
  const t = useT();
  const [discovery, setDiscovery] = useState<RuntimeDiscoveryEntry[] | null>(null);
  const [runtime, setRuntime] = useState<string>('');
  const [instruction, setInstruction] = useState(initialInstruction);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryToken, setDiscoveryToken] = useState(0);
  const [editingInstruction, setEditingInstruction] = useState(false);
  const [writeConfirmed, setWriteConfirmed] = useState(false);

  const active = projection?.active === true;
  // Un solo booleano para todos los controles: si hay fixture en pantalla, nada
  // acá puede tocarse, ni siquiera cortar una sesión que ya venía corriendo.
  const locked = blockedByFixture || busy;

  useEffect(() => {
    let cancelled = false;
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineRuntime) {
      queueMicrotask(() => {
        if (!cancelled) setDiscovery([]);
      });
      return undefined;
    }

    void api.pipelineRuntime.discover(repoPath).then((result) => {
      if (cancelled) return;
      const entries = result?.success ? result.data ?? [] : [];
      setDiscovery(entries);
      const firstLaunchable = entries.find((entry) => entry.launchable);
      if (firstLaunchable) setRuntime((current) => current || firstLaunchable.runtime);
    });

    return () => { cancelled = true; };
  }, [repoPath, discoveryToken]);

  // El contenedor pinta un marco apenas el launcher existe. Si el descubrimiento
  // todavía no resolvió, ese marco encierra un espacio vacío: se le avisa para
  // que no lo ofrezca hasta que haya algo que mostrar.
  useEffect(() => {
    onDiscoveringChange?.(discovery === null);
  }, [discovery, onDiscoveringChange]);

  const selectedEntry = discovery?.find((entry) => entry.runtime === runtime) ?? null;
  const modifiesRepo = selectedEntry?.startModifiesRepo === true;
  const canStart = canStartRuntimeSession({
    blockedByFixture,
    runtimeSelected: runtime,
    runtimeLaunchable: selectedEntry?.launchable === true,
    instruction,
    sessionActive: active,
    busy,
    modifiesRepo,
    writeConfirmed,
  });

  const handleStart = useCallback(async () => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!canStart || !api?.pipelineRuntime) return;
    setBusy(true);
    setError(null);
    const result = await api.pipelineRuntime.start({ repoPath, runtime, instruction, changeId, taskId });
    setBusy(false);
    // El error llega como código estable desde Main; se muestra crudo en vez de
    // traducirse a una frase amable que oculte la causa.
    if (!result?.success) setError(result?.error ?? 'start_failed');
    else onStarted?.();
  }, [canStart, repoPath, runtime, instruction, changeId, taskId, onStarted]);

  const handleStop = useCallback(async () => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (blockedByFixture || !api?.pipelineRuntime) return;
    setBusy(true);
    await api.pipelineRuntime.stop(repoPath);
    setBusy(false);
  }, [repoPath, blockedByFixture]);

  if (!discovery) {
    // No se devuelve null: un null dentro de un panel con marco deja un recuadro
    // vacío hasta que el IPC responde. Se dice qué está pasando y se ofrece
    // reintentar, igual que cuando el descubrimiento no encuentra nada lanzable.
    return (
      <section className="pipeline-launcher" aria-busy="true" aria-live="polite">
        <h3 className="pipeline-section__title">{t('pipeline.launcher.title')}</h3>
        <div className="pipeline-launcher__empty">
          <p>{t('pipeline.launcher.discovering')}</p>
        </div>
      </section>
    );
  }

  const launchable = discovery.filter((entry) => entry.launchable);

  return (
    <section
      className="pipeline-launcher"
      aria-labelledby="pipeline-launcher-title"
      data-blocked={blockedByFixture || undefined}
    >
      <h3 id="pipeline-launcher-title" className="pipeline-section__title">
        {t('pipeline.launcher.title')}
      </h3>

      {/* El bloqueo se comunica por texto y por atributo, no sólo por opacidad:
          el estado no puede depender únicamente de una señal visual. */}
      {blockedByFixture && (
        <p className="pipeline-launcher__blocked-fixture">{t('pipeline.launcher.blockedByFixture')}</p>
      )}

      {launchable.length === 0 ? (
        // Sin runtime lanzable la salida tiene que ser accionable: qué falta y
        // cómo volver a comprobarlo. Los motivos por runtime se listan abajo,
        // tal como los reportó el adaptador.
        <div className="pipeline-launcher__empty">
          <p>{t('pipeline.launcher.noneAvailable')}</p>
          <button
            type="button"
            className="pipeline-launcher__button"
            data-action="recheck"
            disabled={locked}
            onClick={() => setDiscoveryToken((token) => token + 1)}
          >
            {t('pipeline.launcher.recheck')}
          </button>
        </div>
      ) : (
        <div className="pipeline-launcher__form">
          <label className="pipeline-launcher__field">
            <span className="pipeline-launcher__label">{t('pipeline.launcher.runtime')}</span>
            <select
              className="pipeline-launcher__select"
              value={runtime}
              disabled={active || locked}
              onChange={(event) => setRuntime(event.target.value)}
            >
              {launchable.map((entry) => (
                <option key={entry.runtime} value={entry.runtime}>
                  {runtimeDisplayName(entry.runtime)}
                  {entry.runtimeVersion ? ` · ${entry.runtimeVersion}` : ''}
                </option>
              ))}
            </select>
          </label>

          {/* La disponibilidad del runtime elegido se dice antes del CTA, no
              después de que falle. */}
          {selectedEntry && (
            <p className="pipeline-launcher__availability" data-launchable={selectedEntry.launchable}>
              {selectedEntry.runtimeVersion
                ? t('pipeline.launcher.availabilityVersion', {
                  runtime: runtimeDisplayName(selectedEntry.runtime) ?? selectedEntry.runtime,
                  version: selectedEntry.runtimeVersion,
                })
                : t('pipeline.launcher.availabilityUnknownVersion', {
                  runtime: runtimeDisplayName(selectedEntry.runtime) ?? selectedEntry.runtime,
                })}
            </p>
          )}

          {/* `evidenceStatus` es informativo, no bloqueante: tras retirar el gate
              de versión, un runtime no verificado igual arranca. Se avisa antes
              del CTA para que la persona sepa que el protocolo no se probó contra
              una referencia, no para impedir el arranque. */}
          {selectedEntry && selectedEntry.evidenceStatus && selectedEntry.evidenceStatus !== 'verified' && (
            <p className="pipeline-launcher__unverified" data-evidence={selectedEntry.evidenceStatus}>
              {t('pipeline.launcher.unverified')}
            </p>
          )}

          {/* El alcance declarado va antes del CTA. Un runtime que corre con
              herramientas de sólo lectura puede analizar y reportar, pero no
              modificar el repositorio, y eso hay que decirlo antes de gastar
              una corrida, no después. */}
          {/* El campo llega por IPC: si un Main más viejo no lo emite, no se
              inventa un alcance, simplemente no se afirma nada. */}
          {modifiesRepo && (
            <p className="pipeline-launcher__scope" data-availability="writes">
              {t('pipeline.launcher.scope.writes')}
              {(selectedEntry?.startConstraints ?? []).length > 0
                && ` · ${(selectedEntry?.startConstraints ?? []).join(' · ')}`}
            </p>
          )}
          {selectedEntry?.startAvailability && selectedEntry.startAvailability !== 'available' && (
            <p className="pipeline-launcher__scope" data-availability={selectedEntry.startAvailability}>
              {t(`pipeline.launcher.scope.${selectedEntry.startAvailability}`)}
              {(selectedEntry.startConstraints ?? []).length > 0
                && ` · ${(selectedEntry.startConstraints ?? []).join(' · ')}`}
            </p>
          )}

          {/* La instrucción ya viene compuesta desde el flujo guiado. Editarla es
              una salida avanzada, no el primer campo que la persona enfrenta. */}
          <div className="pipeline-launcher__field">
            <button
              type="button"
              className="pipeline-launcher__disclosure"
              aria-expanded={editingInstruction}
              onClick={() => setEditingInstruction((value) => !value)}
            >
              {editingInstruction ? t('pipeline.launcher.hideInstruction') : t('pipeline.launcher.showInstruction')}
            </button>
            {editingInstruction ? (
              <textarea
                className="pipeline-launcher__instruction"
                aria-label={t('pipeline.launcher.instruction')}
                value={instruction}
                rows={4}
                disabled={active || locked}
                onChange={(event) => setInstruction(event.target.value)}
              />
            ) : (
              <pre className="pipeline-launcher__instruction-preview">{instruction}</pre>
            )}
          </div>

          {/* Una sesión que edita el repositorio se confirma a mano. El aviso
              dice qué va a pasar y qué queda afuera, no un "¿estás seguro?". */}
          {modifiesRepo && !active && (
            <label className="pipeline-launcher__confirm">
              <input
                type="checkbox"
                checked={writeConfirmed}
                disabled={locked}
                onChange={(event) => setWriteConfirmed(event.target.checked)}
              />
              <span>{t('pipeline.launcher.confirmWrite')}</span>
            </label>
          )}

          <div className="pipeline-launcher__actions">
            {active ? (
              <button type="button" className="pipeline-launcher__button" data-action="stop" disabled={locked} onClick={handleStop}>
                {t('pipeline.launcher.stop')}
              </button>
            ) : (
              <button
                type="button"
                className="pipeline-launcher__button"
                data-action="start"
                disabled={!canStart}
                onClick={handleStart}
              >
                {t(startLabelKey)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Un runtime instalado que no se puede lanzar dice por qué. Ocultarlo
          haría parecer que no está instalado, que es otra cosa. */}
      {discovery.filter((entry) => entry.installed && !entry.launchable).map((entry) => (
        <p key={entry.runtime} className="pipeline-launcher__blocked">
          {runtimeDisplayName(entry.runtime)}
          {': '}
          {entry.diagnostics[0] ?? t('pipeline.launcher.blockedUnknown')}
        </p>
      ))}

      {error && <p className="pipeline-launcher__error" role="alert">{error}</p>}
    </section>
  );
}
