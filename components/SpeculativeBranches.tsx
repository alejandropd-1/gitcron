'use client';

// components/SpeculativeBranches.tsx
//
// Overlay that draws AI-predicted (speculative) branches on the chronometric
// canvas. Rendered INSIDE ChronometricGraph's <g transform=…> group so it
// shares the same viewport (pan/zoom) and coordinate system.
//
// Brief §2 / §0.6: real vs speculative must never be visually confused, and no
// Git logic is touched. This is presentation only — solid branch-color stays
// for real commits; speculative is dotted, semi-transparent cyan, labelled.

import {
  diagonalBasis,
  speculativeOpacity,
  type SpeculativeNode,
} from '@/lib/speculative-projection';
import type { ProjectionConfig } from '@/lib/chronometric-projection';
import type { TemporalAgentDecision } from '@/types/temporal-agent';
import { useT } from '@/hooks/use-translation';

const CYAN = '#5ed8ff';
const GREEN = '#a3f185';
const REJECT_RED = '#dc6a6a';
const DEFER_ORANGE = '#fd9d1a';

function getOutcomeLabel(outcome: string, t: ReturnType<typeof useT>): string {
  const map: Record<string, string> = {
    accepted: t('decision.accepted'),
    rejected: t('decision.rejected'),
    deferred: t('decision.deferred'),
  };
  return map[outcome] ?? outcome;
}

function getOutcomeColor(outcome: string): string {
  const map: Record<string, string> = {
    accepted: GREEN,
    rejected: REJECT_RED,
    deferred: DEFER_ORANGE,
  };
  return map[outcome] ?? CYAN;
}

function getTypeLabel(type: string, t: ReturnType<typeof useT>): string {
  const map: Record<string, string> = {
    improvement: t('branchType.improvement'),
    breakthrough: t('branchType.breakthrough'),
    trend: t('branchType.trend'),
  };
  return map[type] ?? type;
}

interface Props {
  nodes: SpeculativeNode[];
  config: ProjectionConfig;
  visible: boolean;
  onSelect?: (id: string) => void;
  /** ID of the currently selected speculative branch. */
  selectedBranchId?: string | null;
  /** Capa 2a — per-branch decisions keyed by branch id, with title fallback for old notes. */
  decisions?: Record<string, TemporalAgentDecision>;
  /** Capa 2a — true when at least one branch has been decided. */
  hasAnyDecision?: boolean;
  /** True while the HEAD anchor is materializing after a new commit. */
  anchorEntering?: boolean;
}

