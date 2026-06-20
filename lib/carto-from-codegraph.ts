// lib/carto-from-codegraph.ts
//
// Cartografía — Fase 3. ADAPTER motor→contrato.
//
// Única frontera entre la forma cruda de CodeGraph (`Node`/`Edge`/`Subgraph`) y
// el contrato normalizado de Cartografía (`lib/carto-types.ts`). Todo lo que sale
// del motor hacia el renderer pasa por acá. Funciones PURAS y sin efectos: no
// importan Electron ni el runtime del motor (sólo sus TIPOS, que se borran al
// compilar), por eso se testean con fixtures de objetos planos.
//
// Por qué un adapter y no pasar la forma cruda: (1) desacopla la UI del motor —
// podemos cambiarlo sin tocar la vista; (2) acota y deduplica (callers/impacto
// pueden traer cientos de nodos); (3) es el punto donde garantizamos que la vista
// sólo ve relaciones REALES extraídas del grafo, nunca inventadas.

import type { Node, Edge, EdgeKind } from '@colbymchenry/codegraph';
import type {
  CartoNode,
  CartoEdgeRelation,
  CartoRelatedSymbol,
  CartoSearchHit,
  CartoImpact,
} from './carto-types';

/** Par {nodo, arista} tal como lo devuelven `getCallers`/`getCallees`. */
export interface RawRelated {
  node: Node;
  edge: Edge;
}

/** Hit de búsqueda crudo, tal como lo devuelve `searchNodes`. */
export interface RawSearchHit {
  node: Node;
  score: number;
}

/** Tope por defecto de símbolos listados en relaciones/impacto (UI legible). */
export const DEFAULT_RELATION_CAP = 200;

/**
 * Mapea una `EdgeKind` del motor a la relación normalizada del contrato. Las dos
 * centrales del brief (`imports`→import, `calls`→call) son explícitas; el resto
 * colapsa a categorías que la vista distingue, y lo desconocido a `'other'`.
 */
export function edgeRelation(kind: EdgeKind | string): CartoEdgeRelation {
  switch (kind) {
    case 'imports':
      return 'import';
    case 'calls':
      return 'call';
    case 'references':
    case 'instantiates':
    case 'type_of':
    case 'returns':
    case 'decorates':
      return 'reference';
    case 'extends':
    case 'implements':
    case 'overrides':
      return 'extends';
    case 'contains':
      return 'contains';
    case 'exports':
      return 'export';
    default:
      return 'other';
  }
}

/** Traduce un `Node` crudo del motor al `CartoNode` del contrato (campos que la UI usa). */
export function toCartoNode(node: Node): CartoNode {
  return {
    id: node.id,
    name: node.name,
    kind: node.kind,
    filePath: node.filePath,
    startLine: node.startLine,
    endLine: node.endLine,
    ...(node.isExported !== undefined ? { exported: node.isExported } : {}),
    ...(node.signature ? { signature: node.signature } : {}),
  };
}

/**
 * Adapta callers/callees: deduplica por id de nodo (un símbolo puede relacionarse
 * por varias aristas), anota el tipo de relación y el call site, y acota al tope.
 * Conserva el orden de llegada (el motor ya entrega por relevancia/proximidad).
 */
export function adaptRelated(
  items: RawRelated[],
  cap: number = DEFAULT_RELATION_CAP,
): CartoRelatedSymbol[] {
  const seen = new Set<string>();
  const out: CartoRelatedSymbol[] = [];
  for (const { node, edge } of items) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    out.push({
      node: toCartoNode(node),
      relation: edgeRelation(edge.kind),
      ...(edge.line !== undefined ? { line: edge.line } : {}),
    });
    if (out.length >= cap) break;
  }
  return out;
}

/** Adapta hits de búsqueda: nodo normalizado + score crudo, acotado al tope. */
export function adaptSearchHits(
  results: RawSearchHit[],
  cap: number = DEFAULT_RELATION_CAP,
): CartoSearchHit[] {
  return results
    .slice(0, cap)
    .map((r) => ({ node: toCartoNode(r.node), score: r.score }));
}

/** Foco de un cálculo de impacto: el archivo y los nodos a EXCLUIR del resultado. */
export interface ImpactFocus {
  /** Ruta del archivo focal — sus archivos no cuentan como "impactados". */
  filePath?: string;
  /** Ids de los nodos focales — se excluyen de la muestra de símbolos. */
  ids?: ReadonlySet<string>;
}

/**
 * Agrega una lista de nodos impactados (la unión de los radios de impacto de los
 * símbolos de un archivo) al resumen `CartoImpact` del contrato:
 *  - `impactedFiles`: archivos distintos alcanzados, excluyendo el foco;
 *  - `impactedSymbols`: muestra acotada de símbolos reales (no nodos `file`);
 *  - `total` + `truncated`: para que la UI muestre honestamente "+N más".
 *
 * Pura: recibe los nodos ya recolectados por el motor, no consulta nada.
 */
export function adaptImpact(
  impacted: Node[],
  focus: ImpactFocus = {},
  cap: number = DEFAULT_RELATION_CAP,
): CartoImpact {
  const focalIds = focus.ids ?? new Set<string>();
  const files = new Set<string>();
  const symbols: CartoNode[] = [];
  let total = 0;

  for (const node of impacted) {
    if (focalIds.has(node.id)) continue; // el foco no se impacta a sí mismo
    if (node.filePath && node.filePath !== focus.filePath) {
      files.add(node.filePath);
    }
    // El nodo `file` representa el archivo, no un símbolo: cuenta para archivos,
    // no para la muestra de símbolos.
    if (node.kind === 'file') continue;
    total++;
    if (symbols.length < cap) symbols.push(toCartoNode(node));
  }

  return {
    impactedFiles: [...files].sort(),
    impactedSymbols: symbols,
    total,
    truncated: total > symbols.length,
  };
}
