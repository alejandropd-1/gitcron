'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Blocks,
  DatabaseZap,
  FileCode,
  Loader2,
  RefreshCw,
  Route,
  Sparkles,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { useGitStore } from '@/lib/git-store';
import type { CartoGraph, CartoGraphStatus, CartoNode } from '@/lib/carto-types';
import {
  buildCartoPanorama,
  roleColor,
  type CartoPanoramaGroup,
  type CartoPanoramaLink,
} from '@/lib/carto-panorama';
import { CARTO_ROLE_BY_ID, type CartoRoleId } from '@/lib/carto-roles';
import type { CartoPanoramaResult } from '@/types/carto-ai';

type CartoPanoramaLensProps = {
  repoPath: string | null;
  status: CartoGraphStatus | null;
  refreshKey: number;
  aiEnabled: boolean;
  technicalMode: boolean;
  onSelectNode: (node: CartoNode) => void;
};

export function CartoPanoramaLens({
  repoPath,
  status,
  refreshKey,
  aiEnabled,
  technicalMode,
  onSelectNode,
}: CartoPanoramaLensProps) {
  const t = useT();
  const lang = useGitStore((s) => s.language);
  const [graph, setGraph] = useState<CartoGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<CartoPanoramaResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<CartoRoleId | null>(null);

  useEffect(() => {
    if (!repoPath) {
      setGraph(null);
      setGraphError(null);
      setGraphLoading(false);
      return;
    }
    if (status?.state === 'error') {
      setGraph(null);
      setGraphError(status.error ?? t('cartography.graph.error'));
      setGraphLoading(false);
      return;
    }
    if (status?.state !== 'ready') {
      setGraph(null);
      setGraphError(null);
      setGraphLoading(false);
      return;
    }

    let active = true;
    setGraphLoading(true);
    setGraphError(null);
    void window.api.cartoGraph
      .snapshot(repoPath)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setGraph(res.data);
        else setGraphError(res.error ?? t('cartography.graph.error'));
      })
      .catch((err) => {
        if (!active) return;
        setGraphError(err instanceof Error ? err.message : t('cartography.graph.error'));
      })
      .finally(() => {
        if (active) setGraphLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repoPath, refreshKey, status?.state, status?.error, t]);

  const panorama = useMemo(() => (graph ? buildCartoPanorama(graph) : null), [graph]);

  const loadAi = async (forceRefresh = false) => {
    if (!repoPath || !aiEnabled) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await window.api.cartoAi.panorama(repoPath, lang, forceRefresh);
      if (res.success && res.data) setAiResult(res.data);
      else setAiError(res.error ?? t('cartography.panorama.aiError'));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : t('cartography.panorama.aiError'));
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    setAiResult(null);
    setAiError(null);
    if (aiEnabled && panorama) void loadAi(false);
    // `panorama.structureHash` is the invalidation boundary for the cached text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath, aiEnabled, lang, panorama?.structureHash]);

  if (!repoPath) {
    return <PanoramaHint icon={<Blocks size={18} />} text={t('cartography.emptyHint')} />;
  }
  if (status?.state === 'indexing' || status?.state === 'idle') {
    return (
      <PanoramaHint
        icon={<Loader2 size={18} className="animate-spin" />}
        text={t('cartography.graph.indexing')}
      />
    );
  }
  if (graphLoading) {
    return (
      <PanoramaHint
        icon={<Loader2 size={18} className="animate-spin" />}
        text={t('cartography.panorama.loading')}
      />
    );
  }
  if (graphError) {
    return <PanoramaHint icon={<AlertTriangle size={18} />} text={graphError} tone="error" />;
  }
  if (!panorama || panorama.groups.length === 0) {
    return <PanoramaHint icon={<Blocks size={18} />} text={t('cartography.semantic.empty')} />;
  }

  return (
    <div className="h-full min-h-0 overflow-auto bg-carto-canvas px-4 py-4">
      <section className="mb-4 rounded-lg border border-carto-accent/25 bg-carto-node/[0.035] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-carto-accent">
              <Sparkles size={14} />
              {t('cartography.panorama.summary')}
            </div>
            {aiResult?.panorama ? (
              <>
                <h3 className="text-base font-bold leading-snug text-carto-text">
                  {aiResult.panorama.oneLine}
                </h3>
                <p className="mt-2 max-w-4xl text-sm leading-relaxed text-carto-text-muted">
                  {aiResult.panorama.paragraph}
                </p>
              </>
            ) : aiEnabled ? (
              <p className="text-sm leading-relaxed text-carto-text-muted">
                {aiLoading ? t('cartography.panorama.generating') : aiError ?? t('cartography.panorama.aiEmpty')}
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-carto-text-muted">
                {t('cartography.panorama.aiOff')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void loadAi(true)}
            disabled={!aiEnabled || aiLoading}
            className="flex shrink-0 items-center gap-1.5 rounded border border-carto-grid px-2.5 py-1 text-[11px] font-semibold tracking-wide text-carto-text-muted transition-colors hover:border-carto-accent/50 hover:text-carto-text disabled:opacity-40"
          >
            <RefreshCw size={12} className={aiLoading ? 'animate-spin' : ''} />
            {t('cartography.panorama.refreshAi')}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-carto-text-muted/75">
          <span>{t('cartography.panorama.structure', { hash: panorama.structureHash })}</span>
          {aiResult?.cached && (
            <span className="flex items-center gap-1 rounded border border-carto-accent/25 px-1.5 py-0.5 text-carto-accent/85">
              <DatabaseZap size={10} />
              {t('cartography.detail.cached')}
            </span>
          )}
        </div>
      </section>

      <GroupLinks links={panorama.links} />

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {panorama.groups.map((group) => (
          <GroupBlock
            key={group.id}
            group={group}
            expanded={expandedRole === group.id}
            technicalMode={technicalMode}
            links={panorama.links}
            onToggle={() => setExpandedRole((prev) => (prev === group.id ? null : group.id))}
            onSelectNode={onSelectNode}
          />
        ))}
      </section>

      {aiResult?.panorama?.flows.length ? (
        <section className="mt-4 rounded-lg border border-carto-grid bg-carto-node/[0.025] p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-carto-accent">
            <Route size={14} />
            {t('cartography.panorama.guidedFlows')}
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {aiResult.panorama.flows.map((flow) => (
              <article key={flow.title} className="rounded border border-carto-grid bg-carto-canvas/80 p-3">
                <h4 className="text-sm font-bold text-carto-text">{flow.title}</h4>
                <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-carto-text-muted">
                  {flow.steps.map((step, index) => (
                    <li key={`${flow.title}-${index}`} className="flex gap-2">
                      <span className="font-mono text-carto-accent">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function GroupBlock({
  group,
  expanded,
  technicalMode,
  links,
  onToggle,
  onSelectNode,
}: {
  group: CartoPanoramaGroup;
  expanded: boolean;
  technicalMode: boolean;
  links: CartoPanoramaLink[];
  onToggle: () => void;
  onSelectNode: (node: CartoNode) => void;
}) {
  const t = useT();
  const style = { '--carto-role-color': group.color } as CSSProperties;
  const relatedLinks = links.filter((link) => link.fromRole === group.id || link.toRole === group.id);

  return (
    <article
      className="carto-role-column min-h-[13rem]"
      style={style}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="carto-role-column__header w-full text-left"
      >
        <span className="carto-role-column__dot" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-carto-text">
            {t(CARTO_ROLE_BY_ID[group.id].labelKey)}
          </span>
          <span className="block text-xs leading-relaxed text-carto-text-muted">
            {t(`cartography.panorama.roleDesc.${group.id}`)}
          </span>
        </span>
        <span className="carto-semantic-node__count">{group.fileCount}</span>
      </button>

      <div className="px-3 py-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-carto-text-muted">
          <FileCode size={13} className="text-carto-accent" />
          {t('cartography.panorama.keyFiles')}
        </div>
        <FileList files={expanded ? group.files : group.keyFiles} onSelectNode={onSelectNode} />

        {relatedLinks.length > 0 && (
          <details className="mt-3" open={technicalMode}>
            <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-carto-text-muted transition-colors hover:text-carto-text">
              {t('cartography.detail.technicalDetails')}
            </summary>
            <ul className="mt-2 space-y-1">
              {relatedLinks.map((link) => (
                <li
                  key={`${link.fromRole}-${link.toRole}`}
                  className="flex items-center gap-1.5 text-[11px] text-carto-text-muted"
                >
                  <span>{t(CARTO_ROLE_BY_ID[link.fromRole].labelKey)}</span>
                  <ArrowRight size={11} className="text-carto-accent" />
                  <span>{t(CARTO_ROLE_BY_ID[link.toRole].labelKey)}</span>
                  <span className="font-mono text-carto-accent">{link.count}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </article>
  );
}

function FileList({
  files,
  onSelectNode,
}: {
  files: CartoPanoramaGroup['files'];
  onSelectNode: (node: CartoNode) => void;
}) {
  const t = useT();
  if (files.length === 0) {
    return <p className="text-xs text-carto-text-muted/70">{t('cartography.graph.none')}</p>;
  }
  return (
    <ul className="space-y-1">
      {files.map((file) => (
        <li key={file.node.id}>
          <button
            type="button"
            onClick={() => onSelectNode(file.node)}
            className="group flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-carto-accent/10"
            title={file.node.filePath}
          >
            <FileCode size={12} className="shrink-0 text-carto-node/75" />
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-carto-text">
              {file.node.filePath}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-carto-text-muted/70">
              {file.degree}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function GroupLinks({ links }: { links: CartoPanoramaLink[] }) {
  const t = useT();
  if (links.length === 0) return null;
  return (
    <section className="mb-4 rounded-lg border border-carto-grid bg-carto-node/[0.025] px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-carto-accent">
        <ArrowRight size={14} />
        {t('cartography.panorama.groupLinks')}
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <div
            key={`${link.fromRole}-${link.toRole}`}
            className="flex items-center gap-1.5 rounded border border-carto-grid bg-carto-canvas/80 px-2 py-1 text-[11px]"
            style={{ '--carto-role-color': roleColor(link.fromRole) } as CSSProperties}
          >
            <span className="text-carto-text">{t(CARTO_ROLE_BY_ID[link.fromRole].labelKey)}</span>
            <ArrowRight size={12} className="text-carto-accent" />
            <span className="text-carto-text">{t(CARTO_ROLE_BY_ID[link.toRole].labelKey)}</span>
            <span className="ml-1 rounded border border-carto-accent/25 px-1 font-mono text-carto-accent">
              {link.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PanoramaHint({
  icon,
  text,
  tone = 'muted',
}: {
  icon: React.ReactNode;
  text: string;
  tone?: 'muted' | 'error';
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
      <span className={tone === 'error' ? 'text-[#ffa8a3]' : 'text-carto-accent'}>{icon}</span>
      <p className="max-w-sm text-xs leading-relaxed text-carto-text-muted">{text}</p>
    </div>
  );
}
