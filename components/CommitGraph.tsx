'use client';

/**
 * CommitGraph — renders a GitKraken-style commit graph with curved lane lines.
 *
 * Algorithm (lane allocation):
 *   We iterate commits from newest (top) to oldest (bottom). We maintain a
 *   `lanes` array where each slot holds the SHA of the commit that currently
 *   "occupies" that lane. When we render a commit, we look up its lane; for
 *   each parent, we either keep occupying our lane (first parent) or open
 *   a new lane (additional parents -> branch merges).
 *
 *   This yields a stable column layout where each branch flows down its own
 *   vertical lane, and merges/forks render as diagonal connectors between
 *   lanes.
 */

import { useMemo } from 'react';
import type { Commit } from '@/lib/git-store';
import { cn } from '@/lib/utils';

const LANE_W = 18;          // horizontal space per lane
const ROW_H = 36;           // row height (must match commit row CSS)
const DOT_R = 5;            // commit dot radius
const PADDING_LEFT = 12;

// Lane colors derived from "The Compiled Soul" palette
// (primary / tertiary / secondary / error + their dim variants)
const LANE_COLORS = [
  '#a3f185', // primary (neon green)
  '#5ed8ff', // tertiary (cyan)
  '#fd9d1a', // secondary (flame orange)
  '#ff716c', // error (red coral)
  '#68b24f', // primary-container (deeper green)
  '#39bce2', // tertiary-dim
  '#ffb462', // secondary-fixed-dim (light orange)
  '#95e279', // primary-dim
];

interface GraphRow {
  commit: Commit;
  lane: number;
  laneColor: string;
  connections: Array<{
    fromLane: number;
    toLane: number;
    toRow: number;
    color: string;
  }>;
  activeLanes: Array<{ lane: number; color: string }>;
}

function computeGraph(commits: Commit[]): { rows: GraphRow[]; totalLanes: number } {
  // lanes[i] = SHA the lane is currently "reserved" for (the commit waiting to be drawn in this lane)
  const lanes: (string | null)[] = [];
  const laneColors: string[] = [];
  const commitIndex = new Map<string, number>();
  commits.forEach((c, i) => commitIndex.set(c.hash, i));

  const rows: GraphRow[] = [];
  let nextColorIdx = 0;

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    // Find or assign lane for this commit
    let lane = lanes.indexOf(commit.hash);
    let laneColor: string;

    if (lane === -1) {
      // Assign new lane (root of a branch tip)
      lane = lanes.findIndex((s) => s === null);
      if (lane === -1) lane = lanes.length;
      laneColor = LANE_COLORS[nextColorIdx++ % LANE_COLORS.length];
      lanes[lane] = commit.hash;
      laneColors[lane] = laneColor;
    } else {
      laneColor = laneColors[lane];
    }

    // Snapshot active lanes BEFORE we modify them (used to draw vertical pass-through lines)
    const activeLanes = lanes
      .map((sha, l) => (sha !== null && sha !== commit.hash ? { lane: l, color: laneColors[l] } : null))
      .filter((x): x is { lane: number; color: string } => x !== null);

    // Free our lane (this commit is consumed) — but the first parent may re-claim it
    lanes[lane] = null;

    // Build connections to parents
    const connections: GraphRow['connections'] = [];

    for (let p = 0; p < commit.parents.length; p++) {
      const parent = commit.parents[p];
      const parentIdx = commitIndex.get(parent);
      if (parentIdx === undefined) continue; // parent outside log

      // Is parent already reserved in some lane?
      let parentLane = lanes.indexOf(parent);

      if (parentLane === -1) {
        // Assign parent to a lane:
        if (p === 0) {
          // First parent inherits our lane and color (same branch continues down)
          parentLane = lane;
          lanes[parentLane] = parent;
          laneColors[parentLane] = laneColor;
        } else {
          // Additional parent (merge) — get a new lane with new color
          parentLane = lanes.findIndex((s) => s === null);
          if (parentLane === -1) parentLane = lanes.length;
          lanes[parentLane] = parent;
          laneColors[parentLane] = LANE_COLORS[nextColorIdx++ % LANE_COLORS.length];
        }
      }

      connections.push({
        fromLane: lane,
        toLane: parentLane,
        toRow: parentIdx,
        color: laneColors[parentLane],
      });
    }

    rows.push({ commit, lane, laneColor, connections, activeLanes });
  }

  return { rows, totalLanes: Math.max(...rows.map((r) => Math.max(r.lane, ...r.connections.map((c) => Math.max(c.fromLane, c.toLane))) + 1), 1) };
}