export function SpeculativeBranches({
  nodes,
  config,
  visible,
  onSelect,
  selectedBranchId = null,
  decisions = {},
  hasAnyDecision = false,
  anchorEntering = false,
}: Props) {
  const t = useT();
  if (!visible || nodes.length === 0) return null;
  const { ux, uy } = diagonalBasis(config);

  return (
    <g
      data-layer="speculative"
      pointerEvents="visiblePainted"
      className={anchorEntering ? 'chrono-future-lines-enter' : undefined}
    >
      {nodes.map((n, nodeIdx) => {
        const baseOpacity = speculativeOpacity(n.branch.confidence);
        const decision = decisions[n.branch.id] ?? decisions[n.branch.message];
        const isDecided = !!decision;
        const dimFactor = hasAnyDecision && !isDecided ? 0.3 : 1;
        const opacity = baseOpacity * dimFactor;
        const accentColor = isDecided ? getOutcomeColor(decision!.outcome) : CYAN;
        const branchTypeLabel = getTypeLabel(n.branch.type, t);
        const outcomeLabel = isDecided ? getOutcomeLabel(decision!.outcome, t) : '';
        const outcomeColor = isDecided ? getOutcomeColor(decision!.outcome) : CYAN;
        const isSelected = selectedBranchId === n.branch.id;
        const branchNum = n.branch.predictionIndex ?? (nodeIdx + 1); // fallback for old predictions
        const dist = Math.hypot(n.x - n.anchorX, n.y - n.anchorY) || 1;
        const tension = dist * 0.33;

        const cp1x = n.anchorX + tension * ux;
        const cp1y = n.anchorY + tension * uy;
        const cp2x = n.x - tension * ux;
        const cp2y = n.y - tension * uy;

        const msgLines = wrapLines(n.branch.message, 30);
        const chipY = 12 + msgLines.length * 11;

        return (
          <g
            key={n.branch.id}
            className="cursor-pointer"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startY = e.clientY;
              const onMouseUp = (upEvent: MouseEvent) => {
                const diffX = upEvent.clientX - startX;
                const diffY = upEvent.clientY - startY;
                const distance = Math.sqrt(diffX * diffX + diffY * diffY);
                if (distance < 5) {
                  onSelect?.(n.branch.id);
                }
                window.removeEventListener('mouseup', onMouseUp);
              };
              window.addEventListener('mouseup', onMouseUp);
            }}
          >
            {/* Selection glow ring — mirrors real commit selected-breath */}
            {isSelected && (
              <circle
                cx={n.x}
                cy={n.y}
                r={16}
                fill="url(#selected-glow)"
                stroke={accentColor}
                strokeWidth={1.5}
                strokeDasharray="2 3"
                style={{
                  transformOrigin: `${n.x}px ${n.y}px`,
                  animation: 'selected-breath 3s ease-in-out infinite',
                }}
              />
            )}

            {/* Base dotted fork line from HEAD into the future */}
            <path
              d={`M ${n.anchorX} ${n.anchorY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${n.x} ${n.y}`}
              stroke={accentColor}
              strokeWidth={1.75}
              strokeDasharray="3 5"
              strokeLinecap="round"
              fill="none"
              opacity={opacity}
            />

            {/* Animated flow overlay — mimics real connectors' chrono-flow */}
            <path
              d={`M ${n.anchorX} ${n.anchorY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${n.x} ${n.y}`}
              stroke={accentColor}
              strokeWidth={1.2}
              strokeDasharray={isSelected ? "4 6" : "3 6"}
              strokeLinecap="round"
              fill="none"
              opacity={Math.min(1, opacity + 0.1)}
              style={{
                animation: 'chrono-flow 3s linear infinite',
                animationDelay: `${(nodeIdx * 0.6) % 3}s`,
              }}
            />

            {/* Hollow, dashed future node */}
            <circle
              cx={n.x}
              cy={n.y}
              r={8}
              fill="#020f1e"
              stroke={accentColor}
              strokeWidth={isSelected ? 2.2 : 1.5}
              strokeDasharray="2 3"
              opacity={Math.min(1, opacity + 0.15)}
            />

            {/* Label: type+confidence in one line, full message word-wrapped below. */}
            <g transform={`translate(${n.x + 22}, ${n.y - 8})`} opacity={Math.min(1, opacity + 0.2)}>
              <text
                fontSize="8.5"
                fontWeight={700}
                fill={accentColor}
                className="font-mono uppercase"
                style={{ letterSpacing: '0.04em' }}
              >
                {branchTypeLabel} · {Math.round(n.branch.confidence * 100)}%
              </text>
              {msgLines.map((line, li) => {
                const isFirstLine = li === 0;
                return (
                  <g key={li} transform={`translate(0, ${12 + li * 11})`}>
                    {isFirstLine && (
                      <g>
                        <rect
                          x={0}
                          y={-7}
                          width={18}
                          height={10}
                          rx={2}
                          fill={accentColor}
                          fillOpacity={0.15}
                          stroke={accentColor}
                          strokeOpacity={0.4}
                          strokeWidth={0.75}
                          strokeDasharray="1.5 1.5"
                        />
                        <text
                          x={9}
                          y={0.5}
                          textAnchor="middle"
                          fontSize="7"
                          fontWeight={700}
                          fill={accentColor}
                          className="font-mono"
                        >
                          {`#${branchNum}`}
                        </text>
                      </g>
                    )}
                    <text
                      x={isFirstLine ? 24 : 0}
                      y={0}
                      fontSize="9.5"
                      fill="#d9e7fc"
                      className="font-sans"
                    >
                      {line}
                    </text>
                  </g>
                );
              })}
              {/* Capa 2a — status chip for decided branches */}
              {isDecided && (
                <g transform={`translate(0, ${chipY + 3})`}>
                  <rect
                    x={0}
                    y={0}
                    width={decision!.outcome === 'accepted' ? 54 : decision!.outcome === 'rejected' ? 56 : 44}
                    height={14}
                    rx={3}
                    fill={outcomeColor}
                    fillOpacity={0.12}
                    stroke={outcomeColor}
                    strokeOpacity={0.4}
                    strokeWidth={0.75}
                  />
                  <text
                    x={decision!.outcome === 'accepted' ? 27 : decision!.outcome === 'rejected' ? 28 : 22}
                    y={10}
                    fontSize="7"
                    fontWeight={700}
                    fill={outcomeColor}
                    textAnchor="middle"
                    className="font-mono uppercase"
                    style={{ letterSpacing: '0.05em' }}
                  >
                    {outcomeLabel}
                  </text>
                </g>
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
}

function wrapLines(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (current.length + w.length + (current ? 1 : 0) <= maxLen || !current) {
      current = current ? current + ' ' + w : w;
    } else {
      if (current) lines.push(current);
      current = w.length > maxLen ? w.slice(0, maxLen - 1) + '…' : w;
    }
  }
  if (current) lines.push(current);
  return lines;
}
