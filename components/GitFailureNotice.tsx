'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { describePushFailure, type FailureRemedy } from '@/lib/git-failure-message';
import { cn } from '@/lib/utils';

/**
 * Lo que se muestra cuando un push falla.
 *
 * Reemplaza al cartel rojo con la salida cruda de Git. Ale apretó PUSH y recibió
 * ocho líneas en inglés nombrando `push.default` y `branch.autoSetupMerge`; su
 * primera reacción fue preguntar si era un problema de conexión. Cuando el texto
 * no se entiende se adivina la causa equivocada, y en Git eso lleva a tocar el
 * historial.
 *
 * Tres reglas que sostiene este componente:
 *
 * 1. **El texto de Git nunca se pierde.** Va plegado, no reemplazado: cuando la
 *    explicación acierta sobra, y cuando falla es lo único que sirve —y lo que
 *    hay que pegar para pedir ayuda afuera—.
 * 2. **La acción la ejecuta la persona.** Empujar y reapuntar tocan el remoto.
 * 3. **Sin salida no hay botón.** Uno que no resuelve nada es peor que ninguno.
 */
export function GitFailureNotice({
  error,
  onRemedy,
  busy = false,
  className,
}: {
  error: string;
  /** Se llama sólo si la persona aprieta. Nunca se dispara solo. */
  onRemedy?: (remedy: NonNullable<FailureRemedy>) => void;
  busy?: boolean;
  className?: string;
}) {
  const t = useT();
  const [showRaw, setShowRaw] = useState(false);
  const failure = describePushFailure(error);

  return (
    <div className={cn('rounded border border-amber-500/40 bg-amber-500/5 p-3 text-sm', className)}>
      <p className="flex items-start gap-2 text-text-primary">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
        <span>{t(failure.key, failure.params)}</span>
      </p>

      {failure.remedy && onRemedy && (
        <button
          type="button"
          className="mt-2 rounded border border-amber-500/50 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-500/10 disabled:opacity-40"
          disabled={busy}
          onClick={() => onRemedy(failure.remedy!)}
        >
          {t(failure.remedy.kind === 'repoint-upstream'
            ? 'git.pushFailure.repoint'
            : 'git.pushFailure.pullFirst')}
        </button>
      )}

      {/* Plegado y no oculto: quien lo necesita lo encuentra, y quien no, no lo
          tiene que leer. */}
      <button
        type="button"
        className="mt-2 flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
        onClick={() => setShowRaw((open) => !open)}
        aria-expanded={showRaw}
      >
        <ChevronRight size={13} className={cn('transition-transform', showRaw && 'rotate-90')} aria-hidden="true" />
        {t('git.pushFailure.showRaw')}
      </button>
      {showRaw && (
        // `user-select` explícito: el caso de uso es copiarlo para pedir ayuda.
        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-[11px] text-text-secondary select-text">
          {failure.raw}
        </pre>
      )}
    </div>
  );
}
