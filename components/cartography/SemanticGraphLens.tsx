'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge as FlowEdge,
  type Node as FlowNode,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import { AlertTriangle, FileCode, Loader2, Network } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type { CartoGraph, CartoGraphStatus, CartoNode } from '@/lib/carto-types';
import {
  CARTO_ROLE_BY_ID,
  CARTO_ROLE_DEFINITIONS,
  classifyCartoRole,
  type CartoRoleDefinition,
} from '@/lib/carto-roles';

const MAX_RENDER_EDGES = 420;
const NODE_W = 176;
const NODE_H = 82;
const ROLE_X = 430;
const ROLE_Y = 300;

type SemanticNodeData = Record<string, unknown> & {
  cartoNode: CartoNode;
  role: CartoRoleDefinition;
  roleLabel: string;
  relationCount: number;
};

type SemanticFlowNode = FlowNode<SemanticNodeData, 'cartoSemantic'>;

type SemanticGraphLensProps = {
  repoPath: string | null;
  status: CartoGraphStatus | null;
  refreshKey: number;
  selectedNodeId: string | null;
  onSelectNode: (node: CartoNode) => void;
};

const nodeTypes: NodeTypes = {
  cartoSemantic: SemanticFileNode,
};

export function SemanticGraphLens({
  repoPath,
  status,
  refreshKey,
  selectedNodeId,
  onSelectNode,
}: SemanticGraphLensProps) {
  const t = useT();
  const [graph, setGraph] = useState<CartoGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath) {
      setGraph(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (status?.state === 'error') {
      setGraph(null);
      setError(status.error ?? t('cartography.graph.error'));
      setLoading(false);
      return;
    }
    if (status?.state !== 'ready') {
      setGraph(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void window.api.cartoGraph
      .snapshot(repoPath)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setGraph(res.data);
        } else {
          setGraph(null);
          setError(res.error ?? t('cartography.graph.error'));
        }
      })
      .catch((err) => {
        if (!active) return;
        setGraph(null);
        setError(err instanceof Error ? err.message : t('cartography.graph.error'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repoPath, refreshKey, status?.state, status?.error, t]);

  const flow = useMemo(() => buildFlow(graph, t, selectedNodeId), [graph, selectedNodeId, t]);

  if (!repoPath) {
    return <GraphHint icon={<Network size={18} />} text={t('cartography.emptyHint')} />;
  }
  if (status?.state === 'indexing' || status?.state === 'idle') {
    return (
      <GraphHint
        icon={<Loader2 size={18} className="animate-spin" />}
        text={t('cartography.graph.indexing')}
      />
    );
  }
  if (loading) {
    return (
      <GraphHint
        icon={<Loader2 size={18} className="animate-spin" />}
        text={t('cartography.semantic.loading')}
      />
    );
  }
  if (error) {
    return <GraphHint icon={<AlertTriangle size={18} />} text={error} tone="error" />;
  }
  if (!graph || graph.nodes.length === 0) {
    return <GraphHint icon={<Network size={18} />} text={t('cartography.semantic.empty')} />;
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-carto-canvas">
      <ReactFlow<SemanticFlowNode, FlowEdge>
        className="carto-semantic-flow"
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.22}
        maxZoom={1.55}
        onNodeClick={(_event, node) => onSelectNode(node.data.cartoNode)}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={32}
          color="var(--color-carto-grid)"
          lineWidth={0.65}
        />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeColor={(node) => String((node.data as SemanticNodeData).role.color)}
          maskColor="rgba(4, 16, 29, 0.72)"
          className="carto-semantic-minimap"
        />
        <Controls className="carto-semantic-controls" showInteractive={false} />
      </ReactFlow>

      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[min(42rem,calc(100%-1.5rem))] flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded border border-carto-accent/25 bg-carto-canvas/90 px-2.5 py-1.5 text-[11px] text-carto-text-muted shadow-lg shadow-black/20">
          <Network size={13} className="text-carto-accent" />
          <span className="font-mono">
            {t('cartography.semantic.stats', {
              nodes: graph.nodes.length,
              totalNodes: graph.totals.nodes,
              edges: Math.min(graph.edges.length, MAX_RENDER_EDGES),
              totalEdges: graph.totals.edges,
            })}
          </span>
        </div>
        {graph.truncated || graph.edges.length > MAX_RENDER_EDGES ? (
          <div className="pointer-events-auto rounded border border-carto-accent/25 bg-carto-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-carto-accent">
            {t('cartography.semantic.limited')}
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
        {CARTO_ROLE_DEFINITIONS.map((role) => (
          <div
            key={role.id}
            className="pointer-events-auto flex items-center gap-1.5 rounded border border-carto-grid bg-carto-canvas/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-carto-text-muted"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: role.color }} />
            {t(role.labelKey)}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildFlow(
  graph: CartoGraph | null,
  t: ReturnType<typeof useT>,
  selectedNodeId: string | null,
): { nodes: SemanticFlowNode[]; edges: FlowEdge[] } {
  if (!graph) return { nodes: [], edges: [] };

  const relationCount = new Map<string, number>();
  for (const edge of graph.edges) {
    relationCount.set(edge.fromId, (relationCount.get(edge.fromId) ?? 0) + 1);
    relationCount.set(edge.toId, (relationCount.get(edge.toId) ?? 0) + 1);
  }

  const byRole = new Map<string, CartoNode[]>();
  for (const role of CARTO_ROLE_DEFINITIONS) byRole.set(role.id, []);
  for (const node of graph.nodes) {
    byRole.get(classifyCartoRole(node))?.push(node);
  }

  const nodes: SemanticFlowNode[] = [];
  CARTO_ROLE_DEFINITIONS.forEach((role, roleIndex) => {
    const items = (byRole.get(role.id) ?? []).sort((a, b) => a.filePath.localeCompare(b.filePath));
    const clusterX = (roleIndex % 3) * ROLE_X;
    const clusterY = Math.floor(roleIndex / 3) * ROLE_Y;
    const cols = Math.max(1, Math.ceil(Math.sqrt(items.length)));

    items.forEach((cartoNode, i) => {
      const x = clusterX + (i % cols) * (NODE_W + 34) + jitter(cartoNode.filePath, 1) - 34;
      const y = clusterY + Math.floor(i / cols) * (NODE_H + 30) + jitter(cartoNode.filePath, 2) - 24;
      nodes.push({
        id: cartoNode.id,
        type: 'cartoSemantic',
        position: { x, y },
        selected: cartoNode.id === selectedNodeId,
        data: {
          cartoNode,
          role: CARTO_ROLE_BY_ID[classifyCartoRole(cartoNode)],
          roleLabel: t(role.labelKey),
          relationCount: relationCount.get(cartoNode.id) ?? 0,
        },
      });
    });
  });

  const visibleIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges
    .filter((edge) => visibleIds.has(edge.fromId) && visibleIds.has(edge.toId))
    .slice(0, MAX_RENDER_EDGES)
    .map<FlowEdge>((edge, i) => ({
      id: `${edge.fromId}-${edge.toId}-${edge.relation}-${i}`,
      source: edge.fromId,
      target: edge.toId,
      type: 'smoothstep',
      interactionWidth: 14,
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-carto-edge)' },
      style: {
        stroke: 'var(--color-carto-edge)',
        strokeWidth: edge.relation === 'import' ? 1.35 : 1,
        opacity: 0.58,
      },
    }));

  return { nodes, edges };
}

function SemanticFileNode({ data, selected }: NodeProps<SemanticFlowNode>) {
  const node = data.cartoNode;
  const file = node.filePath.split('/').at(-1) ?? node.name;
  const dir = node.filePath.includes('/') ? node.filePath.split('/').slice(0, -1).join('/') : '.';

  return (
    <div
      className={`carto-semantic-node ${selected ? 'is-selected' : ''}`}
      style={{ '--carto-role-color': data.role.color } as CSSProperties}
      title={node.filePath}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div className="flex min-w-0 items-center gap-2">
        <span className="carto-semantic-node__icon">
          <FileCode size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11px] font-bold text-carto-text">{file}</p>
          <p className="truncate font-mono text-[9px] text-carto-text-muted">{dir}</p>
        </div>
        <span className="carto-semantic-node__count">{data.relationCount}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-carto-grid/70">
        <div className="h-full w-2/3 rounded-full" style={{ background: data.role.color }} />
      </div>
      <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wider text-carto-text-muted">
        {data.roleLabel}
      </p>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

function GraphHint({
  icon,
  text,
  tone = 'muted',
}: {
  icon: ReactNode;
  text: string;
  tone?: 'muted' | 'error';
}) {
  return (
    <div
      className={`flex h-full min-h-[14rem] flex-col items-center justify-center gap-2 px-6 text-center text-xs ${
        tone === 'error' ? 'text-[#ffa8a3]' : 'text-carto-text-muted'
      }`}
    >
      {icon}
      <p className="max-w-md leading-relaxed">{text}</p>
    </div>
  );
}

function jitter(input: string, salt: number): number {
  let h = salt * 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 38) - 19;
}
