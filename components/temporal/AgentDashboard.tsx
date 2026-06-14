'use client';

import { useEffect, useState, useMemo } from 'react';
import { useT } from '@/hooks/use-translation';
import { useGitStore } from '@/lib/git-store';
import {
  brierScore,
  calibrationCurve,
  outcomeBreakdown,
  acceptanceByType,
  providerComparison,
} from '@/lib/agent-stats';
import type { PredictionHistoryEntry } from '@/electron/db/types';
import {
  Activity,
  CheckCircle,
  XCircle,
  HelpCircle,
  Info,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Color palette constants ("The Compiled Soul")
const NAVY = '#020f1e';
const GREEN = '#a3f185';
const CYAN = '#5ed8ff';
const ORANGE = '#fd9d1a';
const RED = '#dc6a6a';
const GRAY = '#697789';

interface Props {
  repoPath: string | null;
  repoName: string;
}

export function AgentDashboard({ repoPath, repoName }: Props) {
  const t = useT();
  const language = useGitStore((s) => s.language);

  // States
  const [history, setHistory] = useState<PredictionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'repo' | 'unified'>('repo');
  const [hoveredBin, setHoveredBin] = useState<number | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Load history from SQLite
  const loadData = async () => {
    setLoading(true);
    try {
      const targetPath = viewMode === 'repo' ? repoPath : null;
      const data = await window.api.temporalAgent.getHistory(targetPath);
      setHistory(data);
    } catch (e) {
      console.error('[AgentDashboard] error loading prediction history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [repoPath, viewMode]);

  // Calculations
  const stats = useMemo(() => {
    const brier = brierScore(history);
    const calibration = calibrationCurve(history, 10);
    const breakdown = outcomeBreakdown(history);
    const typeAcceptance = acceptanceByType(history);
    const providers = providerComparison(history);

    // Totals
    let totalBranches = 0;
    let resolvedBranches = 0;
    let deferredBranches = 0;

    for (const run of history) {
      for (const b of run.branches) {
        totalBranches++;
        const latest = b.decisions[b.decisions.length - 1];
        if (latest && (latest.decision === 'accepted' || latest.decision === 'materialized' || latest.decision === 'rejected')) {
          resolvedBranches++;
        } else {
          deferredBranches++;
        }
      }
    }

    return {
      brier,
      calibration,
      breakdown,
      typeAcceptance,
      providers,
      totalBranches,
      resolvedBranches,
      deferredBranches,
    };
  }, [history]);

  // SVG Helper dimensions
  const chartWidth = 450;
  const chartHeight = 220;
  const padding = 35;

  // Render Curve Chart
  const calibrationPoints = useMemo(() => {
    return stats.calibration.map((bin, idx) => {
      if (bin.count === 0 || bin.meanConfidence === null || bin.accuracy === null) {
        return null;
      }
      // Map confidence [0, 1] to x [padding, chartWidth - padding]
      const x = padding + bin.meanConfidence * (chartWidth - 2 * padding);
      // Map accuracy [0, 1] to y [chartHeight - padding, padding] (inverted y-axis in SVG)
      const y = chartHeight - padding - bin.accuracy * (chartHeight - 2 * padding);
      // Dot size based on count n (square root for visual scaling)
      const radius = Math.max(4, Math.min(15, 3 + Math.sqrt(bin.count) * 2));
      return { bin, idx, x, y, radius };
    }).filter(Boolean);
  }, [stats.calibration]);

  // Breakdown Chart calculations
  const breakdownPoints = useMemo(() => {
    if (stats.breakdown.length === 0) return null;
    const maxVal = Math.max(
      1,
      ...stats.breakdown.map(
        (d) => d.accepted + d.materialized + d.rejected + d.deferred
      )
    );

    const stepX = (chartWidth - 2 * padding) / Math.max(1, stats.breakdown.length - 1 || 1);
    const stepY = (chartHeight - 2 * padding) / maxVal;

    return stats.breakdown.map((d, idx) => {
      const x = padding + idx * stepX;
      const total = d.accepted + d.materialized + d.rejected + d.deferred;
      
      // Stack heights
      const yRejected = chartHeight - padding - d.rejected * stepY;
      const yDeferred = yRejected - d.deferred * stepY;
      const yAccepted = yDeferred - d.accepted * stepY;
      const yMaterialized = yAccepted - d.materialized * stepY;

      return {
        d,
        x,
        yRejected,
        yDeferred,
        yAccepted,
        yMaterialized,
        total,
      };
    });
  }, [stats.breakdown]);

  return (
    <div className="flex flex-col gap-5 text-text-primary">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border-subtle/15 pb-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2 text-[#5ed8ff]">
            <Activity size={18} /> {t('dashboard.title')}
          </h3>
          <p className="text-xs text-text-secondary mt-1">{t('dashboard.subtitle')}</p>
        </div>

        {/* View Switcher & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex bg-[#041224] border border-[#5ed8ff]/15 rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewMode('repo')}
              disabled={!repoPath}
              className={cn(
                'px-3 py-1.5 rounded transition-colors',
                viewMode === 'repo'
                  ? 'bg-[#5ed8ff]/15 text-[#5ed8ff]'
                  : 'text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none'
              )}
            >
              {t('dashboard.viewRepo')}
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={cn(
                'px-3 py-1.5 rounded transition-colors',
                viewMode === 'unified'
                  ? 'bg-[#5ed8ff]/15 text-[#5ed8ff]'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {t('dashboard.viewUnified')}
            </button>
          </div>

          <button
            onClick={loadData}
            title="Recargar datos"
            className="p-2 border border-border-subtle/30 bg-[#041224]/50 hover:bg-[#5ed8ff]/10 hover:border-[#5ed8ff]/30 text-text-secondary hover:text-[#5ed8ff] rounded-lg transition-all"
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-60 items-center justify-center text-text-secondary font-mono text-xs gap-2">
          <RefreshCw size={16} className="animate-spin text-secondary" />
          <span>SCANNING DATABASE...</span>
        </div>
      ) : history.length === 0 ? (
        /* ELEGANT EMPTY STATE */
        <div className="flex flex-col items-center justify-center border border-dashed border-[#5ed8ff]/15 bg-[#030e1a]/60 rounded-xl p-10 text-center font-mono select-none">
          <div className="p-3 bg-[#5ed8ff]/5 border border-[#5ed8ff]/20 rounded-full text-[#5ed8ff] animate-pulse">
            <Layers size={28} />
          </div>
          <h4 className="text-sm font-bold text-text-primary mt-4 uppercase tracking-wider">
            {t('dashboard.emptyTitle')}
          </h4>
          <p className="text-xs text-text-secondary max-w-md mt-2 leading-relaxed font-sans">
            {t('dashboard.emptyDesc')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-[10px] uppercase font-bold text-text-secondary">
            <span className="px-2 py-1 bg-[#a3f185]/5 border border-[#a3f185]/20 rounded text-[#a3f185]">
              + 1 Aceptar / Acierto
            </span>
            <span className="px-2 py-1 bg-[#dc6a6a]/5 border border-[#dc6a6a]/20 rounded text-[#dc6a6a]">
              0 Rechazar / Error
            </span>
            <span className="px-2 py-1 bg-[#fd9d1a]/5 border border-[#fd9d1a]/20 rounded text-[#fd9d1a]">
              Censurado / Diferir
            </span>
          </div>
        </div>
      ) : (
        /* MAIN DASHBOARD PANEL */
        <div className="space-y-6">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#041224]/60 border border-border-subtle/15 rounded-lg p-3 font-mono">
              <div className="text-[9px] uppercase tracking-wider text-text-secondary/70">
                {t('dashboard.brierScore')}
              </div>
              <div
                className={cn(
                  'text-2xl font-bold mt-1 tracking-tight',
                  stats.brier !== null
                    ? stats.brier <= 0.1
                      ? 'text-[#a3f185]'
                      : stats.brier <= 0.2
                        ? 'text-[#5ed8ff]'
                        : 'text-[#fd9d1a]'
                    : 'text-text-secondary'
                )}
              >
                {stats.brier !== null ? stats.brier.toFixed(4) : '—'}
              </div>
              <div className="text-[9px] text-text-secondary mt-1 font-sans leading-relaxed">
                {t('dashboard.brierScoreDesc')}
              </div>
            </div>

            <div className="bg-[#041224]/60 border border-border-subtle/15 rounded-lg p-3 font-mono">
              <div className="text-[9px] uppercase tracking-wider text-text-secondary/70">
                Predicciones
              </div>
              <div className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
                {stats.totalBranches}
              </div>
              <div className="text-[9px] text-[#fd9d1a] mt-1 font-sans">
                {t('dashboard.unresolvedCount', { count: stats.deferredBranches })}
              </div>
            </div>

            <div className="bg-[#041224]/60 border border-border-subtle/15 rounded-lg p-3 font-mono">
              <div className="text-[9px] uppercase tracking-wider text-text-secondary/70">
                Resueltas
              </div>
              <div className="text-2xl font-bold text-[#a3f185] mt-1 tracking-tight">
                {stats.resolvedBranches}
              </div>
              <div className="text-[9px] text-text-secondary mt-1 font-sans">
                Muestras para Brier y calibración.
              </div>
            </div>

            <div className="bg-[#041224]/60 border border-border-subtle/15 rounded-lg p-3 font-mono">
              <div className="text-[9px] uppercase tracking-wider text-text-secondary/70">
                Calibración
              </div>
              <div className="text-2xl font-bold text-[#5ed8ff] mt-1 tracking-tight">
                {stats.resolvedBranches > 0 ? (stats.calibration.filter(b => b.count > 0).length) : 0} / 10
              </div>
              <div className="text-[9px] text-text-secondary mt-1 font-sans">
                Bins con datos estadísticos.
              </div>
            </div>
          </div>

          {/* TWO GRAPHICS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. CURVE OF CALIBRATION */}
            <div className="bg-[#041224]/40 border border-border-subtle/15 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5ed8ff] flex items-center gap-1.5 font-mono">
                  <Sparkles size={12} /> {t('dashboard.calibrationCurve')}
                </h4>
                <p className="text-[10px] text-text-secondary mt-0.5">{t('dashboard.calibrationCurveDesc')}</p>
              </div>

              <div className="flex-1 flex justify-center items-center relative min-h-60">
                {stats.resolvedBranches === 0 ? (
                  <div className="text-[10px] font-mono text-text-secondary">
                    CALIBRATION CURVE REQUIRES AT LEAST 1 RESOLVED PREDICTION
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="overflow-visible select-none max-w-[450px]"
                    >
                      {/* Grid background */}
                      <rect
                        x={padding}
                        y={padding}
                        width={chartWidth - 2 * padding}
                        height={chartHeight - 2 * padding}
                        fill="rgba(2, 15, 30, 0.4)"
                        stroke="rgba(94, 216, 255, 0.1)"
                        strokeWidth={1}
                      />

                      {/* Calibration axis grids */}
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const tickVal = idx * 0.25;
                        const tickX = padding + tickVal * (chartWidth - 2 * padding);
                        const tickY = chartHeight - padding - tickVal * (chartHeight - 2 * padding);
                        return (
                          <g key={idx}>
                            {/* Grid line Y */}
                            <line
                              x1={padding}
                              y1={tickY}
                              x2={chartWidth - padding}
                              y2={tickY}
                              stroke="rgba(94, 216, 255, 0.05)"
                              strokeDasharray="2 2"
                            />
                            {/* Grid line X */}
                            <line
                              x1={tickX}
                              y1={padding}
                              x2={tickX}
                              y2={chartHeight - padding}
                              stroke="rgba(94, 216, 255, 0.05)"
                              strokeDasharray="2 2"
                            />
                            {/* Labels Y */}
                            <text
                              x={padding - 6}
                              y={tickY + 3}
                              className="text-[8px] font-mono fill-text-secondary/70 text-right"
                              textAnchor="end"
                            >
                              {(tickVal * 100).toFixed(0)}%
                            </text>
                            {/* Labels X */}
                            <text
                              x={tickX}
                              y={chartHeight - padding + 12}
                              className="text-[8px] font-mono fill-text-secondary/70 text-center"
                              textAnchor="middle"
                            >
                              {(tickVal * 100).toFixed(0)}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Ideal Line (y = x) */}
                      <line
                        x1={padding}
                        y1={chartHeight - padding}
                        x2={chartWidth - padding}
                        y2={padding}
                        stroke="rgba(94, 216, 255, 0.3)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />

                      {/* Calibration Curve connecting lines */}
                      {calibrationPoints.length > 1 && (
                        <polyline
                          points={calibrationPoints.map((p) => p && `${p.x},${p.y}`).filter(Boolean).join(' ')}
                          fill="none"
                          stroke={GREEN}
                          strokeWidth={1.5}
                          className="opacity-70"
                        />
                      )}

                      {/* Calibration Curve point dots */}
                      {calibrationPoints.map((p) => {
                        if (!p) return null;
                        const isHovered = hoveredBin === p.idx;
                        return (
                          <g key={p.idx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={p.radius}
                              fill={isHovered ? CYAN : GREEN}
                              stroke="#020f1e"
                              strokeWidth={1.5}
                              className="cursor-pointer transition-all hover:scale-125"
                              onMouseEnter={() => setHoveredBin(p.idx)}
                              onMouseLeave={() => setHoveredBin(null)}
                            />
                            {isHovered && (
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={p.radius + 4}
                                fill="none"
                                stroke={CYAN}
                                strokeWidth={1}
                                className="animate-ping"
                              />
                            )}
                          </g>
                        );
                      })}

                      {/* Axis Titles */}
                      <text
                        x={chartWidth / 2}
                        y={chartHeight - 4}
                        className="text-[7px] font-mono uppercase tracking-wider fill-text-secondary/60 text-center"
                        textAnchor="middle"
                      >
                        Confianza predicha (IA)
                      </text>
                      <text
                        x={4}
                        y={chartHeight / 2}
                        transform={`rotate(-90 8 ${chartHeight / 2})`}
                        className="text-[7px] font-mono uppercase tracking-wider fill-text-secondary/60 text-center"
                        textAnchor="middle"
                      >
                        Precisión real (Acierto)
                      </text>
                    </svg>

                    {/* Interactive legend details */}
                    <div className="flex justify-between items-center gap-6 mt-3 text-[9px] font-mono border-t border-border-subtle/10 pt-2 w-full max-w-[380px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-0.5 border-t border-dashed border-[#5ed8ff]/50" />
                        <span className="text-text-secondary">{t('dashboard.idealLine')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#a3f185]" />
                        <span className="text-text-secondary">{t('dashboard.actualAccuracy')}</span>
                      </div>

                      {hoveredBin !== null ? (
                        <div className="text-[#5ed8ff] font-bold bg-[#5ed8ff]/10 px-2 py-0.5 rounded border border-[#5ed8ff]/15">
                          Bin {(hoveredBin * 10).toFixed(0)}-{((hoveredBin + 1) * 10).toFixed(0)}%: n = {stats.calibration[hoveredBin].count} · Aciertos = {Math.round((stats.calibration[hoveredBin].accuracy ?? 0) * 100)}%
                        </div>
                      ) : (
                        <div className="text-text-secondary italic">
                          Hover sobre los puntos para más detalles.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. HISTORY OF DECISIONS (TIMELINE) */}
            <div className="bg-[#041224]/40 border border-border-subtle/15 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5ed8ff] flex items-center gap-1.5 font-mono">
                  <Activity size={12} /> {t('dashboard.outcomeBreakdown')}
                </h4>
                <p className="text-[10px] text-text-secondary mt-0.5">Evolución de las decisiones de las predicciones en el tiempo.</p>
              </div>

              <div className="flex-1 flex justify-center items-center relative min-h-60">
                {stats.breakdown.length === 0 ? (
                  <div className="text-[10px] font-mono text-text-secondary">
                    DECISION TIMELINE REQUIRES AT LEAST 1 PREDICTION RUN
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="overflow-visible select-none max-w-[450px]"
                    >
                      {/* Grid background */}
                      <rect
                        x={padding}
                        y={padding}
                        width={chartWidth - 2 * padding}
                        height={chartHeight - 2 * padding}
                        fill="rgba(2, 15, 30, 0.4)"
                        stroke="rgba(94, 216, 255, 0.1)"
                        strokeWidth={1}
                      />

                      {/* X and Y Ticks */}
                      {breakdownPoints && breakdownPoints.map((p, idx) => {
                        // Limit vertical dates to avoid overlapping
                        const showLabel = breakdownPoints.length <= 8 || idx % Math.ceil(breakdownPoints.length / 5) === 0;
                        return (
                          <g key={idx}>
                            <line
                              x1={p.x}
                              y1={padding}
                              x2={p.x}
                              y2={chartHeight - padding}
                              stroke="rgba(94, 216, 255, 0.05)"
                            />
                            {showLabel && (
                              <text
                                x={p.x}
                                y={chartHeight - padding + 12}
                                className="text-[7px] font-mono fill-text-secondary/70 text-center"
                                textAnchor="middle"
                              >
                                {p.d.period.slice(5)} {/* MM-DD */}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Stacked lines/bars */}
                      {breakdownPoints && breakdownPoints.map((p, idx) => {
                        const width = Math.max(3, Math.min(20, (chartWidth - 2 * padding) / (breakdownPoints.length * 1.5)));
                        const isHovered = hoveredDay === p.d.period;

                        return (
                          <g
                            key={idx}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredDay(p.d.period)}
                            onMouseLeave={() => setHoveredDay(null)}
                          >
                            {/* Materials bar (Cian) */}
                            {p.d.materialized > 0 && (
                              <rect
                                x={p.x - width / 2}
                                y={p.yMaterialized}
                                width={width}
                                height={chartHeight - padding - p.yMaterialized}
                                fill={CYAN}
                                opacity={isHovered ? 0.95 : 0.75}
                              />
                            )}

                            {/* Accepted bar (Green) */}
                            {p.d.accepted > 0 && (
                              <rect
                                x={p.x - width / 2}
                                y={p.yAccepted}
                                width={width}
                                height={p.yDeferred - p.yAccepted}
                                fill={GREEN}
                                opacity={isHovered ? 0.95 : 0.75}
                              />
                            )}

                            {/* Deferred bar (Orange) */}
                            {p.d.deferred > 0 && (
                              <rect
                                x={p.x - width / 2}
                                y={p.yDeferred}
                                width={width}
                                height={p.yRejected - p.yDeferred}
                                fill={ORANGE}
                                opacity={isHovered ? 0.95 : 0.75}
                              />
                            )}

                            {/* Rejected bar (Red) */}
                            {p.d.rejected > 0 && (
                              <rect
                                x={p.x - width / 2}
                                y={p.yRejected}
                                width={width}
                                height={chartHeight - padding - p.yRejected}
                                fill={RED}
                                opacity={isHovered ? 0.95 : 0.75}
                              />
                            )}

                            {/* Transparent interactive block */}
                            <rect
                              x={p.x - width}
                              y={padding}
                              width={width * 2}
                              height={chartHeight - 2 * padding}
                              fill="transparent"
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* Interactive legend details */}
                    <div className="flex flex-wrap justify-between items-center gap-3 mt-3 text-[9px] font-mono border-t border-border-subtle/10 pt-2 w-full max-w-[420px]">
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2 bg-[#5ed8ff]" />
                          <span className="text-text-secondary text-[8px]">Mat</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2 bg-[#a3f185]" />
                          <span className="text-text-secondary text-[8px]">Acept</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2 bg-[#fd9d1a]" />
                          <span className="text-text-secondary text-[8px]">Difer</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2 bg-[#dc6a6a]" />
                          <span className="text-text-secondary text-[8px]">Rech</span>
                        </div>
                      </div>

                      {hoveredDay !== null ? (
                        <div className="text-[#5ed8ff] font-bold bg-[#5ed8ff]/10 px-2 py-0.5 rounded border border-[#5ed8ff]/15">
                          {hoveredDay}:{' '}
                          {(() => {
                            const entry = stats.breakdown.find((d) => d.period === hoveredDay);
                            return entry
                              ? `Mat=${entry.materialized} Acept=${entry.accepted} Dif=${entry.deferred} Rech=${entry.rejected}`
                              : '';
                          })()}
                        </div>
                      ) : (
                        <div className="text-text-secondary italic">
                          Hover sobre las barras para ver conteo por día.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* LOWER GRID: ACCEPTANCE BY TYPE & PROVIDER COMPARISON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* A. ACCEPTANCE BY TYPE */}
            <div className="bg-[#041224]/30 border border-border-subtle/15 rounded-xl p-4 font-mono">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5ed8ff] mb-3 flex items-center gap-1.5">
                <CheckCircle size={13} /> {t('dashboard.acceptanceByType')}
              </h4>

              <div className="space-y-3">
                {Object.entries(stats.typeAcceptance).map(([type, s]) => {
                  const ratePercent = Math.round(s.rate * 100);
                  const isZero = s.total === 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold capitalize text-[#d9e7fc]">
                          {type === 'improvement'
                            ? 'Mejora'
                            : type === 'breakthrough'
                              ? 'Hito / Innovación'
                              : 'Tendencia'}
                        </span>
                        <span className="text-text-secondary">
                          {isZero
                            ? t('dashboard.noDataShort')
                            : `${s.accepted}/${s.total} (${ratePercent}%)`}
                        </span>
                      </div>
                      <div className="h-2 bg-[#020f1e] rounded-full overflow-hidden border border-border-subtle/10 relative">
                        <div
                          className="h-full bg-[#a3f185] rounded-full transition-all duration-500"
                          style={{ width: `${isZero ? 0 : ratePercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* B. PROVIDER COMPARISON */}
            <div className="bg-[#041224]/30 border border-border-subtle/15 rounded-xl p-4 font-mono">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5ed8ff] mb-3 flex items-center gap-1.5">
                <XCircle size={13} /> {t('dashboard.providerComparison')}
              </h4>

              <div className="space-y-2 max-h-[140px] overflow-y-auto divide-y divide-border-subtle/10 pr-1">
                {stats.providers.length === 0 ? (
                  <div className="text-[10px] text-text-secondary italic text-center py-4">
                    Sin datos de modelos/proveedores para comparar.
                  </div>
                ) : (
                  stats.providers.map((p, idx) => {
                    const modelName = p.model
                      ? p.model.split('/').pop() || p.model
                      : 'Default Model';
                    return (
                      <div key={idx} className="flex justify-between items-center py-2 text-[10px]">
                        <div className="min-w-0">
                          <div className="font-bold text-[#d9e7fc] truncate">{modelName}</div>
                          <div className="text-[8px] text-text-secondary/80 font-mono uppercase tracking-wider mt-0.5">
                            {p.provider} · {t('dashboard.totalShort', { n: p.count })}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[8px] text-text-secondary/70 uppercase">Brier</div>
                          <div
                            className={cn(
                              'font-bold mt-0.5',
                              p.brierScore !== null
                                ? p.brierScore <= 0.1
                                  ? 'text-[#a3f185]'
                                  : 'text-[#5ed8ff]'
                                : 'text-text-secondary'
                            )}
                          >
                            {p.brierScore !== null ? p.brierScore.toFixed(4) : '—'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
