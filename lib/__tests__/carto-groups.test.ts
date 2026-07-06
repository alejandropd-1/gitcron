import { describe, expect, it } from 'vitest';
import { buildGroupModel } from '../carto-groups';
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
    node('logic-a', 'lib/carto-from-codegraph.ts'),
    node('db-a', 'electron/db/repository.ts'),
  ],
  allNodes: [
    node('ui-a', 'components/AppShell.tsx'),
    node('ui-b', 'app/page.tsx'),
    node('logic-a', 'lib/carto-from-codegraph.ts'),
    node('logic-b', 'hooks/use-repo-loader.ts'),
    node('db-a', 'electron/db/repository.ts'),
    node('style-a', 'app/globals.css'),
    node('config-a', 'package.json'),
  ],
  edges: [
    { fromId: 'ui-a', toId: 'logic-a', relation: 'import' },
    { fromId: 'ui-b', toId: 'logic-a', relation: 'import' },
    { fromId: 'logic-a', toId: 'db-a', relation: 'import' },
    { fromId: 'logic-b', toId: 'db-a', relation: 'import' },
    { fromId: 'ui-a', toId: 'config-a', relation: 'import' },
  ],
  totals: { nodes: 7, edges: 5 },
  truncated: true,
  generatedAt: 1,
};

describe('buildGroupModel', () => {
  it('devuelve tarjetas de grupo desde el set completo de archivos', () => {
    const model = buildGroupModel(graph);

    expect(model.groups.map((group) => group.role)).toEqual([
      'ui',
      'styles',
      'database',
      'logic',
      'config',
    ]);
    expect(model.groups.find((group) => group.role === 'ui')?.count).toBe(2);
    expect(model.groups.find((group) => group.role === 'styles')?.count).toBe(1);
  });

  it('rankea keyFiles por grado reutilizando la centralidad del Panorama', () => {
    const model = buildGroupModel(graph);
    const logic = model.groups.find((group) => group.role === 'logic');

    expect(logic?.keyFiles[0]).toMatchObject({
      degree: 3,
      node: { filePath: 'lib/carto-from-codegraph.ts' },
    });
    expect(logic?.keyFiles).toHaveLength(2);
  });

  it('expone flechas agregadas entre grupos con peso', () => {
    const model = buildGroupModel(graph);

    expect(model.groupEdges[0]).toEqual({ from: 'ui', to: 'logic', weight: 2 });
    expect(model.groupEdges).toContainEqual({ from: 'logic', to: 'database', weight: 2 });
    expect(model.groupEdges).toContainEqual({ from: 'ui', to: 'config', weight: 1 });
  });

  it('acepta resumenes opcionales sin exigir IA ni cache en el modelo puro', () => {
    const model = buildGroupModel(graph, {
      summariesByRole: {
        ui: 'Entrada visual del producto.',
        logic: 'Reglas y transformaciones centrales.',
      },
    });

    expect(model.groups.find((group) => group.role === 'ui')?.summary).toBe('Entrada visual del producto.');
    expect(model.groups.find((group) => group.role === 'styles')?.summary).toBeUndefined();
  });
});
