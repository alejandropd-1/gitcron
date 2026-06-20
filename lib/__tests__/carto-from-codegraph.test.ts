import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@colbymchenry/codegraph';
import {
  edgeRelation,
  toCartoNode,
  adaptRelated,
  adaptSearchHits,
  adaptImpact,
  DEFAULT_RELATION_CAP,
  type RawRelated,
} from '../carto-from-codegraph';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// Fábrica de `Node` válido: rellena los campos requeridos por el tipo del motor
// para que los fixtures queden legibles (sólo se sobreescribe lo relevante).
function makeNode(partial: Partial<Node> & { id: string; name: string }): Node {
  return {
    kind: 'function',
    qualifiedName: `mod::${partial.name}`,
    filePath: 'src/mod.ts',
    language: 'typescript',
    startLine: 1,
    endLine: 5,
    startColumn: 0,
    endColumn: 0,
    ...partial,
  } as Node;
}

function makeEdge(kind: Edge['kind'], partial: Partial<Edge> = {}): Edge {
  return { source: 'a', target: 'b', kind, ...partial };
}

describe('edgeRelation', () => {
  it('mapea las relaciones centrales import/call explícitamente', () => {
    expect(edgeRelation('imports')).toBe('import');
    expect(edgeRelation('calls')).toBe('call');
  });

  it('colapsa familias de aristas a categorías de la vista', () => {
    expect(edgeRelation('references')).toBe('reference');
    expect(edgeRelation('instantiates')).toBe('reference');
    expect(edgeRelation('extends')).toBe('extends');
    expect(edgeRelation('implements')).toBe('extends');
    expect(edgeRelation('contains')).toBe('contains');
    expect(edgeRelation('exports')).toBe('export');
  });

  it('degrada cualquier arista desconocida a "other"', () => {
    expect(edgeRelation('quux-unknown')).toBe('other');
  });
});

describe('toCartoNode', () => {
  it('proyecta sólo los campos del contrato', () => {
    const node = makeNode({
      id: 'n1',
      name: 'add',
      kind: 'function',
      filePath: 'src/math.ts',
      startLine: 10,
      endLine: 12,
      isExported: true,
      signature: '(a: number, b: number) => number',
      docstring: 'suma',
    });
    expect(toCartoNode(node)).toEqual({
      id: 'n1',
      name: 'add',
      kind: 'function',
      filePath: 'src/math.ts',
      startLine: 10,
      endLine: 12,
      exported: true,
      signature: '(a: number, b: number) => number',
    });
  });

  it('omite exported/signature cuando el motor no los aporta', () => {
    const carto = toCartoNode(makeNode({ id: 'n2', name: 'foo' }));
    expect(carto).not.toHaveProperty('exported');
    expect(carto).not.toHaveProperty('signature');
  });
});

describe('adaptRelated', () => {
  it('anota relación y call site, y normaliza el nodo', () => {
    const items: RawRelated[] = [
      { node: makeNode({ id: 'c1', name: 'caller' }), edge: makeEdge('calls', { line: 42 }) },
    ];
    expect(adaptRelated(items)).toEqual([
      {
        node: toCartoNode(makeNode({ id: 'c1', name: 'caller' })),
        relation: 'call',
        line: 42,
      },
    ]);
  });

  it('deduplica por id de nodo conservando la primera aparición', () => {
    const items: RawRelated[] = [
      { node: makeNode({ id: 'x', name: 'x' }), edge: makeEdge('calls', { line: 1 }) },
      { node: makeNode({ id: 'x', name: 'x' }), edge: makeEdge('references', { line: 2 }) },
      { node: makeNode({ id: 'y', name: 'y' }), edge: makeEdge('imports') },
    ];
    const out = adaptRelated(items);
    expect(out.map((r) => r.node.id)).toEqual(['x', 'y']);
    expect(out[0].relation).toBe('call'); // ganó la primera arista
    expect(out[1].relation).toBe('import');
  });

  it('acota al tope indicado', () => {
    const items: RawRelated[] = Array.from({ length: 5 }, (_, i) => ({
      node: makeNode({ id: `n${i}`, name: `n${i}` }),
      edge: makeEdge('calls'),
    }));
    expect(adaptRelated(items, 3)).toHaveLength(3);
  });
});

describe('adaptSearchHits', () => {
  it('preserva el score y acota', () => {
    const hits = [
      { node: makeNode({ id: 'a', name: 'a' }), score: 9.5 },
      { node: makeNode({ id: 'b', name: 'b' }), score: 1.2 },
    ];
    const out = adaptSearchHits(hits, 1);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ node: toCartoNode(makeNode({ id: 'a', name: 'a' })), score: 9.5 });
  });
});

describe('adaptImpact', () => {
  const impacted: Node[] = [
    makeNode({ id: 'self', name: 'self', filePath: 'src/a.ts' }),
    makeNode({ id: 'fileNode', name: 'b.ts', kind: 'file', filePath: 'src/b.ts' }),
    makeNode({ id: 's1', name: 'usesA', filePath: 'src/b.ts' }),
    makeNode({ id: 's2', name: 'alsoUsesA', filePath: 'src/c.ts' }),
  ];

  it('excluye el archivo foco de impactedFiles y los ids focales de los símbolos', () => {
    const impact = adaptImpact(impacted, { filePath: 'src/a.ts', ids: new Set(['self']) });
    expect(impact.impactedFiles).toEqual(['src/b.ts', 'src/c.ts']); // no src/a.ts
    expect(impact.impactedSymbols.map((n) => n.id)).toEqual(['s1', 's2']); // no 'self', no 'fileNode'
    expect(impact.total).toBe(2);
    expect(impact.truncated).toBe(false);
  });

  it('los nodos `file` cuentan para archivos pero no para la muestra de símbolos', () => {
    const impact = adaptImpact(impacted, { filePath: 'src/a.ts' });
    // src/b.ts aparece por el nodo file y por el símbolo s1, pero deduplicado.
    expect(impact.impactedFiles).toContain('src/b.ts');
    expect(impact.impactedSymbols.some((n) => n.kind === 'file')).toBe(false);
  });

  it('marca truncated y reporta el total real cuando supera el tope', () => {
    const many: Node[] = Array.from({ length: 10 }, (_, i) =>
      makeNode({ id: `m${i}`, name: `m${i}`, filePath: `src/f${i}.ts` }),
    );
    const impact = adaptImpact(many, {}, 4);
    expect(impact.impactedSymbols).toHaveLength(4);
    expect(impact.total).toBe(10);
    expect(impact.truncated).toBe(true);
  });

  it('usa un tope por defecto sano', () => {
    expect(DEFAULT_RELATION_CAP).toBeGreaterThan(0);
  });
});
