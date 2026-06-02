'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGitStore, type Commit } from '@/lib/git-store';
import {
  mapLaneToBranchIndex,
  projectCommit,
  branchToOffset,
  type ProjectionConfig,
  DEFAULT_CHRONOMETRIC_SLOPE,
  labelSideFromBranchIndex,
} from '@/lib/chronometric-projection';
import {
  screenToWorld,
  worldToScreen,
} from '@/lib/canvas-viewport';
import { useCanvasViewport } from '@/hooks/use-canvas-viewport';
import {
  computeGraph,
  initials,
} from './CommitGraph';
import { SpeculativeBranches } from './SpeculativeBranches';
import {
  projectSpeculative,
  type SpeculativeBranch,
} from '@/lib/speculative-projection';
import {
  openingTurnFromBranch,
  type SpeculativeDialogue,
  type MaterializeIdeaInput,
  type MaterializationResult,
  type TemporalAgentDecision,
  type DecisionOutcome,
  type TemporalAgentNotes,
} from '@/types/temporal-agent';
import { buildMaterializationPlan } from '@/lib/materialize-idea';
import { cn } from '@/lib/utils';
import { useT, tNow } from '@/hooks/use-translation';
import { CopyButton } from './TemporalAgentSettings';
import { Calendar, GitCommit, ZoomIn, ZoomOut, RotateCcw, Activity, Layers, Compass, Crosshair } from 'lucide-react';

const OUTCOME_COLOR: Record<string, string> = {
  accepted: '#a3f185',
  rejected: '#dc6a6a',
  deferred: '#fd9d1a',
};

function formatDecisionDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return tNow('graph.justNow');
  if (diffMins < 60) return tNow('graph.minutesAgo', { n: diffMins });
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return tNow('graph.hoursAgo', { n: diffHours });
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return tNow('graph.daysAgo', { n: diffDays });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

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
  /** AI-predicted future branches to overlay (Feature B). Empty/undefined = none. */
  speculativeBranches?: SpeculativeBranch[];
  /** Toggle the speculative overlay without losing the predictions. */
  showSpeculative?: boolean;
  /** Callback to toggle speculative branch visibility from within the component. */
  onToggleSpeculative?: () => void;
  /** Optional click handler for a speculative branch (e.g. open accept/reject). */
  onSelectSpeculative?: (id: string) => void;
  /** Pixels reserved by the left floating panel (sidebar). HUD panels shift right by this amount. */
  hudLeft?: number;
  /** Pixels reserved by the right floating panel (details). HUD panels shift left by this amount. */
  hudRight?: number;
  /** Optional array of existing local branches for materialization plan deduplication. */
  localBranches?: string[];
}

