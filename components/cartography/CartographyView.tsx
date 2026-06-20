'use client';

// CartographyView — vista de workspace top-level (hermana del grafo) que ayuda
// a entender cualquier repo abierto: dónde están las cosas, qué se relaciona con
// qué y qué se rompe si tocás algo.
//
// FASE 2 (explorador del árbol): suma la primera fuente de datos real, el árbol
// de archivos del repo activo, montado como una "lente" seleccionable. El
// escaneo es de SOLO LECTURA y vive en el proceso main (IPC `carto:scan-tree`);
// este componente sólo orquesta cuándo escanear (al entrar / al refrescar, nunca
// en cada render) y renderiza el resultado con estética TCARS.
//
// Tokens: usa exclusivamente el bloque `--carto-*` de globals.css.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Map, ArrowLeft, FolderTree, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type { CartoScanResult } from '@/electron/ipc/carto';
import { ExplorerLens } from './ExplorerLens';

type CartographyViewProps = {
  /** Ruta del repo activo a escanear. `null` si no hay repo abierto. */
  repoPath: string | null;
  /** Volver al grafo (apaga el sub-estado per-repo `inCartography`). */
  onExit: () => void;
};

/** Lentes disponibles. En esta fase, sólo el explorador del árbol. */
type LensId = 'explorer';

export function CartographyView({ repoPath, onExit }: CartographyViewProps) {
  const t = useT();

  const [lens] = useState<LensId>('explorer');
  const [scan, setScan] = useState<CartoScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Token de escaneo: descarta resultados de un repo anterior si el usuario
  // cambia de repo mientras un escaneo está en vuelo.
  const scanToken = useRef(0);

  const runScan = useCallback(async () => {
    if (!repoPath) {
      setScan(null);
      setError(null);
      setLoading(false);
      return;
    }
    const token = ++scanToken.current;
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.cartoScanTree(repoPath);
      if (token !== scanToken.current) return; // resultado obsoleto
      if (res.success && res.data) {
        setScan(res.data);
      } else {
        setScan(null);
        setError(res.error ?? t('cartography.scanError'));
      }
    } catch (err) {
      if (token !== scanToken.current) return;
      setScan(null);
      setError(err instanceof Error ? err.message : t('cartography.scanError'));
    } finally {
      if (token === scanToken.current) setLoading(false);
    }
  }, [repoPath, t]);

  // Escaneo al ENTRAR a la vista o al cambiar de repo. No re-escanea en cada
  // render: el efecto sólo depende de `repoPath`.
  useEffect(() => {
    void runScan();
  }, [runScan]);

  return (
    <motion.div
      key="cartography"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex-1 flex flex-col min-h-0 overflow-hidden bg-carto-canvas text-carto-text select-none"
    >
      {/* ── Cabecera TCARS ── */}
      <div className="shrink-0 border-b border-carto-accent/25">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-carto-accent/15 text-carto-accent">
              <Map size={16} />
            </span>
            <h2 className="truncate text-base font-bold tracking-wide text-carto-text">
              {t('cartography.title')}
            </h2>
            <span className="ml-1 rounded-full border border-carto-accent/35 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-carto-accent">
              Beta
            </span>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="shrink-0 flex items-center gap-1.5 rounded border border-carto-grid px-3 py-1 text-xs font-semibold tracking-wide text-carto-text-muted transition-colors hover:border-carto-accent/50 hover:text-carto-text"
          >
            <ArrowLeft size={13} />
            {t('cartography.backToGraph')}
          </button>
        </div>
      </div>

      {/* ── Cuerpo: selector de lentes + panel de la lente activa ── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Riel de lentes (TCARS) */}
        <nav className="flex w-44 shrink-0 flex-col gap-1 border-r border-carto-accent/15 bg-carto-node/[0.02] p-3">
          <span className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-carto-text-muted">
            {t('cartography.lenses')}
          </span>
          <button
            type="button"
            aria-pressed={lens === 'explorer'}
            className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold tracking-wide transition-colors ${
              lens === 'explorer'
                ? 'bg-carto-accent/15 text-carto-accent'
                : 'text-carto-text-muted hover:bg-carto-node/5 hover:text-carto-text'
            }`}
          >
            <FolderTree size={14} className="shrink-0" />
            {t('cartography.lens.explorer')}
          </button>
        </nav>

        {/* Panel de la lente */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Barra de la lente: título + métricas + refrescar */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-carto-grid px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <FolderTree size={14} className="shrink-0 text-carto-accent" />
              <span className="truncate text-xs font-bold tracking-wide text-carto-text">
                {t('cartography.lens.explorer')}
              </span>
              {scan && !loading && (
                <span className="shrink-0 text-[11px] text-carto-text-muted">
                  {t('cartography.treeStats', { dirs: scan.dirCount, files: scan.fileCount })}
                  {scan.truncated ? ` · ${t('cartography.truncated')}` : ''}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void runScan()}
              disabled={loading || !repoPath}
              className="shrink-0 flex items-center gap-1.5 rounded border border-carto-grid px-2.5 py-1 text-[11px] font-semibold tracking-wide text-carto-text-muted transition-colors hover:border-carto-accent/50 hover:text-carto-text disabled:opacity-40"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {t('cartography.refresh')}
            </button>
          </div>

          {/* Contenido de la lente */}
          <div className="min-h-0 flex-1 overflow-auto px-2 py-1">
            {loading ? (
              <CenteredState
                icon={<Loader2 size={22} className="animate-spin text-carto-accent" />}
                title={t('cartography.scanning')}
              />
            ) : error ? (
              <CenteredState
                icon={<AlertTriangle size={22} className="text-carto-accent" />}
                title={t('cartography.scanError')}
                detail={error}
              />
            ) : !repoPath ? (
              <CenteredState
                icon={<Map size={22} strokeWidth={1.5} className="text-carto-node" />}
                title={t('cartography.empty')}
                detail={t('cartography.emptyHint')}
              />
            ) : scan && scan.root.length > 0 ? (
              // `key` por scannedAt: un escaneo nuevo remonta la lente y reinicia
              // su estado de expansión.
              <ExplorerLens key={scan.scannedAt} nodes={scan.root} />
            ) : (
              <CenteredState
                icon={<FolderTree size={22} strokeWidth={1.5} className="text-carto-node" />}
                title={t('cartography.treeEmpty')}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CenteredState({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-carto-accent/30 bg-carto-node/5">
        {icon}
      </span>
      <p className="text-base font-bold tracking-wide text-carto-text">{title}</p>
      {detail && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-carto-text-muted">{detail}</p>
      )}
    </div>
  );
}
