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

const MAX_FOCUS_EDGES = 90;
const MAX_FOCUS_NEIGHBORS = 30;
const MAX_OVERVIEW_NODES_PER_ROLE = 8;
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

type GraphModel = {
  nodeById: Map<string, CartoNode>;
  relationCount: Map<string, number>;
  incomingToSelected: Set<string>;
  outgoingFromSelected: Set<string>;
  selectedEdges: CartoGraph['edges'];
  focusHiddenNeighbors: number;
  groupedNodes: Array<{
    role: CartoRoleDefinition;
    label: string;
    nodes: CartoNode[];
  }>;
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

  const model = useMemo(() => buildGraphModel(graph, t, selectedNodeId), [graph, selectedNodeId, t]);
  const flow = useMemo(() => buildFlow(graph, model, selectedNodeId), [graph, model, selectedNodeId]);

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
        onlyRenderVisibleElements
        snapToGrid
        snapGrid={[24, 24]}
        selectNodesOnDrag={false}
        nodeClickDistance={5}
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
        {flow.nodes.length <= 120 && (
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={2}
            nodeColor={(node) => String((node.data as SemanticNodeData).role.color)}
            maskColor="rgba(4, 16, 29, 0.72)"
            className="carto-semantic-minimap"
          />
        )}
        <Controls className="carto-semantic-controls" showInteractive={false} />
      </ReactFlow>

      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[min(56rem,calc(100%-1.5rem))] flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded border border-carto-accent/25 bg-carto-canvas/90 px-2.5 py-1.5 text-[11px] text-carto-text-muted shadow-lg shadow-black/20">
          <Network size={13} className="text-carto-accent" />
          <span className="font-mono">
            {t('cartography.semantic.stats', {
              nodes: flow.nodes.length,
              totalNodes: graph.totals.nodes,
              edges: model.selectedEdges.length,
              totalEdges: graph.totals.edges,
            })}
          </span>
        </div>
        {!selectedNodeId ? (
          <div className="pointer-events-auto rounded border border-carto-grid bg-carto-canvas/90 px-2.5 py-1.5 text-[11px] font-semibold text-carto-text-muted">
            {t('cartography.semantic.nodesOverview')}
          </div>
        ) : null}
        {selectedNodeId && model.focusHiddenNeighbors > 0 ? (
          <div className="pointer-events-auto rounded border border-carto-grid bg-carto-canvas/90 px-2.5 py-1.5 text-[11px] font-semibold text-carto-text-muted">
            {t('cartography.semantic.hiddenNeighbors', { count: model.focusHiddenNeighbors })}
          </div>
        ) : null}
        {graph.truncated || model.selectedEdges.length >= MAX_FOCUS_EDGES ? (
          <div className="pointer-events-auto rounded border border-carto-accent/25 bg-carto-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-carto-accent">
            {t('cartography.semantic.limited')}
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
        {CARTO_ROLE_DEFINITIONS.map((role) => (
          <div
            key={role.id}
            className="pointer-events-auto flex items-center gap-1.5 rounded border border-carto-grid bg-carto-canvas/90 px-2 py-1 text-[10px] font-bold uppercase text-carto-text-muted"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: role.color }} />
            {t(role.labelKey)}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildGraphModel(
  graph: CartoGraph | null,
  t: ReturnType<typeof useT>,
  selectedNodeId: string | null,
): GraphModel {
  const nodeById = new Map<string, CartoNode>();
  const relationCount = new Map<string, number>();
  const incomingToSelected = new Set<string>();
  const outgoingFromSelected = new Set<string>();
  const byRole = new Map<string, CartoNode[]>();
  for (const role of CARTO_ROLE_DEFINITIONS) byRole.set(role.id, []);
  if (!graph) {
    return {
      nodeById,
      relationCount,
      incomingToSelected,
      outgoingFromSelected,
      selectedEdges: [],
      focusHiddenNeighbors: 0,
      groupedNodes: CARTO_ROLE_DEFINITIONS.map((role) => ({ role, label: t(role.labelKey), nodes: [] })),
    };
  }

  const roleNodes = graph.allNodes ?? graph.nodes;
  for (const edge of graph.edges) {
    relationCount.set(edge.fromId, (relationCount.get(edge.fromId) ?? 0) + 1);
    relationCount.set(edge.toId, (relationCount.get(edge.toId) ?? 0) + 1);
    if (selectedNodeId && edge.fromId === selectedNodeId) {
      outgoingFromSelected.add(edge.toId);
    }
    if (selectedNodeId && edge.toId === selectedNodeId) {
      incomingToSelected.add(edge.fromId);
    }
  }

  for (const node of roleNodes) {
    nodeById.set(node.id, node);
    byRole.get(classifyCartoRole(node))?.push(node);
  }

  const focus = selectedNodeId
    ? pickFocusEdges(graph.edges, selectedNodeId, relationCount)
    : { edges: [] as CartoGraph['edges'], hiddenNeighbors: 0 };
  const groupedNodes = CARTO_ROLE_DEFINITIONS.map((role) => ({
    role,
    label: t(role.labelKey),
    nodes: (byRole.get(role.id) ?? []).sort((a, b) => {
      const byRelations = (relationCount.get(b.id) ?? 0) - (relationCount.get(a.id) ?? 0);
      return byRelations || a.filePath.localeCompare(b.filePath);
    }),
  }));

  return {
    nodeById,
    relationCount,
    incomingToSelected,
    outgoingFromSelected,
    selectedEdges: focus.edges,
    focusHiddenNeighbors: focus.hiddenNeighbors,
    groupedNodes,
  };
}

function pickFocusEdges(
  edges: CartoGraph['edges'],
  selectedNodeId: string,
  relationCount: Map<string, number>,
): { edges: CartoGraph['edges']; hiddenNeighbors: number } {
  const directEdges = edges.filter((edge) => edge.fromId === selectedNodeId || edge.toId === selectedNodeId);
  const neighborIds = new Set(
    directEdges.map((edge) => (edge.fromId === selectedNodeId ? edge.toId : edge.fromId)),
  );
  const rankedNeighborIds = [...neighborIds].sort((a, b) => {
    const byRelations = (relationCount.get(b) ?? 0) - (relationCount.get(a) ?? 0);
    return byRelations || a.localeCompare(b);
  });
  const visibleNeighborIds = new Set(rankedNeighborIds.slice(0, MAX_FOCUS_NEIGHBORS));
  const visibleEdges = directEdges
    .filter((edge) => {
      const neighborId = edge.fromId === selectedNodeId ? edge.toId : edge.fromId;
      return visibleNeighborIds.has(neighborId);
    })
    .slice(0, MAX_FOCUS_EDGES);

  return {
    edges: visibleEdges,
    hiddenNeighbors: Math.max(0, neighborIds.size - visibleNeighborIds.size),
  };
}

function buildFlow(
  graph: CartoGraph | null,
  model: GraphModel,
  selectedNodeId: string | null,
): { nodes: SemanticFlowNode[]; edges: FlowEdge[] } {
  if (!graph) return { nodes: [], edges: [] };
  const nodes: SemanticFlowNode[] = [];
  if (selectedNodeId && model.nodeById.has(selectedNodeId)) {
    const addedNodeIds = new Set<string>();
    const selectedNode = model.nodeById.get(selectedNodeId);
    if (selectedNode) {
      pushFlowNode(nodes, selectedNode, model, { x: 0, y: 0 }, selectedNodeId);
      addedNodeIds.add(selectedNode.id);
    }
    const incoming = [...model.incomingToSelected]
      .filter((id) => model.selectedEdges.some((edge) => edge.fromId === id))
      .sort((a, b) => (model.relationCount.get(b) ?? 0) - (model.relationCount.get(a) ?? 0));
    const outgoing = [...model.outgoingFromSelected]
      .filter((id) => model.selectedEdges.some((edge) => edge.toId === id))
      .sort((a, b) => (model.relationCount.get(b) ?? 0) - (model.relationCount.get(a) ?? 0));

    incoming.forEach((id, index) => {
      const node = model.nodeById.get(id);
      if (node && !addedNodeIds.has(node.id)) {
        pushFlowNode(nodes, node, model, focusPosition('incoming', index, incoming.length), selectedNodeId);
        addedNodeIds.add(node.id);
      }
    });
    outgoing.forEach((id, index) => {
      const node = model.nodeById.get(id);
      if (node && !addedNodeIds.has(node.id)) {
        pushFlowNode(nodes, node, model, focusPosition('outgoing', index, outgoing.length), selectedNodeId);
        addedNodeIds.add(node.id);
      }
    });
  } else {
    model.groupedNodes.forEach(({ nodes: items }, roleIndex) => {
      items.slice(0, MAX_OVERVIEW_NODES_PER_ROLE).forEach((cartoNode, index) => {
        pushFlowNode(nodes, cartoNode, model, overviewPosition(roleIndex, index), selectedNodeId);
      });
    });
  }

  const visibleIds = new Set(nodes.map((node) => node.id));
  const edges = model.selectedEdges
    .filter((edge) => visibleIds.has(edge.fromId) && visibleIds.has(edge.toId))
    .map<FlowEdge>((edge, i) => ({
      id: `${edge.fromId}-${edge.toId}-${edge.relation}-${i}`,
      source: edge.fromId,
      target: edge.toId,
      type: 'smoothstep',
      interactionWidth: 14,
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-carto-edge)' },
      style: {
        stroke: 'var(--color-carto-edge)',
        strokeWidth: edge.fromId === selectedNodeId || edge.toId === selectedNodeId ? 2 : 1,
        opacity: 0.82,
      },
    }));

  return { nodes, edges };
}

function pushFlowNode(
  nodes: SemanticFlowNode[],
  cartoNode: CartoNode,
  model: GraphModel,
  position: { x: number; y: number },
  selectedNodeId: string | null,
) {
  const role = CARTO_ROLE_BY_ID[classifyCartoRole(cartoNode)];
  nodes.push({
    id: cartoNode.id,
    type: 'cartoSemantic',
    position,
    selected: cartoNode.id === selectedNodeId,
    data: {
      cartoNode,
      role,
      roleLabel: role ? model.groupedNodes.find((group) => group.role.id === role.id)?.label ?? role.id : '',
      relationCount: model.relationCount.get(cartoNode.id) ?? 0,
    },
  });
}

function focusPosition(kind: 'incoming' | 'outgoing', index: number, total: number): { x: number; y: number } {
  const side = kind === 'incoming' ? -1 : 1;
  const rowsPerColumn = 10;
  const column = Math.floor(index / rowsPerColumn);
  const row = index % rowsPerColumn;
  const rows = Math.min(rowsPerColumn, total - column * rowsPerColumn);
  const stepY = NODE_H + 34;
  const x = side * (310 + column * (NODE_W + 58));
  const y = row * stepY - ((rows - 1) * stepY) / 2;
  return { x: x + jitter(`${kind}-${index}`, 1), y };
}

function overviewPosition(roleIndex: number, index: number): { x: number; y: number } {
  const clusterX = (roleIndex % 3) * ROLE_X;
  const clusterY = Math.floor(roleIndex / 3) * ROLE_Y;
  const cols = 2;
  return {
    x: clusterX + (index % cols) * (NODE_W + 36) + jitter(`${roleIndex}-${index}`, 1) - 22,
    y: clusterY + Math.floor(index / cols) * (NODE_H + 32) + jitter(`${roleIndex}-${index}`, 2) - 18,
  };
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
      <p className="mt-1 truncate text-[9px] font-bold uppercase text-carto-text-muted">
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
