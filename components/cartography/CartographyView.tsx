'use client';

// CartographyView — vista de workspace top-level (hermana del grafo) que ayuda
// a entender cualquier repo abierto: dónde están las cosas, qué se relaciona con
// qué y qué se rompe si tocás algo.
//
// FASE 1 (andamiaje): SOLO un lienzo vacío con estética TCARS y un placeholder
// localizado. Sin datos, sin red, sin lógica de Git. El cómputo pesado vivirá en
// el proceso main en fases futuras; este componente es puramente presentacional.
//
// Tokens: usa exclusivamente el bloque `--carto-*` de globals.css (clases
// Tailwind carto-canvas / carto-grid / carto-node / carto-accent / …).

import { motion } from 'motion/react';
import { Map, ArrowLeft } from 'lucide-react';
import { useT } from '@/hooks/use-translation';

type CartographyViewProps = {
  /** Volver al grafo (apaga el sub-estado per-repo `inCartography`). */
  onExit: () => void;
};

export function CartographyView({ onExit }: CartographyViewProps) {
  const t = useT();

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

      {/* ── Lienzo vacío con retícula tenue + placeholder centrado ── */}
      <div
        className="relative flex-1 min-h-0 overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-carto-grid) 1px, transparent 1px), linear-gradient(90deg, var(--color-carto-grid) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          backgroundPosition: 'center center',
        }}
      >
        {/* Viñeta para fundir la retícula hacia los bordes del lienzo */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 40%, var(--color-carto-canvas) 95%)',
          }}
        />

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-carto-accent/30 bg-carto-node/5 text-carto-node">
            <Map size={28} strokeWidth={1.5} />
          </span>
          <p className="text-lg font-bold tracking-wide text-carto-text">
            {t('cartography.empty')}
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-carto-text-muted">
            {t('cartography.emptyHint')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
