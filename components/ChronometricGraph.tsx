'use client';

import { useMemo, useState } from 'react';
import type { Commit } from '@/lib/git-store';
import {
  mapLaneToBranchIndex,
  projectCommit,
  type ProjectionConfig,
  DEFAULT_CHRONOMETRIC_SLOPE,
} from '@/lib/chronometric-projection';
import {
  screenToWorld,
  worldToScreen,
} from '@/lib/canvas-viewport';
import { useCanvasViewport } from '@/hooks/use-canvas-viewport';
import {
  computeGraph,
  initials,
  preferredColorForCommit,
} from './CommitGraph';
import { Calendar, GitCommit, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ChronometricGraphProps {
  commits: Commit[];
  selectedHash?: string;
  currentBranch?: string;
  filterText?: string;
  onSelect: (commit: Commit) => void;
  onContextMenu: (e: React.MouseEvent, commit: Commit) => void;
}

export function ChronometricGraph({
  commits,
  selectedHash,
  currentBranch,
  filterText = '',
  onSelect,
  onContextMenu,
}: ChronometricGraphProps) {
  // 1. Filter commits if filterText is present
  const filter = filterText.trim().toLowerCase();
  const filteredCommits = useMemo(() => {
    if (!filter) return commits;
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(filter) ||
        c.hash.toLowerCase().includes(filter) ||
        c.authorName.toLowerCase().includes(filter)
    );
  }, [commits, filter]);

  // 2. Compute classic graph lanes to reuse lane assignment logic
  const { rows } = useMemo(
    () => computeGraph(filteredCommits, currentBranch),
    [filteredCommits, currentBranch]
  );

  // 3. Find time range
  const { minTime, maxTime } = useMemo(() => {
    if (filteredCommits.length === 0) return { minTime: 0, maxTime: 0 };
    const timestamps = filteredCommits.map((c) => new Date(c.date).getTime());
    return {
      minTime: Math.min(...timestamps),
      maxTime: Math.max(...timestamps),
    };
  }, [filteredCommits]);

  // 4. Calculate dynamic SVG dimensions based on commit count
  const width = useMemo(() => {
    return Math.max(1100, filteredCommits.length * 60);
  }, [filteredCommits]);

  // Compute height dynamically using the slope to maintain a constant visual angle of ~40.4°
  const height = useMemo(() => {
    const paddingLeft = 100;
    const paddingRight = 100;
    const paddingTop = 100;
    const paddingBottom = 100;
    const availableWidth = width - paddingLeft - paddingRight;
    const rise = availableWidth * DEFAULT_CHRONOMETRIC_SLOPE;
    return paddingTop + paddingBottom + rise;
  }, [width]);

  const config: ProjectionConfig = useMemo(() => {
    return {
      width,
      height,
      minTime,
      maxTime,
      paddingLeft: 100,
      paddingRight: 100,
      paddingTop: 100,
      paddingBottom: 100,
      fanFactor: 38, // lane spacing for symmetrical abanico
      totalCommits: filteredCommits.length,
    };
  }, [width, minTime, maxTime, filteredCommits.length]);

  // 5. Pre-calculate projected commit coordinates
  const projectedCommits = useMemo(() => {
    const commitIndexMap = new Map<string, number>();
    filteredCommits.forEach((c, idx) => commitIndexMap.set(c.hash, idx));

    return rows.map((row, i) => {
      const chronologicalIndex = filteredCommits.length - 1 - i;
      const branchIndex = mapLaneToBranchIndex(row.lane);

      const proj = projectCommit(
        {
          date: row.commit.date,
          branchIndex,
          chronologicalIndex,
        },
        config
      );

      return {
        ...row,
        chronologicalIndex,
        branchIndex,
        x: proj.x,
        y: proj.y,
        baseX: proj.baseX,
        baseY: proj.baseY,
        originalIndex: i, // index in the original rows array
      };
    });
  }, [rows, filteredCommits, config]);

  // Create a quick lookup map of commit hash -> projected node info
  const projectedLookup = useMemo(() => {
    const map = new Map<string, typeof projectedCommits[0]>();
    projectedCommits.forEach((p) => map.set(p.commit.hash, p));
    return map;
  }, [projectedCommits]);

  // 6. State for interactive hover cards
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);

  const hoveredNode = useMemo(() => {
    if (!hoveredHash) return null;
    return projectedLookup.get(hoveredHash) || null;
  }, [hoveredHash, projectedLookup]);

  // Hook for 2D Canvas Navigation: Pan and Zoom
  const {
    viewport,
    containerRef,
    isDragging,
    handleMouseDown,
    resetViewport,
    zoomIn,
    zoomOut,
  } = useCanvasViewport({
    worldWidth: width,
    worldHeight: height,
    initialScale: 1.0,
    minScale: 0.25,
    maxScale: 3.5,
    padding: 120,
  });

  // 7. Time ticks (date guidelines at the bottom of the graph)
  const timeTicks = useMemo(() => {
    if (filteredCommits.length === 0 || maxTime === minTime) return [];
    const ticks = [];
    const count = Math.min(5, filteredCommits.length);

    for (let k = 0; k <= count; k++) {
      const ratio = k / count;
      const time = minTime + (maxTime - minTime) * ratio;
      const approxIndex = Math.round((filteredCommits.length - 1) * ratio);

      const x = timeToX(
        time,
        [minTime, maxTime],
        approxIndex,
        filteredCommits.length,
        width,
        config.paddingLeft,
        config.paddingRight
      );

      // Interpolate Y coordinate along the main diagonal path
      const xStart = config.paddingLeft;
      const yStart = height - config.paddingBottom;
      const xEnd = width - config.paddingRight;
      const yEnd = config.paddingTop;

      const p = (x - xStart) / (xEnd - xStart || 1);
      const y = yStart + p * (yEnd - yStart);

      ticks.push({
        x,
        y,
        dateStr: new Date(time).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        yearStr: new Date(time).getFullYear().toString(),
      });
    }
    return ticks;

    function timeToX(
      ts: number,
      range: [number, number],
      index: number,
      total: number,
      w: number,
      padLeft: number,
      padRight: number
    ): number {
      const [minT, maxT] = range;
      const availableW = w - padLeft - padRight;
      if (availableW <= 0) return padLeft;

      let pTime = 0.5;
      if (maxT > minT) {
        pTime = Math.max(0, Math.min(1, (ts - minT) / (maxT - minT)));
      }

      let pIndex = 0.5;
      if (total > 1) {
        pIndex = index / (total - 1);
      }

      const p = pTime * 0.3 + pIndex * 0.7;
      return padLeft + p * availableW;
    }
  }, [filteredCommits, minTime, maxTime, width, config, height]);

  // Extract primary branch labels for hover display
  const getBranchName = (commit: Commit) => {
    if (!commit.refs || commit.refs.length === 0) return null;
    const branchRefs = commit.refs.filter(
      (r) => !r.startsWith('tag: ') && !r.includes('stash')
    );
    if (branchRefs.length === 0) return null;
    return branchRefs[0]
      .replace(/^refs\/heads\//, '')
      .replace(/^refs\/remotes\/[^/]+\//, '')
      .replace(/^HEAD$/, '');
  };

  // Get first parent's color or own lane color for curves
  const getConnectorColor = (conn: { color: string }) => {
    return conn.color;
  };

  if (filteredCommits.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-[#9eacc0] text-sm bg-[#020f1e] select-none">
        <GitCommit size={20} className="mb-2 text-[#697789]" />
        <p>No se encontraron commits en este rango de búsqueda.</p>
      </div>
    );
  }

  // Find unit direction vectors of the diagonal line
  const xStart = config.paddingLeft;
  const yStart = height - config.paddingBottom;
  const xEnd = width - config.paddingRight;
  const yEnd = config.paddingTop;

  const dx = xEnd - xStart;
  const dy = yEnd - yStart;
  const L = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / L;
  const uy = dy / L;

  // Calculate screen position for hover card
  const hoveredScreenPos = useMemo(() => {
    if (!hoveredPos) return null;
    return worldToScreen({ x: hoveredPos.x, y: hoveredPos.y }, viewport);
  }, [hoveredPos, viewport]);

  // Calculate absolute coordinates for hover card clamped inside the container bounds
  const hoveredCardStyle = useMemo(() => {
    if (!hoveredScreenPos || !containerRef.current) return {};
    const containerWidth = containerRef.current.clientWidth || 800;
    const containerHeight = containerRef.current.clientHeight || 520;

    const cardWidth = 310;
    const cardHeight = 135;

    // Position adjacent to the node, clamping within screen bounds to prevent overflow
    const leftVal = hoveredScreenPos.x + 20 + cardWidth > containerWidth
      ? Math.max(10, hoveredScreenPos.x - 20 - cardWidth)
      : Math.max(10, hoveredScreenPos.x + 20);

    const topVal = hoveredScreenPos.y + cardHeight > containerHeight - 20
      ? Math.max(10, hoveredScreenPos.y - 10 - cardHeight)
      : Math.max(10, hoveredScreenPos.y + 15);

    return {
      left: leftVal,
      top: topVal,
      fontFamily: 'var(--font-sans), Inter, sans-serif',
    };
  }, [hoveredScreenPos]);

  return (
    <div
      className="flex-1 w-full h-full overflow-hidden bg-[#020f1e] flex flex-col relative select-none"
      id="chronometric-container"
    >
      {/* 2D Infinite Interactive Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`flex-1 overflow-hidden relative cursor-grab ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        <svg
          width="100%"
          height="100%"
          className="block"
          style={{ overflow: 'visible' }}
        >
          <g
            transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}
          >
            {/* 1. Base Guidelines & Time Ticks */}
            {timeTicks.map((tick, index) => (
              <g key={`tick-${index}`} opacity={0.35}>
                {/* Vertical dash lines matching grid marks */}
                <line
                  x1={tick.x}
                  y1={config.paddingTop - 20}
                  x2={tick.x}
                  y2={height - config.paddingBottom + 20}
                  stroke="#3c495a"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
                {/* Visual marker point on diagonal */}
                <circle cx={tick.x} cy={tick.y} r={3} fill="#9eacc0" />
                {/* Dates rendered below the guideline */}
                <text
                  x={tick.x}
                  y={height - config.paddingBottom + 36}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#9eacc0"
                  className="font-mono"
                >
                  {tick.dateStr}
                </text>
                <text
                  x={tick.x}
                  y={height - config.paddingBottom + 48}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#697789"
                  className="font-mono"
                >
                  {tick.yearStr}
                </text>
              </g>
            ))}

            {/* 2. Base Timeline Diagonal Track (geometric background) */}
            <line
              x1={xStart}
              y1={yStart}
              x2={xEnd}
              y2={yEnd}
              stroke="#1e293b"
              strokeWidth={3}
              opacity={0.8}
            />

            {/* 3. Render parent-child connectives using tangent curves */}
            {projectedCommits.map((node) => {
              return node.connections.map((conn, ci) => {
                const parentNode = projectedCommits[conn.toRow];
                if (!parentNode) return null;

                // Connection points
                const cx = node.x;
                const cy = node.y;
                const px = parentNode.x;
                const py = parentNode.y;

                // If they are on different lanes or the same lane, construct parallel curves
                // that emerge and merge parallel to the diagonal vector.
                const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2) || 1;
                // Control tension based on diagonal distance
                const tension = dist * 0.33;

                // CP1 goes backward (left) tangent to diagonal from the child
                const cp1x = cx - tension * ux;
                const cp1y = cy - tension * uy;

                // CP2 goes forward (right) tangent to diagonal from the parent
                const cp2x = px + tension * ux;
                const cp2y = py + tension * uy;

                return (
                  <path
                    key={`conn-${node.commit.hash}-${ci}`}
                    d={`M ${cx} ${cy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${px} ${py}`}
                    stroke={conn.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    fill="none"
                    opacity={selectedHash === node.commit.hash || selectedHash === parentNode.commit.hash ? 0.9 : 0.45}
                    className="transition-all duration-200"
                  />
                );
              });
            })}

            {/* 4. Render Commit Nodes */}
            {projectedCommits.map((node) => {
              const isSelected = selectedHash === node.commit.hash;
              const isHovered = hoveredHash === node.commit.hash;

              return (
                <g
                  key={`node-${node.commit.hash}`}
                  className="cursor-pointer"
                  onClick={() => onSelect(node.commit)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenu(e, node.commit);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredHash(node.commit.hash);
                    // Set projected position as relative world coordinates
                    setHoveredPos({
                      x: node.x,
                      y: node.y,
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredHash(null);
                    setHoveredPos(null);
                  }}
                >
                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={15}
                      fill="none"
                      stroke="#a3f185"
                      strokeWidth={1.5}
                      opacity={0.8}
                    />
                  )}

                  {/* Hover visual scale guide */}
                  {isHovered && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={14}
                      fill="none"
                      stroke={node.laneColor}
                      strokeWidth={1}
                      opacity={0.4}
                    />
                  )}

                  {/* Core Commit Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={10.5}
                    fill="#020f1e"
                    stroke={isSelected ? '#a3f185' : node.laneColor}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-150"
                  />

                  {/* Initials Text Inside Circle */}
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="7.5"
                    fontWeight="700"
                    fill={isSelected ? '#a3f185' : node.laneColor}
                    className="font-mono select-none pointer-events-none"
                  >
                    {initials(node.commit.authorName)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* 5. Custom Floating Hover Card (Geometric clarity, details on-demand, relative positioned) */}
        {hoveredNode && hoveredScreenPos && (
          <div
            className="absolute pointer-events-none bg-[#031427]/95 backdrop-blur-md border border-[#3c495a]/30 rounded px-3 py-2.5 shadow-2xl z-30 min-w-[280px] max-w-[340px] transition-opacity duration-150 animate-in fade-in zoom-in-95 duration-100"
            style={hoveredCardStyle}
          >
            <div className="flex items-center justify-between gap-3 mb-1.5 border-b border-[#3c495a]/15 pb-1">
              <span className="text-[10px] uppercase font-bold text-[#697789] tracking-wider font-mono">
                {hoveredNode.commit.shortHash}
              </span>
              {getBranchName(hoveredNode.commit) && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold truncate max-w-[150px]"
                  style={{
                    backgroundColor: `${hoveredNode.laneColor}15`,
                    color: hoveredNode.laneColor,
                    border: `1px solid ${hoveredNode.laneColor}30`,
                  }}
                >
                  {getBranchName(hoveredNode.commit)}
                </span>
              )}
            </div>
            <p className="text-xs text-[#d9e7fc] font-medium line-clamp-2 mb-2 leading-relaxed">
              {hoveredNode.commit.message}
            </p>
            <div className="flex items-center justify-between text-[9px] text-[#9eacc0] font-mono">
              <span className="truncate max-w-[130px]">{hoveredNode.commit.authorName}</span>
              <span className="flex items-center gap-1">
                <Calendar size={10} className="opacity-70" />
                {new Date(hoveredNode.commit.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Canvas Navigation Controls at bottom-right (Discreto/Opcional) */}
      <div className="absolute bottom-3 right-3 bg-[#031427]/90 backdrop-blur-md border border-[#3c495a]/25 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 z-10 shadow-lg select-none">
        <button
          onClick={zoomIn}
          title="Acercar (Zoom In)"
          className="p-1 hover:bg-[#3c495a]/20 active:bg-[#3c495a]/40 rounded text-[#9eacc0] hover:text-[#d9e7fc] transition-colors cursor-pointer"
        >
          <ZoomIn size={13} />
        </button>
        <button
          onClick={zoomOut}
          title="Alejar (Zoom Out)"
          className="p-1 hover:bg-[#3c495a]/20 active:bg-[#3c495a]/40 rounded text-[#9eacc0] hover:text-[#d9e7fc] transition-colors cursor-pointer"
        >
          <ZoomOut size={13} />
        </button>
        <div className="w-px h-3 bg-[#3c495a]/25 mx-1" />
        <button
          onClick={resetViewport}
          title="Restablecer Vista (Reset)"
          className="px-1.5 py-0.5 hover:bg-[#3c495a]/20 active:bg-[#3c495a]/40 rounded text-[#9eacc0] hover:text-[#d9e7fc] transition-colors flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-wider font-semibold cursor-pointer"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      </div>

      {/* Floating Mode Stats/Info Panel at bottom-left */}
      <div className="absolute bottom-3 left-3 bg-[#031427]/80 backdrop-blur-md border border-[#3c495a]/15 px-3 py-1.5 rounded-md text-[10px] text-[#9eacc0] flex items-center gap-3 z-10 font-mono shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#a3f185]" />
          <span>Cronométrico</span>
        </div>
        <div className="w-px h-3 bg-[#3c495a]/30" />
        <div>
          <span>Commits: <span className="text-[#d9e7fc] font-bold">{filteredCommits.length}</span></span>
        </div>
        {filterText.trim() && (
          <>
            <div className="w-px h-3 bg-[#3c495a]/30" />
            <span className="text-[#a3f185] font-semibold">Filtro activo</span>
          </>
        )}
      </div>
    </div>
  );
}
