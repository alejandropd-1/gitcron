import { describe, expect, it } from 'vitest';
import { buildCartoPanorama } from '../carto-panorama';
import type { CartoGraph, CartoNode } from '../carto-types';

function node(id: string, filePath: string): CartoNode {
  return {
    id,
    name: filePath.split('/').pop() ?? filePath,
    kind: 'file',
    filePath,
    startLine: 1,
    endLine: 1,
  };
}

const graph: CartoGraph = {
  nodes: [
    node('ui-a', 'components/AppShell.tsx'),
    node('ui-b', 'app/page.tsx'),
    node('logic-a', 'lib/carto-from-codegraph.ts'),
    node('logic-b', 'hooks/use-repo-loader.ts'),
    node('db-a', 'electron/db/repository.ts'),
    node('config-a', 'package.json'),
  ],
  edges: [
    { fromId: 'ui-a', toId: 'logic-a', relation: 'import' },
    { fromId: 'ui-b', toId: 'logic-a', relation: 'import' },
    { fromId: 'logic-a', toId: 'db-a', relation: 'import' },
    { fromId: 'logic-b', toId: 'db-a', relation: 'import' },
    { fromId: 'ui-a', toId: 'config-a', relation: 'import' },
  ],
  totals: { nodes: 6, edges: 5 },
  truncated: false,
  generatedAt: 1,
};

describe('buildCartoPanorama', () => {
  it('agrupa archivos por rol y rankea claves por centralidad', () => {
    const panorama = buildCartoPanorama(graph);
    const ui = panorama.groups.find((group) => group.id === 'ui');
    const logic = panorama.groups.find((group) => group.id === 'logic');

    expect(ui?.fileCount).toBe(2);
    expect(logic?.keyFiles[0].node.filePath).toBe('lib/carto-from-codegraph.ts');
    expect(logic?.keyFiles[0].degree).toBe(3);
  });

  it('agrega relaciones archivo-archivo a flechas entre grupos', () => {
    const panorama = buildCartoPanorama(graph);

    expect(panorama.links[0]).toMatchObject({
      fromRole: 'ui',
      toRole: 'logic',
      count: 2,
    });
    expect(panorama.links.some((link) => link.fromRole === 'logic' && link.toRole === 'database')).toBe(true);
  });

  it('calcula un hash estable desde estructura y relaciones', () => {
    const first = buildCartoPanorama(graph).structureHash;
    const second = buildCartoPanorama({ ...graph, generatedAt: 999 }).structureHash;
    const changed = buildCartoPanorama({
      ...graph,
      edges: [...graph.edges, { fromId: 'config-a', toId: 'logic-a', relation: 'import' }],
    }).structureHash;

    expect(second).toBe(first);
    expect(changed).not.toBe(first);
  });
});
