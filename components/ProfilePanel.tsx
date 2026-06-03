'use client';

import { Github, Copy, LogOut, Loader2, ArrowLeft, UserCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useT } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { formatInitials } from '@/lib/display-format';

interface GitHubUser {
  login: string;
  name?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface ProfilePanelProps {
  githubUser: GitHubUser | null;
  deviceCodeInfo: { userCode: string; verificationUri: string } | null;
  authMode: 'oauth' | 'token';
  setAuthMode: (mode: 'oauth' | 'token') => void;
  tokenInput: string;
  setTokenInput: (val: string) => void;
  isLoggingIn: boolean;
  isLoading: boolean;
  handleLoginWithGitHub: () => void | Promise<void>;
  handleConnectGitHub: () => void | Promise<void>;
  disconnectGitHub: () => void | Promise<void>;
  handleViewChange: (view: 'repository' | 'settings' | 'help' | 'profile') => void;
}

function userInitials(user: GitHubUser): string {
  if (user.name && user.name.trim()) return formatInitials(user.name.trim());
  if (user.login) return user.login.slice(0, 2).toUpperCase();
  if (user.email) return user.email.split('@')[0].slice(0, 2).toUpperCase();
  return '?';
}

export function ProfilePanel({
  githubUser,
  deviceCodeInfo,
  authMode,
  setAuthMode,
  tokenInput,
  setTokenInput,
  isLoggingIn,
  isLoading,
  handleLoginWithGitHub,
  handleConnectGitHub,
  disconnectGitHub,
  handleViewChange,
}: ProfilePanelProps) {
  const t = useT();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-base/40">
      <div className="border-b border-border-subtle/15 shrink-0">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <Github size={18} className="text-secondary shrink-0" />
            <h2 className="truncate text-base font-bold text-text-primary">
              {t('toolbar.profile')}
            </h2>
          </div>
          <button
            onClick={() => handleViewChange('repository')}
            className="shrink-0 text-text-secondary hover:text-text-primary px-3 py-1 border border-border-subtle/15 hover:border-secondary/20 rounded text-xs font-semibold tracking-wide transition-colors"
          >
            {t('common.backToRepo')}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center select-text">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="glass-overlay rounded-2xl border border-border-subtle/25 p-6 w-full max-w-4xl"
        >
          {githubUser ? (
            <div className="space-y-4">
              <div className="bg-bg-base/60 border border-secondary/30 rounded-xl p-4 flex items-center gap-4">
                {githubUser.avatarUrl ? (
                  <img
                    src={githubUser.avatarUrl}
                    alt={githubUser.login}
                    className="w-16 h-16 rounded-full border border-secondary/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-[#68b24f] flex items-center justify-center text-base font-bold text-[#052900]">
                    {userInitials(githubUser)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-text-primary truncate">
                    {githubUser.name ?? githubUser.login}
                  </p>
                  <p className="text-xs text-secondary truncate">@{githubUser.login}</p>
                  {githubUser.email && (
                    <p className="text-[10px] text-text-secondary truncate mt-0.5">
                      {githubUser.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <button
                  onClick={() => window.api?.shellOpenPath(`https://github.com/${githubUser.login}`)}
                  className="w-full text-left px-4 py-2.5 rounded-lg bg-bg-base/60 border border-border-subtle/15 hover:border-border-subtle/30 text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
                >
                  <Github size={14} />
                  {t('profile.viewOnGitHub')}
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(`@${githubUser.login}`)}
                  className="w-full text-left px-4 py-2.5 rounded-lg bg-bg-base/60 border border-border-subtle/15 hover:border-border-subtle/30 text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
                >
                  <Copy size={14} />
                  {t('profile.copyUsername', { user: githubUser.login })}
                </button>
              </div>
              <button
                onClick={async () => {
                  await disconnectGitHub();
                  handleViewChange('repository');
                }}
                className="w-full px-4 py-3 rounded-lg border border-error/30 hover:border-error/60 bg-error/10 hover:bg-error/20 text-error text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut size={14} />
                {t('profile.signOut')}
              </button>
            </div>
          ) : deviceCodeInfo ? (
            <div className="bg-bg-base/60 border border-secondary/40 rounded-xl p-5 text-center">
              <p className="text-xs font-semibold text-[#ffd98a] mb-4">
                {t('profile.deviceCodeShown')}
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <code className="text-3xl font-mono font-bold text-secondary bg-bg-base px-4 py-2 rounded-lg border border-secondary/30 tracking-widest">
                  {deviceCodeInfo.userCode}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(deviceCodeInfo.userCode)}
                  className="p-2 hover:bg-border-subtle rounded text-text-secondary hover:text-secondary"
                  title="Copy"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[11px] text-text-secondary mb-3">
                {t('profile.browserNotOpened')}{' '}
                <button
                  onClick={() => window.api?.shellOpenPath(deviceCodeInfo.verificationUri)}
                  className="text-secondary underline"
                >
                  {deviceCodeInfo.verificationUri}
                </button>
              </p>
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-text-secondary">
                <Loader2 size={14} className="animate-spin text-secondary" />
                {t('profile.waitingAuth')}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-bg-base/60 border border-border-subtle/15 rounded-xl p-4">
                <p className="font-bold text-sm text-text-primary mb-1">
                  {t('profile.notConnected')}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t('profile.notConnectedDesc')}
                </p>
              </div>
              <div className="flex gap-1 bg-bg-base rounded-xl p-1 border border-border-subtle/10">
                <button
                  onClick={() => setAuthMode('oauth')}
                  className={cn(
                    'flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors',
                    authMode === 'oauth'
                      ? 'bg-secondary text-[#052900]'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {t('profile.tabOAuth')}
                </button>
                <button
                  onClick={() => setAuthMode('token')}
                  className={cn(
                    'flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors',
                    authMode === 'token'
                      ? 'bg-secondary text-[#052900]'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {t('profile.tabToken')}
                </button>
              </div>
              {authMode === 'oauth' ? (
                <>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {t('profile.oauthDesc')}
                  </p>
                  <button
                    onClick={handleLoginWithGitHub}
                    disabled={isLoggingIn}
                    className="w-full py-3 bg-[#24292e] hover:bg-[#373e47] border border-[#444c56] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-black/20"
                  >
                    <Github size={16} />
                    {isLoggingIn ? t('profile.starting') : t('profile.continueWithGitHub')}
                  </button>
                  <p className="text-[10px] text-text-secondary/70 text-center">
                    {t('profile.oauthFooter')}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {t('profile.tokenInputDesc')}{' '}
                    <button
                      onClick={() => window.api?.shellOpenPath('https://github.com/settings/tokens/new?scopes=repo&description=GitCron')}
                      className="text-secondary underline hover:opacity-80"
                    >
                      {t('profile.tokenGenerate')}
                    </button>
                    {' '}{t('profile.tokenScope')} <code className="bg-bg-base px-1 rounded">repo</code>.
                  </p>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConnectGitHub();
                    }}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-bg-base border border-border-subtle/15 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-secondary/50"
                  />
                  <button
                    onClick={handleConnectGitHub}
                    disabled={!tokenInput.trim() || isLoading}
                    className="w-full py-2.5 bg-gradient-to-br from-secondary to-[#68b24f] hover:from-[#95e279] hover:to-[#4a9a31] shadow-lg shadow-secondary/20 disabled:opacity-50 text-[#052900] text-xs font-bold rounded-lg transition-colors"
                  >
                    {isLoading ? t('profile.tokenVerifying') : t('profile.tokenConnect')}
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
