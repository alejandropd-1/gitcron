'use client';

/**
 * CommitGraph — GitKraken-style commit graph.
 *
 * Layout (3 columns):
 *   [BRANCH/TAG]    [GRAPH]    [DESCRIPTION + extras]
 *
 *   - Branch/Tag column: shows refs that point at the commit (only branch tips
 *     and tags). Each ref has a colored chip with an icon indicating its kind
 *     (local branch = Monitor, remote = Cloud, tag = Tag, active = checkmark).
 *
 *   - Graph column: the SVG lane visualization. The commit's own dot is filled
 *     with the author initial; pass-through lanes are just colored lines.
 *
 *   - Description column: commit message. Long messages are truncated, the
 *     overflow is shown as a faded "co-authored" suffix when applicable.
 *
 * A "WIP" row is rendered at the top when there are modified files in the
 * working tree, mimicking how GitKraken shows the staging state.
 */

import { useMemo } from 'react';
import type { Commit, GitFile } from '@/lib/git-store';
import { Monitor, Cloud, Tag as TagIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const LANE_W = 18;
const ROW_H = 36;
const DOT_R = 9;       // bigger now: holds the author initial
const PADDING_LEFT = 12;

// Lane colors from "The Compiled Soul" palette
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

// Generate a stable hash → color for author avatar tinting
const AVATAR_COLORS = ['#a3f185', '#5ed8ff', '#fd9d1a', '#ff716c', '#68b24f', '#39bce2'];
function colorForAuthor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

interface GraphRow {
  commit: Commit;
  lane: number;
  laneColor: string;
  connections: Array<{ fromLane: number; toLane: number; toRow: number; color: string }>;
  activeLanes: Array<{ lane: number; color: string }>;
}

function computeGraph(commits: Commit[]): { rows: GraphRow[]; totalLanes: number } {
  const lanes: (string | null)[] = [];
  const laneColors: string[] = [];
  const commitIndex = new Map<string, number>();
  commits.forEach((c, i) => commitIndex.set(c.hash, i));

  const rows: GraphRow[] = [];
  let nextColorIdx = 0;

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    let lane = lanes.indexOf(commit.hash);
    let laneColor: string;

    if (lane === -1) {
      lane = lanes.findIndex((s) => s === null);
      if (lane === -1) lane = lanes.length;
      laneColor = LANE_COLORS[nextColorIdx++ % LANE_COLORS.length];
      lanes[lane] = commit.hash;
      laneColors[lane] = laneColor;
    } else {
      laneColor = laneColors[lane];
    }

    const activeLanes = lanes
      .map((sha, l) => (sha !== null && sha !== commit.hash ? { lane: l, color: laneColors[l] } : null))
      .filter((x): x is { lane: number; color: string } => x !== null);

    lanes[lane] = null;

    const connections: GraphRow['connections'] = [];
    for (let p = 0; p < commit.parents.length; p++) {
      const parent = commit.parents[p];
      const parentIdx = commitIndex.get(parent);
      if (parentIdx === undefined) continue;

      let parentLane = lanes.indexOf(parent);
      if (parentLane === -1) {
        if (p === 0) {
          parentLane = lane;
          lanes[parentLane] = parent;
          laneColors[parentLane] = laneColor;
        } else {
          parentLane = lanes.findIndex((s) => s === null);
          if (parentLane === -1) parentLane = lanes.length;
          lanes[parentLane] = parent;
          laneColors[parentLane] = LANE_COLORS[nextColorIdx++ % LANE_COLORS.length];
        }
      }

      connections.push({ fromLane: lane, toLane: parentLane, toRow: parentIdx, color: laneColors[parentLane] });
    }

    rows.push({ commit, lane, laneColor, connections, activeLanes });
  }

  const totalLanes = Math.max(
    ...rows.map((r) =>
      Math.max(r.lane, ...r.connections.map((c) => Math.max(c.fromLane, c.toLane))) + 1,
    ),
    1,
  );

  return { rows, totalLanes };
}

