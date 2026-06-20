// lib/carto-tree.ts
//
// Cartografía — Fase 2 (Explorador del árbol).
//
// Transformación PURA de una lista plana de rutas relativas (tal como las
// devuelve el handler de lectura `carto:scan-tree`) a un árbol anidado de
// carpetas/archivos, ordenado y serializable. Sin I/O, sin Electron, sin red:
// todo el cómputo de filesystem vive en el proceso main; acá solo damos forma a
// datos ya recolectados, lo que mantiene estas funciones triviales de testear.

/** Tipo de nodo del árbol cartográfico. */
export type CartoNodeType = 'dir' | 'file';

/** Nodo serializable del árbol de archivos del repo activo. */
export interface CartoTreeNode {
  /** Nombre del segmento (carpeta o archivo), sin ruta. */
  name: string;
  /** Ruta relativa POSIX desde la raíz del repo (p. ej. `lib/i18n.ts`). */
  path: string;
  type: CartoNodeType;
  /** Hijos ordenados (carpetas primero). Sólo presente en nodos `dir`. */
  children?: CartoTreeNode[];
}

/**
 * Normaliza una ruta relativa a formato POSIX:
 *  - convierte `\` (Windows) en `/`,
 *  - colapsa separadores repetidos,
 *  - quita `./` inicial y `/` de los extremos.
 * Devuelve `''` para entradas vacías o que sólo eran separadores.
 */
export function normalizeRelPath(p: string): string {
  return p
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+|\/+$/g, '');
}

/**
 * Compara dos nodos para el orden de visualización: carpetas antes que
 * archivos, y dentro de cada grupo alfabético insensible a mayúsculas/locale.
 */
function compareNodes(a: CartoTreeNode, b: CartoTreeNode): number {
  if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/** Ordena un nivel y recurre sobre los hijos de cada carpeta. */
function sortTree(nodes: CartoTreeNode[]): CartoTreeNode[] {
  nodes.sort(compareNodes);
  for (const node of nodes) {
    if (node.children) sortTree(node.children);
  }
  return nodes;
}

/**
 * Construye el árbol anidado a partir de una lista plana de rutas de ARCHIVO
 * relativas a la raíz del repo. Cada ruta crea las carpetas intermedias que
 * falten; la hoja es siempre un archivo.
 *
 * Garantías:
 *  - idempotente ante duplicados,
 *  - tolera separadores `\`/`/` mezclados y `./` inicial,
 *  - ignora entradas vacías,
 *  - resultado ordenado de forma estable (carpetas primero, luego alfabético).
 */
export function buildFileTree(paths: string[]): CartoTreeNode[] {
  const roots: CartoTreeNode[] = [];
  // Índice de carpetas ya creadas, por ruta acumulada, para reusarlas.
  const dirIndex = new Map<string, CartoTreeNode>();
  // Conjunto de archivos ya insertados, para deduplicar.
  const seenFiles = new Set<string>();

  for (const raw of paths) {
    const clean = normalizeRelPath(raw);
    if (!clean) continue;

    const segments = clean.split('/').filter(Boolean);
    if (segments.length === 0) continue;

    let parentChildren = roots;
    let accumulated = '';

    // Todos los segmentos menos el último son carpetas.
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;

      let dir = dirIndex.get(accumulated);
      if (!dir) {
        dir = { name: segment, path: accumulated, type: 'dir', children: [] };
        dirIndex.set(accumulated, dir);
        parentChildren.push(dir);
      }
      parentChildren = dir.children!;
    }

    // Último segmento: el archivo.
    const fileName = segments[segments.length - 1];
    const filePath = clean;
    if (seenFiles.has(filePath)) continue;
    seenFiles.add(filePath);
    parentChildren.push({ name: fileName, path: filePath, type: 'file' });
  }

  return sortTree(roots);
}

/** Cuenta recursivamente cuántos archivos (hojas) hay en el árbol. */
export function countFiles(nodes: CartoTreeNode[]): number {
  let total = 0;
  for (const node of nodes) {
    if (node.type === 'file') total++;
    else if (node.children) total += countFiles(node.children);
  }
  return total;
}

/** Cuenta recursivamente cuántas carpetas hay en el árbol. */
export function countDirs(nodes: CartoTreeNode[]): number {
  let total = 0;
  for (const node of nodes) {
    if (node.type === 'dir') {
      total++;
      if (node.children) total += countDirs(node.children);
    }
  }
  return total;
}
