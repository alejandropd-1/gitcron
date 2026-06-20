'use client';

// CartoRelationsPanel — Cartografía, Fase 3.
//
// Panel TEXTUAL de relaciones de un archivo, con datos REALES del motor CodeGraph
// embebido (vía IPC carto:graph-file-relations). Existe para poder QA el grounding
// estructural SIN el grafo visual (que llega en una fase posterior): al seleccionar
// un archivo del Explorador muestra "importa a / es usado por / impacto".
//
// Puramente presentacional + fetch: no calcula nada (todo el cómputo vive en main),
// sólo consume el contrato normalizado (lib/carto-types) y lo lista. Tokens --carto-*.

import { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, Zap, Loader2, AlertTriangle, Network, FileX, Sparkles, Code2 } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type { CartoFileRelations, CartoGraphStatus, CartoNode } from '@/lib/carto-types';

type CartoRelationsPanelProps = {
  repoPath: string | null;
  /** Ruta relativa POSIX del archivo seleccionado, o null. */
  selectedFile: string | null;
  /** Estado del índice del repo (gobierna si ya se puede consultar). */
  status: CartoGraphStatus | null;
  /** Cambia cuando el watch re-sincroniza: fuerza un refetch de las relaciones. */
  refreshKey: number;
  /** Se invoca al elegir un símbolo del archivo (abre el panel de detalle/IA). */
  onSelectNode?: (node: CartoNode) => void;
};

export function CartoRelationsPanel({ repoPath, selectedFile, status, refreshKey, onSelectNode }: CartoRelationsPanelProps) {
  const t = useT();
  const [data, setData] = useState<CartoFileRelations | null>(null);
  const [symbols, setSymbols] = useState<CartoNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = status?.state === 'ready';

  useEffect(() => {
    if (!repoPath || !selectedFile || !ready) {
      setData(null);
      setSymbols(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      window.api.cartoGraph.fileRelations(repoPath, selectedFile),
      window.api.cartoGraph.fileSymbols(repoPath, selectedFile),
    ])
      .then(([rel, syms]) => {
        if (cancelled) return;
        if (rel.success) setData(rel.data ?? null);
        else setError(rel.error ?? t('cartography.graph.error'));
        if (syms.success) setSymbols(syms.data ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t('cartography.graph.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repoPath, selectedFile, ready, refreshKey, t]);

  // ── Estados de cabecera ──
  let body: React.ReactNode;
  if (!selectedFile) {
    body = <Hint icon={<Network size={18} />} text={t('cartography.graph.selectFile')} />;
  } else if (status?.state === 'error') {
    body = <Hint icon={<AlertTriangle size={18} />} text={status.error ?? t('cartography.graph.error')} />;
  } else if (!ready) {
    body = <Hint icon={<Loader2 size={18} className="animate-spin" />} text={t('cartography.graph.indexing')} />;
  } else if (loading) {
    body = <Hint icon={<Loader2 size={18} className="animate-spin" />} text={t('cartography.graph.indexing')} />;
  } else if (error) {
    body = <Hint icon={<AlertTriangle size={18} />} text={error} />;
  } else if (data && !data.indexed) {
    // Asset no-código (SVG, imagen, etc.): no participa del grafo. Lo decimos
    // explícito para no confundirlo con un archivo de código sin relaciones.
    body = <Hint icon={<FileX size={18} />} text={t('cartography.graph.notCode')} />;
  } else if (data) {
    body = (
      <div className="flex flex-col gap-3 px-3 py-2">
        <SymbolsSection symbols={symbols} onSelectNode={onSelectNode} />
        <Section
          icon={<ArrowRight size={13} className="text-carto-accent" />}
          title={t('cartography.graph.imports')}
          items={data.imports}
        />
        <Section
          icon={<ArrowLeft size={13} className="text-carto-accent" />}
          title={t('cartography.graph.usedBy')}
          items={data.usedBy}
        />
        <ImpactSection
          summary={t('cartography.graph.impactSummary', {
            files: data.impact.impactedFiles.length,
            symbols: data.impact.total,
          })}
          files={data.impact.impactedFiles}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-carto-grid px-3 py-2">
        <Network size={13} className="shrink-0 text-carto-accent" />
        <span className="truncate text-[11px] font-bold uppercase tracking-widest text-carto-text-muted">
          {t('cartography.graph.relations')}
        </span>
        {selectedFile && (
          <span className="ml-auto truncate text-[11px] text-carto-text-muted" title={selectedFile}>
            {selectedFile}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{body}</div>
    </div>
  );
}

const SYMBOLS_CAP = 40;

/**
 * Lista de símbolos del archivo. Cada uno es clickeable: abre el panel de detalle
 * donde la IA lo explica (Fase 5). Es la puerta de entrada a "click en un nodo".
 */
function SymbolsSection({
  symbols,
  onSelectNode,
}: {
  symbols: CartoNode[] | null;
  onSelectNode?: (node: CartoNode) => void;
}) {
  const t = useT();
  if (!symbols || symbols.length === 0) return null;
  const shown = symbols.slice(0, SYMBOLS_CAP);
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Code2 size={13} className="text-carto-accent" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-carto-text-muted">
          {t('cartography.detail.symbols')}
        </span>
        <span className="text-[11px] text-carto-text-muted">· {symbols.length}</span>
      </div>
      <ul className="flex flex-col gap-0.5 pl-5">
        {shown.map((sym) => (
          <li key={sym.id}>
            <button
              type="button"
              onClick={() => onSelectNode?.(sym)}
              className="group flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-carto-accent/10"
              title={t('cartography.detail.explainHint', { name: sym.name })}
            >
              <Sparkles size={11} className="shrink-0 text-carto-accent/0 transition-colors group-hover:text-carto-accent" />
              <span className="truncate font-mono text-[11px] text-carto-text">{sym.name}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-carto-text-muted/60">{sym.kind}</span>
            </button>
          </li>
        ))}
        {symbols.length > shown.length && (
          <li className="text-[11px] text-carto-text-muted">
            {t('cartography.graph.more', { count: symbols.length - shown.length })}
          </li>
        )}
      </ul>
    </div>
  );
}

function Hint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-carto-text-muted">
      <span className="text-carto-accent">{icon}</span>
      <p className="max-w-xs text-xs leading-relaxed">{text}</p>
    </div>
  );
}

const LIST_CAP = 20;

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
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
          {shown.map((p) => (
            <li key={p} className="truncate font-mono text-[11px] text-carto-text" title={p}>
              {p}
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
