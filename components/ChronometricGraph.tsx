'use client';

import { useMemo, useState } from 'react';
import { useGitStore, type Commit } from '@/lib/git-store';
import {
  mapLaneToBranchIndex,
  projectCommit,
  branchToOffset,
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
import { Calendar, GitCommit, ZoomIn, ZoomOut, RotateCcw, Activity, Layers, Cpu, Terminal, Compass, Crosshair } from 'lucide-react';

function getBezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
  const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;

  const tx = 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x);
  const ty = 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y);

  const angle = Math.atan2(ty, tx) * (180 / Math.PI);
  return { x, y, tx, ty, angle };
}

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
  const stashes = useGitStore((state) => state.stashes);
  const modifiedFiles = useGitStore((state) => state.modifiedFiles);
  const branchTracking = useGitStore((state) => state.branchTracking);
  const repoName = useGitStore((state) => state.repoName);
  const repoPath = useGitStore((state) => state.repoPath);
  const submodules = useGitStore((state) => state.submodules);
  const worktrees = useGitStore((state) => state.worktrees);

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

  // 1.5. Find selected commit from hash for HUD Panel 04
  const selectedCommit = useMemo(() => {
    if (!selectedHash) return null;
    return commits.find((c) => c.hash === selectedHash) || null;
  }, [commits, selectedHash]);

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

  // 3.5. Format human-readable timeline date range for Panel 03
  const dateRangeString = useMemo(() => {
    if (filteredCommits.length === 0) return 'T_ZERO';
    const firstDate = new Date(filteredCommits[filteredCommits.length - 1].date);
    const lastDate = new Date(filteredCommits[0].date);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${firstDate.toLocaleDateString(undefined, options).toUpperCase()} - ${lastDate.toLocaleDateString(undefined, options).toUpperCase()}`;
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

  // Extract primary branch labels for display
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

  // Stable map of branchIndex -> branchName
  const branchNamesMap = useMemo(() => {
    const map = new Map<number, string>();
    projectedCommits.forEach((node) => {
      const name = getBranchName(node.commit);
      if (name) {
        const currentName = map.get(node.branchIndex);
        if (!currentName) {
          map.set(node.branchIndex, name);
        }
      }
    });
    return map;
  }, [projectedCommits]);

  // Find the oldest node (minimum chronologicalIndex) for each branchIndex
  const branchOrigins = useMemo(() => {
    const origins = new Map<number, string>(); // branchIndex -> commitHash
    projectedCommits.forEach((node) => {
      const existingHash = origins.get(node.branchIndex);
      if (!existingHash) {
        origins.set(node.branchIndex, node.commit.hash);
      } else {
        const existingNode = projectedLookup.get(existingHash);
        if (existingNode && node.chronologicalIndex < existingNode.chronologicalIndex) {
          origins.set(node.branchIndex, node.commit.hash);
        }
      }
    });
    return origins;
  }, [projectedCommits, projectedLookup]);


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
  const nx = dy / L;
  const ny = -dx / L;
  const rx = -nx;
  const ry = -ny;

  // Active branch / HEAD commit node
  const headCommitNode = useMemo(() => {
    if (projectedCommits.length === 0) return null;
    const active = projectedCommits.find((node) => {
      if (!node.commit.refs) return false;
      return node.commit.refs.some(
        (r) => r === 'HEAD' || r === currentBranch || r === `refs/heads/${currentBranch}`
      );
    });
    return active || projectedCommits[0] || null;
  }, [projectedCommits, currentBranch]);

  // Coordinates for the WIP capsule (if changes exist in modifiedFiles)
  const wipCoords = useMemo(() => {
    if (modifiedFiles.length === 0 || !headCommitNode) return null;
    // Place WIP 50px ahead of HEAD commit along its lane, and offset to the right-down perpendicular direction by 25px
    return {
      x: headCommitNode.x + ux * 50 + rx * 25,
      y: headCommitNode.y + uy * 50 + ry * 25,
    };
  }, [modifiedFiles.length, headCommitNode, ux, uy, rx, ry]);

  // Coordinates for Stash pods (docked parallel on branchIndex = -3.2)
  const stashCoords = useMemo(() => {
    return stashes.map((stash, idx) => {
      // Place in a dedicated "parking deck" starting from xStart + 150
      const x = xStart + 150 + idx * 75;
      const baseX = x;
      // Interpolate baseY on the diagonal ruler
      const p = (x - xStart) / (xEnd - xStart || 1);
      const baseY = yStart + p * (yEnd - yStart);
      
      const offset = branchToOffset(-3.2, x, {
        fanFactor: config.fanFactor,
        width: config.width,
        paddingLeft: config.paddingLeft,
        paddingRight: config.paddingRight,
      });

      return {
        x: baseX + offset * nx,
        y: baseY + offset * ny,
      };
    });
  }, [stashes, xStart, yStart, xEnd, yEnd, nx, ny, config]);

  // Ahead/Behind tracking for the current active branch
  const { ahead, behind } = useMemo(() => {
    if (!currentBranch) return { ahead: 0, behind: 0 };
    const tracking = branchTracking[currentBranch];
    return {
      ahead: tracking?.ahead || 0,
      behind: tracking?.behind || 0,
    };
  }, [branchTracking, currentBranch]);

  // Unique branch indices active in the current set of commits
  const activeBranchIndices = useMemo(() => {
    const indices = new Set<number>();
    projectedCommits.forEach((node) => indices.add(node.branchIndex));
    return Array.from(indices);
  }, [projectedCommits]);

  // Paths representing parallel orbits for each branch lane
  const orbitPaths = useMemo(() => {
    return activeBranchIndices.map((bIndex) => {
      const points: string[] = [];
      const steps = 30;
      
      for (let step = 0; step <= steps; step++) {
        const ratio = step / steps;
        const x = config.paddingLeft + ratio * (width - config.paddingLeft - config.paddingRight);
        
        const p = (x - xStart) / (xEnd - xStart || 1);
        const baseX = x;
        const baseY = yStart + p * (yEnd - yStart);
        
        const offset = branchToOffset(bIndex, x, {
          fanFactor: config.fanFactor,
          width: config.width,
          paddingLeft: config.paddingLeft,
          paddingRight: config.paddingRight,
        });
        
        const finalX = baseX + offset * nx;
        const finalY = baseY + offset * ny;
        
        points.push(`${step === 0 ? 'M' : 'L'} ${finalX.toFixed(2)} ${finalY.toFixed(2)}`);
      }
      
      const matchingNode = projectedCommits.find(n => n.branchIndex === bIndex);
      const color = matchingNode?.laneColor || '#3c495a';
      
      return {
        branchIndex: bIndex,
        pathD: points.join(' '),
        color,
      };
    });
  }, [activeBranchIndices, config, width, height, xStart, yStart, xEnd, yEnd, nx, ny, projectedCommits]);

  // Satellite tags fanning out
  const tagsWithPositions = useMemo(() => {
    const list: Array<{
      commitHash: string;
      tagName: string;
      x: number;
      y: number;
      satX: number;
      satY: number;
      color: string;
    }> = [];
    
    projectedCommits.forEach((node) => {
      if (!node.commit.refs) return;
      const tags = node.commit.refs.filter(r => r.startsWith('tag: '));
      tags.forEach((tagRaw, tagIndex) => {
        const tagName = tagRaw.slice(5);
        // Force tags to always fan out to the left-up (left) of the timeline
        // nx, ny are negative, which points left-up in screen coordinates
        const distance = 30 + tagIndex * 20; 
        
        const satX = node.x + nx * distance - ux * 8;
        const satY = node.y + ny * distance - uy * 8;
        
        list.push({
          commitHash: node.commit.hash,
          tagName,
          x: node.x,
          y: node.y,
          satX,
          satY,
          color: '#fd9d1a',
        });
      });
    });
    
    return list;
  }, [projectedCommits, nx, ny, ux, uy]);

  // Find tip commits for each branch lane
  const latestCommitsByBranch = useMemo(() => {
    const map = new Map<number, string>();
    projectedCommits.forEach((node) => {
      const currentLatest = map.get(node.branchIndex);
      if (!currentLatest) {
        map.set(node.branchIndex, node.commit.hash);
      } else {
        const existingNode = projectedLookup.get(currentLatest);
        if (existingNode && node.chronologicalIndex > existingNode.chronologicalIndex) {
          map.set(node.branchIndex, node.commit.hash);
        }
      }
    });
    return map;
  }, [projectedCommits, projectedLookup]);

  const isLatestInBranch = (nodeHash: string, branchIndex: number) => {
    return latestCommitsByBranch.get(branchIndex) === nodeHash;
  };

  // Coordinates for new branch fork points (start of new branches)
  const branchForks = useMemo(() => {
    const forks: Array<{
      x: number;
      y: number;
      laneColor: string;
      parentX: number;
      parentY: number;
    }> = [];

    projectedCommits.forEach((node) => {
      node.commit.parents.forEach((parentHash) => {
        const parentNode = projectedLookup.get(parentHash);
        if (parentNode && parentNode.branchIndex !== node.branchIndex) {
          forks.push({
            x: node.x,
            y: node.y,
            laneColor: node.laneColor,
            parentX: parentNode.x,
            parentY: parentNode.y,
          });
        }
      });
    });

    return forks;
  }, [projectedCommits, projectedLookup]);

  // 6. State for interactive hover cards
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number } | null>(null);

  const hoveredNode = useMemo(() => {
    if (!hoveredHash) return null;

    if (hoveredHash === 'wip' && wipCoords) {
      return {
        commit: {
          hash: 'wip',
          shortHash: 'WIP',
          message: 'Cambios locales sin confirmar en tu espacio de trabajo.',
          authorName: 'Directorio de trabajo',
          authorEmail: '',
          date: new Date().toISOString(),
          parents: [],
          refs: ['WIP'],
        },
        laneColor: '#ff716c',
        x: wipCoords.x,
        y: wipCoords.y,
      } as any;
    }

    if (hoveredHash.startsWith('stash-')) {
      const idx = parseInt(hoveredHash.split('-')[1]);
      const stash = stashes[idx];
      const pos = stashCoords[idx];
      if (stash && pos) {
        return {
          commit: {
            hash: stash.hash || `stash-${idx}`,
            shortHash: `stash@{${idx}}`,
            message: stash.message,
            authorName: 'Stash temporal',
            authorEmail: '',
            date: stash.date || new Date().toISOString(),
            parents: [],
            refs: [`stash@{${idx}}`],
          },
          laneColor: '#9eacc0',
          x: pos.x,
          y: pos.y,
        } as any;
      }
    }

    return projectedLookup.get(hoveredHash) || null;
  }, [hoveredHash, projectedLookup, stashes, wipCoords, stashCoords]);

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
            {/* Layer 1: Instrumentation Layer */}
            <g id="instrumentation-layer">
              {/* Branch Orbits */}
              {orbitPaths.map((orbit) => (
                <path
                  key={`orbit-${orbit.branchIndex}`}
                  d={orbit.pathD}
                  stroke={orbit.color}
                  strokeWidth={0.75}
                  strokeDasharray="3 5"
                  fill="none"
                  opacity={0.16}
                />
              ))}

              {/* Dual metric rulers */}
              <line
                x1={xStart + nx * 2}
                y1={yStart + ny * 2}
                x2={xEnd + nx * 2}
                y2={yEnd + ny * 2}
                stroke="#1e293b"
                strokeWidth={1}
                opacity={0.6}
              />
              <line
                x1={xStart - nx * 2}
                y1={yStart - ny * 2}
                x2={xEnd - nx * 2}
                y2={yEnd - ny * 2}
                stroke="#1e293b"
                strokeWidth={1}
                opacity={0.6}
              />

              {/* Rulers tick markers */}
              {timeTicks.map((tick, index) => (
                <g key={`ruler-tick-${index}`}>
                  <line
                    x1={tick.x - nx * 5}
                    y1={tick.y - ny * 5}
                    x2={tick.x + nx * 5}
                    y2={tick.y + ny * 5}
                    stroke="#3c495a"
                    strokeWidth={1.5}
                    opacity={0.7}
                  />
                </g>
              ))}

              {/* Extreme labels */}
              <text
                x={xStart - 15}
                y={yStart + 15}
                textAnchor="end"
                fontSize="8"
                fill="#697789"
                className="font-mono font-bold"
                opacity={0.6}
              >
                [CHRONO_START // T_MIN]
              </text>
              <text
                x={xEnd + 15}
                y={yEnd - 15}
                textAnchor="start"
                fontSize="8"
                fill="#697789"
                className="font-mono font-bold"
                opacity={0.6}
              >
                [CHRONO_END // T_MAX]
              </text>

              {/* Guidelines & Time Ticks */}
              {timeTicks.map((tick, index) => (
                <g key={`tick-${index}`} opacity={0.6}>
                  {/* Dash lines */}
                  <line
                    x1={tick.x}
                    y1={config.paddingTop - 20}
                    x2={tick.x}
                    y2={height - config.paddingBottom + 20}
                    stroke="#1e293b"
                    strokeWidth={0.75}
                    strokeDasharray="4 8"
                    opacity={0.3}
                  />
                  {/* Visual marker point on diagonal */}
                  <circle cx={tick.x} cy={tick.y} r={2.5} fill="#697789" />
                  
                  {/* Secondary technical coordinate */}
                  <text
                    x={tick.x}
                    y={height - config.paddingBottom + 25}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="#697789"
                    className="font-mono font-semibold"
                  >
                    {`T+${String(index).padStart(3, '0')}`}
                  </text>
                  
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
            </g>

            {/* Layer 2: Base Graph Layer */}
            <g id="base-graph">
              {/* Parent-child connectives and convergence marks */}
              {projectedCommits.map((node) => {
                return node.connections.map((conn, ci) => {
                  const parentNode = projectedCommits[conn.toRow];
                  if (!parentNode) return null;

                  const cx = node.x;
                  const cy = node.y;
                  const px = parentNode.x;
                  const py = parentNode.y;

                  const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2) || 1;
                  const tension = dist * 0.33;

                  const cp1x = cx - tension * ux;
                  const cp1y = cy - tension * uy;
                  const cp2x = px + tension * ux;
                  const cp2y = py + tension * uy;

                  const isMerge = node.commit.parents.length > 1 && ci > 0;
                  
                  let mid = null;
                  if (isMerge) {
                    mid = getBezierPoint(
                      { x: cx, y: cy },
                      { x: cp1x, y: cp1y },
                      { x: cp2x, y: cp2y },
                      { x: px, y: py },
                      0.5
                    );
                  }

                  return (
                    <g key={`conn-group-${node.commit.hash}-${ci}`}>
                      <path
                        d={`M ${cx} ${cy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${px} ${py}`}
                        stroke={conn.color}
                        strokeWidth={isMerge ? 1.5 : 2}
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={isMerge ? "3 3" : undefined}
                        opacity={selectedHash === node.commit.hash || selectedHash === parentNode.commit.hash ? 0.9 : 0.45}
                        className="transition-all duration-200"
                      />
                      {isMerge && mid && (
                        <path
                          d="M -3.5 -2.5 L 0 0 L -3.5 2.5"
                          fill="none"
                          stroke={conn.color}
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          transform={`translate(${mid.x}, ${mid.y}) rotate(${mid.angle})`}
                          opacity={0.85}
                        />
                      )}
                    </g>
                  );
                });
              })}

              {/* Commit Nodes */}
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

            {/* Layer 3: Overlay Labels Layer */}
            <g id="overlay-labels">
              {/* Satellite Tags */}
              {tagsWithPositions.map((tag, idx) => {
                const badgeWidth = tag.tagName.length * 5.8 + 8;
                return (
                  <g key={`tag-satellite-${tag.commitHash}-${idx}`}>
                    <line
                      x1={tag.x}
                      y1={tag.y}
                      x2={tag.satX}
                      y2={tag.satY}
                      stroke="#697789"
                      strokeWidth={0.75}
                      strokeDasharray="2 2"
                      opacity={0.5}
                    />
                    <circle cx={tag.satX} cy={tag.satY} r={2} fill="#fd9d1a" opacity={0.7} />
                    <g transform={`translate(${tag.satX}, ${tag.satY})`}>
                      <rect
                        x={-badgeWidth - 6}
                        y={-6.5}
                        width={badgeWidth}
                        height={13}
                        rx={3}
                        fill="#031427"
                        stroke="#fd9d1a"
                        strokeWidth={0.75}
                        opacity={0.8}
                      />
                      <text
                        x={-badgeWidth - 2}
                        y={2.5}
                        fill="#fd9d1a"
                        fontSize="7.5"
                        className="font-mono font-medium select-none pointer-events-none"
                      >
                        {tag.tagName}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* HEAD Target Reticle (Static, scales slightly on active commit) */}
              {headCommitNode && (
                <g key="head-reticle">
                  <circle
                    cx={headCommitNode.x}
                    cy={headCommitNode.y}
                    r={17}
                    fill="none"
                    stroke="#a3f185"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    opacity={0.6}
                    className="transition-all duration-200"
                  />
                  <circle
                    cx={headCommitNode.x}
                    cy={headCommitNode.y}
                    r={13.5}
                    fill="none"
                    stroke="#a3f185"
                    strokeWidth={0.75}
                    opacity={0.7}
                  />
                  <line x1={headCommitNode.x} y1={headCommitNode.y - 21} x2={headCommitNode.x} y2={headCommitNode.y - 16} stroke="#a3f185" strokeWidth={1} opacity={0.8} />
                  <line x1={headCommitNode.x} y1={headCommitNode.y + 16} x2={headCommitNode.x} y2={headCommitNode.y + 21} stroke="#a3f185" strokeWidth={1} opacity={0.8} />
                  <line x1={headCommitNode.x - 21} y1={headCommitNode.y} x2={headCommitNode.x - 16} y2={headCommitNode.y} stroke="#a3f185" strokeWidth={1} opacity={0.8} />
                  <line x1={headCommitNode.x + 16} y1={headCommitNode.y} x2={headCommitNode.x + 21} y2={headCommitNode.y} stroke="#a3f185" strokeWidth={1} opacity={0.8} />
                </g>
              )}

              {/* WIP Capsule (Work in Progress) */}
              {wipCoords && headCommitNode && (
                <g
                  key="wip-capsule"
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredHash('wip');
                    setHoveredPos(wipCoords);
                  }}
                  onMouseLeave={() => {
                    setHoveredHash(null);
                    setHoveredPos(null);
                  }}
                >
                  <line
                    x1={headCommitNode.x}
                    y1={headCommitNode.y}
                    x2={wipCoords.x}
                    y2={wipCoords.y}
                    stroke="#ff716c"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                    opacity={0.5}
                  />
                  <polygon
                    points={`${wipCoords.x - 11},${wipCoords.y + 4} ${wipCoords.x - 5},${wipCoords.y - 6} ${wipCoords.x + 1},${wipCoords.y + 4}`}
                    fill="#ff716c"
                    opacity={0.5}
                  />
                  <rect
                    x={wipCoords.x - 4}
                    y={wipCoords.y - 9}
                    width={85}
                    height={18}
                    rx={4}
                    fill="#031427"
                    stroke="#ff716c"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    opacity={0.8}
                  />
                  <text
                    x={wipCoords.x + 8}
                    y={wipCoords.y + 2.5}
                    fill="#ff716c"
                    fontSize="7.5"
                    fontWeight="bold"
                    className="font-mono select-none pointer-events-none"
                    letterSpacing="0.5"
                  >
                    WIP [PENDING]
                  </text>
                </g>
              )}

              {/* Stash Pods (Grouped parallel nodes) */}
              {stashCoords.map((stashPos, idx) => (
                <g
                  key={`stash-pod-${idx}`}
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredHash(`stash-${idx}`);
                    setHoveredPos(stashPos);
                  }}
                  onMouseLeave={() => {
                    setHoveredHash(null);
                    setHoveredPos(null);
                  }}
                >
                  <line
                    x1={stashPos.x}
                    y1={stashPos.y}
                    x2={stashPos.x - nx * 18}
                    y2={stashPos.y - ny * 18}
                    stroke="#9eacc0"
                    strokeWidth={0.75}
                    strokeDasharray="1 3"
                    opacity={0.4}
                  />
                  <rect
                    x={stashPos.x - 22}
                    y={stashPos.y - 8}
                    width={44}
                    height={16}
                    rx={3}
                    fill="#031427"
                    stroke="#9eacc0"
                    strokeWidth={0.75}
                    opacity={0.75}
                  />
                  <rect
                    x={stashPos.x - 14}
                    y={stashPos.y + 1}
                    width={28}
                    height={3}
                    fill="#3c495a"
                    opacity={0.6}
                  />
                  <path
                    d={`M ${stashPos.x - 16} ${stashPos.y - 4} L ${stashPos.x - 16} ${stashPos.y + 4} L ${stashPos.x + 16} ${stashPos.y + 4} L ${stashPos.x + 16} ${stashPos.y - 4}`}
                    fill="none"
                    stroke="#9eacc0"
                    strokeWidth={0.5}
                    opacity={0.5}
                  />
                  <text
                    x={stashPos.x}
                    y={stashPos.y - 1}
                    textAnchor="middle"
                    fill="#9eacc0"
                    fontSize="6.5"
                    fontWeight="bold"
                    className="font-mono select-none pointer-events-none"
                  >
                    {`STSH@${idx}`}
                  </text>
                </g>
              ))}

              {/* Dynamic Telemetry Overlay Labels System (Unified Non-Overlapping Stack) */}
              {projectedCommits.map((node) => {
                const isHead = headCommitNode && node.commit.hash === headCommitNode.commit.hash;
                const isBranchOrigin = branchOrigins.get(node.branchIndex) === node.commit.hash;

                // 1. HEAD Node - Unified Telemetry Stack (Fixed Offset, prominent placement)
                if (isHead && headCommitNode) {
                  const baseLabelX = headCommitNode.x + rx * 38;
                  const baseLabelY = headCommitNode.y + ry * 38;
                  const lineSpacing = 11;

                  // Compute line Y positions statically to prevent JSX closure optimization issues
                  const line1Y = baseLabelY;
                  const line2Y = line1Y + ((ahead > 0 || behind > 0) ? lineSpacing : 0);
                  const line3Y = line2Y + lineSpacing;
                  const line4Y = line3Y + lineSpacing;

                  return (
                    <g key={`head-telemetry-stack`} opacity={0.95}>
                      {/* Dotted HUD connector line */}
                      <line
                        x1={headCommitNode.x}
                        y1={headCommitNode.y}
                        x2={headCommitNode.x + rx * 34}
                        y2={headCommitNode.y + ry * 34}
                        stroke="#a3f185"
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        opacity={0.85}
                      />

                      {/* Line 1: [HEAD // TARGET: ACTIVE] */}
                      <text
                        x={baseLabelX}
                        y={line1Y}
                        fill="#a3f185"
                        fontSize="7.5"
                        fontWeight="bold"
                        className="font-mono select-none pointer-events-none"
                        letterSpacing="0.5"
                      >
                        [HEAD // TARGET: ACTIVE]
                      </text>

                      {/* Line 2: TRACKING // Ahead/Behind (Conditional) */}
                      {(ahead > 0 || behind > 0) && (
                        <text
                          x={baseLabelX}
                          y={line2Y}
                          fill="#a3f185"
                          fontSize="7"
                          fontWeight="bold"
                          className="font-mono select-none pointer-events-none"
                          letterSpacing="0.5"
                          opacity={0.85}
                        >
                          {`TRACKING // ${ahead > 0 ? `▲${ahead}` : ''}${behind > 0 ? ` ▼${behind}` : ''}`}
                        </text>
                      )}

                      {/* Line 3: BRANCH // Name */}
                      <text
                        x={baseLabelX}
                        y={line3Y}
                        fill={headCommitNode.laneColor}
                        fontSize="7.5"
                        fontWeight="bold"
                        className="font-mono select-none pointer-events-none"
                        letterSpacing="0.5"
                      >
                        {`BRANCH // ${currentBranch || 'DETACHED'}`}
                      </text>

                      {/* Line 4: COMMIT // hash & message */}
                      <text
                        x={baseLabelX}
                        y={line4Y}
                        fill={headCommitNode.laneColor}
                        fontSize="7"
                        fontWeight="medium"
                        className="font-mono select-none pointer-events-none"
                        letterSpacing="0.5"
                        opacity={0.8}
                      >
                        {`C:${headCommitNode.commit.shortHash.toUpperCase()} // ${headCommitNode.commit.message.substring(0, 24)}...`}
                      </text>
                    </g>
                  );
                }

                // 2. Branch Origin Nodes (Start of Branch - Staggered Placement)
                if (isBranchOrigin) {
                  const hasParent = node.commit.parents.length > 0;
                  const branchName = branchNamesMap.get(node.branchIndex) || `branch-${Math.abs(node.branchIndex)}`;

                  // Symmetrical Stagger: alternate offsets to eliminate horizontal overlaps
                  const isEven = node.chronologicalIndex % 2 === 0;
                  const offsetDist = isEven ? 32 : 72;

                  // Interlocking fork triangles coordinates (Moved completely outside the 10.5px circle)
                  const p1_A_x = node.x + rx * 25;
                  const p1_A_y = node.y + ry * 25;
                  const p1_B_x = node.x + rx * 20 + ux * 2.5;
                  const p1_B_y = node.y + ry * 20 + uy * 2.5;
                  const p1_C_x = node.x + rx * 20 - ux * 2.5;
                  const p1_C_y = node.y + ry * 20 - uy * 2.5;

                  const p2_A_x = node.x + rx * 28;
                  const p2_A_y = node.y + ry * 28;
                  const p2_B_x = node.x + rx * 23 + ux * 2.5;
                  const p2_B_y = node.y + ry * 23 + uy * 2.5;
                  const p2_C_x = node.x + rx * 23 - ux * 2.5;
                  const p2_C_y = node.y + ry * 23 - uy * 2.5;

                  return (
                    <g key={`branch-origin-${node.commit.hash}`} opacity={0.9}>
                      {/* Dotted HUD connector line */}
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={node.x + rx * (offsetDist - 4)}
                        y2={node.y + ry * (offsetDist - 4)}
                        stroke={node.laneColor}
                        strokeWidth={0.75}
                        strokeDasharray="2 2"
                        opacity={0.6}
                      />

                      {/* Interlocking Triangles Demarcating branch start (Clean, crisp, external to circle) */}
                      {hasParent && (
                        <g opacity={0.9}>
                          <polygon
                            points={`${p1_A_x},${p1_A_y} ${p1_B_x},${p1_B_y} ${p1_C_x},${p1_C_y}`}
                            fill={node.laneColor}
                            opacity={0.4}
                            stroke={node.laneColor}
                            strokeWidth={0.75}
                          />
                          <polygon
                            points={`${p2_A_x},${p2_A_y} ${p2_B_x},${p2_B_y} ${p2_C_x},${p2_C_y}`}
                            fill="none"
                            stroke={node.laneColor}
                            strokeWidth={1}
                          />
                        </g>
                      )}

                      {/* Branch Name Label */}
                      <text
                        x={node.x + rx * offsetDist}
                        y={node.y + ry * offsetDist + 2.5}
                        fill={node.laneColor}
                        fontSize="7.5"
                        fontWeight="bold"
                        className="font-mono select-none pointer-events-none"
                        letterSpacing="0.5"
                      >
                        {`BRANCH // ${branchName}`}
                      </text>
                    </g>
                  );
                }

                // 3. Normal Commit Nodes (Rest of the circles - Symmetrical Staggered Placement)
                const isEven = node.chronologicalIndex % 2 === 0;
                const offsetDist = isEven ? 32 : 72;

                return (
                  <g key={`commit-text-${node.commit.hash}`} opacity={0.75} className="hover:opacity-100 transition-opacity">
                    {/* Dotted HUD connector line */}
                    <line
                      x1={node.x}
                      y1={node.y}
                      x2={node.x + rx * (offsetDist - 4)}
                      y2={node.y + ry * (offsetDist - 4)}
                      stroke={node.laneColor}
                      strokeWidth={0.5}
                      strokeDasharray="2 3"
                      opacity={0.4}
                    />

                    {/* Commit Telemetry label */}
                    <text
                      x={node.x + rx * offsetDist}
                      y={node.y + ry * offsetDist + 2.5}
                      fill={node.laneColor}
                      fontSize="7"
                      fontWeight="medium"
                      className="font-mono select-none pointer-events-none"
                      letterSpacing="0.5"
                    >
                      {`C:${node.commit.shortHash.toUpperCase()} // ${node.commit.message.substring(0, 24)}...`}
                    </text>
                  </g>
                );
              })}
            </g>
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

      {/* ── C2 BLOCK: HUD / SHELL TCARS SYSTEM ── */}

      {/* Inline styles for slow breathing phosphor glow and radar sweeps */}
      <style jsx>{`
        @keyframes hud-breath {
          0%, 100% {
            opacity: 0.25;
            filter: drop-shadow(0 0 1px rgba(94, 216, 255, 0.25)) drop-shadow(0 0 2px rgba(94, 216, 255, 0.1));
          }
          50% {
            opacity: 0.55;
            filter: drop-shadow(0 0 2.5px rgba(94, 216, 255, 0.5)) drop-shadow(0 0 5px rgba(94, 216, 255, 0.2));
          }
        }
        @keyframes radar-sweep {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .hud-breath {
          animation: hud-breath 5s ease-in-out infinite;
        }
        .radar-sweep {
          animation: radar-sweep 12s linear infinite;
          transform-origin: 15px 15px;
        }
      `}</style>

      {/* 1. Static SVG HUD Shell Overlay Layer (Frames viewport at z-10, pointer-events-none) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none z-10 opacity-30"
        id="tcars-hud-overlay"
      >
        <defs>
          <filter id="hud-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Circular Tactical Grid (Temporal horizons, centered) */}
        <circle cx="50%" cy="50%" r="35%" fill="none" stroke="#b455ff" strokeWidth="0.5" strokeDasharray="2 12" opacity="0.12" filter="url(#hud-glow)" />
        <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#5ed8ff" strokeWidth="0.5" strokeDasharray="100 200" opacity="0.08" filter="url(#hud-glow)" />
        <circle cx="50%" cy="50%" r="48%" fill="none" stroke="#a3f185" strokeWidth="0.5" strokeDasharray="1 18" opacity="0.06" />

        {/* Crosshair Ticks in center of screen */}
        <g stroke="#3c495a" strokeWidth="0.75" opacity="0.2">
          <line x1="50%" y1="calc(50% - 16px)" x2="50%" y2="calc(50% - 8px)" />
          <line x1="50%" y1="calc(50% + 8px)" x2="50%" y2="calc(50% + 16px)" />
          <line x1="calc(50% - 16px)" y1="50%" x2="calc(50% - 8px)" y2="50%" />
          <line x1="calc(50% + 8px)" y1="50%" x2="calc(50% + 16px)" y2="50%" />
        </g>

        {/* Curved HUD Corner Frames */}
        {/* Top-Left Curve */}
        <path d="M 8 60 L 8 16 A 8 8 0 0 1 16 8 L 285 8" fill="none" stroke="#5ed8ff" strokeWidth="1" filter="url(#hud-glow)" />
        <rect x="8" y="8" width="12" height="3" fill="#5ed8ff" />
        
        {/* Top-Right Curve */}
        <path d="M calc(100% - 285px) 8 L calc(100% - 16px) 8 A 8 8 0 0 1 calc(100% - 8px) 16 L calc(100% - 8px) 60" fill="none" stroke="#b455ff" strokeWidth="1" filter="url(#hud-glow)" />
        <rect x="calc(100% - 20px)" y="8" width="12" height="3" fill="#b455ff" />

        {/* Bottom-Left Curve */}
        <path d="M 8 calc(100% - 60px) L 8 calc(100% - 16px) A 8 8 0 0 0 16 calc(100% - 8px) L 265 calc(100% - 8px)" fill="none" stroke="#a3f185" strokeWidth="1" filter="url(#hud-glow)" />
        <rect x="8" y="calc(100% - 11px)" width="12" height="3" fill="#a3f185" />

        {/* Bottom-Right Curve */}
        <path d="M calc(100% - 160px) calc(100% - 8px) L calc(100% - 16px) calc(100% - 8px) A 8 8 0 0 0 calc(100% - 8px) calc(100% - 16px) L calc(100% - 8px) calc(100% - 60px)" fill="none" stroke="#fd9d1a" strokeWidth="1" filter="url(#hud-glow)" />
        <rect x="calc(100% - 20px)" y="calc(100% - 11px)" width="12" height="3" fill="#fd9d1a" />

        {/* Technical Coordinate Indicators */}
        <text x="295" y="13" fill="#697789" fontSize="6" className="font-mono" opacity="0.5">
          NAV_AXIS // AZIMUTH: 40.4° // DECLINATION: 0.85
        </text>
        <text x="calc(100% - 295px)" y="13" textAnchor="end" fill="#697789" fontSize="6" className="font-mono" opacity="0.5">
          SYS_CORRELATION // CHRONO_V2.0 // TIMELINE: RUNNING
        </text>
      </svg>

      {/* 2. PANEL 01: NAV TELEMETRY & SYSTEM CONTEXT (Top-Left, z-20) */}
      <div className="absolute top-4 left-4 w-[250px] bg-[#020b16]/75 backdrop-blur-md border border-[#3c495a]/25 rounded-md px-3 py-2.5 z-20 font-mono shadow-2xl flex flex-col gap-1.5 select-none">
        <div className="flex items-center justify-between border-b border-[#3c495a]/20 pb-1 mb-0.5">
          <span className="text-[10px] font-bold text-[#5ed8ff] tracking-wider uppercase truncate max-w-[170px]">
            {repoName || 'NO_ACTIVE_REPO'}
          </span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a3f185] hud-breath" />
            <span className="text-[7.5px] font-bold text-[#a3f185] tracking-widest">ACTIVE</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-[8.5px] text-[#9eacc0]">
          <div className="flex items-center gap-1.5">
            <Terminal size={10} className="text-[#5ed8ff]/70" />
            <span className="truncate max-w-[210px] font-semibold text-[#d9e7fc]">
              {currentBranch || 'DETACHED_HEAD'}
            </span>
          </div>
          <div className="truncate text-[7.5px] opacity-60 pl-4 border-l border-[#3c495a]/20">
            {repoPath || 'NO_PATH_SPECIFIED'}
          </div>
          <div className="flex items-center justify-between text-[7px] text-[#697789] uppercase tracking-wider pt-0.5 border-t border-[#3c495a]/10 mt-0.5">
            <span>MODE // CHRONO_HUD</span>
            <span>T_CORRELATION // OK</span>
          </div>
        </div>
      </div>

      {/* 3. PANEL 02: SYNC & DIRTY METRICS (Top-Right, z-20) */}
      <div className="absolute top-4 right-4 w-[250px] bg-[#020b16]/75 backdrop-blur-md border border-[#3c495a]/25 rounded-md px-3 py-2.5 z-20 font-mono shadow-2xl flex flex-col gap-1.5 select-none">
        <div className="flex items-center justify-between border-b border-[#3c495a]/20 pb-1 mb-0.5">
          <span className="text-[9px] font-bold text-[#b455ff] tracking-wider uppercase">
            SYNC_STATE // TELEMETRY
          </span>
          <Cpu size={11} className="text-[#b455ff]/70" />
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8.5px] text-[#9eacc0]">
          <div className="flex items-center justify-between border-b border-[#3c495a]/10 pb-0.5">
            <span>AHEAD //</span>
            <span className={`font-bold ${ahead > 0 ? 'text-[#a3f185]' : 'text-[#697789]'}`}>
              {ahead > 0 ? `▲${ahead}` : '0'}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-[#3c495a]/10 pb-0.5">
            <span>BEHIND //</span>
            <span className={`font-bold ${behind > 0 ? 'text-[#fd9d1a]' : 'text-[#697789]'}`}>
              {behind > 0 ? `▼${behind}` : '0'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>STASH_PODS //</span>
            <span className={`font-semibold ${stashes.length > 0 ? 'text-[#5ed8ff]' : 'text-[#697789]'}`}>
              {stashes.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>DIRTY_FILES //</span>
            <span className={`font-semibold ${modifiedFiles.length > 0 ? 'text-[#fd9d1a]' : 'text-[#697789]'}`}>
              {modifiedFiles.length}
            </span>
          </div>
        </div>
        {modifiedFiles.length > 0 && (
          <div className="mt-1 pt-1 border-t border-[#3c495a]/15 flex items-center justify-between text-[7px] text-[#697789]">
            <div className="flex gap-1.5">
              <span>MOD: {modifiedFiles.filter(f => f.status === 'modified').length}</span>
              <span>ADD: {modifiedFiles.filter(f => f.status === 'added' || f.status === 'untracked').length}</span>
              <span>DEL: {modifiedFiles.filter(f => f.status === 'deleted').length}</span>
            </div>
            {submodules.length > 0 && <span>SUBMODULES: {submodules.length}</span>}
          </div>
        )}
      </div>

      {/* 4. PANEL 03: CHRONO METRICS & RADAR SCAN (Bottom-Left, z-20) */}
      <div className="absolute bottom-4 left-4 w-[240px] bg-[#020b16]/75 backdrop-blur-md border border-[#3c495a]/25 rounded-md px-3 py-2.5 z-20 font-mono shadow-2xl flex items-center gap-3 select-none">
        {/* Animated Radar Scanning Scope */}
        <div className="relative w-[30px] h-[30px] shrink-0 border border-[#a3f185]/20 rounded-full overflow-hidden bg-[#021820]/30">
          <svg width="30" height="30" className="absolute inset-0">
            <circle cx="15" cy="15" r="14" fill="none" stroke="#a3f185" strokeWidth="0.5" opacity="0.15" />
            <circle cx="15" cy="15" r="7" fill="none" stroke="#a3f185" strokeWidth="0.5" opacity="0.1" />
            {/* Sweep arm */}
            <line
              x1="15" y1="15"
              x2="15" y2="1"
              stroke="#a3f185"
              strokeWidth="0.75"
              opacity="0.6"
              className="radar-sweep"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="flex items-center justify-between border-b border-[#3c495a]/15 pb-0.5 mb-0.5">
            <span className="text-[9px] font-bold text-[#a3f185] tracking-wider">CHRONO_DEPTH</span>
            <Activity size={10} className="text-[#a3f185]/70" />
          </div>
          <div className="flex items-center justify-between text-[8px] text-[#9eacc0]">
            <span>NODES_LOADED //</span>
            <span className="font-bold text-[#d9e7fc]">{filteredCommits.length}</span>
          </div>
          <div className="truncate text-[7px] text-[#697789] tracking-tight uppercase">
            {dateRangeString}
          </div>
        </div>
      </div>

      {/* 5. PANEL 04: TARGET TELEMETRY HUD (Bottom-Center, z-20) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[360px] max-w-[calc(100vw-540px)] bg-[#020b16]/75 backdrop-blur-md border border-[#3c495a]/25 rounded-md px-3 py-2.5 z-20 font-mono shadow-2xl select-none transition-all duration-300">
        {selectedCommit ? (
          <div className="flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#5ed8ff]/20 pb-1 mb-0.5">
              <div className="flex items-center gap-1.5">
                <Crosshair size={11} className="text-[#5ed8ff] hud-breath" />
                <span className="text-[9px] font-bold text-[#5ed8ff] tracking-wider uppercase">
                  TARGET_LOCKED // LOCK_STABLE
                </span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(selectedCommit.hash)}
                className="px-1.5 py-0.5 border border-[#5ed8ff]/30 hover:border-[#5ed8ff]/70 text-[#5ed8ff] hover:bg-[#5ed8ff]/10 rounded font-mono text-[7px] tracking-wider transition-all duration-150 uppercase cursor-pointer"
                title="Copy full commit SHA"
              >
                Copy SHA
              </button>
            </div>
            
            <div className="flex flex-col gap-0.5 text-[8px] text-[#9eacc0]">
              <div className="flex items-center justify-between">
                <span>SHA_SIGN // <span className="text-[#5ed8ff] font-semibold">{selectedCommit.shortHash.toUpperCase()}</span></span>
                <span className="text-[7.5px] opacity-75">{new Date(selectedCommit.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}</span>
              </div>
              <div className="truncate text-[#d9e7fc] text-[8.5px] font-semibold border-l-2 border-[#5ed8ff]/40 pl-1.5 my-0.5">
                {selectedCommit.message}
              </div>
              <div className="flex items-center justify-between text-[7px] text-[#697789] pt-0.5 border-t border-[#3c495a]/10">
                <span className="truncate max-w-[140px]">AUTHOR: {selectedCommit.authorName.toUpperCase()}</span>
                <span className="truncate max-w-[150px]">PARENT: {selectedCommit.parents[0]?.substring(0, 7).toUpperCase() || 'ROOT'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between h-[45px] opacity-75">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-5 h-5">
                <div className="absolute inset-0 border border-[#3c495a]/40 rounded-full animate-ping opacity-25" />
                <Compass size={11} className="text-[#697789] animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-[#697789] tracking-wider uppercase">
                  TARGET_ACQUISITION // SCANNING
                </span>
                <span className="text-[7px] text-[#697789]/75 uppercase">
                  SELECT COMMIT NODE TO FOCUS SCANNER
                </span>
              </div>
            </div>
            <div className="text-[7px] text-[#697789] text-right font-mono select-none">
              GRID: ACTIVE<br />LANE_ORBITS: SECURE
            </div>
          </div>
        )}
      </div>

      {/* 6. Discrete Canvas Navigation Controls at bottom-right (Discreto/Opcional, z-20) */}
      <div className="absolute bottom-4 right-4 bg-[#020b16]/75 backdrop-blur-md border border-[#3c495a]/25 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 z-20 shadow-2xl select-none">
        <button
          onClick={zoomIn}
          title="Acercar (Zoom In)"
          className="p-1 hover:bg-[#3c495a]/20 active:bg-[#3c495a]/40 rounded text-[#9eacc0] hover:text-[#d9e7fc] transition-colors cursor-pointer"
        >
          <ZoomIn size={12} />
        </button>
        <button
          onClick={zoomOut}
          title="Alejar (Zoom Out)"
          className="p-1 hover:bg-[#3c495a]/20 active:bg-[#3c495a]/40 rounded text-[#9eacc0] hover:text-[#d9e7fc] transition-colors cursor-pointer"
        >
          <ZoomOut size={12} />
        </button>
        <div className="w-px h-3 bg-[#3c495a]/25 mx-1" />
        <button
          onClick={resetViewport}
          title="Restablecer Vista (Reset)"
          className="px-1.5 py-0.5 hover:bg-[#3c495a]/20 active:bg-[#3c495a]/40 rounded text-[#9eacc0] hover:text-[#d9e7fc] transition-colors flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider font-semibold cursor-pointer"
        >
          <RotateCcw size={10} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
