'use client';

// CartoAskBox — Cartografía, Fase 4. La "ventanita de preguntas".
//
// Consumidor mínimo de la capa de IA que prueba la aceptación de la fase: desde
// el repo activo, mandás un prompt al proveedor elegido (local u online) y ves la
// respuesta. Si la IA está apagada NO se renderiza (la vista sigue igual); si el
// proveedor está caído, muestra el error claro inline y no rompe nada.
//
// No toca secretos: todo pasa por window.api.cartoAi, que dispara la petición en
// main. El contexto que adjunta es sólo el archivo seleccionado (anclaje liviano).

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, AlertTriangle, X } from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useT } from '@/hooks/use-translation';
import type { CartoAIResponse } from '@/types/carto-ai';

type CartoAskBoxProps = {
  /** Archivo seleccionado en el árbol, adjuntado como contexto liviano. */
  selectedFile: string | null;
};

export function CartoAskBox({ selectedFile }: CartoAskBoxProps) {
  const t = useT();
  const lang = useGitStore((s) => s.language);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<CartoAIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const reqToken = useRef(0);

  // Leemos las preferencias al montar. Si la IA está apagada, no mostramos nada.
  useEffect(() => {
    let active = true;
    void window.api.cartoAi.getSettings().then((res) => {
      if (active) setEnabled(res.success && res.data ? res.data.enabled : false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function submit() {
    const q = question.trim();
    if (!q || loading) return;
    const token = ++reqToken.current;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await window.api.cartoAi.ask(q, {
        lang,
        filePath: selectedFile ?? undefined,
      });
      if (token !== reqToken.current) return;
      if (res.success && res.data) setAnswer(res.data);
      else setError(res.error ?? t('cartography.ai.error'));
    } catch (err) {
      if (token !== reqToken.current) return;
      setError(err instanceof Error ? err.message : t('cartography.ai.error'));
    } finally {
      if (token === reqToken.current) setLoading(false);
    }
  }

  // IA apagada (o aún cargando preferencias): la vista no muestra IA.
  if (!enabled) return null;

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-carto-accent/20 bg-carto-node/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Bot size={13} className="shrink-0 text-carto-accent" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-carto-text-muted">
          {t('cartography.ai.askTitle')}
        </span>
      </div>

      <div className="flex items-center gap-2">
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
          {loading ? t('cartography.ai.thinking') : t('cartography.ai.send')}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-1.5 rounded border border-[#ffa8a3]/30 bg-[#ffa8a3]/5 px-2.5 py-1.5 text-[11px] text-[#ffa8a3]">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span className="min-w-0">{error}</span>
        </div>
      )}

      {answer && (
        <div className="relative rounded border border-carto-grid bg-carto-canvas px-3 py-2 text-xs leading-relaxed text-carto-text">
          <button
            type="button"
            onClick={() => setAnswer(null)}
            aria-label={t('cartography.ai.clear')}
            className="absolute right-1.5 top-1.5 text-carto-text-muted hover:text-carto-text"
          >
            <X size={13} />
          </button>
          <p className="whitespace-pre-wrap pr-5">{answer.text}</p>
          <p className="mt-1.5 font-mono text-[10px] text-carto-text-muted/70">{answer.provider}</p>
        </div>
      )}
    </div>
  );
}
