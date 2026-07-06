import {
  buildCartoPanorama,
  type CartoPanoramaFile,
} from './carto-panorama';
import type { CartoRoleId } from './carto-roles';
import type { CartoGraph } from './carto-types';

export type CartoGroupKeyFile = CartoPanoramaFile;

export interface CartoGroupModelGroup {
  role: CartoRoleId;
  count: number;
  keyFiles: CartoGroupKeyFile[];
  summary?: string;
}

export interface CartoGroupModelEdge {
  from: CartoRoleId;
  to: CartoRoleId;
  weight: number;
}

export interface CartoGroupModel {
  groups: CartoGroupModelGroup[];
  groupEdges: CartoGroupModelEdge[];
}

export interface CartoGroupModelOptions {
  summariesByRole?: Partial<Record<CartoRoleId, string>>;
}

export function buildGroupModel(
  graph: CartoGraph,
  options: CartoGroupModelOptions = {},
): CartoGroupModel {
  const panorama = buildCartoPanorama(graph);
  const groups = panorama.groups.map((group) => {
    const summary = options.summariesByRole?.[group.id]?.trim();
    return {
      role: group.id,
      count: group.fileCount,
      keyFiles: group.keyFiles,
      ...(summary ? { summary } : {}),
    };
  });
  const groupEdges = panorama.links.map((link) => ({
    from: link.fromRole,
    to: link.toRole,
    weight: link.count,
  }));

  return { groups, groupEdges };
}
