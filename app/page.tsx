'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Undo, Redo, Download, Upload, GitBranch, Archive, Terminal, Search,
  Settings, HelpCircle, Folder, Cloud, Tag, Layers,
  ChevronRight, FileText, Trash2, Zap, AlertCircle, FolderOpen, Plus, X,
  ArrowLeft, RotateCcw, Github, LogOut, Minus,
  Sparkles, Copy, Lock, Globe, Loader2, UserCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGitStore, Commit, GitFile } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { useRepoLoader } from '@/hooks/use-repo-loader';
import { DiffViewer } from '@/components/DiffViewer';
import { CommitGraph } from '@/components/CommitGraph';
import { cn } from '@/lib/utils';

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
}

/**
 * Derive 2-letter initials from a GitHub user object, falling back through
 * name → login → email. Always returns at most 2 chars.
 */
function userInitials(user: { name?: string | null; login?: string; email?: string | null }): string {
  if (user.name && user.name.trim()) return initials(user.name.trim());
  if (user.login) return user.login.slice(0, 2).toUpperCase();
  if (user.email) return user.email.split('@')[0].slice(0, 2).toUpperCase();
  return '?';
}

export default function GitCronPage() {
  const {
    repoPath, repoName,
    currentBranch, branches, remoteBranches,
    commits, modifiedFiles, commitMessage, setCommitMessage,
    selectedCommit, setSelectedCommit, isLoading, error, setError,
    selectedFile, setSelectedFile, currentDiff, setCurrentDiff,
    stashes, tags, submodules,
    githubToken, githubUser,
  } = useGitStore();

  const {
    commitChanges, mergeBranch, revertCommit, stashChanges,
    discardFileChanges, stageFile,
    checkoutBranch, createBranch, pushChanges, pullChanges,
    openTerminal, stashApply, stashDrop,
    connectGitHub, disconnectGitHub, loginWithGitHubDevice, bootstrapGitHub,
  } = useGitActions();

  const {
    openRepo, loadAll, loadDiff,
    pickFolder, initRepo, cloneRepo, createGitHubRepo, listUserGitHubRepos,
  } = useRepoLoader();

  const [activeTab, setActiveTab] = useState('Graph');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; hash?: string } | null>(null);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchFrom, setNewBranchFrom] = useState<string | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showInitRepo, setShowInitRepo] = useState(false);
  const [showCloneRepo, setShowCloneRepo] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [authMode, setAuthMode] = useState<'oauth' | 'token'>('oauth');
  const [deviceCodeInfo, setDeviceCodeInfo] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const newBranchInputRef = useRef<HTMLInputElement>(null);

  // Auto-load repo data
  useEffect(() => {
    if (repoPath) loadAll(repoPath);
  }, [repoPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate GitHub auth from encrypted OS keychain (safeStorage) on app mount.
  // This replaces the old localStorage hydration.
  useEffect(() => {
    bootstrapGitHub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => { if (showNewBranch) newBranchInputRef.current?.focus(); }, [showNewBranch]);

  const handleCreateBranch = async () => {
    const name = newBranchName.trim();
    if (!name) return;
    await createBranch(name, newBranchFrom);
    setShowNewBranch(false);
    setNewBranchName('');
    setNewBranchFrom(undefined);
  };

  const handleSelectFile = async (file: GitFile) => {
    setSelectedFile(file);
    await loadDiff(file.path, file.staged);
  };

  const handleCloseDiff = () => {
    setSelectedFile(null);
    setCurrentDiff('');
  };

  const handleConnectGitHub = async () => {
    const t = tokenInput.trim();
    if (!t) return;
    const r = await connectGitHub(t);
    if (r.success) {
      setTokenInput('');
    }
  };

  const handleLoginWithGitHub = async () => {
    setIsLoggingIn(true);
    setDeviceCodeInfo(null);
    try {
      await loginWithGitHubDevice((info) => {
        setDeviceCodeInfo(info);
      });
    } finally {
      setIsLoggingIn(false);
      setDeviceCodeInfo(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#020f1e] text-[#d9e7fc] font-sans overflow-hidden select-none">
      {/* ──────────── TOP NAV ──────────── */}
      <header className="h-12 border-b border-[#3c495a]/15 bg-[#041425]/85 backdrop-blur-xl flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-6 h-full">
          <button
            onClick={openRepo}
            title="Abrir repositorio"
            className="flex items-center gap-1.5 font-bold text-[#a3f185] text-lg hover:opacity-75 transition-opacity"
          >
            <FolderOpen size={16} />
            {repoName ?? 'GitCron'}
          </button>
          <nav className="flex h-full gap-1">
            {['Commit', 'Graph', 'History'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 h-full flex items-center text-sm transition-colors relative',
                  activeTab === tab ? 'text-[#a3f185]' : 'text-[#9eacc0] hover:text-[#d9e7fc]',
                )}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a3f185]" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-2xl px-8">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9eacc0]" />
            <input
              className="w-full bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded px-8 py-1 text-sm focus:outline-none focus:border-[#a3f185]/50"
              placeholder="Filter (Ctrl + Alt + F)"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton icon={<Undo />} onClick={() => {}} title="Undo" />
          <ToolbarButton icon={<Redo />} onClick={() => {}} title="Redo" />
          <div className="w-px h-4 bg-[#3c495a] mx-1" />
          <ToolbarButton icon={<Download />} onClick={pullChanges} title="Pull" label="Pull" disabled={!repoPath || isLoading} />
          <ToolbarButton icon={<Upload />} onClick={pushChanges} title="Push" label="Push" disabled={!repoPath || isLoading} />
          <div className="w-px h-4 bg-[#3c495a] mx-1" />
          <ToolbarButton
            icon={<GitBranch />}
            onClick={() => { setNewBranchFrom(undefined); setShowNewBranch(true); }}
            title="Nueva branch" label="Branch" disabled={!repoPath}
          />
          <ToolbarButton icon={<Archive />} onClick={stashChanges} title="Stash" label="Stash" disabled={!repoPath || isLoading} />
          <ToolbarButton icon={<Terminal />} onClick={openTerminal} title="Abrir terminal en el repo" disabled={!repoPath} />
          <div className="w-px h-4 bg-[#3c495a] mx-1" />
          <ToolbarButton icon={<Settings />} onClick={() => setShowSettings(true)} title="Settings" />
          <ToolbarButton icon={<HelpCircle />} onClick={() => setShowHelp(true)} title="Ayuda" />
          <div className="flex items-center gap-2 ml-2 pl-2">
            {githubUser ? (
              <button
                onClick={() => setShowSettings(true)}
                title={`Conectado como ${githubUser.login}`}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {githubUser.avatarUrl ? (
                  <img
                    src={githubUser.avatarUrl}
                    alt={githubUser.login}
                    className="w-7 h-7 rounded-full border border-[#a3f185]/50"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-[#a3f185] to-[#68b24f] flex items-center justify-center text-[10px] font-bold text-[#052900] border border-[#a3f185]/50"
                  >
                    {userInitials(githubUser)}
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowSettings(true)}
                title="Conectar GitHub"
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#9eacc0] hover:text-[#a3f185] hover:bg-[#172d45] transition-colors"
              >
                <UserCircle2 size={22} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ──────────── MAIN 3-COLUMN LAYOUT ──────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* COLUMN 1: SIDEBAR (branches, remotes, stash, tags, submodules) */}
        <aside className="w-60 bg-[#041425] flex flex-col shrink-0 overflow-y-auto">
          <SidebarSection title="LOCAL" count={branches.length || undefined}>
            {branches.length === 0 && !repoPath && (
              <p className="px-4 py-2 text-xs text-[#9eacc0] italic">Abrí un repo para ver branches</p>
            )}
            {branches.map((b) => (
              <SidebarItem
                key={b}
                icon={<Folder size={16} />}
                text={b}
                active={b === currentBranch}
                onClick={() => checkoutBranch(b)}
              />
            ))}
          </SidebarSection>

          <SidebarSection title="REMOTE" count={remoteBranches.length || undefined}>
            {remoteBranches.map((b) => (
              <SidebarItem key={b} icon={<Cloud size={16} />} text={b} />
            ))}
          </SidebarSection>

          <SidebarSection title="STASH" count={stashes.length || undefined}>
            {stashes.length === 0 && repoPath && (
              <p className="px-4 py-1 text-[11px] text-[#9eacc0] italic">Sin stashes</p>
            )}
            {stashes.map((s) => (
              <StashItem key={s.index} stash={s} onApply={() => stashApply(s.index)} onDrop={() => stashDrop(s.index)} />
            ))}
          </SidebarSection>

          <SidebarSection title="TAGS" count={tags.length || undefined}>
            {tags.length === 0 && repoPath && (
              <p className="px-4 py-1 text-[11px] text-[#9eacc0] italic">Sin tags</p>
            )}
            {tags.map((t) => <SidebarItem key={t} icon={<Tag size={16} />} text={t} />)}
          </SidebarSection>

          <SidebarSection title="SUBMODULES" count={submodules.length || undefined}>
            {submodules.length === 0 && repoPath && (
              <p className="px-4 py-1 text-[11px] text-[#9eacc0] italic">Sin submódulos</p>
            )}
            {submodules.map((sm) => <SidebarItem key={sm.path} icon={<Layers size={16} />} text={sm.path} />)}
          </SidebarSection>
        </aside>

        {/* COLUMN 2: CENTER (Commit graph OR diff viewer) */}
        <main className="flex-1 bg-[#020f1e] overflow-hidden relative flex flex-col">
          {!repoPath ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 text-[#9eacc0] p-8">
              <div className="text-center">
                <FolderOpen size={56} className="mx-auto opacity-20 mb-4" />
                <p className="text-xl font-bold text-[#d9e7fc] mb-1">Bienvenido a GitCron</p>
                <p className="text-sm">Elegí cómo empezar:</p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-3xl">
                <EmptyStateCard
                  icon={<FolderOpen size={28} />}
                  title="Abrir existente"
                  desc="Seleccioná una carpeta que ya sea un repo git"
                  onClick={openRepo}
                />
                <EmptyStateCard
                  icon={<Sparkles size={28} />}
                  title="Crear nuevo"
                  desc="Inicializar un repo nuevo en tu máquina"
                  onClick={() => setShowInitRepo(true)}
                  highlighted
                />
                <EmptyStateCard
                  icon={<Download size={28} />}
                  title="Clonar de GitHub"
                  desc="Bajar un repo existente desde una URL"
                  onClick={() => setShowCloneRepo(true)}
                />
              </div>

              {!githubUser && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-xs text-[#9eacc0] hover:text-[#a3f185] underline transition-colors flex items-center gap-1.5"
                >
                  <Github size={12} />
                  Conectá tu cuenta de GitHub para clonar repos privados
                </button>
              )}
            </div>
          ) : selectedFile ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[#3c495a]/15 bg-[#041425] shrink-0">
                <button
                  onClick={handleCloseDiff}
                  className="flex items-center gap-1.5 text-xs text-[#9eacc0] hover:text-[#a3f185] transition-colors"
                >
                  <ArrowLeft size={14} /> Volver al graph
                </button>
                <span className="text-[#697789]">/</span>
                <span className="text-xs text-[#d9e7fc] font-mono truncate">{selectedFile.path}</span>
                <div className="flex-1" />
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-bold',
                    selectedFile.status === 'modified' ? 'bg-[#fd9d1a]/20 text-[#fd9d1a]' :
                    selectedFile.status === 'added' ? 'bg-[#a3f185]/20 text-[#a3f185]' :
                    selectedFile.status === 'renamed' ? 'bg-[#5ed8ff]/20 text-[#5ed8ff]' :
                    selectedFile.status === 'untracked' ? 'bg-[#9eacc0]/20 text-[#9eacc0]' :
                    'bg-[#ff716c]/20 text-[#ff716c]',
                  )}
                >
                  {selectedFile.status.toUpperCase()}
                </span>
              </div>
              <DiffViewer diff={currentDiff} filePath={selectedFile.path} />
            </div>
          ) : activeTab === 'History' ? (
            <HistoryView
              commits={commits}
              selectedHash={selectedCommit?.hash}
              currentBranch={currentBranch}
              onSelect={setSelectedCommit}
              onContextMenu={(e, c) => setContextMenu({ x: e.clientX, y: e.clientY, hash: c.hash })}
              isLoading={isLoading}
            />
          ) : activeTab === 'Commit' ? (
            <CommitTabView
              modifiedFiles={modifiedFiles}
              hasGithubUser={!!githubUser}
            />
          ) : (
            /* Graph tab — default */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="sticky top-0 bg-[#020f1e]/75 backdrop-blur-xl z-10 border-b border-[#3c495a]/15 py-2 px-4 flex justify-between items-center text-[11px] text-[#9eacc0] uppercase tracking-wider font-bold shrink-0">
                <div className="flex gap-4">
                  <span>Branch / Tag</span>
                  <span>Graph</span>
                  <span>Description</span>
                </div>
                <div className="flex gap-12 mr-2">
                  <span>Date</span>
                  <span>Author</span>
                  <span>Commit</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {commits.length === 0 && isLoading && (
                  <p className="px-4 py-8 text-center text-[#9eacc0] text-sm">Cargando commits...</p>
                )}
                {commits.length > 0 && (
                  <CommitGraph
                    commits={commits}
                    selectedHash={selectedCommit?.hash}
                    currentBranch={currentBranch}
                    onSelect={setSelectedCommit}
                    onContextMenu={(e, c) => setContextMenu({ x: e.clientX, y: e.clientY, hash: c.hash })}
                  />
                )}
              </div>
            </div>
          )}
        </main>

        {/* COLUMN 3: COMMIT DETAILS + FILE CHANGES + COMMIT BOX */}
        <aside className="w-80 bg-[#041425] flex flex-col shrink-0 overflow-hidden">
          {selectedCommit ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-[#3c495a]/15">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[12px] font-mono text-[#a3f185]">commit: {selectedCommit.shortHash}</div>
                  <button className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#3c495a] text-xs hover:bg-[#172d45] transition-colors">
                    <Zap size={12} className="text-[#fd9d1a]" /> Explain
                  </button>
                </div>
                <h2 className="font-semibold mb-1">{selectedCommit.message}</h2>
                <div className="text-xs text-[#9eacc0] mb-4">{formatDate(selectedCommit.date)}</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#a3f185] flex items-center justify-center text-xs font-bold">
                    {initials(selectedCommit.authorName)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{selectedCommit.authorName}</div>
                    <div className="text-[10px] text-[#9eacc0]">{selectedCommit.authorEmail}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-2 border-b border-[#3c495a]/15 flex justify-between items-center bg-[#0d2134]">
                  <span className="text-[11px] font-bold text-[#9eacc0] uppercase tracking-wider">
                    Changed files ({modifiedFiles.length})
                  </span>
                </div>
                <div className="p-1">
                  {modifiedFiles.map((file) => (
                    <FileRow
                      key={file.path}
                      file={file}
                      selected={selectedFile?.path === file.path}
                      onClick={() => handleSelectFile(file)}
                      onDiscard={() => discardFileChanges(file.path)}
                      onStage={(stage) => stageFile(file.path, stage)}
                    />
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-[#3c495a]/15 bg-[#0d2134]">
                <textarea
                  className="w-full bg-[#041425] border border-[#3c495a]/15 rounded p-2 text-sm text-[#d9e7fc] h-24 focus:outline-none focus:border-[#a3f185]/30 resize-none"
                  placeholder="Mensaje del commit (requerido)"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                />
                <button
                  onClick={commitChanges}
                  disabled={isLoading || !commitMessage.trim() || !repoPath}
                  className="w-full mt-3 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold text-[#052900] rounded transition-colors shadow-lg shadow-[#a3f185]/20"
                >
                  {isLoading
                    ? 'Commiteando...'
                    : `Commit (${modifiedFiles.filter((f) => f.staged).length} staged)`}
                </button>
              </div>
            </div>
          ) : (
            /* Working tree: Unstaged ↑↓ Staged */
            <StagingPanel
              files={modifiedFiles}
              selectedFile={selectedFile}
              repoPath={repoPath}
              commitMessage={commitMessage}
              setCommitMessage={setCommitMessage}
              isLoading={isLoading}
              onSelectFile={handleSelectFile}
              onStage={(path, stage) => stageFile(path, stage)}
              onDiscard={(path) => discardFileChanges(path)}
              onCommit={commitChanges}
            />
          )}
        </aside>
      </div>

      {/* ──────────── ERROR TOAST ──────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 p-3 bg-[#9f0519] text-[#ffa8a3] rounded-lg shadow-2xl flex items-center gap-3 z-50 border border-[#ffa8a3]/20 max-w-xl"
          >
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-4 hover:opacity-70 shrink-0">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── NEW BRANCH MODAL ──────────── */}
      <AnimatePresence>
        {showNewBranch && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowNewBranch(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#a3f185] flex items-center gap-2"><GitBranch size={16} /> Nueva Branch</h3>
                <button onClick={() => setShowNewBranch(false)} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={16} /></button>
              </div>
              {newBranchFrom && (
                <p className="text-xs text-[#9eacc0] mb-3">
                  Desde commit: <span className="font-mono text-[#a3f185]">{newBranchFrom.slice(0, 7)}</span>
                </p>
              )}
              <input
                ref={newBranchInputRef}
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBranch(); if (e.key === 'Escape') setShowNewBranch(false); }}
                placeholder="feature/mi-nueva-feature"
                className="w-full bg-[#041425] border border-[#3c495a]/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#a3f185]/50 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNewBranch(false)} className="px-4 py-2 text-sm text-[#9eacc0] hover:text-[#d9e7fc]">Cancelar</button>
                <button
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim() || isLoading}
                  className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded"
                >
                  <Plus size={14} className="inline mr-1" /> Crear
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── SETTINGS / GITHUB AUTH MODAL ──────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-[480px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#a3f185] flex items-center gap-2"><Settings size={16} /> Configuración</h3>
                <button onClick={() => setShowSettings(false)} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={16} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-[#d9e7fc] mb-3 flex items-center gap-2">
                    <Github size={14} /> Cuenta de GitHub
                  </h4>

                  {githubUser ? (
                    <div className="bg-[#041425] border border-[#a3f185]/30 rounded p-3 flex items-center gap-3">
                      <img src={githubUser.avatarUrl} alt={githubUser.login} className="w-12 h-12 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{githubUser.name ?? githubUser.login}</p>
                        <p className="text-xs text-[#9eacc0] truncate">@{githubUser.login}</p>
                        {githubUser.email && <p className="text-[10px] text-[#9eacc0] truncate">{githubUser.email}</p>}
                      </div>
                      <button
                        onClick={disconnectGitHub}
                        className="p-2 hover:bg-[#ff716c]/20 text-[#9eacc0] hover:text-[#ff716c] rounded transition-colors"
                        title="Desconectar"
                      >
                        <LogOut size={14} />
                      </button>
                    </div>
                  ) : deviceCodeInfo ? (
                    /* Mostrar código mientras espera autorización */
                    <div className="bg-[#041425] border border-[#a3f185]/40 rounded p-4 text-center">
                      <p className="text-sm text-[#d9e7fc] mb-3">
                        Se abrió tu navegador. Ingresá este código en GitHub:
                      </p>
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <code className="text-3xl font-mono font-bold text-[#a3f185] bg-[#020f1e] px-4 py-2 rounded border border-[#a3f185]/30 tracking-widest">
                          {deviceCodeInfo.userCode}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(deviceCodeInfo.userCode)}
                          className="p-2 hover:bg-[#3c495a] rounded text-[#9eacc0] hover:text-[#a3f185]"
                          title="Copiar"
                        >
                          <FileText size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-[#9eacc0] mb-2">
                        Si el navegador no se abrió:{' '}
                        <button
                          onClick={() => window.api?.shellOpenPath(deviceCodeInfo.verificationUri)}
                          className="text-[#a3f185] underline"
                        >
                          {deviceCodeInfo.verificationUri}
                        </button>
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-[#9eacc0] mt-3">
                        <div className="w-3 h-3 border-2 border-[#a3f185] border-t-transparent rounded-full animate-spin" />
                        Esperando autorización...
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Tabs OAuth / Token */}
                      <div className="flex gap-1 mb-3 bg-[#041425] rounded p-1">
                        <button
                          onClick={() => setAuthMode('oauth')}
                          className={cn(
                            'flex-1 px-3 py-1.5 text-xs font-bold rounded transition-colors',
                            authMode === 'oauth'
                              ? 'bg-[#a3f185] text-white'
                              : 'text-[#9eacc0] hover:text-[#d9e7fc]',
                          )}
                        >
                          Login con GitHub
                        </button>
                        <button
                          onClick={() => setAuthMode('token')}
                          className={cn(
                            'flex-1 px-3 py-1.5 text-xs font-bold rounded transition-colors',
                            authMode === 'token'
                              ? 'bg-[#a3f185] text-white'
                              : 'text-[#9eacc0] hover:text-[#d9e7fc]',
                          )}
                        >
                          Token manual
                        </button>
                      </div>

                      {authMode === 'oauth' ? (
                        <>
                          <p className="text-xs text-[#9eacc0] mb-3 leading-relaxed">
                            Al hacer click, se abre GitHub en tu navegador (donde ya estás logueado con tu cuenta).
                            Solo tenés que confirmar el acceso para GitCron.
                          </p>
                          <button
                            onClick={handleLoginWithGitHub}
                            disabled={isLoggingIn}
                            className="w-full py-2.5 bg-[#24292e] hover:bg-[#373e47] border border-[#444c56] disabled:opacity-50 text-white text-sm font-bold rounded transition-colors flex items-center justify-center gap-2"
                          >
                            <Github size={16} />
                            {isLoggingIn ? 'Iniciando...' : 'Continuar con GitHub'}
                          </button>
                          <p className="text-[10px] text-[#697789] mt-2">
                            GitCron usa el flujo OAuth Device Flow (sin servidor, sin contraseñas).
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-[#9eacc0] mb-2">
                            Si preferís usar un Personal Access Token:{' '}
                            <button
                              onClick={() => window.api?.shellOpenPath('https://github.com/settings/tokens/new?scopes=repo&description=GitCron')}
                              className="text-[#a3f185] underline hover:opacity-80"
                            >
                              generá uno acá
                            </button>
                            {' '}con scope <code className="bg-[#041425] px-1 rounded">repo</code>.
                          </p>
                          <input
                            type="password"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConnectGitHub(); }}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            className="w-full bg-[#041425] border border-[#3c495a]/15 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#a3f185]/50 mb-2"
                          />
                          <button
                            onClick={handleConnectGitHub}
                            disabled={!tokenInput.trim() || isLoading}
                            className="w-full py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded transition-colors"
                          >
                            {isLoading ? 'Verificando...' : 'Conectar con token'}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="text-[11px] text-[#697789] border-t border-[#3c495a]/15 pt-3 leading-relaxed">
                  La autenticación se guarda localmente en tu máquina (localStorage). Se usa para hacer
                  push/pull a tus repos de github.com vía HTTPS. Tu Gmail/contraseña nunca pasa por GitCron —
                  GitHub maneja toda la autorización en tu navegador.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────── HELP MODAL ──────────── */}
      <AnimatePresence>
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </AnimatePresence>

      {/* ──────────── INIT REPO MODAL ──────────── */}
      <AnimatePresence>
        {showInitRepo && (
          <InitRepoModal
            onClose={() => setShowInitRepo(false)}
            onPickFolder={() => pickFolder('Elegir carpeta padre donde crear el repo')}
            onCreate={async (parent, name, withGitHub) => {
              if (withGitHub && githubToken) {
                // Create on GitHub first, then clone
                const r = await createGitHubRepo(githubToken, name, true, '');
                if (!r.success || !r.data) return false;
                const cl = await cloneRepo(r.data.cloneUrl, parent, name, githubToken);
                return cl.success;
              }
              const r = await initRepo(parent, name, true);
              return r.success;
            }}
            isLoading={isLoading}
            githubConnected={!!githubUser}
          />
        )}
      </AnimatePresence>

      {/* ──────────── CLONE REPO MODAL ──────────── */}
      <AnimatePresence>
        {showCloneRepo && (
          <CloneRepoModal
            onClose={() => setShowCloneRepo(false)}
            onPickFolder={() => pickFolder('Elegir carpeta padre donde clonar')}
            onClone={async (url, parent, name) => {
              const r = await cloneRepo(url, parent, name, githubToken ?? undefined);
              return r.success;
            }}
            onListRepos={() => githubToken ? listUserGitHubRepos(githubToken) : Promise.resolve([])}
            isLoading={isLoading}
            githubConnected={!!githubUser}
          />
        )}
      </AnimatePresence>

      {/* ──────────── CONTEXT MENU ──────────── */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x} y={contextMenu.y}
            onMerge={() => { contextMenu.hash && mergeBranch(contextMenu.hash); setContextMenu(null); }}
            onRevert={() => { contextMenu.hash && revertCommit(contextMenu.hash); setContextMenu(null); }}
            onCheckout={() => { contextMenu.hash && checkoutBranch(contextMenu.hash); setContextMenu(null); }}
            onCreateBranch={() => { setNewBranchFrom(contextMenu.hash); setShowNewBranch(true); setContextMenu(null); }}
            onCopySha={() => { contextMenu.hash && navigator.clipboard.writeText(contextMenu.hash); setContextMenu(null); }}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────── COMPONENTS ──────────── */

function ToolbarButton({
  icon, onClick, title, label, disabled,
}: { icon: React.ReactNode; onClick: () => void; title?: string; label?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center p-1.5 rounded transition-colors group',
        label && 'px-3',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#3c495a]',
      )}
    >
      <div className="w-5 h-5 text-[#9eacc0] group-hover:text-[#a3f185] flex items-center justify-center">{icon}</div>
      {label && <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter text-[#9eacc0]">{label}</span>}
    </button>
  );
}

function SidebarSection({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-1 px-4 py-1 text-[11px] font-bold text-[#9eacc0] hover:text-[#d9e7fc]"
      >
        <ChevronRight size={14} className={cn('transition-transform', isOpen && 'rotate-90')} />
        <span className="flex-1 text-left">{title}</span>
        {count !== undefined && <span className="bg-[#3c495a] text-[9px] px-1.5 rounded-full">{count}</span>}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

function SidebarItem({ icon, text, active, onClick }: { icon: React.ReactNode; text: string; active?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 flex items-center gap-3 text-sm transition-colors group relative',
        active ? 'text-[#a3f185] bg-[#a3f185]/10' : 'text-[#9eacc0] hover:bg-[#3c495a] hover:text-[#d9e7fc]',
        onClick && 'cursor-pointer',
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#a3f185]" />}
      <span className={cn('shrink-0', active ? 'text-[#a3f185]' : 'text-[#9eacc0] group-hover:text-[#d9e7fc]')}>{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function StashItem({
  stash, onApply, onDrop,
}: { stash: { index: number; message: string; hash: string }; onApply: () => void; onDrop: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      className="px-4 py-1.5 flex items-center gap-3 text-sm text-[#9eacc0] hover:bg-[#3c495a] hover:text-[#d9e7fc] transition-colors"
      title={stash.message}
    >
      <Archive size={16} className="shrink-0" />
      <span className="truncate flex-1 text-xs">{stash.message}</span>
      {isHovered && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onApply(); }} className="p-1 hover:text-[#a3f185] transition-colors" title="Apply">
            <RotateCcw size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDrop(); }} className="p-1 hover:text-[#ff716c] transition-colors" title="Drop">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function FileRow({
  file, selected, onClick, onDiscard, onStage,
}: {
  file: GitFile; selected?: boolean; onClick?: () => void; onDiscard: () => void; onStage: (stage: boolean) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-1.5 rounded group transition-colors',
        selected ? 'bg-[#a3f185]/15' : 'hover:bg-[#3c495a]/50',
        onClick && 'cursor-pointer',
      )}
    >
      <input
        type="checkbox" checked={file.staged}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStage(e.target.checked)}
        className="w-3.5 h-3.5 rounded bg-[#041425] border-[#3c495a]/15 text-[#a3f185] focus:ring-0"
      />
      <FileText
        size={16}
        className={cn(
          file.status === 'modified' ? 'text-[#fd9d1a]' :
          file.status === 'added' ? 'text-[#a3f185]' :
          file.status === 'renamed' ? 'text-[#5ed8ff]' :
          file.status === 'untracked' ? 'text-[#9eacc0]' :
          'text-[#ff716c]',
        )}
      />
      <span className="text-sm truncate flex-1 text-[#d9e7fc] group-hover:text-[#d9e7fc]">{file.path}</span>
      <div className="flex items-center gap-2">
        {isHovered && (
          <button onClick={(e) => { e.stopPropagation(); onDiscard(); }} className="p-1 hover:text-[#ff716c] text-[#9eacc0]">
            <Trash2 size={14} />
          </button>
        )}
        <div
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold',
            file.status === 'modified' ? 'bg-[#fd9d1a]/20 text-[#fd9d1a]' :
            file.status === 'added' ? 'bg-[#a3f185]/20 text-[#a3f185]' :
            file.status === 'renamed' ? 'bg-[#5ed8ff]/20 text-[#5ed8ff]' :
            file.status === 'untracked' ? 'bg-[#9eacc0]/20 text-[#9eacc0]' :
            'bg-[#ff716c]/20 text-[#ff716c]',
          )}
        >
          {file.status[0].toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function StagingPanel({
  files, selectedFile, repoPath, commitMessage, setCommitMessage, isLoading,
  onSelectFile, onStage, onDiscard, onCommit,
}: {
  files: GitFile[];
  selectedFile: GitFile | null;
  repoPath: string | null;
  commitMessage: string;
  setCommitMessage: (m: string) => void;
  isLoading: boolean;
  onSelectFile: (f: GitFile) => void;
  onStage: (path: string, stage: boolean) => void;
  onDiscard: (path: string) => void;
  onCommit: () => void;
}) {
  const unstaged = files.filter((f) => !f.staged);
  const staged = files.filter((f) => f.staged);

  const stageAll = () => unstaged.forEach((f) => onStage(f.path, true));
  const unstageAll = () => staged.forEach((f) => onStage(f.path, false));

  if (!repoPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#9eacc0] text-sm">
        <GitBranch size={32} className="mx-auto mb-3 opacity-30" />
        Abrí un repo para ver los cambios
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Unstaged Files ── */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="px-4 py-2 border-b border-[#3c495a]/15 bg-[#0d2134] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-bold text-[#9eacc0] uppercase tracking-wider">
            Unstaged ({unstaged.length})
          </span>
          {unstaged.length > 0 && (
            <button
              onClick={stageAll}
              className="text-[10px] text-[#a3f185] hover:text-white px-2 py-0.5 rounded border border-[#a3f185]/40 hover:bg-[#a3f185]/10 transition-colors"
            >
              Stage all
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {unstaged.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#697789] italic">No hay cambios sin stagear</p>
          ) : (
            <div className="p-1">
              {unstaged.map((file) => (
                <StagingFileRow
                  key={file.path}
                  file={file}
                  selected={selectedFile?.path === file.path}
                  direction="stage"
                  onClick={() => onSelectFile(file)}
                  onAction={() => onStage(file.path, true)}
                  onDiscard={() => onDiscard(file.path)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Staged Files ── */}
      <div className="flex flex-col min-h-0 flex-1 border-t-2 border-[#a3f185]/30">
        <div className="px-4 py-2 border-b border-[#3c495a]/15 bg-[#052900] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-bold text-[#a3f185] uppercase tracking-wider">
            Staged ({staged.length})
          </span>
          {staged.length > 0 && (
            <button
              onClick={unstageAll}
              className="text-[10px] text-[#9eacc0] hover:text-white px-2 py-0.5 rounded border border-[#9eacc0]/40 hover:bg-[#9eacc0]/10 transition-colors"
            >
              Unstage all
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {staged.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#697789] italic">Stagea archivos para incluir en el commit</p>
          ) : (
            <div className="p-1">
              {staged.map((file) => (
                <StagingFileRow
                  key={file.path}
                  file={file}
                  selected={selectedFile?.path === file.path}
                  direction="unstage"
                  onClick={() => onSelectFile(file)}
                  onAction={() => onStage(file.path, false)}
                  onDiscard={() => onDiscard(file.path)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Commit Box ── */}
      <div className="p-3 border-t border-[#3c495a]/15 bg-[#0d2134] shrink-0">
        <textarea
          className="w-full bg-[#041425] border border-[#3c495a]/15 rounded p-2 text-sm text-[#d9e7fc] h-16 focus:outline-none focus:border-[#a3f185]/30 resize-none"
          placeholder="Mensaje del commit (requerido)"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
        <button
          onClick={onCommit}
          disabled={isLoading || !commitMessage.trim() || staged.length === 0}
          className="w-full mt-2 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-[#052900] rounded transition-colors"
        >
          {isLoading ? 'Commiteando...' : `Commit Changes${staged.length > 0 ? ` (${staged.length})` : ''}`}
        </button>
      </div>
    </div>
  );
}

function StagingFileRow({
  file, selected, direction, onClick, onAction, onDiscard,
}: {
  file: GitFile;
  selected: boolean;
  direction: 'stage' | 'unstage';
  onClick: () => void;
  onAction: () => void;
  onDiscard: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded group transition-colors cursor-pointer',
        selected ? 'bg-[#a3f185]/15' : 'hover:bg-[#3c495a]/50',
      )}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onAction(); }}
        title={direction === 'stage' ? 'Stage este archivo' : 'Unstage este archivo'}
        className={cn(
          'p-1 rounded shrink-0 transition-colors',
          direction === 'stage'
            ? 'text-[#9eacc0] hover:text-[#a3f185] hover:bg-[#a3f185]/10'
            : 'text-[#9eacc0] hover:text-[#fd9d1a] hover:bg-[#fd9d1a]/10',
        )}
      >
        {direction === 'stage' ? <Plus size={14} /> : <Minus size={14} />}
      </button>
      <FileText
        size={14}
        className={cn(
          'shrink-0',
          file.status === 'modified' ? 'text-[#fd9d1a]' :
          file.status === 'added' ? 'text-[#a3f185]' :
          file.status === 'renamed' ? 'text-[#5ed8ff]' :
          file.status === 'untracked' ? 'text-[#9eacc0]' :
          'text-[#ff716c]',
        )}
      />
      <span className="text-xs truncate flex-1 text-[#d9e7fc] group-hover:text-[#d9e7fc]">{file.path}</span>
      {isHovered && direction === 'stage' && (
        <button
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          className="p-1 hover:text-[#ff716c] text-[#9eacc0] shrink-0"
          title="Descartar cambios"
        >
          <Trash2 size={12} />
        </button>
      )}
      <div
        className={cn(
          'w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0',
          file.status === 'modified' ? 'bg-[#fd9d1a]/20 text-[#fd9d1a]' :
          file.status === 'added' ? 'bg-[#a3f185]/20 text-[#a3f185]' :
          file.status === 'renamed' ? 'bg-[#5ed8ff]/20 text-[#5ed8ff]' :
          file.status === 'untracked' ? 'bg-[#9eacc0]/20 text-[#9eacc0]' :
          'bg-[#ff716c]/20 text-[#ff716c]',
        )}
      >
        {file.status[0].toUpperCase()}
      </div>
    </div>
  );
}

function ContextMenu({
  x, y, onMerge, onRevert, onCheckout, onCreateBranch, onCopySha, onClose,
}: {
  x: number; y: number;
  onMerge: () => void; onRevert: () => void; onCheckout: () => void;
  onCreateBranch: () => void; onCopySha: () => void; onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="fixed bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-lg shadow-2xl py-1 z-[100] w-64"
      style={{ left: x, top: y }}
    >
      <ContextMenuItem onClick={onMerge} text="Merge into current branch" />
      <ContextMenuItem onClick={onRevert} text="Revert commit" />
      <div className="h-px bg-[#3c495a] my-1" />
      <ContextMenuItem onClick={onCheckout} text="Checkout" />
      <ContextMenuItem onClick={onCreateBranch} text="Create branch here" />
      <div className="h-px bg-[#3c495a] my-1" />
      <ContextMenuItem onClick={onCopySha} text="Copy commit SHA" textSecondary="Ctrl+C" />
      <ContextMenuItem onClick={onClose} text="Cerrar" />
    </motion.div>
  );
}

/**
 * Linear chronological history list — no SVG, more detail per row.
 * Useful for skimming the full commit log of the current branch.
 */
function HistoryView({
  commits, selectedHash, currentBranch, onSelect, onContextMenu, isLoading,
}: {
  commits: Commit[];
  selectedHash?: string;
  currentBranch?: string;
  onSelect: (c: Commit) => void;
  onContextMenu: (e: React.MouseEvent, c: Commit) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="sticky top-0 bg-[#020f1e]/75 backdrop-blur-xl z-10 border-b border-[#3c495a]/15 py-2 px-4 text-[11px] text-[#9eacc0] uppercase tracking-wider font-bold shrink-0">
        Historial · {commits.length} commits
      </div>
      <div className="flex-1 overflow-y-auto">
        {commits.length === 0 && isLoading && (
          <p className="px-4 py-8 text-center text-[#9eacc0] text-sm">Cargando commits...</p>
        )}
        {commits.map((commit) => {
          const isSelected = selectedHash === commit.hash;
          return (
            <div
              key={commit.hash}
              onClick={() => onSelect(commit)}
              onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, commit); }}
              className={cn(
                'px-4 py-3 border-b border-[#3c495a]/15 cursor-pointer transition-colors',
                isSelected ? 'bg-[#a3f185]/10' : 'hover:bg-[#0d2134]',
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <code className="text-[11px] font-mono text-[#a3f185] shrink-0">{commit.shortHash}</code>
                  {commit.refs && commit.refs.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {commit.refs.slice(0, 3).map((ref) => {
                        const isTag = ref.startsWith('tag: ');
                        const isRemote = ref.includes('/');
                        const text = isTag ? ref.replace('tag: ', '') : ref;
                        const isCurrent = !isTag && !isRemote && text === currentBranch;
                        return (
                          <span
                            key={ref}
                            className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded border whitespace-nowrap font-medium',
                              isTag ? 'bg-[#fd9d1a]/15 text-[#fd9d1a] border-[#fd9d1a]/30'
                                : isCurrent ? 'bg-[#a3f185]/20 text-[#a3f185] border-[#a3f185]/40'
                                : isRemote ? 'bg-[#5ed8ff]/10 text-[#5ed8ff] border-[#5ed8ff]/30'
                                : 'bg-[#a3f185]/15 text-[#a3f185] border-[#a3f185]/30',
                            )}
                          >
                            {text}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-[#697789] shrink-0 font-mono">{formatDate(commit.date)}</span>
              </div>
              <p className={cn('text-sm font-medium mb-1.5', isSelected ? 'text-[#d9e7fc]' : 'text-[#d9e7fc]')}>
                {commit.message}
              </p>
              <div className="flex items-center gap-2 text-xs text-[#9eacc0]">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#a3f185] to-[#68b24f] flex items-center justify-center text-[8px] font-bold text-[#052900]">
                  {initials(commit.authorName)}
                </div>
                <span>{commit.authorName}</span>
                <span className="text-[#697789]">·</span>
                <span className="text-[#697789] font-mono text-[10px]">{commit.authorEmail}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "Commit" tab — focused workspace for preparing changes.
 * Shows a summary of the working tree and prompts the user to click a file
 * (in the right panel) to review the diff.
 */
function CommitTabView({
  modifiedFiles, hasGithubUser,
}: { modifiedFiles: GitFile[]; hasGithubUser: boolean }) {
  const unstaged = modifiedFiles.filter((f) => !f.staged);
  const staged = modifiedFiles.filter((f) => f.staged);

  const statusCount = (status: GitFile['status']) =>
    modifiedFiles.filter((f) => f.status === status).length;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#d9e7fc] mb-2">Workspace</h2>
          <p className="text-sm text-[#9eacc0]">
            Resumen de lo que tenés sin commitear. Hacé clic en cualquier archivo de la columna derecha
            para ver su diff con colores acá en el centro.
          </p>
        </div>

        {modifiedFiles.length === 0 ? (
          <div className="bg-[#0d2134] border border-[#3c495a]/15 rounded-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#a3f185]/10 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-[#a3f185]" />
            </div>
            <p className="text-lg font-semibold text-[#d9e7fc] mb-1">Working tree limpio</p>
            <p className="text-sm text-[#9eacc0]">No hay cambios sin commitear.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard label="Unstaged" value={unstaged.length} accent="muted" />
              <StatCard label="Staged" value={staged.length} accent="primary" />
            </div>

            <div className="bg-[#0d2134] border border-[#3c495a]/15 rounded-lg p-5 mb-4">
              <h3 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-3">
                Cambios por tipo
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {statusCount('modified') > 0 && <StatusBadge label="Modificados" count={statusCount('modified')} color="#fd9d1a" letter="M" />}
                {statusCount('added') > 0 && <StatusBadge label="Nuevos (staged)" count={statusCount('added')} color="#a3f185" letter="A" />}
                {statusCount('deleted') > 0 && <StatusBadge label="Borrados" count={statusCount('deleted')} color="#ff716c" letter="D" />}
                {statusCount('untracked') > 0 && <StatusBadge label="Untracked" count={statusCount('untracked')} color="#9eacc0" letter="U" />}
                {statusCount('renamed') > 0 && <StatusBadge label="Renombrados" count={statusCount('renamed')} color="#5ed8ff" letter="R" />}
              </div>
            </div>

            <div className="bg-[#0d2134] border border-[#3c495a]/15 rounded-lg p-5">
              <h3 className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider mb-3">Flujo</h3>
              <ol className="space-y-2 text-sm text-[#d9e7fc]">
                <FlowStep n={1} done={true}>Modificá archivos en tu editor</FlowStep>
                <FlowStep n={2} done={staged.length > 0}>
                  Clic en el <code className="bg-[#020f1e] px-1 rounded text-[#a3f185] text-xs">+</code> de cada archivo en la columna derecha para stagearlo
                </FlowStep>
                <FlowStep n={3} done={false}>Escribí un mensaje en la caja de abajo a la derecha</FlowStep>
                <FlowStep n={4} done={false}>Clic en <span className="text-[#a3f185] font-semibold">Commit Changes</span></FlowStep>
                {hasGithubUser && <FlowStep n={5} done={false}>Clic en <span className="text-[#a3f185] font-semibold">Push</span> para subirlo a GitHub</FlowStep>}
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'primary' | 'muted' }) {
  return (
    <div
      className={cn(
        'bg-[#0d2134] border rounded-lg p-4',
        accent === 'primary' ? 'border-[#a3f185]/40' : 'border-[#3c495a]/15',
      )}
    >
      <p className="text-xs text-[#9eacc0] uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-3xl font-bold', accent === 'primary' ? 'text-[#a3f185]' : 'text-[#d9e7fc]')}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ label, count, color, letter }: { label: string; count: number; color: string; letter: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{ backgroundColor: `${color}33`, color }}
      >
        {letter}
      </div>
      <span className="text-[#d9e7fc]">{label}</span>
      <span className="text-[#9eacc0] ml-auto font-mono">{count}</span>
    </div>
  );
}

function FlowStep({ n, done, children }: { n: number; done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          'shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
          done ? 'bg-[#a3f185] text-[#052900]' : 'bg-[#3c495a] text-[#9eacc0]',
        )}
      >
        {done ? '✓' : n}
      </span>
      <span className={cn('flex-1', done && 'text-[#9eacc0]')}>{children}</span>
    </li>
  );
}

/**
 * Glosario completo de cómo funciona la interfaz.
 * Modal con secciones colapsables.
 */
function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl w-full max-w-3xl max-h-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#3c495a]/15 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-[#a3f185] flex items-center gap-2 text-lg">
            <HelpCircle size={18} /> Ayuda — Cómo funciona GitCron
          </h2>
          <button onClick={onClose} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-6 text-sm text-[#d9e7fc]">
          <HelpSection title="¿Qué es GitCron?">
            <p className="text-[#9eacc0] leading-relaxed">
              Cliente git visual estilo GitKraken. Te muestra tus commits como un grafo
              con branches que se ramifican, y te deja stagear, commitear, hacer push/pull
              sin escribir comandos en la terminal.
            </p>
          </HelpSection>

          <HelpSection title="Las 3 columnas">
            <HelpRow label="Izquierda — Sidebar">
              Branches locales y remotas, stashes, tags, submódulos. Click en una branch
              local hace checkout. El verde indica la branch activa.
            </HelpRow>
            <HelpRow label="Centro — Contenido principal">
              Cambia según la solapa que tengas activa (ver abajo). También se transforma
              en visor de diff cuando hacés click en un archivo de la derecha.
            </HelpRow>
            <HelpRow label="Derecha — Workspace / Commit">
              Si estás navegando commits → muestra detalles del commit (mensaje completo,
              autor, archivos cambiados).<br />
              Si no → muestra tu working tree dividido en <strong>Unstaged</strong> arriba
              y <strong>Staged</strong> abajo, con la caja para escribir el mensaje y el
              botón de commit.
            </HelpRow>
          </HelpSection>

          <HelpSection title="Las 3 solapas">
            <HelpRow label="Commit">
              Modo "vamos a commitear". Muestra un resumen del workspace con stats
              (cuántos archivos unstaged/staged) y el flujo paso a paso. Si clickeás un
              archivo a la derecha, ves su diff en el centro.
            </HelpRow>
            <HelpRow label="Graph (default)">
              Vista visual del historial. Cada commit es un punto, las branches son
              líneas verticales de colores, las divergencias y merges son curvas. Las
              etiquetas como <code className="bg-[#020f1e] px-1 rounded text-xs">main</code>{' '}
              o <code className="bg-[#020f1e] px-1 rounded text-xs">tag: v1.0</code> aparecen
              al lado del mensaje.
            </HelpRow>
            <HelpRow label="History">
              Lista cronológica plana de todos los commits (sin SVG). Más cómoda para
              leer mensajes largos o escanear quién hizo qué cuándo.
            </HelpRow>
          </HelpSection>

          <HelpSection title="Estados de archivo (la letrita al lado)">
            <div className="grid grid-cols-2 gap-2">
              <StatusBadge label="Modified — cambios sin commitear" count={0} color="#fd9d1a" letter="M" />
              <StatusBadge label="Added — nuevo y staged" count={0} color="#a3f185" letter="A" />
              <StatusBadge label="Deleted — borrado" count={0} color="#ff716c" letter="D" />
              <StatusBadge label="Untracked — git no lo conoce" count={0} color="#9eacc0" letter="U" />
              <StatusBadge label="Renamed — renombrado" count={0} color="#5ed8ff" letter="R" />
            </div>
            <p className="text-xs text-[#697789] mt-2">
              El número de la derecha indica cuántos archivos tenés en ese estado.
            </p>
          </HelpSection>

          <HelpSection title="Botones del toolbar (de izq a der)">
            <HelpRow label="Pull (↓)">Baja commits del repo remoto a tu local.</HelpRow>
            <HelpRow label="Push (↑)">Sube tus commits locales al repo remoto (GitHub).</HelpRow>
            <HelpRow label="Branch">Crea una branch nueva. Podés crearla desde un commit específico clickeando derecho en un commit y elegir "Create branch here".</HelpRow>
            <HelpRow label="Stash">Guarda tus cambios actuales en una "pila" temporal para volver a ellos después. Útil cuando querés cambiar de branch sin perder lo que tenés.</HelpRow>
            <HelpRow label="Terminal">Abre Windows Terminal (o cmd) en la carpeta del repo, por si querés ejecutar un comando git directo.</HelpRow>
            <HelpRow label="Settings (engranaje)">Conectar tu cuenta de GitHub via OAuth.</HelpRow>
            <HelpRow label="Help (este modal)">Esta ayuda 🙂</HelpRow>
          </HelpSection>

          <HelpSection title="Conceptos de Git en 30 segundos">
            <HelpRow label="Working tree">Tus archivos modificados. Git no los guardó todavía.</HelpRow>
            <HelpRow label="Stage (área intermedia)">Los archivos que vas a incluir en el próximo commit. Click el <code className="bg-[#020f1e] px-1 rounded text-[#a3f185] text-xs">+</code> para moverlos.</HelpRow>
            <HelpRow label="Commit">Un snapshot guardado. Tiene hash único, mensaje, autor y fecha. Es inmutable (pero podés revertirlo con un commit nuevo).</HelpRow>
            <HelpRow label="Branch">Una línea de trabajo paralela. <code className="bg-[#020f1e] px-1 rounded text-[#a3f185] text-xs">main</code> es la principal, las features suelen vivir en branches separadas.</HelpRow>
            <HelpRow label="Merge">Combinar los commits de una branch en otra. Si los cambios son compatibles, fluye. Si no, hay conflictos.</HelpRow>
            <HelpRow label="Revert">Crea un commit nuevo que DESHACE los cambios de un commit anterior. Es seguro (no reescribe historia).</HelpRow>
          </HelpSection>

          <HelpSection title="Flujo típico (de cero a push)">
            <ol className="space-y-2 ml-2">
              <li>1. Abrí o creá un repo desde el empty state</li>
              <li>2. (Opcional) Conectá tu cuenta de GitHub en Settings</li>
              <li>3. Modificá archivos en tu editor</li>
              <li>4. En GitCron click <code className="bg-[#020f1e] px-1 rounded text-[#a3f185] text-xs">+</code> en cada archivo que querés incluir</li>
              <li>5. Escribí un mensaje en la caja de la derecha</li>
              <li>6. Click <strong className="text-[#a3f185]">Commit Changes</strong></li>
              <li>7. Click <strong className="text-[#a3f185]">Push</strong> para subirlo a GitHub</li>
            </ol>
          </HelpSection>

          <HelpSection title="Atajos y trucos">
            <HelpRow label="Click derecho en un commit">Menú con merge, revert, checkout, crear branch desde ese commit, copiar SHA.</HelpRow>
            <HelpRow label="Click en un archivo (panel derecho)">Muestra el diff con colores en el centro (verde = added, rojo = removed).</HelpRow>
            <HelpRow label="Click en el nombre del repo (arriba izq)">Cambia de repo / abre otro distinto.</HelpRow>
            <HelpRow label="Hover sobre un stash">Aparecen los botones de Apply (↻) y Drop (🗑).</HelpRow>
            <HelpRow label="Escape en modales">Cierra el modal.</HelpRow>
          </HelpSection>

          <HelpSection title="Seguridad de tu token de GitHub">
            <p className="text-[#9eacc0] leading-relaxed">
              Cuando hacés login con GitHub, tu access token se guarda <strong>encriptado</strong> por
              el sistema operativo (Windows DPAPI / macOS Keychain). Solo se desencripta cuando
              tu usuario está logueado en el OS. Al hacer push/pull, el token NUNCA se escribe
              en el <code className="bg-[#020f1e] px-1 rounded text-xs">.git/config</code> del repo —
              se pasa via <code className="bg-[#020f1e] px-1 rounded text-xs">GIT_ASKPASS</code> solo
              durante esa operación. Detalles en <code className="bg-[#020f1e] px-1 rounded text-xs">SECURITY.md</code>.
            </p>
          </HelpSection>
        </div>

        <div className="px-6 py-3 border-t border-[#3c495a]/15 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 text-[#052900] text-sm font-bold rounded transition-colors"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[#a3f185] font-bold text-base mb-3 pb-1 border-b border-[#3c495a]/20">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function HelpRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm leading-relaxed">
      <span className="font-semibold text-[#5ed8ff] text-xs uppercase tracking-wider pt-0.5">{label}</span>
      <span className="text-[#9eacc0]">{children}</span>
    </div>
  );
}

function EmptyStateCard({
  icon, title, desc, onClick, highlighted,
}: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void; highlighted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-3 p-6 rounded-xl border transition-all text-center',
        highlighted
          ? 'bg-[#a3f185]/10 border-[#a3f185]/40 hover:bg-[#a3f185]/20 hover:border-[#a3f185]/60'
          : 'bg-[#041425] border-[#3c495a]/15 hover:border-[#a3f185]/40 hover:bg-[#0d2134]',
      )}
    >
      <div className={cn(highlighted ? 'text-[#a3f185]' : 'text-[#9eacc0]')}>{icon}</div>
      <div>
        <p className="font-semibold text-[#d9e7fc] mb-1">{title}</p>
        <p className="text-xs text-[#9eacc0]">{desc}</p>
      </div>
    </button>
  );
}

function InitRepoModal({
  onClose, onPickFolder, onCreate, isLoading, githubConnected,
}: {
  onClose: () => void;
  onPickFolder: () => Promise<string | null>;
  onCreate: (parent: string, name: string, withGitHub: boolean) => Promise<boolean>;
  isLoading: boolean;
  githubConnected: boolean;
}) {
  const [parent, setParent] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [withGitHub, setWithGitHub] = useState(false);

  const canSubmit = parent && name.trim() && /^[a-zA-Z0-9._-]+$/.test(name.trim());

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-[480px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#a3f185] flex items-center gap-2"><Sparkles size={16} /> Crear repositorio nuevo</h3>
          <button onClick={onClose} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider block mb-1.5">Nombre del repo</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mi-nuevo-proyecto"
              className="w-full bg-[#041425] border border-[#3c495a]/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#a3f185]/50"
            />
            <p className="text-[10px] text-[#697789] mt-1">Solo letras, números, guiones, puntos y underscores</p>
          </div>

          <div>
            <label className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider block mb-1.5">Carpeta padre</label>
            <button
              onClick={async () => { const p = await onPickFolder(); if (p) setParent(p); }}
              className="w-full bg-[#041425] border border-[#3c495a]/15 hover:border-[#a3f185]/50 rounded px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"
            >
              <FolderOpen size={14} className="text-[#9eacc0] shrink-0" />
              <span className={cn('truncate', parent ? 'text-[#d9e7fc] font-mono text-xs' : 'text-[#9eacc0]')}>
                {parent ?? 'Click para elegir carpeta...'}
              </span>
            </button>
            {parent && name.trim() && (
              <p className="text-[10px] text-[#697789] mt-1">
                Se creará en: <code className="text-[#a3f185]">{parent}\{name.trim()}</code>
              </p>
            )}
          </div>

          <label className={cn('flex items-center gap-2 cursor-pointer p-2 rounded transition-colors', githubConnected ? 'hover:bg-[#3c495a]' : 'opacity-50 cursor-not-allowed')}>
            <input
              type="checkbox"
              disabled={!githubConnected}
              checked={withGitHub}
              onChange={(e) => setWithGitHub(e.target.checked)}
              className="w-4 h-4 rounded bg-[#041425] border-[#3c495a]/15 text-[#a3f185] focus:ring-0"
            />
            <Github size={14} />
            <span className="text-sm">
              {githubConnected
                ? 'Crear también en GitHub (privado) y conectar'
                : 'Crear también en GitHub (necesita login)'}
            </span>
          </label>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#9eacc0] hover:text-[#d9e7fc]">Cancelar</button>
          <button
            onClick={async () => {
              if (!parent || !canSubmit) return;
              const ok = await onCreate(parent, name.trim(), withGitHub);
              if (ok) onClose();
            }}
            disabled={!canSubmit || isLoading}
            className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded flex items-center gap-2"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isLoading ? 'Creando...' : 'Crear repositorio'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CloneRepoModal({
  onClose, onPickFolder, onClone, onListRepos, isLoading, githubConnected,
}: {
  onClose: () => void;
  onPickFolder: () => Promise<string | null>;
  onClone: (url: string, parent: string, name: string) => Promise<boolean>;
  onListRepos: () => Promise<{ name: string; fullName: string; cloneUrl: string; private: boolean; description: string | null }[]>;
  isLoading: boolean;
  githubConnected: boolean;
}) {
  const [tab, setTab] = useState<'url' | 'my-repos'>(githubConnected ? 'my-repos' : 'url');
  const [url, setUrl] = useState('');
  const [parent, setParent] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [myRepos, setMyRepos] = useState<{ name: string; fullName: string; cloneUrl: string; private: boolean; description: string | null }[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (tab === 'my-repos' && githubConnected && myRepos.length === 0) {
      onListRepos().then(setMyRepos);
    }
  }, [tab, githubConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-derive folder name from URL
  useEffect(() => {
    if (url && !folderName) {
      const match = url.match(/\/([^/]+?)(\.git)?\/?$/);
      if (match) setFolderName(match[1]);
    }
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = myRepos.filter((r) => r.fullName.toLowerCase().includes(filter.toLowerCase()));

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#12273c]/95 backdrop-blur-md border border-[#3c495a]/15 rounded-xl shadow-2xl p-6 w-[600px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#a3f185] flex items-center gap-2"><Download size={16} /> Clonar repositorio</h3>
          <button onClick={onClose} className="text-[#9eacc0] hover:text-[#d9e7fc]"><X size={16} /></button>
        </div>

        {githubConnected && (
          <div className="flex gap-1 mb-4 bg-[#041425] rounded p-1">
            <button
              onClick={() => setTab('my-repos')}
              className={cn('flex-1 px-3 py-1.5 text-xs font-bold rounded transition-colors', tab === 'my-repos' ? 'bg-[#a3f185] text-white' : 'text-[#9eacc0] hover:text-[#d9e7fc]')}
            >
              Mis repos de GitHub
            </button>
            <button
              onClick={() => setTab('url')}
              className={cn('flex-1 px-3 py-1.5 text-xs font-bold rounded transition-colors', tab === 'url' ? 'bg-[#a3f185] text-white' : 'text-[#9eacc0] hover:text-[#d9e7fc]')}
            >
              URL manual
            </button>
          </div>
        )}

        {tab === 'my-repos' ? (
          <div className="flex flex-col gap-2 min-h-0 flex-1">
            <input
              placeholder="Buscar..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#041425] border border-[#3c495a]/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#a3f185]/50"
            />
            <div className="overflow-y-auto flex-1 border border-[#3c495a]/15 rounded">
              {myRepos.length === 0 ? (
                <p className="p-4 text-center text-[#9eacc0] text-sm flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Cargando tus repos...
                </p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-center text-[#9eacc0] text-sm">Sin resultados</p>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.fullName}
                    onClick={() => { setUrl(r.cloneUrl); setFolderName(r.name); }}
                    className={cn(
                      'w-full text-left px-3 py-2 hover:bg-[#3c495a]/50 border-b border-[#3c495a]/15 last:border-b-0 transition-colors',
                      url === r.cloneUrl && 'bg-[#a3f185]/10',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {r.private ? <Lock size={12} className="text-[#fd9d1a]" /> : <Globe size={12} className="text-[#a3f185]" />}
                      <span className="font-medium text-sm">{r.fullName}</span>
                    </div>
                    {r.description && <p className="text-xs text-[#9eacc0] mt-1 truncate">{r.description}</p>}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider block mb-1.5">URL del repo</label>
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/usuario/repo.git"
              className="w-full bg-[#041425] border border-[#3c495a]/15 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#a3f185]/50"
            />
          </div>
        )}

        <div className="space-y-3 mt-4">
          <div>
            <label className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider block mb-1.5">Carpeta padre</label>
            <button
              onClick={async () => { const p = await onPickFolder(); if (p) setParent(p); }}
              className="w-full bg-[#041425] border border-[#3c495a]/15 hover:border-[#a3f185]/50 rounded px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"
            >
              <FolderOpen size={14} className="text-[#9eacc0] shrink-0" />
              <span className={cn('truncate', parent ? 'text-[#d9e7fc] font-mono text-xs' : 'text-[#9eacc0]')}>
                {parent ?? 'Click para elegir carpeta...'}
              </span>
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-[#9eacc0] uppercase tracking-wider block mb-1.5">Nombre de la carpeta</label>
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="mi-repo"
              className="w-full bg-[#041425] border border-[#3c495a]/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#a3f185]/50"
            />
            {parent && folderName.trim() && (
              <p className="text-[10px] text-[#697789] mt-1">
                Destino: <code className="text-[#a3f185]">{parent}\{folderName.trim()}</code>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#9eacc0] hover:text-[#d9e7fc]">Cancelar</button>
          <button
            onClick={async () => {
              if (!url.trim() || !parent || !folderName.trim()) return;
              const ok = await onClone(url.trim(), parent, folderName.trim());
              if (ok) onClose();
            }}
            disabled={!url.trim() || !parent || !folderName.trim() || isLoading}
            className="px-4 py-2 bg-gradient-to-br from-[#a3f185] to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-[#a3f185]/20 disabled:opacity-50 text-[#052900] text-sm font-bold rounded flex items-center gap-2"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {isLoading ? 'Clonando...' : 'Clonar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ContextMenuItem({ onClick, text, textSecondary }: { onClick: () => void; text: string; textSecondary?: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center justify-between px-4 py-1.5 text-sm hover:bg-[#a3f185] text-[#d9e7fc] hover:text-white transition-colors"
    >
      <span>{text}</span>
      {textSecondary && <span className="text-[10px] opacity-50">{textSecondary}</span>}
    </button>
  );
}
