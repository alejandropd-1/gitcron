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
import { ArrowRight, ArrowLeft, Zap, Loader2, AlertTriangle, Network, FileX } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type { CartoFileRelations, CartoGraphStatus } from '@/lib/carto-types';

type CartoRelationsPanelProps = {
  repoPath: string | null;
  /** Ruta relativa POSIX del archivo seleccionado, o null. */
  selectedFile: string | null;
  /** Estado del índice del repo (gobierna si ya se puede consultar). */
  status: CartoGraphStatus | null;
  /** Cambia cuando el watch re-sincroniza: fuerza un refetch de las relaciones. */
  refreshKey: number;
};

export function CartoRelationsPanel({ repoPath, selectedFile, status, refreshKey }: CartoRelationsPanelProps) {
  const t = useT();
  const [data, setData] = useState<CartoFileRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = status?.state === 'ready';

  useEffect(() => {
    if (!repoPath || !selectedFile || !ready) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void window.api.cartoGraph
      .fileRelations(repoPath, selectedFile)
      .then((res) => {
        if (cancelled) return;
        if (res.success) setData(res.data ?? null);
        else setError(res.error ?? t('cartography.graph.error'));
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
