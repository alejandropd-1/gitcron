'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
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
    // `glass-alert-warning` y no un fondo propio: es el estilo de aviso que el
    // proyecto ya tiene, con fondo opaco al 98%. La primera versión usaba un
    // ámbar al 5% y el texto se leía encima del grafo — Ale lo marcó.
    <div className={cn('glass-alert-warning rounded-lg p-3 text-sm', className)}>
      <p className="flex items-start gap-2 text-warning">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="font-medium">{t(failure.key, failure.params)}</span>
      </p>

      {failure.remedy && onRemedy && (
        <button
          type="button"
          className="mt-2.5 rounded bg-warning/15 px-3 py-1.5 text-xs font-bold text-warning transition-colors hover:bg-warning/25 disabled:opacity-50"
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
        className="mt-2 flex items-center gap-1 text-xs text-warning/70 transition-colors hover:text-warning"
        onClick={() => setShowRaw((open) => !open)}
        aria-expanded={showRaw}
      >
        <ChevronDown size={13} className={cn('transition-transform', showRaw && 'rotate-180')} aria-hidden="true" />
        {t('git.pushFailure.showRaw')}
      </button>
      {showRaw && (
        // `user-select` explícito: el caso de uso es copiarlo para pedir ayuda.
        <pre className="mt-1 max-h-48 select-text overflow-auto whitespace-pre-wrap break-words rounded bg-black/40 p-2 text-[var(--font-size-xs)] text-warning/80">
          {failure.raw}
        </pre>
      )}
    </div>
  );
}
