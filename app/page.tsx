'use client';

import { useState, useEffect } from 'react';
import { 
  Undo, Redo, Download, Upload, GitBranch, Archive, Terminal, Search, 
  Settings, HelpCircle, User, Folder, Cloud, Inbox, Tag, Layers, 
  ChevronRight, MoreHorizontal, FileText, Trash2, Zap, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGitStore, Commit, GitFile } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { cn } from '@/lib/utils';

export default function GitCronPage() {
  const { 
    currentBranch, commits, modifiedFiles, commitMessage, setCommitMessage,
    selectedCommit, setSelectedCommit, isLoading, error, setError
  } = useGitStore();
  
  const { 
    commitChanges, mergeBranch, revertCommit, stashChanges, discardFileChanges, stageFile 
  } = useGitActions();

  const [activeTab, setActiveTab] = useState('Graph');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, branch?: string, hash?: string } | null>(null);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0D0E12] text-[#E1E1E6] font-sans overflow-hidden select-none">
      {/* Top Navigation */}
      <header className="h-12 border-b border-[#2D2E39] bg-[#15121b] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-6 h-full">
          <span className="font-bold text-[#d0bcff] text-lg">GitCron</span>
          <nav className="flex h-full gap-1">
            {['Commit', 'Graph', 'History'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 h-full flex items-center text-sm transition-colors relative",
                  activeTab === tab ? "text-[#d0bcff]" : "text-[#9BA1B0] hover:text-[#E1E1E6]"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d0bcff]" 
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-2xl px-8">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9BA1B0]" />
            <input 
              className="w-full bg-[#211e27] border border-[#2D2E39] rounded px-8 py-1 text-sm focus:outline-none focus:border-[#d0bcff]/50"
              placeholder="Filter (Ctrl + Alt + F)"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton icon={<Undo />} onClick={() => {}} title="Undo" />
          <ToolbarButton icon={<Redo />} onClick={() => {}} title="Redo" />
          <div className="w-px h-4 bg-[#2D2E39] mx-1" />
          <ToolbarButton icon={<Download />} onClick={() => {}} title="Pull" label="Pull" />
          <ToolbarButton icon={<Upload />} onClick={() => {}} title="Push" label="Push" />
          <div className="w-px h-4 bg-[#2D2E39] mx-1" />
          <ToolbarButton icon={<GitBranch />} onClick={() => {}} title="Branch" label="Branch" />
          <ToolbarButton icon={<Archive />} onClick={stashChanges} title="Stash" label="Stash" />
          <ToolbarButton icon={<Terminal />} onClick={() => {}} title="Terminal" />
          <div className="w-px h-4 bg-[#2D2E39] mx-1" />
          <ToolbarButton icon={<Settings />} onClick={() => {}} />
          <ToolbarButton icon={<HelpCircle />} onClick={() => {}} />
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[#2D2E39]">
            <div className="w-7 h-7 rounded-full bg-[#8A5CF5] flex items-center justify-center text-xs font-bold">
              AD
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r border-[#2D2E39] bg-[#15121b] flex flex-col shrink-0 overflow-y-auto">
          <SidebarSection title="LOCAL">
            <SidebarItem icon={<Folder size={16} />} text="main" active />
            <SidebarItem icon={<Folder size={16} />} text="feature/ui-refresh" />
          </SidebarSection>
          <SidebarSection title="REMOTE">
            <SidebarItem icon={<Cloud size={16} />} text="origin/main" />
          </SidebarSection>
          <SidebarSection title="STASH" count={2}>
            <SidebarItem icon={<Archive size={16} />} text="WIP on main: update icons" />
          </SidebarSection>
          <SidebarSection title="TAGS">
            <SidebarItem icon={<Tag size={16} />} text="v1.0.0" />
          </SidebarSection>
          <SidebarSection title="SUBMODULES">
            <SidebarItem icon={<Layers size={16} />} text="backend-core" />
          </SidebarSection>
        </aside>

        {/* Graph Area */}
        <main className="flex-1 bg-[#0D0E12] overflow-y-auto relative flex flex-col">
          <div className="sticky top-0 bg-[#0D0E12]/90 backdrop-blur z-10 border-b border-[#2D2E39] py-2 px-4 flex justify-between items-center text-[11px] text-[#9BA1B0] uppercase tracking-wider font-bold">
            <div className="flex gap-4">
              <span>Graph</span>
              <span>Description</span>
            </div>
            <div className="flex gap-16 mr-8">
              <span>Date</span>
              <span>Author</span>
              <span>Commit</span>
            </div>
          </div>

          <div className="p-1">
            {commits.map((commit, i) => (
              <CommitRow 
                key={commit.hash} 
                commit={commit} 
                index={i}
                selected={selectedCommit?.hash === commit.hash}
                onClick={() => setSelectedCommit(commit)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, hash: commit.hash });
                }}
              />
            ))}
          </div>
        </main>

        {/* Commit Details Panel */}
        <aside className="w-80 border-l border-[#2D2E39] bg-[#15121b] flex flex-col shrink-0 overflow-hidden">
          {selectedCommit ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-[#2D2E39]">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[12px] font-mono text-[#d0bcff]">commit: {selectedCommit.hash}</div>
                  <button className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#2D2E39] text-xs hover:bg-[#37333d] transition-colors">
                    <Zap size={12} className="text-[#ffb868]" />
                    Explain
                  </button>
                </div>
                <h2 className="font-semibold mb-1">{selectedCommit.message}</h2>
                <div className="text-xs text-[#9BA1B0] mb-4">{selectedCommit.date}</div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#8A5CF5] flex items-center justify-center text-xs font-bold">
                    {selectedCommit.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{selectedCommit.author}</div>
                    <div className="text-[10px] text-[#9BA1B0]">adelgado@gitcron.app</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-2 border-b border-[#2D2E39] flex justify-between items-center bg-[#1d1a23]">
                  <span className="text-[11px] font-bold text-[#9BA1B0] uppercase tracking-wider">Changed Files ({modifiedFiles.length})</span>
                  <div className="flex gap-2 text-[11px] font-mono">
                    <span className="text-[#2EB872]">+45</span>
                    <span className="text-[#E94E4E]">-12</span>
                  </div>
                </div>
                <div className="p-1">
                  {modifiedFiles.map(file => (
                    <FileRow 
                      key={file.path} 
                      file={file} 
                      onDiscard={() => discardFileChanges(file.path)}
                      onStage={(stage) => stageFile(file.path, stage)}
                    />
                  ))}
                </div>
              </div>

              {/* Commit Area */}
              <div className="p-4 border-t border-[#2D2E39] bg-[#1d1a23]">
                <textarea 
                  className="w-full bg-[#15121b] border border-[#2D2E39] rounded p-2 text-sm text-[#E1E1E6] h-24 focus:outline-none focus:border-[#d0bcff]/30 resize-none"
                  placeholder="Summary (required)"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                />
                <button 
                  onClick={commitChanges}
                  disabled={isLoading || !commitMessage.trim()}
                  className="w-full mt-3 py-2 bg-[#8A5CF5] hover:bg-[#9f78ff] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold text-white rounded transition-colors shadow-lg shadow-[#8A5CF5]/20"
                >
                  {isLoading ? 'Committing...' : 'Commit Changes to 1 file'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#9BA1B0]">
              <GitBranch size={48} className="mb-4 opacity-10" />
              <p className="text-sm">Select a commit to view details</p>
            </div>
          )}
        </aside>
      </div>

      {/* Global Status/Error */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 p-3 bg-[#93000a] text-[#ffdad6] rounded-lg shadow-2xl flex items-center gap-3 z-50 border border-[#ffb4ab]/20"
          >
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-4 hover:opacity-70">
              <Zap size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            onMerge={() => contextMenu.hash && mergeBranch(contextMenu.hash)}
            onRevert={() => contextMenu.hash && revertCommit(contextMenu.hash)}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolbarButton({ icon, onClick, title, label }: { icon: React.ReactNode, onClick: () => void, title?: string, label?: string }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className={cn(
        "flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#2D2E39] transition-colors group",
        label && "px-3"
      )}
    >
      <div className="w-5 h-5 text-[#9BA1B0] group-hover:text-[#d0bcff] flex items-center justify-center">
        {icon}
      </div>
      {label && <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter text-[#9BA1B0]">{label}</span>}
    </button>
  );
}

function SidebarSection({ title, children, count }: { title: string, children: React.ReactNode, count?: number }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="mt-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-1 px-4 py-1 text-[11px] font-bold text-[#9BA1B0] hover:text-[#E1E1E6]"
      >
        <ChevronRight size={14} className={cn("transition-transform", isOpen && "rotate-90")} />
        <span className="flex-1 text-left">{title}</span>
        {count && <span className="bg-[#2D2E39] text-[9px] px-1.5 rounded-full">{count}</span>}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

function SidebarItem({ icon, text, active }: { icon: React.ReactNode, text: string, active?: boolean }) {
  return (
    <div className={cn(
      "px-4 py-1.5 flex items-center gap-3 text-sm transition-colors cursor-pointer group relative",
      active ? "text-[#d0bcff] bg-[#d0bcff]/10" : "text-[#9BA1B0] hover:bg-[#2D2E39] hover:text-[#E1E1E6]"
    )}>
      {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#d0bcff]" />}
      <span className={cn("shrink-0", active ? "text-[#d0bcff]" : "text-[#9BA1B0] group-hover:text-[#E1E1E6]")}>{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function CommitRow({ commit, index, selected, onClick, onContextMenu }: { commit: Commit, index: number, selected: boolean, onClick: () => void, onContextMenu: (e: React.MouseEvent) => void }) {
  return (
    <div 
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "flex items-center h-9 px-4 cursor-pointer transition-colors group relative",
        selected ? "bg-[#d0bcff]/15" : "hover:bg-[#1d1a23]"
      )}
    >
      {selected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#d0bcff]" />}
      
      {/* Graph line placeholder */}
      <div className="w-16 flex items-center relative h-full">
        <div className="w-[2px] h-full bg-[#37333d] absolute left-1/2 -translate-x-1/2" />
        <div className={cn(
          "w-3 h-3 rounded-full border-2 border-[#0D0E12] z-10 relative left-1/2 -translate-x-1/2 shadow-lg",
          index % 2 === 0 ? "bg-[#5cde94]" : "bg-[#d0bcff]"
        )} />
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <span className={cn("truncate text-sm font-medium", selected ? "text-[#E1E1E6]" : "text-[#cbc3d7] group-hover:text-[#E1E1E6]")}>
            {commit.message}
          </span>
          {index === 0 && <span className="bg-[#2EB872]/20 text-[#2EB872] text-[10px] px-1.5 py-0.5 rounded border border-[#2EB872]/30">main</span>}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono shrink-0">
        <span className="text-[#9BA1B0] w-24 text-right">{commit.date}</span>
        <div className="flex items-center gap-2 w-32 justify-end">
          <span className="text-[#9BA1B0] truncate max-w-[80px]">{commit.author}</span>
          <div className="w-6 h-6 rounded-full bg-[#8A5CF5] flex items-center justify-center text-[10px] font-bold">
            {commit.author[0]}
          </div>
        </div>
        <span className={cn("w-20 text-right group-hover:text-[#d0bcff]", selected ? "text-[#d0bcff]" : "text-[#9BA1B0]")}>{commit.hash}</span>
      </div>
    </div>
  );
}

function FileRow({ file, onDiscard, onStage }: { file: GitFile, onDiscard: () => void, onStage: (stage: boolean) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center gap-3 px-3 py-1.5 hover:bg-[#2D2E39]/50 rounded group transition-colors"
    >
      <input 
        type="checkbox" 
        checked={file.staged}
        onChange={(e) => onStage(e.target.checked)}
        className="w-3.5 h-3.5 rounded bg-[#15121b] border-[#2D2E39] text-[#8A5CF5] focus:ring-0"
      />
      <FileText size={16} className={cn(
        file.status === 'modified' ? 'text-[#F5A623]' : 
        file.status === 'added' ? 'text-[#2EB872]' : 'text-[#E94E4E]'
      )} />
      <span className="text-sm truncate flex-1 text-[#cbc3d7] group-hover:text-[#E1E1E6]">{file.path}</span>
      
      <div className="flex items-center gap-2">
        {isHovered && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDiscard(); }}
            className="p-1 hover:text-[#E94E4E] text-[#9BA1B0] transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
        <div className={cn(
          "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold",
          file.status === 'modified' ? 'bg-[#F5A623]/20 text-[#F5A623]' : 
          file.status === 'added' ? 'bg-[#2EB872]/20 text-[#2EB872]' : 'bg-[#E94E4E]/20 text-[#E94E4E]'
        )}>
          {file.status[0].toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function ContextMenu({ x, y, onMerge, onRevert, onClose }: { x: number, y: number, onMerge: () => void, onRevert: () => void, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bg-[#211e27] border border-[#2D2E39] rounded-lg shadow-2xl py-1 z-[100] w-64"
      style={{ left: x, top: y }}
    >
      <ContextMenuItem onClick={onMerge} text="Merge into main" />
      <ContextMenuItem onClick={onRevert} text="Revert commit" />
      <div className="h-px bg-[#2D2E39] my-1" />
      <ContextMenuItem onClick={() => {}} text="Checkout" />
      <ContextMenuItem onClick={() => {}} text="Create branch here" />
      <ContextMenuItem onClick={() => {}} text="Cherry pick commit" />
      <div className="h-px bg-[#2D2E39] my-1" />
      <ContextMenuItem onClick={() => {}} text="Copy commit sha" textSecondary="Ctrl+C" />
      <ContextMenuItem onClick={onClose} text="Close Menu" />
    </motion.div>
  );
}

function ContextMenuItem({ onClick, text, textSecondary }: { onClick: () => void, text: string, textSecondary?: string }) {
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center justify-between px-4 py-1.5 text-sm hover:bg-[#8A5CF5] text-[#cbc3d7] hover:text-white transition-colors"
    >
      <span>{text}</span>
      {textSecondary && <span className="text-[10px] opacity-50">{textSecondary}</span>}
    </button>
  );
}
