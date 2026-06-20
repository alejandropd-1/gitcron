'use client';

// CartoNodeDetail — Cartografía, Fase 5. PANEL DE DETALLE de un nodo (símbolo).
//
// Primera superficie "estrella": elegís un símbolo y la IA lo explica en lenguaje
// humano, bajado a tierra, para alguien no experto. La explicación se construye SOLO
// con contexto real y recortado (código del nodo + callers/callees/impacto del
// grafo), armado en main — este componente nunca ve el repo entero.
//
// Funciona con la IA apagada: en ese caso muestra al menos la estructura (ruta,
// relaciones, impacto). La explicación se cachea por contenido en main, así que
// re-abrir un nodo que no cambió no vuelve a gastar el modelo. Tokens --carto-*.

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertTriangle,
  Zap,
  ArrowRight,
  ArrowLeftRight,
  DatabaseZap,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { useGitStore } from '@/lib/git-store';
import type { CartoNode } from '@/lib/carto-types';
import type { CartoExplainNodeResult } from '@/types/carto-ai';

type CartoNodeDetailProps = {
  repoPath: string;
  /** Nodo seleccionado (para la cabecera inmediata, antes de que llegue el detalle). */
  node: CartoNode;
  /** Si la IA está activa (opt-in). Con ella apagada, sólo se muestra estructura. */
  aiEnabled: boolean;
  /** Volver a la lista de relaciones/símbolos del archivo. */
  onBack: () => void;
};

