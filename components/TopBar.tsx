'use client';

// Topbar de la app: toggles de paneles, tabs de navegación (Commit/Graph/
// History), acciones git (pull/push/branch/stash/fetch), switch de modo de
// graph, controles de update, terminal, filtro de branches y búsqueda.
// Compone los widgets ya extraídos (UpdateControls, GraphSearchControl,
// BranchFilterDropdown, FetchIndicator). Extraído de app/page.tsx.

import { motion } from 'motion/react';
import {
  Archive, Download, FileInput, GitBranch, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Redo, Terminal, Undo, Upload,
} from 'lucide-react';
import { useGitStore } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useT } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { FetchIndicator, ToolbarButton } from '@/components/PageWidgets';
import { UpdateControls } from '@/components/UpdateControls';
import { GraphSearchControl } from '@/components/GraphSearchControl';
import { BranchFilterDropdown } from '@/components/BranchFilterDropdown';
import type { UpdateStatus, UpdateInfo } from '@/hooks/use-app-update';

type TopBarProps = {
  graphMode: 'classic' | 'chronometric';
  // panel toggles (estado de usePanelLayout, vive en la página)
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  // navegación
  activeTab: string;
  onTabChange: (tab: string) => void;
  // acciones git que abren toasts/modales de la página
  onPullIntent: () => void;
  onPushIntent: () => void;
  onNewBranchRequest: () => void;
  onOpenStashModal: () => void;
  onFetchNow: () => void | Promise<void>;
  // switch clásico/cronométrico (condición computada por la página)
  showGraphModeSwitch: boolean;
  activeGraphMode: 'classic' | 'chronometric';
  onChangeGraphMode: (mode: 'classic' | 'chronometric') => void;
  // updates (instancia única de useAppUpdate en la página)
  updateStatus: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  showUpdateMenu: boolean;
  setShowUpdateMenu: React.Dispatch<React.SetStateAction<boolean>>;
  updateMenuRef: React.RefObject<HTMLDivElement | null>;
  onCheckForUpdate: () => void | Promise<void>;
  onDownloadUpdate: () => void | Promise<void>;
  onInstallUpdate: () => void | Promise<void>;
  // búsqueda (filterText lo consumen los graphs; open lo abre el shortcut)
  filterText: string;
  onFilterTextChange: (value: string) => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
};

