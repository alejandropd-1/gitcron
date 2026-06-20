'use client';

// CartoAskBox — Cartografía, Fase 4. Panel de chat de la IA (columna derecha).
//
// Conversación con turnos: el usuario pregunta, la IA responde, y el hilo se
// acumula para poder leer la charla completa (no se pisa la respuesta anterior).
// Consumidor mínimo de la capa de IA que prueba la aceptación de la fase: desde
// el repo activo, mandás prompts al proveedor elegido (local u online) y ves las
// respuestas. La visibilidad la gobierna la vista (sólo monta esto si la IA está
// activa), así que acá asumimos que está habilitada.
//
// No toca secretos: todo pasa por window.api.cartoAi, que dispara la petición en
// main. El contexto adjunto es sólo el archivo seleccionado (anclaje liviano).

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, AlertTriangle, Trash2, User, FileSearch } from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useT } from '@/hooks/use-translation';
import type { CartoAIContext } from '@/types/carto-ai';

type Turn =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'ai'; text: string; provider: string }
  | { id: number; role: 'error'; text: string };

type CartoAskBoxProps = {
  /** Repo activo, para traer las relaciones reales del grafo como grounding. */
  repoPath: string | null;
  /** Archivo seleccionado en el árbol; ancla la pregunta a sus relaciones. */
  selectedFile: string | null;
};

export function CartoAskBox({ repoPath, selectedFile }: CartoAskBoxProps) {
  const t = useT();
  const lang = useGitStore((s) => s.language);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const reqToken = useRef(0);
  const nextId = useRef(1);
  const threadRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último turno cuando el hilo crece o llega una respuesta.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, loading]);

  // Arma el contexto de la pregunta con las relaciones REALES del grafo (las
  // mismas del panel "Relaciones"): imports, usado-por e impacto. Sin esto, la IA
  // sólo recibía el nombre del archivo y — correctamente — decía que no podía
  // afirmar nada desde el grafo. Si el archivo no está indexado o falla la
  // lectura, mandamos sólo el filePath (grounding degrada, no rompe).
  async function buildContext(): Promise<CartoAIContext> {
    const ctx: CartoAIContext = { lang, filePath: selectedFile ?? undefined };
    if (!repoPath || !selectedFile) return ctx;
    try {
      const rel = await window.api.cartoGraph.fileRelations(repoPath, selectedFile);
      if (rel.success && rel.data && rel.data.indexed) {
        ctx.imports = rel.data.imports;
        ctx.usedBy = rel.data.usedBy;
        ctx.impact = {
          fileCount: rel.data.impact.impactedFiles.length,
          symbolCount: rel.data.impact.total,
          sampleFiles: rel.data.impact.impactedFiles.slice(0, 15),
        };
      }
    } catch {
      /* sin relaciones: la IA igual responde con lo que haya */
    }
    return ctx;
  }

  async function submit() {
    const q = question.trim();
    if (!q || loading) return;
    const token = ++reqToken.current;
    setTurns((prev) => [...prev, { id: nextId.current++, role: 'user', text: q }]);
    setQuestion('');
    setLoading(true);
    try {
      const res = await window.api.cartoAi.ask(q, await buildContext());
      if (token !== reqToken.current) return;
      if (res.success && res.data) {
        setTurns((prev) => [...prev, { id: nextId.current++, role: 'ai', text: res.data!.text, provider: res.data!.provider }]);
      } else {
        setTurns((prev) => [...prev, { id: nextId.current++, role: 'error', text: res.error ?? t('cartography.ai.error') }]);
      }
    } catch (err) {
      if (token !== reqToken.current) return;
      const msg = err instanceof Error ? err.message : t('cartography.ai.error');
      setTurns((prev) => [...prev, { id: nextId.current++, role: 'error', text: msg }]);
    } finally {
      if (token === reqToken.current) setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-carto-node/[0.02]">
      {/* Cabecera */}
      <div className="flex shrink-0 items-center gap-2 border-b border-carto-grid px-3 py-2">
        <Bot size={13} className="shrink-0 text-carto-accent" />
        <span className="truncate text-[11px] font-bold uppercase tracking-widest text-carto-text-muted">
          {t('cartography.ai.askTitle')}
        </span>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={() => setTurns([])}
            title={t('cartography.ai.clear')}
            className="ml-auto flex items-center gap-1 text-[11px] text-carto-text-muted transition-colors hover:text-carto-text"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Hilo de conversación */}
      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {turns.length === 0 && !loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-carto-text-muted">
            <Bot size={20} className="text-carto-accent" />
            <p className="max-w-[18rem] text-xs leading-relaxed">{t('cartography.ai.askPlaceholder')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {turns.map((turn) => (
              <Bubble key={turn.id} turn={turn} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-carto-text-muted">
                <Loader2 size={13} className="animate-spin text-carto-accent" />
                {t('cartography.ai.thinking')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hint de anclaje: sin archivo seleccionado, la pregunta no tiene grounding. */}
      {!selectedFile && (
        <div className="flex shrink-0 items-center gap-1.5 border-t border-carto-grid px-3 py-1.5 text-[11px] text-carto-text-muted">
          <FileSearch size={12} className="shrink-0 text-carto-accent/70" />
          <span className="min-w-0">{t('cartography.ai.noFileHint')}</span>
        </div>
      )}

      {/* Caja de entrada */}
      <div className={`flex shrink-0 items-center gap-2 px-3 py-2.5 ${selectedFile ? 'border-t border-carto-grid' : ''}`}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
          placeholder={t('cartography.ai.askPlaceholder')}
          disabled={loading}
          className="min-w-0 flex-1 rounded border border-carto-grid bg-carto-canvas px-2.5 py-1.5 text-xs text-carto-text placeholder:text-carto-text-muted/60 focus:border-carto-accent/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading || !question.trim()}
          className="shrink-0 flex items-center gap-1.5 rounded border border-carto-accent/40 bg-carto-accent/10 px-2.5 py-1.5 text-xs font-semibold text-carto-accent transition-colors hover:bg-carto-accent/20 disabled:opacity-40"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {t('cartography.ai.send')}
        </button>
      </div>
    </div>
  );
}

function Bubble({ turn }: { turn: Turn }) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] items-start gap-1.5 rounded-lg border border-carto-accent/30 bg-carto-accent/10 px-2.5 py-1.5 text-xs text-carto-text">
          <p className="min-w-0 whitespace-pre-wrap break-words">{turn.text}</p>
          <User size={12} className="mt-0.5 shrink-0 text-carto-accent" />
        </div>
      </div>
    );
  }
  if (turn.role === 'error') {
    return (
      <div className="flex items-start gap-1.5 rounded-lg border border-[#ffa8a3]/30 bg-[#ffa8a3]/5 px-2.5 py-1.5 text-[11px] text-[#ffa8a3]">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        <span className="min-w-0 break-words">{turn.text}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-lg border border-carto-grid bg-carto-canvas px-2.5 py-1.5 text-xs leading-relaxed text-carto-text">
        <p className="whitespace-pre-wrap break-words">{turn.text}</p>
        <p className="mt-1.5 font-mono text-[10px] text-carto-text-muted/70">{turn.provider}</p>
      </div>
    </div>
  );
}