// ───────────────────── Ref parsing ─────────────────────

interface ParsedRef {
  raw: string;
  name: string;
  type: 'local' | 'remote' | 'tag' | 'stash';
  isCurrent: boolean;
}

function parseRefs(refs: string[] | undefined, currentBranch?: string): ParsedRef[] {
  if (!refs || refs.length === 0) return [];
  return refs.map((raw) => {
    if (raw.startsWith('tag: ')) {
      return { raw, name: raw.slice(5), type: 'tag' as const, isCurrent: false };
    }
    if (raw === 'refs/stash' || raw.startsWith('refs/stash')) {
      return { raw, name: 'stash', type: 'stash' as const, isCurrent: false };
    }
    if (raw.includes('/')) {
      return { raw, name: raw, type: 'remote' as const, isCurrent: false };
    }
    return { raw, name: raw, type: 'local' as const, isCurrent: raw === currentBranch };
  });
}

// ───────────────────── Components ─────────────────────

export function CommitGraph({
  commits,
  selectedHash,
  currentBranch,
  workingTreeFiles,
  onSelect,
  onContextMenu,
}: {
  commits: Commit[];
  selectedHash?: string;
  currentBranch?: string;
  workingTreeFiles?: GitFile[];
  onSelect: (commit: Commit) => void;
  onContextMenu: (e: React.MouseEvent, commit: Commit) => void;
}) {
  const { rows, totalLanes } = useMemo(() => computeGraph(commits), [commits]);
  const graphWidth = PADDING_LEFT + Math.max(totalLanes, 1) * LANE_W + 8;

  const stagedCount = workingTreeFiles?.filter((f) => f.staged).length ?? 0;
  const unstagedCount = workingTreeFiles?.filter((f) => !f.staged).length ?? 0;
  const hasWIP = stagedCount + unstagedCount > 0;

  // Color of the current branch's lane (for the WIP dashed dot)
  const currentBranchLaneColor = useMemo(() => {
    if (!currentBranch) return '#a3f185';
    const headRow = rows.find((r) =>
      r.commit.refs?.some((ref) => !ref.startsWith('tag:') && !ref.includes('/') && ref === currentBranch),
    );
    return headRow?.laneColor ?? '#a3f185';
  }, [rows, currentBranch]);

  if (commits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#9eacc0] text-sm">
        Sin commits
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {hasWIP && (
        <WIPRow
          stagedCount={stagedCount}
          unstagedCount={unstagedCount}
          graphWidth={graphWidth}
          laneColor={currentBranchLaneColor}
        />
      )}

      {rows.map((row, i) => (
        <GraphRowView
          key={row.commit.hash}
          row={row}
          index={i}
          graphWidth={graphWidth}
          selected={selectedHash === row.commit.hash}
          currentBranch={currentBranch}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}

function GraphRowView({
  row, index, graphWidth, selected, currentBranch, onSelect, onContextMenu,
}: {
  row: GraphRow;
  index: number;
  graphWidth: number;
  selected: boolean;
  currentBranch?: string;
  onSelect: (c: Commit) => void;
  onContextMenu: (e: React.MouseEvent, c: Commit) => void;
}) {
  const refs = parseRefs(row.commit.refs, currentBranch);
  const isFirst = index === 0;

  // Co-author suffix (e.g., "Co-Authored-By: ...") shown faded if present
  const coauthorIdx = row.commit.message.search(/Co-Authored-By:/i);
  const mainMessage = coauthorIdx > 0
    ? row.commit.message.slice(0, coauthorIdx).trim()
    : row.commit.message;
  const hasCoauthor = coauthorIdx >= 0;

  const authorColor = colorForAuthor(row.commit.authorName);

  return (
    <div
      onClick={() => onSelect(row.commit)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, row.commit); }}
      className={cn(
        'flex items-center cursor-pointer group relative',
        selected ? 'bg-[#a3f185]/10' : 'hover:bg-[#0d2134]',
      )}
      style={{ height: ROW_H }}
    >
      {selected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#a3f185]" />}

      {/* ── Column 1: BRANCH / TAG labels ── */}
      <div className="w-[220px] shrink-0 flex items-center justify-end gap-1 pr-2 overflow-hidden">
        {refs.map((ref, ri) => <RefChip key={ri} ref={ref} laneColor={row.laneColor} />)}
      </div>

      {/* ── Column 2: SVG graph lanes ── */}
      <svg width={graphWidth} height={ROW_H} className="shrink-0" style={{ overflow: 'visible' }}>
        {/* Pass-through lanes (not the commit's own lane) */}
        {row.activeLanes.map(({ lane, color }) => (
          <line
            key={`pt-${lane}`}
            x1={PADDING_LEFT + lane * LANE_W}
            y1={0}
            x2={PADDING_LEFT + lane * LANE_W}
            y2={ROW_H}
            stroke={color}
            strokeWidth={2}
            opacity={0.5}
          />
        ))}

        {/* Top half of our own lane (skip on the very first row) */}
        {!isFirst && (
          <line
            x1={PADDING_LEFT + row.lane * LANE_W}
            y1={0}
            x2={PADDING_LEFT + row.lane * LANE_W}
            y2={ROW_H / 2 - DOT_R}
            stroke={row.laneColor}
            strokeWidth={2}
          />
        )}

        {/* Bottom-half connectors to each parent */}
        {row.connections.map((conn, ci) => {
          const x1 = PADDING_LEFT + conn.fromLane * LANE_W;
          const x2 = PADDING_LEFT + conn.toLane * LANE_W;
          const y1 = ROW_H / 2 + DOT_R - 1;
          const y2 = ROW_H;
          if (conn.fromLane === conn.toLane) {
            return <line key={ci} x1={x1} y1={y1} x2={x2} y2={y2} stroke={conn.color} strokeWidth={2} />;
          }
          const cy = y1 + (y2 - y1) * 0.6;
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

        {/* Author "avatar" dot — colored circle with initials inside */}
        <g>
          <circle
            cx={PADDING_LEFT + row.lane * LANE_W}
            cy={ROW_H / 2}
            r={DOT_R}
            fill="#020f1e"
            stroke={authorColor}
            strokeWidth={2}
          />
          <text
            x={PADDING_LEFT + row.lane * LANE_W}
            y={ROW_H / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="8"
            fontWeight="700"
            fill={authorColor}
            style={{ fontFamily: 'var(--font-sans), Inter, sans-serif' }}
          >
            {initials(row.commit.authorName)}
          </text>
        </g>
      </svg>

      {/* ── Column 3: Description + extras ── */}
      <div className="flex-1 min-w-0 flex items-center gap-3 pl-2 pr-3">
        <span className={cn('truncate text-sm', selected ? 'text-[#d9e7fc]' : 'text-[#d9e7fc] group-hover:text-[#d9e7fc]')}>
          {mainMessage}
        </span>
        {hasCoauthor && (
          <span className="text-xs text-[#697789] shrink-0 italic">Co-Authored…</span>
        )}
      </div>

      {/* ── Right meta: date · author · hash (smaller, secondary) ── */}
      <div className="flex items-center gap-3 text-[11px] font-mono shrink-0 pr-3 text-[#697789]">
        <span className="w-20 text-right truncate">{formatDate(row.commit.date)}</span>
        <span className="w-16 text-right">{row.commit.shortHash}</span>
      </div>
    </div>
  );
}

function RefChip({ ref, laneColor }: { ref: ParsedRef; laneColor: string }) {
  const Icon = ref.type === 'remote' ? Cloud : ref.type === 'tag' ? TagIcon : ref.type === 'stash' ? null : Monitor;

  const palette = ref.type === 'tag'
    ? { bg: '#fd9d1a/15', border: '#fd9d1a/40', text: '#fd9d1a' }
    : ref.type === 'remote'
    ? { bg: '#5ed8ff/10', border: '#5ed8ff/30', text: '#5ed8ff' }
    : ref.type === 'stash'
    ? { bg: '#9eacc0/15', border: '#9eacc0/30', text: '#9eacc0' }
    : ref.isCurrent
    ? { bg: '#a3f185/20', border: '#a3f185/50', text: '#a3f185' }
    : { bg: `${laneColor}1A`, border: `${laneColor}55`, text: laneColor };

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap max-w-[150px]"
      style={{
        backgroundColor: ref.type === 'tag' ? 'rgba(253,157,26,0.15)'
          : ref.type === 'remote' ? 'rgba(94,216,255,0.10)'
          : ref.type === 'stash' ? 'rgba(158,172,192,0.15)'
          : ref.isCurrent ? 'rgba(163,241,133,0.20)'
          : `${laneColor}1F`,
        borderColor: ref.type === 'tag' ? 'rgba(253,157,26,0.40)'
          : ref.type === 'remote' ? 'rgba(94,216,255,0.30)'
          : ref.type === 'stash' ? 'rgba(158,172,192,0.30)'
          : ref.isCurrent ? 'rgba(163,241,133,0.50)'
          : `${laneColor}55`,
        color: ref.type === 'tag' ? '#fd9d1a'
          : ref.type === 'remote' ? '#5ed8ff'
          : ref.type === 'stash' ? '#9eacc0'
          : ref.isCurrent ? '#a3f185'
          : laneColor,
      }}
      title={ref.raw}
    >
      {ref.isCurrent && <Check size={10} strokeWidth={3} />}
      {Icon && !ref.isCurrent && <Icon size={10} />}
      <span className="truncate">{ref.name}</span>
    </span>
  );
}

function WIPRow({
  stagedCount, unstagedCount, graphWidth, laneColor,
}: { stagedCount: number; unstagedCount: number; graphWidth: number; laneColor: string }) {
  return (
    <div
      className="flex items-center relative bg-[#a3f185]/5 border-l-2 border-[#a3f185]/40"
      style={{ height: ROW_H }}
      title={`${unstagedCount} unstaged · ${stagedCount} staged`}
    >
      <div className="w-[220px] shrink-0 flex items-center justify-end pr-2">
        {stagedCount > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#a3f185]/50 bg-[#a3f185]/20 text-[#a3f185] text-[10px] font-medium">
            + {stagedCount}
          </span>
        )}
      </div>

      <svg width={graphWidth} height={ROW_H} className="shrink-0" style={{ overflow: 'visible' }}>
        {/* Dashed vertical line going down into the head commit */}
        <line
          x1={PADDING_LEFT}
          y1={ROW_H / 2}
          x2={PADDING_LEFT}
          y2={ROW_H}
          stroke={laneColor}
          strokeWidth={2}
          strokeDasharray="3 3"
          opacity={0.6}
        />
        {/* Dashed circle representing pending changes */}
        <circle
          cx={PADDING_LEFT}
          cy={ROW_H / 2}
          r={DOT_R - 1}
          fill="none"
          stroke={laneColor}
          strokeWidth={2}
          strokeDasharray="2 2"
          opacity={0.8}
        />
      </svg>

      <div className="flex-1 min-w-0 flex items-center gap-2 pl-2">
        <span className="text-sm text-[#a3f185] font-mono">// WIP</span>
        <span className="text-xs text-[#9eacc0]">
          {unstagedCount > 0 && `${unstagedCount} sin stagear`}
          {unstagedCount > 0 && stagedCount > 0 && ' · '}
          {stagedCount > 0 && `${stagedCount} listos para commitear`}
        </span>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
