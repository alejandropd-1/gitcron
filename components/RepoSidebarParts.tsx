'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudOff,
  FileDiff,
  Folder,
  GitBranch,
  HardDrive,
  RotateCcw,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import { colorForBranch } from '@/components/CommitGraph';
import { useT } from '@/hooks/use-translation';
import { useGitStore } from '@/lib/git-store';
import { useBranchFolderState, type BranchFolderState } from '@/hooks/use-branch-folder-state';
import { cn } from '@/lib/utils';
import type { BranchTrackingInfo, StashEntry } from '@/types/electron';

type BranchTrackingMap = Record<string, BranchTrackingInfo>;

export function SidebarSection({
  title,
  children,
  count,
  extra,
  icon,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
}: {
  title: string;
  children: ReactNode;
  count?: number;
  extra?: ReactNode;
  icon?: ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const handleToggle = controlledOnToggle || (() => setInternalOpen(!internalOpen));

  return (
    <div className="mt-0.5">
      <div className="w-full flex items-center gap-1.5 px-3 py-0.5 text-xs font-bold text-text-secondary">
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
          className="flex items-center gap-2 flex-1 text-left hover:text-text-primary transition-colors min-h-[30px]"
        >
          <ChevronRight size={13} className={cn('transition-transform shrink-0', isOpen && 'rotate-90')} />
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="flex-1 text-left tracking-wider truncate">{title}</span>
        </button>
        {count !== undefined && <span className="bg-border-subtle text-[10px] px-2 py-0.5 rounded-full font-mono">{count}</span>}
        {extra}
      </div>
      {isOpen && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

export function SidebarItem({
  icon,
  text,
  active,
  onClick,
}: {
  icon: ReactNode;
  text: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'px-4 py-1 flex items-center gap-3 text-sm transition-colors group relative',
        active ? 'text-secondary bg-secondary/10' : 'text-text-secondary hover:bg-border-subtle hover:text-text-primary',
        onClick && 'cursor-pointer',
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />}
      <span className={cn('shrink-0', active ? 'text-secondary' : 'text-text-secondary group-hover:text-text-primary')}>{icon}</span>
      <span className="truncate select-text">{text}</span>
    </div>
  );
}

interface BranchNode {
  name: string;
  fullPath: string;
}

interface BranchFolder {
  prefix: string;
  branches: BranchNode[];
}

function buildBranchTree(branches: string[]): { root: BranchNode[]; folders: BranchFolder[] } {
  const root: BranchNode[] = [];
  const folderMap = new Map<string, BranchNode[]>();

  for (const fullPath of branches) {
    const slash = fullPath.indexOf('/');
    if (slash === -1) {
      root.push({ name: fullPath, fullPath });
    } else {
      const prefix = fullPath.slice(0, slash);
      const leaf = fullPath.slice(slash + 1);
      if (!folderMap.has(prefix)) folderMap.set(prefix, []);
      folderMap.get(prefix)!.push({ name: leaf, fullPath });
    }
  }

  root.sort((a, b) => {
    const priority = (n: string) => (n === 'main' ? 0 : n === 'master' ? 1 : 2);
    return priority(a.name) - priority(b.name) || a.name.localeCompare(b.name);
  });

  const folders: BranchFolder[] = Array.from(folderMap.entries())
    .map(([prefix, folderBranches]) => ({
      prefix,
      branches: folderBranches.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix));

  return { root, folders };
}

export function BranchTree({
  branches,
  currentBranch,
  selectedBranch,
  tracking,
  onCheckout,
  onSelect,
  onContextMenu,
  onDelete,
}: {
  branches: string[];
  currentBranch: string;
  selectedBranch?: string | null;
  tracking: BranchTrackingMap;
  onCheckout: (branch: string) => void;
  onSelect?: (branch: string) => void;
  onContextMenu: (event: React.MouseEvent, branch: string) => void;
  onDelete?: (branch: string) => void;
}) {
  const { root, folders } = useMemo(() => buildBranchTree(branches), [branches]);
  // El estado se pide UNA vez acá y se reparte por props. Si cada carpeta
  // llamara al hook por su cuenta, cada una leería y escribiría `localStorage`
  // por separado y no vería los cambios de las demás.
  const repoPath = useGitStore((state) => state.repoPath);
  const folderState = useBranchFolderState(repoPath);

  return (
    <div>
      {root.map((branch) => (
        <BranchRow
          key={branch.fullPath}
          name={branch.name}
          fullPath={branch.fullPath}
          tracking={tracking[branch.fullPath]}
          isActive={branch.fullPath === currentBranch}
          isSelected={branch.fullPath === selectedBranch}
          onCheckout={onCheckout}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          indent={false}
          onDelete={onDelete}
        />
      ))}
      {folders.map((folder) => (
        <BranchFolderView
          key={folder.prefix}
          folder={folder}
          currentBranch={currentBranch}
          selectedBranch={selectedBranch}
          tracking={tracking}
          onCheckout={onCheckout}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
          onDelete={onDelete}
          folderState={folderState}
        />
      ))}
    </div>
  );
}

function BranchFolderView({
  folder,
  currentBranch,
  selectedBranch,
  tracking,
  onCheckout,
  onSelect,
  onContextMenu,
  onDelete,
  folderState,
}: {
  folder: BranchFolder;
  currentBranch: string;
  selectedBranch?: string | null;
  tracking: BranchTrackingMap;
  onCheckout: (branch: string) => void;
  onSelect?: (branch: string) => void;
  onContextMenu: (event: React.MouseEvent, branch: string) => void;
  onDelete?: (branch: string) => void;
  folderState: BranchFolderState;
}) {
  // Abierta o cerrada según lo que la persona eligió para este repositorio,
  // recordado entre sesiones. Antes era `useState(true)`: cada carpeta arrancaba
  // abierta y su estado moría con el componente, así que con 45 ramas bajo
  // `origin` había que cerrarlas a mano en cada apertura de la aplicación.
  const isOpen = folderState.isOpen(folder.prefix);

  useEffect(() => {
    // Saltar a una rama abre la carpeta que la contiene: si no, la rama recién
    // elegida queda invisible dentro de una carpeta cerrada. Depende sólo de la
    // selección, así que no vuelve a abrirla si después se la cierra a mano.
    if (selectedBranch?.startsWith(`${folder.prefix}/`) && !folderState.isOpen(folder.prefix)) {
      folderState.toggle(folder.prefix);
    }
    // `folderState` fuera de las dependencias a propósito: incluirlo volvería a
    // correr esto en cada cambio de estado y reabriría lo que se acaba de cerrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder.prefix, selectedBranch]);

  return (
    <div>
      <button
        onClick={() => folderState.toggle(folder.prefix)}
        className="w-full pl-[26px] pr-3 py-1 flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface/70 transition-colors"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={14} className="text-text-secondary shrink-0" />
        <span className="truncate flex-1 text-left select-text">{folder.prefix}</span>
        <span className="text-[10px] text-text-secondary/70">{folder.branches.length}</span>
      </button>
      {isOpen && (
        <div>
          {folder.branches.map((branch) => (
            <BranchRow
              key={branch.fullPath}
              name={branch.name}
              fullPath={branch.fullPath}
              tracking={tracking[branch.fullPath]}
              isActive={branch.fullPath === currentBranch}
              isSelected={branch.fullPath === selectedBranch}
              onCheckout={onCheckout}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              indent={true}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Indicador de estado local/remoto de una branch local. Sustituye al viejo
 * puntito de color (redundante con el ícono de la izquierda). Todo el estado
 * proviene de refs locales (BranchTrackingInfo), sin llamadas de red.
 *
 *  · solo-local  → HardDrive (muted)         — sin rama remota
 *  · gone        → CloudOff (error)          — el remoto se eliminó
 *  · sincronizada→ Cloud + Check (secondary) — al día con el upstream
 *  · divergida   → Cloud (aviso) + ↑ahead ↓behind
 */
function BranchStatusIndicator({ tracking }: { tracking?: BranchTrackingInfo }) {
  const t = useT();
  const ahead = tracking?.ahead ?? 0;
  const behind = tracking?.behind ?? 0;
  const gone = tracking?.gone ?? false;
  const hasRemote = tracking?.hasRemote ?? false;
  const upstream = tracking?.upstream ?? '';

  if (gone) {
    return (
      <span className="shrink-0 ml-1" title={t('sidebar.branchStatus.gone', { upstream })}>
        <CloudOff size={12} className="text-error/80" />
      </span>
    );
  }

  if (!hasRemote) {
    return (
      <span className="shrink-0 ml-1" title={t('sidebar.branchStatus.local')}>
        <HardDrive size={12} className="text-text-secondary/60" />
      </span>
    );
  }

  if (ahead === 0 && behind === 0) {
    return (
      <span
        className="flex items-center gap-0.5 shrink-0 ml-1 text-secondary"
        title={t('sidebar.branchStatus.synced', { upstream })}
      >
        <Cloud size={12} />
        <Check size={9} strokeWidth={3} />
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1 shrink-0 ml-1 text-[10px] font-mono"
      title={t('sidebar.branchStatus.diverged', { upstream, ahead, behind })}
    >
      <Cloud size={12} className="text-git-mod" />
      {ahead > 0 && (
        <span className="flex items-center text-secondary">
          {ahead}
          <ArrowUp size={10} strokeWidth={3} />
        </span>
      )}
      {behind > 0 && (
        <span className="flex items-center text-git-mod">
          {behind}
          <ArrowDown size={10} strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

function BranchRow({
  name,
  fullPath,
  tracking,
  isActive,
  isSelected,
  onCheckout,
  onSelect,
  onContextMenu,
  indent,
  onDelete,
}: {
  name: string;
  fullPath: string;
  tracking?: BranchTrackingInfo;
  isActive: boolean;
  isSelected?: boolean;
  onCheckout: (branch: string) => void;
  onSelect?: (branch: string) => void;
  onContextMenu: (event: React.MouseEvent, branch: string) => void;
  indent: boolean;
  onDelete?: (branch: string) => void;
}) {
  const currentBranch = useGitStore((state) => state.currentBranch);
  const branchColor = colorForBranch(fullPath, currentBranch || undefined);
  const [isHovered, setIsHovered] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSelected) return;
    rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isSelected]);

  return (
    <div
      ref={rowRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect?.(fullPath)}
      onDoubleClick={() => onCheckout(fullPath)}
      onContextMenu={(event) => onContextMenu(event, fullPath)}
      title="Click: enfocar en graph · Doble click: checkout · Click derecho: opciones"
      className={cn(
        'flex items-center gap-2 py-1 pr-3 group cursor-pointer transition-colors relative',
        indent ? 'pl-[46px]' : 'pl-[26px]',
        isActive
          ? 'bg-secondary/10 text-secondary'
          : isSelected
            ? 'bg-secondary/[0.07] text-text-primary'
            : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
      )}
    >
      {isSelected && !isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary/45" />}
      {isActive ? (
        <Check size={13} strokeWidth={3} className="text-secondary shrink-0" />
      ) : (
        <GitBranch size={13} className="shrink-0" style={{ color: branchColor }} />
      )}
      <span className="truncate flex-1 text-sm select-text">{name}</span>

      {fullPath.startsWith('imagined/') && isHovered ? (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.(fullPath);
          }}
          className="p-1 hover:text-error text-text-secondary transition-colors shrink-0 z-10"
          title="Descartar futuro"
        >
          <Trash2 size={12} />
        </button>
      ) : (
        <BranchStatusIndicator tracking={tracking} />
      )}
    </div>
  );
}

export function RemoteBranchTree({
  branches,
  onCheckout,
  onContextMenu,
}: {
  branches: string[];
  onCheckout: (branch: string) => void;
  onContextMenu: (event: React.MouseEvent, branch: string) => void;
}) {
  const { root, folders } = useMemo(() => buildBranchTree(branches), [branches]);
  const currentBranch = useGitStore((state) => state.currentBranch);
  // Se pide UNA vez y se reparte por props: con el hook dentro de cada carpeta,
  // cada una leería y escribiría `localStorage` por su cuenta sin ver a las otras.
  const repoPath = useGitStore((state) => state.repoPath);
  const folderState = useBranchFolderState(repoPath);

  return (
    <div>
      {root.map((branch) => {
        const branchColor = colorForBranch(branch.fullPath, currentBranch || undefined);
        return (
          <div
            key={branch.fullPath}
            onDoubleClick={() => onCheckout(branch.fullPath)}
            onContextMenu={(event) => onContextMenu(event, branch.fullPath)}
            title="Doble click: checkout · Click derecho: opciones"
            className="pl-[26px] pr-3 py-1.5 flex items-center gap-2 text-sm text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary cursor-pointer transition-colors group relative"
          >
            <Cloud size={13} className="shrink-0" style={{ color: branchColor }} />
            <span className="truncate text-xs flex-1 select-text">{branch.name}</span>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 ml-1 shadow-[0_0_4px_rgba(0,0,0,0.25)]"
              style={{ backgroundColor: branchColor }}
              title={`Color en el grafo: ${branchColor}`}
            />
          </div>
        );
      })}
      {folders.map((folder) => (
        <RemoteFolderView
          key={folder.prefix}
          folder={folder}
          onCheckout={onCheckout}
          onContextMenu={onContextMenu}
          folderState={folderState}
        />
      ))}
    </div>
  );
}

function RemoteFolderView({
  folder,
  onCheckout,
  onContextMenu,
  folderState,
}: {
  folder: BranchFolder;
  onCheckout: (branch: string) => void;
  onContextMenu: (event: React.MouseEvent, branch: string) => void;
  folderState: BranchFolderState;
}) {
  // Recordado por repositorio, igual que las locales. Acá están las carpetas más
  // pobladas —45 ramas bajo `origin` en el repositorio de Ale—, que eran las que
  // más molestaba volver a cerrar en cada apertura.
  const isOpen = folderState.isOpen(folder.prefix);
  const currentBranch = useGitStore((state) => state.currentBranch);
  return (
    <div>
      <button
        onClick={() => folderState.toggle(folder.prefix)}
        className="w-full pl-[26px] pr-3 py-1 flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface/70 transition-colors"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={13} className="text-text-secondary shrink-0" />
        <span className="truncate flex-1 text-left select-text">{folder.prefix}</span>
        <span className="text-[10px] text-text-secondary/70">{folder.branches.length}</span>
      </button>
      {isOpen && (
        <div>
          {folder.branches.map((branch) => {
            const branchColor = colorForBranch(branch.fullPath, currentBranch || undefined);
            return (
              <div
                key={branch.fullPath}
                onDoubleClick={() => onCheckout(branch.fullPath)}
                onContextMenu={(event) => onContextMenu(event, branch.fullPath)}
                className="pl-[46px] pr-3 py-1.5 flex items-center gap-2 text-sm text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary transition-colors cursor-pointer group relative"
                title={`Doble click: checkout · Click derecho: opciones\n${branch.fullPath}`}
              >
                <GitBranch size={13} className="shrink-0" style={{ color: branchColor }} />
                <span className="truncate text-xs flex-1 select-text">{branch.name}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 ml-1 shadow-[0_0_4px_rgba(0,0,0,0.25)]"
                  style={{ backgroundColor: branchColor }}
                  title={`Color en el grafo: ${branchColor}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StashItem({
  stash,
  onApply,
  onPop,
  onPreview,
  onDrop,
}: {
  stash: StashEntry;
  onApply: () => void;
  onPop: () => void;
  onPreview: () => void;
  onDrop: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const t = useT();
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="px-4 py-1.5 flex items-center gap-3 text-sm text-text-secondary hover:bg-border-subtle hover:text-text-primary transition-colors"
      title={stash.message}
    >
      <Archive size={16} className="shrink-0" />
      <span className="truncate flex-1 text-xs select-text">{stash.message}</span>
      {isHovered && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(event) => { event.stopPropagation(); onPreview(); }} className="p-1 hover:text-primary transition-colors" title={t('sidebar.stashPreview')}>
            <FileDiff size={12} />
          </button>
          <button onClick={(event) => { event.stopPropagation(); onApply(); }} className="p-1 hover:text-secondary transition-colors" title={t('sidebar.stashApply')}>
            <RotateCcw size={12} />
          </button>
          <button onClick={(event) => { event.stopPropagation(); onPop(); }} className="p-1 hover:text-git-mod transition-colors" title={t('sidebar.stashPop')}>
            <Upload size={12} />
          </button>
          <button onClick={(event) => { event.stopPropagation(); onDrop(); }} className="p-1 hover:text-error transition-colors" title={t('sidebar.stashDrop')}>
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export function TagItem({
  name,
  onDelete,
  onPush,
}: {
  name: string;
  onDelete: () => void;
  onPush?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const t = useT();
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="px-4 py-1.5 flex items-center gap-3 text-sm text-text-secondary hover:bg-border-subtle hover:text-text-primary transition-colors group relative"
      title={name}
    >
      <Tag size={16} className="shrink-0" />
      <span className="truncate flex-1 text-xs select-text">{name}</span>
      <div className={cn(
        'flex items-center gap-1 shrink-0 z-10 transition-opacity',
        isHovered ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100',
      )}>
        {onPush && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onPush();
            }}
            className="p-1 hover:text-secondary transition-colors"
            title={t('sidebar.pushTagTooltip')}
          >
            <Upload size={12} />
          </button>
        )}
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="p-1 hover:text-error transition-colors"
          title="Eliminar Tag"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}