'use client';

import { useEffect, useState } from 'react';
import {
  Download, FolderOpen, Github, Search, Sparkles, Lock, Globe,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type RepoStartMode = 'open' | 'create' | 'clone';

type RemoteRepo = {
  name: string;
  fullName: string;
  cloneUrl: string;
  private: boolean;
  description: string | null;
};

type RepoStartPanelProps = {
  mode: RepoStartMode;
  githubConnected: boolean;
  isLoading: boolean;
  onOpenExisting: () => Promise<void>;
  onPickCreateFolder: () => Promise<string | null>;
  onPickCloneFolder: () => Promise<string | null>;
  onCreate: (parent: string, name: string, withGitHub: boolean) => Promise<boolean>;
  onClone: (url: string, parent: string, name: string) => Promise<boolean>;
  onListRepos: () => Promise<RemoteRepo[]>;
  onConnectGitHub: () => void;
  onComplete?: () => void;
};

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary"
    >
      {children}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] leading-relaxed text-text-secondary/75">{children}</p>;
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  mono = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  mono?: boolean;
}) {
  return (
    <input
      id={id}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'h-11 w-full rounded-lg border border-border-subtle/20 bg-bg-base/80 px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/65 focus:border-secondary/55',
        mono && 'font-mono text-xs',
      )}
    />
  );
}

function FolderPicker({
  id,
  value,
  onPick,
}: {
  id: string;
  value: string | null;
  onPick: () => Promise<void>;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onPick}
      className="flex h-11 w-full items-center gap-2 rounded-lg border border-border-subtle/20 bg-bg-base/80 px-3 text-left text-sm transition-colors hover:border-secondary/45 focus-visible:border-secondary/55 focus-visible:outline-none"
    >
      <FolderOpen size={15} className="shrink-0 text-text-secondary" />
      <span className={cn('min-w-0 truncate', value ? 'font-mono text-xs text-text-primary' : 'text-text-secondary')}>
        {value ?? 'Click para elegir carpeta...'}
      </span>
    </button>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  isLoading,
  loadingText,
  icon,
  children,
}: {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-[#68b24f] px-4 text-sm font-extrabold text-[#052900] shadow-lg shadow-secondary/20 transition-colors hover:from-[#95e279] hover:to-[#4a9a31] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {isLoading ? loadingText : children}
    </button>
  );
}

function DestinationHint({ label, parent, name }: { label: string; parent: string | null; name: string }) {
  if (!parent || !name.trim()) return null;

  return (
    <FieldHint>
      {label}: <code className="text-secondary">{`${parent}\\${name.trim()}`}</code>
    </FieldHint>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-secondary/25 bg-secondary/10 text-secondary">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-extrabold text-text-primary">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">{description}</p>
      </div>
    </div>
  );
}

function OpenExistingPane({
  isLoading,
  onOpenExisting,
}: {
  isLoading: boolean;
  onOpenExisting: () => Promise<void>;
}) {
  return (
    <div>
      <SectionTitle
        icon={<FolderOpen size={18} />}
        title="Abrir repositorio existente"
        description="Seleccioná una carpeta local que ya tenga un repositorio Git inicializado."
      />
      <PrimaryButton
        onClick={onOpenExisting}
        disabled={isLoading}
        isLoading={isLoading}
        loadingText="Abriendo..."
        icon={<FolderOpen size={14} />}
      >
        Elegir carpeta
      </PrimaryButton>
    </div>
  );
}

