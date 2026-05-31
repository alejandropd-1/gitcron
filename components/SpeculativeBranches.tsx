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

const CYAN = '#5ed8ff';

const TYPE_LABEL: Record<SpeculativeNode['branch']['type'], string> = {
  improvement: 'mejora',
  breakthrough: 'salto',
  trend: 'tendencia',
};

interface Props {
  nodes: SpeculativeNode[];
  config: ProjectionConfig;
  visible: boolean;
  onSelect?: (id: string) => void;
}

export function SpeculativeBranches({ nodes, config, visible, onSelect }: Props) {
  console.log('[SpeculativeBranches] render:', { visible, nodesCount: nodes.length });
  if (!visible || nodes.length === 0) return null;
  const { ux, uy } = diagonalBasis(config);

  return (
    <g data-layer="speculative" pointerEvents="visiblePainted">
      {nodes.map((n) => {
        const opacity = speculativeOpacity(n.branch.confidence);
        const dist = Math.hypot(n.x - n.anchorX, n.y - n.anchorY) || 1;
        const tension = dist * 0.33;

        // Bezier tangent to the diagonal, mirroring the real connectors.
        const cp1x = n.anchorX + tension * ux;
        const cp1y = n.anchorY + tension * uy;
        const cp2x = n.x - tension * ux;
        const cp2y = n.y - tension * uy;

        return (
          <g key={n.branch.id} className="cursor-pointer" onClick={() => onSelect?.(n.branch.id)}>
            {/* Dotted fork line from HEAD into the future */}
            <path
              d={`M ${n.anchorX} ${n.anchorY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${n.x} ${n.y}`}
              stroke={CYAN}
              strokeWidth={1.75}
              strokeDasharray="3 5"
              strokeLinecap="round"
              fill="none"
              opacity={opacity}
            />

            {/* Hollow, dashed future node */}
            <circle
              cx={n.x}
              cy={n.y}
              r={8}
              fill="#020f1e"
              stroke={CYAN}
              strokeWidth={1.5}
              strokeDasharray="2 3"
              opacity={Math.min(1, opacity + 0.15)}
            />

            {/* Label: type+confidence in one line, message in another — pushed further from node to avoid collisions with WIP/HEAD telemetry */}
            <g transform={`translate(${n.x + 20}, ${n.y - 8})`} opacity={Math.min(1, opacity + 0.2)}>
              <text
                fontSize="8.5"
                fontWeight={700}
                fill={CYAN}
                className="font-mono uppercase"
                style={{ letterSpacing: '0.04em' }}
              >
                {TYPE_LABEL[n.branch.type]} · {Math.round(n.branch.confidence * 100)}%
              </text>
              <text y={12} fontSize="10" fill="#d9e7fc" className="font-sans">
                {truncate(n.branch.message, 28)}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
