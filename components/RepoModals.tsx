'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Download, FolderOpen, Github, LogOut, Sparkles, X, Lock, Globe,
  Loader2, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/hooks/use-translation';

function userInitials(user: { name?: string | null; login?: string; email?: string | null }): string {
  const name = user.name ?? user.login ?? user.email ?? '?';
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export function EmptyStateCard({
  icon, title, desc, onClick, highlighted,
}: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void; highlighted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-3 p-6 rounded-xl border backdrop-blur-md transition-all text-center shadow-[0_18px_50px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)]',
        highlighted
          ? 'bg-secondary/15 border-secondary/45 hover:bg-secondary/20 hover:border-secondary/70'
          : 'bg-bg-overlay/50 border-text-primary/15 hover:border-secondary/40 hover:bg-text-primary/[0.08]',
      )}
    >
      <div className={cn(highlighted ? 'text-secondary' : 'text-text-secondary')}>{icon}</div>
      <div>
        <p className="font-semibold text-text-primary mb-1">{title}</p>
        <p className="text-xs text-text-secondary">{desc}</p>
      </div>
    </button>
  );
}

export function InitRepoModal({
  onClose, onPickFolder, onCreate, isLoading, githubConnected,
}: {
  onClose: () => void;
  onPickFolder: () => Promise<string | null>;
  onCreate: (parent: string, name: string, withGitHub: boolean) => Promise<boolean>;
  isLoading: boolean;
  githubConnected: boolean;
}) {
  const t = useT();
  const [parent, setParent] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [withGitHub, setWithGitHub] = useState(false);
  const canSubmit = parent && name.trim() && /^[a-zA-Z0-9._-]+$/.test(name.trim());

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-overlay rounded-xl p-6 w-[540px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-secondary flex items-center gap-2"><Sparkles size={16} /> Crear repositorio nuevo</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Nombre del repo</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="mi-nuevo-proyecto" className="w-full bg-bg-base border border-border-subtle/15 rounded px-3 py-2 text-ui-body focus:outline-none focus:border-secondary/50" />
            <p className="text-[10px] text-text-secondary/70 mt-1">Solo letras, números, guiones, puntos y underscores</p>
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Carpeta padre</label>
            <button onClick={async () => { const p = await onPickFolder(); if (p) setParent(p); }} className="w-full bg-bg-base border border-border-subtle/15 hover:border-secondary/50 rounded px-3 py-2 text-ui-body text-left flex items-center gap-2 transition-colors">
              <FolderOpen size={14} className="text-text-secondary shrink-0" />
              <span className={cn('truncate', parent ? 'text-text-primary font-mono text-ui-small' : 'text-text-secondary')}>{parent ?? 'Click para elegir carpeta...'}</span>
            </button>
            {parent && name.trim() && <p className="text-[10px] text-text-secondary/70 mt-1">Se creará en: <code className="text-secondary">{parent}\{name.trim()}</code></p>}
          </div>
          <label className={cn('flex items-center gap-2 cursor-pointer p-2 rounded transition-colors', githubConnected ? 'hover:bg-border-subtle' : 'opacity-50 cursor-not-allowed')}>
            <input type="checkbox" disabled={!githubConnected} checked={withGitHub} onChange={(e) => setWithGitHub(e.target.checked)} className="w-4 h-4 rounded bg-bg-base border-border-subtle/15 text-secondary focus:ring-0" />
            <Github size={14} />
            <span className="text-sm">{githubConnected ? 'Crear también en GitHub (privado) y conectar' : 'Crear también en GitHub (necesita login)'}</span>
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-ui-body text-text-secondary hover:text-text-primary">{t('modal.cancel')}</button>
          <button onClick={async () => { if (!parent || !canSubmit) return; const ok = await onCreate(parent, name.trim(), withGitHub); if (ok) onClose(); }} disabled={!canSubmit || isLoading} className="px-4 py-2 bg-gradient-to-br from-secondary to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-ui-body font-bold rounded flex items-center gap-2">
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {isLoading ? 'Creando...' : 'Crear repositorio'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CloneRepoModal({
  onClose, onPickFolder, onClone, onListRepos, isLoading, githubConnected,
}: {
  onClose: () => void;
  onPickFolder: () => Promise<string | null>;
  onClone: (url: string, parent: string, name: string) => Promise<boolean>;
  onListRepos: () => Promise<{ name: string; fullName: string; cloneUrl: string; private: boolean; description: string | null }[]>;
  isLoading: boolean;
  githubConnected: boolean;
}) {
  const t = useT();
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

  useEffect(() => {
    if (url && !folderName) {
      const match = url.match(/\/([^/]+?)(\.git)?\/?$/);
      if (match) setFolderName(match[1]); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = myRepos.filter((r) => r.fullName.toLowerCase().includes(filter.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-overlay rounded-xl p-6 w-[680px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-secondary flex items-center gap-2"><Download size={16} /> Clonar repositorio</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
        </div>
        {githubConnected && (
          <div className="flex gap-1 mb-4 bg-bg-base rounded p-1">
            <button onClick={() => setTab('my-repos')} className={cn('flex-1 px-3 py-1.5 text-xs font-bold rounded transition-colors', tab === 'my-repos' ? 'bg-secondary text-[#052900]' : 'text-text-secondary hover:text-text-primary')}>Mis repos de GitHub</button>
            <button onClick={() => setTab('url')} className={cn('flex-1 px-3 py-1.5 text-xs font-bold rounded transition-colors', tab === 'url' ? 'bg-secondary text-[#052900]' : 'text-text-secondary hover:text-text-primary')}>URL manual</button>
          </div>
        )}
        {tab === 'my-repos' ? (
          <div className="flex flex-col gap-2 min-h-0 flex-1">
            <input placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-bg-base border border-border-subtle/15 rounded px-3 py-2 text-ui-body focus:outline-none focus:border-secondary/50" />
            <div className="overflow-y-auto flex-1 border border-border-subtle/15 rounded">
              {myRepos.length === 0 ? (<p className="p-4 text-center text-text-secondary text-ui-body flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando tus repos...</p>)
              : filtered.length === 0 ? (<p className="p-4 text-center text-text-secondary text-ui-body">Sin resultados</p>)
              : filtered.map((r) => (
                <button key={r.fullName} onClick={() => { setUrl(r.cloneUrl); setFolderName(r.name); }} className={cn('w-full text-left px-3 py-2 hover:bg-border-subtle/50 border-b border-border-subtle/15 last:border-b-0 transition-colors', url === r.cloneUrl && 'bg-secondary/10')}>
                  <div className="flex items-center gap-2">{r.private ? <Lock size={12} className="text-git-mod" /> : <Globe size={12} className="text-secondary" />}<span className="font-medium text-ui-body">{r.fullName}</span></div>
                  {r.description && <p className="text-ui-small text-text-secondary mt-1 truncate">{r.description}</p>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">URL del repo</label>
            <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/usuario/repo.git" className="w-full bg-bg-base border border-border-subtle/15 rounded px-3 py-2 text-ui-body font-mono focus:outline-none focus:border-secondary/50" />
          </div>
        )}
        <div className="space-y-3 mt-4">
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Carpeta padre</label>
            <button onClick={async () => { const p = await onPickFolder(); if (p) setParent(p); }} className="w-full bg-bg-base border border-border-subtle/15 hover:border-secondary/50 rounded px-3 py-2 text-ui-body text-left flex items-center gap-2 transition-colors">
              <FolderOpen size={14} className="text-text-secondary shrink-0" />
              <span className={cn('truncate', parent ? 'text-text-primary font-mono text-ui-small' : 'text-text-secondary')}>{parent ?? 'Click para elegir carpeta...'}</span>
            </button>
          </div>
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Nombre de la carpeta</label>
            <input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="mi-repo" className="w-full bg-bg-base border border-border-subtle/15 rounded px-3 py-2 text-ui-body focus:outline-none focus:border-secondary/50" />
            {parent && folderName.trim() && <p className="text-[10px] text-text-secondary/70 mt-1">Destino: <code className="text-secondary">{parent}\{folderName.trim()}</code></p>}
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-ui-body text-text-secondary hover:text-text-primary">{t('modal.cancel')}</button>
          <button onClick={async () => { if (!url.trim() || !parent || !folderName.trim()) return; const ok = await onClone(url.trim(), parent, folderName.trim()); if (ok) onClose(); }} disabled={!url.trim() || !parent || !folderName.trim() || isLoading} className="px-4 py-2 bg-gradient-to-br from-secondary to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-ui-body font-bold rounded flex items-center gap-2">
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {isLoading ? 'Clonando...' : 'Clonar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ProfileMenu({
  user, isLoading, tokenInput, setTokenInput, authMode, setAuthMode,
  deviceCodeInfo, isLoggingIn, onClose, onLogin, onConnectToken, onLogout,
}: {
  user: { login: string; name: string | null; avatarUrl: string; email: string | null } | null;
  isLoading: boolean;
  tokenInput: string;
  setTokenInput: (v: string) => void;
  authMode: 'oauth' | 'token';
  setAuthMode: (m: 'oauth' | 'token') => void;
  deviceCodeInfo: { userCode: string; verificationUri: string } | null;
  isLoggingIn: boolean;
  onClose: () => void;
  onLogin: () => Promise<void>;
  onConnectToken: () => Promise<void>;
  onLogout: () => void;
}) {
  const t = useT();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-overlay rounded-xl p-6 w-[540px] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-secondary flex items-center gap-2 text-ui-header"><Github size={16} /> {t('toolbar.profile')}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>
        </div>
        {user ? (
          <div className="space-y-4">
            <div className="bg-bg-base border border-secondary/30 rounded-lg p-4 flex items-center gap-4">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.login} className="w-16 h-16 rounded-full border border-secondary/30" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-[#68b24f] flex items-center justify-center text-base font-bold text-[#052900]">{userInitials(user)}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text-primary truncate">{user.name ?? user.login}</p>
                <p className="text-xs text-secondary truncate">@{user.login}</p>
                {user.email && <p className="text-[10px] text-text-secondary truncate mt-0.5">{user.email}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <button onClick={() => window.api?.shellOpenPath(`https://github.com/${user.login}`)} className="w-full text-left px-3 py-2 rounded bg-bg-base border border-border-subtle/15 hover:border-border-subtle/30 text-ui-body text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"><Github size={14} />{t('profile.viewOnGitHub')}</button>
              <button onClick={() => navigator.clipboard.writeText(`@${user.login}`)} className="w-full text-left px-3 py-2 rounded bg-bg-base border border-border-subtle/15 hover:border-border-subtle/30 text-ui-body text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"><Copy size={14} />{t('profile.copyUsername', { user: user.login })}</button>
            </div>
            <button onClick={onLogout} className="w-full px-3 py-2.5 rounded border border-error/30 hover:border-error/60 bg-error/10 hover:bg-error/20 text-error text-ui-body font-bold flex items-center justify-center gap-2 transition-colors"><LogOut size={14} />{t('profile.signOut')}</button>
          </div>
        ) : deviceCodeInfo ? (
          <div className="bg-bg-base border border-secondary/40 rounded-lg p-5 text-center">
            <p className="text-ui-body text-text-primary mb-4">{t('profile.deviceCodeShown')}</p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <code className="text-3xl font-mono font-bold text-secondary bg-bg-base px-4 py-2 rounded border border-secondary/30 tracking-widest">{deviceCodeInfo.userCode}</code>
              <button onClick={() => navigator.clipboard.writeText(deviceCodeInfo.userCode)} className="p-2 hover:bg-border-subtle rounded text-text-secondary hover:text-secondary" title="Copy"><Copy size={14} /></button>
            </div>
            <p className="text-ui-small text-text-secondary mb-3">{t('profile.browserNotOpened')}{' '}<button onClick={() => window.api?.shellOpenPath(deviceCodeInfo.verificationUri)} className="text-secondary underline">{deviceCodeInfo.verificationUri}</button></p>
            <div className="flex items-center justify-center gap-2 text-ui-small text-text-secondary"><Loader2 size={14} className="animate-spin text-secondary" />{t('profile.waitingAuth')}</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-bg-base border border-border-subtle/15 rounded p-3">
              <p className="font-semibold text-ui-body text-text-primary mb-1">{t('profile.notConnected')}</p>
              <p className="text-ui-small text-text-secondary leading-relaxed">{t('profile.notConnectedDesc')}</p>
            </div>
            <div className="flex gap-1 bg-bg-base rounded p-1">
              <button onClick={() => setAuthMode('oauth')} className={cn('flex-1 px-3 py-1.5 text-xs font-bold rounded transition-colors', authMode === 'oauth' ? 'bg-gradient-to-br from-secondary to-[#68b24f] text-[#052900]' : 'text-text-secondary hover:text-text-primary')}>{t('profile.tabOAuth')}</button>
              <button onClick={() => setAuthMode('token')} className={cn('flex-1 px-3 py-1.5 text-xs font-bold rounded transition-colors', authMode === 'token' ? 'bg-gradient-to-br from-secondary to-[#68b24f] text-[#052900]' : 'text-text-secondary hover:text-text-primary')}>{t('profile.tabToken')}</button>
            </div>
            {authMode === 'oauth' ? (
              <>
                <p className="text-ui-small text-text-secondary leading-relaxed">{t('profile.oauthDesc')}</p>
                <button onClick={onLogin} disabled={isLoggingIn} className="w-full py-2.5 bg-[#24292e] hover:bg-[#373e47] border border-[#444c56] disabled:opacity-50 text-white text-ui-body font-bold rounded transition-colors flex items-center justify-center gap-2"><Github size={16} />{isLoggingIn ? t('profile.starting') : t('profile.continueWithGitHub')}</button>
                <p className="text-[10px] text-text-secondary/70 text-center">{t('profile.oauthFooter')}</p>
              </>
            ) : (
              <>
                <p className="text-ui-small text-text-secondary leading-relaxed">{t('profile.tokenInputDesc')}{' '}<button onClick={() => window.api?.shellOpenPath('https://github.com/settings/tokens/new?scopes=repo&description=GitCron')} className="text-secondary underline hover:opacity-80">{t('profile.tokenGenerate')}</button>{' '}{t('profile.tokenScope')} <code className="bg-bg-base px-1 rounded">repo</code>.</p>
                <input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onConnectToken(); }} placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full bg-bg-base border border-border-subtle/15 rounded px-3 py-2 text-ui-body font-mono focus:outline-none focus:border-secondary/50" />
                <button onClick={onConnectToken} disabled={!tokenInput.trim() || isLoading} className="w-full py-2 bg-gradient-to-br from-secondary to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-ui-body font-bold rounded transition-colors">{isLoading ? t('profile.tokenVerifying') : t('profile.tokenConnect')}</button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