export function ChronometricGraph({
  commits,
  selectedHash,
  currentBranch,
  filterText = '',
  onSelect,
  onContextMenu,
  speculativeBranches = [],
  showSpeculative = false,
  onToggleSpeculative,
  onSelectSpeculative,
  hudLeft = 0,
  hudRight = 0,
  localBranches,
}: ChronometricGraphProps) {
  const t = useT();
  const stashes = useGitStore((state) => state.stashes);
  const appFontSize = useGitStore((state) => state.fontSize);
  // Scale factor for all SVG text in this graph, driven by the global text-size setting (gear → "Tamaño de texto").
  // The hardcoded SVG fontSize values were tuned for "compact"; "normal" and "large" upscale proportionally.
  const textScale = appFontSize === 'large' ? 1.36 : appFontSize === 'normal' ? 1.18 : 1.0;
  const fs = (base: number) => +(base * textScale).toFixed(2);
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

  // Stable map of commitHash -> branchName (propagated along lanes to cover all commits on a branch)
  const commitBranchNames = useMemo(() => {
    const map = new Map<string, string>();
    const laneBranchNames: (string | null)[] = [];

    // Index the commits by hash for parent lookup
    const commitIndex = new Map<string, number>();
    filteredCommits.forEach((c, idx) => commitIndex.set(c.hash, idx));

    const lanes: (string | null)[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const commit = row.commit;

      // Find the lane for this commit
      let lane = lanes.indexOf(commit.hash);
      if (lane === -1) {
        lane = lanes.findIndex((s) => s === null);
        if (lane === -1) lane = lanes.length;
        lanes[lane] = commit.hash;
      }

      // Determine the branch name for this commit
      let branchName = getBranchName(commit);
      if (branchName) {
        laneBranchNames[lane] = branchName;
      } else {
        branchName = laneBranchNames[lane] || null;
      }

      if (branchName) {
        map.set(commit.hash, branchName);
      }

      // Clean up the lane for this commit
      lanes[lane] = null;
      const currentLaneBranchName = laneBranchNames[lane];
      laneBranchNames[lane] = null;

      // Propagate to parents
      for (let p = 0; p < commit.parents.length; p++) {
        const parent = commit.parents[p];
        const parentIdx = commitIndex.get(parent);
        if (parentIdx === undefined) continue;

        let parentLane = lanes.indexOf(parent);
        if (parentLane === -1) {
          if (p === 0) {
            parentLane = lane;
            lanes[parentLane] = parent;
            // Propagate branch name to the first parent
            laneBranchNames[parentLane] = branchName || currentLaneBranchName;
          } else {
            parentLane = lanes.findIndex((s) => s === null);
            if (parentLane === -1) parentLane = lanes.length;
            lanes[parentLane] = parent;
            // Additional parents are merges; they will resolve their own branch names
            laneBranchNames[parentLane] = null;
          }
        }
      }
    }

    return map;
  }, [rows, filteredCommits]);

  // Stable map of branchName -> representativeBranchIndex (non-zero visual divergence index of the branch).
  // This solves the "lane jumping" issue in computeGraph where a branch's commits jump between lane 0 and a side lane.
  // By assigning the same visual divergence side to all commits of the same branch, their labels always align
  // on the physical side that the branch visually diverges to.
  const branchRepresentativeIndices = useMemo(() => {
    const map = new Map<string, number>();

    rows.forEach((row) => {
      const branchName = commitBranchNames.get(row.commit.hash);
      if (branchName && branchName !== 'main' && branchName !== 'master') {
        const bIndex = mapLaneToBranchIndex(row.lane);
        if (bIndex !== 0 && !map.has(branchName)) {
          map.set(branchName, bIndex);
        }
      }
    });

    return map;
  }, [rows, commitBranchNames]);

  // Map of branchName -> parent branchName (the lateral branch this branch was created from, if any).
  // Used to derive a virtual representative index for nested branches whose commits live entirely on lane 0
  // (and thus never earned a non-zero physical representative). Such branches should mirror to the OPPOSITE
  // side of their parent branch so their labels don't collide with the parent's line.
  const branchParentBranch = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => {
      const branchName = commitBranchNames.get(row.commit.hash);
      if (!branchName || branchName === 'main' || branchName === 'master') return;
      if (map.has(branchName)) return;
      const isOrigin = !row.commit.parents.some(p => commitBranchNames.get(p) === branchName);
      if (!isOrigin) return;
      for (const parentHash of row.commit.parents) {
        const parentBranch = commitBranchNames.get(parentHash);
        if (parentBranch && parentBranch !== branchName) {
          map.set(branchName, parentBranch);
          break;
        }
      }
    });
    return map;
  }, [rows, commitBranchNames]);

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

      const branchName = commitBranchNames.get(row.commit.hash) || null;
      const isLateralBranch = branchName !== null && branchName !== 'main' && branchName !== 'master';

      // Check if it's the start of a branch segment (origin)
      const isBranchOrigin = !!(
        isLateralBranch &&
        !row.commit.parents.some(parentHash => commitBranchNames.get(parentHash) === branchName)
      );

      // Compute active branches at this commit's row (used by both the resolver and labelSide)
      const activeLanes = [row.lane, ...row.activeLanes.map(al => al.lane)];
      const activeBranchIndices = activeLanes.map(mapLaneToBranchIndex);

      // Hybrid branch index: use the physical branchIndex if it's lateral (non-zero)
      // to perfectly follow physical undulations/lane crossings on the screen.
      // Fall back to the branch's static representative index only if it temporarily jumps to the trunk (Lane 0)
      // to keep label placement stable.
      let resolvedBranchIndex = branchIndex;
      if (resolvedBranchIndex === 0 && branchName && branchName !== 'main' && branchName !== 'master') {
        if (branchRepresentativeIndices.has(branchName)) {
          resolvedBranchIndex = branchRepresentativeIndices.get(branchName)!;
        } else {
          // Direct-parent fallback: if the immediate parent branch has its own representative,
          // mirror its sign so labels escape the parent's visible line.
          const parentBranch = branchParentBranch.get(branchName);
          if (parentBranch && branchRepresentativeIndices.has(parentBranch)) {
            resolvedBranchIndex = -branchRepresentativeIndices.get(parentBranch)!;
          } else if (activeBranchIndices.some(x => x < 0)) {
            // Yield-to-bifurcation fallback: a *named* lateral that lives entirely on lane 0
            // (no own rep, no resolvable parent) is visually "squatting" on the trunk. When a
            // right-wing branch (-X) is locally active, that branch's labels naturally go right —
            // so this commit yields the right side and labels to the left instead, preventing
            // both from stacking on the same flank. Virtualize as +1 so labelSideFromBranchIndex
            // returns 'left' via the lateral-+1 path.
            resolvedBranchIndex = 1;
          }
        }
      }

      // El lado de la etiqueta se DERIVA de resolvedBranchIndex y el factor dinámico de las ramas activas:
      // Si hay bifurcación en este commit (múltiples ramas activas), se ordenan visualmente de izquierda a derecha
      // y se divide la pantalla en dos mitades (la mitad izquierda rotula a la izquierda, la derecha a la derecha).
      // Esto evita que las líneas conectoras del HUD se crucen de un lado a otro cuando hay bifurcaciones paralelas.
      const isLeft = labelSideFromBranchIndex(resolvedBranchIndex, activeBranchIndices) === 'left';

      return {
        ...row,
        chronologicalIndex,
        branchIndex,
        branchName,
        isBranchOrigin,
        isLeft,
        x: proj.x,
        y: proj.y,
        baseX: proj.baseX,
        baseY: proj.baseY,
        originalIndex: i, // index in the original rows array
      };
    });
  }, [rows, filteredCommits, config, commitBranchNames, branchRepresentativeIndices, branchParentBranch]);

  // Create a quick lookup map of commit hash -> projected node info
  const projectedLookup = useMemo(() => {
    const map = new Map<string, typeof projectedCommits[0]>();
    projectedCommits.forEach((p) => map.set(p.commit.hash, p));
    return map;
  }, [projectedCommits]);

  // Present (HEAD) anchor = the most recent projected commit (greatest x).
  // Speculative branches fork from here into the future.
  const speculativeNodes = useMemo(() => {
    if (!showSpeculative || speculativeBranches.length === 0 || projectedCommits.length === 0) {
      return [];
    }
    const head = projectedCommits.reduce((a, b) => (b.x > a.x ? b : a));
    return projectSpeculative(speculativeBranches, { x: head.x, y: head.y }, config);
  }, [showSpeculative, speculativeBranches, projectedCommits, config]);

  // Centauro panel (Phase 5b): clicking a speculative branch opens its dialogue.
  // The unit is a THREAD (SpeculativeDialogue.turns[]), not a loose string — today
  // it holds a single read-only agent turn; tomorrow user/agent turns append with
  // ZERO rewrite. No chat input yet (that's the conversation phase).
  const [selectedSpeculativeId, setSelectedSpeculativeId] = useState<string | null>(null);

  // Centauro panel — collapsible overlay in the bottom-center of the canvas.
  // Default collapsed (scanning bar); expands on click to show the thread.
  const centauroExpanded = useGitStore((state) => state.centauroExpanded);
  const setCentauroExpanded = useGitStore((state) => state.setCentauroExpanded);

  // Which tab is active inside the expanded Centauro panel.
  const [centauroTab, setCentauroTab] = useState<'report' | 'history'>('report');

  // Centauro panel resizable height (in px). Persisted in localStorage.
  const [centauroHeight, setCentauroHeight] = useState(320);
  const [isCentauroDragging, setIsCentauroDragging] = useState(false);
  const centauroDragRef = useRef<{
    startY: number;
    startH: number;
  } | null>(null);

  // Dynamic helper to find the top of the sidebars
  const getSidebarTop = useCallback(() => {
    if (typeof document === 'undefined') return 104;
    const el = document.querySelector('aside');
    if (el) {
      const rect = el.getBoundingClientRect();
      return rect.top;
    }
    return 104;
  }, []);

  // Dynamic helper to calculate the maximum allowed height for the centauro content block
  // so that the top edge of the HUD aligns perfectly with the top edge of the sidebars.
  const getMaxCentauroHeight = useCallback(() => {
    if (typeof document === 'undefined') return 320;
    
    // 1. Get bottom boundary of the graph container or viewport
    const containerEl = document.getElementById('chronometric-container');
    const containerBottom = containerEl ? containerEl.getBoundingClientRect().bottom : window.innerHeight;
    
    // 2. Get the top coordinate of the sidebars
    const sidebarTop = getSidebarTop();
    
    // 3. Get the height of the HUD toolbar (default to 41px if not yet rendered)
    const toolbarEl = document.querySelector('.hud-toolbar');
    const toolbarHeight = toolbarEl ? toolbarEl.getBoundingClientRect().height : 41;
    
    // 4. Calculate maximum height for the glassy block (centauroHeight)
    // Formula: maxH = containerBottom - 8 (bottom inset) - sidebarTop - toolbarHeight - 2 (borders)
    const maxH = containerBottom - 8 - sidebarTop - toolbarHeight - 2;
    
    return Math.max(120, maxH);
  }, [getSidebarTop]);

  // Hydrate height from localStorage on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gitcron:centauroHeightPx');
      if (saved) {
        const h = parseInt(saved, 10);
        const maxH = getMaxCentauroHeight();
        if (h >= 120 && h <= maxH) {
          setCentauroHeight(h);
        } else if (h > maxH) {
          setCentauroHeight(maxH);
        }
      }
    } catch { /* ignore corrupt value */ }
  }, [getMaxCentauroHeight]);

  const onCentauroResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsCentauroDragging(true);
    centauroDragRef.current = {
      startY: e.clientY,
      startH: centauroHeight,
    };
    const onMove = (ev: MouseEvent) => {
      if (!centauroDragRef.current) return;
      // Dragging UP (delta Y is startY - currentY) = taller
      const deltaPx = centauroDragRef.current.startY - ev.clientY;
      const targetH = centauroDragRef.current.startH + deltaPx;
      // Clamp against useful area
      const maxH = getMaxCentauroHeight();
      const newH = Math.max(120, Math.min(maxH, targetH));
      setCentauroHeight(newH);
      localStorage.setItem('gitcron:centauroHeightPx', String(newH));
    };
    const onUp = () => {
      setIsCentauroDragging(false);
      centauroDragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [centauroHeight, getMaxCentauroHeight]);

  // Capa 2a — per-branch decisions (accepted / rejected / deferred).
  // Keyed by branch message (title), which is the stable identity across sessions.
  const [decisions, setDecisions] = useState<Record<string, TemporalAgentDecision>>({});

  // Capa 2b — full decision history (all decisions from notes.json, newest first).
  const [allDecisions, setAllDecisions] = useState<TemporalAgentDecision[]>([]);

  // Rehydrate decisions from notes on mount / repo change, cross-referencing
  // with the current speculative branches by title.
  useEffect(() => {
    if (!repoPath || !repoName) return;
    let alive = true;
    window.api.temporalAgent.loadNotes(repoPath, repoName).then((notes) => {
      if (!alive || !notes?.decisions?.length) return;
      const map: Record<string, TemporalAgentDecision> = {};
      for (const d of notes.decisions) {
        if (!map[d.suggestionTitle]) {
          map[d.suggestionTitle] = d;
        }
      }
      setDecisions(map);
      setAllDecisions(notes.decisions);
    });
    return () => { alive = false; };
  }, [repoPath, repoName]);

  // Capa 2a — record a decision via the existing IPC, then update local state.
  // Clicking the same outcome again undoes it; clicking a different one changes it.
  async function recordBranchDecision(outcome: DecisionOutcome) {
    if (!selectedSpeculativeId || !repoPath || !repoName) return;
    const node = speculativeNodes.find((n) => n.branch.id === selectedSpeculativeId);
    if (!node) return;
    const b = node.branch;
    const current = decisions[b.message];

    // Undo: click the same outcome that's already active → remove the decision.
    if (current && current.outcome === outcome) {
      await window.api.temporalAgent.removeDecision(repoPath, repoName, b.message);
      setDecisions((prev) => {
        const next = { ...prev };
        delete next[b.message];
        return next;
      });
      return;
    }

    const decision: TemporalAgentDecision = {
      date: new Date().toISOString(),
      suggestionTitle: b.message,
      type: b.type,
      outcome,
      confidence: b.confidence,
      impact: outcome === 'accepted'
        ? `Accepted — ready for materialization evaluation.`
        : outcome === 'rejected'
        ? `Rejected — will be suppressed in future predictions.`
        : `Deferred — worth revisiting later.`,
    };
    await window.api.temporalAgent.recordDecision(repoPath, repoName, decision);
    setDecisions((prev) => ({ ...prev, [b.message]: decision }));
  }

  // Is any branch decided? Used to determine dimming.
  const hasAnyDecision = Object.keys(decisions).length > 0;

  // Decision for the currently selected speculative branch, if any.
  const selectedBranchDecision = useMemo(() => {
    if (!selectedSpeculativeId) return null;
    const node = speculativeNodes.find((n) => n.branch.id === selectedSpeculativeId);
    if (!node) return null;
    return decisions[node.branch.message] ?? null;
  }, [selectedSpeculativeId, speculativeNodes, decisions]);

  // Full branch object for the currently selected speculative branch.
  const selectedSpeculativeBranch = useMemo(() => {
    if (!selectedSpeculativeId) return null;
    const node = speculativeNodes.find((n) => n.branch.id === selectedSpeculativeId);
    return node?.branch ?? null;
  }, [selectedSpeculativeId, speculativeNodes]);

  // Extended reasoning text for the currently selected branch.
  const selectedBranchReasoning = useMemo(() => {
    return selectedSpeculativeBranch?.reasoning ?? null;
  }, [selectedSpeculativeBranch]);

  // Split reasoning text into paragraphs on double newlines, filtering empties.
  function renderReasoningParagraphs(text: string): string[] {
    return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  }

  const speculativeDialogue = useMemo<SpeculativeDialogue | null>(() => {
    if (!showSpeculative || !selectedSpeculativeId) return null;
    const node = speculativeNodes.find((n) => n.branch.id === selectedSpeculativeId);
    if (!node) return null;
    const b = node.branch;
    // openingTurnFromBranch wants a full branch (rationale required); the lib
    // branch keeps rationale optional, so default it before building the thread.
    return openingTurnFromBranch({
      id: b.id,
      message: b.message,
      rationale: b.rationale ?? '',
      type: b.type,
      confidence: b.confidence,
    });
  }, [showSpeculative, selectedSpeculativeId, speculativeNodes]);

  const handleSelectSpeculative = (id: string) => {
    // Restore height if switching branches or opening another branch while in preview
    if (materializeIdea && previousCentauroHeight !== null) {
      setCentauroHeight(previousCentauroHeight);
      localStorage.setItem('gitcron:centauroHeightPx', String(previousCentauroHeight));
      setPreviousCentauroHeight(null);
    }
    setSelectedSpeculativeId(id);
    setCentauroExpanded(true);
    setMaterializeIdea(null);
    setMaterializeResult(null);
    setMaterializeError(null);
    onSelectSpeculative?.(id);
  };

  // --- Materialization (Phase 6) — confirm BEFORE any Git write -------------
  // (repoPath / repoName are already read from the store above.)
  // The idea pending confirmation (null = no modal). Built from the selected branch.
  const [materializeIdea, setMaterializeIdea] = useState<MaterializeIdeaInput | null>(null);
  const [materializing, setMaterializing] = useState(false);
  const [materializeResult, setMaterializeResult] = useState<MaterializationResult | null>(null);
  const [materializeError, setMaterializeError] = useState<string | null>(null);
  const [previousCentauroHeight, setPreviousCentauroHeight] = useState<number | null>(null);

  const isTallMode = centauroHeight >= 480;

  // Automatically clamp height on window resize so HUD top never crosses sidebar top
  useEffect(() => {
    const handleResize = () => {
      const maxH = getMaxCentauroHeight();
      setCentauroHeight((prev) => Math.min(prev, maxH));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getMaxCentauroHeight]);

  // The exact plan the user is shown and confirms. Same builder main uses.
  const materializePlan = useMemo(
    () => (materializeIdea ? buildMaterializationPlan(materializeIdea, localBranches) : null),
    [materializeIdea, localBranches],
  );

  function openMaterializeConfirm() {
    if (!selectedSpeculativeId) return;
    const node = speculativeNodes.find((n) => n.branch.id === selectedSpeculativeId);
    if (!node) return;
    const b = node.branch;

    // Backup height and auto-expand to widescreen content height clamped below lateral panels
    setPreviousCentauroHeight(centauroHeight);
    const maxH = getMaxCentauroHeight();
    const targetH = Math.min(680, maxH);
    setCentauroHeight(targetH);
    localStorage.setItem('gitcron:centauroHeightPx', String(targetH));

    setMaterializeResult(null);
    setMaterializeError(null);
    setMaterializeIdea({
      id: b.id,
      title: b.message,
      rationale: b.rationale ?? '',
      type: b.type,
      confidence: b.confidence,
      reasoning: b.reasoning ?? '',
      agentPrompt: b.agentPrompt ?? '',
    });
  }

  function cancelMaterialize() {
    setMaterializeIdea(null);
    setMaterializeResult(null);
    setMaterializeError(null);
    if (previousCentauroHeight !== null) {
      setCentauroHeight(previousCentauroHeight);
      localStorage.setItem('gitcron:centauroHeightPx', String(previousCentauroHeight));
      setPreviousCentauroHeight(null);
    }
  }

  async function confirmMaterialize() {
    if (!materializeIdea || !repoPath) return;
    setMaterializing(true);
    setMaterializeError(null);
    try {
      const res = await window.api.materializeIdea(repoPath, materializeIdea);
      if (res.success && res.data) {
        setMaterializeResult(res.data);
        // Record the accepted decision so future predictions learn from it.
        await window.api.temporalAgent.recordDecision(repoPath, repoName ?? 'repo', {
          date: new Date().toISOString(),
          suggestionTitle: materializeIdea.title,
          type: materializeIdea.type,
          outcome: 'accepted',
          confidence: materializeIdea.confidence,
          impact: `Materialized as ${res.data.branchName} (${res.data.tagName}).`,
        });
      } else {
        setMaterializeError(res.error ?? 'Materialization failed');
      }
    } catch (e) {
      setMaterializeError(e instanceof Error ? e.message : String(e));
    } finally {
      setMaterializing(false);
    }
  }

  // Per-node perpendicular offsetDist to prevent same-side label overlap.
  // Each side is processed in the direction where increasing offset moves the
  // label AWAY from the previously placed neighbour:
  //  - LEFT  side: old → new, pushing newer labels further UP-LEFT
  //  - RIGHT side: new → old, pushing older labels further DOWN-RIGHT
  // Capped at MAX_OFFSET so labels never escape the visible area.
  const labelOffsets = useMemo(() => {
    // All clearance values scale with the global text-size setting so labels never collide
    // when the user picks "normal" or "large" from the gear menu.
    const MIN_CLEARANCE = 12 * textScale;
    // When either neighbor commit renders a branch badge, that badge protrudes above the comment
    // line (≈ 20px offset + 9px half-height ≈ 29px at scale 1) and needs an extra clearance
    // band so adjacent comments don't overlap it. Scales with text size.
    const BADGE_CLEARANCE_EXTRA = 30 * textScale;
    const BASE_OFFSET = 35;
    const MAX_OFFSET = 85 + 30 * (textScale - 1);

    const hasBadge = (node: typeof projectedCommits[number]) => {
      if (!node.branchName) return false;
      if (node.isBranchOrigin) return true;
      return !!node.commit.refs?.some(r => {
        if (!r || r.startsWith('tag: ')) return false;
        if (r === 'HEAD' || r === 'stash') return false;
        if (r.startsWith('refs/stash')) return false;
        return true;
      });
    };

    const _xStart = config.paddingLeft;
    const _yStart = height - config.paddingBottom;
    const _xEnd = width - config.paddingRight;
    const _yEnd = config.paddingTop;
    const _dx = _xEnd - _xStart;
    const _dy = _yEnd - _yStart;
    const _L = Math.sqrt(_dx * _dx + _dy * _dy) || 1;
    const _ny = -_dx / _L; // negative (LEFT label moves up as offset grows)
    const _ry = _dx / _L;  // positive (RIGHT label moves down as offset grows)

    const offsets = new Map<string, number>();
    const leftNodes = projectedCommits
      .filter((n) => n.isLeft)
      .sort((a, b) => a.chronologicalIndex - b.chronologicalIndex);
    const rightNodes = projectedCommits
      .filter((n) => !n.isLeft)
      .sort((a, b) => b.chronologicalIndex - a.chronologicalIndex);

    // LEFT side — push newer label upward when too close to previous (older) one
    let lastLeftY = NaN;
    let prevLeftHadBadge = false;
    for (const node of leftNodes) {
      const curHasBadge = hasBadge(node);
      const effectiveClearance = MIN_CLEARANCE + ((prevLeftHadBadge || curHasBadge) ? BADGE_CLEARANCE_EXTRA : 0);
      let offset = BASE_OFFSET;
      const naturalY = node.y + _ny * BASE_OFFSET;
      if (!isNaN(lastLeftY) && naturalY > lastLeftY - effectiveClearance) {
        const needed = (lastLeftY - effectiveClearance - node.y) / _ny;
        offset = Math.min(MAX_OFFSET, Math.max(BASE_OFFSET, needed));
      }
      offsets.set(node.commit.hash, offset);
      lastLeftY = node.y + _ny * offset;
      prevLeftHadBadge = curHasBadge;
    }

    // RIGHT side — push older label downward when too close to previous (newer) one
    let lastRightY = NaN;
    let prevRightHadBadge = false;
    for (const node of rightNodes) {
      const curHasBadge = hasBadge(node);
      const effectiveClearance = MIN_CLEARANCE + ((prevRightHadBadge || curHasBadge) ? BADGE_CLEARANCE_EXTRA : 0);
      let offset = BASE_OFFSET;
      const naturalY = node.y + _ry * BASE_OFFSET;
      if (!isNaN(lastRightY) && naturalY < lastRightY + effectiveClearance) {
        const needed = (lastRightY + effectiveClearance - node.y) / _ry;
        offset = Math.min(MAX_OFFSET, Math.max(BASE_OFFSET, needed));
      }
      offsets.set(node.commit.hash, offset);
      lastRightY = node.y + _ry * offset;
      prevRightHadBadge = curHasBadge;
    }

    return offsets;
  }, [projectedCommits, config, width, height, textScale]);

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
      const color = matchingNode?.laneColor || 'var(--color-border-subtle)';

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
      const isHead = headCommitNode && node.commit.hash === headCommitNode.commit.hash;

      tags.forEach((tagRaw, tagIndex) => {
        const tagName = tagRaw.slice(5);
        // Enforce a uniform perpendicular line length of exactly 35px for tags
        const distance = 35;

        // Base diagonal offset along (ux, uy) fanning out by index
        let diagOffset = tagIndex * 45 - 8;
        if (isHead) {
          // Offset HEAD tags by -50px along temporal diagonal to completely clear the telemetry stack
          diagOffset += -50;
        }

        const satX = node.x + nx * distance + ux * diagOffset;
        let satY = node.y + ny * distance + uy * diagOffset;

        // If it's a normal commit (not HEAD) and its comment is on the left wing,
        // shift only the bottom tag (tagIndex === 0) vertically down by 14px to place it cleanly below the comment.
        if (!isHead) {
          const nodeIsLeft = node.isLeft;
          if (nodeIsLeft && tagIndex === 0) {
            satY += 14;
          }
        }

        list.push({
          commitHash: node.commit.hash,
          tagName,
          x: node.x,
          y: node.y,
          satX,
          satY,
          color: 'var(--color-git-mod)',
        });
      });
    });

    return list;
  }, [projectedCommits, nx, ny, ux, uy, headCommitNode, currentBranch]);

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
        laneColor: 'var(--color-error)',
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
          laneColor: 'var(--color-text-secondary)',
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
    // Focus slightly down the diagonal so the active HEAD and last commits
    // slide gracefully into the upper-right quadrant of the viewport, showing more timeline history.
    initialWorldFocusX: width - 280,
    initialWorldFocusY: 100 + 180 * DEFAULT_CHRONOMETRIC_SLOPE,
    topSafeOffset: 96,
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



  // Calculate screen position for hover card
  const hoveredScreenPos = useMemo(() => {
    if (!hoveredPos) return null;
    return worldToScreen({ x: hoveredPos.x, y: hoveredPos.y }, viewport);
  }, [hoveredPos, viewport]);

  /* eslint-disable react-hooks/refs */
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

  // Viewport-relative fixed coordinates for document.body React Portal
  const hoveredCardPortalStyle = useMemo(() => {
    if (!hoveredScreenPos || !containerRef.current) return {};
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width || 800;
    const containerHeight = rect.height || 520;

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
      position: 'fixed' as const,
      left: rect.left + leftVal,
      top: rect.top + topVal,
      fontFamily: 'var(--font-sans), Inter, sans-serif',
      zIndex: 99999,
    };
  }, [hoveredScreenPos]);
  /* eslint-enable react-hooks/refs */

  // Get first parent's color or own lane color for curves
  const getConnectorColor = (conn: { color: string }) => {
    return conn.color;
  };

  if (filteredCommits.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-text-secondary text-ui-body bg-bg-base select-none">
        <GitCommit size={20} className="mb-2 text-text-secondary/70" />
        <p>No se encontraron commits en este rango de búsqueda.</p>
      </div>
    );
  }

  const hudLeftInset = 16 + hudLeft;
  const hudRightInset = 16 + hudRight;

  return (
    <div
      className="flex-1 w-full h-full overflow-visible bg-bg-base flex flex-col relative select-none"
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
          style={{
            overflow: 'visible',
            maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 370px), transparent calc(100% - 220px))',
            WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 370px), transparent calc(100% - 220px))',
          }}
        >
          <defs>
            <radialGradient id="selected-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0" />
              <stop offset="60%" stopColor="var(--color-secondary)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.4" />
            </radialGradient>
          </defs>
          <style>{`
            @keyframes chrono-flow {
              0% {
                stroke-dashoffset: 20;
                opacity: 0.18;
              }
              50% {
                opacity: 0.9;
              }
              100% {
                stroke-dashoffset: 0;
                opacity: 0.18;
              }
            }
            @keyframes selected-breath {
              0%, 100% {
                transform: scale(0.96);
                opacity: 0.8;
              }
              50% {
                transform: scale(1.06);
                opacity: 1;
              }
            }
          `}</style>
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
                stroke="var(--color-border-subtle)"
                strokeWidth={1}
                opacity={0.6}
              />
              <line
                x1={xStart - nx * 2}
                y1={yStart - ny * 2}
                x2={xEnd - nx * 2}
                y2={yEnd - ny * 2}
                stroke="var(--color-border-subtle)"
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
                    stroke="var(--color-border-subtle)"
                    strokeWidth={1.5}
                    opacity={0.7}
                  />
                </g>
              ))}

              {/* Extreme labels */}
              <text
                x={xStart - 95}
                y={yStart + 95}
                textAnchor="end"
                fontSize={fs(8)}
                fill="var(--color-text-secondary)"
                className="font-mono font-bold"
                opacity={0.6}
              >
                [CHRONO_START // T_MIN]
              </text>
              <text
                x={xEnd + 95}
                y={yEnd - 95}
                textAnchor="start"
                fontSize={fs(8)}
                fill="var(--color-text-secondary)"
                className="font-mono font-bold"
                opacity={0.6}
              >
                [CHRONO_END // T_MAX]
              </text>

              {/* Guidelines & Time Ticks */}
              {timeTicks.map((tick, index) => {
                // Check if any commit node or comment overlaps with this tick
                const hasOverlap = projectedCommits.some(node => {
                  const dx = Math.abs(node.x - tick.x);
                  if (dx >= 35) return false;

                  // Comment is on the right wing
                  return !node.isLeft;
                });

                const isNearHead = headCommitNode && Math.abs(headCommitNode.x - tick.x) < 80;
                const yOffset = isNearHead ? 95 : (hasOverlap ? 55 : 16);
                const dotY2 = isNearHead ? 90 : (hasOverlap ? 50 : 12);

                return (
                  <g key={`tick-${index}`} opacity={0.6}>
                    {/* Dash lines */}
                    <line
                      x1={tick.x}
                      y1={config.paddingTop - 20}
                      x2={tick.x}
                      y2={height - config.paddingBottom + 20}
                      stroke="var(--color-border-subtle)"
                      strokeWidth={0.75}
                      strokeDasharray="4 8"
                      opacity={0.3}
                    />
                    {/* Visual marker point on diagonal */}
                    <circle cx={tick.x} cy={tick.y} r={2.5} fill="var(--color-text-secondary)" />

                    {/* HUD Dotted Connector Line from circle to date label */}
                    <line
                      x1={tick.x}
                      y1={tick.y + 4}
                      x2={tick.x}
                      y2={tick.y + dotY2}
                      stroke="var(--color-text-secondary)"
                      strokeWidth={0.75}
                      strokeDasharray="2 2"
                      opacity={0.6}
                    />

                    {/* Secondary technical coordinate */}
                    <text
                      x={tick.x}
                      y={tick.y + yOffset}
                      textAnchor="middle"
                      fontSize={fs(8.5)}
                      fill="var(--color-text-secondary)"
                      className="font-mono font-semibold"
                    >
                      {`T+${String(index).padStart(3, '0')}`}
                    </text>

                    {/* Dates rendered below the guideline */}
                    <text
                      x={tick.x}
                      y={tick.y + yOffset + 11}
                      textAnchor="middle"
                      fontSize={fs(10)}
                      fontWeight="600"
                      fill="var(--color-text-secondary)"
                      className="font-mono"
                    >
                      {tick.dateStr}
                    </text>
                    <text
                      x={tick.x}
                      y={tick.y + yOffset + 22}
                      textAnchor="middle"
                      fontSize={fs(9)}
                      fill="var(--color-text-secondary)"
                      className="font-mono"
                    >
                      {tick.yearStr}
                    </text>
                  </g>
                );
              })}
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
                      {/* Base semi-transparent solid connection path */}
                      <path
                        d={`M ${cx} ${cy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${px} ${py}`}
                        stroke={conn.color}
                        strokeWidth={isMerge ? 1.5 : 2.5}
                        strokeLinecap="round"
                        fill="none"
                        opacity={selectedHash === node.commit.hash || selectedHash === parentNode.commit.hash ? 0.85 : 0.35}
                        className="transition-all duration-200"
                      />
                      {/* Animated dotted overlay path flowing chronologically (parent -> child) */}
                      <path
                        d={`M ${px} ${py} C ${cp2x} ${cp2y}, ${cp1x} ${cp1y}, ${cx} ${cy}`}
                        stroke={conn.color}
                        strokeWidth={isMerge ? 1.2 : 1.5}
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={isMerge ? "3 3" : "4 6"}
                        opacity={0.85}
                        style={{
                          animation: 'chrono-flow 3s linear infinite',
                          animationDelay: `${(node.chronologicalIndex * 0.4) % 3}s`,
                        }}
                      />
                      {isMerge && mid && (
                        <path
                          d="M -3.5 -2.5 L 0 0 L -3.5 2.5"
                          fill="none"
                          stroke={conn.color}
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          transform={`translate(${mid.x}, ${mid.y}) rotate(${mid.angle + 180})`}
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
                const isHead = headCommitNode && node.commit.hash === headCommitNode.commit.hash;

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
                        r={isHead ? 36 : 19}
                        fill="url(#selected-glow)"
                        stroke="var(--color-secondary)"
                        strokeWidth={isHead ? 3 : 1.5}
                        style={{
                          transformOrigin: `${node.x}px ${node.y}px`,
                          animation: 'selected-breath 3s ease-in-out infinite',
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
                      strokeWidth={isSelected ? (isHead ? 6 : 3) : (isHead ? 4 : 2)}
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
            </g>

            {/* Layer 3: Overlay Labels Layer */}
            <g id="overlay-labels">
              {/* Satellite Tags — same classic-view aesthetic as branch tags */}
              {tagsWithPositions.map((tag, idx) => {
                const TAG_COLOR = 'var(--color-git-mod)';
                const tagCharWidth = 7.5;
                const tagPaddingX = 24;
                const badgeWidth = tag.tagName.length * tagCharWidth + tagPaddingX;
                return (
                  <g key={`tag-satellite-${tag.commitHash}-${idx}`}>
                    <line
                      x1={tag.x}
                      y1={tag.y}
                      x2={tag.satX}
                      y2={tag.satY}
                      stroke="var(--color-text-secondary)"
                      strokeWidth={0.75}
                      strokeDasharray="2 2"
                      opacity={0.5}
                    />
                    <circle cx={tag.satX} cy={tag.satY} r={2} fill={TAG_COLOR} opacity={0.7} />
                    <g transform={`translate(${tag.satX}, ${tag.satY})`}>
                      <rect
                        x={-badgeWidth - 2}
                        y={-9}
                        width={badgeWidth}
                        height={18}
                        rx={4}
                        fill={TAG_COLOR}
                        fillOpacity={0.2}
                        stroke={TAG_COLOR}
                        strokeOpacity={0.5}
                        strokeWidth={1}
                      />
                      <text
                        x={-badgeWidth / 2 - 2}
                        y={0}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={TAG_COLOR}
                        fontSize={fs(10)}
                        fontWeight={500}
                        className="font-mono select-none pointer-events-none"
                        letterSpacing="0.5"
                      >
                        {tag.tagName}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* HEAD Target Reticle (Custom LCARS radar graphic) */}
              {headCommitNode && (
                <g key="head-reticle" className="pointer-events-none">
                  <g
                    transform={`translate(${headCommitNode.x}, ${headCommitNode.y}) scale(0.18) translate(-360, -360)`}
                    opacity={0.85}
                  >
                    <g style={{ transformOrigin: '360px 360px' }}>
                      <path fill="#80d1e2" d="M128.94,233.7s47.13,24.25,84.98,51.05c12.09-23.46,29.72-43.59,51.17-58.67l-17.17-11.81H30.72c-2.23,5.02-4.34,10.1-6.34,15.24,82.61-3.21,104.56,4.18,104.56,4.18Z"/>
                      <path fill="#1984cd" d="M157,524.71h62.4c-7.77-2.28-21.77-14.28-27.67-19.61h-34.73v19.61Z"/>
                      <path fill="#e5d6b4" d="M263.8,452.94l-13.17,13.17c26.37,27.14,62.71,44.53,103.12,46.26v-18.64c-35.26-1.72-66.94-17.03-89.94-40.79Z"/>
                      <path fill="#81d2e7" d="M455.71,384.36l41.09,25.9c7.57-13.59,11.99-27.96,13.35-41.46h-51.71c-.5,5.32-1.41,10.52-2.73,15.57Z"/>
                      <path fill="#e5d6b4" d="M426.58,256.45l-12.16,15.95c29.08,18.08,48.46,50.31,48.46,87.07,0,1.79-.05,3.56-.14,5.32h19.98c.08-1.77.12-3.54.12-5.32,0-43.24-22.41-81.24-56.26-103.03Z"/>
                      <path fill="#e5d6b4" d="M384.37,259.85l10.35-17.92c-4.25-1.24-8.59-2.25-13.02-3.03v20.36c.89.19,1.79.37,2.67.58Z"/>
                      <path fill="#b2dece" d="M460.07,364.8c.09-1.76.14-3.54.14-5.32,0-35.9-18.96-67.37-47.41-84.95l-3.86,5.06c27.52,16.28,45.95,45.96,45.95,79.9,0,1.79-.06,3.56-.16,5.32h5.34Z"/>
                      <path fill="#e5d6b4" d="M474.88,402.97l-23.79-16.96c-7.95,27.21-27.78,49.34-53.52,60.36l17.61,22.63c27.3-13.68,48.77-37.26,59.71-66.03Z"/>
                      <path fill="#75d0ee" d="M391.88,448.58l2.9,28.44c6.03-1.76,11.86-3.97,17.46-6.59l-17.75-22.82c-.87.34-1.73.66-2.61.97Z"/>
                      <path fill="#e5d6b4" d="M388.74,449.64c-8.95,2.81-18.47,4.33-28.34,4.33-.89,0-1.77-.04-2.66-.07v27.98c.89.02,1.77.03,2.66.03,10.79,0,21.25-1.4,31.22-4.02l-2.88-28.26Z"/>
                      <path fill="#e5d6b4" d="M209.4,384.39c4.92,30.01,18.54,57.1,38.22,78.55l13.18-13.18c-16.89-18.62-28.6-42-32.94-67.88-5.86.86-12.05,1.68-18.47,2.51Z"/>
                      <path fill="#e5d6b4" d="M360.4,225.06c41.04,0,77.78,18.4,102.43,47.39l14.7-11.47c-28.07-33.35-70.13-54.56-117.14-54.56-74.63,0-136.76,53.42-150.3,124.1,6.4.87,12.58,1.78,18.44,2.75,12.19-61.7,66.59-108.22,131.86-108.22Z"/>
                      <path fill="#b2dece" d="M275.44,434.27c-13.65-15.49-23.11-34.74-26.67-55.99-2.88.61-5.91,1.18-9.07,1.73,3.9,23.11,14.27,44.03,29.19,60.81l6.54-6.54Z"/>
                      <path fill="#b2dece" d="M360.4,264.99c16.59,0,32.18,4.29,45.73,11.8l11.38-15.06,5.64-7.39c-8.02-4.8-16.64-8.71-25.72-11.59-6.42,10.26-11.75,20.91-11.75,20.91l-6.65-1.33s0-21.29-.27-23.92c-5.99-.9-12.12-1.37-18.36-1.37-59.39,0-108.89,42.28-120.06,98.38,3.15.62,6.16,1.27,9.04,1.95,10.01-50.11,53.35-88.36,105.71-91.02v18.79c1.76-.1,3.54-.16,5.32-.16Z"/>
                      <path fill="#75d0ee" d="M353.75,481.74v-36.03c-41.43-3.16-74.68-35.47-79.29-76.47-5.34,3.58-13.23,6.26-22.98,8.46,3.72,22.44,14.19,42.59,29.28,58.29l-8.48,8.48c20.83,21.6,49.52,35.56,81.47,37.27Z"/>
                      <path fill="#75d0ee" d="M252.06,338.03c9.7,2.43,17.56,5.21,22.81,8.49,5.81-38.59,37.11-68.8,76.21-72.99v-24.06c-49.45,4.14-89.62,40.81-99.02,88.57Z"/>
                      <path fill="#51c9f2" d="M209.56,293.93l-40.13-22.18s-12.16,24.32-15.48,51.95l44.81,5.21c2.29-12.2,5.94-23.91,10.79-34.99Z"/>
                      <path fill="#80d1e2" d="M157.15,408.24s2.33,22.69,18.06,50.3c12.51-7.24,32.66-19.56,39.45-23.72-6.21-11.76-11.01-24.37-14.19-37.61l-43.32,11.03Z"/>
                      <path fill="#80d1e2" d="M197.06,336.97c-15.24-1.69-31.06-2.87-45.32-3.69v49.94c14.31-1.27,30.15-2.93,45.32-5.04v-41.21Z"/>
                      <path fill="#51c9f2" d="M141.79,332.87c-24.06-1.23-42.01-1.42-42.01-1.42v55.27s18-.84,42.01-2.83v-51.02Z"/>
                      <path fill="#51c9f2" d="M90.25,386.72v-55.27s-9.95-.47-22.11,1.74v53.06c12.66,1.23,22.11.47,22.11.47Z"/>
                      <path fill="#51c9f2" d="M23.93,378.51c19.9,5.09,35.37,6.63,35.37,6.63v-50.85s-15.48.52-35.37,5.53c0,0-23.21,5.53-23.21,18.79s23.21,19.9,23.21,19.9Z"/>
                      <path fill="#f4c569" d="M267.01,442.7c-15.31-17.16-25.93-38.58-29.93-62.25-2.14.35-4.34.7-6.58,1.03,4.22,25.09,15.52,47.78,31.79,65.93l4.71-4.71Z"/>
                      <path fill="#f4c569" d="M455.48,278.18l5.25-4.09c-24.17-28.37-60.14-46.36-100.33-46.36-63.95,0-117.25,45.57-129.23,106.01,2.24.39,4.42.78,6.55,1.18,11.41-57.33,61.99-100.54,122.67-100.54,38.05,0,72.14,17,95.08,43.81Z"/>
                      <path fill="#80d1e2" d="M209.22,377.11c33.81-4.57,61.9-6.6,61.9-20.24,0-10.26-28.64-15.14-61.9-19.02v39.26Z"/>
                      <path fill="#80d1e2" d="M248.75,468l-22.59,22.59c32.63,33.41,77.62,54.68,127.59,56.42v-31.96c-41.14-1.73-78.15-19.42-105-47.04Z"/>
                  </g>
                </g>
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
                    stroke="var(--color-error)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                    opacity={0.5}
                  />
                  <polygon
                    points={`${wipCoords.x - 11},${wipCoords.y + 4} ${wipCoords.x - 5},${wipCoords.y - 6} ${wipCoords.x + 1},${wipCoords.y + 4}`}
                    fill="var(--color-error)"
                    opacity={0.5}
                  />
                  <rect
                    x={wipCoords.x - 4}
                    y={wipCoords.y - 9}
                    width={85}
                    height={18}
                    rx={4}
                    fill="var(--color-bg-surface)"
                    stroke="var(--color-error)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    opacity={0.8}
                  />
                  <text
                    x={wipCoords.x + 8}
                    y={wipCoords.y + 2.5}
                    fill="var(--color-error)"
                    fontSize={fs(7.5)}
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
                    stroke="var(--color-text-secondary)"
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
                    fill="var(--color-bg-surface)"
                    stroke="var(--color-text-secondary)"
                    strokeWidth={0.75}
                    opacity={0.75}
                  />
                  <rect
                    x={stashPos.x - 14}
                    y={stashPos.y + 1}
                    width={28}
                    height={3}
                    fill="var(--color-border-subtle)"
                    opacity={0.6}
                  />
                  <path
                    d={`M ${stashPos.x - 16} ${stashPos.y - 4} L ${stashPos.x - 16} ${stashPos.y + 4} L ${stashPos.x + 16} ${stashPos.y + 4} L ${stashPos.x + 16} ${stashPos.y - 4}`}
                    fill="none"
                    stroke="var(--color-text-secondary)"
                    strokeWidth={0.5}
                    opacity={0.5}
                  />
                  <text
                    x={stashPos.x}
                    y={stashPos.y - 1}
                    textAnchor="middle"
                    fill="var(--color-text-secondary)"
                    fontSize={fs(6.5)}
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
                const isBranchOrigin = node.isBranchOrigin;

                if (isHead && headCommitNode) {
                  const isLeft = headCommitNode.isLeft;
                  const vx = isLeft ? nx : rx;
                  const vy = isLeft ? ny : ry;

                  const lineSpacing = 16 * textScale;
                  const baseClearance = 78 * textScale; // safe clearance from timeline to avoid branch badges

                  // Define the lines to render, from closest to furthest (ordered chronologically)
                  const lines: { text: string; fill: string; fontSize: number; fontWeight: string; opacity?: number }[] = [];

                  // Line 1 (closest to timeline): COMMIT message
                  lines.push({
                    text: `C:${headCommitNode.commit.shortHash.toUpperCase()} // ${headCommitNode.commit.message}`,
                    fill: headCommitNode.laneColor,
                    fontSize: fs(7),
                    fontWeight: "medium",
                    opacity: 0.8
                  });

                  // Line 2: BRANCH name
                  lines.push({
                    text: `BRANCH // ${currentBranch || 'DETACHED'}`,
                    fill: headCommitNode.laneColor,
                    fontSize: fs(7.5),
                    fontWeight: "bold"
                  });

                  // Line 3: TRACKING (conditional)
                  if (ahead > 0 || behind > 0) {
                    lines.push({
                      text: `TRACKING // ${ahead > 0 ? `▲${ahead}` : ''}${behind > 0 ? ` ▼${behind}` : ''}`,
                      fill: "var(--color-secondary)",
                      fontSize: fs(7),
                      fontWeight: "bold",
                      opacity: 0.85
                    });
                  }

                  // Line 4 (furthest from timeline): HEAD header
                  lines.push({
                    text: "[HEAD // TARGET: ACTIVE]",
                    fill: "var(--color-secondary)",
                    fontSize: fs(7.5),
                    fontWeight: "bold"
                  });

                  return (
                    <g key={`head-telemetry-stack`} opacity={0.95}>
                      {/* Dotted HUD connector line */}
                      <line
                        x1={headCommitNode.x}
                        y1={headCommitNode.y}
                        x2={headCommitNode.x + vx * (baseClearance - 6)}
                        y2={headCommitNode.y + vy * (baseClearance - 6)}
                        stroke="var(--color-secondary)"
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        opacity={0.85}
                      />

                      {/* Stacked Telemetry lines growing OUTWARD away from the timeline */}
                      {lines.map((line, idx) => {
                        const dist = baseClearance + idx * lineSpacing;
                        return (
                          <text
                            key={`hud-line-${idx}`}
                            x={headCommitNode.x + vx * dist}
                            y={headCommitNode.y + vy * dist}
                            textAnchor={isLeft ? "end" : "start"}
                            fill={line.fill}
                            fontSize={line.fontSize}
                            fontWeight={line.fontWeight}
                            className="font-mono select-none pointer-events-none"
                            letterSpacing="0.5"
                            opacity={line.opacity ?? 1}
                          >
                            {line.text}
                          </text>
                        );
                      })}
                    </g>
                  );
                }

                // Identify active branch refs for any normal commit node
                const activeBranchRefs = node.commit.refs?.filter(r =>
                  r.startsWith('refs/heads/') &&
                  r !== 'HEAD' &&
                  r !== `refs/heads/${currentBranch}` &&
                  r !== currentBranch
                ) || [];
                const hasBranchRefs = activeBranchRefs.length > 0;

                // 2. Normal Commit Nodes - Symmetrical Side-Specific Placement with Anti-Collision
                const isLeft = node.isLeft;
                const vx = isLeft ? nx : rx;
                const vy = isLeft ? ny : ry;
                const offsetDist = labelOffsets.get(node.commit.hash) ?? 35;

                return (
                  <g key={`overlay-node-${node.commit.hash}`} opacity={0.85} className="hover:opacity-100 transition-opacity">
                    {/* A. Interlocking Triangles Demarcating branch start only */}
                    {isBranchOrigin && node.commit.parents.length > 0 && (
                      <g opacity={0.9}>
                        <polygon
                          points={`${node.x + nx * 25},${node.y + ny * 25} ${node.x + nx * 20 + ux * 2.5},${node.y + ny * 20 + uy * 2.5} ${node.x + nx * 20 - ux * 2.5},${node.y + ny * 20 - uy * 2.5}`}
                          fill={node.laneColor}
                          opacity={0.4}
                          stroke={node.laneColor}
                          strokeWidth={0.75}
                        />
                        <polygon
                          points={`${node.x + nx * 28},${node.y + ny * 28} ${node.x + nx * 23 + ux * 2.5},${node.y + ny * 23 + uy * 2.5} ${node.x + nx * 23 - ux * 2.5},${node.y + ny * 23 - uy * 2.5}`}
                          fill="none"
                          stroke={node.laneColor}
                          strokeWidth={1}
                        />
                      </g>
                    )}

                    {/* B. Active Branch Ref Badge always aligned on the Left-Wing */}
                    {hasBranchRefs && (() => {
                      const branchNames = activeBranchRefs.map(ref => ref.replace(/^refs\/heads\//, ''));
                      const branchLabelText = `BRANCH // ${branchNames.join(' & ').toUpperCase()}`;
                      const badgeWidth = branchLabelText.length * 4.8 + 12;
                      const badgeX = node.baseX + nx * 75;
                      const badgeY = node.baseY + ny * 75;

                      return (
                        <g opacity={0.95}>
                           {/* Dotted HUD connector line from node to left-aligned badge */}
                          <line
                            x1={node.x}
                            y1={node.y}
                            x2={badgeX}
                            y2={badgeY}
                            stroke={node.laneColor}
                            strokeWidth={0.75}
                            strokeDasharray="2 2"
                            opacity={0.6}
                          />
                          <g transform={`translate(${badgeX}, ${badgeY})`}>
                            <rect
                              x={-badgeWidth - 4}
                              y={-7}
                              width={badgeWidth}
                              height={14}
                              rx={2}
                              fill="#020f1e"
                              stroke={node.laneColor}
                              strokeWidth={1}
                              opacity={0.9}
                            />
                            <rect
                              x={-7}
                              y={-7}
                              width={3}
                              height={14}
                              fill={node.laneColor}
                            />
                            <text
                              x={-12}
                              y={3}
                              textAnchor="end"
                              fill={node.laneColor}
                              fontSize={fs(7.5)}
                              fontWeight="bold"
                              className="font-mono select-none pointer-events-none"
                              letterSpacing="0.5"
                            >
                              {branchLabelText}
                            </text>
                          </g>
                        </g>
                      );
                    })()}

                    {/* C. Commit Telemetry Label */}
                    <g>
                      {/* Dotted HUD connector line */}
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={node.x + vx * (offsetDist - 4)}
                        y2={node.y + vy * (offsetDist - 4)}
                        stroke={node.laneColor}
                        strokeWidth={0.5}
                        strokeDasharray="2 3"
                        opacity={0.4}
                      />

                      {/* Commit Telemetry label & Inline Branch Tag */}
                      {(() => {
                        const branchName = node.branchName;
                        // Render the inline branch tag at two anchor points so every visible branch is labeled:
                        //  - isBranchOrigin: the oldest commit of a chain (matches the chronometric "where it diverges" semantic)
                        //  - hasBranchRefAttached: the commit where the actual ref label points (matches the classic-view tip semantic)
                        // Branches whose origin lies off-screen would otherwise have no badge at all in the cronómetric view.
                        // Refs come from electron's git log %D as short names like "main", "origin/foo", "tag: v1.0", "HEAD" — NOT with refs/heads/ prefixes.
                        const hasBranchRefAttached = !!node.commit.refs?.some(r => {
                          if (!r || r.startsWith('tag: ')) return false;
                          if (r === 'HEAD' || r === 'stash') return false;
                          if (r.startsWith('refs/stash')) return false;
                          return true;
                        });
                        const renderBranchTag = (node.isBranchOrigin || hasBranchRefAttached) && branchName;

                        const commentText = `C:${node.commit.shortHash.toUpperCase()} // ${node.commit.message}`;
                        const commentTextWidth = commentText.length * 4.2;

                        const baseX = node.x + vx * offsetDist;
                        const baseY = node.y + vy * offsetDist;

                        if (renderBranchTag) {
                          const tagText = branchName.toUpperCase();
                          // Badge dimensions scale with text size. Generous internal padding
                          // (8px each side at compact) keeps the text from touching the border at any size.
                          const tagCharWidth = 7.5 * textScale;
                          const tagPaddingX = 24 * textScale;
                          const tagBadgeWidth = tagText.length * tagCharWidth + tagPaddingX;
                          const tagBadgeHeight = 18 * textScale;
                          const tagBadgeHalfHeight = tagBadgeHeight / 2;
                          const tagBadgeOffsetFromComment = 20 * textScale;
                          const badgeY = baseY - tagBadgeOffsetFromComment;
                          const anchor = isLeft ? "end" : "start";
                          // Badge rect origin: left edge for right wing, shifted left for left wing
                          const rectX = isLeft ? -tagBadgeWidth : 0;

                          return (
                            <g>
                              {/* Branch name badge — classic-view aesthetic: translucent lane fill, lane-colored border, lane-colored text */}
                              <g transform={`translate(${baseX}, ${badgeY})`}>
                                <rect
                                  x={rectX}
                                  y={-tagBadgeHalfHeight}
                                  width={tagBadgeWidth}
                                  height={tagBadgeHeight}
                                  rx={4}
                                  fill={node.laneColor}
                                  fillOpacity={0.2}
                                  stroke={node.laneColor}
                                  strokeOpacity={0.5}
                                  strokeWidth={1}
                                />
                                <text
                                  x={rectX + tagBadgeWidth / 2}
                                  y={0}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill={node.laneColor}
                                  fontSize={fs(10)}
                                  fontWeight={500}
                                  className="font-mono select-none pointer-events-none"
                                  letterSpacing="0.5"
                                >
                                  {tagText}
                                </text>
                              </g>

                              {/* Commit comment — anchored at baseX / baseY */}
                              <text
                                x={baseX}
                                y={baseY}
                                textAnchor={anchor}
                                dominantBaseline="central"
                                fill={node.laneColor}
                                fontSize={fs(7)}
                                fontWeight="medium"
                                className="font-mono select-none pointer-events-none"
                                letterSpacing="0.5"
                              >
                                {commentText}
                              </text>
                            </g>
                          );
                        } else {
                          // Normal comment without branch tag
                          return (
                            <text
                              x={baseX}
                              y={baseY}
                              textAnchor={isLeft ? "end" : "start"}
                              dominantBaseline="central"
                              fill={node.laneColor}
                              fontSize={fs(7)}
                              fontWeight="medium"
                              className="font-mono select-none pointer-events-none"
                              letterSpacing="0.5"
                            >
                              {commentText}
                            </text>
                          );
                        }
                      })()}
                    </g>
                  </g>
                );
              })}
            {/* 5. Speculative (AI-predicted) future branches — overlay, dotted/faint */}
            <SpeculativeBranches
              nodes={speculativeNodes}
              config={config}
              visible={showSpeculative}
              onSelect={handleSelectSpeculative}
              selectedBranchId={selectedSpeculativeId}
              decisions={decisions}
              hasAnyDecision={hasAnyDecision}
            />
            </g>
          </g>

          {/* Curved connection line on hover */}
          {hoveredNode && hoveredScreenPos && hoveredCardStyle && 'left' in hoveredCardStyle && 'top' in hoveredCardStyle && (() => {
            const leftVal = hoveredCardStyle.left as number;
            const topVal = hoveredCardStyle.top as number;
            const cardWidth = 310;

            // Start point (P0) at the center of the hovered node
            const p0x = hoveredScreenPos.x;
            const p0y = hoveredScreenPos.y;

            // Target point on the card (P3) - connect to the closest vertical edge of the card
            const isCardOnRight = leftVal > p0x;
            const p3x = isCardOnRight ? leftVal : leftVal + cardWidth;
            const p3y = topVal + 18; // Connect near the top of the card for classic look

            // Control points for a beautiful organic Bezier curve
            // P1: Exits vertically upward from the node
            const p1x = p0x;
            const p1y = p0y - 35;

            // P2: Enters horizontally into the card edge
            const p2x = isCardOnRight ? p3x - 45 : p3x + 45;
            const p2y = p3y;

            const yellowColor = 'var(--color-git-mod)'; // As per DESIGN.MD: git-mod is #F5A623

            return (
              <g id="hover-connection-overlay" className="pointer-events-none">
                {/* Curved line itself */}
                <path
                  d={`M ${p0x} ${p0y} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${p3x} ${p3y}`}
                  stroke={yellowColor}
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0.85}
                  className="transition-all duration-150"
                />
                {/* Visual anchor dots at start and end for premium aesthetic */}
                <circle cx={p0x} cy={p0y} r={3} fill={yellowColor} />
                <circle cx={p3x} cy={p3y} r={3} fill={yellowColor} />
              </g>
            );
          })()}
        </svg>

        {/* 5. Custom Floating Hover Card (Geometric clarity, details on-demand, viewport relative positioned, portaled to body to overlap sidebars) */}
        {hoveredNode && hoveredScreenPos && typeof document !== 'undefined' && createPortal(
          <div
            className="pointer-events-none bg-bg-overlay/60 backdrop-blur-md border border-border-subtle/15 rounded-md px-3 py-2.5 shadow-glass min-w-[280px] max-w-[340px] transition-opacity duration-150 animate-in fade-in zoom-in-95 duration-100"
            style={hoveredCardPortalStyle}
          >
            <div className="flex items-center justify-between gap-3 mb-1.5 border-b border-border-subtle/15 pb-1">
              <span className="text-[10px] uppercase font-bold text-text-secondary/70 tracking-wider font-mono">
                {hoveredNode.commit.shortHash}
              </span>
              {getBranchName(hoveredNode.commit) && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold truncate max-w-[150px]"
                  style={{
                    backgroundColor: hoveredNode.laneColor.startsWith('var(')
                      ? `color-mix(in srgb, ${hoveredNode.laneColor} 8.2%, transparent)`
                      : `${hoveredNode.laneColor}15`,
                    color: hoveredNode.laneColor,
                    border: hoveredNode.laneColor.startsWith('var(')
                      ? `1px solid color-mix(in srgb, ${hoveredNode.laneColor} 18.8%, transparent)`
                      : `1px solid ${hoveredNode.laneColor}30`,
                  }}
                >
                  {getBranchName(hoveredNode.commit)}
                </span>
              )}
            </div>
            <p className="text-xs text-text-primary font-medium line-clamp-2 mb-2 leading-relaxed">
              {hoveredNode.commit.message}
            </p>
            <div className="flex items-center justify-between text-[9px] text-text-secondary font-mono">
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
          </div>,
          document.body
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
        .duration-400 {
          transition-duration: 0.4s;
        }
      `}</style>

      {/* 1. Static SVG HUD Shell Overlay Layer (Frames viewport at z-10, pointer-events-none) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none z-10 opacity-40"
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

        {/* Crosshair Ticks in center of screen */}
        <g stroke="#3c495a" strokeWidth="0.75" opacity="0.2">
          <line x1="50%" y1="calc(50% - 16px)" x2="50%" y2="calc(50% - 8px)" />
          <line x1="50%" y1="calc(50% + 8px)" x2="50%" y2="calc(50% + 16px)" />
          <line x1="calc(50% - 16px)" y1="50%" x2="calc(50% - 8px)" y2="50%" />
          <line x1="calc(50% + 8px)" y1="50%" x2="calc(50% + 16px)" y2="50%" />
        </g>

        {/* Technical Coordinate Indicators */}
        <text x="295" y="109" fill="#697789" fontSize="6" className="font-mono" opacity="0.5">
          NAV_AXIS // AZIMUTH: 40.4° // DECLINATION: 0.85
        </text>
        <text x="calc(100% - 295px)" y="109" textAnchor="end" fill="#697789" fontSize="6" className="font-mono" opacity="0.5">
          SYS_CORRELATION // CHRONO_V2.0 // TIMELINE: RUNNING
        </text>
      </svg>



      {/* Bottom dock — Centauro panel + horizontal toolbar above it.
          Toolbar and panel form one visual block; both rise/fall together.
          Toolbar is a reusable bar — zoom is the first resident, more controls go here later. */}
      <div
        className="absolute z-20 pointer-events-none flex justify-center"
        style={{
          left: hudLeftInset,
          right: hudRightInset,
          bottom: '0.5rem',
          transition: 'left 0.3s ease, right 0.3s ease',
        }}
      >
        <div
          className="pointer-events-auto select-none relative"
          style={{ width: 'min(840px, calc(100% - 8px))' }}
        >
          {/* Resize handle — mounted on the top outer edge, protruding upward.
              Same absolute-edge pattern as sidebar/details column handles. */}
          <div
            onMouseDown={onCentauroResizeStart}
            className="absolute -top-1.5 left-0 right-0 h-3 cursor-ns-resize z-40 group"
            title={t('resize.centauro')}
          >
            <div className="absolute inset-x-0 top-1 h-px bg-border-subtle/15 group-hover:bg-secondary/45 group-active:bg-secondary/70 transition-colors" />
          </div>

          {/* Inner content box — keeps overflow-hidden to perfectly mask content and transitions */}
          <div className="w-full rounded-xl border border-text-primary/15 bg-bg-overlay/60 backdrop-blur-md overflow-hidden relative">

          {/* Toolbar — horizontal controls */}
          <div
            className={cn(
              'hud-toolbar px-3 py-1.5 flex items-center justify-between gap-3 bg-transparent border-b transition-colors duration-300',
              centauroExpanded ? 'border-[#5ed8ff]/15' : 'border-transparent',
            )}
          >
            <div className="flex items-center gap-2">
              {/* FUTUROS toggle — quick access from within chronometric view */}
              <button
                onClick={onToggleSpeculative}
                className={cn(
                  'h-7 shrink-0 rounded-md border flex items-center gap-1.5 px-2.5 transition-colors cursor-pointer text-[9px] font-bold tracking-wider uppercase font-mono',
                  showSpeculative
                    ? 'border-[#a3f185]/40 bg-[#d9e7fc]/10 text-[#a3f185]'
                    : 'border-[#d9e7fc]/15 bg-[#d9e7fc]/[0.035] text-[#9eacc0] hover:border-[#a3f185]/35 hover:bg-[#d9e7fc]/10 hover:text-[#a3f185]',
                )}
                title={t('centauro.futurosTooltip')}
              >
                {showSpeculative ? t('centauro.futurosOn') : t('centauro.futurosOff')}
              </button>

              {/* CENTAURO toggle */}
              <button
                onClick={() => setCentauroExpanded(!centauroExpanded)}
                className={cn(
                  'h-7 shrink-0 rounded-md border flex items-center gap-1.5 px-2.5 transition-colors cursor-pointer text-[9px] font-bold tracking-wider uppercase font-mono',
                  centauroExpanded
                    ? 'border-[#a3f185]/40 bg-[#d9e7fc]/10 text-[#a3f185]'
                    : 'border-[#d9e7fc]/15 bg-[#d9e7fc]/[0.035] text-[#9eacc0] hover:border-[#a3f185]/35 hover:bg-[#d9e7fc]/10 hover:text-[#a3f185]',
                )}
                title={t('toolbar.centauroTooltip')}
              >
                <Compass size={12} className={cn('transition-colors', centauroExpanded ? 'text-[#a3f185]' : 'text-[#9eacc0]/70')} />
                <span>{t('toolbar.centauro')}</span>
              </button>
            </div>
            {/* Zoom group — right side of the toolbar */}
            <div className="flex items-center gap-1">
              <button onClick={zoomIn} title={t('zoom.in')} className="h-7 w-7 shrink-0 rounded-md border border-[#d9e7fc]/15 bg-[#d9e7fc]/[0.035] text-[#9eacc0] flex items-center justify-center transition-colors hover:border-[#a3f185]/35 hover:bg-[#d9e7fc]/10 hover:text-[#a3f185] cursor-pointer">
                <ZoomIn size={14} />
              </button>
              <button onClick={zoomOut} title={t('zoom.out')} className="h-7 w-7 shrink-0 rounded-md border border-[#d9e7fc]/15 bg-[#d9e7fc]/[0.035] text-[#9eacc0] flex items-center justify-center transition-colors hover:border-[#a3f185]/35 hover:bg-[#d9e7fc]/10 hover:text-[#a3f185] cursor-pointer">
                <ZoomOut size={14} />
              </button>
              <button onClick={resetViewport} title={t('zoom.reset')} className="h-7 w-7 shrink-0 rounded-md border border-[#d9e7fc]/15 bg-[#d9e7fc]/[0.035] text-[#9eacc0] flex items-center justify-center transition-colors hover:border-[#a3f185]/35 hover:bg-[#d9e7fc]/10 hover:text-[#a3f185] cursor-pointer">
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Centauro Panel — glassy content block */}
          <div
            className={cn(
              "overflow-hidden bg-[#071a2c]/85 rounded-b-xl",
              !isCentauroDragging && "transition-all duration-400 ease-out"
            )}
            style={{
              height: centauroExpanded ? `${centauroHeight}px` : '0px',
            }}
          >
            {/* Expanded content — tabbed layout: report + history, no stacking */}
            {centauroExpanded && (
              <div className="flex flex-col rounded-b-xl h-full" style={{ maxHeight: `${centauroHeight}px` }}>
                {/* Tab bar */}
                <div className="flex items-center border-b border-[#5ed8ff]/15 px-4">
                  <button
                    onClick={() => setCentauroTab('report')}
                    className={cn(
                      'px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-colors border-b-2 -mb-[1px]',
                      centauroTab === 'report'
                        ? 'text-[#5ed8ff] border-[#5ed8ff]'
                        : 'text-[#697789] border-transparent hover:text-[#9eacc0]',
                    )}
                  >
                    {t('centauro.tabReport')}
                  </button>
                  <button
                    onClick={() => setCentauroTab('history')}
                    className={cn(
                      'px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-colors border-b-2 -mb-[1px]',
                      centauroTab === 'history'
                        ? 'text-[#5ed8ff] border-[#5ed8ff]'
                        : 'text-[#697789] border-transparent hover:text-[#9eacc0]',
                    )}
                  >
                    {t('centauro.tabHistory')}
                  </button>
                </div>

                {/* Tab content */}
                <div className={cn(
                  "flex-1 rounded-b-xl",
                  materializeIdea && materializePlan && isTallMode ? "overflow-hidden flex flex-col" : "overflow-y-auto"
                )}>
                  {centauroTab === 'report' ? (
                    <div className={cn(
                      "px-4 py-3 font-mono",
                      materializeIdea && materializePlan && isTallMode ? "h-full flex flex-col overflow-hidden" : ""
                    )}>
                    {materializeIdea && materializePlan ? (
                      /* ---- INLINE MATERIALIZATION CONFIRMATION / SUCCESS ---- */
                      materializeResult ? (
                        <div className="flex flex-col gap-3 animate-in fade-in duration-200 select-text">
                          <div className="flex items-center justify-between border-b border-[#a3f185]/20 pb-2">
                            <span className="text-[12px] font-bold text-[#a3f185] tracking-wider uppercase">
                              {t('materialize.success')}
                            </span>
                            <button
                              onClick={cancelMaterialize}
                              className="px-3 py-1.5 border border-[#a3f185]/40 hover:bg-[#a3f185]/10 text-[#a3f185] rounded text-[10px] uppercase tracking-wider cursor-pointer transition-all duration-150 font-mono font-bold"
                            >
                              {t('common.close')}
                            </button>
                          </div>
                          <div className="text-[11px] flex flex-col gap-2 text-[#d9e7fc]">
                            <div>{t('materialize.branchLabel')} <span className="text-[#a3f185] font-bold font-mono">{materializeResult.branchName}</span></div>
                            <div>{t('materialize.tagLabel')} <span className="text-[#5ed8ff] font-bold font-mono">{materializeResult.tagName}</span></div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{t('materialize.commitLabel')} <span className="text-[#9eacc0] font-mono">{materializeResult.commitHash.slice(0, 10)}</span> {t('materialize.ideaMdNote')}</span>
                              <CopyButton text={materializeResult.commitHash} />
                            </div>
                          </div>
                          <p className="text-[10px] text-[#697789] leading-relaxed">
                            {t('materialize.successDesc')}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 animate-in fade-in duration-200 select-text h-full overflow-hidden">
                          <div className="flex items-center justify-between border-b border-[#5ed8ff]/20 pb-2 gap-4 flex-wrap shrink-0">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[12px] font-bold text-[#5ed8ff] tracking-wider uppercase">
                                {t('materialize.heading')}
                              </span>
                              <span className="text-[10px] text-[#fd9d1a] font-bold">
                                {t('materialize.warning')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={cancelMaterialize}
                                disabled={materializing}
                                className="px-3 py-1.5 border border-[#3c495a]/60 hover:border-[#697789] text-[#9eacc0] rounded text-[10px] uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all font-mono"
                              >
                                {t('common.cancel')}
                              </button>
                              <button
                                onClick={confirmMaterialize}
                                disabled={materializing}
                                className="px-3 py-1.5 bg-[#a3f185] hover:bg-[#b6f59f] text-[#020f1e] font-bold rounded text-[10px] uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all font-mono"
                              >
                                {materializing ? t('materialize.creating') : t('materialize.confirmBtn')}
                              </button>
                            </div>
                          </div>

                          {isTallMode ? (
                            /* ---- TALL MODE: Stacked Layout (Compact Header + Full-width IDEA.md below) ---- */
                            <div className="flex flex-col gap-3 flex-1 overflow-hidden mt-1 select-text">
                              {/* Compact Header metadata */}
                              <div className="flex items-start gap-4 flex-wrap text-[10px] border border-[#5ed8ff]/10 rounded-md p-2.5 bg-[#5ed8ff]/[0.01] shrink-0 leading-tight">
                                <div className="flex-1 min-w-[120px] flex flex-col gap-0.5">
                                  <span className="text-[8px] text-[#697789] uppercase tracking-wider">{t('materialize.branchLabel')}</span>
                                  <span className="text-[#a3f185] font-bold break-all font-mono">{materializePlan.branchName}</span>
                                </div>
                                <div className="flex-1 min-w-[120px] flex flex-col gap-0.5">
                                  <span className="text-[8px] text-[#697789] uppercase tracking-wider">{t('materialize.tagLabel')}</span>
                                  <span className="text-[#5ed8ff] font-bold break-all font-mono">{materializePlan.tagName}</span>
                                </div>
                                <div className="flex-1 min-w-[120px] flex flex-col gap-0.5">
                                  <span className="text-[8px] text-[#697789] uppercase tracking-wider">{t('materialize.flightLabel')}</span>
                                  <span className="text-[#5ed8ff] font-mono">{materializePlan.flightLevel}</span>
                                </div>
                                <div className="flex-[2] min-w-[200px] flex flex-col gap-0.5">
                                  <span className="text-[8px] text-[#697789] uppercase tracking-wider">{t('materialize.commitLabel')}</span>
                                  <span className="text-[#9eacc0] font-mono leading-relaxed truncate" title={materializePlan.commitMessage}>{materializePlan.commitMessage}</span>
                                </div>
                              </div>

                              {/* Scrollable IDEA.md (flex-1 to occupy the rest of the height) */}
                              <div className="flex-1 flex flex-col min-h-0 gap-1.5 select-text">
                                <div className="flex items-center justify-between shrink-0">
                                  <span className="text-[9px] text-[#697789] uppercase tracking-wider font-bold">IDEA.md</span>
                                  <CopyButton text={materializePlan.ideaMarkdown} />
                                </div>
                                <pre className="flex-1 overflow-y-auto bg-[#020f1e] border border-[#2D2E39] rounded p-3 text-[10px] leading-relaxed text-[#cbc3d7] whitespace-pre-wrap font-mono select-text">
                                  {materializePlan.ideaMarkdown}
                                </pre>
                              </div>
                            </div>
                          ) : (
                            /* ---- LOW MODE: Side-by-Side 2-Column Layout ---- */
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-1 flex-1 min-h-0 select-text overflow-y-auto">
                              {/* Left side: details (2/5 width) */}
                              <div className="md:col-span-2 flex flex-col gap-2.5 text-[11px] border border-[#5ed8ff]/10 rounded-md p-3 bg-[#5ed8ff]/[0.01] self-start shrink-0">
                                <div className="flex flex-col gap-1 border-b border-[#5ed8ff]/10 pb-1.5">
                                  <span className="text-[9px] text-[#697789] uppercase tracking-wider">{t('materialize.branchLabel')}</span>
                                  <span className="text-[#a3f185] font-bold break-all font-mono">{materializePlan.branchName}</span>
                                </div>
                                <div className="flex flex-col gap-1 border-b border-[#5ed8ff]/10 pb-1.5">
                                  <span className="text-[9px] text-[#697789] uppercase tracking-wider">{t('materialize.tagLabel')}</span>
                                  <span className="text-[#5ed8ff] font-bold break-all font-mono">{materializePlan.tagName}</span>
                                </div>
                                <div className="flex flex-col gap-1 border-b border-[#5ed8ff]/10 pb-1.5">
                                  <span className="text-[9px] text-[#697789] uppercase tracking-wider">{t('materialize.flightLabel')}</span>
                                  <span className="text-[#5ed8ff] font-mono">{materializePlan.flightLevel}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] text-[#697789] uppercase tracking-wider">{t('materialize.commitLabel')}</span>
                                  <span className="text-[#9eacc0] font-mono leading-relaxed">{materializePlan.commitMessage}</span>
                                </div>
                              </div>

                              {/* Right side: IDEA.md content preview (3/5 width) */}
                              <div className="md:col-span-3 flex flex-col gap-1.5 min-h-[180px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-[#697789] uppercase tracking-wider font-bold">IDEA.md</span>
                                  <CopyButton text={materializePlan.ideaMarkdown} />
                                </div>
                                <pre className="max-h-[220px] overflow-y-auto bg-[#020f1e] border border-[#2D2E39] rounded p-3 text-[10px] leading-relaxed text-[#cbc3d7] whitespace-pre-wrap font-mono select-text">
                                  {materializePlan.ideaMarkdown}
                                </pre>
                              </div>
                            </div>
                          )}

                          {materializeError && (
                            <p className="text-[10px] text-[#fd9d1a] mt-1 font-mono shrink-0">Error: {materializeError}</p>
                          )}
                        </div>
                      )
                    ) : speculativeDialogue ? (
                      /* ---- BRANCH SELECTED — report with reasoning ---- */
                      <div className="flex flex-col gap-2.5 animate-in fade-in duration-200 select-text">
                        {/* Header: Materializar + Cerrar */}
                        <div className="flex items-center justify-between border-b border-[#5ed8ff]/20 pb-2">
                          <span className="text-[12px] font-bold text-[#5ed8ff] tracking-wider uppercase">
                            {t('centauro.reportHeading')}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSpeculativeId(null);
                                cancelMaterialize();
                              }}
                              className="px-3 py-1.5 border border-[#3c495a]/60 hover:border-[#697789] text-[#9eacc0] rounded text-[10px] uppercase tracking-wider cursor-pointer transition-all font-mono"
                            >
                              {t('common.close')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openMaterializeConfirm(); }}
                              className="px-3 py-1.5 bg-[#a3f185]/15 text-[#a3f185] border border-[#a3f185]/40 hover:bg-[#a3f185]/25 hover:border-[#a3f185]/70 rounded font-mono text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all duration-150"
                            >
                              {t('centauro.materialize')}
                            </button>
                          </div>
                        </div>

                          {/* Rationale — bordered box */}
                          <div className="border border-[#5ed8ff]/15 rounded-md px-3 py-2 bg-[#5ed8ff]/[0.03]">
                            <p className="text-[11px] leading-relaxed text-[#c0d4f0] whitespace-pre-line font-sans">
                              {speculativeDialogue.turns[0]?.text.split('\n\n')[1]?.trim() || speculativeDialogue.turns[0]?.text || ''}
                            </p>
                          </div>

                          {/* Reasoning — extended prose in paragraphs */}
                          {selectedBranchReasoning ? (
                            <div className="flex flex-col gap-2">
                              {renderReasoningParagraphs(selectedBranchReasoning).map((p, i) => (
                                <p key={i} className="text-[11px] leading-relaxed text-[#d9e7fc] whitespace-pre-line font-sans">
                                  {p}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-[#697789]/70 italic leading-relaxed">
                              {t('centauro.oldPrediction')}
                            </p>
                          )}

                          {/* Type + confidence metadata */}
                          <div className="flex items-center gap-3 text-[9px] text-[#697789] border-t border-[#d9e7fc]/8 pt-1.5">
                            <span>{t('centauro.typeLabel')} <span className="text-[#5ed8ff]">{selectedSpeculativeBranch?.type}</span></span>
                            <span>{t('centauro.confidenceLabel')} <span className="text-[#5ed8ff]">{Math.round((selectedSpeculativeBranch?.confidence ?? 0) * 100)}%</span></span>
                          </div>

                          {/* Juzgar buttons */}
                          <div className="flex items-center gap-2 pt-1 border-t border-[#d9e7fc]/10">
                            <span className="text-[9px] text-[#697789] uppercase tracking-wider mr-1 shrink-0">{t('centauro.judge')}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); recordBranchDecision('accepted'); }}
                              className={cn(
                                'px-2.5 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all duration-150',
                                selectedBranchDecision?.outcome === 'accepted'
                                  ? 'bg-[#a3f185]/20 text-[#a3f185] border border-[#a3f185]/50'
                                  : 'text-[#a3f185]/50 border border-transparent hover:text-[#a3f185] hover:border-[#a3f185]/30 hover:bg-[#a3f185]/8',
                              )}
                            >
                              {t('centauro.accept')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); recordBranchDecision('rejected'); }}
                              className={cn(
                                'px-2.5 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all duration-150',
                                selectedBranchDecision?.outcome === 'rejected'
                                  ? 'bg-[#dc6a6a]/15 text-[#dc6a6a] border border-[#dc6a6a]/40'
                                  : 'text-[#dc6a6a]/40 border border-transparent hover:text-[#dc6a6a] hover:border-[#dc6a6a]/25 hover:bg-[#dc6a6a]/6',
                              )}
                            >
                              {t('centauro.reject')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); recordBranchDecision('deferred'); }}
                              className={cn(
                                'px-2.5 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all duration-150',
                                selectedBranchDecision?.outcome === 'deferred'
                                  ? 'bg-[#fd9d1a]/15 text-[#fd9d1a] border border-[#fd9d1a]/40'
                                  : 'text-[#fd9d1a]/40 border border-transparent hover:text-[#fd9d1a] hover:border-[#fd9d1a]/25 hover:bg-[#fd9d1a]/6',
                              )}
                            >
                              {t('centauro.defer')}
                            </button>
                          </div>
                        </div>
                      ) : selectedCommit ? (
                        /* ---- TARGET_LOCKED — commit selected ---- */
                        <div className="flex flex-col gap-1 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between border-b border-[#5ed8ff]/20 pb-1.5 mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <Crosshair size={10} className="text-[#5ed8ff]" />
                              <span className="text-[11px] font-bold text-[#5ed8ff] tracking-wider uppercase">
                                TARGET_LOCKED // LOCK_STABLE
                              </span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(selectedCommit.hash); }}
                              className="px-1.5 py-0.5 border border-[#5ed8ff]/35 hover:border-[#5ed8ff]/75 text-[#5ed8ff] hover:bg-[#5ed8ff]/10 rounded font-mono text-[7px] tracking-wider transition-all duration-150 uppercase cursor-pointer"
                            >
                              {t('centauro.copySha')}
                            </button>
                          </div>
                          <div className="flex flex-col gap-0.5 text-[8.5px] text-[#9eacc0]">
                            <div className="flex items-center justify-between">
                              <span>SHA // <span className="text-[#5ed8ff] font-bold">{selectedCommit.shortHash.toUpperCase()}</span></span>
                              <span className="text-[7.5px] opacity-80">{new Date(selectedCommit.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}</span>
                            </div>
                            <div className="truncate text-[#d9e7fc] text-[9px] font-semibold border-l-2 border-[#5ed8ff]/50 pl-1.5 my-0.5">
                              {selectedCommit.message}
                            </div>
                            <div className="flex items-center justify-between text-[7.5px] text-[#697789] pt-0.5 border-t border-[#3c495a]/15">
                              <span className="truncate max-w-[140px]">AUTHOR: {selectedCommit.authorName.toUpperCase()}</span>
                              <span className="truncate max-w-[150px]">PARENT: {selectedCommit.parents[0]?.substring(0, 7).toUpperCase() || 'ROOT'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* ---- IDLE — no branch selected. Show summary or composed list ---- */
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 border-b border-[#5ed8ff]/20 pb-1.5">
                            <Compass size={10} className="text-[#697789]" />
                            <span className="text-[10px] font-bold text-[#697789] tracking-wider uppercase">
                              TARGET_ACQUISITION // SCANNING
                            </span>
                          </div>
                          {speculativeBranches.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              <p className="text-[10px] text-[#697789]/70 italic">
                                {t('centauro.clickHint')}
                              </p>
                              <div className="flex flex-col gap-0.5">
                                {speculativeBranches.map((b, bi) => {
                                  const d = decisions[b.message];
                                  const branchColor = d ? OUTCOME_COLOR[d.outcome] : '#5ed8ff';
                                  const num = b.predictionIndex ?? (bi + 1);
                                  return (
                                  <button
                                    key={b.id}
                                    onClick={() => handleSelectSpeculative(b.id)}
                                    className="flex items-center gap-2 border-l-2 border-[#5ed8ff]/20 pl-2 py-0.5 cursor-pointer hover:border-[#5ed8ff]/60 hover:bg-[#5ed8ff]/5 transition-colors text-left w-full"
                                  >
                                    <span
                                      className="text-[9px] font-bold shrink-0 w-5 text-center"
                                      style={{ color: branchColor }}
                                    >
                                      #{num}
                                    </span>
                                    <span className="text-[10px] text-[#d9e7fc]/80 truncate flex-1">{b.message}</span>
                                    <span className="text-[9px] text-[#5ed8ff]/60 shrink-0">{b.type}</span>
                                    <span className="text-[9px] text-[#697789]/50 shrink-0 w-8 text-right">{Math.round(b.confidence * 100)}%</span>
                                  </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-[#697789]/70">
                              {t('centauro.noPredictions')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ---- HISTORY TAB — decision log ---- */
                    <div className="px-4 py-2.5">
                      {allDecisions.length > 0 ? (
                        <div className="flex flex-col gap-1 font-mono">
                          {allDecisions.map((d, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 border-l-2 pl-2 border-[#d9e7fc]/8 hover:border-[#5ed8ff]/20 transition-colors">
                              <div className="flex flex-col min-w-0 flex-1 leading-snug">
                                <span className="truncate text-[10px] text-[#d9e7fc]/80">{d.suggestionTitle}</span>
                                <span className="text-[9px] text-[#697789]/70">{formatDecisionDate(d.date)}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[9px] text-[#697789]/50 font-mono">{Math.round(d.confidence * 100)}%</span>
                                <span
                                  className="text-[9px] font-bold tracking-wider uppercase rounded px-1.5 py-0.5 border"
                                  style={{
                                    color: OUTCOME_COLOR[d.outcome],
                                    borderColor: `${OUTCOME_COLOR[d.outcome]}40`,
                                    background: `${OUTCOME_COLOR[d.outcome]}10`,
                                  }}
                                >
                                  {t(`decision.${d.outcome}`)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#697789]/70 italic">
                          {t('centauro.noDecisions')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
