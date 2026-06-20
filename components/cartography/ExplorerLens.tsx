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
import {
  ChevronRight,
  Folder,
  FolderOpen,
  File as FileIcon,
  FileCode,
  FileJson,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCog,
  FileTerminal,
  FileKey,
  FileSpreadsheet,
  FileType,
  FileLock2,
  FileBox,
  type LucideIcon,
} from 'lucide-react';
import type { CartoTreeNode } from '@/lib/carto-tree';

// ── Icono por formato de archivo (puramente estético) ───────────────────────
// Mantiene un único color muted para no romper la paleta TCARS; sólo cambia la
// silueta del icono según extensión / nombre conocido.
const ICON_BY_EXT: Record<string, LucideIcon> = {
  // Código
  ts: FileCode, tsx: FileCode, js: FileCode, jsx: FileCode, mjs: FileCode, cjs: FileCode,
  html: FileCode, htm: FileCode, css: FileCode, scss: FileCode, sass: FileCode, less: FileCode,
  vue: FileCode, svelte: FileCode, py: FileCode, rb: FileCode, go: FileCode, rs: FileCode,
  java: FileCode, c: FileCode, cpp: FileCode, h: FileCode, hpp: FileCode, php: FileCode,
  swift: FileCode, kt: FileCode, sql: FileCode,
  // Datos / config
  json: FileJson, jsonc: FileJson,
  yml: FileCog, yaml: FileCog, toml: FileCog, ini: FileCog, conf: FileCog, xml: FileCog,
  // Texto
  md: FileText, mdx: FileText, txt: FileText, rtf: FileText, pdf: FileText,
  // Tablas
  csv: FileSpreadsheet, tsv: FileSpreadsheet, xlsx: FileSpreadsheet, xls: FileSpreadsheet,
  // Imágenes
  png: FileImage, jpg: FileImage, jpeg: FileImage, gif: FileImage, svg: FileImage,
  webp: FileImage, ico: FileImage, bmp: FileImage, avif: FileImage,
  // Audio / video
  mp4: FileVideo, mov: FileVideo, webm: FileVideo, mkv: FileVideo, avi: FileVideo,
  mp3: FileAudio, wav: FileAudio, flac: FileAudio, ogg: FileAudio, m4a: FileAudio,
  // Fuentes
  woff: FileType, woff2: FileType, ttf: FileType, otf: FileType, eot: FileType,
  // Archivos comprimidos
  zip: FileArchive, tar: FileArchive, gz: FileArchive, tgz: FileArchive, rar: FileArchive, '7z': FileArchive,
  // Shell
  sh: FileTerminal, bash: FileTerminal, zsh: FileTerminal, ps1: FileTerminal, bat: FileTerminal, cmd: FileTerminal,
  // Secretos / claves
  pem: FileKey, key: FileKey, crt: FileKey, cert: FileKey,
};

function iconForFile(name: string): LucideIcon {
  const lower = name.toLowerCase();
  if (lower === '.gitignore' || lower === '.gitattributes' || lower === '.editorconfig') return FileCog;
  if (lower.startsWith('.env')) return FileKey;
  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return FileBox;
  if (lower.endsWith('.lock') || lower === 'package-lock.json' || lower === 'pnpm-lock.yaml' || lower === 'yarn.lock') {
    return FileLock2;
  }
  const dot = lower.lastIndexOf('.');
  const ext = dot > 0 ? lower.slice(dot + 1) : '';
  return ICON_BY_EXT[ext] ?? FileIcon;
}

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
        (() => {
          const Icon = iconForFile(node.name);
          return <Icon size={14} className="shrink-0 text-carto-node/70" />;
        })()
      )}

      <span className={`truncate ${isDir ? 'font-medium text-carto-text' : ''}`}>{node.name}</span>
    </div>
  );
}