export function TopBar({
  graphMode,
  sidebarOpen, onToggleSidebar, detailsOpen, onToggleDetails,
  activeTab, onTabChange,
  onPullIntent, onPushIntent, onNewBranchRequest, onOpenStashModal, onFetchNow,
  showGraphModeSwitch, activeGraphMode, onChangeGraphMode,
  updateStatus, updateInfo, downloadProgress, showUpdateMenu, setShowUpdateMenu,
  updateMenuRef, onCheckForUpdate, onDownloadUpdate, onInstallUpdate,
  filterText, onFilterTextChange, searchOpen, onSearchOpenChange,
}: TopBarProps) {
  const t = useT();
  const repoPath = useGitStore((s) => s.repoPath);
  const isLoading = useGitStore((s) => s.isLoading);
  const { applyPatchFile, openTerminal } = useGitActions();

  return (
    <header
      className="grid items-center shrink-0 relative z-50 h-12 bg-bg-surface grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] px-4"
    >
      <div className="flex items-center gap-4 h-full min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? t('toolbar.hideSidebar') : t('toolbar.showSidebar')}
          aria-pressed={sidebarOpen}
          title={sidebarOpen ? t('toolbar.hideSidebar') : t('toolbar.showSidebar')}
          className={cn(
            'min-h-[44px] min-w-[44px] h-11 w-11 shrink-0 rounded-lg bg-text-primary/[0.035] text-text-secondary',
            'flex items-center justify-center transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
            'hover:bg-text-primary/10 hover:text-secondary',
            'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
            sidebarOpen && 'text-secondary bg-secondary/10',
          )}
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <nav className="flex h-full gap-1 shrink-0">
          {[
            { key: 'Commit', label: t('tab.commit') },
            { key: 'Graph', label: t('tab.graph') },
            { key: 'History', label: t('tab.history') },
            { key: 'Pipeline', label: t('tab.pipeline') },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'px-3 h-full flex items-center text-sm transition-colors relative',
                activeTab === tab.key ? 'text-secondary' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div layoutId="activeTab" className="absolute bottom-1.5 left-2 right-2 h-0.5 rounded-full bg-secondary" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center justify-center gap-1 px-2">
        <ToolbarButton icon={<Undo />} onClick={() => {}} title={t('toolbar.undo')} />
        <ToolbarButton icon={<Redo />} onClick={() => {}} title={t('toolbar.redo')} />
        <div className="w-px h-4 bg-border-subtle mx-1" />
        <ToolbarButton icon={<Download />} onClick={onPullIntent} title={t('toolbar.pull')} label={t('toolbar.pull')} disabled={!repoPath || isLoading} />
        <ToolbarButton icon={<Upload />} onClick={onPushIntent} title={t('toolbar.push')} label={t('toolbar.push')} disabled={!repoPath || isLoading} />
        <div className="w-px h-4 bg-border-subtle mx-1" />
        <ToolbarButton
          icon={<GitBranch />}
          onClick={onNewBranchRequest}
          title={t('toolbar.newBranch')} label={t('toolbar.branch')} disabled={!repoPath}
        />
        <ToolbarButton icon={<Archive />} onClick={onOpenStashModal} title={t('toolbar.stash')} label={t('toolbar.stash')} disabled={!repoPath || isLoading} />
        <ToolbarButton icon={<FileInput />} onClick={applyPatchFile} title={t('toolbar.applyPatchTooltip')} label={t('toolbar.patch')} disabled={!repoPath || isLoading} />
        <FetchIndicator onClick={onFetchNow} />
      </div>

      <div className="flex items-center justify-end gap-1 min-w-0">
        {/* Switch clásico/cronométrico — solo en la tab Graph con cronométrico habilitado */}
        {showGraphModeSwitch && (
          <div className="bg-bg-overlay/90 rounded-md flex items-center p-0.5 mr-1 shrink-0">
            <button
              type="button"
              onClick={() => onChangeGraphMode('classic')}
              className={cn(
                "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-all duration-150",
                activeGraphMode === 'classic'
                  ? "bg-secondary/15 text-secondary shadow-[0_0_8px_rgba(163,241,133,0.15)]"
                  : "text-text-secondary hover:text-text-primary"
              )}
              title={t('toolbar.viewClassicTooltip')}
            >
              {t('toolbar.viewClassicBtn')}
            </button>
            <button
              type="button"
              onClick={() => onChangeGraphMode('chronometric')}
              className={cn(
                "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-all duration-150",
                activeGraphMode === 'chronometric'
                  ? "bg-secondary/15 text-secondary shadow-[0_0_8px_rgba(163,241,133,0.15)]"
                  : "text-text-secondary hover:text-text-primary"
              )}
              title={t('toolbar.viewChronometricTooltip')}
            >
              {t('toolbar.viewChronometricBtn')}
            </button>
          </div>
        )}
        {/* Version tag + GitHub icon / update status */}
        <UpdateControls
          updateStatus={updateStatus}
          updateInfo={updateInfo}
          downloadProgress={downloadProgress}
          showUpdateMenu={showUpdateMenu}
          setShowUpdateMenu={setShowUpdateMenu}
          updateMenuRef={updateMenuRef}
          onCheckForUpdate={onCheckForUpdate}
          onDownloadUpdate={onDownloadUpdate}
          onInstallUpdate={onInstallUpdate}
        />
        <div className="w-px h-4 bg-border-subtle mx-1" />
        <ToolbarButton icon={<Terminal />} onClick={openTerminal} title={t('toolbar.terminal')} disabled={!repoPath} />

        {/* Branch filter dropdown — only visible when Graph tab is active */}
        {activeTab === 'Graph' && repoPath && <BranchFilterDropdown />}
        <GraphSearchControl
          filterText={filterText}
          onFilterTextChange={onFilterTextChange}
          disabled={!repoPath}
          open={searchOpen}
          onOpenChange={onSearchOpenChange}
        />
        <div className="w-px h-4 bg-border-subtle mx-1 shrink-0" />
        <button
          type="button"
          onClick={onToggleDetails}
          aria-label={detailsOpen ? t('toolbar.hideDetails') : t('toolbar.showDetails')}
          aria-pressed={detailsOpen}
          title={detailsOpen ? t('toolbar.hideDetails') : t('toolbar.showDetails')}
          className={cn(
            'min-h-[44px] min-w-[44px] h-11 w-11 shrink-0 rounded-lg bg-text-primary/[0.035] text-text-secondary',
            'flex items-center justify-center transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
            'hover:bg-text-primary/10 hover:text-secondary',
            'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
            detailsOpen && 'text-secondary bg-secondary/10',
          )}
        >
          {detailsOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      </div>
    </header>
  );
}
