// electron/carto/graph-engine.ts
//
// Cartografía — Fase 3. Motor estructural CodeGraph EMBEBIDO en el proceso main.
//
// Es el sustrato que mantiene honesta a la IA: un grafo local de símbolos, llamadas
// e imports del repo activo. Invariantes de la fase:
//   · CERO RED — CodeGraph es 100% local (SQLite vía node:sqlite). No abre sockets.
//   · Todo el cómputo vive acá, en main. El renderer sólo recibe el contrato
//     normalizado (lib/carto-types) traducido por el adapter (lib/carto-from-codegraph).
//   · No toca lógica de Git.
//
// Dónde vive el índice (decisión de la fase): en `<repo>/.codegraph-gitcron/`.
// El SDK siempre guarda el DB bajo projectRoot (`open`/`init` lo derivan; el
// override `CODEGRAPH_DIR` es sólo un NOMBRE de carpeta, no una ruta a userData,
// y relocalizar a userData exigiría forkear el constructor privado del motor).
// Usamos un nombre DEDICADO, no el `.codegraph/` por defecto, a propósito:
//   · Aísla a GitCron de cualquier índice externo de CodeGraph (CLI, o el daemon
//     MCP que puede correr sobre el mismo repo). Reusar ese índice ajeno nos hacía
//     heredar un grafo INCOMPLETO (faltaban aristas de imports sin resolver, p. ej.
//     "es usado por" daba 0 en archivos muy usados) y arriesgaba contención de
//     SQLite ("database is locked") entre dos procesos sobre el mismo DB.
//   · El motor reconoce `.codegraph-*` como carpeta de datos suya, así que la
//     auto-ignora al indexar y al watch-ear. Está gitignoreada en este proyecto.
// El índice es naturalmente per-repo: cada repo abierto tiene el suyo.

import * as path from 'node:path';
import { CodeGraph } from '@colbymchenry/codegraph';

// Nombre dedicado del directorio de índice de GitCron (ver bloque de arriba).
// `CODEGRAPH_DIR` se lee en vivo por el motor, así que basta fijarlo en el env del
// proceso main antes de cualquier llamada al SDK.
const GITCRON_CODEGRAPH_DIR = '.codegraph-gitcron';
process.env.CODEGRAPH_DIR = GITCRON_CODEGRAPH_DIR;
import type { IndexProgress, Node } from '@colbymchenry/codegraph';
import {
  adaptRelated,
  adaptSearchHits,
  adaptImpact,
  type RawRelated,
} from '../../lib/carto-from-codegraph';
import type {
  CartoGraphStatus,
  CartoSearchHit,
  CartoRelatedSymbol,
  CartoImpact,
  CartoFileRelations,
} from '../../lib/carto-types';

// Profundidad de impacto: 3 niveles es el default del motor y un radio razonable
// para "qué se rompe si toco esto" sin volverse todo el grafo.
const IMPACT_DEPTH = 3;
// Tope de símbolos de un archivo sobre los que calculamos impacto, para acotar el
// trabajo en archivos enormes (la unión de sus radios sigue siendo representativa).
const IMPACT_SYMBOL_CAP = 60;

interface EngineEntry {
  cg: CodeGraph | null;
  status: CartoGraphStatus;
  /** Indexado en vuelo, para no re-disparar mientras corre. */
  task: Promise<void> | null;
  /** Notificador al renderer cuando el watch re-sincroniza (índice fresco). */
  onUpdated?: () => void;
}

/** Un motor por repo, keyed por ruta absoluta resuelta. */
const entries = new Map<string, EngineEntry>();

function rootOf(repoPath: string): string {
  return path.resolve(repoPath);
}

