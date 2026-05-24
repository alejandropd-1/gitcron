'use client';

/**
 * CommitGraph — GitKraken-style commit graph.
 *
 * Layout: [BRANCH/TAG 260px] [GRAPH SVG] [DESCRIPTION]
 *
 * Key design decisions:
 * - Colors are STABLE per branch name: "main" always gets its specific color,
 *   "feature/x" always gets another. Derived from a hash of the branch name.
 * - Current branch always gets #a3f185 (neon green).
 * - Remote branches of the same name share color with their local counterpart.
 * - Fallback to sequential lane colors when no branch name is available.
 */

import { useMemo } from 'react';
import type { Commit, GitFile } from '@/lib/git-store';
import { Monitor, Cloud, Tag as TagIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const LANE_W = 18;
const ROW_H = 36;
const DOT_R = 9;
const PADDING_LEFT = 10;

export interface CommitGraphColumnWidths {
  refs: number;
  graph: number;
  date: number;
  hash: number;
}

const DEFAULT_COLUMN_WIDTHS: CommitGraphColumnWidths = {
  refs: 260,
  graph: 88,
  date: 80,
  hash: 64,
};

// Ordered palette — used both for branch hashing and fallback lane colors
export const BRANCH_PALETTE = [
  'var(--color-graph-branch-1)',
  'var(--color-graph-branch-2)',
  'var(--color-graph-branch-3)',
  'var(--color-graph-branch-4)',
  'var(--color-graph-branch-5)',
  'var(--color-graph-branch-6)',
  'var(--color-graph-branch-7)',
  'var(--color-graph-branch-8)',
  'var(--color-graph-branch-9)',
  'var(--color-graph-branch-10)',
  'var(--color-graph-branch-11)',
  'var(--color-graph-branch-12)',
];

// Current branch always gets the primary neon green
export const CURRENT_BRANCH_COLOR = 'var(--color-secondary)';

/**
 * Stable color for a branch/ref name.
 * Same name → always same color, regardless of repo or session.
 */
export function colorForBranch(refName: string, currentBranch?: string): string {
  // Strip remote prefix to match local ↔ remote: "origin/main" == "main"
  const clean = refName
    .replace(/^refs\/heads\//, '')
    .replace(/^refs\/remotes\/[^/]+\//, '')
    .replace(/^HEAD$/, '');

  if (clean === currentBranch || refName === currentBranch) return CURRENT_BRANCH_COLOR;

  // Stable hash of the cleaned name
  let hash = 5381;
  for (let i = 0; i < clean.length; i++) hash = ((hash << 5) + hash + clean.charCodeAt(i)) | 0;
  return BRANCH_PALETTE[Math.abs(hash) % BRANCH_PALETTE.length];
}

/**
 * Given a commit, pick the "preferred" color by looking at its refs.
 * Priority: local branch > remote branch > tag (skip) > null
 */
export function preferredColorForCommit(commit: Commit, currentBranch?: string): string | null {
  if (!commit.refs || commit.refs.length === 0) return null;

  // Skip tags and stashes
  const branchRefs = commit.refs.filter(
    (r) => !r.startsWith('tag: ') && !r.includes('stash'),
  );
  if (branchRefs.length === 0) return null;

  // Prefer local branches over remotes
  const localRef = branchRefs.find((r) => !r.includes('/'));
  const chosen = localRef ?? branchRefs[0];
  return colorForBranch(chosen, currentBranch);
}

export function initials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

// ───────────────────── Graph algorithm ─────────────────────

export interface GraphRow {
  commit: Commit;
  lane: number;
  laneColor: string;
  connections: Array<{ fromLane: number; toLane: number; toRow: number; color: string }>;
  activeLanes: Array<{ lane: number; color: string }>;
}

export function computeGraph(commits: Commit[], currentBranch?: string): { rows: GraphRow[]; totalLanes: number } {
  const lanes: (string | null)[] = [];
  const laneColors: string[] = [];
  const commitIndex = new Map<string, number>();
  commits.forEach((c, i) => commitIndex.set(c.hash, i));

  const rows: GraphRow[] = [];
  let nextFallbackIdx = 0; // index into BRANCH_PALETTE for commits with no known ref

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    let lane = lanes.indexOf(commit.hash);
    let laneColor: string;

    if (lane === -1) {
      // New lane needed — prefer a free slot, otherwise extend
      lane = lanes.findIndex((s) => s === null);
      if (lane === -1) lane = lanes.length;

      // Prefer branch-derived stable color; fall back to sequential
      laneColor =
        preferredColorForCommit(commit, currentBranch) ??
        BRANCH_PALETTE[nextFallbackIdx++ % BRANCH_PALETTE.length];

      lanes[lane] = commit.hash;
      laneColors[lane] = laneColor;
    } else {
      laneColor = laneColors[lane];
      // If this commit has a named branch ref, upgrade the lane color
      const preferred = preferredColorForCommit(commit, currentBranch);
      if (preferred) {
        laneColor = preferred;
        laneColors[lane] = preferred;
      }
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
          // First parent inherits our lane and color
          parentLane = lane;
          lanes[parentLane] = parent;
          laneColors[parentLane] = laneColor;
        } else {
          // Additional parent (merge) → new lane
          parentLane = lanes.findIndex((s) => s === null);
          if (parentLane === -1) parentLane = lanes.length;
          lanes[parentLane] = parent;
          // Color from the parent commit's refs if available
          const parentCommit = commits[parentIdx];
          laneColors[parentLane] =
            preferredColorForCommit(parentCommit, currentBranch) ??
            BRANCH_PALETTE[nextFallbackIdx++ % BRANCH_PALETTE.length];
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
  color: string;
}

function parseRefs(refs: string[] | undefined, currentBranch?: string): ParsedRef[] {
  if (!refs || refs.length === 0) return [];
  return refs.map((raw) => {
    if (raw.startsWith('tag: ')) {
      return { raw, name: raw.slice(5), type: 'tag' as const, isCurrent: false, color: '#fd9d1a' };
    }
    if (raw === 'refs/stash' || raw.startsWith('refs/stash')) {
      return { raw, name: 'stash', type: 'stash' as const, isCurrent: false, color: '#9eacc0' };
    }
    if (raw.includes('/')) {
      const color = colorForBranch(raw, currentBranch);
      return { raw, name: raw, type: 'remote' as const, isCurrent: false, color };
    }
    const isCurrent = raw === currentBranch;
    return { raw, name: raw, type: 'local' as const, isCurrent, color: colorForBranch(raw, currentBranch) };
  });
}

// ───────────────────── Components ─────────────────────

export function CommitGraph({
  commits,
  selectedHash,
  currentBranch,
  workingTreeFiles,
  filterText,
  columnWidths = DEFAULT_COLUMN_WIDTHS,
  onSelect,
  onContextMenu,
}: {
  commits: Commit[];
  selectedHash?: string;
  currentBranch?: string;
  workingTreeFiles?: GitFile[];
  filterText?: string;
  columnWidths?: CommitGraphColumnWidths;
  onSelect: (commit: Commit) => void;
  onContextMenu: (e: React.MouseEvent, commit: Commit) => void;
}) {
  const filter = filterText?.trim().toLowerCase() ?? '';
  const filteredCommits = useMemo(() => {
    if (!filter) return commits;
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(filter) ||
        c.shortHash.toLowerCase().startsWith(filter) ||
        c.hash.toLowerCase().startsWith(filter) ||
        c.authorName.toLowerCase().includes(filter) ||
        c.authorEmail.toLowerCase().includes(filter),
    );
  }, [commits, filter]);

  const { rows, totalLanes } = useMemo(
    () => computeGraph(filteredCommits, currentBranch),
    [filteredCommits, currentBranch],
  );
  const graphWidth = PADDING_LEFT + Math.max(totalLanes, 1) * LANE_W + 8;
  const graphColumnWidth = Math.max(columnWidths.graph, graphWidth);

  const stagedCount = workingTreeFiles?.filter((f) => f.staged).length ?? 0;
  const unstagedCount = workingTreeFiles?.filter((f) => !f.staged).length ?? 0;
  const hasWIP = stagedCount + unstagedCount > 0;

  const currentBranchLaneColor = useMemo(() => {
    if (!currentBranch) return CURRENT_BRANCH_COLOR;
    const headRow = rows.find((r) =>
      r.commit.refs?.some((ref) => !ref.startsWith('tag:') && !ref.includes('/') && ref === currentBranch),
    );
    return headRow?.laneColor ?? CURRENT_BRANCH_COLOR;
  }, [rows, currentBranch]);

  if (commits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary text-ui-body">
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
          graphColumnWidth={graphColumnWidth}
          columnWidths={columnWidths}
          laneColor={currentBranchLaneColor}
        />
      )}
      {rows.map((row, i) => (
        <GraphRowView
          key={row.commit.hash}
          row={row}
          index={i}
          graphWidth={graphWidth}
          graphColumnWidth={graphColumnWidth}
          columnWidths={columnWidths}
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
  row, index, graphWidth, graphColumnWidth, columnWidths, selected, currentBranch, onSelect, onContextMenu,
}: {
  row: GraphRow;
  index: number;
  graphWidth: number;
  graphColumnWidth: number;
  columnWidths: CommitGraphColumnWidths;
  selected: boolean;
  currentBranch?: string;
  onSelect: (c: Commit) => void;
  onContextMenu: (e: React.MouseEvent, c: Commit) => void;
}) {
  const refs = parseRefs(row.commit.refs, currentBranch);
  const isFirst = index === 0;

  const coauthorIdx = row.commit.message.search(/Co-Authored-By:/i);
  const mainMessage = coauthorIdx > 0
    ? row.commit.message.slice(0, coauthorIdx).trim()
    : row.commit.message;
  const hasCoauthor = coauthorIdx >= 0;

  return (
    <div
      onClick={() => onSelect(row.commit)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, row.commit); }}
      className={cn(
        'flex items-center cursor-pointer group relative',
        selected ? 'bg-secondary/10' : 'hover:bg-bg-surface/50',
      )}
      style={{ height: ROW_H }}
    >
      {selected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />}

      {/* ── Column 1: BRANCH / TAG labels — 260px ── */}
      <div
        className="shrink-0 flex items-center justify-end gap-1 pl-3 pr-3 overflow-hidden"
        style={{ width: columnWidths.refs }}
      >
        {refs.slice(0, 3).map((ref, ri) => <RefChip key={ri} gitRef={ref} />)}
        {refs.length > 3 && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium shrink-0 whitespace-nowrap bg-text-secondary/20 border-text-secondary/25 text-text-secondary"
            title={refs.slice(3).map((r) => r.raw).join(', ')}
          >
            +{refs.length - 3}
          </span>
        )}
      </div>

      {/* ── Column 2: SVG graph lanes ── */}
      <div className="shrink-0 overflow-hidden relative" style={{ width: graphColumnWidth }}>
        <div
          className="absolute top-1 bottom-1 pointer-events-none"
          style={{
            left: PADDING_LEFT + row.lane * LANE_W,
            right: 0,
            backgroundColor: row.laneColor.startsWith('var(')
              ? `color-mix(in srgb, ${row.laneColor} 9.4%, transparent)`
              : `${row.laneColor}18`,
            borderRight: `2px solid ${row.laneColor}`,
            opacity: selected ? 0.6 : 0.42,
          }}
        />
      <svg width={graphWidth} height={ROW_H} className="block relative z-10" style={{ overflow: 'visible' }} data-keep-color>
        {/* Pass-through lanes */}
        {row.activeLanes.map(({ lane, color }) => (
          <line
            key={`pt-${lane}`}
            x1={PADDING_LEFT + lane * LANE_W}
            y1={0}
            x2={PADDING_LEFT + lane * LANE_W}
            y2={ROW_H}
            stroke={color}
            strokeWidth={2}
            opacity={0.55}
          />
        ))}

        {/* Top half of our lane */}
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

        {/* Connectors to parents */}
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

        {/* Commit dot — colored by lane (= branch), initials in center */}
        <circle
          cx={PADDING_LEFT + row.lane * LANE_W}
          cy={ROW_H / 2}
          r={DOT_R}
          fill="#020f1e"
          stroke={row.laneColor}
          strokeWidth={2.5}
        />
        <text
          x={PADDING_LEFT + row.lane * LANE_W}
          y={ROW_H / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="7.5"
          fontWeight="700"
          fill={row.laneColor}
          style={{ fontFamily: 'var(--font-sans), Inter, sans-serif' }}
        >
          {initials(row.commit.authorName)}
        </text>
      </svg>
      </div>

      {/* ── Column 3: Description ── */}
      <div className="flex-1 min-w-0 flex items-center gap-3 pl-4 pr-3">
        <span className={cn('truncate text-sm select-text', selected ? 'text-[#d9e7fc]' : 'text-[#d9e7fc] group-hover:text-[#d9e7fc]')}>
          {mainMessage}
        </span>
        {hasCoauthor && (
          <span className="text-xs text-[#697789] shrink-0 italic">Co-Authored…</span>
        )}
      </div>

      {/* ── Right meta ── */}
      <div className="flex items-center text-[11px] font-mono shrink-0 pr-3 text-[#697789]">
        <span className="text-right truncate" style={{ width: columnWidths.date }}>{formatDate(row.commit.date)}</span>
        <span
          className={cn('text-right select-text', selected ? 'text-[#a3f185]' : '')}
          style={{
            width: columnWidths.hash,
            ...(!selected ? { color: row.laneColor, opacity: 0.8 } : undefined),
          }}
        >
          {row.commit.shortHash}
        </span>
      </div>
    </div>
  );
}

function RefChip({ gitRef }: { gitRef: ParsedRef }) {
  const Icon = gitRef.type === 'remote' ? Cloud : gitRef.type === 'tag' ? TagIcon : gitRef.type === 'stash' ? null : Monitor;

  const hex = gitRef.color;
  const isCurrent = gitRef.isCurrent;

  const chipStyle = hex.startsWith('var(')
    ? {
        backgroundColor: `color-mix(in srgb, ${hex} ${isCurrent ? '20%' : '10%'}, transparent)`,
        borderColor: `color-mix(in srgb, ${hex} ${isCurrent ? '50%' : '25%'}, transparent)`,
        color: hex,
      }
    : {
        backgroundColor: `${hex}${isCurrent ? '33' : '1A'}`,
        borderColor: `${hex}${isCurrent ? '80' : '44'}`,
        color: hex,
      };

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap max-w-[120px] overflow-hidden"
      style={chipStyle}
      title={gitRef.raw}
    >
      {gitRef.isCurrent && <Check size={10} strokeWidth={3} className="shrink-0" />}
      {Icon && !gitRef.isCurrent && <Icon size={10} className="shrink-0" />}
      <span className="truncate min-w-0 select-text">{gitRef.name}</span>
    </span>
  );
}

function WIPRow({
  stagedCount, unstagedCount, graphWidth, graphColumnWidth, columnWidths, laneColor,
}: {
  stagedCount: number;
  unstagedCount: number;
  graphWidth: number;
  graphColumnWidth: number;
  columnWidths: CommitGraphColumnWidths;
  laneColor: string;
}) {
  return (
    <div
      className="flex items-center relative bg-git-add/5 border-l-2 border-git-add/40"
      style={{ height: ROW_H }}
    >
      <div className="shrink-0 flex items-center justify-end pr-3" style={{ width: columnWidths.refs }}>
        {stagedCount > 0 && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium bg-git-add/20 border-git-add/50 text-git-add"
          >
            + {stagedCount}
          </span>
        )}
      </div>

      <div className="shrink-0 overflow-visible" style={{ width: graphColumnWidth }}>
        <svg width={graphWidth} height={ROW_H} className="block" style={{ overflow: 'visible' }} data-keep-color>
          <line
            x1={PADDING_LEFT} y1={ROW_H / 2} x2={PADDING_LEFT} y2={ROW_H}
            stroke={laneColor} strokeWidth={2} strokeDasharray="3 3" opacity={0.6}
          />
          <circle
            cx={PADDING_LEFT} cy={ROW_H / 2} r={DOT_R - 1}
            fill="none" stroke={laneColor} strokeWidth={2} strokeDasharray="2 2" opacity={0.8}
          />
        </svg>
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-2 pl-2">
        <span className="text-sm text-git-add font-mono">{"// WIP"}</span>
        <span className="text-xs text-text-secondary">
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