export function CommitGraph({
  commits,
  selectedHash,
  currentBranch,
  onSelect,
  onContextMenu,
}: {
  commits: Commit[];
  selectedHash?: string;
  currentBranch?: string;
  onSelect: (commit: Commit) => void;
  onContextMenu: (e: React.MouseEvent, commit: Commit) => void;
}) {
  const { rows, totalLanes } = useMemo(() => computeGraph(commits), [commits]);
  const graphWidth = PADDING_LEFT + totalLanes * LANE_W + 8;

  if (commits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#9eacc0] text-sm">
        Sin commits
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {rows.map((row, i) => (
        <div
          key={row.commit.hash}
          onClick={() => onSelect(row.commit)}
          onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, row.commit); }}
          className={cn(
            'flex items-center cursor-pointer group relative px-2 hover:bg-[#0d2134]',
            selectedHash === row.commit.hash && 'bg-[#a3f185]/15',
          )}
          style={{ height: ROW_H }}
        >
          {selectedHash === row.commit.hash && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#a3f185]" />
          )}

          {/* SVG graph cell */}
          <svg
            width={graphWidth}
            height={ROW_H}
            className="shrink-0"
            style={{ overflow: 'visible' }}
          >
            {/* Vertical pass-through lines for lanes that don't belong to this commit */}
            {row.activeLanes.map(({ lane, color }) => (
              <line
                key={`active-${lane}`}
                x1={PADDING_LEFT + lane * LANE_W}
                y1={0}
                x2={PADDING_LEFT + lane * LANE_W}
                y2={ROW_H}
                stroke={color}
                strokeWidth={2}
                opacity={0.6}
              />
            ))}

            {/* Vertical line above and below the commit dot in its own lane */}
            {i > 0 && (
              <line
                x1={PADDING_LEFT + row.lane * LANE_W}
                y1={0}
                x2={PADDING_LEFT + row.lane * LANE_W}
                y2={ROW_H / 2 - DOT_R}
                stroke={row.laneColor}
                strokeWidth={2}
              />
            )}

            {/* Connectors to parents */}
            {row.connections.map((conn, ci) => {
              const x1 = PADDING_LEFT + conn.fromLane * LANE_W;
              const x2 = PADDING_LEFT + conn.toLane * LANE_W;
              const y1 = ROW_H / 2;
              const y2 = ROW_H;
              if (conn.fromLane === conn.toLane) {
                return (
                  <line
                    key={ci}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={conn.color} strokeWidth={2}
                  />
                );
              }
              // Curved bezier between lanes
              const cy = y1 + (y2 - y1) * 0.5;
              return (
                <path
                  key={ci}
                  d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
                  stroke={conn.color}
                  strokeWidth={2}
                  fill="none"
                />
              );
            })}

            {/* Commit dot */}
            <circle
              cx={PADDING_LEFT + row.lane * LANE_W}
              cy={ROW_H / 2}
              r={DOT_R}
              fill={row.laneColor}
              stroke="#020f1e"
              strokeWidth={2}
            />
          </svg>

          {/* Commit info */}
          <div className="flex-1 flex items-center gap-2 min-w-0 pl-2">
            {/* Ref badges */}
            {row.commit.refs && row.commit.refs.length > 0 && (
              <div className="flex gap-1 shrink-0">
                {row.commit.refs.slice(0, 3).map((ref) => {
                  const isTag = ref.startsWith('tag: ');
                  const isRemote = ref.includes('/');
                  const text = isTag ? ref.replace('tag: ', '') : ref;
                  const isCurrent = !isTag && !isRemote && text === currentBranch;
                  return (
                    <span
                      key={ref}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap font-medium',
                        isTag
                          ? 'bg-[#fd9d1a]/15 text-[#fd9d1a] border-[#fd9d1a]/30'
                          : isCurrent
                          ? 'bg-[#a3f185]/20 text-[#a3f185] border-[#a3f185]/40'
                          : isRemote
                          ? 'bg-[#5ed8ff]/10 text-[#5ed8ff] border-[#5ed8ff]/30'
                          : 'bg-[#a3f185]/15 text-[#a3f185] border-[#a3f185]/30',
                      )}
                      title={ref}
                    >
                      {text}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Message */}
            <span className="truncate text-sm text-[#d9e7fc] group-hover:text-[#d9e7fc]">
              {row.commit.message}
            </span>
          </div>

          {/* Right column: date, author, hash */}
          <div className="flex items-center gap-4 text-xs font-mono shrink-0 pr-2">
            <span className="text-[#9eacc0] w-24 text-right truncate">{formatDate(row.commit.date)}</span>
            <span className="text-[#9eacc0] truncate max-w-[120px]">{row.commit.authorName}</span>
            <span
              className={cn(
                'w-16 text-right',
                selectedHash === row.commit.hash ? 'text-[#a3f185]' : 'text-[#9eacc0]',
              )}
            >
              {row.commit.shortHash}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