function sanitize(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

export interface EnsureGraphOptions {
  /** Se invoca con cada avance del indexado (para reflejarlo en la UI). */
  onProgress?: (status: CartoGraphStatus) => void;
  /** Se invoca cuando el watch re-sincroniza el índice tras una edición. */
  onUpdated?: () => void;
}

/**
 * Garantiza que el repo tenga un índice abierto y fresco. NO bloquea: si hay que
 * indexar, lanza el trabajo en background y devuelve de inmediato el estado
 * `indexing`; el avance llega por `onProgress` y el fin por cambio de estado
 * (el renderer re-consulta `getGraphStatus`). Idempotente: si ya está listo o
 * indexando, no re-dispara.
 */
export function ensureGraph(repoPath: string, opts: EnsureGraphOptions = {}): CartoGraphStatus {
  const root = rootOf(repoPath);
  let entry = entries.get(root);
  if (!entry) {
    entry = { cg: null, status: { state: 'idle' }, task: null };
    entries.set(root, entry);
  }
  if (opts.onUpdated) entry.onUpdated = opts.onUpdated;

  if (entry.status.state === 'ready' || entry.status.state === 'indexing') {
    return entry.status;
  }

  entry.status = { state: 'indexing', progress: { phase: 'scanning', current: 0, total: 0 } };
  entry.task = buildIndex(root, entry, opts).catch((error) => {
    entry!.status = { state: 'error', error: sanitize(error) };
    console.error('[carto-graph] index error:', sanitize(error));
    opts.onProgress?.(entry!.status);
  });
  return entry.status;
}

async function buildIndex(root: string, entry: EngineEntry, opts: EnsureGraphOptions): Promise<void> {
  const onIndexProgress = (p: IndexProgress) => {
    entry.status = {
      state: 'indexing',
      progress: { phase: p.phase, current: p.current, total: p.total },
    };
    opts.onProgress?.(entry.status);
  };

  let cg: CodeGraph;
  if (CodeGraph.isInitialized(root)) {
    // Ya hay un índice NUESTRO (mismo CODEGRAPH_DIR dedicado). Lo abrimos y, si lo
    // construyó un motor más viejo (`isIndexStale`), lo re-indexamos completo para
    // re-resolver todas las relaciones; si no, basta un `sync` incremental.
    cg = await CodeGraph.open(root, { sync: false });
    if (cg.isIndexStale()) {
      await cg.indexAll({ onProgress: onIndexProgress });
    } else {
      await cg.sync({ onProgress: onIndexProgress });
    }
  } else {
    // Primer índice de este repo: crear `.codegraph-gitcron/` e indexar completo.
    cg = await CodeGraph.init(root, { index: false });
    await cg.indexAll({ onProgress: onIndexProgress });
  }

  entry.cg = cg;
  entry.status = { state: 'ready', ...readStats(cg) };
  opts.onProgress?.(entry.status);

  // Watch nativo del motor: re-sincroniza al editar sin bloquear el renderer.
  // Ignora `.codegraph/` y `.git/` por sí mismo. Al terminar cada sync avisamos
  // al renderer para que refresque las relaciones que esté mostrando.
  try {
    cg.watch({
      onSyncComplete: () => {
        if (entry.cg) entry.status = { state: 'ready', ...readStats(entry.cg) };
        entry.onUpdated?.();
      },
      onSyncError: (error) => console.error('[carto-graph] sync error:', sanitize(error)),
    });
  } catch (error) {
    // El watch es una mejora, no es load-bearing: si el SO no lo soporta, el
    // índice queda igual de válido (sólo no se auto-refresca).
    console.error('[carto-graph] watch unavailable:', sanitize(error));
  }
}

function readStats(cg: CodeGraph): Pick<CartoGraphStatus, 'stats' | 'lastIndexedAt'> {
  const s = cg.getStats();
  return {
    stats: { files: s.fileCount, nodes: s.nodeCount, edges: s.edgeCount },
    lastIndexedAt: cg.getLastIndexedAt(),
  };
}

/** Estado actual del índice de un repo (sin disparar nada). */
export function getGraphStatus(repoPath: string): CartoGraphStatus {
  return entries.get(rootOf(repoPath))?.status ?? { state: 'idle' };
}

/** El motor listo de un repo, o null si todavía no está indexado. */
function readyGraph(repoPath: string): CodeGraph | null {
  const entry = entries.get(rootOf(repoPath));
  return entry && entry.status.state === 'ready' ? entry.cg : null;
}

/** Búsqueda de símbolos por texto. `null` si el índice no está listo aún. */
export function searchGraph(repoPath: string, query: string, limit?: number): CartoSearchHit[] | null {
  const cg = readyGraph(repoPath);
  if (!cg) return null;
  const q = query.trim();
  if (!q) return [];
  return adaptSearchHits(cg.searchNodes(q, limit ? { limit } : undefined), limit);
}

/** Quién llama / referencia a un símbolo. `null` si el índice no está listo. */
export function graphCallers(repoPath: string, nodeId: string): CartoRelatedSymbol[] | null {
  const cg = readyGraph(repoPath);
  if (!cg) return null;
  return adaptRelated(cg.getCallers(nodeId) as RawRelated[]);
}

/** Qué llama / referencia un símbolo. `null` si el índice no está listo. */
export function graphCallees(repoPath: string, nodeId: string): CartoRelatedSymbol[] | null {
  const cg = readyGraph(repoPath);
  if (!cg) return null;
  return adaptRelated(cg.getCallees(nodeId) as RawRelated[]);
}

/** Radio de impacto de un símbolo. `null` si el índice no está listo. */
export function graphImpact(repoPath: string, nodeId: string): CartoImpact | null {
  const cg = readyGraph(repoPath);
  if (!cg) return null;
  const focal = cg.getNode(nodeId);
  const sg = cg.getImpactRadius(nodeId, IMPACT_DEPTH);
  return adaptImpact([...sg.nodes.values()], {
    filePath: focal?.filePath,
    ids: new Set([nodeId]),
  });
}

/**
 * Paquete de relaciones de un ARCHIVO (alimenta el panel de QA del Explorador):
 * a qué importa, quién lo usa, y el impacto agregado de sus símbolos. `null` si
 * el índice no está listo aún.
 */
export function graphFileRelations(repoPath: string, filePath: string): CartoFileRelations | null {
  const cg = readyGraph(repoPath);
  if (!cg) return null;

  // ¿El motor trackea este archivo? Los assets no-código (SVG, imágenes, etc.) no
  // están en el índice: devolvemos `indexed: false` para que la vista lo distinga
  // de un archivo de código que sí está pero no tiene relaciones.
  const indexed = cg.getFile(filePath) !== null;
  if (!indexed) {
    return { filePath, indexed, imports: [], usedBy: [], impact: emptyImpact() };
  }

  const imports = cg.getFileDependencies(filePath);
  const usedBy = cg.getFileDependents(filePath);

  // Impacto a nivel archivo: unión de los radios de impacto de sus símbolos.
  const nodes = cg.getNodesInFile(filePath);
  const focalIds = new Set(nodes.map((n) => n.id));
  const symbols = nodes.filter((n) => n.kind !== 'file').slice(0, IMPACT_SYMBOL_CAP);

  const impactedById = new Map<string, Node>();
  for (const sym of symbols) {
    const sg = cg.getImpactRadius(sym.id, IMPACT_DEPTH);
    for (const node of sg.nodes.values()) {
      if (!focalIds.has(node.id)) impactedById.set(node.id, node);
    }
  }

  const impact = adaptImpact([...impactedById.values()], { filePath, ids: focalIds });
  return { filePath, indexed, imports, usedBy, impact };
}

/** Impacto vacío para archivos fuera del grafo (no-código). */
function emptyImpact(): CartoImpact {
  return { impactedFiles: [], impactedSymbols: [], total: 0, truncated: false };
}

/** Cierra el índice de un repo y libera recursos (detiene su watch). */
export function disposeGraph(repoPath: string): void {
  const root = rootOf(repoPath);
  const entry = entries.get(root);
  if (!entry) return;
  try {
    entry.cg?.unwatch();
    entry.cg?.close();
  } catch (error) {
    console.error('[carto-graph] dispose error:', sanitize(error));
  }
  entries.delete(root);
}

/** Cierra TODOS los índices abiertos. Se llama desde app 'before-quit'. */
export function closeAllGraphs(): void {
  for (const root of [...entries.keys()]) disposeGraph(root);
}
