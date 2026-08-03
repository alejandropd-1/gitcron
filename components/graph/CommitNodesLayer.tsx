'use client';

import { memo } from 'react';
import { commitHasBranchRef, initials, type CommitSelectOptions } from '@/components/CommitGraph';
import type { Commit } from '@/lib/git-store';
import { cn } from '@/lib/utils';

/**
 * Lo que esta capa necesita de un commit proyectado.
 *
 * Se declara acá, con los campos que efectivamente usa, en vez de importar el
 * tipo interno del grafo: así el contrato de la capa es legible sin abrir el
 * componente de 3600 líneas del que salió.
 */
export interface CommitNodeDatum {
  x: number;
  y: number;
  laneColor: string;
  branchName?: string | null;
  commit: Commit;
}

export interface CommitNodesLayerProps {
  nodes: CommitNodeDatum[];
  selectedHash?: string | null;
  hoveredHash: string | null;
  headHash: string | null;
  selectedBranchName: string | null;
  selectedBranchColor: string | null;
  /** Escala tipográfica global. Va como número y no como función a propósito:
   *  una función recreada por render anularía la memoización sin dar señal. */
  textScale: number;
  isCommitEntering: (hash: string) => boolean;
  onSelectCommit: (commit: Commit, options?: CommitSelectOptions) => void;
  onContextMenu: (event: React.MouseEvent, commit: Commit) => void;
  onHoverNode: (hash: string, position: { x: number; y: number }) => void;
  onLeaveNode: () => void;
}

/**
 * Capa de nodos de commit del grafo cronométrico.
 *
 * Vivía dentro de `ChronometricGraph`, en el subárbol del `<g>` que lleva la
 * transformación del encuadre. Cambiar esa transformación reejecutaba el
 * componente entero y reconciliaba estos cientos de elementos SVG para terminar
 * cambiando una cadena de texto: 50–70 ms por render con 500 commits, contra un
 * presupuesto de 16,6 ms por cuadro.
 *
 * Memoizada y **sin recibir el encuadre**, arrastrar deja de reconstruirla.
 * Ninguna prop puede recrearse por render: alcanza una para anular todo esto, y
 * el modo de falla es invisible —el grafo sigue correcto, sólo va lento—.
 */
function CommitNodesLayerImpl({
  nodes,
  selectedHash,
  hoveredHash,
  headHash,
  selectedBranchName,
  selectedBranchColor,
  textScale,
  isCommitEntering,
  onSelectCommit,
  onContextMenu,
  onHoverNode,
  onLeaveNode,
}: CommitNodesLayerProps) {
  const fs = (base: number) => +(base * textScale).toFixed(2);

  return (
    <>
      {nodes.map((node) => {
        const isSelected = selectedHash === node.commit.hash;
        const isHovered = hoveredHash === node.commit.hash;
        const isHead = Boolean(headHash) && node.commit.hash === headHash;
        const isEntering = isCommitEntering(node.commit.hash);
        const isBranchHighlighted = Boolean(
          selectedBranchName &&
          (node.branchName === selectedBranchName || commitHasBranchRef(node.commit, selectedBranchName) || (selectedBranchColor && node.laneColor === selectedBranchColor))
        );

        return (
          <g
            key={`node-${node.commit.hash}`}
            className={cn('cursor-pointer', isEntering && 'chrono-node-enter')}
            onClick={(e) => {
              e.stopPropagation();
              onSelectCommit(node.commit, { branchName: node.branchName });
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(e, node.commit);
            }}
            onMouseEnter={() => {
              onHoverNode(node.commit.hash, { x: node.x, y: node.y });
            }}
            onMouseLeave={onLeaveNode}
          >
            {/* Outer selection ring */}
            {(isSelected || isBranchHighlighted) && (
              <circle
                cx={node.x}
                cy={node.y}
                r={isHead ? 36 : isSelected ? 19 : 16}
                fill="url(#selected-glow)"
                stroke={isSelected ? 'var(--color-secondary)' : node.laneColor}
                strokeWidth={isSelected ? (isHead ? 3 : 1.5) : 1}
                opacity={isSelected ? 1 : 0.65}
                style={{
                  transformOrigin: `${node.x}px ${node.y}px`,
                  animation: isSelected ? 'selected-breath 3s ease-in-out infinite' : undefined,
                }}
              />
            )}

            {/* Hover visual scale guide */}
            {isHovered && (
              <circle
                cx={node.x}
                cy={node.y}
                r={isHead ? 28 : 14}
                fill="none"
                stroke={isHead ? 'none' : node.laneColor}
                strokeWidth={isHead ? 2 : 1}
                opacity={0.4}
              />
            )}

            {/* Core Commit Circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r={isHead ? 21 : 10.5}
              fill={isHead ? 'transparent' : 'var(--color-bg-base)'}
              stroke={isHead ? 'transparent' : (isSelected ? 'var(--color-secondary)' : node.laneColor)}
              strokeWidth={isSelected ? (isHead ? 6 : 3) : isBranchHighlighted ? (isHead ? 4 : 2.8) : (isHead ? 4 : 2)}
              className="transition-all duration-150"
            />

            {/* Initials Text Inside Circle */}
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fs(isHead ? 15 : 7.5)}
              fontWeight="700"
              fill={isSelected ? 'var(--color-secondary)' : node.laneColor}
              className="font-mono select-none pointer-events-none"
            >
              {initials(node.commit.authorName)}
            </text>
          </g>
        );
      })}
    </>
  );
}

/**
 * Comparación superficial, la de `memo` por defecto.
 *
 * Todas las props son primitivas, referencias memoizadas o callbacks estables,
 * así que alcanza. Un comparador propio sería una segunda definición de "qué
 * cambió" que habría que mantener sincronizada con las props, y se
 * desincronizaría sin avisar.
 */
export const CommitNodesLayer = memo(CommitNodesLayerImpl);
