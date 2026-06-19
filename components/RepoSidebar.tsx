'use client';

// Sidebar izquierdo de la app: flota en la vista chronometric y es inline en
// la clásica. Contiene el chooser de repos, las secciones del repositorio
// (branches locales/remotas, PRs, stash, tags, worktrees, submodules) y las
// listas de secciones de Settings/Help/Profile, más el footer con los accesos
// a Settings/Help/perfil. Extraído de app/page.tsx.
//
// Lee del store lo que es global (branches, stashes, tags, githubUser, …) y
// ejecuta él mismo las acciones de stash/tag-push. Todo lo que abre modales o
// toca estado propio de la página (context menus, confirmaciones, secciones
// activas, layout) llega por props.

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, AlertCircle, ArrowLeft, Cloud, Download, ExternalLink, FileText, Folder,
  FolderOpen, GitMerge, Github, Globe, HelpCircle, Layers, Lock, Map, Monitor,
  Plus, RotateCcw, Settings, Sparkles, TreePine, Type, UserCircle2, Zap,
  Trash2, Edit2, Link2, RefreshCw,
} from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useT } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { userInitials } from '@/lib/page-helpers';
import { FLOATING_PANEL_INSET } from '@/hooks/use-panel-layout';
import type { RepoStartMode } from '@/components/RepoModals';
import type { PullRequestEntry, RemoteEntry, WorktreeEntry, SubmoduleEntry } from '@/types/electron';
import {
  BranchTree,
  RemoteBranchTree,
  SidebarItem,
  SidebarSection,
  StashItem,
  TagItem,
} from '@/components/RepoSidebarParts';

type AppView = 'repository' | 'settings' | 'help' | 'profile';

