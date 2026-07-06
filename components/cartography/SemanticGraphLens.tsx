'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge as FlowEdge,
  type Node as FlowNode,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import { AlertTriangle, ChevronDown, ChevronUp, FileCode, Layers3, Loader2, Network } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { buildGroupModel, type CartoGroupKeyFile, type CartoGroupModel } from '@/lib/carto-groups';
import {
  CARTO_ROLE_BY_ID,
  CARTO_ROLE_DEFINITIONS,
  classifyCartoRole,
  type CartoRoleDefinition,
  type CartoRoleId,
} from '@/lib/carto-roles';
import type { CartoGraph, CartoGraphStatus, CartoNode } from '@/lib/carto-types';
import { useGitStore } from '@/lib/git-store';

const MAX_FLOW_EDGES = 160;
const MAX_OVERVIEW_NODES_PER_ROLE = 8;
const NODE_W = 176;
const NODE_H = 82;
const GROUP_W = 276;
const GROUP_H = 164;
const GROUP_X = 360;
const GROUP_Y = 470;

type SemanticFileNodeData = Record<string, unknown> & {
  kind: 'file';
  cartoNode: CartoNode;
  role: CartoRoleDefinition;
  roleLabel: string;
  relationCount: number;
};

type SemanticGroupNodeData = Record<string, unknown> & {
  kind: 'group';
  role: CartoRoleDefinition;
  roleLabel: string;
  roleDescription: string;
  count: number;
  keyFiles: CartoGroupKeyFile[];
  summary?: string;
  expanded: boolean;
  hiddenCount: number;
  actionLabel: string;
  moreLabel: string;
  keyFilesLabel: string;
};

type SemanticFileFlowNode = FlowNode<SemanticFileNodeData, 'cartoSemanticFile'>;
type SemanticGroupFlowNode = FlowNode<SemanticGroupNodeData, 'cartoSemanticGroup'>;
type SemanticFlowNode = SemanticFileFlowNode | SemanticGroupFlowNode;

type SemanticGraphLensProps = {
  repoPath: string | null;
  status: CartoGraphStatus | null;
  refreshKey: number;
  selectedNodeId: string | null;
  onSelectNode: (node: CartoNode) => void;
};

type RoleGroup = {
  role: CartoRoleDefinition;
  label: string;
  nodes: CartoNode[];
  keyFiles: CartoGroupKeyFile[];
  summary?: string;
};

type GraphModel = {
  nodeById: Map<string, CartoNode>;
  roleByNodeId: Map<string, CartoRoleId>;
  relationCount: Map<string, number>;
  groups: RoleGroup[];
  groupModel: CartoGroupModel;
};