function CreateRepoPane({
  githubConnected,
  isLoading,
  onPickFolder,
  onCreate,
  onComplete,
}: {
  githubConnected: boolean;
  isLoading: boolean;
  onPickFolder: () => Promise<string | null>;
  onCreate: (parent: string, name: string, withGitHub: boolean) => Promise<boolean>;
  onComplete?: () => void;
}) {
  const [parent, setParent] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [withGitHub, setWithGitHub] = useState(false);
  const trimmedName = name.trim();
  const canSubmit = Boolean(parent && trimmedName && /^[a-zA-Z0-9._-]+$/.test(trimmedName));

  const pickParent = async () => {
    const picked = await onPickFolder();
    if (picked) setParent(picked);
  };

  const createRepo = async () => {
    if (!parent || !canSubmit) return;
    const ok = await onCreate(parent, trimmedName, withGitHub);
    if (ok) onComplete?.();
  };

  return (
    <div>
      <SectionTitle
        icon={<Sparkles size={18} />}
        title="Crear repositorio nuevo"
        description="Definí el nombre, la carpeta padre y, si querés, crealo también como repo privado en GitHub."
      />
      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor="repo-name">Nombre del repo</FieldLabel>
          <TextInput
            id="repo-name"
            autoFocus
            value={name}
            onChange={setName}
            placeholder="mi-nuevo-proyecto"
          />
          <FieldHint>Solo letras, números, guiones, puntos y underscores.</FieldHint>
        </div>

        <div>
          <FieldLabel htmlFor="repo-parent">Carpeta padre</FieldLabel>
          <FolderPicker id="repo-parent" value={parent} onPick={pickParent} />
          <DestinationHint label="Se creará en" parent={parent} name={trimmedName} />
        </div>

        <label
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-lg border border-border-subtle/15 bg-bg-base/45 px-3 py-3 text-sm transition-colors',
            githubConnected ? 'hover:border-secondary/35 hover:bg-secondary/5' : 'cursor-not-allowed opacity-55',
          )}
        >
          <input
            type="checkbox"
            disabled={!githubConnected}
            checked={withGitHub}
            onChange={(event) => setWithGitHub(event.target.checked)}
            className="h-4 w-4 rounded border-border-subtle/30 bg-bg-base text-secondary focus:ring-0"
          />
          <Github size={15} className="shrink-0 text-text-secondary" />
          <span className="text-text-primary">
            {githubConnected ? 'Crear también en GitHub (privado) y conectar' : 'Crear también en GitHub (necesita login)'}
          </span>
        </label>

        <div className="flex justify-end pt-2">
          <PrimaryButton
            onClick={createRepo}
            disabled={!canSubmit || isLoading}
            isLoading={isLoading}
            loadingText="Creando..."
            icon={<Sparkles size={14} />}
          >
            Crear repositorio
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function CloneSourceTabs({
  source,
  setSource,
}: {
  source: 'my-repos' | 'url';
  setSource: (source: 'my-repos' | 'url') => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-border-subtle/15 bg-bg-base/75 p-1">
      <button
        type="button"
        aria-pressed={source === 'my-repos'}
        onClick={() => setSource('my-repos')}
        className={cn(
          'h-9 rounded-md text-xs font-extrabold transition-colors',
          source === 'my-repos' ? 'bg-secondary text-[#052900]' : 'text-text-secondary hover:text-text-primary',
        )}
      >
        Mis repos de GitHub
      </button>
      <button
        type="button"
        aria-pressed={source === 'url'}
        onClick={() => setSource('url')}
        className={cn(
          'h-9 rounded-md text-xs font-extrabold transition-colors',
          source === 'url' ? 'bg-secondary text-[#052900]' : 'text-text-secondary hover:text-text-primary',
        )}
      >
        URL manual
      </button>
    </div>
  );
}

