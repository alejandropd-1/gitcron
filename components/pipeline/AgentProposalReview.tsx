'use client';

import React, { useMemo, useState } from 'react';
import { Bot, Check, CheckCheck, Edit3, Eye, RotateCcw, X, XCircle } from 'lucide-react';
import { DiffViewer, type DiffHunk, type HunkProposalStatus, parseDiff } from '@/components/DiffViewer';
import { applyHunksToContent, generateUnifiedDiff } from '@/lib/diff-proposal';
import { cn } from '@/lib/utils';
import { useT } from '@/hooks/use-translation';

export interface AgentProposalReviewProps {
  filePath?: string;
  originalContent: string;
  proposedContent?: string;
  diff?: string;
  title?: string;
  isWriting?: boolean;
  onConfirm: (finalContent: string) => Promise<void> | void;
  onDiscard: () => void;
}

export const AgentProposalReview: React.FC<AgentProposalReviewProps> = ({
  filePath = 'spec.md',
  originalContent,
  proposedContent,
  diff: directDiff,
  title,
  isWriting = false,
  onConfirm,
  onDiscard,
}) => {
  const t = useT();

  // Calcular el diff unificado si no se pasó directamente
  const computedDiff = useMemo(() => {
    if (directDiff) return directDiff;
    if (proposedContent !== undefined) {
      return generateUnifiedDiff(originalContent, proposedContent, filePath);
    }
    return '';
  }, [directDiff, proposedContent, originalContent, filePath]);

  const hunks = useMemo(() => parseDiff(computedDiff), [computedDiff]);

  // Estado por bloque: por defecto todos 'pending' para que la persona decida
  const [hunkStatuses, setHunkStatuses] = useState<Record<number, HunkProposalStatus>>({});
  const [viewMode, setViewMode] = useState<'diff' | 'edit'>('diff');
  const [manualText, setManualText] = useState<string | null>(null);

  // Índices aceptados
  const acceptedHunkIndices = useMemo(() => {
    const set = new Set<number>();
    hunks.forEach((_, i) => {
      if (hunkStatuses[i] === 'applied') set.add(i);
    });
    return set;
  }, [hunks, hunkStatuses]);

  // Contenido calculado automáticamente aplicando los bloques aceptados
  const autoCalculatedContent = useMemo(() => {
    return applyHunksToContent(originalContent, hunks, acceptedHunkIndices);
  }, [originalContent, hunks, acceptedHunkIndices]);

  // Contenido final a escribir: texto manual si fue editado, o calculado automáticamente
  const finalContent = manualText !== null ? manualText : autoCalculatedContent;

  const handleApplyHunk = (hunkIndex: number) => {
    setHunkStatuses((prev) => ({ ...prev, [hunkIndex]: 'applied' }));
    setManualText(null); // Resetea edición manual para reflejar el cambio de bloques
  };

  const handleDiscardHunk = (hunkIndex: number) => {
    setHunkStatuses((prev) => ({ ...prev, [hunkIndex]: 'discarded' }));
    setManualText(null);
  };

  const handleApplyAll = () => {
    const next: Record<number, HunkProposalStatus> = {};
    hunks.forEach((_, i) => {
      next[i] = 'applied';
    });
    setHunkStatuses(next);
    setManualText(null);
  };

  const handleDiscardAll = () => {
    const next: Record<number, HunkProposalStatus> = {};
    hunks.forEach((_, i) => {
      next[i] = 'discarded';
    });
    setHunkStatuses(next);
    setManualText(null);
  };

  const handleReset = () => {
    setHunkStatuses({});
    setManualText(null);
  };

  const counts = useMemo(() => {
    let applied = 0;
    let discarded = 0;
    let pending = 0;
    hunks.forEach((_, i) => {
      const st = hunkStatuses[i] ?? 'pending';
      if (st === 'applied') applied++;
      else if (st === 'discarded') discarded++;
      else pending++;
    });
    return { applied, discarded, pending, total: hunks.length };
  }, [hunks, hunkStatuses]);

  const hasModifications = finalContent !== originalContent;

  return (
    <div className="flex flex-col h-full bg-bg-base border border-border-subtle/40 rounded-lg overflow-hidden select-none">
      {/* Banner de lo Especulativo (Distinción visual estricta con tokens existentes) */}
      <div className="px-4 py-2 bg-accent-purple/10 border-b border-dashed border-accent-purple/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-accent-purple/20 text-accent-purple">
            <Bot size={16} />
          </span>
          <div>
            <div className="text-xs font-semibold text-accent-purple flex items-center gap-2">
              <span>{title || 'Propuesta de agente · Estado especulativo'}</span>
              <span className="text-[length:var(--font-size-2xs)] px-1.5 py-0.2 rounded border border-accent-purple/40 bg-accent-purple/15 font-mono">
                NO ESCRITO
              </span>
            </div>
            <p className="text-[length:var(--font-size-2xs)] text-text-secondary">
              Revisá los cambios bloque a bloque. Nada se escribirá en disco hasta que confirmes explícitamente.
            </p>
          </div>
        </div>

        {/* Acciones globales de bloques */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[length:var(--font-size-2xs)] font-mono text-text-secondary flex gap-2 mr-2">
            <span className="text-git-add font-medium">{counts.applied} aceptados</span>
            <span className="text-text-secondary/60">·</span>
            <span className="text-error font-medium">{counts.discarded} descartados</span>
            <span className="text-text-secondary/60">·</span>
            <span className="text-accent-purple font-medium">{counts.pending} pendientes</span>
          </div>

          <button
            type="button"
            onClick={handleApplyAll}
            title="Aceptar todos los bloques"
            className="px-2 py-1 rounded text-xs border border-git-add/30 bg-git-add/10 text-git-add hover:bg-git-add/20 flex items-center gap-1"
          >
            <CheckCheck size={13} />
            <span>Todos</span>
          </button>
          <button
            type="button"
            onClick={handleDiscardAll}
            title="Descartar todos los bloques"
            className="px-2 py-1 rounded text-xs border border-error/30 bg-error/10 text-error hover:bg-error/20 flex items-center gap-1"
          >
            <XCircle size={13} />
            <span>Ninguno</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Restablecer decisiones"
            className="p-1 rounded text-text-secondary hover:bg-bg-overlay border border-border-subtle/30"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Barra de control: archivo y selector de vista */}
      <div className="px-4 py-2 bg-bg-surface border-b border-border-subtle/20 flex items-center justify-between shrink-0">
        <span className="text-xs font-mono text-text-primary truncate">{filePath}</span>

        <div className="flex items-center gap-1 bg-bg-base p-0.5 rounded border border-border-subtle/30 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('diff')}
            className={cn(
              'px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors',
              viewMode === 'diff'
                ? 'bg-bg-overlay text-text-primary font-medium shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <Eye size={12} />
            <span>Bloques ({hunks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={cn(
              'px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors',
              viewMode === 'edit'
                ? 'bg-bg-overlay text-text-primary font-medium shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <Edit3 size={12} />
            <span>Editar resultado {manualText !== null && '•'}</span>
          </button>
        </div>
      </div>

      {/* Contenido principal: DiffViewer o Editor de resultado */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {viewMode === 'diff' ? (
          <DiffViewer
            diff={computedDiff}
            filePath={filePath}
            hunkActions={{
              mode: 'proposal',
              onApplyHunk: handleApplyHunk,
              onDiscardHunk: handleDiscardHunk,
              hunkStatuses,
            }}
          />
        ) : (
          <div className="flex flex-col h-full p-4 bg-bg-base">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">
                {manualText !== null
                  ? 'Texto editado manualmente. Prevalecerá al confirmar.'
                  : 'Resultado calculado de los bloques aceptados. Podés ajustar el texto antes de confirmar:'}
              </span>
              {manualText !== null && (
                <button
                  type="button"
                  onClick={() => setManualText(null)}
                  className="text-xs text-secondary hover:underline"
                >
                  Volver al cálculo automático de bloques
                </button>
              )}
            </div>
            <textarea
              value={finalContent}
              onChange={(e) => setManualText(e.target.value)}
              className="flex-1 w-full bg-bg-surface text-text-primary font-mono text-xs p-3 rounded border border-border-subtle/30 resize-none focus:outline-none focus:border-primary/50 leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* Barra de confirmación inferior */}
      <div className="px-4 py-3 bg-bg-surface border-t border-border-subtle/30 flex items-center justify-between shrink-0">
        <div className="text-xs text-text-secondary">
          {!hasModifications ? (
            <span className="italic">Sin cambios aceptados respecto al archivo actual.</span>
          ) : (
            <span className="text-git-add font-medium">
              Listo para escribir {counts.applied} bloque(s) aceptado(s)
              {manualText !== null ? ' con modificaciones manuales' : ''}.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="proposal-discard-btn"
            onClick={onDiscard}
            disabled={isWriting}
            className="px-3 py-1.5 rounded text-xs border border-border-subtle/40 bg-bg-base text-text-secondary hover:bg-bg-overlay hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <span className="flex items-center gap-1.5">
              <X size={13} />
              <span>Descartar propuesta</span>
            </span>
          </button>

          <button
            type="button"
            data-testid="proposal-confirm-btn"
            onClick={() => onConfirm(finalContent)}
            disabled={isWriting}
            className="px-4 py-1.5 rounded text-xs bg-primary text-bg-surface font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            <Check size={14} />
            <span>{isWriting ? 'Escribiendo...' : 'Confirmar y escribir'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