function SidebarRemoteItem({
  remote,
  onRename,
  onSetUrl,
  onDelete,
}: {
  remote: RemoteEntry;
  onRename: () => void;
  onSetUrl: () => void;
  onDelete: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const titleText = `${remote.name}\nFetch: ${remote.fetchUrl || '-'}\nPush: ${remote.pushUrl || '-'}`;
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="px-4 py-1 flex items-center gap-3 text-sm text-text-secondary hover:bg-border-subtle hover:text-text-primary transition-colors group relative"
      title={titleText}
    >
      <Globe size={14} className="shrink-0 text-text-secondary" />
      <div className="flex-1 min-w-0">
        <span className="truncate text-xs font-semibold block select-text">{remote.name}</span>
        <span className="truncate text-[10px] text-text-secondary/70 block select-text font-mono">{remote.fetchUrl}</span>
      </div>
      <div className={cn(
        'flex items-center gap-1 shrink-0 z-10 transition-opacity',
        isHovered ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100',
      )}>
        <button
          onClick={(e) => { e.stopPropagation(); onSetUrl(); }}
          className="p-1 hover:text-secondary transition-colors"
          title="Cambiar URL"
        >
          <Link2 size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRename(); }}
          className="p-1 hover:text-secondary transition-colors"
          title="Renombrar"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 hover:text-error transition-colors"
          title="Eliminar"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function SidebarWorktreeItem({
  wt,
  onOpen,
  onDelete,
  isMain,
}: {
  wt: WorktreeEntry;
  onOpen: () => void;
  onDelete: () => void;
  isMain: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const name = wt.path.split(/[/\\]/).pop() || wt.path;
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="px-4 py-1 flex items-center gap-3 text-sm text-text-secondary hover:bg-border-subtle hover:text-text-primary transition-colors group relative"
      title={wt.path}
    >
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 text-left flex items-center gap-3"
      >
        <TreePine size={14} className={cn("shrink-0", isMain ? "text-secondary" : "text-primary")} />
        <span className="truncate text-xs flex-1 select-text">{name}</span>
        {wt.branch && (
          <span className="text-[10px] font-mono text-text-secondary/70 shrink-0 bg-bg-surface px-1 rounded">{wt.branch}</span>
        )}
      </button>
      {!isMain && (
        <div className={cn(
          'flex items-center gap-1 shrink-0 z-10 transition-opacity',
          isHovered ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100',
        )}>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:text-error transition-colors"
            title="Eliminar worktree"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarSubmoduleItem({
  sm,
  onUpdate,
  onSync,
}: {
  sm: SubmoduleEntry;
  onUpdate: () => void;
  onSync: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="px-4 py-1.5 flex items-center gap-3 text-sm text-text-secondary hover:bg-border-subtle hover:text-text-primary transition-colors group relative"
      title={`${sm.path}\nCommit: ${sm.hash}`}
    >
      <Layers size={14} className="shrink-0 text-text-secondary" />
      <div className="flex-1 min-w-0">
        <span className="truncate text-xs block select-text font-medium">{sm.path}</span>
        <span className="truncate text-[10px] text-text-secondary/70 block select-text font-mono">{sm.hash.slice(0, 7)}</span>
      </div>
      <div className={cn(
        'flex items-center gap-1 shrink-0 z-10 transition-opacity',
        isHovered ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100',
      )}>
        <button
          onClick={(e) => { e.stopPropagation(); onUpdate(); }}
          className="p-1 hover:text-secondary transition-colors"
          title="Actualizar (update)"
        >
          <RefreshCw size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSync(); }}
          className="p-1 hover:text-secondary transition-colors"
          title="Sincronizar (sync)"
        >
          <Link2 size={12} />
        </button>
      </div>
    </div>
  );
}

type RepoSidebarProps = {
  // layout (estado de usePanelLayout, que vive en la página)
  graphMode: 'classic' | 'chronometric';
  sidebarW: number;
  sidebarOpen: boolean;
  isDragging: boolean;
  onResizeStart: (e: React.MouseEvent) => void;
  // vistas
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  isRepoStartView: boolean;
  repoStartMode: RepoStartMode;
  onRepoStartModeChange: (mode: RepoStartMode) => void;
  onCloseRepoChooser: () => void;
  // interacciones de branches (abren menús/modales de la página)
  selectedBranchName: string | null;
  onCheckoutAttempt: (branch: string) => void;
  onSelectBranchInGraph: (branch: string) => void;
  onBranchContextMenu: (menu: { x: number; y: number; branch: string }) => void;
  onRemoteBranchContextMenu: (menu: { x: number; y: number; branch: string }) => void;
  onDeleteBranchRequest: (branch: string) => void;
  // pull requests
  selectedPullRequest: PullRequestEntry | null;
  onSelectPullRequest: (pr: PullRequestEntry) => void;
  // stash/tags (modales de la página)
  onPreviewStash: (stash: { index: number; message: string }) => void;
  onCreateTagRequest: () => void;
  onDeleteTagRequest: (tag: string) => void;
  // secciones activas de settings/help (compartidas con los paneles del main)
  selectedSettingsSection: string;
  onSettingsSectionChange: (id: string) => void;
  selectedHelpSection: string;
  onHelpSectionChange: (id: string) => void;
  // Cartografía: toggle del sub-estado per-repo (entrar/volver al grafo). El
  // botón sólo se muestra con el flag on y un repo activo (ambos leídos del store).
  onToggleCartography: () => void;

  // remotes
  onAddRemoteRequest?: () => void;
  onRenameRemoteRequest?: (remote: RemoteEntry) => void;
  onSetRemoteUrlRequest?: (remote: RemoteEntry) => void;
  onDeleteRemoteRequest?: (remote: RemoteEntry) => void;
  // worktrees
  onAddWorktreeRequest?: () => void;
  onDeleteWorktreeRequest?: (wt: WorktreeEntry) => void;
  // submodules
  onAddSubmoduleRequest?: () => void;
  onUpdateSubmodule?: (path?: string) => void;
  onSyncSubmodules?: () => void;
};

export function RepoSidebar({
  graphMode, sidebarW, sidebarOpen, isDragging, onResizeStart,
  activeView, onViewChange, isRepoStartView,
  repoStartMode, onRepoStartModeChange, onCloseRepoChooser,
  selectedBranchName, onCheckoutAttempt, onSelectBranchInGraph,
  onBranchContextMenu, onRemoteBranchContextMenu, onDeleteBranchRequest,
  selectedPullRequest, onSelectPullRequest,
  onPreviewStash, onCreateTagRequest, onDeleteTagRequest,
  selectedSettingsSection, onSettingsSectionChange,
  selectedHelpSection, onHelpSectionChange,
  onToggleCartography,
  onAddRemoteRequest, onRenameRemoteRequest, onSetRemoteUrlRequest, onDeleteRemoteRequest,
  onAddWorktreeRequest, onDeleteWorktreeRequest,
  onAddSubmoduleRequest, onUpdateSubmodule, onSyncSubmodules,
}: RepoSidebarProps) {
  const t = useT();
  const {
    repoPath, branches, currentBranch, remoteBranches, branchTracking,
    stashes, tags, submodules, remotes, worktrees, pullRequests,
    githubUser, selectedCommit,
  } = useGitStore();
  const enableCartography = useGitStore((s) => s.enableCartography);
  const inCartography = useGitStore((s) => s.getActiveRepo()?.inCartography ?? false);
  const cartographyActive = activeView === 'repository' && inCartography;
  const { stashApply, stashPop, stashDrop, stashClear, pushTag } = useGitActions();
  const [showStashClearConfirm, setShowStashClearConfirm] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden z-30",
        !isDragging && "transition-all duration-300",
        graphMode === 'chronometric'
          ? "absolute bg-bg-overlay/60 backdrop-blur-md border border-text-primary/15 rounded-xl"
          : "relative bg-bg-base/70 border-r border-border-subtle/30 shrink-0"
      )}
      style={
        graphMode === 'chronometric'
          ? {
              top: 96 + FLOATING_PANEL_INSET,
              left: FLOATING_PANEL_INSET,
              bottom: FLOATING_PANEL_INSET,
              width: sidebarW,
              transform: sidebarOpen ? 'translateX(0)' : `translateX(calc(-100% - ${FLOATING_PANEL_INSET * 2}px))`,
            }
          : {
              width: sidebarOpen ? sidebarW : 0,
              opacity: sidebarOpen ? 1 : 0,
              visibility: sidebarOpen ? 'visible' : 'hidden',
            }
      }
    >
      {/* Right-edge resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="group absolute top-0 right-0 h-full w-2 cursor-col-resize z-40"
        title="Arrastrar para redimensionar"
      >
        <div className="absolute inset-y-3 right-0.5 w-px bg-transparent group-hover:bg-secondary/45 group-active:bg-secondary/70 transition-colors" />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin py-2">
        <AnimatePresence mode="wait">
          {activeView === 'repository' ? (
            isRepoStartView ? (
              <motion.div
                key="repo-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col h-full select-none"
              >
                <div className="px-4 py-2 border-b border-text-primary/10 flex items-center justify-between">
                  <span className="font-bold text-secondary flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <FolderOpen size={14} /> Repositorios
                  </span>
                  {repoPath && (
                    <button
                      onClick={onCloseRepoChooser}
                      className="text-text-secondary hover:text-text-primary text-[10px] uppercase font-bold flex items-center gap-1"
                      title={t('common.backToRepo')}
                    >
                      <ArrowLeft size={12} />
                    </button>
                  )}
                </div>
                <div className="py-2 space-y-0.5">
                  {[
                    { id: 'open' as const, label: 'Abrir existente', icon: <FolderOpen size={14} /> },
                    { id: 'create' as const, label: 'Crear nuevo', icon: <Sparkles size={14} /> },
                    { id: 'clone' as const, label: 'Clonar de GitHub', icon: <Download size={14} /> },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onRepoStartModeChange(item.id)}
                      className={cn(
                        'w-full px-4 py-2 flex items-center gap-3 text-xs font-semibold tracking-wide transition-colors text-left relative',
                        repoStartMode === item.id
                          ? 'bg-secondary/10 text-secondary'
                          : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
                      )}
                    >
                      {repoStartMode === item.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />}
                      <span className={cn('shrink-0', repoStartMode === item.id ? 'text-secondary' : 'text-text-secondary/70')}>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="repository"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col min-h-0"
              >
                {/* LOCAL — folder tree + ahead/behind chips */}
                <SidebarSection title={t('sidebar.local')} count={branches.length || undefined} icon={<Monitor size={12} className="text-primary" />}>
                  {branches.length === 0 && !repoPath && (
                    <p className="px-4 py-2 text-xs text-text-secondary italic">{t('sidebar.noBranches')}</p>
                  )}
                  <BranchTree
                    branches={branches}
                    currentBranch={currentBranch}
                    selectedBranch={selectedBranchName}
                    tracking={branchTracking}
                    onCheckout={(b) => onCheckoutAttempt(b)}
                    onSelect={onSelectBranchInGraph}
                    onContextMenu={(e, b) => {
                      e.preventDefault();
                      onBranchContextMenu({ x: e.clientX, y: e.clientY, branch: b });
                    }}
                    onDelete={(b) => onDeleteBranchRequest(b)}
                  />
                </SidebarSection>

                {/* REMOTE branches (also as tree, grouped by 'origin/...') */}
                <SidebarSection title={t('sidebar.remote')} count={remoteBranches.length || undefined} icon={<Cloud size={12} className="text-primary" />}>
                  <RemoteBranchTree
                    branches={remoteBranches}
                    onCheckout={(b) => onCheckoutAttempt(b)}
                    onContextMenu={(e, b) => {
                      e.preventDefault();
                      onRemoteBranchContextMenu({ x: e.clientX, y: e.clientY, branch: b });
                    }}
                  />
                </SidebarSection>

                {/* PULL REQUESTS — only when logged in to GitHub */}
                {githubUser && (
                  <SidebarSection title={t('sidebar.pullRequests')} count={pullRequests.length || undefined}>
                    {pullRequests.length === 0 && (
                      <p className="px-4 py-1 text-[11px] text-text-secondary italic">{t('sidebar.noPRs')}</p>
                    )}
                    {pullRequests.map((pr) => (
                      <div
                        key={pr.number}
                        className={cn(
                          'group flex items-stretch text-sm transition-colors',
                          selectedPullRequest?.number === pr.number
                            ? 'bg-secondary/10 text-text-primary'
                            : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectPullRequest(pr)}
                          title={t('prDiff.view', { number: String(pr.number) })}
                          className="flex-1 min-w-0 text-left px-4 py-1.5 flex items-start gap-2"
                        >
                          <GitMerge size={14} className={cn('shrink-0 mt-0.5', pr.draft ? 'text-text-secondary' : 'text-secondary')} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono text-text-secondary/70">#{pr.number}</span>
                              {pr.draft && <span className="text-[9px] text-text-secondary/70 uppercase">{t('sidebar.draft')}</span>}
                            </div>
                            <p className="text-xs truncate">{pr.title}</p>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-text-secondary/70">
                              <span className="truncate">{pr.branch}</span>
                              <span className="text-secondary">+{pr.additions}</span>
                              <span className="text-error">-{pr.deletions}</span>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => window.api?.shellOpenExternal(pr.url)}
                          title={t('sidebar.openInGitHub', { number: String(pr.number) })}
                          className="w-8 shrink-0 flex items-center justify-center text-text-secondary/70 hover:text-secondary opacity-0 group-hover:opacity-100 transition"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    ))}
                  </SidebarSection>
                )}

                {/* STASH */}
                <SidebarSection
                  title={t('sidebar.stash')}
                  count={stashes.length || undefined}
                  extra={stashes.length > 1 ? (
                    showStashClearConfirm ? (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={async () => { await stashClear(); setShowStashClearConfirm(false); }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-error text-white font-bold"
                        >
                          Sí, limpiar
                        </button>
                        <button
                          onClick={() => setShowStashClearConfirm(false)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-border-subtle text-text-secondary"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowStashClearConfirm(true)}
                        className="text-[9px] text-text-secondary hover:text-error transition-colors ml-1 font-medium"
                        title="Eliminar todos los stashes"
                      >
                        limpiar todo
                      </button>
                    )
                  ) : undefined}
                >
                  {stashes.length === 0 && repoPath && (
                    <p className="px-4 py-1 text-[11px] text-text-secondary italic">{t('sidebar.noStashes')}</p>
                  )}
                  {stashes.map((s) => (
                    <StashItem
                      key={s.index}
                      stash={s}
                      onApply={() => stashApply(s.index)}
                      onPop={() => stashPop(s.index)}
                      onPreview={() => onPreviewStash(s)}
                      onDrop={() => stashDrop(s.index)}
                    />
                  ))}
                </SidebarSection>

                {/* TAGS */}
                <SidebarSection
                  title={t('sidebar.tags')}
                  count={tags.length || undefined}
                  extra={repoPath ? (
                    <button
                      type="button"
                      onClick={onCreateTagRequest}
                      className="p-1 rounded text-text-secondary hover:text-secondary hover:bg-secondary/10 transition-colors"
                      title={selectedCommit ? t('commitMenu.createTag') : `${t('commitMenu.createTag')} (HEAD)`}
                      aria-label={selectedCommit ? t('commitMenu.createTag') : `${t('commitMenu.createTag')} (HEAD)`}
                    >
                      <Plus size={12} />
                    </button>
                  ) : undefined}
                >
                  {tags.length === 0 && repoPath && (
                    <p className="px-4 py-1 text-[11px] text-text-secondary italic">{t('sidebar.noTags')}</p>
                  )}
                  {tags.map((tg) => (
                    <TagItem key={tg} name={tg} onDelete={() => onDeleteTagRequest(tg)} onPush={() => pushTag(tg)} />
                  ))}
                </SidebarSection>

                {/* REMOTES */}
                {repoPath && (
                  <SidebarSection
                    title={t('sidebar.remotes')}
                    count={remotes.length || undefined}
                    extra={(
                      <button
                        type="button"
                        onClick={onAddRemoteRequest}
                        className="p-1 rounded text-text-secondary hover:text-secondary hover:bg-secondary/10 transition-colors"
                        title={t('sidebar.remoteAdd')}
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  >
                    {remotes.length === 0 && (
                      <p className="px-4 py-1 text-[11px] text-text-secondary italic">{t('sidebar.noRemotes')}</p>
                    )}
                    {remotes.map((rm) => (
                      <SidebarRemoteItem
                        key={rm.name}
                        remote={rm}
                        onRename={() => onRenameRemoteRequest?.(rm)}
                        onSetUrl={() => onSetRemoteUrlRequest?.(rm)}
                        onDelete={() => onDeleteRemoteRequest?.(rm)}
                      />
                    ))}
                  </SidebarSection>
                )}

                {/* WORKTREES — git's native feature for multiple checkouts of the same repo */}
                {repoPath && (
                  <SidebarSection
                    title={t('sidebar.worktrees')}
                    count={worktrees.length > 1 ? worktrees.length - 1 : undefined}
                    extra={(
                      <button
                        type="button"
                        onClick={onAddWorktreeRequest}
                        className="p-1 rounded text-text-secondary hover:text-secondary hover:bg-secondary/10 transition-colors"
                        title={t('sidebar.worktreeAdd')}
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  >
                    {worktrees.length <= 1 ? (
                      <p className="px-4 py-1 text-[11px] text-text-secondary italic">{t('sidebar.noWorktrees')}</p>
                    ) : (
                      worktrees.map((wt) => {
                        const isMain = wt.path.replace(/\\/g, '/').toLowerCase() === repoPath.replace(/\\/g, '/').toLowerCase();
                        if (isMain) return null;
                        return (
                          <SidebarWorktreeItem
                            key={wt.path}
                            wt={wt}
                            isMain={isMain}
                            onOpen={() => window.api?.shellOpenPath(wt.path)}
                            onDelete={() => onDeleteWorktreeRequest?.(wt)}
                          />
                        );
                      })
                    )}
                  </SidebarSection>
                )}

                {/* SUBMODULES */}
                {repoPath && (
                  <SidebarSection
                    title={t('sidebar.submodules')}
                    count={submodules.length || undefined}
                    extra={(
                      <button
                        type="button"
                        onClick={onAddSubmoduleRequest}
                        className="p-1 rounded text-text-secondary hover:text-secondary hover:bg-secondary/10 transition-colors"
                        title={t('sidebar.submoduleAdd')}
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  >
                    {submodules.length === 0 ? (
                      <p className="px-4 py-1 text-[11px] text-text-secondary italic">{t('sidebar.noSubmodules')}</p>
                    ) : (
                      submodules.map((sm) => (
                        <SidebarSubmoduleItem
                          key={sm.path}
                          sm={sm}
                          onUpdate={() => onUpdateSubmodule?.(sm.path)}
                          onSync={() => onSyncSubmodules?.()}
                        />
                      ))
                    )}
                  </SidebarSection>
                )}
              </motion.div>
            )
          ) : activeView === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full select-none"
            >
              <div className="px-4 py-2 border-b border-text-primary/10 flex items-center justify-between">
                <span className="font-bold text-secondary flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Settings size={14} /> {t('settings.title')}
                </span>
                <button
                  onClick={() => onViewChange('repository')}
                  className="text-text-secondary hover:text-text-primary text-[10px] uppercase font-bold flex items-center gap-1"
                  title={t('common.backToRepo')}
                >
                  <ArrowLeft size={12} />
                </button>
              </div>
              <div className="py-2 space-y-0.5">
                {[
                  { id: 'language', label: t('settings.language'), icon: <Globe size={14} /> },
                  { id: 'fontSize', label: t('settings.fontSize'), icon: <Type size={14} /> },
                  { id: 'defaultFolder', label: t('settings.defaultFolder'), icon: <Folder size={14} /> },
                  { id: 'theme', label: t('settings.theme'), icon: <Sparkles size={14} /> },
                  { id: 'cronometric', label: t('settings.timeline'), icon: <Sparkles size={14} /> },
                  { id: 'cartography', label: t('settings.cartography'), icon: <Map size={14} /> },
                  { id: 'temporalAgent', label: t('settings.temporalAgent'), icon: <Layers size={14} /> },
                  { id: 'agentDashboard', label: t('settings.agentDashboard'), icon: <Activity size={14} /> },
                  { id: 'autoFetch', label: t('settings.autoFetch'), icon: <RotateCcw size={14} /> },
                  { id: 'osNotifications', label: t('settings.osNotifications'), icon: <AlertCircle size={14} /> },
                  { id: 'shortcuts', label: t('settings.shortcuts'), icon: <Type size={14} /> },
                  { id: 'security', label: t('settings.security'), icon: <Lock size={14} /> },
                  { id: 'updates', label: t('settings.checkUpdates'), icon: <Download size={14} /> },
                  { id: 'about', label: t('settings.about'), icon: <HelpCircle size={14} /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSettingsSectionChange(item.id)}
                    className={cn(
                      'w-full px-4 py-2 flex items-center gap-3 text-xs font-semibold tracking-wide transition-colors text-left relative',
                      selectedSettingsSection === item.id
                        ? 'bg-secondary/10 text-secondary'
                        : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
                    )}
                  >
                    {selectedSettingsSection === item.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />}
                    <span className={cn('shrink-0', selectedSettingsSection === item.id ? 'text-secondary' : 'text-text-secondary/70')}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : activeView === 'help' ? (
            <motion.div
              key="help"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full select-none"
            >
              <div className="px-4 py-2 border-b border-text-primary/10 flex items-center justify-between">
                <span className="font-bold text-secondary flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <HelpCircle size={14} /> {t('toolbar.help')}
                </span>
                <button
                  onClick={() => onViewChange('repository')}
                  className="text-text-secondary hover:text-text-primary text-[10px] uppercase font-bold flex items-center gap-1"
                  title={t('common.backToRepo')}
                >
                  <ArrowLeft size={12} />
                </button>
              </div>
              <div className="py-2 space-y-0.5">
                {[
                  { id: 'whatis', label: t('page.help.whatis.title'), icon: <HelpCircle size={14} /> },
                  { id: 'columns', label: t('page.help.columns.title'), icon: <Layers size={14} /> },
                  { id: 'tabs', label: t('page.help.tabs.title'), icon: <FileText size={14} /> },
                  { id: 'states', label: t('page.help.states.title'), icon: <Sparkles size={14} /> },
                  { id: 'buttons', label: t('page.help.buttons.title'), icon: <Zap size={14} /> },
                  { id: 'flow', label: t('page.help.flow.title'), icon: <RotateCcw size={14} /> },
                  { id: 'security', label: t('page.help.security.title'), icon: <Lock size={14} /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onHelpSectionChange(item.id)}
                    className={cn(
                      'w-full px-4 py-2 flex items-center gap-3 text-xs font-semibold tracking-wide transition-colors text-left relative',
                      selectedHelpSection === item.id
                        ? 'bg-secondary/10 text-secondary'
                        : 'text-text-secondary hover:bg-bg-surface/70 hover:text-text-primary',
                    )}
                  >
                    {selectedHelpSection === item.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />}
                    <span className={cn('shrink-0', selectedHelpSection === item.id ? 'text-secondary' : 'text-text-secondary/70')}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full select-none"
            >
              <div className="px-4 py-2 border-b border-text-primary/10 flex items-center justify-between">
                <span className="font-bold text-secondary flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Github size={14} /> {t('toolbar.profile')}
                </span>
                <button
                  onClick={() => onViewChange('repository')}
                  className="text-text-secondary hover:text-text-primary text-[10px] uppercase font-bold flex items-center gap-1"
                  title={t('common.backToRepo')}
                >
                  <ArrowLeft size={12} />
                </button>
              </div>
              <div className="py-2">
                <button
                  className="w-full px-4 py-2 flex items-center gap-3 text-xs font-semibold tracking-wide bg-secondary/10 text-secondary text-left relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />
                  <span className="shrink-0 text-secondary"><Github size={14} /></span>
                  <span className="truncate">{t('profile.githubAccount')}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="shrink-0 border-t border-text-primary/10 bg-bg-base/70/35 px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onViewChange(activeView === 'settings' ? 'repository' : 'settings')}
            title={t('toolbar.settings')}
            className={cn(
              'h-9 w-9 rounded-lg border flex items-center justify-center transition-colors',
              activeView === 'settings'
                ? 'border-secondary/35 bg-secondary/10 text-secondary'
                : 'border-text-primary/15 bg-text-primary/[0.035] text-text-secondary hover:border-secondary/35 hover:bg-text-primary/10 hover:text-secondary'
            )}
          >
            <Settings size={17} />
          </button>
          <button
            type="button"
            onClick={() => onViewChange(activeView === 'help' ? 'repository' : 'help')}
            title={t('toolbar.help')}
            className={cn(
              'h-9 w-9 rounded-lg border flex items-center justify-center transition-colors',
              activeView === 'help'
                ? 'border-secondary/35 bg-secondary/10 text-secondary'
                : 'border-text-primary/15 bg-text-primary/[0.035] text-text-secondary hover:border-secondary/35 hover:bg-text-primary/10 hover:text-secondary'
            )}
          >
            <HelpCircle size={17} />
          </button>
          {enableCartography && repoPath && (
            <button
              type="button"
              onClick={onToggleCartography}
              title={cartographyActive ? t('cartography.backToGraph') : t('cartography.open')}
              className={cn(
                'h-9 w-9 rounded-lg border flex items-center justify-center transition-colors',
                cartographyActive
                  ? 'border-secondary/35 bg-secondary/10 text-secondary'
                  : 'border-text-primary/15 bg-text-primary/[0.035] text-text-secondary hover:border-secondary/35 hover:bg-text-primary/10 hover:text-secondary'
              )}
            >
              <Map size={17} />
            </button>
          )}
          <div className="ml-auto">
            {githubUser ? (
              <button
                type="button"
                onClick={() => onViewChange(activeView === 'profile' ? 'repository' : 'profile')}
                title={t('toolbar.connectedAs', { user: githubUser.login })}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors',
                  activeView === 'profile'
                    ? 'border-secondary bg-secondary/20'
                    : 'border-secondary/35 bg-secondary/10 hover:border-secondary/60 hover:bg-secondary/15'
                )}
              >
                {githubUser.avatarUrl ? (
                  <img
                    src={githubUser.avatarUrl}
                    alt={githubUser.login}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[#a3f185] to-[#68b24f] flex items-center justify-center text-[10px] font-bold text-[#052900]">
                    {userInitials(githubUser)}
                  </div>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onViewChange(activeView === 'profile' ? 'repository' : 'profile')}
                title={t('toolbar.connectGitHub')}
                className={cn(
                  'h-10 w-10 shrink-0 rounded-full border flex items-center justify-center transition-colors',
                  activeView === 'profile'
                    ? 'border-secondary bg-secondary/15 text-secondary'
                    : 'border-text-primary/15 bg-text-primary/[0.035] text-text-secondary hover:text-secondary hover:bg-text-primary/10 hover:border-secondary/35'
                )}
              >
                <UserCircle2 size={24} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
