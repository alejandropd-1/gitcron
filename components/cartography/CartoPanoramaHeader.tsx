'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Blocks, Loader2, Sparkles } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { buildCartoPanorama } from '@/lib/carto-panorama';
import type { CartoGraph, CartoGraphStatus } from '@/lib/carto-types';

type CartoPanoramaHeaderProps = {
  repoPath: string | null;
  status: CartoGraphStatus | null;
  refreshKey: number;
};

export function CartoPanoramaHeader({ repoPath, status, refreshKey }: CartoPanoramaHeaderProps) {
  const t = useT();
  const [graph, setGraph] = useState<CartoGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath || status?.state !== 'ready') {
      setGraph(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void window.api.cartoGraph
      .snapshot(repoPath)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setGraph(res.data);
        else setError(res.error ?? t('cartography.graph.error'));
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : t('cartography.graph.error'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repoPath, refreshKey, status?.state, t]);

  const panorama = useMemo(() => (graph ? buildCartoPanorama(graph) : null), [graph]);

  if (!repoPath) return null;

  return (
    <details className="shrink-0 border-b border-carto-grid bg-carto-canvas/95">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-carto-node/[0.035] [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-carto-accent">
          <Sparkles size={14} />
          {t('cartography.panorama.summary')}
        </span>
        {panorama ? (
          <span className="truncate font-mono text-[10px] text-carto-text-muted/75">
            {t('cartography.panorama.structure', { hash: panorama.structureHash })}
            {' · '}
            {t('cartography.panorama.deterministicStats', {
              groups: panorama.groups.length,
              edges: panorama.links.length,
            })}
          </span>
        ) : null}
      </summary>
      <section className="mx-4 mb-3 rounded-lg border border-carto-accent/25 bg-carto-node/[0.035] p-4">
        {status?.state === 'engine-unavailable' ? (
          <HeaderHint icon={<AlertTriangle size={16} />} text={t('cartography.graph.engineUnavailable')} />
        ) : status?.state === 'indexing' || status?.state === 'idle' ? (
          <HeaderHint icon={<Loader2 size={16} className="animate-spin" />} text={t('cartography.graph.indexing')} />
        ) : loading ? (
          <HeaderHint icon={<Loader2 size={16} className="animate-spin" />} text={t('cartography.panorama.loading')} />
        ) : error ? (
          <HeaderHint icon={<AlertTriangle size={16} />} text={error} tone="error" />
        ) : panorama ? (
          <>
            <p className="max-w-4xl text-sm leading-relaxed text-carto-text-muted">
              {t('cartography.panorama.mapReady')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] text-carto-text-muted/75">
              <span>{t('cartography.panorama.structure', { hash: panorama.structureHash })}</span>
              <span className="flex items-center gap-1 rounded border border-carto-grid px-1.5 py-0.5">
                <Blocks size={10} />
                {t('cartography.panorama.deterministicStats', {
                  groups: panorama.groups.length,
                  edges: panorama.links.length,
                })}
              </span>
            </div>
          </>
        ) : (
          <HeaderHint icon={<Blocks size={16} />} text={t('cartography.semantic.empty')} />
        )}
      </section>
    </details>
  );
}

function HeaderHint({
  icon,
  text,
  tone = 'muted',
}: {
  icon: React.ReactNode;
  text: string;
  tone?: 'muted' | 'error';
}) {
  return (
    <div className={`flex items-center gap-2 text-xs ${tone === 'error' ? 'text-[#ffa8a3]' : 'text-carto-text-muted'}`}>
      <span className={tone === 'error' ? 'text-[#ffa8a3]' : 'text-carto-accent'}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