function RepoList({
  repos,
  selectedUrl,
  filter,
  setFilter,
  onSelect,
}: {
  repos: RemoteRepo[];
  selectedUrl: string;
  filter: string;
  setFilter: (value: string) => void;
  onSelect: (repo: RemoteRepo) => void;
}) {
  const filtered = repos.filter((repo) => repo.fullName.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Buscar..."
          className="h-11 w-full rounded-lg border border-border-subtle/20 bg-bg-base/80 pl-9 pr-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/65 focus:border-secondary/55"
        />
      </div>

      <div className="max-h-72 overflow-y-auto rounded-lg border border-border-subtle/15 bg-bg-base/45">
        {repos.length === 0 ? (
          <p className="flex items-center justify-center gap-2 p-4 text-center text-sm text-text-secondary">
            <Loader2 size={14} className="animate-spin" /> Cargando tus repos...
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-text-secondary">Sin resultados</p>
        ) : (
          filtered.map((repo) => (
            <button
              key={repo.fullName}
              type="button"
              onClick={() => onSelect(repo)}
              className={cn(
                'w-full border-b border-border-subtle/10 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-text-primary/[0.06]',
                selectedUrl === repo.cloneUrl && 'bg-secondary/10',
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                {repo.private ? <Lock size={12} className="shrink-0 text-git-mod" /> : <Globe size={12} className="shrink-0 text-secondary" />}
                <span className="truncate text-sm font-semibold text-text-primary">{repo.fullName}</span>
              </div>
              {repo.description && (
                <p className="mt-1 truncate pl-5 text-xs text-text-secondary">{repo.description}</p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function CloneRepoPane({
  githubConnected,
  isLoading,
  onPickFolder,
  onClone,
  onListRepos,
  onComplete,
}: {
  githubConnected: boolean;
  isLoading: boolean;
  onPickFolder: () => Promise<string | null>;
  onClone: (url: string, parent: string, name: string) => Promise<boolean>;
  onListRepos: () => Promise<RemoteRepo[]>;
  onComplete?: () => void;
}) {
  const [source, setSource] = useState<'my-repos' | 'url'>(githubConnected ? 'my-repos' : 'url');
  const [url, setUrl] = useState('');
  const [parent, setParent] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [myRepos, setMyRepos] = useState<RemoteRepo[]>([]);
  const [filter, setFilter] = useState('');
  const trimmedUrl = url.trim();
  const trimmedFolderName = folderName.trim();
  const canSubmit = Boolean(trimmedUrl && parent && trimmedFolderName);

  useEffect(() => {
    if (source === 'my-repos' && githubConnected && myRepos.length === 0) {
      onListRepos().then(setMyRepos);
    }
  }, [source, githubConnected, myRepos.length, onListRepos]);

  useEffect(() => {
    if (!url || folderName) return;
    const match = url.match(/\/([^/]+?)(\.git)?\/?$/);
    if (match) setFolderName(match[1]);
  }, [url, folderName]);

  const pickParent = async () => {
    const picked = await onPickFolder();
    if (picked) setParent(picked);
  };

  const selectRepo = (repo: RemoteRepo) => {
    setUrl(repo.cloneUrl);
    setFolderName(repo.name);
  };

  const cloneRepo = async () => {
    if (!parent || !canSubmit) return;
    const ok = await onClone(trimmedUrl, parent, trimmedFolderName);
    if (ok) onComplete?.();
  };

  return (
    <div>
      <SectionTitle
        icon={<Download size={18} />}
        title="Clonar repositorio"
        description="Elegí un repo de tu cuenta de GitHub o pegá una URL manual, y definí dónde clonarlo."
      />
      <div className="space-y-4">
        {githubConnected && <CloneSourceTabs source={source} setSource={setSource} />}

        {source === 'my-repos' ? (
          <RepoList
            repos={myRepos}
            selectedUrl={url}
            filter={filter}
            setFilter={setFilter}
            onSelect={selectRepo}
          />
        ) : (
          <div>
            <FieldLabel htmlFor="clone-url">URL del repo</FieldLabel>
            <TextInput
              id="clone-url"
              autoFocus
              mono
              value={url}
              onChange={setUrl}
              placeholder="https://github.com/usuario/repo.git"
            />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="clone-parent">Carpeta padre</FieldLabel>
            <FolderPicker id="clone-parent" value={parent} onPick={pickParent} />
          </div>
          <div>
            <FieldLabel htmlFor="clone-folder-name">Nombre de la carpeta</FieldLabel>
            <TextInput
              id="clone-folder-name"
              value={folderName}
              onChange={setFolderName}
              placeholder="mi-repo"
            />
          </div>
        </div>
        <DestinationHint label="Destino" parent={parent} name={trimmedFolderName} />

        <div className="flex justify-end pt-2">
          <PrimaryButton
            onClick={cloneRepo}
            disabled={!canSubmit || isLoading}
            isLoading={isLoading}
            loadingText="Clonando..."
            icon={<Download size={14} />}
          >
            Clonar
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function RepoStartPanel({
  mode,
  githubConnected,
  isLoading,
  onOpenExisting,
  onPickCreateFolder,
  onPickCloneFolder,
  onCreate,
  onClone,
  onListRepos,
  onConnectGitHub,
  onComplete,
}: RepoStartPanelProps) {
  return (
    <div className="w-full text-text-primary">
      <div className="glass-overlay rounded-2xl border border-border-subtle/25 p-6">
        {mode === 'open' && (
          <OpenExistingPane isLoading={isLoading} onOpenExisting={onOpenExisting} />
        )}
        {mode === 'create' && (
          <CreateRepoPane
            githubConnected={githubConnected}
            isLoading={isLoading}
            onPickFolder={onPickCreateFolder}
            onCreate={onCreate}
            onComplete={onComplete}
          />
        )}
        {mode === 'clone' && (
          <CloneRepoPane
            githubConnected={githubConnected}
            isLoading={isLoading}
            onPickFolder={onPickCloneFolder}
            onClone={onClone}
            onListRepos={onListRepos}
            onComplete={onComplete}
          />
        )}
      </div>

      {!githubConnected && (
        <div className="mt-4 rounded-lg border border-border-subtle/15 bg-bg-base/60 px-4 py-3">
          <button
            type="button"
            onClick={onConnectGitHub}
            className="flex items-center gap-2 text-xs font-semibold text-text-secondary underline transition-colors hover:text-secondary"
          >
            <Github size={13} />
            Conectá tu cuenta de GitHub para clonar repos privados
          </button>
        </div>
      )}
    </div>
  );
}