const nodeTypes: NodeTypes = {
  cartoSemanticFile: SemanticFileNode,
  cartoSemanticGroup: SemanticGroupNode,
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
  const expandedRoles = useGitStore((s) => {
    const repo = s.getActiveRepo();
    return repo?.path === repoPath ? repo.cartographyExpandedRoles : [];
  });
  const updateRepoByPath = useGitStore((s) => s.updateRepoByPath);

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

  const expandedRoleSet = useMemo(() => new Set<CartoRoleId>(expandedRoles), [expandedRoles]);
  const model = useMemo(() => buildGraphModel(graph, t), [graph, t]);
  const toggleGroup = useCallback(
    (role: CartoRoleId) => {
      if (!repoPath) return;
      const current = useGitStore.getState().openRepos.find((repo) => repo.path === repoPath);
      const set = new Set<CartoRoleId>(current?.cartographyExpandedRoles ?? []);
      if (set.has(role)) set.delete(role);
      else set.add(role);
      updateRepoByPath(repoPath, { cartographyExpandedRoles: [...set] });
    },
    [repoPath, updateRepoByPath],
  );
  const flow = useMemo(
    () => buildFlow(graph, model, expandedRoleSet, selectedNodeId, t),
    [graph, model, expandedRoleSet, selectedNodeId, t],
  );

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
  if (!graph || (graph.allNodes ?? graph.nodes).length === 0) {
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
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.2}
        maxZoom={1.55}
        onNodeClick={(_event, node) => {
          if (node.data.kind === 'group') {
            toggleGroup(node.data.role.id);
            return;
          }
          onSelectNode(node.data.cartoNode);
        }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={32}
          color="var(--color-carto-grid)"
          lineWidth={0.65}
        />
        <Controls className="carto-semantic-controls" showInteractive={false} />
      </ReactFlow>

      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[min(60rem,calc(100%-1.5rem))] flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded border border-carto-accent/25 bg-carto-canvas/90 px-2.5 py-1.5 text-[11px] text-carto-text-muted shadow-lg shadow-black/20">
          <Layers3 size={13} className="text-carto-accent" />
          <span className="font-mono">
            {t('cartography.semantic.groupStats', {
              groups: model.groups.length,
              nodes: flow.nodes.filter((node) => node.data.kind === 'file').length,
              edges: flow.edges.length,
            })}
          </span>
        </div>
        <div className="pointer-events-auto rounded border border-carto-grid bg-carto-canvas/90 px-2.5 py-1.5 text-[11px] font-semibold text-carto-text-muted">
          {expandedRoles.length > 0
            ? t('cartography.semantic.expandedGroups', { count: expandedRoles.length })
            : t('cartography.semantic.groupOverview')}
        </div>
        {graph.truncated || flow.edges.length >= MAX_FLOW_EDGES ? (
          <div className="pointer-events-auto rounded border border-carto-accent/25 bg-carto-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-carto-accent">
            {t('cartography.semantic.limited')}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildGraphModel(graph: CartoGraph | null, t: ReturnType<typeof useT>): GraphModel {
  const nodeById = new Map<string, CartoNode>();
  const roleByNodeId = new Map<string, CartoRoleId>();
  const relationCount = new Map<string, number>();
  if (!graph) {
    return { nodeById, roleByNodeId, relationCount, groups: [], groupModel: { groups: [], groupEdges: [] } };
  }

  const groupModel = buildGroupModel(graph);
  const nodes = graph.allNodes ?? graph.nodes;
  for (const node of nodes) {
    nodeById.set(node.id, node);
    roleByNodeId.set(node.id, classifyCartoRole(node));
  }
  for (const edge of graph.edges) {
    relationCount.set(edge.fromId, (relationCount.get(edge.fromId) ?? 0) + 1);
    relationCount.set(edge.toId, (relationCount.get(edge.toId) ?? 0) + 1);
  }

  const grouped = new Map<CartoRoleId, CartoNode[]>();
  for (const role of CARTO_ROLE_DEFINITIONS) grouped.set(role.id, []);
  for (const node of nodes) grouped.get(roleByNodeId.get(node.id) ?? classifyCartoRole(node))?.push(node);

  const groupByRole = new Map(groupModel.groups.map((group) => [group.role, group]));
  const groups = CARTO_ROLE_DEFINITIONS
    .map((role) => {
      const group = groupByRole.get(role.id);
      const roleNodes = [...(grouped.get(role.id) ?? [])].sort((a, b) => {
        const byRelations = (relationCount.get(b.id) ?? 0) - (relationCount.get(a.id) ?? 0);
        return byRelations || a.filePath.localeCompare(b.filePath);
      });
      return {
        role,
        label: t(role.labelKey),
        nodes: roleNodes,
        keyFiles: group?.keyFiles ?? [],
        summary: group?.summary,
      };
    })
    .filter((group) => group.nodes.length > 0);

  return { nodeById, roleByNodeId, relationCount, groups, groupModel };
}

function buildFlow(
  graph: CartoGraph | null,
  model: GraphModel,
  expandedRoles: Set<CartoRoleId>,
  selectedNodeId: string | null,
  t: ReturnType<typeof useT>,
): { nodes: SemanticFlowNode[]; edges: FlowEdge[] } {
  if (!graph) return { nodes: [], edges: [] };

  const nodes: SemanticFlowNode[] = [];
  const visibleIds = new Set<string>();
  const visibleFileIds = new Set<string>();
  const groupPositions = new Map<CartoRoleId, { x: number; y: number }>();

  model.groups.forEach((group, index) => {
    const position = groupPosition(index);
    groupPositions.set(group.role.id, position);
    const expanded = expandedRoles.has(group.role.id);
    const visibleGroupNodes = expanded ? group.nodes.slice(0, MAX_OVERVIEW_NODES_PER_ROLE) : [];
    const hiddenCount = expanded ? Math.max(0, group.nodes.length - visibleGroupNodes.length) : 0;
    const groupNodeIdValue = groupNodeId(group.role.id);
    visibleIds.add(groupNodeIdValue);
    nodes.push({
      id: groupNodeIdValue,
      type: 'cartoSemanticGroup',
      position,
      data: {
        kind: 'group',
        role: group.role,
        roleLabel: group.label,
        roleDescription: t(`cartography.panorama.roleDesc.${group.role.id}`),
        count: group.nodes.length,
        keyFiles: group.keyFiles,
        summary: group.summary,
        expanded,
        hiddenCount,
        actionLabel: expanded ? t('cartography.semantic.collapseGroup') : t('cartography.semantic.expandGroup'),
        moreLabel: t('cartography.semantic.moreFiles', { count: hiddenCount }),
        keyFilesLabel: t('cartography.panorama.keyFiles'),
      },
    });

    visibleGroupNodes.forEach((cartoNode, fileIndex) => {
      const role = CARTO_ROLE_BY_ID[model.roleByNodeId.get(cartoNode.id) ?? classifyCartoRole(cartoNode)];
      visibleIds.add(cartoNode.id);
      visibleFileIds.add(cartoNode.id);
      nodes.push({
        id: cartoNode.id,
        type: 'cartoSemanticFile',
        position: expandedFilePosition(position, fileIndex),
        selected: cartoNode.id === selectedNodeId,
        data: {
          kind: 'file',
          cartoNode,
          role,
          roleLabel: t(role.labelKey),
          relationCount: model.relationCount.get(cartoNode.id) ?? 0,
        },
      });
    });
  });

  return {
    nodes,
    edges: buildVisibleEdges(graph, model, expandedRoles, visibleIds, visibleFileIds),
  };
}

function buildVisibleEdges(
  graph: CartoGraph,
  model: GraphModel,
  expandedRoles: Set<CartoRoleId>,
  visibleIds: Set<string>,
  visibleFileIds: Set<string>,
): FlowEdge[] {
  if (expandedRoles.size === 0) {
    return model.groupModel.groupEdges.map((edge) => groupFlowEdge(edge.from, edge.to, edge.weight));
  }

  const aggregate = new Map<string, { source: string; target: string; weight: number }>();
  for (const edge of graph.edges) {
    const from = model.nodeById.get(edge.fromId);
    const to = model.nodeById.get(edge.toId);
    if (!from || !to) continue;

    const source = endpointId(from, model, expandedRoles, visibleFileIds);
    const target = endpointId(to, model, expandedRoles, visibleFileIds);
    if (source === target || !visibleIds.has(source) || !visibleIds.has(target)) continue;

    const key = `${source}->${target}`;
    const current = aggregate.get(key) ?? { source, target, weight: 0 };
    current.weight += 1;
    aggregate.set(key, current);
  }

  return [...aggregate.values()]
    .sort((a, b) => b.weight - a.weight || a.source.localeCompare(b.source) || a.target.localeCompare(b.target))
    .slice(0, MAX_FLOW_EDGES)
    .map((edge, index) => weightedFlowEdge(edge.source, edge.target, edge.weight, index));
}

function endpointId(
  node: CartoNode,
  model: GraphModel,
  expandedRoles: Set<CartoRoleId>,
  visibleFileIds: Set<string>,
): string {
  const role = model.roleByNodeId.get(node.id) ?? classifyCartoRole(node);
  if (expandedRoles.has(role) && visibleFileIds.has(node.id)) return node.id;
  return groupNodeId(role);
}

function groupFlowEdge(from: CartoRoleId, to: CartoRoleId, weight: number): FlowEdge {
  return weightedFlowEdge(groupNodeId(from), groupNodeId(to), weight, 0);
}

function weightedFlowEdge(source: string, target: string, weight: number, index: number): FlowEdge {
  return {
    id: `${source}-${target}-${index}`,
    source,
    target,
    type: 'smoothstep',
    label: String(weight),
    interactionWidth: 18,
    markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-carto-edge)' },
    style: {
      stroke: 'var(--color-carto-edge)',
      strokeWidth: Math.min(3.4, 1.15 + Math.log2(weight + 1) * 0.45),
      opacity: 0.84,
    },
    labelStyle: {
      fill: 'var(--color-carto-accent)',
      fontSize: 10,
      fontWeight: 800,
    },
    labelBgStyle: {
      fill: 'rgba(4, 16, 29, 0.92)',
      stroke: 'rgba(253, 179, 58, 0.24)',
      strokeWidth: 1,
    },
    labelBgPadding: [4, 3],
    labelBgBorderRadius: 4,
  };
}

function groupNodeId(role: CartoRoleId): string {
  return `carto-group:${role}`;
}

function groupPosition(index: number): { x: number; y: number } {
  return {
    x: (index % 3) * GROUP_X + jitter(`group-${index}`, 1),
    y: Math.floor(index / 3) * GROUP_Y + jitter(`group-${index}`, 2),
  };
}

function expandedFilePosition(group: { x: number; y: number }, index: number): { x: number; y: number } {
  const cols = 2;
  return {
    x: group.x + (index % cols) * (NODE_W + 26) + 3,
    y: group.y + GROUP_H + 46 + Math.floor(index / cols) * (NODE_H + 30),
  };
}

function SemanticGroupNode({ data }: NodeProps<SemanticGroupFlowNode>) {
  return (
    <div
      className={`carto-semantic-group ${data.expanded ? 'is-expanded' : ''}`}
      style={{ '--carto-role-color': data.role.color } as CSSProperties}
      title={data.actionLabel}
      data-testid={`carto-group-${data.role.id}`}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="carto-semantic-node__icon">
          <Layers3 size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-bold text-carto-text">{data.roleLabel}</p>
            <span className="carto-semantic-node__count">{data.count}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-carto-text-muted">
            {data.summary ?? data.roleDescription}
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-carto-grid/70 pt-2">
        <p className="mb-1.5 text-[9px] font-bold uppercase text-carto-text-muted">{data.keyFilesLabel}</p>
        <ul className="space-y-1">
          {data.keyFiles.slice(0, 3).map((file) => (
            <li key={file.node.id} className="flex min-w-0 items-center gap-1.5 text-[10px]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: data.role.color }} />
              <span className="min-w-0 flex-1 truncate font-mono text-carto-text">{file.node.filePath}</span>
              <span className="shrink-0 font-mono text-carto-text-muted">{file.degree}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold uppercase text-carto-accent">
        <span className="flex items-center gap-1">
          {data.expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {data.actionLabel}
        </span>
        {data.expanded && data.hiddenCount > 0 ? (
          <span className="rounded border border-carto-accent/25 px-1.5 py-0.5 font-mono">
            {data.moreLabel}
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

function SemanticFileNode({ data, selected }: NodeProps<SemanticFileFlowNode>) {
  const node = data.cartoNode;
  const file = node.filePath.split('/').at(-1) ?? node.name;
  const dir = node.filePath.includes('/') ? node.filePath.split('/').slice(0, -1).join('/') : '.';

  return (
    <div
      className={`carto-semantic-node ${selected ? 'is-selected' : ''}`}
      style={{ '--carto-role-color': data.role.color } as CSSProperties}
      title={node.filePath}
      data-testid={`carto-file-${node.id}`}
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
