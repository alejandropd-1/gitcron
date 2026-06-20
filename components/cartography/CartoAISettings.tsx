'use client';

// CartoAISettings — Cartografía, Fase 4.
//
// Selector de proveedor de IA en Ajustes: opt-in (apagado por defecto), local vs
// online, modelo opcional y un botón para probar la conexión sin gastar una
// generación. Autocontenido: maneja su propio estado vía `window.api.cartoAi`,
// mismo patrón que TemporalAgentSettings (no enchufa props por el árbol).
//
// Secretos: este componente NUNCA toca API keys. El modo online reutiliza la key
// cifrada del Temporal Agent, que vive y se usa sólo en main.

import { useEffect, useState } from 'react';
import { Bot, Check, Loader2, Wifi, WifiOff, HardDrive, Globe } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { CartoAISettings as Settings, CartoAIMode, CartoAIProbe } from '@/types/carto-ai';

export function CartoAISettings() {
  const t = useT();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [probe, setProbe] = useState<CartoAIProbe | null>(null);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    let active = true;
    void window.api.cartoAi.getSettings().then((res) => {
      if (active && res.success && res.data) setSettings(res.data);
    });
    return () => {
      active = false;
    };
  }, []);

  async function patch(next: Partial<Settings>) {
    const res = await window.api.cartoAi.setSettings(next);
    if (res.success && res.data) {
      setSettings(res.data);
      setProbe(null); // un cambio invalida el último sondeo
    }
  }

  async function runProbe() {
    setProbing(true);
    setProbe(null);
    try {
      const res = await window.api.cartoAi.probe();
      if (res.success && res.data) setProbe(res.data);
    } finally {
      setProbing(false);
    }
  }

  if (!settings) {
    return (
      <div className="flex min-h-24 items-center justify-center text-text-secondary">
        <Loader2 size={18} className="animate-spin text-secondary" />
      </div>
    );
  }

  const modes: { id: CartoAIMode; label: string; icon: React.ReactNode; hint: string }[] = [
    { id: 'local', label: t('cartography.ai.modeLocal'), icon: <HardDrive size={14} />, hint: t('cartography.ai.localHint') },
    { id: 'online', label: t('cartography.ai.modeOnline'), icon: <Globe size={14} />, hint: t('cartography.ai.onlineHint') },
  ];
  const activeHint = modes.find((m) => m.id === settings.mode)?.hint ?? '';

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot size={14} className="text-secondary" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          {t('cartography.ai.title')}
        </h4>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{t('cartography.ai.settingsDesc')}</p>

      {/* Master switch (opt-in, apagado por defecto) */}
      <button
        type="button"
        onClick={() => patch({ enabled: !settings.enabled })}
        className={cn(
          'w-full px-4 py-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors font-semibold',
          settings.enabled
            ? 'bg-secondary/15 border-secondary/50 text-secondary'
            : 'bg-bg-base/70 border-border-subtle/15 text-text-secondary hover:text-text-primary',
        )}
      >
        {settings.enabled ? <><Check size={14} strokeWidth={3} />{t('cartography.ai.enabled')}</> : t('cartography.ai.disabled')}
      </button>

      {/* Selector de proveedor + modelo: sólo visible si la IA está activa */}
      {settings.enabled && (
        <div className="space-y-4">
          <div>
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              {t('cartography.ai.providerLabel')}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => patch({ mode: m.id })}
                  className={cn(
                    'px-3 py-2.5 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors',
                    settings.mode === m.id
                      ? 'bg-secondary/15 border-secondary/50 text-secondary'
                      : 'bg-bg-base/70 border-border-subtle/15 text-text-secondary hover:text-text-primary hover:border-border-subtle/30',
                  )}
                >
                  {m.icon}
                  <span className="font-semibold">{m.label}</span>
                  {settings.mode === m.id && <Check size={13} strokeWidth={3} />}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-secondary/80 leading-relaxed">{activeHint}</p>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              {t('cartography.ai.modelLabel')}
            </label>
            <input
              type="text"
              value={settings.model ?? ''}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              onBlur={(e) => patch({ model: e.target.value })}
              placeholder={
                settings.mode === 'local'
                  ? t('cartography.ai.modelPlaceholderLocal')
                  : t('cartography.ai.modelPlaceholderOnline')
              }
              className="w-full rounded-lg border border-border-subtle/20 bg-bg-base/70 px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary/50 focus:border-secondary/50 focus:outline-none"
            />
          </div>

          {/* Probar conexión (sin gastar una generación) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void runProbe()}
              disabled={probing}
              className="shrink-0 px-3 py-2 rounded-lg border border-border-subtle/30 bg-bg-base/70 text-sm text-text-secondary hover:border-secondary/40 hover:text-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {probing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
              {probing ? t('cartography.ai.checking') : t('cartography.ai.check')}
            </button>
            {probe && (
              <span className={cn('flex items-center gap-1.5 text-xs', probe.available ? 'text-secondary' : 'text-[#ffa8a3]')}>
                {probe.available ? <Wifi size={13} /> : <WifiOff size={13} />}
                <span className="min-w-0">
                  {probe.available ? t('cartography.ai.available') : (probe.detail || t('cartography.ai.unavailable'))}
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
