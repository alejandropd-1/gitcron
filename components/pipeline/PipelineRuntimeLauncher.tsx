'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/hooks/use-translation';
import type { RuntimeDiscoveryEntry, RuntimeProjection } from '@/types/pipeline';
import { runtimeDisplayName } from './pipeline-domain';

export type PipelineRuntimeLauncherProps = {
  repoPath: string;
  projection: RuntimeProjection | null;
  /**
   * `true` cuando hay un fixture de desarrollo en pantalla.
   *
   * Con datos inventados a la vista, arrancar una sesión real produciría una
   * pantalla donde lo observado y lo inventado son indistinguibles. Se bloquea
   * y se dice por qué, en vez de esconderlo: ocultarlo haría parecer que la
   * función no existe.
   */
  blockedByFixture?: boolean;
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
  blockedByFixture = false,
}: PipelineRuntimeLauncherProps) {
  const t = useT();
  const [discovery, setDiscovery] = useState<RuntimeDiscoveryEntry[] | null>(null);
  const [runtime, setRuntime] = useState<string>('');
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = projection?.active === true;
  // Un solo booleano para todos los controles: si hay fixture en pantalla, nada
  // acá puede tocarse, ni siquiera cortar una sesión que ya venía corriendo.
  const locked = blockedByFixture || busy;

  useEffect(() => {
    let cancelled = false;
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineRuntime) return undefined;

    void api.pipelineRuntime.discover(repoPath).then((result) => {
      if (cancelled) return;
      const entries = result?.success ? result.data ?? [] : [];
      setDiscovery(entries);
      const firstLaunchable = entries.find((entry) => entry.launchable);
      if (firstLaunchable) setRuntime((current) => current || firstLaunchable.runtime);
    });

    return () => { cancelled = true; };
  }, [repoPath]);

  const handleStart = useCallback(async () => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (blockedByFixture || !api?.pipelineRuntime || !runtime || !instruction.trim()) return;
    setBusy(true);
    setError(null);
    const result = await api.pipelineRuntime.start({ repoPath, runtime, instruction });
    setBusy(false);
    // El error llega como código estable desde Main; se muestra crudo en vez de
    // traducirse a una frase amable que oculte la causa.
    if (!result?.success) setError(result?.error ?? 'start_failed');
  }, [repoPath, runtime, instruction, blockedByFixture]);

  const handleStop = useCallback(async () => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (blockedByFixture || !api?.pipelineRuntime) return;
    setBusy(true);
    await api.pipelineRuntime.stop(repoPath);
    setBusy(false);
  }, [repoPath, blockedByFixture]);

  if (!discovery) return null;

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
        <p className="pipeline-launcher__empty">{t('pipeline.launcher.noneAvailable')}</p>
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

          <label className="pipeline-launcher__field">
            <span className="pipeline-launcher__label">{t('pipeline.launcher.instruction')}</span>
            <textarea
              className="pipeline-launcher__instruction"
              value={instruction}
              rows={3}
              disabled={active || locked}
              onChange={(event) => setInstruction(event.target.value)}
            />
          </label>

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
                disabled={locked || !instruction.trim()}
                onClick={handleStart}
              >
                {t('pipeline.launcher.start')}
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
