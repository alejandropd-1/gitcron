import type { CartoGraph, CartoNode } from './carto-types';
import {
  CARTO_ROLE_DEFINITIONS,
  CARTO_ROLE_BY_ID,
  classifyCartoRole,
  type CartoRoleId,
} from './carto-roles';

export interface CartoPanoramaFile {
  node: CartoNode;
  degree: number;
  imports: number;
  usedBy: number;
}

export interface CartoPanoramaGroup {
  id: CartoRoleId;
  labelKey: string;
  color: string;
  fileCount: number;
  files: CartoPanoramaFile[];
  keyFiles: CartoPanoramaFile[];
}

export interface CartoPanoramaLink {
  fromRole: CartoRoleId;
  toRole: CartoRoleId;
  count: number;
  samples: Array<{ fromPath: string; toPath: string }>;
}

export interface CartoPanoramaModel {
  structureHash: string;
  generatedAt: number;
  groups: CartoPanoramaGroup[];
  links: CartoPanoramaLink[];
  totals: CartoGraph['totals'];
  truncated: boolean;
}

const KEY_FILE_CAP = 5;
const GROUP_LINK_CAP = 8;
const LINK_SAMPLE_CAP = 4;

function stableHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function rankFile(a: CartoPanoramaFile, b: CartoPanoramaFile): number {
  return (
    b.degree - a.degree ||
    b.usedBy - a.usedBy ||
    b.imports - a.imports ||
    a.node.filePath.localeCompare(b.node.filePath)
  );
}

function roleOrder(role: CartoRoleId): number {
  return CARTO_ROLE_DEFINITIONS.findIndex((r) => r.id === role);
}

function buildStructureHash(graph: CartoGraph, roleByNodeId: Map<string, CartoRoleId>): string {
  const nodes = graph.allNodes ?? graph.nodes;
  const nodePart = nodes
    .map((n) => `${n.filePath}:${roleByNodeId.get(n.id) ?? classifyCartoRole(n)}`)
    .sort()
    .join('|');
  const edgePart = graph.edges
    .map((e) => `${e.fromId}>${e.toId}:${e.relation}`)
    .sort()
    .join('|');
  return `panorama-v1-${stableHash(`${nodePart}\n${edgePart}`)}`;
}

function createRoleMap(nodes: CartoNode[]): Map<string, CartoRoleId> {
  const roleByNodeId = new Map<string, CartoRoleId>();
  for (const node of nodes) roleByNodeId.set(node.id, classifyCartoRole(node));
  return roleByNodeId;
}

type GroupLinkAccumulator = Map<
  string,
  {
    fromRole: CartoRoleId;
    toRole: CartoRoleId;
    count: number;
    samples: Array<{ fromPath: string; toPath: string }>;
  }
>;

function collectEdgeStats(
  graph: CartoGraph,
  nodeById: Map<string, CartoNode>,
  roleByNodeId: Map<string, CartoRoleId>,
) {
  const importsByNode = new Map<string, number>();
  const usedByNode = new Map<string, number>();
  const groupLinkByKey: GroupLinkAccumulator = new Map();

  for (const edge of graph.edges) {
    const from = nodeById.get(edge.fromId);
    const to = nodeById.get(edge.toId);
    if (!from || !to || from.id === to.id) continue;

    importsByNode.set(from.id, (importsByNode.get(from.id) ?? 0) + 1);
    usedByNode.set(to.id, (usedByNode.get(to.id) ?? 0) + 1);

    const fromRole = roleByNodeId.get(from.id) ?? classifyCartoRole(from);
    const toRole = roleByNodeId.get(to.id) ?? classifyCartoRole(to);
    if (fromRole === toRole) continue;

    const key = `${fromRole}->${toRole}`;
    const link = groupLinkByKey.get(key) ?? { fromRole, toRole, count: 0, samples: [] };
    link.count += 1;
    if (link.samples.length < LINK_SAMPLE_CAP) {
      link.samples.push({ fromPath: from.filePath, toPath: to.filePath });
    }
    groupLinkByKey.set(key, link);
  }
  return { importsByNode, usedByNode, groupLinkByKey };
}

function createGroups(
  nodes: CartoNode[],
  roleByNodeId: Map<string, CartoRoleId>,
  importsByNode: Map<string, number>,
  usedByNode: Map<string, number>,
): CartoPanoramaGroup[] {
  const filesByRole = new Map<CartoRoleId, CartoPanoramaFile[]>();
  for (const node of nodes) {
    const role = roleByNodeId.get(node.id) ?? classifyCartoRole(node);
    const imports = importsByNode.get(node.id) ?? 0;
    const usedBy = usedByNode.get(node.id) ?? 0;
    const file = { node, degree: imports + usedBy, imports, usedBy };
    const files = filesByRole.get(role) ?? [];
    files.push(file);
    filesByRole.set(role, files);
  }

  const groups = CARTO_ROLE_DEFINITIONS.map((role) => {
    const files = [...(filesByRole.get(role.id) ?? [])].sort(rankFile);
    return {
      id: role.id,
      labelKey: role.labelKey,
      color: role.color,
      fileCount: files.length,
      files,
      keyFiles: files.slice(0, KEY_FILE_CAP),
    };
  }).filter((group) => group.fileCount > 0);
  return groups;
}

function createLinks(groupLinkByKey: GroupLinkAccumulator): CartoPanoramaLink[] {
  return [...groupLinkByKey.values()]
    .sort(
      (a, b) =>
        b.count - a.count ||
        roleOrder(a.fromRole) - roleOrder(b.fromRole) ||
        roleOrder(a.toRole) - roleOrder(b.toRole),
    )
    .slice(0, GROUP_LINK_CAP)
    .map((link) => ({
      fromRole: link.fromRole,
      toRole: link.toRole,
      count: link.count,
      samples: link.samples.sort((a, b) =>
        `${a.fromPath}>${a.toPath}`.localeCompare(`${b.fromPath}>${b.toPath}`),
      ),
    }));
}

export function buildCartoPanorama(graph: CartoGraph): CartoPanoramaModel {
  const nodes = graph.allNodes ?? graph.nodes;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const roleByNodeId = createRoleMap(nodes);
  const { importsByNode, usedByNode, groupLinkByKey } = collectEdgeStats(
    graph,
    nodeById,
    roleByNodeId,
  );
  const groups = createGroups(nodes, roleByNodeId, importsByNode, usedByNode);
  const links = createLinks(groupLinkByKey);
  return {
    structureHash: buildStructureHash(graph, roleByNodeId),
    generatedAt: Date.now(),
    groups,
    links,
    totals: graph.totals,
    truncated: graph.truncated,
  };
}

export function roleColor(role: CartoRoleId): string {
  return CARTO_ROLE_BY_ID[role]?.color ?? CARTO_ROLE_BY_ID.other.color;
}
