'use client';

// ExplorerLens — Cartografía, Fase 2.
//
// Lente del EXPLORADOR: árbol colapsable de carpetas/subcarpetas/archivos del
// repo activo, con estética TCARS (tokens --carto-*). Puramente presentacional:
// recibe el árbol ya construido (función pura lib/carto-tree) y sólo gestiona el
// estado local de expandido/colapsado. No escanea, no toca red ni Git.
//
// Rendimiento: los hijos de una carpeta sólo se montan cuando está expandida,
// así un repo de cientos de archivos arranca liviano y nunca se cuelga.

import { useMemo, useState } from 'react';
import { ChevronRight, Folder, FolderOpen, File as FileIcon } from 'lucide-react';
import type { CartoTreeNode } from '@/lib/carto-tree';

type ExplorerLensProps = {
  nodes: CartoTreeNode[];
};

const INDENT_PX = 14;

export function ExplorerLens({ nodes }: ExplorerLensProps) {
  // Conjunto de rutas de carpeta expandidas. Por defecto todo colapsado salvo
  // las carpetas de primer nivel, para mostrar la silueta del repo sin volcar
  // todo el árbol de una.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(nodes.filter((n) => n.type === 'dir').map((n) => n.path)),
  );

  // `nodes` cambia de identidad en cada escaneo: recomputar el set inicial
  // cuando llega un árbol nuevo se delega al `key` del contenedor padre
  // (CartographyView remonta la lente por scannedAt), así que acá basta el
  // estado local.

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const flat = useMemo(() => flatten(nodes, expanded), [nodes, expanded]);

  return (
    <div role="tree" className="select-none py-1 text-sm">
      {flat.map((row) => (
        <TreeRow key={row.node.path} node={row.node} depth={row.depth} expanded={expanded} onToggle={toggle} />
      ))}
    </div>
  );
}

type FlatRow = { node: CartoTreeNode; depth: number };

/** Aplana el árbol a la lista de filas VISIBLES según el estado de expansión. */
function flatten(nodes: CartoTreeNode[], expanded: Set<string>, depth = 0, out: FlatRow[] = []): FlatRow[] {
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.type === 'dir' && node.children && expanded.has(node.path)) {
      flatten(node.children, expanded, depth + 1, out);
    }
  }
  return out;
}

type TreeRowProps = {
  node: CartoTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
};

function TreeRow({ node, depth, expanded, onToggle }: TreeRowProps) {
  const isDir = node.type === 'dir';
  const isOpen = isDir && expanded.has(node.path);
  const padLeft = 8 + depth * INDENT_PX;

  return (
    <div
      role="treeitem"
      aria-expanded={isDir ? isOpen : undefined}
      className="group flex cursor-default items-center gap-1.5 rounded py-[3px] pr-2 text-carto-text-muted transition-colors hover:bg-carto-node/5 hover:text-carto-text"
      style={{ paddingLeft: padLeft }}
      onClick={isDir ? () => onToggle(node.path) : undefined}
    >
      {isDir ? (
        <ChevronRight
          size={13}
          className="shrink-0 text-carto-text-muted transition-transform"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}
        />
      ) : (
        <span className="inline-block w-[13px] shrink-0" />
      )}

      {isDir ? (
        isOpen ? (
          <FolderOpen size={14} className="shrink-0 text-carto-accent" />
        ) : (
          <Folder size={14} className="shrink-0 text-carto-accent" />
        )
      ) : (
        <FileIcon size={14} className="shrink-0 text-carto-node/70" />
      )}

      <span className={`truncate ${isDir ? 'font-medium text-carto-text' : ''}`}>{node.name}</span>
    </div>
  );
}