export function CartoNodeDetail({ repoPath, node, aiEnabled, onBack }: CartoNodeDetailProps) {
  const t = useT();
  const lang = useGitStore((s) => s.language);
  const [result, setResult] = useState<CartoExplainNodeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqToken = useRef(0);

  useEffect(() => {
    const token = ++reqToken.current;
    setResult(null);
    setError(null);
    setLoading(true);
    void window.api.cartoAi
      .explainNode(repoPath, node.id, lang)
      .then((res) => {
        if (token !== reqToken.current) return;
        if (res.success && res.data) setResult(res.data);
        else setError(res.error ?? t('cartography.detail.error'));
      })
      .catch((err) => {
        if (token !== reqToken.current) return;
        setError(err instanceof Error ? err.message : t('cartography.detail.error'));
      })
      .finally(() => {
        if (token === reqToken.current) setLoading(false);
      });
  }, [repoPath, node.id, lang, t]);

  const loc =
    node.startLine != null
      ? `${node.filePath}:${node.startLine}${node.endLine != null ? `-${node.endLine}` : ''}`
      : node.filePath;

  const ctx = result?.context;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Cabecera: volver + identidad del nodo */}
      <div className="flex shrink-0 items-center gap-2 border-b border-carto-grid px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          title={t('cartography.detail.back')}
          className="flex shrink-0 items-center gap-1 rounded border border-carto-grid px-1.5 py-0.5 text-[11px] font-semibold text-carto-text-muted transition-colors hover:border-carto-accent/50 hover:text-carto-text"
        >
          <ArrowLeft size={12} />
        </button>
        <Sparkles size={13} className="shrink-0 text-carto-accent" />
        <span className="truncate text-xs font-bold tracking-wide text-carto-text" title={node.name}>
          {node.name}
        </span>
        <span className="shrink-0 rounded border border-carto-accent/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-carto-accent">
          {node.kind}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-2.5">
        {/* Ruta */}
        <p className="mb-3 truncate font-mono text-[11px] text-carto-text-muted" title={loc}>
          {loc}
        </p>

        {/* Explicación de la IA (o estado) */}
        <ExplanationBlock
          aiEnabled={aiEnabled}
          loading={loading}
          error={error}
          result={result}
        />

        {/* Estructura: impacto + relaciones (siempre que haya contexto) */}
        {ctx && (
          <div className="mt-4 flex flex-col gap-3">
            <ImpactSection
              summary={t('cartography.graph.impactSummary', {
                files: ctx.impact.impactedFiles.length,
                symbols: ctx.impact.total,
              })}
              files={ctx.impact.impactedFiles}
            />
            <RelatedSection
              icon={<ArrowLeftRight size={13} className="text-carto-accent" />}
              title={t('cartography.detail.calledBy')}
              items={ctx.callers}
            />
            <RelatedSection
              icon={<ArrowRight size={13} className="text-carto-accent" />}
              title={t('cartography.detail.calls')}
              items={ctx.callees}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ExplanationBlock({
  aiEnabled,
  loading,
  error,
  result,
}: {
  aiEnabled: boolean;
  loading: boolean;
  error: string | null;
  result: CartoExplainNodeResult | null;
}) {
  const t = useT();

  if (error) {
    return <Banner tone="error" icon={<AlertTriangle size={14} />} text={error} />;
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-carto-text-muted">
        <Loader2 size={14} className="animate-spin text-carto-accent" />
        {aiEnabled ? t('cartography.detail.explaining') : t('cartography.detail.loading')}
      </div>
    );
  }

  const explanation = result?.explanation;
  const aiError = result?.aiError;

  // IA apagada: mostramos sólo estructura, con un aviso claro.
  if (!aiEnabled) {
    return <Banner tone="muted" icon={<Sparkles size={14} />} text={t('cartography.detail.aiOff')} />;
  }
  // IA activa pero falló (servidor caído, sin key…): estructura + aviso.
  if (aiError) {
    return <Banner tone="error" icon={<AlertTriangle size={14} />} text={aiError} />;
  }
  if (explanation) {
    return (
      <div className="rounded-lg border border-carto-grid bg-carto-canvas px-3 py-2.5">
        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-carto-text">
          {explanation.text}
        </p>
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-carto-text-muted/70">
          <span className="truncate">{explanation.provider}</span>
          {result?.cached && (
            <span className="flex shrink-0 items-center gap-1 rounded border border-carto-accent/25 px-1 py-0.5 text-carto-accent/80">
              <DatabaseZap size={10} />
              {t('cartography.detail.cached')}
            </span>
          )}
        </div>
      </div>
    );
  }
  return null;
}

function Banner({
  tone,
  icon,
  text,
}: {
  tone: 'error' | 'muted';
  icon: React.ReactNode;
  text: string;
}) {
  const cls =
    tone === 'error'
      ? 'border-[#ffa8a3]/30 bg-[#ffa8a3]/5 text-[#ffa8a3]'
      : 'border-carto-grid bg-carto-node/[0.03] text-carto-text-muted';
  return (
    <div className={`flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] ${cls}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 break-words leading-relaxed">{text}</span>
    </div>
  );
}

const LIST_CAP = 20;

function ImpactSection({ summary, files }: { summary: string; files: string[] }) {
  const t = useT();
  const shown = files.slice(0, LIST_CAP);
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Zap size={13} className="text-carto-accent" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-carto-text-muted">
          {t('cartography.graph.impact')}
        </span>
      </div>
      <p className="pl-5 text-[11px] text-carto-text-muted">{summary}</p>
      {shown.length > 0 && (
        <ul className="mt-0.5 flex flex-col gap-0.5 pl-5">
          {shown.map((p) => (
            <li key={p} className="truncate font-mono text-[11px] text-carto-text" title={p}>
              {p}
            </li>
          ))}
          {files.length > shown.length && (
            <li className="text-[11px] text-carto-text-muted">
              {t('cartography.graph.more', { count: files.length - shown.length })}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function RelatedSection({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: { name: string; kind: string; filePath: string }[];
}) {
  const t = useT();
  const shown = items.slice(0, LIST_CAP);
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-widest text-carto-text-muted">{title}</span>
        <span className="text-[11px] text-carto-text-muted">· {items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="pl-5 text-xs text-carto-text-muted/70">{t('cartography.graph.none')}</p>
      ) : (
        <ul className="flex flex-col gap-0.5 pl-5">
          {shown.map((it) => (
            <li
              key={`${it.filePath}#${it.name}`}
              className="truncate font-mono text-[11px] text-carto-text"
              title={`${it.name} — ${it.filePath}`}
            >
              <span className="text-carto-text">{it.name}</span>
              <span className="text-carto-text-muted/60"> · {it.filePath}</span>
            </li>
          ))}
          {items.length > shown.length && (
            <li className="text-[11px] text-carto-text-muted">
              {t('cartography.graph.more', { count: items.length - shown.length })}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
