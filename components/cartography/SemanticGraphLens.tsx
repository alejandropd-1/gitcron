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
import { AlertTriangle, Columns3, FileCode, Loader2, Network, Waypoints } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import type { CartoGraph, CartoGraphStatus, CartoNode } from '@/lib/carto-types';
import {
  CARTO_ROLE_BY_ID,
  CARTO_ROLE_DEFINITIONS,
  classifyCartoRole,
  type CartoRoleDefinition,
} from '@/lib/carto-roles';

const MAX_RENDER_EDGES = 420;
const MAX_FOCUS_EDGES = 90;
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

type SemanticViewMode = 'columns' | 'nodes';

type GraphModel = {
  relationCount: Map<string, number>;
  dependencyCount: Map<string, number>;
  dependentCount: Map<string, number>;
  incomingToSelected: Set<string>;
  outgoingFromSelected: Set<string>;
  selectedEdges: CartoGraph['edges'];
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
  const [viewMode, setViewMode] = useState<SemanticViewMode>('columns');

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
      {viewMode === 'nodes' ? (
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
      ) : (
        <ColumnsGraph
          model={model}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
      )}

      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[min(56rem,calc(100%-1.5rem))] flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded border border-carto-accent/25 bg-carto-canvas/90 px-2.5 py-1.5 text-[11px] text-carto-text-muted shadow-lg shadow-black/20">
          <Network size={13} className="text-carto-accent" />
          <span className="font-mono">
            {t('cartography.semantic.stats', {
              nodes: graph.nodes.length,
              totalNodes: graph.totals.nodes,
              edges: viewMode === 'nodes' ? model.selectedEdges.length : graph.edges.length,
              totalEdges: graph.totals.edges,
            })}
          </span>
        </div>
        <div className="pointer-events-auto flex overflow-hidden rounded border border-carto-grid bg-carto-canvas/90 p-0.5">
          <ModeButton
            active={viewMode === 'columns'}
            icon={<Columns3 size={12} />}
            label={t('cartography.semantic.view.columns')}
            onClick={() => setViewMode('columns')}
          />
          <ModeButton
            active={viewMode === 'nodes'}
            icon={<Waypoints size={12} />}
            label={t('cartography.semantic.view.nodes')}
            onClick={() => setViewMode('nodes')}
          />
        </div>
        {viewMode === 'nodes' && !selectedNodeId ? (
          <div className="pointer-events-auto rounded border border-carto-grid bg-carto-canvas/90 px-2.5 py-1.5 text-[11px] font-semibold text-carto-text-muted">
            {t('cartography.semantic.selectNodeForLinks')}
          </div>
        ) : null}
        {graph.truncated || (viewMode === 'nodes' && model.selectedEdges.length >= MAX_FOCUS_EDGES) ? (
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
  const relationCount = new Map<string, number>();
  const dependencyCount = new Map<string, number>();
  const dependentCount = new Map<string, number>();
  const incomingToSelected = new Set<string>();
  const outgoingFromSelected = new Set<string>();
  const byRole = new Map<string, CartoNode[]>();
  for (const role of CARTO_ROLE_DEFINITIONS) byRole.set(role.id, []);
  if (!graph) {
    return {
      relationCount,
      dependencyCount,
      dependentCount,
      incomingToSelected,
      outgoingFromSelected,
      selectedEdges: [],
      groupedNodes: CARTO_ROLE_DEFINITIONS.map((role) => ({ role, label: t(role.labelKey), nodes: [] })),
    };
  }

  const selectedEdges: CartoGraph['edges'] = [];
  for (const edge of graph.edges) {
    relationCount.set(edge.fromId, (relationCount.get(edge.fromId) ?? 0) + 1);
    relationCount.set(edge.toId, (relationCount.get(edge.toId) ?? 0) + 1);
    dependencyCount.set(edge.fromId, (dependencyCount.get(edge.fromId) ?? 0) + 1);
    dependentCount.set(edge.toId, (dependentCount.get(edge.toId) ?? 0) + 1);
    if (selectedNodeId && edge.fromId === selectedNodeId) {
      outgoingFromSelected.add(edge.toId);
      selectedEdges.push(edge);
    }
    if (selectedNodeId && edge.toId === selectedNodeId) {
      incomingToSelected.add(edge.fromId);
      selectedEdges.push(edge);
    }
  }

  for (const node of graph.nodes) {
    byRole.get(classifyCartoRole(node))?.push(node);
  }
  const groupedNodes = CARTO_ROLE_DEFINITIONS.map((role) => ({
    role,
    label: t(role.labelKey),
    nodes: (byRole.get(role.id) ?? []).sort((a, b) => {
      const byRelations = (relationCount.get(b.id) ?? 0) - (relationCount.get(a.id) ?? 0);
      return byRelations || a.filePath.localeCompare(b.filePath);
    }),
  }));

  return {
    relationCount,
    dependencyCount,
    dependentCount,
    incomingToSelected,
    outgoingFromSelected,
    selectedEdges: selectedEdges.slice(0, MAX_FOCUS_EDGES),
    groupedNodes,
  };
}

function buildFlow(
  graph: CartoGraph | null,
  model: GraphModel,
  selectedNodeId: string | null,
): { nodes: SemanticFlowNode[]; edges: FlowEdge[] } {
  if (!graph) return { nodes: [], edges: [] };
  const nodes: SemanticFlowNode[] = [];
  model.groupedNodes.forEach(({ role, label, nodes: items }, roleIndex) => {
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
          roleLabel: label,
          relationCount: model.relationCount.get(cartoNode.id) ?? 0,
        },
      });
    });
  });

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

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-bold uppercase transition-colors ${
        active ? 'bg-carto-accent/20 text-carto-accent' : 'text-carto-text-muted hover:text-carto-text'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ColumnsGraph({
  model,
  selectedNodeId,
  onSelectNode,
}: {
  model: GraphModel;
  selectedNodeId: string | null;
  onSelectNode: (node: CartoNode) => void;
}) {
  const t = useT();
  return (
    <div className="carto-columns-map h-full min-h-0 overflow-x-auto overflow-y-hidden px-5 pb-12 pt-16">
      <div className="flex h-full min-w-max gap-4">
        {model.groupedNodes.map(({ role, label, nodes }) => (
          <section
            key={role.id}
            className="carto-role-column flex h-full w-72 shrink-0 flex-col"
            style={{ '--carto-role-color': role.color } as CSSProperties}
          >
            <header className="carto-role-column__header">
              <span className="carto-role-column__dot" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xs font-bold uppercase text-carto-text">
                  {label}
                </h3>
                <p className="font-mono text-[10px] text-carto-text-muted">
                  {t('cartography.semantic.filesCount', { count: nodes.length })}
                </p>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              <div className="flex flex-col gap-2">
                {nodes.map((node) => (
                  <ColumnFileCard
                    key={node.id}
                    node={node}
                    role={role}
                    selected={node.id === selectedNodeId}
                    incoming={model.incomingToSelected.has(node.id)}
                    outgoing={model.outgoingFromSelected.has(node.id)}
                    dimmed={Boolean(
                      selectedNodeId &&
                        node.id !== selectedNodeId &&
                        !model.incomingToSelected.has(node.id) &&
                        !model.outgoingFromSelected.has(node.id),
                    )}
                    dependencies={model.dependencyCount.get(node.id) ?? 0}
                    dependents={model.dependentCount.get(node.id) ?? 0}
                    onSelect={() => onSelectNode(node)}
                  />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ColumnFileCard({
  node,
  role,
  selected,
  incoming,
  outgoing,
  dimmed,
  dependencies,
  dependents,
  onSelect,
}: {
  node: CartoNode;
  role: CartoRoleDefinition;
  selected: boolean;
  incoming: boolean;
  outgoing: boolean;
  dimmed: boolean;
  dependencies: number;
  dependents: number;
  onSelect: () => void;
}) {
  const t = useT();
  const file = node.filePath.split('/').at(-1) ?? node.name;
  const dir = node.filePath.includes('/') ? node.filePath.split('/').slice(0, -1).join('/') : '.';
  return (
    <button
      type="button"
      onClick={onSelect}
      title={node.filePath}
      className={`carto-column-card ${selected ? 'is-selected' : ''} ${incoming ? 'is-incoming' : ''} ${
        outgoing ? 'is-outgoing' : ''
      } ${dimmed ? 'is-dimmed' : ''}`}
      style={{ '--carto-role-color': role.color } as CSSProperties}
    >
      <span className="carto-column-card__rail" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate font-mono text-[11px] font-bold text-carto-text">{file}</span>
        <span className="block truncate font-mono text-[9px] text-carto-text-muted">{dir}</span>
        <span className="mt-1 flex gap-1.5 text-[9px] font-bold uppercase text-carto-text-muted">
          <span>{t('cartography.semantic.usesCount', { count: dependencies })}</span>
          <span>{t('cartography.semantic.usedByCount', { count: dependents })}</span>
        </span>
      </span>
      {selected || incoming || outgoing ? (
        <span className="carto-column-card__badge">
          {selected
            ? t('cartography.semantic.focus')
            : incoming
              ? t('cartography.semantic.usesFocus')
              : t('cartography.semantic.focusUses')}
        </span>
      ) : null}
    </button>
  );
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
